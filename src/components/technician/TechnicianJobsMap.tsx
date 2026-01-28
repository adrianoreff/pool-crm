import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { AppointmentWithRelations } from '@/types/database';
import { geocodeAddress } from '@/lib/mapbox/geocode';

interface TechnicianJobsMapProps {
  appointments: AppointmentWithRelations[];
  mapboxToken: string | null | undefined;
  onMarkerClick?: (appointmentId: string) => void;
}

// Status -> design token (CSS variable) used for markers
const STATUS_TOKEN: Record<string, 'info' | 'primary' | 'success' | 'destructive'> = {
  scheduled: 'info',
  pending_confirmation: 'info',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'destructive',
  no_show: 'destructive',
};

export function TechnicianJobsMap({ appointments, mapboxToken, onMarkerClick }: TechnicianJobsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodedByAppointmentId, setGeocodedByAppointmentId] = useState<
    Record<string, { latitude: number; longitude: number }>
  >({});

  const resolvedAppointments = useMemo(() => {
    return appointments.map((apt) => {
      const lat = apt.latitude ?? geocodedByAppointmentId[apt.id]?.latitude ?? null;
      const lng = apt.longitude ?? geocodedByAppointmentId[apt.id]?.longitude ?? null;
      return { ...apt, latitude: lat, longitude: lng };
    });
  }, [appointments, geocodedByAppointmentId]);

  const resolvedWithCoords = useMemo(() => {
    return resolvedAppointments.filter((a) => a.latitude != null && a.longitude != null);
  }, [resolvedAppointments]);

  const buildAddress = (apt: AppointmentWithRelations) => {
    const parts = [apt.address, apt.city, apt.state, apt.zip_code].filter(Boolean);
    return parts.join(', ');
  };

  // Geocode appointments that don't have coordinates yet
  useEffect(() => {
    if (!mapboxToken) return;

    const missing = appointments.filter(
      (a) =>
        (a.latitude == null || a.longitude == null) &&
        !geocodedByAppointmentId[a.id] &&
        !!buildAddress(a)
    );

    if (missing.length === 0) return;

    const controller = new AbortController();
    setGeocodeLoading(true);

    (async () => {
      const results = await Promise.all(
        missing.map(async (apt) => {
          const coords = await geocodeAddress(buildAddress(apt), mapboxToken, controller.signal);
          return { id: apt.id, coords };
        })
      );

      if (controller.signal.aborted) return;

      setGeocodedByAppointmentId((prev) => {
        const next = { ...prev };
        results.forEach(({ id, coords }) => {
          if (coords) next[id] = { latitude: coords.latitude, longitude: coords.longitude };
        });
        return next;
      });
    })().finally(() => {
      if (!controller.signal.aborted) setGeocodeLoading(false);
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken, appointments]);

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current) return;
    if (mapRef.current) return;

    // Check if mapbox-gl is already loaded
    if ((window as any).mapboxgl) {
      initMap();
      return;
    }

    // Load Mapbox GL JS dynamically
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Wait a bit for CSS to load
      setTimeout(initMap, 100);
    };
    document.head.appendChild(script);

    function initMap() {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl || !mapContainerRef.current) return;

      mapboxgl.accessToken = mapboxToken;

      // Get center from first appointment with coordinates, or default
      const appointmentWithCoords = resolvedWithCoords[0];
      const center = appointmentWithCoords 
        ? [Number(appointmentWithCoords.longitude), Number(appointmentWithCoords.latitude)]
        : [-98.5795, 39.8283]; // Center of US

      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
         zoom: appointmentWithCoords ? 10 : 4,
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      mapRef.current.on('load', () => {
        setMapLoaded(true);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapboxToken, resolvedWithCoords.length]);

  // Add/update markers when appointments change or map loads
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter appointments with coordinates (including geocoded)
    const appointmentsWithCoords = resolvedWithCoords;
    if (appointmentsWithCoords.length === 0) return;

    // Add markers
    appointmentsWithCoords.forEach(apt => {
      const token = STATUS_TOKEN[apt.status] || 'info';
      const color = `hsl(var(--${token}))`;
      
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
       el.style.backgroundColor = color;
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';

      // Add inner dot
      const inner = document.createElement('div');
      inner.style.width = '10px';
      inner.style.height = '10px';
      inner.style.borderRadius = '50%';
      inner.style.backgroundColor = 'white';
      el.appendChild(inner);

      // Create popup
       const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <strong>${apt.customer?.first_name || ''} ${apt.customer?.last_name || ''}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            ${apt.service?.name || 'Service'}
          </div>
          <div style="font-size: 12px; color: #666;">
            ${formatTime(apt.scheduled_start_time)}
          </div>
          <div style="margin-top: 8px;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
               background: hsl(var(--${token}) / 0.15);
               color: hsl(var(--${token}));
            ">
              ${apt.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([Number(apt.longitude), Number(apt.latitude)])
        .setPopup(popup)
        .addTo(mapRef.current);

      // Click handler
      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(apt.id);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (appointmentsWithCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      appointmentsWithCoords.forEach(apt => {
        bounds.extend([Number(apt.longitude), Number(apt.latitude)]);
      });
      mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    } else if (appointmentsWithCoords.length === 1) {
      mapRef.current.flyTo({
        center: [Number(appointmentsWithCoords[0].longitude), Number(appointmentsWithCoords[0].latitude)],
        zoom: 14,
      });
    }
   }, [resolvedWithCoords, mapLoaded, onMarkerClick]);

  // Helper function
  function formatTime(time: string) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  if (!mapboxToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Today's Jobs Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            Map unavailable - Mapbox not configured
          </div>
        </CardContent>
      </Card>
    );
  }

  const appointmentsWithCoords = resolvedWithCoords;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Today's Jobs Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div ref={mapContainerRef} className="h-64 w-full rounded-lg overflow-hidden" />
          {appointmentsWithCoords.length === 0 && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] rounded-lg flex flex-col items-center justify-center text-muted-foreground gap-2">
              <MapPin className="h-8 w-8" />
              <p>{geocodeLoading ? 'Buscando localização dos endereços…' : 'No jobs with location data'}</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-info" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span>Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

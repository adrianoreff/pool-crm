import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';
import { geocodeAddress } from '@/lib/mapbox/geocode';

interface MapPreviewProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  mapboxToken?: string | null;
  className?: string;
}

export function MapPreview({ latitude, longitude, address, mapboxToken, className }: MapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [geocoded, setGeocoded] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const resolvedCoords = useMemo(() => {
    if (latitude != null && longitude != null) {
      return { latitude: Number(latitude), longitude: Number(longitude) };
    }
    return geocoded;
  }, [latitude, longitude, geocoded]);

  // If we have Mapbox token but no coordinates, geocode the address.
  useEffect(() => {
    if (!mapboxToken) return;
    if (latitude != null && longitude != null) return;
    if (!address?.trim()) return;

    const controller = new AbortController();
    setGeocoding(true);

    (async () => {
      const coords = await geocodeAddress(address, mapboxToken, controller.signal);
      if (controller.signal.aborted) return;
      if (coords) setGeocoded({ latitude: coords.latitude, longitude: coords.longitude });
    })().finally(() => {
      if (!controller.signal.aborted) setGeocoding(false);
    });

    return () => controller.abort();
  }, [mapboxToken, latitude, longitude, address]);

  useEffect(() => {
    if (!mapboxToken || !resolvedCoords || !mapContainerRef.current) return;

    const { latitude: lat, longitude: lng } = resolvedCoords;

    const ensureCss = () => {
      const href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      if ([...document.querySelectorAll('link')].some((l) => (l as HTMLLinkElement).href === href)) return;
      const link = document.createElement('link');
      link.href = href;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    };

    const initMap = () => {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl || !mapContainerRef.current) return;

      mapboxgl.accessToken = mapboxToken;

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom: 14,
        });
      } else {
        mapRef.current.setCenter([lng, lat]);
        mapRef.current.setZoom(14);
      }

      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new mapboxgl.Marker({ color: 'hsl(var(--primary))' })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    };

    // If mapbox-gl is already available, use it. Otherwise load it.
    if ((window as any).mapboxgl) {
      ensureCss();
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      script.onload = () => {
        ensureCss();
        // Wait a beat for CSS
        setTimeout(initMap, 50);
      };
      document.head.appendChild(script);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapboxToken, resolvedCoords]);

  const handleNavigate = () => {
    if (!resolvedCoords) {
      // Fallback to Google Maps
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
      return;
    }

    if (mapboxToken) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: userLat, longitude: userLng } = position.coords;
          window.open(
            `https://www.mapbox.com/directions/?origin=${userLat},${userLng}&destination=${resolvedCoords.latitude},${resolvedCoords.longitude}`,
            '_blank'
          );
        },
        () => {
          // Fallback to Google Maps
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
        }
      );
    } else {
      // Fallback to Google Maps
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  return (
    <div className={className}>
      {mapboxToken && resolvedCoords ? (
        <div ref={mapContainerRef} className="h-48 w-full rounded-lg overflow-hidden" />
      ) : (
        <div className="h-48 w-full rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          {geocoding ? 'Buscando localização…' : 'Map preview unavailable'}
        </div>
      )}
      <Button
        variant="outline"
        className="w-full mt-2"
        onClick={handleNavigate}
      >
        <Navigation className="h-4 w-4 mr-2" />
        Open in Maps
      </Button>
    </div>
  );
}

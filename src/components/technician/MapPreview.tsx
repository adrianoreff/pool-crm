import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';

interface MapPreviewProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  mapboxToken?: string | null;
  className?: string;
}

export function MapPreview({ latitude, longitude, address, mapboxToken, className }: MapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapboxToken || !latitude || !longitude || !mapContainerRef.current) return;

    // Load Mapbox GL JS dynamically
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
    script.onload = () => {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Initialize map
      const mapboxgl = (window as any).mapboxgl;
      if (mapboxgl) {
        mapboxgl.accessToken = mapboxToken;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [longitude, latitude],
          zoom: 14,
        });

        // Add marker
        new mapboxgl.Marker({ color: '#F97316' })
          .setLngLat([longitude, latitude])
          .addTo(map);
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = '';
      }
    };
  }, [mapboxToken, latitude, longitude]);

  const handleNavigate = () => {
    if (!latitude || !longitude) {
      // Fallback to Google Maps
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
      return;
    }

    const mapboxToken = (window as any).MAPBOX_TOKEN;
    if (mapboxToken) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: userLat, longitude: userLng } = position.coords;
          window.open(
            `https://www.mapbox.com/directions/?origin=${userLat},${userLng}&destination=${latitude},${longitude}`,
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
      {mapboxToken && latitude && longitude ? (
        <div ref={mapContainerRef} className="h-48 w-full rounded-lg overflow-hidden" />
      ) : (
        <div className="h-48 w-full rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          Map preview unavailable
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

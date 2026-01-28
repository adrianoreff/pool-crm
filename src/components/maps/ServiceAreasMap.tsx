import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ServiceAreaWithTechnician } from '@/types/database';

// Generate a color based on index for visual differentiation
const areaColors = ['#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];

interface ServiceAreasMapProps {
  areas: ServiceAreaWithTechnician[];
  token: string;
}

export function ServiceAreasMap({ areas, token }: ServiceAreasMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !token) return;

    // Initialize Mapbox
    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 4,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Cleanup on unmount
    return () => {
      map.current?.remove();
    };
  }, [token]);

  // Add markers for service areas
  useEffect(() => {
    if (!map.current || areas.length === 0) return;

    // Wait for map to load
    map.current.on('load', () => {
      areas.forEach((area, idx) => {
        if (!map.current) return;
        
        const color = areaColors[idx % areaColors.length];
        
        // If GeoJSON exists, add polygon
        if (area.geojson) {
          const sourceId = `area-${area.id}`;
          const layerId = `area-fill-${area.id}`;
          const outlineId = `area-outline-${area.id}`;

          // Add source
          map.current.addSource(sourceId, {
            type: 'geojson',
            data: area.geojson as unknown as GeoJSON.GeoJSON,
          });

          // Add fill layer
          map.current.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': color,
              'fill-opacity': 0.3,
            },
          });

          // Add outline layer
          map.current.addLayer({
            id: outlineId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': 2,
            },
          });

          // Add popup on click
          map.current.on('click', layerId, (e) => {
            if (!e.lngLat) return;
            
            new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="p-2">
                  <strong>${area.name}</strong>
                  <p class="text-sm">${area.zip_codes?.length || 0} zip codes</p>
                </div>
              `)
              .addTo(map.current!);
          });

          // Change cursor on hover
          map.current.on('mouseenter', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current.on('mouseleave', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
          });
        }
      });

      // Fit bounds to show all areas if any have GeoJSON
      const areasWithGeoJSON = areas.filter(a => a.geojson);
      if (areasWithGeoJSON.length > 0 && map.current) {
        // Calculate bounds - for simplicity, we keep default view
        // In production, you would calculate bounds from all GeoJSON features
      }
    });
  }, [areas]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-card">
        <p className="text-xs font-medium mb-2">Service Areas</p>
        <div className="space-y-1">
          {areas.slice(0, 5).map((area, idx) => (
            <div key={area.id} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: areaColors[idx % areaColors.length] }}
              />
              <span className="truncate max-w-[100px]">{area.name}</span>
            </div>
          ))}
          {areas.length > 5 && (
            <p className="text-xs text-muted-foreground">+{areas.length - 5} more</p>
          )}
        </div>
      </div>
    </div>
  );
}

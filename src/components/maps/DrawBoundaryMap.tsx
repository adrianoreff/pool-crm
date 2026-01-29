import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';

const DRAW_SOURCE_ID = 'draw-points';
const DRAW_LINE_LAYER_ID = 'draw-line';
const DRAW_FILL_LAYER_ID = 'draw-fill';

interface DrawBoundaryMapProps {
  token: string;
  initialGeoJSON?: GeoJSON.Polygon | null;
  onSave: (geojson: GeoJSON.Polygon) => void;
  onCancel: () => void;
  areaName: string;
}

export function DrawBoundaryMap({ token, initialGeoJSON, onSave, onCancel, areaName }: DrawBoundaryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [points, setPoints] = useState<[number, number][]>(() => {
    if (initialGeoJSON?.coordinates?.[0]?.length) {
      const ring = initialGeoJSON.coordinates[0];
      return ring.slice(0, -1).map(([lng, lat]) => [lng, lat]);
    }
    return [];
  });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !token) return;
    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: points.length ? points[points.length - 1] : [-98.5795, 39.8283],
      zoom: 10,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (!map.current) return;
    const onMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (!e.lngLat || isComplete) return;
      const { lng, lat } = e.lngLat;
      setPoints((prev) => [...prev, [lng, lat]]);
    };
    map.current.on('click', onMapClick);
    return () => {
      map.current?.off('click', onMapClick);
    };
  }, [isComplete]);

  useEffect(() => {
    if (!map.current || (points.length === 0 && !isComplete)) return;
    const updateDrawSource = () => {
      if (!map.current) return;
      try {
        if (map.current.getLayer(DRAW_FILL_LAYER_ID)) map.current.removeLayer(DRAW_FILL_LAYER_ID);
        if (map.current.getLayer(DRAW_LINE_LAYER_ID)) map.current.removeLayer(DRAW_LINE_LAYER_ID);
        if (map.current.getSource(DRAW_SOURCE_ID)) map.current.removeSource(DRAW_SOURCE_ID);
      } catch (_) {}
      const coordinates = points.length >= 3 && isComplete ? [...points, points[0]] : points;
      if (coordinates.length < 2) return;
      const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Polygon> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry:
              isComplete && points.length >= 3
                ? { type: 'Polygon', coordinates: [[...points, points[0]]] }
                : { type: 'LineString', coordinates },
          },
        ],
      };
      map.current.addSource(DRAW_SOURCE_ID, { type: 'geojson', data: geojson });
      map.current.addLayer({
        id: DRAW_LINE_LAYER_ID,
        type: 'line',
        source: DRAW_SOURCE_ID,
        paint: {
          'line-color': '#3B82F6',
          'line-width': 2,
          'line-dasharray': isComplete ? [1, 0] : [2, 1],
        },
      });
      if (isComplete && points.length >= 3) {
        map.current.addLayer({
          id: DRAW_FILL_LAYER_ID,
          type: 'fill',
          source: DRAW_SOURCE_ID,
          paint: {
            'fill-color': '#3B82F6',
            'fill-opacity': 0.25,
          },
        });
      }
    };
    if (map.current.isStyleLoaded()) {
      updateDrawSource();
    } else {
      map.current.once('load', updateDrawSource);
    }
    return () => {
      try {
        if (map.current?.getLayer(DRAW_FILL_LAYER_ID)) map.current.removeLayer(DRAW_FILL_LAYER_ID);
        if (map.current?.getLayer(DRAW_LINE_LAYER_ID)) map.current.removeLayer(DRAW_LINE_LAYER_ID);
        if (map.current?.getSource(DRAW_SOURCE_ID)) map.current.removeSource(DRAW_SOURCE_ID);
      } catch (_) {}
    };
  }, [points, isComplete]);

  const handleComplete = () => {
    if (points.length < 3) return;
    setIsComplete(true);
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[...points, points[0]]],
    };
    onSave(polygon);
  };

  const handleClear = () => {
    setPoints([]);
    setIsComplete(false);
  };

  const handleRemoveLast = () => {
    setPoints((prev) => prev.slice(0, -1));
    setIsComplete(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Click on the map to add points for the boundary. Use at least 3 points, then click &quot;Save boundary&quot;.
      </p>
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
        <div ref={mapContainer} className="w-full h-full" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleRemoveLast} disabled={points.length === 0 || isComplete}>
            Undo last point
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={points.length === 0}>
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-primary hover:bg-primary-hover"
            onClick={handleComplete}
            disabled={points.length < 3}
          >
            Save boundary
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="absolute bottom-3 left-3 bg-background/90 rounded px-2 py-1 text-xs">
          {areaName} · {points.length} point{points.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

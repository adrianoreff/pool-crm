import type { LngLat } from './geocode';

export type RouteLeg = {
  distanceMeters: number;
  durationSeconds: number;
};

export type RouteMetrics = {
  legs: RouteLeg[];
  totalMeters: number;
  totalDriveSeconds: number;
  totalMiles: number;
  totalDriveMinutes: number;
};

const cache = new Map<string, RouteMetrics | null>();

function cacheKey(coords: LngLat[]): string {
  return coords.map((c) => `${c.longitude},${c.latitude}`).join('|');
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function formatMiles(miles: number): string {
  if (miles < 0.1) return '0 mi';
  return `${miles.toFixed(1)} mi`;
}

export function formatDurationMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Mapbox Directions API — driving legs between ordered stops.
 */
export async function fetchRouteMetrics(
  coords: LngLat[],
  mapboxToken: string,
  signal?: AbortSignal
): Promise<RouteMetrics> {
  const empty: RouteMetrics = {
    legs: [],
    totalMeters: 0,
    totalDriveSeconds: 0,
    totalMiles: 0,
    totalDriveMinutes: 0,
  };

  if (!mapboxToken || coords.length < 2) return empty;

  const key = cacheKey(coords);
  if (cache.has(key)) {
    const cached = cache.get(key);
    return cached ?? empty;
  }

  try {
    const coordStr = coords.map((c) => `${c.longitude},${c.latitude}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?access_token=${encodeURIComponent(
      mapboxToken
    )}&overview=false&geometries=geojson`;

    const res = await fetch(url, { signal });
    if (!res.ok) {
      cache.set(key, null);
      return empty;
    }

    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route) {
      cache.set(key, null);
      return empty;
    }

    const legs: RouteLeg[] = (route.legs || []).map(
      (leg: { distance?: number; duration?: number }) => ({
        distanceMeters: leg.distance ?? 0,
        durationSeconds: leg.duration ?? 0,
      })
    );

    const totalMeters = route.distance ?? legs.reduce((s, l) => s + l.distanceMeters, 0);
    const totalDriveSeconds =
      route.duration ?? legs.reduce((s, l) => s + l.durationSeconds, 0);

    const result: RouteMetrics = {
      legs,
      totalMeters,
      totalDriveSeconds,
      totalMiles: metersToMiles(totalMeters),
      totalDriveMinutes: totalDriveSeconds / 60,
    };
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return empty;
  }
}

export function clearRouteMetricsCache(): void {
  cache.clear();
}

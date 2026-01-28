export type LngLat = { longitude: number; latitude: number };

const cache = new Map<string, LngLat | null>();

/**
 * Geocodes an address using Mapbox Geocoding API.
 * Uses an in-memory cache (per tab) to avoid repeated requests.
 */
export async function geocodeAddress(
  address: string,
  mapboxToken: string,
  signal?: AbortSignal
): Promise<LngLat | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address
    )}.json?access_token=${encodeURIComponent(mapboxToken)}&limit=1`;

    const res = await fetch(url, { signal });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const json = await res.json();
    const center = json?.features?.[0]?.center;
    if (!Array.isArray(center) || center.length < 2) {
      cache.set(key, null);
      return null;
    }

    const longitude = Number(center[0]);
    const latitude = Number(center[1]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      cache.set(key, null);
      return null;
    }

    const result = { longitude, latitude };
    cache.set(key, result);
    return result;
  } catch {
    // AbortError or network errors
    cache.set(key, null);
    return null;
  }
}

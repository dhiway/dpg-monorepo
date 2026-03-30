interface GeoCoordinate {
  lat: number;
  lng: number;
}

const cache = new Map<string, GeoCoordinate | null>();

/**
 * Geocodes a pincode string to latitude/longitude coordinates.
 * Results are cached in memory to avoid repeated API calls.
 *
 * Resolution order:
 *   1. In-memory cache
 *   2. Custom geocoding API (VITE_GEOCODING_API_URL)
 *   3. Default: India postal pincode API (api.postalpincode.in)
 *
 * Returns null if geocoding fails or no API is available.
 */
export async function geocodePincode(pincode: string): Promise<GeoCoordinate | null> {
  if (!pincode || typeof pincode !== 'string') return null;

  const key = pincode.trim();
  if (cache.has(key)) return cache.get(key)!;

  const customUrl = import.meta.env.VITE_GEOCODING_API_URL;

  try {
    let result: GeoCoordinate | null = null;

    if (customUrl) {
      result = await geocodeFromCustomApi(customUrl, key);
    } else {
      result = await geocodeFromPostalApi(key);
    }

    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}

async function geocodeFromPostalApi(pincode: string): Promise<GeoCoordinate | null> {
  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
  if (!response.ok) return null;

  const data = await response.json();
  const postOffice = data?.[0]?.PostOffice?.[0];

  if (postOffice?.Latitude && postOffice?.Longitude) {
    return {
      lat: Number(postOffice.Latitude),
      lng: Number(postOffice.Longitude),
    };
  }

  return null;
}

async function geocodeFromCustomApi(
  baseUrl: string,
  pincode: string
): Promise<GeoCoordinate | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(pincode)}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();

  // Flexible response parsing — support common geocoding API formats
  if (typeof data.lat === 'number' && typeof data.lng === 'number') {
    return { lat: data.lat, lng: data.lng };
  }
  if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
    return { lat: data.latitude, lng: data.longitude };
  }
  if (Array.isArray(data) && data[0]?.lat && data[0]?.lng) {
    return { lat: Number(data[0].lat), lng: Number(data[0].lng) };
  }

  return null;
}

/**
 * Clears the geocoding cache. Useful for testing.
 */
export function clearGeocodingCache(): void {
  cache.clear();
}

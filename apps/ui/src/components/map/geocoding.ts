interface GeoCoordinate {
  lat: number;
  lng: number;
}

const pincodeCache = new Map<string, GeoCoordinate | null>();
const addressCache = new Map<string, GeoCoordinate | null>();

// Rate limiting for Nominatim (1 request per second max)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function rateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return fn();
}

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
  if (pincodeCache.has(key)) return pincodeCache.get(key)!;

  const customUrl = import.meta.env.VITE_GEOCODING_API_URL;

  try {
    let result: GeoCoordinate | null = null;

    if (customUrl) {
      result = await geocodeFromCustomApi(customUrl, key);
    } else {
      result = await geocodeFromPostalApi(key);
    }

    pincodeCache.set(key, result);
    return result;
  } catch {
    pincodeCache.set(key, null);
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
 * Geocodes an address string to latitude/longitude coordinates using OpenStreetMap Nominatim.
 * Results are cached in memory to avoid repeated API calls.
 * Supports both full address format ("City, State, Country") and city-only format.
 *
 * Rate limited to 1 request per second to comply with Nominatim usage policy.
 *
 * @param address - The address string to geocode
 * @param format - Whether to use full address or city-only format for better matching
 * @returns GeoCoordinate or null if geocoding fails
 */
export async function geocodeAddress(
  address: string,
  format: 'full' | 'city-only' = 'full'
): Promise<GeoCoordinate | null> {
  if (!address || typeof address !== 'string') return null;

  const key = `${format}:${address.trim()}`;
  if (addressCache.has(key)) return addressCache.get(key)!;

  try {
    const result = await rateLimit(() => geocodeFromNominatim(address, format));
    addressCache.set(key, result);
    return result;
  } catch {
    addressCache.set(key, null);
    return null;
  }
}

async function geocodeFromNominatim(
  address: string,
  format: 'full' | 'city-only'
): Promise<GeoCoordinate | null> {
  // Build query based on format preference
  let query = address;
  
  if (format === 'city-only') {
    // Extract just the city/primary location component
    const parts = address.split(',');
    query = parts[0].trim();
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DPG-Map-Viewer/1.0'
    }
  });
  
  if (!response.ok) return null;

  const data = await response.json();

  if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
    };
  }

  return null;
}

/**
 * Clears both the pincode and address geocoding caches. Useful for testing.
 */
export function clearGeocodingCache(): void {
  pincodeCache.clear();
  addressCache.clear();
}

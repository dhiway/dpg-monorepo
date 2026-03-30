import { geocodePincode } from '@/components/map/geocoding';

interface GeoCoordinates {
  lat: number;
  lng: number;
}

/**
 * Domain-specific pincode field configurations
 */
const domainPincodeFields: Record<string, string[]> = {
  student_profile: ['address', 'postal_code'],
  learner_profile: ['pincode'],
  tutor_counsellor_profile: ['pincode'],
  coaching_center: ['city'],
};

/**
 * Finds the pincode value from form data based on domain configuration.
 * Handles both top-level fields (e.g., "pincode") and nested fields (e.g., "address.postal_code").
 */
export function extractPincodeFromForm(
  formData: Record<string, unknown>,
  domain: string
): string | null {
  const fields = domainPincodeFields[domain];
  
  if (!fields) {
    return findPincodeRecursively(formData);
  }

  if (fields.length === 1) {
    const value = formData[fields[0]];
    return typeof value === 'string' ? value : null;
  }

  if (fields.length === 2) {
    const parent = formData[fields[0]];
    if (typeof parent === 'object' && parent !== null) {
      const value = (parent as Record<string, unknown>)[fields[1]];
      return typeof value === 'string' ? value : null;
    }
  }

  return null;
}

/**
 * Recursively searches form data for pincode-like fields when domain config is not available.
 */
function findPincodeRecursively(data: unknown): string | null {
  if (typeof data === 'string' && /^\d{6}$/.test(data)) {
    return data;
  }

  if (typeof data === 'object' && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase().includes('pincode') || key.toLowerCase().includes('postal')) {
        if (typeof value === 'string' && /^\d{6}$/.test(value)) {
          return value;
        }
      }
      if (typeof value === 'object') {
        const result = findPincodeRecursively(value);
        if (result) return result;
      }
    }
  }

  return null;
}

/**
 * Extracts pincode from form data and returns geocoded coordinates.
 * Returns null coordinates if pincode is not found or geocoding fails.
 */
export async function extractAndGeocode(
  formData: Record<string, unknown>,
  domain: string
): Promise<{ pincode: string | null; coordinates: GeoCoordinates | null }> {
  const pincode = extractPincodeFromForm(formData, domain);

  if (!pincode) {
    return { pincode: null, coordinates: null };
  }

  const coordinates = await geocodePincode(pincode);
  return { pincode, coordinates };
}

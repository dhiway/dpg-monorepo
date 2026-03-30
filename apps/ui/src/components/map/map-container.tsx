import * as React from 'react';
import type { RJSFSchema } from '@rjsf/utils';
import type { MapMarker } from '@/engine/types';
import { filterDataBySchema, getPublicFieldKeys } from '@/engine/schema/schema-privacy';
import { getActiveMapProvider } from '@/engine/map/map-registry';
import { geocodePincode } from './geocoding';

interface MapViewProps {
  schema: RJSFSchema;
  items: Array<{ id: string; data: Record<string, unknown> }>;
  onMarkerClick?: (id: string) => void;
  center?: [number, number];
  zoom?: number;
}

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

export function MapView({
  schema,
  items,
  onMarkerClick,
  center = INDIA_CENTER,
  zoom = 5,
}: MapViewProps) {
  const MapProviderComponent = getActiveMapProvider();
  const [markers, setMarkers] = React.useState<MapMarker[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function resolveMarkers() {
      setLoading(true);
      const publicFields = getPublicFieldKeys(schema);
      const titleField = findTitleField(schema);

      const resolved = await Promise.all(
        items.map(async (item) => {
          let lat = resolveCoordinate(item.data, 'lat', 'latitude');
          let lng = resolveCoordinate(item.data, 'lng', 'lon', 'longitude');

          // Fallback to pincode geocoding
          if (lat === null || lng === null) {
            const pincode = item.data.pincode;
            if (typeof pincode === 'string' && pincode) {
              const geo = await geocodePincode(pincode);
              if (geo) {
                lat = geo.lat;
                lng = geo.lng;
              }
            }
          }

          if (lat === null || lng === null) return null;

          const label = titleField
            ? String(item.data[titleField] ?? 'Item')
            : 'Item';

          return {
            id: item.id,
            lat,
            lng,
            label,
            data: filterDataBySchema(
              item.data,
              {
                ...schema,
                properties: Object.fromEntries(
                  Object.entries(schema.properties ?? {}).filter(([k]) =>
                    publicFields.includes(k)
                  )
                ),
              }
            ),
          } satisfies MapMarker;
        })
      );

      if (!cancelled) {
        setMarkers(resolved.filter((m): m is MapMarker => m !== null));
        setLoading(false);
      }
    }

    resolveMarkers();
    return () => { cancelled = true; };
  }, [items, schema]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">Loading map data...</p>
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">
          No items with location data to display on map.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[400px]">
      <MapProviderComponent
        center={center}
        zoom={zoom}
        markers={markers}
        onMarkerClick={onMarkerClick}
      />
    </div>
  );
}

function resolveCoordinate(
  data: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const val = data[key];
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      if (!isNaN(num)) return num;
    }
  }
  return null;
}

function findTitleField(schema: RJSFSchema): string | null {
  if (!schema.properties) return null;
  const candidates = ['name', 'full_name', 'title', 'provider_id', 'learner_id', 'student_id'];
  for (const key of candidates) {
    if (key in schema.properties) return key;
  }
  return Object.keys(schema.properties)[0] ?? null;
}

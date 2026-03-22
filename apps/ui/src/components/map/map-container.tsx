import type { RJSFSchema } from '@rjsf/utils';
import type { MapMarker } from '@/engine/types';
import { filterDataBySchema, getPublicFieldKeys } from '@/engine/schema/schema-privacy';
import { getActiveMapProvider } from '@/engine/map/map-registry';

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

  const markers: MapMarker[] = items
    .map((item) => {
      const lat = resolveCoordinate(item.data, 'lat', 'latitude');
      const lng = resolveCoordinate(item.data, 'lng', 'lon', 'longitude');

      if (lat === null || lng === null) return null;

      const publicFields = getPublicFieldKeys(schema);
      const titleField = findTitleField(schema);
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
          { ...schema, properties: Object.fromEntries(Object.entries(schema.properties ?? {}).filter(([k]) => publicFields.includes(k))) }
        ),
      };
    })
    .filter((m): m is MapMarker => m !== null);

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

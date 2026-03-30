import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from 'react-leaflet';
import L from 'leaflet';
import type { MapProviderProps } from '@/engine/types';
import { registerMapProvider } from '@/engine/map/map-registry';
import { FitBounds } from '../fit-bounds';

import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function LeafletMapProvider({
  center,
  zoom,
  markers,
  onMarkerClick,
}: MapProviderProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-lg"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds markers={markers} />
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={defaultIcon}
          eventHandlers={{
            click: () => onMarkerClick?.(marker.id),
          }}
        >
          <Popup>
            <div className="min-w-[200px]">
              <h3 className="font-semibold">{marker.label}</h3>
              <div className="mt-1 text-sm text-muted-foreground">
                {Object.entries(marker.data)
                  .filter(([key]) => !key.startsWith('_'))
                  .slice(0, 5)
                  .map(([key, val]) => (
                    <div key={key}>
                      <span className="font-medium">
                        {key.replace(/_/g, ' ')}:
                      </span>{' '}
                      {String(val ?? '—')}
                    </div>
                  ))}
              </div>
              {onMarkerClick && (
                <button
                  className="mt-2 text-sm text-primary underline"
                  onClick={() => onMarkerClick(marker.id)}
                >
                  View details
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

// Self-register on import
registerMapProvider({ name: 'leaflet', component: LeafletMapProvider });

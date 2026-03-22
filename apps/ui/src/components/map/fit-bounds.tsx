import { useMap } from 'react-leaflet';
import type { MapMarker } from '@/engine/types';

interface FitBoundsProps {
  markers: MapMarker[];
}

export function FitBounds({ markers }: FitBoundsProps) {
  const map = useMap();

  if (markers.length > 0) {
    const bounds = markers.map((m) => [m.lat, m.lng] as [number, number]);
    if (bounds.length === 1) {
      map.setView(bounds[0], 10);
    } else {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  return null;
}

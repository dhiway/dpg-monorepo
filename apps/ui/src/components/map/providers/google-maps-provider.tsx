import type { MapProviderProps } from '@/engine/types';
// import { registerMapProvider } from '@/engine/map/map-registry';  // uncomment when ready

/**
 * Google Maps provider placeholder.
 *
 * To enable:
 *   1. pnpm add @vis.gl/react-google-maps
 *   2. Set VITE_MAP_PROVIDER=google-maps in .env
 *   3. Set VITE_GOOGLE_MAPS_API_KEY in .env
 *   4. Uncomment the registerMapProvider call below
 */

export function GoogleMapProvider({
  center: _center,
  zoom: _zoom,
  markers: _markers,
  onMarkerClick: _onMarkerClick,
}: MapProviderProps) {
  void _center; void _zoom; void _markers; void _onMarkerClick;
  // TODO: Implement with @vis.gl/react-google-maps
  // const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  // <APIProvider apiKey={apiKey}>
  //   <Map center={center} zoom={zoom}>
  //     {markers.map(marker => (
  //       <AdvancedMarker key={marker.id} position={marker}>
  //         <Pin />
  //       </AdvancedMarker>
  //     ))}
  //   </Map>
  // </APIProvider>

  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed">
      <div className="text-center">
        <p className="text-muted-foreground">
          Google Maps provider not configured.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Install @vis.gl/react-google-maps and set VITE_GOOGLE_MAPS_API_KEY
        </p>
      </div>
    </div>
  );
}

// Uncomment when @vis.gl/react-google-maps is installed:
// registerMapProvider({ name: 'google-maps', component: GoogleMapProvider });

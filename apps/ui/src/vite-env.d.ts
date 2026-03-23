/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAP_PROVIDER: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
  readonly VITE_GEOCODING_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

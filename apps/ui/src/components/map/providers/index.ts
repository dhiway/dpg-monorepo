// Import provider modules to trigger self-registration.
// Each provider calls registerMapProvider() at module load time.

import './leaflet-provider';

// Uncomment to enable Google Maps:
// import './google-maps-provider';

// To add a new map provider:
//   1. Create a new provider file in this directory (e.g., mapbox-provider.tsx)
//   2. Implement MapProviderProps interface
//   3. Call registerMapProvider({ name: 'provider-name', component: YourProvider })
//   4. Add import './your-provider' here

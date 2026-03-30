---
title: UI App
description: Schema-driven React frontend — routes, UI engine, components, and map provider plugin system.
head: []
---

# UI App

The UI app lives in `apps/ui` and is a schema-driven React 19 + Vite frontend. Rather than hard-coding fields and forms, it reads the network's DOT config at runtime and renders everything — domain browsing, profile cards, forms, and maps — from the schemas defined there.

## Stack

- React 19 + Vite
- Tailwind CSS + shadcn/ui (New York style)
- React JSON Schema Form (RJSF) with AJV8 validator
- react-leaflet + OpenStreetMap (default map provider)

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `HomePage` | Browse network participants by domain; list or map view |
| `/profile/new` | `ProfileFormPage` | Create a new profile; pick domain then fill schema-driven form |
| `/profile/:id/edit` | `ProfileFormPage` | Edit an existing profile |

The `?as=<domain>` query param on `/` controls which user role is browsing, which determines which domains and actions are visible.

## UI Engine (`src/engine/`)

The engine layer handles all schema plumbing so that components never touch raw network config directly.

### Schema loading (`schema/schema-loader.ts`)

`SchemaInput` is a union type that lets consumers pass a schema in any form:

```ts
type SchemaInput =
  | object          // inline schema object
  | string          // URL string
  | { url: string } // URL wrapper
  | { api: string; baseUrl: string }; // API reference
```

The loader fetches and caches schema documents within the session.

### `$ref` resolution (`schema/resolve-schema.ts`)

`resolveRefs` and `resolveNetworkRefs` walk any JSON Schema object and expand all `$ref` nodes:

- `#/path/to/fragment` — resolved against the same document via JSON pointer
- Relative paths — resolved relative to the document's base URL
- Remote URLs — fetched and cached

`mergeAllOf` flattens `allOf` arrays after resolution. `extractSchema` pulls a sub-schema out of a resolved document by path.

### Privacy filtering (`schema/schema-privacy.ts`)

Domain schemas can mark individual properties with `"private": true`. The engine exposes:

| Export | Purpose |
|--------|---------|
| `filterSchemaByPrivacy(schema, mode)` | Returns a schema containing only properties matching the `PrivacyMode` |
| `filterDataBySchema(data, schema)` | Strips data keys that are absent from the filtered schema |
| `getPublicFieldKeys(schema)` | Returns an array of non-private property keys |
| `getPrivateFieldKeys(schema)` | Returns an array of private property keys |

`PrivacyMode` is `'all'` (show everything, used in forms) or `'public-only'` (used on cards and map markers).

### Map provider registry (`map/map-registry.ts`)

The map system is a plugin registry. Providers self-register on import and the active provider is selected at runtime via the `VITE_MAP_PROVIDER` environment variable.

```ts
import { registerMapProvider, setActiveMapProvider, getActiveMapProvider } from './map/map-registry';

// In a provider file:
registerMapProvider('leaflet', LeafletMapProvider);

// At startup (controlled by VITE_MAP_PROVIDER):
setActiveMapProvider('leaflet');
```

The `MapProvider` interface each plugin must implement:

```ts
interface MapProvider {
  render(props: MapProviderProps): React.ReactNode;
}

interface MapProviderProps {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
}
```

Currently, `leaflet-provider.tsx` is the only complete implementation. `google-maps-provider.tsx` is a placeholder.

## Key Components

### Layout

| Component | File | Purpose |
|-----------|------|---------|
| `PageShell` | `layout/page-shell.tsx` | Root layout — sidebar + top bar + main content |
| `AppSidebar` | `layout/sidebar.tsx` | Domain navigation list with "Create Profile" button |
| `TopBar` | `layout/top-bar.tsx` | Search input and list/map toggle |

### Cards

| Component | File | Purpose |
|-----------|------|---------|
| `CardGrid` | `cards/card-grid.tsx` | Responsive grid (1–3 columns); shows skeletons while loading |
| `DomainCard` | `cards/domain-card.tsx` | Single item card — renders public fields + action buttons in footer |
| `CardField` / `CardFieldsFromSchema` | `cards/card-field.tsx` | Renders a schema property value; skips private fields |
| `ActionButton` | `cards/action-button.tsx` | Triggers a connect/bookmark/share action |

### Actions

| Component | File | Purpose |
|-----------|------|---------|
| `ActionHandler` | `actions/action-handler.tsx` | Render-prop component managing modal state and action submission |
| `ActionModal` | `actions/action-modal.tsx` | Dialog (desktop) or Drawer (mobile) wrapping a `SchemaForm` for the action's `requirement_schema` |

### Forms

`SchemaForm` (`forms/schema-form.tsx`) wraps RJSF and auto-generates `uiSchema`:

- Private fields are hidden in `compact` mode (used on action modals)
- `format: "date"` properties use the custom `DatePickerWidget`
- `format: "email"` and enum properties get placeholder text

### Map

`MapView` (`map/map-container.tsx`) resolves each item's geographic coordinates — either from direct `latitude`/`longitude` fields, or by geocoding a `pincode` field via `geocodePincode`. Only public fields are included on map markers. The active map provider then renders the markers.

`geocodePincode` (`map/geocoding.ts`) calls `api.postalpincode.in` by default; override with `VITE_GEOCODING_API_URL`.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_MAP_PROVIDER` | `leaflet` | Which registered map provider to activate |
| `VITE_GEOCODING_API_URL` | `api.postalpincode.in` | Pincode geocoding endpoint |
| `VITE_API_URL` | — | Base URL for the API app |

## Adding a New Domain

1. Add the domain entry to the network config JSON with a `default_item_schemas.profile` schema.
2. Mark any sensitive fields with `"private": true` in the schema properties.
3. The sidebar, card grid, and profile form page pick up the new domain automatically — no component changes needed.

## Adding a New Map Provider

1. Create a file in `src/components/map/providers/` that implements `MapProvider`.
2. Call `registerMapProvider('your-key', YourProvider)` inside the file (self-registration on import).
3. Import the file in `providers/index.ts` to trigger registration.
4. Set `VITE_MAP_PROVIDER=your-key` to activate it.

import type { MapProvider, MapProviderProps } from '../types';
import type React from 'react';

const providers = new Map<string, React.ComponentType<MapProviderProps>>();
let activeProviderName = 'leaflet';

export function registerMapProvider(provider: MapProvider): void {
  providers.set(provider.name, provider.component);
}

export function setActiveMapProvider(name: string): void {
  if (!providers.has(name)) {
    throw new Error(`Map provider "${name}" is not registered`);
  }
  activeProviderName = name;
}

export function getActiveMapProvider(): React.ComponentType<MapProviderProps> {
  const provider = providers.get(activeProviderName);
  if (!provider) {
    throw new Error(
      `No active map provider. Registered: ${[...providers.keys()].join(', ')}`
    );
  }
  return provider;
}

export function getRegisteredProviders(): string[] {
  return [...providers.keys()];
}

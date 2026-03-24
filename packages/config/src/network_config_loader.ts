import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  fetchSchema,
  NetworkConfigSchema,
  parseNetworkConfigDocument,
} from '@dpg/schemas';
import {
  type NetworkConfig,
  type NetworkConfigSource,
  parseNetworkConfigUrls,
} from './network_runtime';

type LoadNetworkConfigOptions = {
  source: NetworkConfigSource;
  localFile: string;
  remoteUrls?: string;
};

export async function loadNetworkConfigs(
  options: LoadNetworkConfigOptions
): Promise<NetworkConfig[]> {
  if (options.source === 'local') {
    const localFile = resolve(process.cwd(), options.localFile);
    const contents = await readFile(localFile, 'utf8');
    return [parseNetworkConfigDocument(JSON.parse(contents))];
  }

  if (!options.remoteUrls) {
    throw new Error(
      'NETWORK_CONFIG_URLS is required when NETWORK_CONFIG_SOURCE=remote'
    );
  }

  const urlMap = parseNetworkConfigUrls(options.remoteUrls);
  return Promise.all(
    Object.values(urlMap).map(async (url) => {
      const config = await new fetchSchema(url).getSchema();
      return NetworkConfigSchema.parse(config);
    })
  );
}

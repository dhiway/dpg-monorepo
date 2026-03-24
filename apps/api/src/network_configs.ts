import {
  type NetworkConfigDocument,
  parseNetworkConfigDocument,
} from '@dpg/schemas';
import { loadNetworkConfigs } from '@dpg/config';
import { apiConfig } from './config';

const networkConfigsPromise = loadNetworkConfigs({
  source: apiConfig.network_config_source,
  localFile: apiConfig.network_config_local_file,
  remoteUrls: apiConfig.network_config_urls,
}).then((configs) => configs.map((config) => parseNetworkConfigDocument(config)));

export async function getNetworkConfigs(): Promise<NetworkConfigDocument[]> {
  return networkConfigsPromise;
}

export async function getNetworkConfigByName(
  networkName: string
): Promise<NetworkConfigDocument> {
  const configs = await getNetworkConfigs();
  const config = configs.find((entry) => entry.name === networkName);

  if (!config) {
    throw new Error(`Network "${networkName}" is not configured.`);
  }

  return config;
}

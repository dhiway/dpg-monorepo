import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchSchema } from '@dpg/schemas';
import z from '@dpg/schemas';
import {
  type NetworkConfig,
  type NetworkConfigSource,
  parseNetworkConfigUrls,
} from './network_runtime';

const NetworkActionInteractionSchema = z.object({
  from_domain: z.string().min(1),
  to_domain: z.string().min(1),
});

const NetworkInstanceSchema = z.object({
  domain_name: z.string().min(1),
  instance_name: z.string().min(1).optional(),
  instance_url: z.url(),
  schema_url: z.url().nullable().optional(),
});

const NetworkActionSchema = z.object({
  interactions: NetworkActionInteractionSchema.array().default([]),
});

const NetworkConfigSchema = z.object({
  name: z.string().min(1),
  instances: NetworkInstanceSchema.array().optional().default([]),
  actions: z.record(z.string(), NetworkActionSchema).optional().default({}),
});

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
    return [NetworkConfigSchema.parse(JSON.parse(contents))];
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

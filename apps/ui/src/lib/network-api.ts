import axios from 'axios';

import type { FetchItemsQuery, FetchItemsResponse } from './item-api';
import type { DotNetworkSchema } from '../engine/types';
import { apiConfig } from './api-config';
import { getAuthToken } from './auth-token';

interface CachedSchemaEntry {
  cache_key: string;
  kind: 'network_config' | 'domain_item_schema' | 'instance_custom_item_schema' | 'item_schema_url';
  network?: string;
  domain?: string;
  item_type?: string;
  schema_url?: string;
  schema: DotNetworkSchema;
}

const networkApiClient = axios.create({
  baseURL: apiConfig.getUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

networkApiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface FetchNetworkItemsQuery
  extends Omit<FetchItemsQuery, 'created_by_me'> {
  cache_ttl_seconds?: number;
}

export async function fetchNetworkItems(
  query: FetchNetworkItemsQuery,
  signal?: AbortSignal
): Promise<FetchItemsResponse> {
  const params = new URLSearchParams();

  params.set('item_network', query.item_network);
  params.set('item_domain', query.item_domain);

  if (query.item_type) params.set('item_type', query.item_type);
  if (query.item_id) params.set('item_id', query.item_id);
  if (query.item_instance_url) {
    params.set('item_instance_url', query.item_instance_url);
  }
  if (query.item_schema_url) params.set('item_schema_url', query.item_schema_url);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  if (query.cache_ttl_seconds !== undefined) {
    params.set('cache_ttl_seconds', String(query.cache_ttl_seconds));
  }

  const response = await networkApiClient.get<FetchItemsResponse>(
    '/api/v1/network/item/fetch',
    { params, signal }
  );
  return response.data;
}

export async function fetchNetworkConfigs(): Promise<DotNetworkSchema[]> {
  const response = await networkApiClient.get<CachedSchemaEntry[]>(
    '/api/v1/network/schemas'
  );
  const configs = response.data.filter((e) => e.kind === 'network_config');
  return configs.map((c) => c.schema);
}

export async function fetchNetworkConfig(
  networkName: string
): Promise<DotNetworkSchema> {
  const response = await networkApiClient.get<CachedSchemaEntry[]>(
    '/api/v1/network/schemas',
    { params: { network: networkName } }
  );
  const config = response.data.find((e) => e.kind === 'network_config');
  if (!config) {
    throw new Error(`Network "${networkName}" not found`);
  }
  return config.schema;
}

import axios from 'axios';

import { apiConfig } from './api-config';
import { getAuthToken } from './auth-token';

const apiClient = axios.create({
  baseURL: apiConfig.getUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CreateItemPayload {
  item_network: string;
  item_domain: string;
  item_type: string;
  item_instance_url?: string;
  item_schema_url?: string;
  item_state: Record<string, unknown>;
  item_latitude?: number;
  item_longitude?: number;
}

export interface CreateItemResponse {
  item_type: string;
  item_id: string;
}

export interface FetchItemsQuery {
  item_id?: string;
  item_network: string;
  item_domain: string;
  item_type: string;
  item_instance_url?: string;
  item_schema_url?: string;
  created_by_me?: boolean;
  limit?: number;
  offset?: number;
}

export interface Item {
  item_id: string;
  item_network: string;
  item_domain: string;
  item_type: string;
  item_instance_url: string | null;
  item_schema_url: string | null;
  item_state: Record<string, unknown>;
  item_latitude: number | null;
  item_longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface FetchItemsResponse {
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
  items: Item[];
}

export interface UpdateItemPayload {
  item_instance_url?: string;
  item_schema_url?: string;
  item_state?: Record<string, unknown>;
  item_latitude?: number | null;
  item_longitude?: number | null;
}

export interface UpdateItemResponse {
  item: Item;
}

export interface ApiError {
  error: string;
  message: string;
}

export async function createItem(payload: CreateItemPayload): Promise<CreateItemResponse> {
  const response = await apiClient.post<CreateItemResponse>('/api/v1/item/create', payload);
  return response.data;
}

export async function fetchItems(query: FetchItemsQuery, signal?: AbortSignal): Promise<FetchItemsResponse> {
  const params = new URLSearchParams();

  params.set('item_network', query.item_network);
  params.set('item_domain', query.item_domain);
  params.set('item_type', query.item_type);

  if (query.item_id) params.set('item_id', query.item_id);
  if (query.item_instance_url) params.set('item_instance_url', query.item_instance_url);
  if (query.item_schema_url) params.set('item_schema_url', query.item_schema_url);
  if (query.created_by_me) params.set('created_by_me', 'true');
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));

  const response = await apiClient.get<FetchItemsResponse>('/api/v1/item/fetch', { params, signal });
  return response.data;
}

export async function updateItem(itemId: string, payload: UpdateItemPayload): Promise<UpdateItemResponse> {
  const response = await apiClient.patch<UpdateItemResponse>(`/api/v1/item/${itemId}`, payload);
  return response.data;
}

export interface ItemRef {
  item_network: string;
  item_domain: string;
  item_type: string;
  item_id: string;
}

export interface PerformActionPayload {
  action_name: string;
  source_item: ItemRef;
  target_item: ItemRef;
  requirements_snapshot: Record<string, unknown>;
  created_by: string;
  response_event_type: string;
  response_event_payload: Record<string, unknown>;
}

export interface PerformActionResponse {
  action_id: string;
  action_name: string;
  status: string;
  response_event_type: string;
  response_event_payload: Record<string, unknown>;
}

export async function performAction(payload: PerformActionPayload): Promise<PerformActionResponse> {
  const response = await apiClient.post<PerformActionResponse>('/api/v1/action/perform', payload);
  return response.data;
}

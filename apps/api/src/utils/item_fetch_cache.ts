import { redis } from 'apps/api/db/secondary/redis';
import type { ItemFetchFilters } from './item_fetch_runtime';

const LOCAL_ITEM_FETCH_CACHE_TTL_SECONDS = 1;

export async function getCachedLocalItemFetch<T>(
  filters: ItemFetchFilters,
  loader: () => Promise<T>,
  options?: {
    onCacheEvent?: (input: { cacheKey: string; hit: boolean }) => void;
  }
) {
  const cacheKey = buildLocalItemFetchCacheKey(filters);
  const cached = await redis.get(cacheKey);

  if (cached) {
    options?.onCacheEvent?.({ cacheKey, hit: true });
    return JSON.parse(cached) as T;
  }

  options?.onCacheEvent?.({ cacheKey, hit: false });
  const result = await loader();
  await redis.set(
    cacheKey,
    JSON.stringify(result),
    'EX',
    LOCAL_ITEM_FETCH_CACHE_TTL_SECONDS
  );

  return result;
}

function buildLocalItemFetchCacheKey(filters: ItemFetchFilters) {
  return ['local-item-fetch', stableStringify(filters)].join(':');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

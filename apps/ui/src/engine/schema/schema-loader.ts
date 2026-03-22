import type {
  DotProfileSchema,
  DotNetworkSchema,
  DotActionSchema,
  SchemaInput,
} from '../types';
import type { RJSFSchema } from '@rjsf/utils';

type JsonSchema = RJSFSchema | DotProfileSchema | DotNetworkSchema | DotActionSchema;

const schemaCache = new Map<string, JsonSchema>();

function getCacheKey(input: SchemaInput): string | null {
  if (typeof input === 'string') return input;
  if (typeof input === 'object' && input !== null && 'url' in input) return input.url;
  if (typeof input === 'object' && input !== null && 'api' in input) {
    const base = input.baseUrl ?? '';
    return `${base}${input.api}`;
  }
  return null;
}

export async function loadSchema(input: SchemaInput): Promise<JsonSchema> {
  const cacheKey = getCacheKey(input);

  if (cacheKey && schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  let schema: JsonSchema;

  if (typeof input === 'string') {
    schema = await fetchSchema(input);
  } else if (typeof input === 'object' && input !== null && 'url' in input) {
    schema = await fetchSchema(input.url);
  } else if (typeof input === 'object' && input !== null && 'api' in input) {
    const base = input.baseUrl ?? '';
    schema = await fetchSchema(`${base}${input.api}`);
  } else {
    schema = input;
  }

  if (cacheKey) {
    schemaCache.set(cacheKey, schema);
  }

  return schema;
}

async function fetchSchema(url: string): Promise<JsonSchema> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch schema from ${url}: ${response.status}`);
  }
  return response.json();
}

export function clearSchemaCache(): void {
  schemaCache.clear();
}

export function getCachedSchema(key: string): JsonSchema | undefined {
  return schemaCache.get(key);
}

export function setCachedSchema(key: string, schema: JsonSchema): void {
  schemaCache.set(key, schema);
}

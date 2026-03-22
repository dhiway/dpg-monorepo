import type { RJSFSchema } from '@rjsf/utils';
import type { PrivacyMode } from '../types';

type SchemaProperty = RJSFSchema & { private?: boolean };

function isPrivate(prop: unknown): boolean {
  return typeof prop === 'object' && prop !== null && (prop as SchemaProperty).private === true;
}

export function filterSchemaByPrivacy(
  schema: RJSFSchema,
  mode: PrivacyMode
): RJSFSchema {
  if (mode === 'all' || !schema.properties) return schema;

  const filtered: Record<string, RJSFSchema> = {};
  const newRequired: string[] = [];

  for (const [key, prop] of Object.entries(schema.properties)) {
    if (typeof prop === 'boolean') {
      filtered[key] = prop as unknown as RJSFSchema;
      continue;
    }
    if (!isPrivate(prop)) {
      filtered[key] = prop as RJSFSchema;
      if (schema.required?.includes(key)) {
        newRequired.push(key);
      }
    }
  }

  return {
    ...schema,
    properties: filtered,
    required: newRequired.length > 0 ? newRequired : undefined,
  };
}

export function filterDataBySchema(
  data: Record<string, unknown>,
  schema: RJSFSchema
): Record<string, unknown> {
  if (!schema.properties) return data;

  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(schema.properties)) {
    if (key in data) {
      filtered[key] = data[key];
    }
  }
  return filtered;
}

export function getPublicFieldKeys(schema: RJSFSchema): string[] {
  if (!schema.properties) return [];
  return Object.entries(schema.properties)
    .filter(([_, prop]) => !isPrivate(prop))
    .map(([key]) => key);
}

export function getPrivateFieldKeys(schema: RJSFSchema): string[] {
  if (!schema.properties) return [];
  return Object.entries(schema.properties)
    .filter(([_, prop]) => isPrivate(prop))
    .map(([key]) => key);
}

import Ajv2020 from 'ajv/dist/2020.js';
import { z } from 'zod';

const JsonSchemaDocumentSchema = z.record(z.string(), z.unknown());

const NetworkDomainSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  minimum_cache_ttl_seconds: z.number().int().positive().optional().default(300),
  item_schemas: z
    .record(z.string(), JsonSchemaDocumentSchema)
    .optional()
    .default({}),
  default_item_schemas: z
    .record(z.string(), JsonSchemaDocumentSchema)
    .optional()
    .default({}),
}).transform((domain) => ({
  ...domain,
  item_schemas: {
    ...domain.default_item_schemas,
    ...domain.item_schemas,
  },
}));

const NetworkInstanceSchema = z.object({
  domain_name: z.string().min(1),
  instance_name: z.string().optional(),
  instance_url: z.url(),
  schema_url: z.url().nullable().optional(),
  custom_item_schema_urls: z.record(z.string(), z.url()).optional().default({}),
}).transform((instance) => ({
  ...instance,
  custom_item_schema_urls: {
    ...(instance.schema_url ? { profile: instance.schema_url } : {}),
    ...instance.custom_item_schema_urls,
  },
}));

const NetworkActionInteractionSchema = z.object({
  from_network: z.string().min(1).optional(),
  from_domain: z.string().min(1),
  to_network: z.string().min(1).optional(),
  to_domain: z.string().min(1),
  requirement_schema: JsonSchemaDocumentSchema,
  event_schema: JsonSchemaDocumentSchema,
});

const NetworkActionSchema = z.object({
  description: z.string().optional(),
  interactions: NetworkActionInteractionSchema.array().default([]),
});

export const NetworkConfigSchema = z.object({
  name: z.string().min(1),
  display_name: z.string().optional(),
  description: z.string().optional(),
  schema_standard: z.string().optional(),
  domains: NetworkDomainSchema.array().default([]),
  instances: NetworkInstanceSchema.array().default([]),
  actions: z.record(z.string(), NetworkActionSchema).default({}),
});

export type NetworkConfigDocument = z.infer<typeof NetworkConfigSchema>;
export type NetworkActionInteraction = z.infer<
  typeof NetworkActionInteractionSchema
>;

export function parseNetworkConfigDocument(
  input: unknown
): NetworkConfigDocument {
  return NetworkConfigSchema.parse(input);
}

export function getActionInteraction(
  networkConfig: NetworkConfigDocument,
  input: {
    actionName: string;
    fromNetwork: string;
    fromDomain: string;
    toNetwork: string;
    toDomain: string;
  }
) {
  const action = networkConfig.actions[input.actionName];

  if (!action) {
    throw new Error(
      `Action "${input.actionName}" is not defined for network "${networkConfig.name}".`
    );
  }

  const interaction = action.interactions.find((entry) => {
    const fromNetwork = entry.from_network ?? networkConfig.name;
    const toNetwork = entry.to_network ?? networkConfig.name;

    return (
      fromNetwork === input.fromNetwork &&
      entry.from_domain === input.fromDomain &&
      toNetwork === input.toNetwork &&
      entry.to_domain === input.toDomain
    );
  });

  if (!interaction) {
    throw new Error(
      `Action "${input.actionName}" is not allowed from "${input.fromNetwork}/${input.fromDomain}" to "${input.toNetwork}/${input.toDomain}".`
    );
  }

  return interaction;
}

export function getDomainItemSchema(
  networkConfig: NetworkConfigDocument,
  domain: string,
  itemType: string
) {
  const domainConfig = networkConfig.domains.find(
    (entry) => entry.name === domain
  );

  if (!domainConfig) {
    throw new Error(
      `Domain "${domain}" is not defined for network "${networkConfig.name}".`
    );
  }

  const itemSchema = domainConfig.item_schemas[itemType];

  if (!itemSchema) {
    throw new Error(
      `Item type "${itemType}" is not defined for domain "${domain}" in network "${networkConfig.name}".`
    );
  }

  return itemSchema;
}

export function getDomainItemTypes(
  networkConfig: NetworkConfigDocument,
  domain: string
): string[] {
  const domainConfig = networkConfig.domains.find(
    (entry) => entry.name === domain
  );

  if (!domainConfig) {
    throw new Error(
      `Domain "${domain}" is not defined for network "${networkConfig.name}".`
    );
  }

  return Object.keys(domainConfig.item_schemas);
}

export function getDomainMinimumCacheTtlSeconds(
  networkConfig: NetworkConfigDocument,
  domain: string
): number {
  const domainConfig = networkConfig.domains.find(
    (entry) => entry.name === domain
  );

  if (!domainConfig) {
    throw new Error(
      `Domain "${domain}" is not defined for network "${networkConfig.name}".`
    );
  }

  return domainConfig.minimum_cache_ttl_seconds;
}

export function getInstanceCustomItemSchemaUrl(
  networkConfig: NetworkConfigDocument,
  input: {
    domain: string;
    instanceUrl: string;
    itemType: string;
  }
): string | null {
  const instanceConfig = networkConfig.instances.find(
    (entry) =>
      entry.domain_name === input.domain &&
      entry.instance_url === input.instanceUrl
  );

  if (!instanceConfig) {
    return null;
  }

  return instanceConfig.custom_item_schema_urls[input.itemType] ?? null;
}

export function validateAgainstJsonSchema(
  schema: Record<string, unknown>,
  payload: unknown,
  label: string
) {
  const ajv = new Ajv2020({
    strict: false,
    allErrors: true,
  });

  const validate = ajv.compile(schema);
  const valid = validate(payload);

  if (valid) {
    return;
  }

  const message =
    validate.errors?.map((error) => error.message).filter(Boolean).join(', ') ||
    'unknown validation error';

  throw new Error(`Invalid ${label}: ${message}`);
}

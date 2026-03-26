import z from '@dpg/schemas';

export const InstanceSecretsSchema = z.object({
  INSTANCE_NAME: z.string(),
  INSTANCE_ENV: z.enum(['development', 'production']),
});

export const ApiSecretsSchema = z.object({
  API_DOMAIN: z.string(),
  API_PORT: z.coerce.number().default(4441),
});

export const AuthSecretsSchema = z.object({
  AUTH_SECRET: z.string().min(8),
  AUTH_MIDDLEWARE_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  CREATE_TEST_OTP: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
});

export const NotificationSecretsSchema = z.object({
  NOTIFICATION_SERVICE_ENDPOINT: z.string().optional(),
  NOTIFICATION_SERVICE_KEY_ID: z.string().optional(),
  NOTIFICATION_SERVICE_SECRET: z.string().optional(),
  SMS_TEMPLATE_ID: z.string().optional(),
});

export const SchemaRegistrySecretsSchema = z.object({
  SCHEMA_REGISTRY_URL: z.string().min(1),
});

export const OptionalSchemaRegistrySecretsSchema = z.object({
  SCHEMA_REGISTRY_URL: z.string().optional(),
});

export const NetworkRuntimeSecretsSchema = z.object({
  SERVED_DOMAINS: z.string().min(1),
  NETWORK_CONFIG_SOURCE: z.enum(['local', 'remote']).default('local'),
  NETWORK_CONFIG_LOCAL_FILE: z.string().default(
    'packages/schemas/src/dot_examples/network.json'
  ),
  NETWORK_CONFIG_URLS: z.string().optional(),
});

export const DatabaseSecretsSchema = z.object({
  POSTGRES_URL: z.string().optional(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string().min(8),
  POSTGRES_DB: z.string(),
  POSTGRES_HOST: z.string().default('127.0.0.1'),
  POSTGRES_PORT: z.coerce.number().optional(),
  DATABASE_PORT: z.coerce.number().default(5432),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z.coerce.number().default(6370),
});

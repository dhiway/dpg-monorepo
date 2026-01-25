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
});

export const DatabaseSecretsSchema = z.object({
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string().min(8),
  POSTGRES_DB: z.string(),
  DATABASE_PORT: z.coerce.number().default(5432),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z.coerce.number().default(6370),
});

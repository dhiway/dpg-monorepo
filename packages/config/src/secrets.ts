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

export const DatabaseSecretsSchema = z.object({
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string().min(8),
  POSTGRES_DB: z.string(),
  DATABASE_PORT: z.coerce.number().default(5432),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z.coerce.number().default(6370),
});

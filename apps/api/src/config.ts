import { loadEnv } from './env';

export const { instance, api, auth, databases, notification } = loadEnv();

export const apiConfig = {
  domain: api.API_DOMAIN,
  port: api.API_PORT,
};

export const authConfig = {
  secret: auth.AUTH_SECRET,
  url:
    instance.INSTANCE_ENV === 'development'
      ? `${apiConfig.domain}:${apiConfig.port}/api/auth`
      : `${apiConfig.domain}/api/auth`,
  create_test_otp: auth.CREATE_TEST_OTP,
};

const postgresPort = databases.POSTGRES_PORT ?? databases.DATABASE_PORT;
const pg_url =
  databases.POSTGRES_URL ??
  `postgres://${databases.POSTGRES_USER}:${databases.POSTGRES_PASSWORD}@${databases.POSTGRES_HOST}:${postgresPort}/${databases.POSTGRES_DB}`;

const redis_url =
  databases.REDIS_URL ??
  `redis://:${databases.REDIS_PASSWORD}@${databases.REDIS_HOST}:${databases.REDIS_PORT}`;

export const databasesConfig = {
  pg_url,
  redis_url,
  redis_password: databases.REDIS_PASSWORD,
  redis_port: databases.REDIS_PORT,
};

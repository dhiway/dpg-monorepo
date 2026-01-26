import { loadEnv } from './env';

export const { instance, api, auth, databases } = loadEnv();

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

export const databasesConfig = {
  pg_url: `postgres://${databases.POSTGRES_USER}:${databases.POSTGRES_PASSWORD}@127.0.0.1:5432/${databases.POSTGRES_DB}`,
  redis_password: databases.REDIS_PASSWORD,
  redis_port: databases.REDIS_PORT,
};

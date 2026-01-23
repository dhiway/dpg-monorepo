import { loadEnv } from './env';

export const { instance, api, auth } = loadEnv();

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
};

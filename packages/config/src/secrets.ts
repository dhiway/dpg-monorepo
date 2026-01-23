// manage all the secrets at one place

export const instance_secrets = {
  instance_name: process.env.INSTANCE_NAME,
  instance_env: process.env.INSTANCE_ENV,
};

export const api_secrets = {
  api_domain: process.env.API_DOMAIN,
  api_port: parseInt(process.env.API_PORT || '4441'),
};

export const auth_secrets = {
  better_auth_secret: process.env.AUTH_SECRET,
  better_auth_url:
    process.env.INSTANCE_ENV === 'development'
      ? `${api_secrets.api_domain}:${api_secrets.api_port}/api/auth`
      : `${api_secrets.api_domain}/api/auth`,
};

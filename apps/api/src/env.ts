import {
  ApiSecretsSchema,
  AuthSecretsSchema,
  InstanceSecretsSchema,
} from '@dpg/config';

export function loadEnv() {
  const instance = InstanceSecretsSchema.parse(process.env);
  const api = ApiSecretsSchema.parse(process.env);
  const auth = AuthSecretsSchema.parse(process.env);

  return {
    instance,
    api,
    auth,
  };
}

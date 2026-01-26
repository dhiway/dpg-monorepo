import {
  ApiSecretsSchema,
  AuthSecretsSchema,
  DatabaseSecretsSchema,
  InstanceSecretsSchema,
} from '@dpg/config';

export function loadEnv() {
  const instance = InstanceSecretsSchema.parse(process.env);
  const api = ApiSecretsSchema.parse(process.env);
  const auth = AuthSecretsSchema.parse(process.env);
  const databases = DatabaseSecretsSchema.parse(process.env);
  console.log('env: ', auth.CREATE_TEST_OTP);
  return {
    instance,
    api,
    auth,
    databases,
  };
}

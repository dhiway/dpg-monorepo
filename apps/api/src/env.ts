import {
  ApiSecretsSchema,
  AuthSecretsSchema,
  DatabaseSecretsSchema,
  InstanceSecretsSchema,
  NotificationSecretsSchema,
} from '@dpg/config';

// WebSocket environment variables
export const WEBSOCKET_ENABLED = process.env.WEBSOCKET_ENABLED === 'true';
export const WEBSOCKET_PATH = process.env.WEBSOCKET_PATH || '/ws';
export const REDIS_URL = process.env.REDIS_URL;

export function loadEnv() {
  const instance = InstanceSecretsSchema.parse(process.env);
  const api = ApiSecretsSchema.parse(process.env);
  const auth = AuthSecretsSchema.parse(process.env);
  const databases = DatabaseSecretsSchema.parse(process.env);
  const notification = NotificationSecretsSchema.parse(process.env);
  return {
    instance,
    api,
    auth,
    databases,
    notification,
  };
}

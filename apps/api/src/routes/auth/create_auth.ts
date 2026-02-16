import { createAuth } from '@dpg/auth';
import { allowed_origins, admin_domains } from '@dpg/config';
import { createNotificationClient } from 'notification';
import { api, instance, auth, notification } from '../../config';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { redis } from 'apps/api/db/secondary/redis';

const notificationClient =
  notification.NOTIFICATION_SERVICE_ENDPOINT &&
  notification.NOTIFICATION_SERVICE_KEY_ID &&
  notification.NOTIFICATION_SERVICE_SECRET
    ? createNotificationClient({
        baseUrl: notification.NOTIFICATION_SERVICE_ENDPOINT,
        keyId: notification.NOTIFICATION_SERVICE_KEY_ID,
        secret: notification.NOTIFICATION_SERVICE_SECRET,
      })
    : undefined;

export const authInstance = createAuth({
  appName: instance.INSTANCE_NAME ?? 'DPG',
  nodeEnv: instance.INSTANCE_ENV,

  baseURL:
    instance.INSTANCE_ENV === 'development'
      ? `${api.API_DOMAIN}:${api.API_PORT}/api/auth`
      : `${api.API_DOMAIN}/api/auth`,

  secret: auth.AUTH_SECRET,
  apiDomain: api.API_DOMAIN,

  trustedOrigins: allowed_origins,
  adminDomains: admin_domains,

  db: db,
  redis: redis,

  createTestOTP: auth.CREATE_TEST_OTP,
  notificationClient,
  smsTemplateId: notification.SMS_TEMPLATE_ID,
});

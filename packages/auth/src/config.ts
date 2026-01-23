import { redis } from '@dpg/db';
import { surrealdb } from '@dpg/db';
import { betterAuth } from 'better-auth/minimal';
import {
  admin,
  apiKey,
  bearer,
  openAPI,
  organization,
} from 'better-auth/plugins';
import { surrealdbAdapter } from 'surreal-better-auth';
import { unifiedOtp } from '../plugins/unified_otp';
import { admin_domains, allowed_origins, auth_secrets } from '@dpg/config';
import { api_secrets, instance_secrets } from 'packages/config/src/secrets';

const senderName = instance_secrets.instance_name || 'DPG';

export const auth = betterAuth({
  appName: senderName,
  baseURL: auth_secrets.better_auth_url,
  secret: auth_secrets.better_auth_secret,
  trustedOrigins: allowed_origins,
  advanced: {
    database: {
      generateId: 'uuid',
    },
    disableCSRFCheck: instance_secrets.instance_env !== 'production',
    disableOriginCheck: instance_secrets.instance_env != 'production',
    useSecureCookies: instance_secrets.instance_env === 'production',
    crossSubDomainCookies: {
      enabled: instance_secrets.instance_env === 'production',
      domain: api_secrets.api_domain,
    },
    defaultCookieAttributes: {
      sameSite: instance_secrets.instance_env === 'production' ? 'none' : 'lax',
      secure: instance_secrets.instance_env === 'production',
      partitioned: instance_secrets.instance_env === 'production',
    },
    cookies: {
      sessionToken: {
        attributes: {
          sameSite:
            instance_secrets.instance_env === 'production' ? 'none' : 'lax',
          secure: instance_secrets.instance_env === 'production',
        },
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 10 * 60,
    },
  },
  rateLimit: {
    enabled: false,
  },
  database: surrealdbAdapter(surrealdb),
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ? value : null;
    },
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, 'EX', ttl);
      else await redis.set(key, value, 'EX', 600);
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    openAPI(),
    bearer(),
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
    organization({
      schema: {
        organization: {
          additionalFields: {
            type: {
              type: 'string',
              input: true,
              required: false,
              sortable: true,
              defaultValue: 'employer',
            },
          },
        },
      },
    }),
    unifiedOtp({
      sendPhoneOtp: async ({ phoneNumber, otp }) => {
        console.log({
          phoneNumber,
          message: `Your OTP: ${otp}`,
        });
      },
      sendEmailOtp: async ({ email, otp, user }) => {
        console.log({
          fromName: 'Jobstack seeker',
          fromEmail: '',
          to: email,
          subject: 'Your One-Time Password (OTP) for Jobstack seeker',
          html: otp || user,
        });
      },
      afterUserCreate: async (payload) => {
        return payload;
      },
      adminByDomain: admin_domains,
    }),
    apiKey({
      rateLimit: {
        timeWindow: 1000 * 60 * 60, //1hr
        maxRequests: 10000,
      },
      requireName: true,
      apiKeyHeaders: 'x-api-key',
      defaultPrefix: 'dpg_',
      enableMetadata: true,
    }),
  ],
});

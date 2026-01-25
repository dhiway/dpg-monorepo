import { betterAuth } from 'better-auth/minimal';
import {
  admin,
  apiKey,
  bearer,
  openAPI,
  organization,
} from 'better-auth/plugins';
import { unifiedOtp } from '../plugins/unified_otp';
import type { AuthRuntimeConfig } from './types';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export function createAuth(config: AuthRuntimeConfig) {
  const redis = config.redis;
  return betterAuth({
    appName: config.appName,
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,

    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
      disableCSRFCheck: config.nodeEnv !== 'production',
      disableOriginCheck: config.nodeEnv !== 'production',
      useSecureCookies: config.nodeEnv === 'production',

      crossSubDomainCookies: {
        enabled: config.nodeEnv === 'production',
        domain: config.apiDomain,
      },

      defaultCookieAttributes: {
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
        secure: config.nodeEnv === 'production',
        partitioned: config.nodeEnv === 'production',
      },

      cookies: {
        sessionToken: {
          attributes: {
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
            secure: config.nodeEnv === 'production',
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

    database: drizzleAdapter(config.db, { provider: 'pg' }),

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
        adminByDomain: config.adminDomains,

        sendPhoneOtp: async ({ phoneNumber, otp }) => {
          console.log({ phoneNumber, message: `Your OTP: ${otp}` });
        },

        sendEmailOtp: async ({ email, otp, user }) => {
          console.log({
            to: email,
            subject: 'Your One-Time Password',
            html: otp || user,
          });
        },

        afterUserCreate: async (payload) => payload,
      }),

      apiKey({
        rateLimit: {
          timeWindow: 1000 * 60 * 60,
          maxRequests: 10000,
        },
        requireName: true,
        apiKeyHeaders: 'x-api-key',
        defaultPrefix: 'dpg_',
        enableMetadata: true,
      }),
    ],
  });
}

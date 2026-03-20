---
title: Better Auth And OTP
description: How Better Auth and the custom unified OTP plugin are used in this monorepo.
head: []
---

# Better Auth And Unified OTP

The auth system is built around `better-auth/minimal` and a custom plugin from `packages/auth/plugins/unified_otp.ts`.

## Where auth is created

- `packages/auth/src/config.ts` exports `createAuth()`
- `apps/api/src/routes/auth/create_auth.ts` creates the runtime auth instance
- `apps/api/src/routes/auth/index.ts` mounts the Better Auth handler at `/api/auth/*`

## Better Auth plugins in use

The current auth config enables:

- OpenAPI generation
- bearer auth
- admin roles
- organizations
- API keys
- unified OTP

## Unified OTP purpose

The `unifiedOtp` plugin supports a shared OTP flow for:

- email OTP
- phone OTP
- optional user creation
- optional test OTP mode

## Unified OTP endpoints

The plugin defines endpoints such as:

- `checkUser`
- `requestOtp`
- `verifyOtp`

These are exposed through the Better Auth handler mounted in the API.

## Notification integration

OTP delivery is delegated through the notification client when configured:

- SMS via notification service
- email via notification service
- fallback console logging when the client is not available

## Trusted origins

The auth instance currently uses `allowed_origins` from the config package as `trustedOrigins`. That means CORS/trusted-origin behavior is affected by both env origins and the new network-config-derived origins loaded by the API.

## Test OTP

`CREATE_TEST_OTP=true` enables predictable OTP generation for testing.

Use this only in safe development or testing environments.

---
title: Environment
description: Environment variables currently expected by the monorepo.
head: []
---

# Environment

The root `.env.example` is the source template for local and deployment configuration.

## Core instance variables

- `INSTANCE_NAME`
- `INSTANCE_ENV`
- `API_DOMAIN`
- `API_PORT`
- `AUTH_SECRET`
- `ALLOWED_ORIGINS`

## Database variables

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `DATABASE_PORT`
- `POSTGRES_URL` as an optional full override
- `REDIS_HOST`
- `REDIS_PASSWORD`
- `REDIS_PORT`
- `REDIS_URL` as an optional full override

## Notification variables

- `NOTIFICATION_SERVICE_ENDPOINT`
- `NOTIFICATION_SERVICE_KEY_ID`
- `NOTIFICATION_SERVICE_SECRET`
- `SMS_TEMPLATE_ID`

## Schema registry

- `SCHEMA_REGISTRY_URL`

`packages/config/src/secrets.ts` now exposes `SchemaRegistrySecretsSchema`, which requires `SCHEMA_REGISTRY_URL` to be a valid URL. Use this when a service needs to resolve domain schemas from an external registry through `fetchSchema`.

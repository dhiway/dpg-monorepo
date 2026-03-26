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
- `SERVED_DOMAINS`
- `NETWORK_CONFIG_SOURCE`
- `NETWORK_CONFIG_LOCAL_FILE`
- `NETWORK_CONFIG_URLS`
- `SCHEMA_REGISTRY_URL`

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

`SCHEMA_REGISTRY_URL` can now be used in two forms:

```bash
SCHEMA_REGISTRY_URL="https://registry.example.com/schemas/"
```

With a single base URL, the API derives one network config URL per served network using `{base}/{network}/network.json`.

```bash
SCHEMA_REGISTRY_URL="yellow_dot=https://registry.example.com/schemas/yellow_dot/network.json,blue_dot=https://registry.other.example.com/schemas/blue_dot/network.json"
```

With explicit mappings, each entry is `network=url`. The URL may be a full `network.json` URL or a registry base URL that ends in that network’s schema folder.

## Network runtime binding

`SERVED_DOMAINS` declares which network/domain pairs a backend serves.

Format:

```bash
SERVED_DOMAINS="yellow_dot/student,blue_dot/seeker"
```

Each entry is `network/domain`.

This value is parsed by the config layer and exposed to the API runtime so the backend can declare:

- which network it belongs to
- which domain or domains it serves
- which network-config instance origins should be allowed to call it when network-driven CORS is applied

## Network config source

The API supports two ways to load network config:

```bash
NETWORK_CONFIG_SOURCE="local"
NETWORK_CONFIG_LOCAL_FILE="packages/schemas/src/dot_examples/network.json"
```

Use this in development when you want to test against a checked-in example file.

```bash
NETWORK_CONFIG_SOURCE="remote"
NETWORK_CONFIG_URLS="yellow_dot=https://registry.example.com/yellow-dot/network.json"
```

Use this in production when the network config should be fetched from one or more remote schema URLs.

If `NETWORK_CONFIG_URLS` is not set, the API falls back to `SCHEMA_REGISTRY_URL`.

When loaded, the API merges:

- `ALLOWED_ORIGINS` from env
- instance origins allowed by the network config for the backend’s `SERVED_DOMAINS`

This merged list is used for the Fastify CORS check.

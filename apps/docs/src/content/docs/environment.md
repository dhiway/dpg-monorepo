---
title: Environment
description: Complete environment reference for local development and production deployment.
head: []
---

# Environment

The root `.env.example` is the source template for local and production configuration.

## Minimal Local Example

```bash
INSTANCE_NAME="dpg-local"
INSTANCE_ENV="development"
API_DOMAIN="http://localhost"
API_PORT="2742"
AUTH_SECRET="replace-this"
ALLOWED_ORIGINS="http://localhost:3000"
SERVED_DOMAINS="yellow_dot/student"
NETWORK_CONFIG_SOURCE="local"
NETWORK_CONFIG_LOCAL_FILE="examples/schemas/yellow_dot/network.json"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="replace-this"
POSTGRES_DB="postgresdb"
POSTGRES_HOST="127.0.0.1"
DATABASE_PORT="5432"
REDIS_HOST="127.0.0.1"
REDIS_PASSWORD="replace-this"
REDIS_PORT="5555"
```

## Core Instance Variables

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

## Database Variables

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `DATABASE_PORT`
- `POSTGRES_URL`
- `REDIS_HOST`
- `REDIS_PASSWORD`
- `REDIS_PORT`
- `REDIS_URL`

If `POSTGRES_URL` is present, the individual PostgreSQL fields are fallbacks.

If `REDIS_URL` is present, the individual Redis fields are fallbacks.

## Notification Variables

- `NOTIFICATION_SERVICE_ENDPOINT`
- `NOTIFICATION_SERVICE_KEY_ID`
- `NOTIFICATION_SERVICE_SECRET`
- `SMS_TEMPLATE_ID`

## `SERVED_DOMAINS`

`SERVED_DOMAINS` tells the backend which `network/domain` pairs it serves.

Example:

```bash
SERVED_DOMAINS="yellow_dot/student,blue_dot/seeker"
```

This affects:

- which create and fetch requests are allowed
- which schema routes are served
- which instance origins can be allowed by network-driven CORS

## Network Config Source

### Local example file

```bash
NETWORK_CONFIG_SOURCE="local"
NETWORK_CONFIG_LOCAL_FILE="examples/schemas/yellow_dot/network.json"
```

Best for:

- development
- demos
- schema iteration

### Remote config URLs

```bash
NETWORK_CONFIG_SOURCE="remote"
NETWORK_CONFIG_URLS="yellow_dot=https://registry.example.com/yellow-dot/network.json"
```

Best for:

- production
- multi-network instances
- remote registries

## `SCHEMA_REGISTRY_URL`

`SCHEMA_REGISTRY_URL` can be used in two forms.

### Single registry base URL

```bash
SCHEMA_REGISTRY_URL="https://registry.example.com/schemas/"
```

This resolves served networks as:

- `{base}/{network}/network.json`

### Explicit network mappings

```bash
SCHEMA_REGISTRY_URL="yellow_dot=https://registry.example.com/schemas/yellow_dot/network.json,blue_dot=https://registry.other.example.com/schemas/blue_dot/network.json"
```

If `NETWORK_CONFIG_URLS` is not set, the API falls back to `SCHEMA_REGISTRY_URL`.

## Related Guides

- [Getting Started](/getting-started)
- [Local And Docker](/hosting/local-docker)
- [Single Instance](/hosting/single-domain)
- [Multi-Instance Hosting](/hosting/multi-domain-instance)

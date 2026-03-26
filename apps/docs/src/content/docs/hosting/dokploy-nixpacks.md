---
title: Dokploy Nixpacks
description: Production deployment guide for DPG on Dokploy using Nixpacks.
head: []
---

# Dokploy With Nixpacks

When deploying the API with Dokploy and Nixpacks, there are two parts:

- build/runtime commands
- normal DPG environment variables

## Nixpacks Settings

```bash
NIXPACKS_TURBO_APP_NAME="Dpg Api"
NIXPACKS_BUILD_CMD="pnpm build:api"
NIXPACKS_START_CMD="pnpm start:api"
NIXPACKS_INSTALL_CMD="pnpm install --no-frozen-lockfile"
```

## Why these values

- `NIXPACKS_TURBO_APP_NAME` gives the deployment a readable label
- `NIXPACKS_BUILD_CMD` builds only the API app
- `NIXPACKS_START_CMD` runs the built API
- `NIXPACKS_INSTALL_CMD` avoids install failures caused by lockfile strictness on some hosted builders

## Suggested Dokploy Env

Add the normal runtime env alongside the Nixpacks env:

```bash
INSTANCE_NAME="Dpg Api"
INSTANCE_ENV="production"
API_DOMAIN="https://api.example.com"
API_PORT="2742"
SERVED_DOMAINS="yellow_dot/student"
NETWORK_CONFIG_SOURCE="remote"
NETWORK_CONFIG_URLS="yellow_dot=https://registry.example.com/yellow-dot/network.json"
POSTGRES_URL="postgres://user:password@host:5432/dbname"
REDIS_URL="redis://:password@host:6379"
AUTH_SECRET="replace-this"
```

## Production Checklist

- `API_DOMAIN` should be the public domain, not `localhost`
- use `POSTGRES_URL` and `REDIS_URL` for hosted databases when possible
- if the deployment serves multiple domains, set them in `SERVED_DOMAINS`

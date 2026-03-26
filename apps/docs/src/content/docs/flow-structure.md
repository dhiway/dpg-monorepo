---
title: Flow Structure
description: How the current DPG backend flow is structured.
head: []
---

# Flow Structure

The current backend flow is organized in layers.

## 1. Environment and runtime config

- `.env` is parsed by `apps/api/src/env.ts`
- `packages/config` owns the Zod schemas for env validation
- `apps/api/src/config.ts` turns env values into runtime config objects

## 2. Network identity

The API declares which network/domain pairs it serves through `SERVED_DOMAINS`.

Example:

```bash
SERVED_DOMAINS="yellow_dot/student"
```

That identity is used with the network config to decide:

- which registered instance origins should be allowed through CORS
- which network/domain context the backend exposes at its root endpoint

## 3. Network config

The network config defines:

- available domains
- registered instances
- action interaction rules
- default item schemas for domains
- requirement and event schemas for actions

The API can load this config from a local JSON file in development or remote schema URLs in production.

## 4. API layer

The API app uses Fastify and mounts:

- `/api/auth/*` for Better Auth handlers
- `/api/v1/*` for application routes

## 5. Data layer

`packages/database` exposes Drizzle reference tables and partition helpers.

The SQL scripts define partitioned parent tables:

- `items`
- `item_actions`
- `action_events`

Partitions are intentionally not hardcoded in the base SQL. They are created per deployment or at runtime.

## 6. Schemas

`packages/schemas` provides:

- the default `zod` export used across the repo
- request/response schemas
- a fetch helper for remote schema JSON

Checked-in example network configs now live under `examples/schemas`.

## 7. Auth and OTP

`packages/auth` wraps Better Auth setup and adds the custom `unifiedOtp` plugin for phone/email OTP flows.

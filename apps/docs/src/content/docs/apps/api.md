---
title: API Overview
description: How the DPG API is organized and what each major route group does.
head: []
---

# API Overview

The DPG API lives in `apps/api` and is a Fastify application with:

- Zod request validation
- OpenAPI generation
- Scalar API reference
- PostgreSQL-backed storage
- Redis-backed caching
- network-aware schema and instance behavior

## Mounted Routes

- `GET /`
- `/api/auth/*`
- `/api/v1/*`

## Item Routes

Current item endpoints under `/api/v1/item`:

- `POST /create`
- `GET /fetch`
- `PATCH /:itemNetwork/:itemDomain/:itemType/:itemId`

### `POST /item/create`

Creates an item on the current instance.

The client sends:

- `item_network`
- `item_domain`
- `item_type`
- `item_state`

The backend generates:

- `item_instance_url`
- `item_schema_url`
- `created_by`

### `GET /item/fetch`

Instance-local fetch only.

Use it for:

- current instance dashboards
- “my items” views
- local service reads

This route is cached in Redis for a very short TTL.

### `PATCH /item/:...`

Updates an owned item.

## Action And Event Routes

- `POST /action/perform`
- `POST /event/store`

These routes validate payloads against the network action contract.

## Network Routes

- `GET /network/item/fetch`
- `POST /network/item/count_local`
- `POST /network/item/fetch_local`
- `GET /network/schemas`
- `GET /network/schema/:network/:domain/:itemType`
- `POST /network/refetch_schemas`

### `GET /network/item/fetch`

This is the inter-instance read path.

It:

- discovers instances for the requested domain
- runs the count phase
- excludes zero-result instances
- builds a page plan
- fetches only required slices
- caches counts and merged pages in Redis

### `POST /network/item/count_local`

Internal server-to-server count endpoint used by the aggregator.

### `POST /network/item/fetch_local`

Internal server-to-server fetch endpoint used by the aggregator.

### Schema Routes

- `GET /network/schemas` returns cached schema documents
- `GET /network/schema/:network/:domain/:itemType` returns one concrete schema
- `POST /network/refetch_schemas` refreshes schema cache

## API Documentation

- OpenAPI metadata is registered in `src/server.ts`
- Scalar UI is mounted at `/api/reference`

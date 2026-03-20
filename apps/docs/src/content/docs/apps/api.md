---
title: API App
description: Fastify API app responsibilities, routes, and runtime behavior.
head: []
---

# API App

The API app lives in `apps/api` and runs a Fastify server with Zod-based validation and serialization.

## Runtime stack

- Fastify
- `fastify-type-provider-zod`
- Fastify CORS
- Fastify Swagger
- Scalar API reference
- Drizzle ORM

## Mounted routes

- `GET /` returns a simple welcome response.
- Auth routes are registered from `./routes/auth`.
- Versioned business routes are registered under `/api/v1`.

## Item routes

Current item endpoints under `/api/v1/item`:

- `POST /create`
- `GET /fetch`
- `PATCH /:itemType/:itemId`

### Create item

`POST /api/v1/item/create` accepts the insert schema minus generated fields such as `item_id`, `created_at`, and `updated_at`. Before insert, the handler ensures the item partition exists.

### Fetch items

`GET /api/v1/item/fetch` supports filters for:

- `item_id`
- `item_type`
- `item_domain`
- `item_domain_url`
- `item_schema_id`
- `item_schema_url`
- `item_state`
- `limit`
- `offset`

`item_state` filtering uses JSONB containment in PostgreSQL.

### Update item

`PATCH /api/v1/item/:itemType/:itemId` accepts a partial item payload, updates `updated_at`, and returns `404` when the target item does not exist.

## API documentation

- OpenAPI metadata is registered in `src/server.ts`.
- Scalar UI is mounted at `/api/reference`.

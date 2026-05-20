---
title: Items
description: Item create, fetch, update, validation, ownership, and storage behavior.
head: []
---

Items are schema-typed records owned by users and scoped to a network/domain/type.

## Routes

```text
POST  /api/v1/item/create
GET   /api/v1/item/fetch
PATCH /api/v1/item/:itemId
```

## Create Item

`POST /api/v1/item/create` creates an item on the current instance.

Client sends:

- `item_network`
- `item_domain`
- `item_type`
- `item_state`
- optional `item_latitude`
- optional `item_longitude`

Backend generates:

- `item_id`
- `item_instance_url`
- `item_schema_url`
- `created_by`
- timestamps

Before insert, the route:

- checks the instance serves the requested `network/domain`
- loads the network config
- verifies `item_type` is defined for the domain
- resolves an instance custom item schema when configured
- validates `item_state` with JSON Schema
- ensures the item partition exists

## Fetch Items

`GET /api/v1/item/fetch` is local-only. It reads from the current API instance database.

Supported filters include:

- `item_id`
- `item_network`
- `item_domain`
- `item_type`
- `item_instance_url`
- `item_schema_url`
- `item_state`
- `item_latitude`
- `item_longitude`
- `radius_meters`
- `limit`
- `offset`

Geo search requires `item_latitude`, `item_longitude`, and `radius_meters` together.

## Update Item

`PATCH /api/v1/item/:itemId` updates an item owned by the authenticated user.

The route only updates rows where:

- `item_id` matches the route param
- `created_by` matches the authenticated user

The update body is partial but must contain at least one update field.

## Storage Notes

The API writes through the `items` Drizzle reference table. The database package creates item partitions lazily with `ensureItemPartition()`.

Partition keys are based on `item_network` and `item_domain`, so queries should include both when possible to enable partition pruning. Leaf partition tables are named following the `i_p_{network}_{domain}` schema.

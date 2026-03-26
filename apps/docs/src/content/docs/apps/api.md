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
- `PATCH /:itemNetwork/:itemDomain/:itemType/:itemId`

### Create item

`POST /api/v1/item/create` accepts the insert schema minus generated fields such as `item_id`, `created_by`, `created_at`, and `updated_at`. Before insert, the handler ensures the item partition exists.

The item owner is always the authenticated user. The handler writes `items.created_by = request.user.id`, so the client must not send `created_by` in the body.

### Fetch items

`GET /api/v1/item/fetch` supports filters for:

- `item_id`
- `item_type`
- `item_domain`
- `item_instance_url`
- `item_schema_url`
- `item_state`
- `limit`
- `offset`

`item_state` filtering uses JSONB containment in PostgreSQL.

### Update item

`PATCH /api/v1/item/:itemNetwork/:itemDomain/:itemType/:itemId` accepts a partial item payload, updates `updated_at`, and only updates rows that belong to the authenticated user.

If the item does not exist, or if it belongs to a different user, the handler returns `404`.

## Action and event routes

Current action and event endpoints under `/api/v1`:

- `POST /action/perform`
- `POST /event/store`
- `GET /network/schemas`
- `POST /network/refetch_schemas`

`created_by` for action and event writes must be a real existing Better Auth `user.id`. Sending a placeholder like `USER_ID` will fail because both `item_actions.created_by` and `action_events.created_by` are foreign keys to the `user` table.

Use this query first when testing manually:

```sql
select id, email, name
from "user"
limit 10;
```

Then copy one real `id` value into the `created_by` field in the request bodies below.

## Test scenario

Suggested order:

1. `POST /api/v1/item/create` for the student item
2. `POST /api/v1/item/create` for the tutor item
3. `POST /api/v1/action/perform`
4. optionally `POST /api/v1/event/store`

### Create student item

The item create body does not include `created_by`. The API sets that automatically from the authenticated user.

```json
{
  "item_network": "yellow_dot",
  "item_domain": "student",
  "item_type": "profile_1.0",
  "item_instance_url": "http://localhost:2783/items/student/arya",
  "item_schema_url": "https://schemas.example.com/student_profile_1.0.json",
  "item_state": {
    "name": "Arya",
    "grade": "10",
    "city": "Bengaluru",
    "preferred_subject": "math"
  }
}
```

### Create tutor item

The item create body does not include `created_by`. The API sets that automatically from the authenticated user.

```json
{
  "item_network": "yellow_dot",
  "item_domain": "tutor",
  "item_type": "profile_1.0",
  "item_instance_url": "http://localhost:2783/items/tutor/ravi",
  "item_schema_url": "https://schemas.example.com/tutor_profile_1.0.json",
  "item_state": {
    "name": "Ravi",
    "subjects": ["math", "science"],
    "experience_years": 6,
    "teaching_mode": "hybrid"
  }
}
```

### Perform action

Replace `source_item.item_id` and `target_item.item_id` with real ids returned from item creation. Replace `created_by` with a real Better Auth `user.id`.

```json
{
  "action_name": "connect",
  "source_item": {
    "item_network": "yellow_dot",
    "item_domain": "student",
    "item_type": "profile_1.0",
    "item_id": "67b6558e-46f2-45c5-953a-f417e8162332"
  },
  "target_item": {
    "item_network": "yellow_dot",
    "item_domain": "tutor",
    "item_type": "profile_1.0",
    "item_id": "46cc4c8e-f875-40c3-b4f4-e7d211afdc59"
  },
  "requirements_snapshot": {
    "subject": "math",
    "goal": "board_exam_preparation"
  },
  "created_by": "REAL_USER_ID",
  "response_event_type": "action_response",
  "response_event_payload": {
    "status": "pending",
    "message": "Connect request created"
  },
  "response_event_metadata": {
    "request_id": "req_local_001",
    "source": "manual_test"
  }
}
```

### Store event directly

Replace `action_id` and item ids with real values. Replace `created_by` with a real Better Auth `user.id`.

```json
{
  "event_type": "action_response",
  "action_name": "connect",
  "action_id": "ACTION_ID",
  "source_item": {
    "item_network": "yellow_dot",
    "item_domain": "student",
    "item_type": "profile_1.0",
    "item_id": "SOURCE_ITEM_ID"
  },
  "target_item": {
    "item_network": "yellow_dot",
    "item_domain": "tutor",
    "item_type": "profile_1.0",
    "item_id": "TARGET_ITEM_ID"
  },
  "event_payload": {
    "status": "accepted",
    "message": "Tutor accepted the connect request"
  },
  "event_metadata": {
    "request_id": "req_local_002",
    "source": "manual_test"
  },
  "created_by": "REAL_USER_ID"
}
```

## API documentation

- OpenAPI metadata is registered in `src/server.ts`.
- Scalar UI is mounted at `/api/reference`.

## Network schema cache routes

`GET /api/v1/network/schemas` returns the disk-cached network configs, inline domain item schemas, instance custom schemas, and any remote item schemas fetched from stored items.

`POST /api/v1/network/refetch_schemas` reloads configured network schemas and refreshes the disk cache. This is the route to call after changing a remote registry or after bootstrap if the instance needs the latest custom item schemas for UI rendering.

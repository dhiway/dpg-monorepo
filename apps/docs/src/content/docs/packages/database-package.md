---
title: Database Package
description: What the database package exposes and how to use it.
head: []
---

# Database Package

`packages/database` contains the data-layer contracts shared by the API.

## What it exposes

- `items` reference table
- `item_events` reference table
- partition helpers
- SQL scripts for base table creation

## Why reference tables exist

Drizzle does not manage partitioned tables directly the way this project needs, so the package exposes ref tables that match the parent partitioned tables.

## Typical usage

```ts
import { items, ensureItemPartition } from '@dpg/database';
```

The API uses:

- `items` for CRUD queries
- `ensureItemPartition()` before inserting a new item

## SQL files

- `create_items.sql` contains generic parent table DDL
- `create_items_partitions.example.sql` contains example partition definitions only

## Postgres setup flow

The database setup is split into two parts on purpose:

1. Run `create_items.sql`
2. Run your partition creation SQL
3. Start the API, which can create missing runtime partitions through the helpers

The first script creates the parent partitioned tables and shared indexes. The second script creates deployment-specific item-type partitions.

## Extensions used

`create_items.sql` enables three PostgreSQL extensions:

- `pgcrypto`: used for `gen_random_uuid()` defaults on `item_id` and `event_id`
- `cube`: required by the earthdistance extension
- `earthdistance`: used for geo lookups with `ll_to_earth`, `earth_box`, and `earth_distance`

These extensions are needed before the geo index and distance filters can work.

## Base tables

The package models two parent tables:

- `items`: stores the current item record
- `item_events`: stores event records linked back to an item

Important columns in `items`:

- routing keys: `item_network`, `item_domain`, `item_type`
- record id: `item_id`
- instance fields: `item_instance_url`, `item_schema_url`
- document fields: `item_state`
- geo fields: `item_latitude`, `item_longitude`
- timestamps: `created_at`, `updated_at`

Important columns in `item_events`:

- item reference: `item_network`, `item_domain`, `item_type`, `item_id`
- event routing: `event_type`, `event_id`
- parties: `actor_network`, `actor_domain`, `counterparty_network`, `counterparty_domain`
- event data: `action_name`, `event_schema_url`, `event_payload`, `event_metadata`
- timestamps: `occurred_at`, `created_at`

`item_events` has a foreign key back to `items` on:

```sql
(item_network, item_domain, item_type, item_id)
```

That keeps an event tied to the exact item partition path it belongs to.

## Event payload vs event metadata

The intended difference is:

- `event_payload`: the business event body itself. This is the domain-specific content that describes what happened.
- `event_metadata`: transport, tracing, ingestion, or processing context around the event.

Use `event_payload` for values that matter to the event semantics, for example:

- status transitions
- amounts
- messages
- references used by downstream business logic

Use `event_metadata` for values that help operate the system, for example:

- request ids
- source service names
- ingestion timestamps from an upstream system
- retry counters
- debug or audit annotations

As a rule: if changing the field would change the meaning of the event, it belongs in `event_payload`. If it only changes how the event was delivered, observed, or processed, it belongs in `event_metadata`.

## Partition strategy

The schema uses hierarchical list partitioning.

For `items`:

- parent table partitions by `item_type`
- partition tables are named as `<item_type>_item`
- a default partition named `items_default` catches rows without a dedicated item-type partition

This is the effective shape:

```text
items
  -> profile_item
  -> notify_event_item
  -> items_default
```

This design keeps partition naming predictable and avoids partition explosion across network/domain combinations.

## How the scripts work

### `create_items.sql`

This script creates the partitioned parent tables only. It does not create business-specific partitions.

It also creates shared indexes:

- btree lookup indexes for common filters and ordering
- GIN indexes for event JSONB fields
- a GiST geo index using `ll_to_earth(item_latitude, item_longitude)`

The parent tables are defined with:

```sql
PARTITION BY LIST (item_type)
```

That means rows are routed only by `item_type`.

### `create_items_partitions.example.sql`

This is an example deployment script. It shows concrete item-type partitions.

It first verifies that:

- `items` exists

Then it creates:

- `profile_item`
- `notify_event_item`
- `items_default`

## Runtime partition helpers

The package exports:

- `ensureItemPartition(db, network, domain, type)`

This helper creates missing partitions lazily with `CREATE TABLE IF NOT EXISTS`.

`ensureItemPartition()` creates:

1. `<item_type>_item`
2. `items_default` if it does not already exist

The helper validates `item_type` with this rule:

```ts
/^[a-z][a-z0-9_]{0,20}$/
```

That keeps generated table names safe and short enough for PostgreSQL identifiers.

## Why query filters matter

Partition pruning only works well when the query includes the partition key.

For `items`, the most important partition filter is:

- `item_type`

These are still useful indexed filters:

- `item_network`
- `item_domain`

The fetch route already follows this pattern. It builds a `where` clause that includes these keys when present, which helps PostgreSQL avoid scanning unrelated partitions.

## Example table layout

If you support item types:

- `profile`
- `notify_event`

you would expect tables like:

```text
items
profile_item
notify_event_item
items_default
```

## Example Drizzle queries

### Insert an item

This matches the API create flow: prepare the partition first, then insert through the `items` reference table.

```ts
import { db } from 'apps/api/db/postgres/drizzle_config';
import { ensureItemPartition, items } from '@dpg/database';

await ensureItemPartition(db, 'yellow_dot', 'student', 'profile');

const created = await db
  .insert(items)
  .values({
    item_network: 'yellow_dot',
    item_domain: 'student',
    item_type: 'profile',
    item_instance_url: 'student://123',
    item_schema_url: 'https://schemas.example.com/student_profile_v1.json',
    item_state: { name: 'Asha' },
    item_latitude: 12.9716,
    item_longitude: 77.5946,
  })
  .returning();
```

### Fetch items with partition-friendly filters

```ts
import { and, eq, sql } from 'drizzle-orm';
import { db } from 'apps/api/db/postgres/drizzle_config';
import { items } from '@dpg/database';

const result = await db
  .select()
  .from(items)
  .where(
    and(
      eq(items.item_network, 'yellow_dot'),
      eq(items.item_domain, 'student'),
      eq(items.item_type, 'profile')
    )
  )
  .orderBy(sql`${items.created_at} DESC`)
  .limit(20);
```

### Filter by JSONB state

```ts
const result = await db
  .select()
  .from(items)
  .where(
    sql`${items.item_state} @> ${JSON.stringify({ verified: true })}::jsonb`
  );
```

### Geo search using `earthdistance`

```ts
const result = await db
  .select()
  .from(items)
  .where(
    and(
      eq(items.item_network, 'yellow_dot'),
      eq(items.item_domain, 'student'),
      sql`
        earth_box(
          ll_to_earth(${12.9716}, ${77.5946}),
          ${5000}
        ) @> ll_to_earth(${items.item_latitude}, ${items.item_longitude})
      `,
      sql`
        earth_distance(
          ll_to_earth(${12.9716}, ${77.5946}),
          ll_to_earth(${items.item_latitude}, ${items.item_longitude})
        ) <= ${5000}
      `
    )
  );
```

### Insert an event

```ts
import { item_events } from '@dpg/database';

await db.insert(item_events).values({
  item_network: 'yellow_dot',
  item_domain: 'student',
  item_type: 'profile',
  item_id: '11111111-1111-1111-1111-111111111111',
  event_type: 'connect',
  action_name: 'request_sent',
  actor_network: 'yellow_dot',
  actor_domain: 'student',
  counterparty_network: 'blue_dot',
  counterparty_domain: 'tutor',
  event_payload: { source: 'api', message: 'Interested in connecting' },
  event_metadata: { request_id: 'req_123', ingestion_source: 'public_api' },
});
```

### Fetch events for one item

```ts
import { and, desc, eq } from 'drizzle-orm';
import { item_events } from '@dpg/database';

const events = await db
  .select()
  .from(item_events)
  .where(
    and(
      eq(item_events.item_network, 'yellow_dot'),
      eq(item_events.item_domain, 'student'),
      eq(item_events.item_type, 'profile'),
      eq(item_events.item_id, '11111111-1111-1111-1111-111111111111')
    )
  )
  .orderBy(desc(item_events.occurred_at));
```

## Practical rules

- Always run `create_items.sql` before creating partitions
- Include partition keys in queries whenever possible
- Call `ensureItemPartition()` before inserting items into a new path
- Treat the Drizzle tables in the package as reference tables for the partitioned parents, not as migration-managed tables

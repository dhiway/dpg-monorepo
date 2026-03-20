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

---
title: DB Access
description: How to reach PostgreSQL, Redis, and Drizzle tooling in this monorepo.
head: []
---

# DB Access

## Runtime connections

The API builds runtime database URLs in `apps/api/src/config.ts`.

It supports:

- explicit `POSTGRES_URL` and `REDIS_URL`
- or separate host/user/password/port env variables

## Local development

Start local services:

```bash
docker compose up -d db redis
```

Then run:

```bash
pnpm dev:api
```

## Drizzle tooling

Useful root commands:

- `pnpm db:generate:api`
- `pnpm db:migrate:api`
- `pnpm db:studio:api`
- `pnpm db:push:api`
- `pnpm db:pull:api`

## Direct PostgreSQL access

When `POSTGRES_URL` is set:

```bash
psql "$POSTGRES_URL"
```

When using split env values:

```bash
psql "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
```

## Redis access

If `REDIS_URL` is set:

```bash
redis-cli -u "$REDIS_URL"
```

If using split env values:

```bash
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD"
```

## Partitioned tables

The base SQL script creates the partitioned parent tables only.

Files:

- `packages/database/src/utils/sql_scripts/create_items.sql`
- `packages/database/src/utils/sql_scripts/create_items_partitions.example.sql`

Use the example file only as a template. Real partitions should be created per network/domain/type deployment needs.

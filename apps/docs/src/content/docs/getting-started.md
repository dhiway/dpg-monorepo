---
title: Getting Started
description: Local development workflow for the current monorepo.
head: []
---

# Getting Started

## Prerequisites

- Node.js compatible with the workspace dependencies
- `pnpm` `10.28.1`
- Docker if you want local PostgreSQL and Redis

## Install

From the repository root:

```bash
pnpm install
```

## Local API workflow

Start the backing services:

```bash
docker compose up -d db redis
```

Run the API:

```bash
pnpm dev:api
```

Suggested local network env:

```bash
SERVED_DOMAINS="yellow_dot/student"
NETWORK_CONFIG_SOURCE="local"
NETWORK_CONFIG_LOCAL_FILE="packages/schemas/src/dot_examples/network.json"
```

Useful root commands:

- `pnpm build:api`
- `pnpm preview:api`
- `pnpm start:api`
- `pnpm db:generate:api`
- `pnpm db:migrate:api`
- `pnpm db:studio:api`

## Docs workflow

Run the documentation site:

```bash
pnpm dev:docs
```

Build the static docs output:

```bash
pnpm build:docs
```

## Recommended reading order

For a new developer or operator, read:

1. `Getting Started`
2. `Environment`
3. `Flow Structure`
4. `Hosting` pages
5. `Schemas` and `Auth` pages
6. package-specific pages for the part you are changing

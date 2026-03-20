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

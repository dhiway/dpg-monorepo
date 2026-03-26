---
title: Package Overview
description: Shared package responsibilities in the current workspace.
head: []
---

# Package Overview

The monorepo keeps shared runtime logic in `packages/*`. Each package has a narrow role and is meant to be consumed by apps such as `apps/api`.

## At a glance

- `packages/auth`: Better Auth setup, plugin wiring, and unified OTP support
- `packages/config`: env schemas, allowed-origin helpers, and network runtime helpers
- `packages/database`: Drizzle ref tables, partition helpers, and base SQL scripts
- `packages/notification`: notification client and provider-facing types
- `packages/schemas`: Zod export, API schemas, and schema fetching

Checked-in example network configs and request payloads live under `examples/`.

## How to read the package layout

Start with `packages/config` if you are working on runtime setup or environment handling.

Start with `packages/database` if you are working on tables, partitioning, or item/event storage.

Start with `packages/schemas` if you are changing request validation, network config shape, or external schema loading.

Start with `packages/auth` if you are changing login, OTP, API key flows, or Better Auth integration.

## Detailed guides

Use the dedicated pages for package-level usage patterns:

- `Config Package`
- `Database Package`
- `Schemas Package`
- `Auth Package`

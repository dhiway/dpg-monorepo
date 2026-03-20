---
title: Introduction
description: Current structure and responsibilities inside the DPG backend monorepo.
head: []
---

# DPG Monorepo

This repository is organized as a pnpm workspace with Turbo coordinating apps and shared packages.

## What exists today

- `apps/api` is the runtime Fastify API service.
- `apps/docs` is this Astro Starlight documentation site.
- `packages/auth` contains authentication configuration and plugins.
- `packages/config` contains environment schemas and shared config helpers.
- `packages/database` contains database schema helpers and SQL assets.
- `packages/notification` contains the notification client and related types.
- `packages/schemas` contains Zod exports, request schemas, DOT schema examples, and the schema registry fetch helper.

## Current API capabilities

- Auth routes are mounted under `/api/auth`.
- Item routes are mounted under `/api/v1/item`.
- OpenAPI generation is enabled through Fastify Swagger.
- Scalar API reference is exposed at `/api/reference`.

## Workspace conventions

- Root scripts proxy through Turbo with root `.env` loading.
- Apps keep runtime code under `apps/*`.
- Shared libraries live under `packages/*`.
- The repository uses TypeScript with path aliases in `tsconfig.base.json`.

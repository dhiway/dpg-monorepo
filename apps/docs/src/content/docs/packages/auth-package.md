---
title: Auth Package
description: What the auth package provides and how apps consume it.
head: []
---

# Auth Package

`packages/auth` wraps Better Auth into a reusable package-level factory.

## What it exposes

Currently the public entrypoint exports the auth creation config from `packages/auth/src/config.ts`.

## Typical consumption

The API creates its auth instance like this:

```ts
import { createAuth } from '@dpg/auth';
```

Then it passes:

- app name
- base URL
- auth secret
- trusted origins
- Drizzle DB adapter
- Redis secondary storage
- notification hooks
- OTP behavior flags

## Why keep it in a package

This keeps auth concerns reusable and prevents the API app from owning all Better Auth wiring directly.

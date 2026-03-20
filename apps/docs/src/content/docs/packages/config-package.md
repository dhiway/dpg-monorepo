---
title: Config Package
description: What the config package does and how to consume it.
head: []
---

# Config Package

`packages/config` centralizes small but important runtime contracts.

## What it exposes

- env Zod schemas
- allowed origins helpers
- network binding parsing
- network config loading helpers

## Typical consumption pattern

In an app:

```ts
import {
  ApiSecretsSchema,
  InstanceSecretsSchema,
  parseServedDomains,
} from '@dpg/config';

const instance = InstanceSecretsSchema.parse(process.env);
const api = ApiSecretsSchema.parse(process.env);
const servedDomains = parseServedDomains(process.env.SERVED_DOMAINS!);
```

## Why consume it

Use the config package when:

- multiple apps should validate env the same way
- runtime parsing should not be duplicated
- network config behavior should stay consistent across services

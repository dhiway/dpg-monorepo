---
title: Schemas And Registry
description: What the schemas package currently contains and how registry fetching works.
head: []
---

# Schemas And Registry

The `packages/schemas` package currently exposes two main capabilities.

## Zod export

The default export remains `zod`, which is used across the API and config packages for request and environment schemas.

## Registry schema fetching

The package now exports `fetchSchema` and `FetchSchema` from `src/schema_registry.ts`.

Example:

```ts
import { fetchSchema } from '@dpg/schemas';

const dotSchema = new fetchSchema(
  `${process.env.SCHEMA_REGISTRY_URL}/student-profile.json`
);

const resolvedSchema = await dotSchema.getSchema();
```

## Current behavior

- fetches a root JSON document from a URL
- resolves `$ref` recursively
- supports `#` fragments in the same document
- supports relative references
- supports remote references to other JSON documents
- caches fetched documents within a fetcher instance

## Important limitation

The current implementation is a JSON document fetcher with `$ref` resolution. It does not validate that a document is compliant with a particular JSON Schema draft, and it does not implement draft-specific behavior such as `$dynamicRef`.

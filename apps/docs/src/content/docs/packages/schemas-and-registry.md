---
title: Schemas And Registry
description: What the schemas package currently contains and how registry fetching works.
head: []
---

# Schemas And Registry

The `packages/schemas` package currently exposes two main capabilities: reusable runtime schemas and fetch helpers for remote schema documents.

## Zod export

The default export remains `zod`, which is used across the API and config packages for request and environment schemas.

## Network config purpose

The DOT network config is not just an example blob. It is intended to act as a boundary and runtime config source for the network.

It defines:

- which domains exist on a network
- the default item-state schemas for those domains
- which instances are registered on the network
- which domains may interact through each action
- the requirement schema for each action interaction
- the event schema for the action response payload

That structure lets backend logic derive rules such as:

- which instance origins may call a backend through CORS
- which domains can invoke a given action against another domain
- which payload schema to validate for `item_state`, action requirements, and action response events

## Registry schema fetching

The package exports `fetchSchema` and `FetchSchema` from `src/schema_registry.ts`.

Example:

```ts
import { fetchSchema } from '@dpg/schemas';

const dotSchema = new fetchSchema(
  `${process.env.SCHEMA_REGISTRY_URL}/yellow-dot/network.json`
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

## Runtime config support

The config package now also supports parsing backend network bindings from `SERVED_DOMAINS`.

Example:

```ts
import { parseServedDomains } from '@dpg/config';

const bindings = parseServedDomains('yellow_dot/student,blue_dot/seeker');
```

This returns structured `network/domain` bindings that the API can expose and later use with network-driven origin and routing logic.

The config package also exposes `loadNetworkConfigs()` for loading network config from:

- a local JSON file in development
- remote network schema/config URLs in production

That loader is what the API now uses before registering CORS.

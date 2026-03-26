---
title: Architecture
description: How DPG is structured at runtime and how requests move through the system.
head: []
---

# Architecture

DPG has four main layers:

1. network contract
2. instance runtime
3. storage and cache
4. client-facing APIs

## 1. Network Contract

The network config is the source of truth for:

- domains
- item schema identifiers
- registered instances
- action permissions
- action request schemas
- action event schemas
- minimum cache TTL for inter-instance fetches

## 2. Instance Runtime

Each API instance loads:

- environment variables
- served domain bindings
- one or more network configs

That runtime state determines:

- which requests the instance may serve
- which schemas are valid
- which peer instances should be contacted
- which origins should be allowed through CORS

## 3. Storage And Cache

DPG uses:

- PostgreSQL for durable item, action, and event storage
- Redis for fetch caching and inter-instance count caching
- disk cache for fetched network and custom item schemas

The split is deliberate:

- PostgreSQL stores facts
- Redis stores short-lived query results
- disk cache stores schema documents that change infrequently

## 4. Client-Facing APIs

DPG exposes three broad route groups:

- item APIs
- action and event APIs
- network APIs

## Request Flows

### Item creation

1. client sends `network`, `domain`, `item_type`, and `item_state`
2. backend checks whether it serves that binding
3. backend checks whether the item type is defined by the network schema
4. backend resolves the schema to validate against
5. backend validates `item_state`
6. backend generates `item_instance_url` and `item_schema_url`
7. backend stores the item

### Local item fetch

1. client calls `GET /api/v1/item/fetch`
2. backend queries only its own database
3. result is cached in Redis for a very short TTL
4. response is returned

### Inter-instance fetch

1. client calls `GET /api/v1/network/item/fetch`
2. aggregator finds all registered instances for the requested domain
3. aggregator calls `count_local` on each instance
4. zero-result instances are excluded
5. a page plan is built from the counts
6. aggregator calls `fetch_local` only on contributing instances
7. results are merged and cached in Redis

## Why DPG Splits Local And Network Fetch

This split keeps two very different use cases clean:

- “show me this instance’s items”
- “show me the network-wide view for this domain”

Local fetch should stay simple and cheap.

Network fetch should own:

- peer discovery
- count phase
- pagination planning
- cross-instance caching

---
title: What Is DPG?
description: A practical introduction to the DPG model, runtime, and documentation path.
head: []
---

# What Is DPG?

DPG is a network-aware backend model for publishing, validating, discovering, and interacting with items across many instances.

The core model is:

- a **network** defines the shared contract
- a **domain** defines a business role inside that network
- an **instance** serves one or more domains
- an **item** is a schema-typed record
- an **action** is an interaction between items
- an **event** is the structured result of that action

## Why DPG Exists

DPG is useful when:

- one domain can have many independent instances
- clients should not need to hardcode every peer instance
- schemas need to be explicit and versioned
- actions between domains must be validated consistently
- networks need a portable onboarding path for new actors

## What This Repository Contains

- `apps/api`: the Fastify runtime that serves items, actions, events, and network-aware fetches
- `apps/docs`: this documentation site
- `examples/schemas`: complete example network schemas such as `yellow_dot` and `blue_dot`
- `examples/api`: example request payloads
- `packages/config`: environment and runtime config helpers
- `packages/database`: database schema helpers and partition utilities
- `packages/schemas`: request schemas, network schema parsing, and schema registry helpers
- `packages/auth`: auth integration

## Read This In Order

1. [Vocabulary](/concepts/vocabulary)
2. [Architecture](/concepts/architecture)
3. [Getting Started](/getting-started)
4. [Environment](/environment)
5. [Schema Authoring Guide](/schemas/authoring)
6. [API Overview](/apps/api)
7. the hosting guide that matches your deployment model

## Documentation Goals

This documentation is meant to help:

- network authors creating a new schema contract
- instance operators deploying one or more DPG backends
- product teams building UI and workflows on top of DPG

The structure is intentional:

- concepts first
- runnable setup second
- schema design third
- API behavior fourth
- internals last

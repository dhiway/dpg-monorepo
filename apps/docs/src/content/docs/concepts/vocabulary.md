---
title: Vocabulary
description: Common DPG terms and how they relate to one another.
head: []
---

# Vocabulary

This page defines the words used across DPG.

## Network

A **network** is the top-level contract.

It defines:

- which domains exist
- which item types are allowed
- which instances are registered
- which actions are valid
- what request and event payloads look like

Examples:

- `yellow_dot`
- `blue_dot`

## Domain

A **domain** is a business role inside a network.

Examples:

- `student`
- `tutor`
- `seeker`
- `provider`

A domain is not a deployment. A domain can have many instances.

## Instance

An **instance** is a deployed backend that serves one or more `network/domain` bindings.

Examples:

- one API serving only `yellow_dot/student`
- one API serving `yellow_dot/student,yellow_dot/tutor`
- one API serving `yellow_dot/student,blue_dot/seeker`

## Item

An **item** is a stored record under a domain.

Every item has:

- `item_network`
- `item_domain`
- `item_type`
- `item_id`
- `item_state`
- `item_instance_url`
- `item_schema_url`

## Schema Identifier

A **schema identifier** is the value stored in `item_type`.

This should be versioned explicitly.

Good examples:

- `profile_1.0`
- `profile_1.1`
- `job_posting_1.0`

## Item Schema

An **item schema** is the JSON Schema used to validate `item_state`.

DPG can use:

- a domain-defined inline schema from the network config
- an instance-specific custom schema URL

## Action

An **action** is a structured interaction from one item to another.

Examples:

- `connect`
- `apply`

## Requirement Schema

A **requirement schema** defines what a caller must send for an action interaction.

## Event

An **event** is the structured outcome of an action.

It is validated against the `event_schema` defined in the action interaction.

## Served Domains

`SERVED_DOMAINS` tells one backend which `network/domain` pairs it is responsible for.

Example:

```bash
SERVED_DOMAINS="yellow_dot/student,blue_dot/seeker"
```

## Inter-Instance Fetch

An **inter-instance fetch** is a network-aware read across all registered instances for a given `network/domain`.

In DPG:

- `GET /api/v1/item/fetch` is instance-local
- `GET /api/v1/network/item/fetch` is inter-instance

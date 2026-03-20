---
title: Network Action Domain
description: How to model network config, action requirement/event schemas, and domain item schemas.
head: []
---

# Network, Action, And Domain Schemas

The network config is a runtime contract, not only a reference file.

## Network config responsibilities

A network config should define:

- `domains`: which domains exist on the network
- `instances`: which backend/frontend URLs are registered
- `actions`: which domain can interact with which other domain

## Domain item schema

Each domain entry should expose its default item-state schemas.

Example shape:

```json
{
  "name": "student",
  "default_item_schemas": {
    "profile": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object"
    }
  }
}
```

This is the default `item_state` contract for that domain unless an instance provides a custom schema.

## Action schema

Actions should define interaction rules.

Example shape:

```json
{
  "connect": {
    "interactions": [
      {
        "from_domain": "student",
        "to_domain": "tutor",
        "requirement_schema": { "...": "..." },
        "event_schema": { "...": "..." }
      }
    ]
  }
}
```

## Requirement schema

`requirement_schema` describes what the caller must send for that interaction.

Example:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["subject", "goal"]
}
```

## Event schema

`event_schema` belongs inside the action interaction definition and describes the response/event payload that will be stored as an `item_event`.

Example:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["status", "message"]
}
```

## Why event stays with the action

The event is the structured response of the action call. Keeping it next to the action interaction makes the contract explicit:

- who can call whom
- what request shape they send
- what response/event shape is produced

This is the model used in the `yellow_dot` example network config.

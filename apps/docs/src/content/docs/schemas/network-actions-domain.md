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

Each domain entry should expose an `item_schemas` map keyed by schema identifier. That identifier is what DPG expects in `item_type`.

Example shape:

```json
{
  "name": "student",
  "item_schemas": {
    "profile_1.0": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object"
    },
    "profile_1.1": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object"
    }
  }
}
```

`default_item_schemas` is still accepted for backward compatibility, but `item_schemas` is now the canonical shape.

## Instance custom schemas

If a specific instance needs to override the payload for a supported `item_type`, it should publish a `custom_item_schema_urls` map:

```json
{
  "domain_name": "tutor",
  "instance_url": "https://tutor.yellowdot.example.com",
  "custom_item_schema_urls": {
    "profile_1.1": "https://tutor.yellowdot.example.com/schemas/profile_1.1.json"
  }
}
```

This is how DPG decides whether that instance is allowed to create or serve a custom schema for a given `item_type`.

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

## Runtime usage in DPG

- `POST /api/v1/item/create` checks that `item_type` exists in `domains[].item_schemas` for the given `network/domain`.
- `POST /api/v1/item/create` validates `item_state` against the inline domain schema unless `item_schema_url` is provided, in which case it must match the configured `instances[].custom_item_schema_urls[item_type]`.
- `POST /api/v1/action/perform` validates `requirements_snapshot` against `actions[action_name].interactions[].requirement_schema`.
- `POST /api/v1/action/perform` and `POST /api/v1/event/store` validate event payloads against `actions[action_name].interactions[].event_schema`.
- `GET /api/v1/network/schemas` returns the schema documents cached on disk for UI and cross-instance consumers.
- `POST /api/v1/network/refetch_schemas` refreshes network configs plus referenced remote item schemas into the disk cache.

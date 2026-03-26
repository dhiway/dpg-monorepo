---
title: Network Schema Reference
description: Reference documentation for the final DPG network schema structure and runtime behavior.
head: []
---

# Network Schema Reference

The DPG network schema is a runtime contract.

## Top-Level Shape

```json
{
  "name": "blue_dot",
  "display_name": "Blue Dot",
  "description": "Jobs and hiring network.",
  "schema_standard": "https://json-schema.org/draft/2020-12/schema",
  "domains": [],
  "instances": [],
  "actions": {}
}
```

## Top-Level Fields

- `name`
- `display_name`
- `description`
- `schema_standard`
- `domains`
- `instances`
- `actions`

## Domain Fields

Each domain entry should expose an `item_schemas` map keyed by schema identifier.

It can also define `minimum_cache_ttl_seconds` for inter-instance item fetch caching.

Example:

```json
{
  "name": "student",
  "minimum_cache_ttl_seconds": 300,
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

`default_item_schemas` is still accepted for backward compatibility, but `item_schemas` is the canonical shape.

## Instance Fields

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

## Action Fields

Actions define interaction rules.

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

## Runtime Usage In DPG

- `POST /api/v1/item/create` checks that `item_type` exists in `domains[].item_schemas`
- `POST /api/v1/item/create` validates `item_state` and generates `item_instance_url` and `item_schema_url`
- `GET /api/v1/item/fetch` is instance-local
- `GET /api/v1/network/item/fetch` is inter-instance and honors `minimum_cache_ttl_seconds`
- `POST /api/v1/action/perform` validates `requirements_snapshot` against `requirement_schema`
- `POST /api/v1/action/perform` and `POST /api/v1/event/store` validate event payloads against `event_schema`
- `GET /api/v1/network/schemas` returns cached schema documents
- `GET /api/v1/network/schema/:network/:domain/:itemType` exposes one concrete schema
- `POST /api/v1/network/refetch_schemas` refreshes schema cache

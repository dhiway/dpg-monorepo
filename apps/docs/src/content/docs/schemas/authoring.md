---
title: Schema Authoring Guide
description: A full walkthrough for designing a new DPG network schema from scratch.
head: []
---

# Schema Authoring Guide

This page explains how to design a DPG network schema the way the runtime expects it.

## Start With The Business Model

Before writing JSON, answer:

1. what network are you creating
2. which domains exist
3. what items each domain publishes
4. which interactions are allowed between domains
5. whether any domain has multiple instances
6. whether instances can publish custom schemas

## Step 1: Define Domains

Each domain should represent a stable business role.

Good examples:

- `student`
- `tutor`
- `seeker`
- `provider`

## Step 2: Define Item Types As Schema Identifiers

`item_type` should be a schema identifier, not a loose noun.

Use:

- `profile_1.0`
- `profile_1.1`
- `job_posting_1.0`

Avoid:

- `profile`
- `job`
- `data`

## Step 3: Add `item_schemas`

```json
{
  "name": "seeker",
  "minimum_cache_ttl_seconds": 300,
  "item_schemas": {
    "profile_1.0": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "required": ["name", "skills"]
    }
  }
}
```

## Step 4: Add Registered Instances

```json
{
  "domain_name": "provider",
  "instance_name": "Blue Dot Provider",
  "instance_url": "https://provider.bluedot.example.com",
  "custom_item_schema_urls": {
    "job_posting_1.1": "https://provider.bluedot.example.com/schemas/job_posting_1.1.json"
  }
}
```

## Step 5: Define Actions

Each interaction must declare:

- source network/domain
- target network/domain
- `requirement_schema`
- `event_schema`

## Step 6: Add Cache Policy

Every domain can define `minimum_cache_ttl_seconds`.

This gives the network administrator a baseline rule for inter-instance item fetch caching.

## Final Authoring Rules

- networks define contracts, not only examples
- domains define stable roles
- `item_type` values are schema identifiers
- actions declare permission and payload shape together
- instances are explicit and enumerable
- cache policy belongs in the network contract

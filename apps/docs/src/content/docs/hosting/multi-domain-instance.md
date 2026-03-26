---
title: Multi-Instance Hosting
description: How to host multiple domains or networks across one or many DPG instances.
head: []
---

# Multi-Instance Hosting

DPG supports two common multi-instance patterns:

1. one backend serving many bindings
2. many backends serving one network together

## One Backend, Many Bindings

Example:

```bash
SERVED_DOMAINS="yellow_dot/student,yellow_dot/tutor,blue_dot/seeker"
```

## What This Means

- the same process can serve multiple business domains
- the same CORS layer can allow origins derived from multiple network configs
- your item storage can remain partitioned by `item_network` and `item_domain`

## When To Use It

Use this when:

- one deployment should serve closely related domains
- shared auth/config/runtime behavior is desirable
- operational overhead of separate services is not worth it

## Things To Keep Clear

- `item_network` and `item_domain` must always be carried in item records
- route handlers and downstream jobs must respect the binding context
- network config URLs should be configured for every served network in production

## Example Production Env

```bash
SERVED_DOMAINS="yellow_dot/student,yellow_dot/tutor"
NETWORK_CONFIG_SOURCE="remote"
NETWORK_CONFIG_URLS="yellow_dot=https://registry.example.com/yellow-dot/network.json"
```

## Many Backends, One Network

Example:

- `student-api` serves `yellow_dot/student`
- `tutor-api` serves `yellow_dot/tutor`
- `coaching-api` serves `yellow_dot/coaching_center`

The network config registers all of them, and `GET /api/v1/network/item/fetch` aggregates across them when needed.

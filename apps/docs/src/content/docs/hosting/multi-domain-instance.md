---
title: Multiple Domains
description: How to host multiple network/domain bindings in one API instance.
head: []
---

# Hosting Multiple Domains in One Instance

One API instance can expose more than one network/domain pair.

Example:

```bash
SERVED_DOMAINS="yellow_dot/student,yellow_dot/tutor,blue_dot/seeker"
```

## What this means

- the same process can serve multiple business domains
- the same CORS layer can allow origins derived from multiple network configs
- your item storage can remain partitioned by `item_network` and `item_domain`

## When to use it

Use this when:

- one deployment should serve closely related domains
- shared auth/config/runtime behavior is desirable
- operational overhead of separate services is not worth it

## Things to keep clear

- `item_network` and `item_domain` must always be carried in item records
- route handlers and downstream jobs must respect the binding context
- network config URLs should be configured for every served network in production

## Example production env

```bash
SERVED_DOMAINS="yellow_dot/student,yellow_dot/tutor"
NETWORK_CONFIG_SOURCE="remote"
NETWORK_CONFIG_URLS="yellow_dot=https://registry.example.com/yellow-dot/network.json"
```

---
title: Single Domain
description: How to run one backend instance for one network/domain pair.
head: []
---

# Hosting a Single Domain

Single-domain hosting means one API instance serves one binding such as:

```bash
SERVED_DOMAINS="yellow_dot/student"
```

## Recommended env shape

```bash
INSTANCE_NAME="Dpg Api"
INSTANCE_ENV="production"
API_DOMAIN="https://api.example.com"
API_PORT="2742"
SERVED_DOMAINS="yellow_dot/student"
NETWORK_CONFIG_SOURCE="remote"
NETWORK_CONFIG_URLS="yellow_dot=https://registry.example.com/yellow-dot/network.json"
```

## Why this is the simplest setup

- one public API domain
- one backend deployment
- one network/domain identity
- network config can derive allowed instance origins for CORS

## Local development equivalent

```bash
SERVED_DOMAINS="yellow_dot/student"
NETWORK_CONFIG_SOURCE="local"
NETWORK_CONFIG_LOCAL_FILE="examples/schemas/yellow_dot/network.json"
```

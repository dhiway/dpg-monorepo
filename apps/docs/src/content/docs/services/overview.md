---
title: Services Overview
description: External and replaceable services used by this DPG deployment beyond the core monorepo apps and packages.
head: []
---

This section documents the service dependencies used by the current DPG project.

These services are important to the running product, but they are treated as replaceable integrations rather than fixed core architecture.

## Service Model

For this project, a service belongs in this section when all of the following are true:

- it provides a runtime capability used by DPG
- it can be deployed, hosted, or operated separately from the monorepo apps
- it can be replaced with another implementation without changing the DPG model itself

## Current Services

| Service | Role in this project | Current implementation | Replaceable |
|---------|----------------------|------------------------|-------------|
| Notification service | Sends OTP and other notifications | Dhiway notification service | Yes |
| Authentication service | Authentication, organizations, authorization hooks, and API auth features | Better Auth | Yes |
| Wallet service | Verifies identifiers and returns user-linked credentials for import | Dhiway Wallet | Yes |
| DigiLocker pull service | Pulls credentials from DigiLocker through an external flow | Dhiway DigiLocker integration | Yes |
| Match score service | Compares two items and returns a score, band, reasoning, and match signals | DPG Scoring | Yes |

## Source Links

- [Notification service on GitHub](https://github.com/dhiway/notification-service.git)
- [Match score service client on GitHub](https://github.com/dhiway/dpg-monorepo/tree/main/packages/match_score)

## Relationship To DPG Core

The DPG core remains responsible for:

- network contracts
- item, action, and event APIs
- storage and caching
- schema validation
- UI rendering and project workflows

The services in this section extend those capabilities by providing identity, notification, and credential retrieval features.

## Integration Principles

- keep provider-specific code behind package or client boundaries
- keep environment configuration explicit
- avoid leaking vendor-specific data shapes into core UI or API flows
- model each service as optional or swappable where practical
- document both the current provider and the abstraction boundary

Use the detailed pages in this section for project-specific operational and architecture guidance.

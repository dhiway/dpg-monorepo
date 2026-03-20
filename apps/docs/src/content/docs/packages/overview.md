---
title: Package Overview
description: Shared package responsibilities in the current workspace.
head: []
---

# Package Overview

## `packages/auth`

Authentication support, auth plugin configuration, and OTP-related integrations used by the API.

## `packages/config`

Shared configuration contracts and helpers, including:

- allowed origins
- allowed admin domains
- environment validation schemas

## `packages/database`

Database table definitions, SQL scripts, and helpers used by Drizzle-backed services.

## `packages/notification`

Notification client code and provider-facing types.

## `packages/schemas`

Schema-focused package containing:

- the default `zod` export used elsewhere in the repo
- API item request and response schemas
- DOT example JSON files
- a schema registry fetch helper that resolves `$ref` values

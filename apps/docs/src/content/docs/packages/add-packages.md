---
title: Adding Packages
description: How to add a new shared package to the monorepo and consume it from apps.
head: []
---

# Adding Packages

## 1. Create the package

Create a new folder under `packages/<name>`.

Recommended `package.json` shape:

```json
{
  "name": "package-name",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "main": "index.js",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

## 2. Export from `src/index.ts`

Keep the package entrypoint clean and export the public surface from `src/index.ts`.

## 3. Consume from an app or package

Use the workspace dependency form:

```json
{
  "dependencies": {
    "package-name": "workspace:*"
  }
}
```

## 4. Prefer shared packages when

- logic is used by more than one app
- runtime config should be centralized
- schema or database contracts should stay consistent across services

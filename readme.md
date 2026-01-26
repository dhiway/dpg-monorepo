# DPG Monorepo

This monorepo adds support for managing multiple apps with shared basic configs.

- user interfaces
- backend APIs
- middlewares
- authentication service setup
- clean env control and setup
- per app database setup
- pnpm workspace flow

## Adding Apps / Packages

1. Apps

Apps are the services which holds runtime code. be it UI, Docs, API services or
middlewares. these apps use and interacts with the packages to utilise there
functionality and interacts with the environment variables. Apps can also hold
there own local env variables and interact freely. global env secrets are
supported by zod schema for validation which can be found in
`./packages/config/src/secrets.ts`. it is recommended to use the validation to
load env in apps with zod. ex: in `./apps/api/src/env.ts`

```ts
const instance = InstanceSecretsSchema.parse(process.env);
```

these env variables are then consumed by `./apps/api/src/config.ts` to create
variables required by database and auth config

### package.json setup for any app or package

All exports should be exported in index.ts

```json
{
  "name": "package-name",
  "version": "1.0.0",
  "description": "package description",
  "type": "module",
  "private": true,
  "main": "index.js",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.28.1",
  "dependencies": {}
}
```

## APPS / API

1. Run postgres and redis db (running docker compose:
   `docker compose up --build -d` at root loads pg 18 and redis 7)
2. API will pick variables from .env. the current setup picks env from
   localhost.
3. For initial setup run `db:generate` and then `db:migrate` scripts

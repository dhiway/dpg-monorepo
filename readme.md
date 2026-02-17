# DPG Monorepo

This monorepo adds support for managing multiple apps with shared basic configs.

- user interfaces
- backend APIs
- middlewares
- authentication service setup
- clean env control and setup
- per app database setup
- pnpm workspace flow
- turborepo task orchestration

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

### Turbo commands (root)

- `pnpm dev:api` start API in watch mode
- `pnpm build:api` build API
- `pnpm preview:api` run built API
- `pnpm start:api` run production entry for API
- `pnpm db:generate:api` generate migrations
- `pnpm db:migrate:api` run migrations
- `pnpm db:studio:api` open drizzle studio

### Local mode (host API + docker DBs)

1. Start databases from root:
   `docker compose up -d db redis`
2. Keep `.env` using local values (`POSTGRES_HOST=127.0.0.1`,
   `REDIS_HOST=127.0.0.1`, with matching ports).
3. Run API from root:
   `pnpm dev:api`

### External DB mode (Dokploy or other hosted DBs)

Use URL overrides in `.env`:

```bash
POSTGRES_URL='postgres://user:password@host:5432/dbname'
REDIS_URL='redis://:password@host:6379'
```

When these are set, API and drizzle-kit use them automatically.

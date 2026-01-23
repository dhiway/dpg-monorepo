# DPG Monorepo

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

### surrealdb setup

create a namespace and database in surrealdb and add the following tables: use:
(surrealdb ui)[https://app.surrealdb.com/]

```sql

DEFINE TABLE user SCHEMALESS PERMISSIONS FULL;
DEFINE TABLE session SCHEMALESS PERMISSIONS FULL;
DEFINE TABLE verification SCHEMALESS PERMISSIONS FULL;
DEFINE TABLE account SCHEMALESS PERMISSIONS FULL;
DEFINE TABLE organization SCHEMALESS PERMISSIONS FULL;
DEFINE TABLE api_key SCHEMALESS PERMISSIONS FULL;

```

# Jobstack CSV Migration

This guide explains how to run `apps/api/scripts/migrate_jobstack_csv.ts` to migrate a sample set of seeker profiles and provider job postings from CSV dumps into the live DPG database.

## What the script migrates

- `30` seeker users and `30` seeker `profile_1.0` items by default
- `30` provider users and `30` provider `job_posting_1.0` items by default
- only records that can be transformed into the `blue_dot` schema shape are migrated
- invalid rows are skipped during selection

The script writes to:

- `"user"`
- `items`

It validates `item_state` against the `blue_dot` network config from the local `blue_dot` branch by default:

- `blue_dot:examples/schemas/blue_dot/network.json`

## Source CSVs

Default source directories:

- seeker: `/Users/amitbhat/Downloads/seeker_csv_dumps_20260415-100001`
- provider: `/Users/amitbhat/Downloads/provider_csv_dumps_20260415-100001`

Expected files:

- seeker: `user.csv`, `profile.csv`
- provider: `user.csv`, `job_posting.csv`

## Prerequisites

Run from:

```bash
cd /Users/amitbhat/dpg-monorepo/apps/api
```

Make sure:

- dependencies are installed with `pnpm`
- you can reach the target Postgres database locally through an SSH tunnel
- your database credentials are available either through `.env` or `--db-url`

## Connect to the live DB with SSH tunnel

If the remote Postgres is only reachable through SSH, create a local tunnel first.

Example:

```bash
ssh -L 6543:<remote-postgres-host>:5432 <ssh-user>@<ssh-host>
```

After the tunnel is up:

- local host: `127.0.0.1`
- local port: `6543`

If you want the script to use the tunnel through env vars, set:

```bash
export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=6543
export POSTGRES_USER='<db-user>'
export POSTGRES_PASSWORD='<db-password>'
export POSTGRES_DB='<db-name>'
```

Or pass a full connection string directly:

```bash
export POSTGRES_URL='postgres://<db-user>:<db-password>@127.0.0.1:6543/<db-name>'
```

## Take a DB dump before live migration

Before writing anything to the live database, take a backup through the same SSH tunnel.

Using env vars:

```bash
pnpm backup:live-db
```

If your local `pg_dump` version is older than the remote server version, the backup script automatically falls back to Docker with `postgres:18` by default.

You can also force a specific binary or Docker image:

```bash
PG_DUMP_BIN='/opt/homebrew/opt/postgresql@18/bin/pg_dump' pnpm backup:live-db
PG_DUMP_DOCKER_IMAGE='postgres:18' pnpm backup:live-db
```

This creates a timestamped custom-format dump under:

```text
apps/api/backups/live-db-YYYYMMDD-HHMMSS.dump
```

To choose a custom output path:

```bash
pnpm backup:live-db -- /Users/amitbhat/dpg-live-backups/pre-migration.dump
```

Using a direct connection string:

```bash
POSTGRES_URL='postgres://<db-user>:<db-password>@127.0.0.1:6543/<db-name>' pnpm backup:live-db
```

Restore example:

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --host=127.0.0.1 \
  --port=6543 \
  --username='<db-user>' \
  --dbname='<db-name>' \
  /Users/amitbhat/dpg-monorepo/apps/api/backups/live-db-YYYYMMDD-HHMMSS.dump
```

## Dry run

Always start with a dry run.

```bash
pnpm migrate:jobstack-csv --dry-run
```

This will:

- read the CSV dumps
- randomly sample valid records
- transform them to the `blue_dot` live schema shape
- validate them
- print a summary
- make no database changes

Example output:

```text
seekers: selected=30, missingUser=0, invalidItemId=0, invalidCreatedBy=0, invalidMetadata=0, invalidShape=54
providers: selected=30, missingUser=0, invalidItemId=0, invalidCreatedBy=0, invalidMetadata=0, invalidShape=24
Dry run complete. No database changes were made.
Prepared 59 users and 60 items.
```

## Run the actual migration

Using env vars:

```bash
pnpm migrate:jobstack-csv
```

Using a connection string directly:

```bash
pnpm migrate:jobstack-csv --db-url 'postgres://<db-user>:<db-password>@127.0.0.1:6543/<db-name>'
```

## Common options

Override sample size:

```bash
pnpm migrate:jobstack-csv --dry-run --seeker-limit 10 --provider-limit 10
```

Use a fixed seed for repeatable random sampling:

```bash
pnpm migrate:jobstack-csv --dry-run --random-seed 'sample-1'
```

Override CSV directories:

```bash
pnpm migrate:jobstack-csv \
  --seeker-dir '/path/to/seeker_dump' \
  --provider-dir '/path/to/provider_dump'
```

Use a specific network config file instead of the `blue_dot` branch ref:

```bash
pnpm migrate:jobstack-csv \
  --network-config-file '/absolute/path/to/network.json'
```

Use a specific git ref for the network config:

```bash
pnpm migrate:jobstack-csv \
  --network-config-ref 'blue_dot:examples/schemas/blue_dot/network.json'
```

## How the script maps data

### Seeker items

Creates items with:

- `item_network = 'blue_dot'`
- `item_domain = 'seeker'`
- `item_type = 'profile_1.0'`

The script derives required `item_state` fields such as:

- `name`
- `gender`
- `location`
- `age`
- `phone`

Optional live-schema fields are included only when valid values are available.

### Provider items

Creates items with:

- `item_network = 'blue_dot'`
- `item_domain = 'provider'`
- `item_type = 'job_posting_1.0'`

The script derives required `item_state` fields such as:

- `jobProviderName`
- `role`
- `jobProviderLocation`
- `hiringManagerName`
- `hiringManagerPhoneNumber`
- `hiringManagerEmail`
- `positions`
- `natureOfJob`

It also sets `item_latitude` and `item_longitude` when GPS data is present in the CSV.

## Safety behavior

- users are upserted before items are inserted
- item partitions are ensured before insert
- records are validated against the `blue_dot` schema before insert
- email and phone values that would violate existing unique constraints are nulled before user upsert
- item inserts use conflict-safe behavior, so reruns do not duplicate the same item ids

## Recommended workflow

1. Start the SSH tunnel.
2. Confirm DB credentials point to `127.0.0.1:6543`.
3. Run `pnpm backup:live-db`.
4. Run `pnpm migrate:jobstack-csv --dry-run`.
5. Review the summary output.
6. Run `pnpm migrate:jobstack-csv`.

## Example end-to-end session

```bash
ssh -L 6543:<remote-postgres-host>:5432 <ssh-user>@<ssh-host>
```

In another terminal:

```bash
cd /Users/amitbhat/dpg-monorepo/apps/api

export POSTGRES_URL='postgres://<db-user>:<db-password>@127.0.0.1:6543/<db-name>'

pnpm backup:live-db
pnpm migrate:jobstack-csv --dry-run
pnpm migrate:jobstack-csv
```

## Troubleshooting

If you see:

```text
Only X valid provider job postings found for migration out of requested 30.
```

or:

```text
Only X valid seeker profiles found for migration out of requested 30.
```

that means the script could not find enough rows that both:

- map into the live `blue_dot` schema shape
- pass JSON schema validation

Try:

- lowering `--seeker-limit` or `--provider-limit`
- checking whether the network config ref/file is the expected one
- re-running with a different `--random-seed`

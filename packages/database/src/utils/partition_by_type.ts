import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { DatabaseError } from 'pg';
import { createHash } from 'node:crypto';

const MAX_PARTITION_KEY_LENGTH = 120;

export async function ensureItemPartition(
  db: NodePgDatabase<any>,
  _network: string,
  _domain: string,
  type: string
) {
  assertValidPartitionKey(type, 'item_type');
  const partitionTableName = buildPartitionTableName(type, 'item');

  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "${partitionTableName}"
        PARTITION OF items
        FOR VALUES IN ('${escapeSqlLiteral(type)}');
      `)
    );
    await assertPartitionAttached(db, 'items', partitionTableName);
  } catch (err) {
    handlePartitionError(err, `item_type partition "${type}"`);
  }
}

export async function ensureActionPartition(
  db: NodePgDatabase<any>,
  actionName: string
) {
  assertValidPartitionKey(actionName, 'action_name');
  const partitionTableName = buildPartitionTableName(actionName, 'action');

  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "${partitionTableName}"
        PARTITION OF item_actions
        FOR VALUES IN ('${escapeSqlLiteral(actionName)}');
      `)
    );
    await assertPartitionAttached(db, 'item_actions', partitionTableName);
  } catch (err) {
    handlePartitionError(err, `action partition "${actionName}"`);
  }
}

export async function ensureActionEventPartition(
  db: NodePgDatabase<any>,
  eventType: string
) {
  assertValidPartitionKey(eventType, 'event_type');
  const partitionTableName = buildPartitionTableName(eventType, 'event');

  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "${partitionTableName}"
        PARTITION OF action_events
        FOR VALUES IN ('${escapeSqlLiteral(eventType)}');
      `)
    );
    await assertPartitionAttached(db, 'action_events', partitionTableName);
  } catch (err) {
    handlePartitionError(err, `event partition "${eventType}"`);
  }
}

async function assertPartitionAttached(
  db: NodePgDatabase<any>,
  parentTableName: string,
  childTableName: string
) {
  const result = (await db.execute(
    sql.raw(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_inherits i
        JOIN pg_class child ON child.oid = i.inhrelid
        JOIN pg_class parent ON parent.oid = i.inhparent
        JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
        JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
        WHERE child_ns.nspname = current_schema()
          AND parent_ns.nspname = current_schema()
          AND child.relname = '${escapeSqlLiteral(childTableName)}'
          AND parent.relname = '${escapeSqlLiteral(parentTableName)}'
      ) AS attached;
    `)
  )) as { rows?: Array<{ attached: boolean }> };

  if (!result.rows?.[0]?.attached) {
    throw new Error(
      `Partition table "${childTableName}" exists but is not attached to parent "${parentTableName}". Drop or rename the stale table and retry.`
    );
  }
}

function handlePartitionError(err: unknown, label: string) {
  if (err instanceof DrizzleQueryError && err.cause instanceof DatabaseError) {
    if (err.cause.code === '42P07') {
      return;
    }

    if (err.cause.code === '23514') {
      throw new Error(`Partition constraint mismatch for ${label}`);
    }
  }

  throw err;
}

function assertValidPartitionKey(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`Invalid ${label} partition key: empty value`);
  }

  if (value.length > MAX_PARTITION_KEY_LENGTH) {
    throw new Error(`Invalid ${label} partition key: exceeds ${MAX_PARTITION_KEY_LENGTH} characters`);
  }
}

function buildPartitionTableName(value: string, suffix: 'item' | 'action' | 'event') {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const base = normalized && /^[a-z]/.test(normalized) ? normalized : `p_${normalized || 'value'}`;
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 8);
  const maxBaseLength = 63 - suffix.length - hash.length - 2;
  const truncated = base.slice(0, Math.max(1, maxBaseLength));

  return `${truncated}_${hash}_${suffix}`;
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

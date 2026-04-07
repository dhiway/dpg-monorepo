import { sql } from 'drizzle-orm';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DatabaseError } from 'pg';

const MAX_PARTITION_KEY_LENGTH = 120;

export async function ensureItemPartition(
  db: NodePgDatabase<any>,
  _network: string,
  _domain: string,
  type: string
) {
  assertValidPartitionKey(type, 'item_type');

  try {
    const partitionTableName = await ensurePartitionForValue(db, 'items', type, 'item');
    await assertPartitionAttachedForValue(db, 'items', partitionTableName, type);
  } catch (err) {
    handlePartitionError(err, `item_type partition "${type}"`);
  }
}

export async function ensureActionPartition(
  db: NodePgDatabase<any>,
  actionName: string
) {
  assertValidPartitionKey(actionName, 'action_name');

  try {
    const partitionTableName = await ensurePartitionForValue(
      db,
      'item_actions',
      actionName,
      'action'
    );
    await assertPartitionAttachedForValue(
      db,
      'item_actions',
      partitionTableName,
      actionName
    );
  } catch (err) {
    handlePartitionError(err, `action partition "${actionName}"`);
  }
}

export async function ensureActionEventPartition(
  db: NodePgDatabase<any>,
  eventType: string
) {
  assertValidPartitionKey(eventType, 'event_type');

  try {
    const partitionTableName = await ensurePartitionForValue(
      db,
      'action_events',
      eventType,
      'event'
    );
    await assertPartitionAttachedForValue(
      db,
      'action_events',
      partitionTableName,
      eventType
    );
  } catch (err) {
    handlePartitionError(err, `event partition "${eventType}"`);
  }
}

async function ensurePartitionForValue(
  db: NodePgDatabase<any>,
  parentTableName: 'items' | 'item_actions' | 'action_events',
  partitionValue: string,
  suffix: 'item' | 'action' | 'event'
) {
  const existingPartitionTableName = await findPartitionTableNameByValue(
    db,
    parentTableName,
    partitionValue
  );

  if (existingPartitionTableName) {
    return existingPartitionTableName;
  }

  const partitionTableName = buildPartitionTableName(partitionValue, suffix);

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "${partitionTableName}"
      PARTITION OF ${parentTableName}
      FOR VALUES IN ('${escapeSqlLiteral(partitionValue)}');
    `)
  );

  return partitionTableName;
}

async function assertPartitionAttachedForValue(
  db: NodePgDatabase<any>,
  parentTableName: 'items' | 'item_actions' | 'action_events',
  childTableName: string,
  partitionValue: string
) {
  const result = (await db.execute(
    sql.raw(`
      SELECT
        EXISTS (
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
        ) AS attached,
        (
          SELECT pg_get_expr(child.relpartbound, child.oid)
          FROM pg_inherits i
          JOIN pg_class child ON child.oid = i.inhrelid
          JOIN pg_class parent ON parent.oid = i.inhparent
          JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
          JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
          WHERE child_ns.nspname = current_schema()
            AND parent_ns.nspname = current_schema()
            AND child.relname = '${escapeSqlLiteral(childTableName)}'
            AND parent.relname = '${escapeSqlLiteral(parentTableName)}'
          LIMIT 1
        ) AS partition_bound;
    `)
  )) as { rows?: Array<{ attached: boolean; partition_bound: string | null }> };

  if (!result.rows?.[0]?.attached) {
    throw new Error(
      `Partition table "${childTableName}" exists but is not attached to parent "${parentTableName}". Drop or rename the stale table and retry.`
    );
  }

  const expectedPartitionBound = buildPartitionBoundExpression(partitionValue);
  if (result.rows[0].partition_bound !== expectedPartitionBound) {
    throw new Error(
      `Partition table "${childTableName}" is attached to parent "${parentTableName}" but uses bound "${result.rows[0].partition_bound ?? 'unknown'}" instead of "${expectedPartitionBound}". Rename or drop the conflicting partition and retry.`
    );
  }
}

async function findPartitionTableNameByValue(
  db: NodePgDatabase<any>,
  parentTableName: 'items' | 'item_actions' | 'action_events',
  partitionValue: string
) {
  const escapedPartitionValue = escapeSqlLiteral(partitionValue);
  const result = (await db.execute(
    sql.raw(`
      SELECT child.relname AS partition_table_name
      FROM pg_inherits i
      JOIN pg_class child ON child.oid = i.inhrelid
      JOIN pg_class parent ON parent.oid = i.inhparent
      JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
      JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
      WHERE child_ns.nspname = current_schema()
        AND parent_ns.nspname = current_schema()
        AND parent.relname = '${escapeSqlLiteral(parentTableName)}'
        AND pg_get_expr(child.relpartbound, child.oid) = 'FOR VALUES IN (''${escapedPartitionValue}'')'
      LIMIT 1;
    `)
  )) as { rows?: Array<{ partition_table_name: string }> };

  return result.rows?.[0]?.partition_table_name ?? null;
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
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const base = normalized || 'value';
  const maxBaseLength = 63 - suffix.length - 1;
  const truncated = base.slice(0, Math.max(1, maxBaseLength));

  return `${truncated}_${suffix}`;
}

function buildPartitionBoundExpression(value: string) {
  return `FOR VALUES IN ('${escapeSqlLiteral(value)}')`;
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

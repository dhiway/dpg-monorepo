import { sql } from 'drizzle-orm';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DatabaseError } from 'pg';

const MAX_PARTITION_KEY_LENGTH = 120;

export async function ensureItemPartition(
  db: NodePgDatabase<any>,
  network: string,
  domain: string,
  type: string
) {
  const values: [string, string, string] = [network, domain, type];
  values.forEach((v) => assertValidPartitionKey(v, 'item_partition_key'));

  try {
    const networkTable = await ensureItemPartitionLevel(
      db,
      'items',
      [network],
      'network'
    );

    const domainTable = await ensureItemPartitionLevel(
      db,
      networkTable,
      [network, domain],
      'domain'
    );

    await ensureItemPartitionLevel(
      db,
      domainTable,
      [network, domain, type],
      'type'
    );
  } catch (err) {
    handlePartitionError(err, `item partition "${values.join('/')}"`);
  }
}

async function ensureItemPartitionLevel(
  db: NodePgDatabase<any>,
  parentTableName: string,
  ancestorValues: string[],
  level: 'network' | 'domain' | 'type'
): Promise<string> {
  const partitionValue = ancestorValues[ancestorValues.length - 1];

  const existingTableName = await findPartitionTableNameByValue(
    db,
    parentTableName,
    partitionValue
  );

  if (existingTableName) {
    return existingTableName;
  }

  const partitionTableName = buildItemPartitionTableName(ancestorValues);

  const subPartitionClause = level !== 'type'
    ? ` PARTITION BY LIST (${level === 'network' ? 'item_domain' : 'item_type'})`
    : '';

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "${partitionTableName}"
      PARTITION OF "${escapeSqlIdentifier(parentTableName)}"
      FOR VALUES IN ('${escapeSqlLiteral(partitionValue)}')${subPartitionClause};
    `)
  );

  return partitionTableName;
}

export async function ensureActionPartition(
  db: NodePgDatabase<any>,
  actionName: string
) {
  assertValidPartitionKey(actionName, 'action_name');

  try {
    const partitionTableName = await ensurePartitionForValues(
      db,
      'item_actions',
      [actionName],
      'a'
    );
    await assertPartitionAttachedForValues(
      db,
      'item_actions',
      partitionTableName,
      [actionName]
    );
  } catch (err) {
    handlePartitionError(err, `action partition "${actionName}"`);
  }
}

export async function ensureActionEventPartition(
  db: NodePgDatabase<any>,
  actionName: string
) {
  assertValidPartitionKey(actionName, 'action_name');

  try {
    const partitionTableName = await ensurePartitionForValues(
      db,
      'action_events',
      [actionName],
      'e'
    );
    await assertPartitionAttachedForValues(
      db,
      'action_events',
      partitionTableName,
      [actionName]
    );
  } catch (err) {
    handlePartitionError(err, `event partition "${actionName}"`);
  }
}

async function ensurePartitionForValues(
  db: NodePgDatabase<any>,
  parentTableName: 'items' | 'item_actions' | 'action_events',
  partitionValues: string[],
  kind: 'i' | 'a' | 'e'
) {
  const existingPartitionTableName = await findPartitionTableNameByValues(
    db,
    parentTableName,
    partitionValues
  );

  if (existingPartitionTableName) {
    return existingPartitionTableName;
  }

  const partitionTableName = buildPartitionTableName(partitionValues, kind);
  const partitionBound = buildPartitionBoundExpression(partitionValues);

  await db.execute(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS "${partitionTableName}"
      PARTITION OF "${escapeSqlIdentifier(parentTableName)}"
      ${partitionBound};
    `)
  );

  return partitionTableName;
}

async function assertPartitionAttachedForValues(
  db: NodePgDatabase<any>,
  parentTableName: 'items' | 'item_actions' | 'action_events',
  childTableName: string,
  partitionValues: string[]
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

  const expectedPartitionBound = buildPartitionBoundExpression(partitionValues);
  /**
   * PostgreSQL normalization might add spaces or explicit type casts in pg_get_expr output.
   * However, for simple LIST partitions with string literals, it usually matches the input format.
   */
  if (result.rows[0].partition_bound !== expectedPartitionBound) {
    throw new Error(
      `Partition table "${childTableName}" is attached to parent "${parentTableName}" but uses bound "${result.rows[0].partition_bound ?? 'unknown'}" instead of "${expectedPartitionBound}". Rename or drop the conflicting partition and retry.`
    );
  }
}

async function findPartitionTableNameByValues(
  db: NodePgDatabase<any>,
  parentTableName: 'items' | 'item_actions' | 'action_events',
  partitionValues: string[]
) {
  const expectedBound = buildPartitionBoundExpression(partitionValues);
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
        AND pg_get_expr(child.relpartbound, child.oid) = '${escapeSqlLiteral(expectedBound)}'
      LIMIT 1;
    `)
  )) as { rows?: Array<{ partition_table_name: string }> };

  return result.rows?.[0]?.partition_table_name ?? null;
}

async function findPartitionTableNameByValue(
  db: NodePgDatabase<any>,
  parentTableName: string,
  partitionValue: string
): Promise<string | null> {
  const escapedValue = escapeSqlLiteral(partitionValue);
  const escapedBound = escapeSqlLiteral(`FOR VALUES IN ('${escapedValue}')`);
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
        AND pg_get_expr(child.relpartbound, child.oid) = '${escapedBound}'
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

function buildItemPartitionTableName(ancestorValues: string[]): string {
  const normalizedParts = ancestorValues
    .map((v) => v.toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean);

  const base = normalizedParts.join('_') || 'value';
  const prefix = 'i_p_';
  const maxBaseLength = 63 - prefix.length;
  const truncated = base.slice(0, Math.max(1, maxBaseLength));

  return `${prefix}${truncated}`;
}

function buildPartitionTableName(values: string[], kind: 'i' | 'a' | 'e') {
  const normalizedParts = values
    .map((v) => v.toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean);

  const base = normalizedParts.join('_') || 'value';
  const prefix = `${kind}_p_`;
  const maxBaseLength = 63 - prefix.length;
  const truncated = base.slice(0, Math.max(1, maxBaseLength));

  return `${prefix}${truncated}`;
}

function buildPartitionBoundExpression(values: string[]) {
  if (values.length === 1) {
    return `FOR VALUES IN ('${escapeSqlLiteral(values[0])}')`;
  }

  const escapedValues = values
    .map((v) => `'${escapeSqlLiteral(v)}'`)
    .join(', ');

  return `FOR VALUES IN ((${escapedValues}))`;
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function escapeSqlIdentifier(value: string) {
  return value.replace(/"/g, '""');
}

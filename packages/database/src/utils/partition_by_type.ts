import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { DatabaseError } from 'pg';

// Keep identifiers short enough for Postgres partition table names.
const PARTITION_SEGMENT_REGEX = /^[a-z][a-z0-9_]{0,20}$/;

export async function ensureItemPartition(
  db: NodePgDatabase<any>,
  _network: string,
  _domain: string,
  type: string
) {
  if (!PARTITION_SEGMENT_REGEX.test(type)) {
    throw new Error(`Invalid item_type partition key: "${type}"`);
  }

  const partitionTableName = `${type}_item`;

  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "${partitionTableName}"
        PARTITION OF items
        FOR VALUES IN ('${type}');
      `)
    );
    await assertPartitionAttached(db, 'items', partitionTableName);
  } catch (err) {
    handlePartitionError(err, `item_type partition "${type}"`);
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
          AND child.relname = '${childTableName}'
          AND parent.relname = '${parentTableName}'
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

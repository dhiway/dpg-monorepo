import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { DatabaseError } from 'pg';

// Reduced length to 50 to account for 'items_' prefix (6 chars)
// keeping total under Postgres 63 byte limit.
const ITEM_TYPE_REGEX = /^[a-z][a-z0-9_]{0,50}$/;

// Simple in-memory cache to avoid hitting DB for known partitions
const knownPartitions = new Set<string>();

export async function ensureItemPartition(
  db: NodePgDatabase<any>,
  type: string
) {
  // 1. Validation
  if (!ITEM_TYPE_REGEX.test(type)) {
    throw new Error(`Invalid item_type: "${type}"`);
  }

  // 2. Cache Check (Optimization)
  if (knownPartitions.has(type)) {
    return;
  }

  const tableName = `items_${type}`;

  try {
    // 3. Execution
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "${tableName}"
        PARTITION OF items
        FOR VALUES IN ('${type}');
      `)
    );

    // 4. Update Cache on Success
    knownPartitions.add(type);
  } catch (err) {
    if (
      err instanceof DrizzleQueryError &&
      err.cause instanceof DatabaseError
    ) {
      // 42P07: duplicate_table
      if (err.cause.code === '42P07') {
        knownPartitions.add(type); // It exists, so cache it
        return;
      }

      // 23514: check_violation (mismatch)
      if (err.cause.code === '23514') {
        throw new Error(
          `Partition constraint mismatch for item_type "${type}"`
        );
      }
    }

    throw err;
  }
}

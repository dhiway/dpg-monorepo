import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export async function ensureItemPartition(db: NodePgDatabase, type: string) {
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS item_${type}
    PARTITION OF item
    FOR VALUES IN ('${type}');
  `)
  );
}

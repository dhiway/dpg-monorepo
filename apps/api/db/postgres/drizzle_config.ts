import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { databasesConfig } from 'apps/api/src/config';

const pool = new Pool({
  connectionString: databasesConfig.pg_url,
  ssl: false,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

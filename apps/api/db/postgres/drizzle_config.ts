import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { databasesConfig } from '../../src/config';
import { Pool } from '@dpg/database';

const pool = new Pool({
  connectionString: databasesConfig.pg_url,
  ssl: false,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { DatabaseError } from 'pg';

// Keep identifiers short enough for Postgres partition table names.
const PARTITION_SEGMENT_REGEX = /^[a-z][a-z0-9_]{0,20}$/;

const knownItemNetworkPartitions = new Set<string>();
const knownItemDomainPartitions = new Set<string>();
const knownItemTypePartitions = new Set<string>();
const knownEventNetworkPartitions = new Set<string>();
const knownEventDomainPartitions = new Set<string>();
const knownEventTypePartitions = new Set<string>();

export async function ensureItemPartition(
  db: NodePgDatabase<any>,
  network: string,
  domain: string,
  type: string
) {
  if (
    !PARTITION_SEGMENT_REGEX.test(network) ||
    !PARTITION_SEGMENT_REGEX.test(domain) ||
    !PARTITION_SEGMENT_REGEX.test(type)
  ) {
    throw new Error(
      `Invalid partition path: "${network}.${domain}.${type}"`
    );
  }

  const networkTableName = `items_${network}`;
  const domainPartitionKey = `${network}:${domain}`;
  const typePartitionKey = `${domainPartitionKey}:${type}`;
  const domainTableName = `${networkTableName}_${domain}`;
  const typeTableName = `${domainTableName}_${type}`;

  if (!knownItemNetworkPartitions.has(network)) {
    try {
      await db.execute(
        sql.raw(`
          CREATE TABLE IF NOT EXISTS "${networkTableName}"
          PARTITION OF items
          FOR VALUES IN ('${network}')
          PARTITION BY LIST (item_domain);
        `)
      );
      await assertPartitionAttached(db, 'items', networkTableName);

      knownItemNetworkPartitions.add(network);
    } catch (err) {
      handlePartitionError(err, `network partition "${network}"`);
    }
  }

  if (!knownItemDomainPartitions.has(domainPartitionKey)) {
    try {
      await db.execute(
        sql.raw(`
          CREATE TABLE IF NOT EXISTS "${domainTableName}"
          PARTITION OF "${networkTableName}"
          FOR VALUES IN ('${domain}')
          PARTITION BY LIST (item_type);
        `)
      );
      await assertPartitionAttached(db, networkTableName, domainTableName);

      knownItemDomainPartitions.add(domainPartitionKey);
    } catch (err) {
      handlePartitionError(
        err,
        `network/domain partition "${network}.${domain}"`
      );
    }
  }

  if (knownItemTypePartitions.has(typePartitionKey)) {
    return;
  }

  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "${typeTableName}"
        PARTITION OF "${domainTableName}"
        FOR VALUES IN ('${type}');
      `)
    );
    await assertPartitionAttached(db, domainTableName, typeTableName);

    knownItemTypePartitions.add(typePartitionKey);
  } catch (err) {
    handlePartitionError(err, `item_type partition "${type}"`);
  }
}

export async function ensureItemEventPartition(
  db: NodePgDatabase<any>,
  network: string,
  domain: string,
  eventType: string
) {
  if (
    !PARTITION_SEGMENT_REGEX.test(network) ||
    !PARTITION_SEGMENT_REGEX.test(domain) ||
    !PARTITION_SEGMENT_REGEX.test(eventType)
  ) {
    throw new Error(
      `Invalid event partition path: "${network}.${domain}.${eventType}"`
    );
  }

  const networkTableName = `item_events_${network}`;
  const domainPartitionKey = `${network}:${domain}`;
  const typePartitionKey = `${domainPartitionKey}:${eventType}`;
  const domainTableName = `${networkTableName}_${domain}`;
  const typeTableName = `${domainTableName}_${eventType}`;

  if (!knownEventNetworkPartitions.has(network)) {
    try {
      await db.execute(
        sql.raw(`
          CREATE TABLE IF NOT EXISTS "${networkTableName}"
          PARTITION OF item_events
          FOR VALUES IN ('${network}')
          PARTITION BY LIST (item_domain);
        `)
      );
      await assertPartitionAttached(db, 'item_events', networkTableName);

      knownEventNetworkPartitions.add(network);
    } catch (err) {
      handlePartitionError(err, `event network partition "${network}"`);
    }
  }

  if (!knownEventDomainPartitions.has(domainPartitionKey)) {
    try {
      await db.execute(
        sql.raw(`
          CREATE TABLE IF NOT EXISTS "${domainTableName}"
          PARTITION OF "${networkTableName}"
          FOR VALUES IN ('${domain}')
          PARTITION BY LIST (event_type);
        `)
      );
      await assertPartitionAttached(db, networkTableName, domainTableName);

      knownEventDomainPartitions.add(domainPartitionKey);
    } catch (err) {
      handlePartitionError(
        err,
        `event network/domain partition "${network}.${domain}"`
      );
    }
  }

  if (knownEventTypePartitions.has(typePartitionKey)) {
    return;
  }

  try {
    await db.execute(
      sql.raw(`
        CREATE TABLE IF NOT EXISTS "${typeTableName}"
        PARTITION OF "${domainTableName}"
        FOR VALUES IN ('${eventType}');
      `)
    );
    await assertPartitionAttached(db, domainTableName, typeTableName);

    knownEventTypePartitions.add(typePartitionKey);
  } catch (err) {
    handlePartitionError(err, `event_type partition "${eventType}"`);
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

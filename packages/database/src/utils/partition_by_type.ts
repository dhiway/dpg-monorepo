import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { DatabaseError } from 'pg';

// Keep identifiers short enough for Postgres partition table names.
const PARTITION_SEGMENT_REGEX = /^[a-z][a-z0-9_]{0,20}$/;

const knownItemDomainPartitions = new Set<string>();
const knownItemTypePartitions = new Set<string>();
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

  const domainPartitionKey = `${network}:${domain}`;
  const typePartitionKey = `${domainPartitionKey}:${type}`;
  const domainTableName = `items_${network}_${domain}`;
  const typeTableName = `${domainTableName}_${type}`;

  if (!knownItemDomainPartitions.has(domainPartitionKey)) {
    try {
      await db.execute(
        sql.raw(`
          CREATE TABLE IF NOT EXISTS "${domainTableName}"
          PARTITION OF items
          FOR VALUES IN (('${network}', '${domain}'))
          PARTITION BY LIST (item_type);
        `)
      );

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

  const domainPartitionKey = `${network}:${domain}`;
  const typePartitionKey = `${domainPartitionKey}:${eventType}`;
  const domainTableName = `item_events_${network}_${domain}`;
  const typeTableName = `${domainTableName}_${eventType}`;

  if (!knownEventDomainPartitions.has(domainPartitionKey)) {
    try {
      await db.execute(
        sql.raw(`
          CREATE TABLE IF NOT EXISTS "${domainTableName}"
          PARTITION OF item_events
          FOR VALUES IN (('${network}', '${domain}'))
          PARTITION BY LIST (event_type);
        `)
      );

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

    knownEventTypePartitions.add(typePartitionKey);
  } catch (err) {
    handlePartitionError(err, `event_type partition "${eventType}"`);
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

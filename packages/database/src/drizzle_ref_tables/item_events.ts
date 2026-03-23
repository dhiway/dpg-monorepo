import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Drizzle reference table for the partitioned `item_events` parent table.
export const item_events = pgTable(
  'item_events',
  {
    item_network: text('item_network').notNull(),
    item_domain: text('item_domain').notNull(),
    item_type: text('item_type').notNull(),
    item_id: uuid('item_id').notNull(),

    event_type: text('event_type').notNull(),
    event_id: uuid('event_id').defaultRandom().notNull(),
    action_name: text('action_name').notNull(),
    actor_network: text('actor_network').notNull(),
    actor_domain: text('actor_domain').notNull(),
    counterparty_network: text('counterparty_network').notNull(),
    counterparty_domain: text('counterparty_domain').notNull(),

    event_schema_url: text('event_schema_url'),
    event_payload: jsonb('event_payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    event_metadata: jsonb('event_metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    occurred_at: timestamp('occurred_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    created_at: timestamp('created_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.item_network,
        table.item_domain,
        table.event_type,
        table.event_id,
      ],
    }),
  ]
);

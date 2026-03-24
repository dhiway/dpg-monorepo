import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Drizzle reference table for the partitioned `action_events` parent table.
export const action_events = pgTable(
  'action_events',
  {
    event_type: text('event_type').notNull(),
    event_id: uuid('event_id').defaultRandom().notNull(),

    action_name: text('action_name').notNull(),
    action_id: uuid('action_id').notNull(),

    source_item_network: text('source_item_network').notNull(),
    source_item_domain: text('source_item_domain').notNull(),
    source_item_type: text('source_item_type').notNull(),
    source_item_id: uuid('source_item_id').notNull(),

    target_item_network: text('target_item_network').notNull(),
    target_item_domain: text('target_item_domain').notNull(),
    target_item_type: text('target_item_type').notNull(),
    target_item_id: uuid('target_item_id').notNull(),

    event_payload: jsonb('event_payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    event_metadata: jsonb('event_metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    created_by: text('created_by').notNull(),
    occurred_at: timestamp('occurred_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    created_at: timestamp('created_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.event_type, table.event_id],
    }),
  ]
);

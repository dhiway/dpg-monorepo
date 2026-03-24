import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const item_actions = pgTable(
  'item_actions',
  {
    action_name: text('action_name').notNull(),
    action_id: uuid('action_id').defaultRandom().notNull(),

    source_item_network: text('source_item_network').notNull(),
    source_item_domain: text('source_item_domain').notNull(),
    source_item_type: text('source_item_type').notNull(),
    source_item_id: uuid('source_item_id').notNull(),

    target_item_network: text('target_item_network').notNull(),
    target_item_domain: text('target_item_domain').notNull(),
    target_item_type: text('target_item_type').notNull(),
    target_item_id: uuid('target_item_id').notNull(),

    status: text('status').notNull(),
    requirements_snapshot: jsonb('requirements_snapshot')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    created_by: text('created_by').notNull(),
    created_at: timestamp('created_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updated_at: timestamp('updated_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.action_name, table.action_id],
    }),
  ]
);

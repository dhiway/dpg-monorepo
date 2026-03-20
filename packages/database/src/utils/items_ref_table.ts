import {
  doublePrecision,
  primaryKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// This is a ref table for items.
// To create items table run > provided sql - scripts (./sql_scripts/create_items.sql)

export const items = pgTable(
  'items',
  {
    item_network: text('item_network').notNull(),
    item_domain: text('item_domain').notNull(),
    item_type: text('item_type').notNull(),
    item_id: uuid('item_id').defaultRandom().notNull(),

    item_domain_url: text('item_domain_url').notNull(),
    item_schema_id: text('item_schema_id').default(''),
    item_schema_url: text('item_schema_url').notNull(),

    item_state: jsonb('item_state')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    item_requirements: jsonb('item_requirements')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    item_filters: jsonb('item_filters')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    item_latitude: doublePrecision('item_latitude'),
    item_longitude: doublePrecision('item_longitude'),

    created_at: timestamp('created_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updated_at: timestamp('updated_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.item_network,
        table.item_domain,
        table.item_type,
        table.item_id,
      ],
    }),
  ]
);

import {
  uuid,
  pgTable,
  text,
  timestamp,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// This is a ref table for items.
// To create items table run > provided sql - scripts (./sql_scripts/create_items.sql)

export const items = pgTable(
  'items',
  {
    itemId: uuid('item_id').defaultRandom().notNull(),
    itemType: text('item_type').notNull(),

    itemDomain: text('item_domain').notNull(),
    itemDomainUrl: text('item_domain_url'),
    itemSchemaId: text('item_schema_id').default(''),
    itemSchemaUrl: text('item_schema_url'),

    itemState: jsonb('item_state')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    itemRequirements: jsonb('item_requirements')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    itemFilters: jsonb('item_filters')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp('updated_at')
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.itemType] })]
);

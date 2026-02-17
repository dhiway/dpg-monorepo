import {
  uuid,
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: text('user_id').notNull(),
  type: text('type').notNull(),
  data: jsonb('data')
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  read: boolean('read').default(false).notNull(),
  created_at: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updated_at: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

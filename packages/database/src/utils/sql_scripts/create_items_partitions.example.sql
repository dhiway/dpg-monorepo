-- Example single-level item_type partitions.
-- This file is intentionally optional and should be adapted per deployment.
-- Run `create_items.sql` first so the parent partitioned tables exist.

DO $$
BEGIN
  IF to_regclass('public.items') IS NULL THEN
    RAISE EXCEPTION 'Parent table "items" does not exist. Run create_items.sql first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS profile_item
PARTITION OF items
FOR VALUES IN ('profile');

CREATE TABLE IF NOT EXISTS notify_event_item
PARTITION OF items
FOR VALUES IN ('notify_event');

CREATE TABLE IF NOT EXISTS items_default
PARTITION OF items DEFAULT;

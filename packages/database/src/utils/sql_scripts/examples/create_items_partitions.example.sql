-- Example network/domain item partitions.
-- This file is intentionally optional and should be adapted per deployment.
-- Run `create_items.sql` first so the parent partitioned tables exist.

DO $$
BEGIN
  IF to_regclass('public.items') IS NULL THEN
    RAISE EXCEPTION 'Parent table "items" does not exist. Run create_items.sql first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS i_p_yellowdot
PARTITION OF items
FOR VALUES IN ('yellow_dot')
PARTITION BY LIST (item_domain);

CREATE TABLE IF NOT EXISTS i_p_yellowdot_student
PARTITION OF i_p_yellowdot
FOR VALUES IN ('student');

CREATE TABLE IF NOT EXISTS i_p_yellowdot_tutor
PARTITION OF i_p_yellowdot
FOR VALUES IN ('tutor');

-- Default partition for items that don't match any specific domain partition
CREATE TABLE IF NOT EXISTS items_default
PARTITION OF items DEFAULT;

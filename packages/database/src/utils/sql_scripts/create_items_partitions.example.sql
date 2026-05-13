-- Example single-level item_type partitions.
-- This file is intentionally optional and should be adapted per deployment.
-- Run `create_items.sql` first so the parent partitioned tables exist.

DO $$
BEGIN
  IF to_regclass('public.items') IS NULL THEN
    RAISE EXCEPTION 'Parent table "items" does not exist. Run create_items.sql first.';
  END IF;
END $$;

-- Updated to the new i_p_{network}_{domain}_{type} format
CREATE TABLE IF NOT EXISTS i_p_yellowdot_student_profile10
PARTITION OF items
FOR VALUES IN (('yellow_dot', 'student', 'profile_1.0'));

CREATE TABLE IF NOT EXISTS i_p_yellowdot_tutor_profile10
PARTITION OF items
FOR VALUES IN (('yellow_dot', 'tutor', 'profile_1.0'));

-- Default partition for items that don't match any specific domain partition
CREATE TABLE IF NOT EXISTS items_default
PARTITION OF items DEFAULT;

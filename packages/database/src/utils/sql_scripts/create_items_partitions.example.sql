-- Example multi-level LIST partitions for items.
-- This file is intentionally optional and should be adapted per deployment.
-- Run `create_items.sql` first so the parent partitioned table exists.
--
-- Hierarchy: item_network -> item_domain -> item_type
-- Each level is a separate PARTITION BY LIST.

DO $$
BEGIN
  IF to_regclass('public.items') IS NULL THEN
    RAISE EXCEPTION 'Parent table "items" does not exist. Run create_items.sql first.';
  END IF;
END $$;

-- Level 1: network partition
CREATE TABLE IF NOT EXISTS i_p_yellowdot
PARTITION OF items
FOR VALUES IN ('yellow_dot')
PARTITION BY LIST (item_domain);

-- Level 2: domain partitions under yellow_dot
CREATE TABLE IF NOT EXISTS i_p_yellowdot_student
PARTITION OF i_p_yellowdot
FOR VALUES IN ('student')
PARTITION BY LIST (item_type);

CREATE TABLE IF NOT EXISTS i_p_yellowdot_tutor
PARTITION OF i_p_yellowdot
FOR VALUES IN ('tutor')
PARTITION BY LIST (item_type);

-- Level 3: item_type leaf partitions under yellow_dot/student
CREATE TABLE IF NOT EXISTS i_p_yellowdot_student_profile10
PARTITION OF i_p_yellowdot_student
FOR VALUES IN ('profile_1.0');

-- Level 3: item_type leaf partitions under yellow_dot/tutor
CREATE TABLE IF NOT EXISTS i_p_yellowdot_tutor_profile10
PARTITION OF i_p_yellowdot_tutor
FOR VALUES IN ('profile_1.0');

-- Default partition for items that don't match any specific network partition.
-- If you use a DEFAULT partition at the top level, it cannot be further sub-partitioned
-- with LIST unless you also define sub-partitions inside it.
-- For strict routing, omit the DEFAULT and ensure all networks have explicit partitions.
-- Example partition setup for the Yellow Dot network.
-- This file is intentionally optional and should be adapted per deployment.
-- Run `create_items.sql` first so the parent partitioned tables exist.

DO $$
BEGIN
  IF to_regclass('public.items') IS NULL THEN
    RAISE EXCEPTION 'Parent table "items" does not exist. Run create_items.sql first.';
  END IF;

  IF to_regclass('public.item_events') IS NULL THEN
    RAISE EXCEPTION 'Parent table "item_events" does not exist. Run create_items.sql first.';
  END IF;
END $$;

-- First-level partition by network.
CREATE TABLE IF NOT EXISTS items_yellow_dot
PARTITION OF items
FOR VALUES IN ('yellow_dot')
PARTITION BY LIST (item_domain);

-- Second-level partition by domain within a network.
CREATE TABLE IF NOT EXISTS items_yellow_dot_student
PARTITION OF items_yellow_dot
FOR VALUES IN ('student')
PARTITION BY LIST (item_type);

CREATE TABLE IF NOT EXISTS items_yellow_dot_tutor
PARTITION OF items_yellow_dot
FOR VALUES IN ('tutor')
PARTITION BY LIST (item_type);

CREATE TABLE IF NOT EXISTS items_yellow_dot_coaching_center
PARTITION OF items_yellow_dot
FOR VALUES IN ('coaching_center')
PARTITION BY LIST (item_type);

-- Third-level partition by item type within a network/domain.
CREATE TABLE IF NOT EXISTS items_yellow_dot_student_profile
PARTITION OF items_yellow_dot_student
FOR VALUES IN ('profile');

CREATE TABLE IF NOT EXISTS items_yellow_dot_tutor_profile
PARTITION OF items_yellow_dot_tutor
FOR VALUES IN ('profile');

CREATE TABLE IF NOT EXISTS items_yellow_dot_coaching_center_profile
PARTITION OF items_yellow_dot_coaching_center
FOR VALUES IN ('profile');

CREATE TABLE IF NOT EXISTS item_events_yellow_dot
PARTITION OF item_events
FOR VALUES IN ('yellow_dot')
PARTITION BY LIST (item_domain);

CREATE TABLE IF NOT EXISTS item_events_yellow_dot_student
PARTITION OF item_events_yellow_dot
FOR VALUES IN ('student')
PARTITION BY LIST (event_type);

CREATE TABLE IF NOT EXISTS item_events_yellow_dot_tutor
PARTITION OF item_events_yellow_dot
FOR VALUES IN ('tutor')
PARTITION BY LIST (event_type);

CREATE TABLE IF NOT EXISTS item_events_yellow_dot_coaching_center
PARTITION OF item_events_yellow_dot
FOR VALUES IN ('coaching_center')
PARTITION BY LIST (event_type);

CREATE TABLE IF NOT EXISTS item_events_yellow_dot_student_connect
PARTITION OF item_events_yellow_dot_student
FOR VALUES IN ('connect');

CREATE TABLE IF NOT EXISTS item_events_yellow_dot_tutor_connect
PARTITION OF item_events_yellow_dot_tutor
FOR VALUES IN ('connect');

CREATE TABLE IF NOT EXISTS item_events_yellow_dot_coaching_center_connect
PARTITION OF item_events_yellow_dot_coaching_center
FOR VALUES IN ('connect');

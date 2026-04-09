-- Example single-level partitions for action and event runtime tables.
-- Run `create_actions_events.sql` first so the parent partitioned tables exist.

DO $$
BEGIN
  IF to_regclass('public.item_actions') IS NULL THEN
    RAISE EXCEPTION 'Parent table "item_actions" does not exist. Run create_actions_events.sql first.';
  END IF;

  IF to_regclass('public.action_events') IS NULL THEN
    RAISE EXCEPTION 'Parent table "action_events" does not exist. Run create_actions_events.sql first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS connect_action
PARTITION OF item_actions
FOR VALUES IN ('connect');

CREATE TABLE IF NOT EXISTS connect_event
PARTITION OF action_events
FOR VALUES IN ('connect');

-- Example action and event partitions.
-- Run `create_actions_events.sql` first.

DO $$
BEGIN
  IF to_regclass('public.item_actions') IS NULL THEN
    RAISE EXCEPTION 'Parent table "item_actions" does not exist.';
  END IF;
  IF to_regclass('public.action_events') IS NULL THEN
    RAISE EXCEPTION 'Parent table "action_events" does not exist.';
  END IF;
END $$;

-- Updated to a_p_{action_name} and e_p_{action_name} format
CREATE TABLE IF NOT EXISTS a_p_connect
PARTITION OF item_actions
FOR VALUES IN ('connect');

CREATE TABLE IF NOT EXISTS e_p_connect
PARTITION OF action_events
FOR VALUES IN ('connect');

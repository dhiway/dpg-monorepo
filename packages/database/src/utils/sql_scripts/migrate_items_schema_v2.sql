BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'items'
      AND column_name = 'item_domain_url'
  ) THEN
    ALTER TABLE items
      RENAME COLUMN item_domain_url TO item_instance_url;
  END IF;
END $$;

ALTER TABLE items
  DROP COLUMN IF EXISTS item_schema_id,
  DROP COLUMN IF EXISTS item_requirements,
  DROP COLUMN IF EXISTS item_filters;

DROP INDEX IF EXISTS items_domain_url_idx;
DROP INDEX IF EXISTS items_requirements_gin_idx;
DROP INDEX IF EXISTS items_filters_gin_idx;

CREATE INDEX IF NOT EXISTS items_instance_url_idx
ON items (item_instance_url);

ALTER TABLE item_events
  ADD COLUMN IF NOT EXISTS actor_network TEXT,
  ADD COLUMN IF NOT EXISTS counterparty_network TEXT;

UPDATE item_events
SET
  actor_network = COALESCE(actor_network, item_network),
  counterparty_network = COALESCE(counterparty_network, item_network)
WHERE actor_network IS NULL
   OR counterparty_network IS NULL;

ALTER TABLE item_events
  ALTER COLUMN actor_network SET NOT NULL,
  ALTER COLUMN counterparty_network SET NOT NULL;

COMMIT;

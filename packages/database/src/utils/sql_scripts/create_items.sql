CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE TABLE IF NOT EXISTS items (
  item_network TEXT NOT NULL,
  item_domain TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id UUID DEFAULT gen_random_uuid() NOT NULL,

  item_instance_url TEXT NOT NULL,
  item_schema_url TEXT NOT NULL,

  item_state JSONB NOT NULL DEFAULT '{}'::jsonb,

  item_latitude DOUBLE PRECISION,
  item_longitude DOUBLE PRECISION,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT items_pk PRIMARY KEY (item_network, item_domain, item_type, item_id),
  CONSTRAINT items_geo_lat_chk CHECK (
    item_latitude IS NULL OR (item_latitude >= -90 AND item_latitude <= 90)
  ),
  CONSTRAINT items_geo_lng_chk CHECK (
    item_longitude IS NULL OR (item_longitude >= -180 AND item_longitude <= 180)
  ),
  CONSTRAINT items_geo_pair_chk CHECK (
    (item_latitude IS NULL AND item_longitude IS NULL)
    OR
    (item_latitude IS NOT NULL AND item_longitude IS NOT NULL)
  )
)
PARTITION BY LIST (item_network);

CREATE INDEX IF NOT EXISTS items_lookup_idx
ON items (item_network, item_domain, item_type, created_at DESC);

CREATE INDEX IF NOT EXISTS items_instance_url_idx
ON items (item_instance_url);

CREATE INDEX IF NOT EXISTS items_schema_url_idx
ON items (item_schema_url);

CREATE INDEX IF NOT EXISTS items_state_gin_idx
ON items USING GIN (item_state);

CREATE INDEX IF NOT EXISTS items_geo_earth_idx
ON items USING GIST (ll_to_earth(item_latitude, item_longitude));

CREATE TABLE IF NOT EXISTS item_events (
  item_network TEXT NOT NULL,
  item_domain TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,

  event_type TEXT NOT NULL,
  event_id UUID DEFAULT gen_random_uuid() NOT NULL,
  action_name TEXT NOT NULL,
  actor_network TEXT NOT NULL,
  actor_domain TEXT NOT NULL,
  counterparty_network TEXT NOT NULL,
  counterparty_domain TEXT NOT NULL,

  event_schema_url TEXT,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT item_events_pk PRIMARY KEY (
    item_network,
    item_domain,
    event_type,
    event_id
  ),
  CONSTRAINT item_events_item_fk FOREIGN KEY (
    item_network,
    item_domain,
    item_type,
    item_id
  ) REFERENCES items (
    item_network,
    item_domain,
    item_type,
    item_id
  ) ON DELETE CASCADE
)
PARTITION BY LIST (item_network);

CREATE INDEX IF NOT EXISTS item_events_item_lookup_idx
ON item_events (item_network, item_domain, item_type, item_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS item_events_action_idx
ON item_events (action_name, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS item_events_payload_gin_idx
ON item_events USING GIN (event_payload);

CREATE INDEX IF NOT EXISTS item_events_metadata_gin_idx
ON item_events USING GIN (event_metadata);

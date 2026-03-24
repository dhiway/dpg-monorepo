CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS item_actions (
  action_name TEXT NOT NULL,
  action_id UUID DEFAULT gen_random_uuid() NOT NULL,

  source_item_network TEXT NOT NULL,
  source_item_domain TEXT NOT NULL,
  source_item_type TEXT NOT NULL,
  source_item_id UUID NOT NULL,

  target_item_network TEXT NOT NULL,
  target_item_domain TEXT NOT NULL,
  target_item_type TEXT NOT NULL,
  target_item_id UUID NOT NULL,

  status TEXT NOT NULL,
  requirements_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT item_actions_pk PRIMARY KEY (action_name, action_id),
  CONSTRAINT item_actions_source_item_fk FOREIGN KEY (
    source_item_network,
    source_item_domain,
    source_item_type,
    source_item_id
  ) REFERENCES items (
    item_network,
    item_domain,
    item_type,
    item_id
  ) ON DELETE CASCADE,
  CONSTRAINT item_actions_target_item_fk FOREIGN KEY (
    target_item_network,
    target_item_domain,
    target_item_type,
    target_item_id
  ) REFERENCES items (
    item_network,
    item_domain,
    item_type,
    item_id
  ) ON DELETE CASCADE,
  CONSTRAINT item_actions_created_by_fk FOREIGN KEY (created_by)
    REFERENCES "user" (id) ON DELETE RESTRICT
)
PARTITION BY LIST (action_name);

CREATE INDEX IF NOT EXISTS item_actions_source_item_idx
ON item_actions (
  source_item_network,
  source_item_domain,
  source_item_type,
  source_item_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS item_actions_target_item_idx
ON item_actions (
  target_item_network,
  target_item_domain,
  target_item_type,
  target_item_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS item_actions_created_by_idx
ON item_actions (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS item_actions_requirements_gin_idx
ON item_actions USING GIN (requirements_snapshot);

CREATE TABLE IF NOT EXISTS action_events (
  event_type TEXT NOT NULL,
  event_id UUID DEFAULT gen_random_uuid() NOT NULL,
  action_name TEXT NOT NULL,
  action_id UUID NOT NULL,

  source_item_network TEXT NOT NULL,
  source_item_domain TEXT NOT NULL,
  source_item_type TEXT NOT NULL,
  source_item_id UUID NOT NULL,

  target_item_network TEXT NOT NULL,
  target_item_domain TEXT NOT NULL,
  target_item_type TEXT NOT NULL,
  target_item_id UUID NOT NULL,

  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_by TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT action_events_pk PRIMARY KEY (event_type, event_id),
  CONSTRAINT action_events_action_fk FOREIGN KEY (action_name, action_id)
    REFERENCES item_actions (action_name, action_id) ON DELETE CASCADE,
  CONSTRAINT action_events_created_by_fk FOREIGN KEY (created_by)
    REFERENCES "user" (id) ON DELETE RESTRICT
)
PARTITION BY LIST (event_type);

CREATE INDEX IF NOT EXISTS action_events_action_idx
ON action_events (action_name, action_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS action_events_source_item_idx
ON action_events (
  source_item_network,
  source_item_domain,
  source_item_type,
  source_item_id,
  occurred_at DESC
);

CREATE INDEX IF NOT EXISTS action_events_target_item_idx
ON action_events (
  target_item_network,
  target_item_domain,
  target_item_type,
  target_item_id,
  occurred_at DESC
);

CREATE INDEX IF NOT EXISTS action_events_payload_gin_idx
ON action_events USING GIN (event_payload);

CREATE INDEX IF NOT EXISTS action_events_metadata_gin_idx
ON action_events USING GIN (event_metadata);

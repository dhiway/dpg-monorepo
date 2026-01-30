CREATE TABLE items (
  item_type TEXT NOT NULL,
  item_id   UUID DEFAULT gen_random_uuid() NOT NULL,

  item_domain TEXT NOT NULL,
  item_domain_url TEXT,

  item_schema_id TEXT,
  item_schema_url TEXT,

  item_state JSONB NOT NULL,
  item_requirements JSONB NOT NULL,
  item_filters JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (item_type, item_id)
)
PARTITION BY LIST (item_type);

-- To create a partition by item_type 

CREATE TABLE items_profile
PARTITION OF items
FOR VALUES IN ('profile');

-- Create items_connection partition table
CREATE TABLE IF NOT EXISTS items_connection
PARTITION OF items
FOR VALUES IN ('connection');

-- Add indexes for fast connection queries
CREATE INDEX IF NOT EXISTS idx_connection_requester 
ON items_connection ((item_state->>'requesterId'));

CREATE INDEX IF NOT EXISTS idx_connection_recipient 
ON items_connection ((item_state->>'recipientId'));

CREATE INDEX IF NOT EXISTS idx_connection_status 
ON items_connection ((item_state->>'status'));

-- Composite index for common queries (requester + status)
CREATE INDEX IF NOT EXISTS idx_connection_requester_status 
ON items_connection ((item_state->>'requesterId'), (item_state->>'status'));

-- Composite index for common queries (recipient + status)
CREATE INDEX IF NOT EXISTS idx_connection_recipient_status 
ON items_connection ((item_state->>'recipientId'), (item_state->>'status'));

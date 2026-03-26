-- Add operational columns to whoop_connections
ALTER TABLE whoop_connections
  ADD COLUMN IF NOT EXISTS needs_reconnect boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sync_error text DEFAULT null,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz DEFAULT null;

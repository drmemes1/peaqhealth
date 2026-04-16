-- ── Pre-collection metadata columns on oral_kit_orders ──────────────────────
-- Two user-facing questions captured on the pre-collection metadata screen
-- (Step 2 of 2 in the collection flow) plus minutes_since_waking which is
-- reserved/null (no longer asked).

ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS dietary_nitrate_today boolean,
  ADD COLUMN IF NOT EXISTS pre_hygiene_confirmed boolean,
  ADD COLUMN IF NOT EXISTS minutes_since_waking  integer;

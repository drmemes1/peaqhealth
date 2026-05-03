ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS ph_balance_api NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS ph_balance_category TEXT,
  ADD COLUMN IF NOT EXISTS ph_balance_confidence TEXT,
  ADD COLUMN IF NOT EXISTS cariogenic_load_pct NUMERIC(5,3),
  ADD COLUMN IF NOT EXISTS cariogenic_load_category TEXT,
  ADD COLUMN IF NOT EXISTS protective_ratio NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS protective_ratio_category TEXT;

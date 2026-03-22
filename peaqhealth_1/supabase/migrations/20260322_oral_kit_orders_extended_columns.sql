-- ── Extended oral_kit_orders columns ─────────────────────────────────────────
-- The initial schema only had basic columns.
-- The admin upload route and dashboard now rely on these additional columns.
-- All ADD COLUMN IF NOT EXISTS so safe to run against any DB state.

ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS kit_code             text,
  ADD COLUMN IF NOT EXISTS raw_otu_table        jsonb,
  ADD COLUMN IF NOT EXISTS oral_score_snapshot  jsonb,
  ADD COLUMN IF NOT EXISTS findings_snapshot    jsonb,
  ADD COLUMN IF NOT EXISTS results_date         timestamptz,
  ADD COLUMN IF NOT EXISTS report_date          date;

-- Index on kit_code for fast admin lookups
CREATE INDEX IF NOT EXISTS oral_kit_orders_kit_code_idx ON public.oral_kit_orders (kit_code);

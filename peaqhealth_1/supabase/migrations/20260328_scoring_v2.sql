-- ── 2a. Update score_snapshots for v2 architecture ──────────────────────────
ALTER TABLE score_snapshots
  ADD COLUMN IF NOT EXISTS base_score        numeric,
  ADD COLUMN IF NOT EXISTS modifier_total    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS modifiers_applied jsonb   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS lifestyle_context jsonb;

COMMENT ON COLUMN score_snapshots.lifestyle_context IS
  'Lifestyle data stored as context only — no longer contributes to score';

-- ── 2b. Add new oral dimension columns to oral_kit_orders ───────────────────
ALTER TABLE oral_kit_orders
  ADD COLUMN IF NOT EXISTS neuro_signal_pct       numeric,
  ADD COLUMN IF NOT EXISTS metabolic_signal_pct   numeric,
  ADD COLUMN IF NOT EXISTS proliferative_signal_pct numeric;

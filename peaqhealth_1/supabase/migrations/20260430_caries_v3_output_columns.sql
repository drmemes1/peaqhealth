-- Caries v3 output columns (PR-β1)
-- ================================
--
-- Adds the 19 output columns required by lib/oral/caries-v3.ts. The kit
-- processing pipeline persists these alongside the existing v2 caries panel
-- columns (ph_balance_api / cariogenic_load_pct / protective_ratio). Both
-- v2 and v3 are populated during the rollout; v2 will be deprecated in a
-- separate cleanup PR after v3 is validated against multiple kits and the
-- UI cuts over (PR-β2).
--
-- All abundance columns are stored as numeric (matching the *_pct
-- convention). Categorical fields are stored as text (raw enum values per
-- the v3 type union — no enum constraint at the DB layer; the application
-- layer is the source of truth).
--
-- caries_v3_breakdown stores the algorithm's intermediate sums (acidSum,
-- bufferSum, adsStrong, etc.) as jsonb for methodology / debugging.

ALTER TABLE public.oral_kit_orders
  -- Core scores
  ADD COLUMN IF NOT EXISTS ph_balance_api_v3                numeric,
  ADD COLUMN IF NOT EXISTS ph_balance_api_v3_category       text,
  ADD COLUMN IF NOT EXISTS cariogenic_load_v3               numeric,
  ADD COLUMN IF NOT EXISTS cariogenic_load_v3_category      text,
  ADD COLUMN IF NOT EXISTS protective_ratio_v3              numeric,
  ADD COLUMN IF NOT EXISTS protective_ratio_v3_category     text,

  -- New v3 metrics
  ADD COLUMN IF NOT EXISTS commensal_sufficiency_index      numeric,
  ADD COLUMN IF NOT EXISTS commensal_sufficiency_category   text,
  ADD COLUMN IF NOT EXISTS ads_primary_pct                  numeric,
  ADD COLUMN IF NOT EXISTS ads_extended_pct                 numeric,

  -- Flags (default FALSE so the boolean is always defined; nullable would
  -- require triple-state handling downstream)
  ADD COLUMN IF NOT EXISTS compensated_dysbiosis_flag       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS synergy_active_flag              boolean DEFAULT false,

  -- Risk classification (the headline)
  ADD COLUMN IF NOT EXISTS caries_risk_category             text,

  -- Confidence + reliability metadata
  ADD COLUMN IF NOT EXISTS caries_v3_confidence             text,
  ADD COLUMN IF NOT EXISTS caries_v3_reliability_flags      text[],
  ADD COLUMN IF NOT EXISTS caries_v3_confounder_adjustments jsonb DEFAULT '{}'::jsonb,

  -- Algorithm internals for methodology transparency / debugging
  ADD COLUMN IF NOT EXISTS caries_v3_breakdown              jsonb,

  -- "When did v3 last run for this kit?" — used by the backfill script's
  -- idempotency check.
  ADD COLUMN IF NOT EXISTS caries_v3_computed_at            timestamptz;

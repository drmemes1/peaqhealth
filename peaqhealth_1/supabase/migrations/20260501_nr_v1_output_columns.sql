-- NR v1 (nitric oxide pathway) output columns on oral_kit_orders
-- ===============================================================
--
-- Adds the 11 columns the NR-α algorithm (apps/web/lib/oral/nr-v1.ts)
-- produces. Mirrors the caries v3 output-columns migration
-- (20260430_caries_v3_output_columns.sql) — same shape conventions:
--   - numeric for raw scores; text for categorical fields
--   - boolean for flags, default false
--   - jsonb for structured maps; defaults provided where downstream
--     code spreads the value into a result object
--   - timestamptz for the per-pipeline `computed_at` marker
--
-- Output columns are NULL until the runner writes them. Existing kits
-- are backfilled by scripts/backfill-nr-v1-outputs.ts. See ADR-0021.

ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS nr_capacity_index             numeric,
  ADD COLUMN IF NOT EXISTS nr_capacity_category          text,
  ADD COLUMN IF NOT EXISTS no_signature                  numeric,
  ADD COLUMN IF NOT EXISTS no_signature_category         text,
  ADD COLUMN IF NOT EXISTS nr_risk_category              text,
  ADD COLUMN IF NOT EXISTS nr_paradox_flag               boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS nr_v1_confidence              text,
  ADD COLUMN IF NOT EXISTS nr_v1_reliability_flags       text[],
  ADD COLUMN IF NOT EXISTS nr_v1_confounder_adjustments  jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS nr_v1_breakdown               jsonb,
  ADD COLUMN IF NOT EXISTS nr_v1_computed_at             timestamptz;

-- Vocabularies (enforced at the application layer):
--   nr_capacity_category:    'depleted' | 'low' | 'moderate' | 'robust' | 'exceptional'
--   no_signature_category:   'strongly_unfavorable' | 'unfavorable' | 'moderate' | 'favorable' | 'strongly_favorable'
--   nr_risk_category:        'optimal' | 'capacity_constrained' | 'composition_constrained' | 'compromised' | 'insufficient_data'
--   nr_v1_confidence:        'low' | 'moderate' | 'high'

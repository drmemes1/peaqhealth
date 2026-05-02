-- Periodontal burden v1 (PR-Δ-β1) — output + species-level columns.
-- Applied to production via Supabase MCP on 2026-05-02; this file is
-- the repo-tracked record of the schema change.

ALTER TABLE public.oral_kit_orders
  -- Algorithm output columns
  ADD COLUMN IF NOT EXISTS perio_burden_index               numeric,
  ADD COLUMN IF NOT EXISTS perio_burden_index_adjusted      numeric,
  ADD COLUMN IF NOT EXISTS perio_burden_category            text,
  ADD COLUMN IF NOT EXISTS perio_defense_index              numeric,
  ADD COLUMN IF NOT EXISTS perio_defense_category           text,
  ADD COLUMN IF NOT EXISTS total_subp_pct                   numeric,
  ADD COLUMN IF NOT EXISTS commensal_depletion_factor       numeric,
  ADD COLUMN IF NOT EXISTS cdm_amplification_pct            numeric,
  ADD COLUMN IF NOT EXISTS perio_risk_category              text,
  ADD COLUMN IF NOT EXISTS diagnostic_uncertainty_zone      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS red_complex_status               jsonb,
  ADD COLUMN IF NOT EXISTS cross_panel_hooks                jsonb,
  ADD COLUMN IF NOT EXISTS perio_v1_confidence              text,
  ADD COLUMN IF NOT EXISTS perio_v1_reliability_flags       text[],
  ADD COLUMN IF NOT EXISTS perio_v1_confounder_adjustments  jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS perio_v1_narrative_augmentations text[],
  ADD COLUMN IF NOT EXISTS perio_v1_breakdown               jsonb,
  ADD COLUMN IF NOT EXISTS perio_v1_computed_at             timestamptz,

  -- Species-level columns the parser will populate post-PR-Δ-α-parser (#256).
  -- Until the parser PR merges, the runner reads from raw_otu_table.__meta.entries.
  ADD COLUMN IF NOT EXISTS p_gingivalis_pct    numeric,
  ADD COLUMN IF NOT EXISTS f_alocis_pct        numeric,
  ADD COLUMN IF NOT EXISTS f_nucleatum_pct     numeric,
  ADD COLUMN IF NOT EXISTS s_constellatus_pct  numeric,
  ADD COLUMN IF NOT EXISTS p_micra_pct         numeric,
  ADD COLUMN IF NOT EXISTS c_matruchotii_pct   numeric,
  ADD COLUMN IF NOT EXISTS s_mitis_group_pct   numeric,
  ADD COLUMN IF NOT EXISTS t_forsythia_pct     numeric,
  ADD COLUMN IF NOT EXISTS p_intermedia_pct    numeric;

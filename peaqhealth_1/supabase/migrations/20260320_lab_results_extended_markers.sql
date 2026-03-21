-- ── Extended lab_results columns ─────────────────────────────────────────────
-- Adds markers introduced in parser v2 that were not in the initial schema.
-- All use IF NOT EXISTS so this is safe to run against any DB state.

ALTER TABLE public.lab_results
  -- CBC extended
  ADD COLUMN IF NOT EXISTS mch_pg               numeric,
  ADD COLUMN IF NOT EXISTS mchc_gdl             numeric,
  ADD COLUMN IF NOT EXISTS rbc_mil              numeric,
  ADD COLUMN IF NOT EXISTS neutrophils_pct      numeric,
  ADD COLUMN IF NOT EXISTS lymphs_pct           numeric,
  -- CMP extended
  ADD COLUMN IF NOT EXISTS globulin_gdl         numeric,
  ADD COLUMN IF NOT EXISTS total_protein_gdl    numeric,
  ADD COLUMN IF NOT EXISTS calcium_mgdl         numeric,
  ADD COLUMN IF NOT EXISTS chloride_mmoll       numeric,
  ADD COLUMN IF NOT EXISTS co2_mmoll            numeric,
  -- Thyroid panel
  ADD COLUMN IF NOT EXISTS free_t4_ngdl         numeric,
  ADD COLUMN IF NOT EXISTS free_t3_pgml         numeric,
  ADD COLUMN IF NOT EXISTS thyroglobulin_ngml   numeric,
  ADD COLUMN IF NOT EXISTS tpo_antibodies_iuml  numeric,
  -- Hormones / longevity
  ADD COLUMN IF NOT EXISTS dhea_s_ugdl          numeric,
  ADD COLUMN IF NOT EXISTS igf1_ngml            numeric,
  ADD COLUMN IF NOT EXISTS cortisol_ugdl        numeric,
  -- Vitamins
  ADD COLUMN IF NOT EXISTS vitamin_b12_pgml     numeric,
  ADD COLUMN IF NOT EXISTS folate_ngml          numeric,
  -- Tumour markers
  ADD COLUMN IF NOT EXISTS psa_ngml             numeric,
  ADD COLUMN IF NOT EXISTS cea_ngml             numeric,
  ADD COLUMN IF NOT EXISTS ca199_uml            numeric;

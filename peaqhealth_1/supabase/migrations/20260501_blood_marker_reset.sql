-- Blood marker architectural reset
-- =================================
--
-- Replaces the existing lab_results / lab_history schema with
-- blood_results + blood_marker_confidence, driven by the registry at
-- apps/web/lib/blood/markerRegistry.ts. Column names below are the
-- canonical marker IDs from that registry. The schema-sync test at
-- apps/web/lib/blood/__tests__/registry-schema-sync.test.ts asserts
-- this column list matches the registry exactly — adding a marker
-- is one row in the registry plus one column here, and the test
-- catches any divergence at build time.
--
-- See ADR-0020 (docs/decisions/0020-blood-marker-registry-architecture.md)
-- and the audit at docs/architecture/blood-markers-current-state.md.
--
-- Pre-existing tables and FKs are dropped. The CASCADE on lab_results
-- intentionally removes score_snapshots rows that referenced it (those
-- snapshots include the corrupt 14-bug data from the Function Health
-- incident — see docs/incidents/2026-05-01-function-health-14-bug.md).
-- The app is not in production; this is acceptable.

-- ── Drop the old world ──────────────────────────────────────────────────────

DROP TABLE IF EXISTS lab_history CASCADE;
DROP TABLE IF EXISTS lab_results CASCADE;

-- ── Build the new world ─────────────────────────────────────────────────────

CREATE TABLE blood_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collected_at        timestamptz NOT NULL,

  -- Parser metadata
  source_lab          text,
  parser_used         text NOT NULL,
  parse_confidence    numeric,
  raw_pdf_path        text,

  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW(),

  -- ── BLOOD COUNT (CBC) ─────────────────────────────────────────────────
  hemoglobin_gdl                  numeric,
  hematocrit_percent              numeric,
  rbc_million_ul                  numeric,
  mcv_fl                          numeric,
  mch_pg                          numeric,
  mchc_gdl                        numeric,
  rdw_percent                     numeric,
  mpv_fl                          numeric,
  platelets_thousand_ul           numeric,

  -- ── IMMUNE (white blood cells) ───────────────────────────────────────
  wbc_thousand_ul                 numeric,
  neutrophils_percent             numeric,
  neutrophils_thousand_ul         numeric,
  lymphocytes_percent             numeric,
  lymphocytes_thousand_ul         numeric,
  monocytes_percent               numeric,
  monocytes_thousand_ul           numeric,
  eosinophils_percent             numeric,
  eosinophils_thousand_ul         numeric,
  basophils_percent               numeric,
  basophils_thousand_ul           numeric,

  -- ── ELECTROLYTES ──────────────────────────────────────────────────────
  sodium_mmoll                    numeric,
  potassium_mmoll                 numeric,
  chloride_mmoll                  numeric,
  carbon_dioxide_mmoll            numeric,
  calcium_mgdl                    numeric,
  magnesium_mgdl                  numeric,

  -- ── HORMONES ──────────────────────────────────────────────────────────
  testosterone_total_ngdl         numeric,
  testosterone_free_pgml          numeric,
  shbg_nmoll                      numeric,
  dhea_sulfate_ugdl               numeric,
  estradiol_pgml                  numeric,
  lh_miuml                        numeric,
  fsh_miuml                       numeric,
  prolactin_ngml                  numeric,

  -- ── LIPIDS / HEART ────────────────────────────────────────────────────
  total_cholesterol_mgdl          numeric,
  ldl_mgdl                        numeric,
  hdl_mgdl                        numeric,
  triglycerides_mgdl              numeric,
  total_chol_hdl_ratio            numeric,
  lipoprotein_a_mgdl              numeric,
  apob_mgdl                       numeric,
  hs_crp_mgl                      numeric,
  homocysteine_umoll              numeric,

  -- ── KIDNEY ────────────────────────────────────────────────────────────
  creatinine_mgdl                 numeric,
  egfr_mlmin                      numeric,
  bun_mgdl                        numeric,
  bun_creatinine_ratio            numeric,

  -- ── LIVER ─────────────────────────────────────────────────────────────
  alt_ul                          numeric,
  ast_ul                          numeric,
  alp_ul                          numeric,
  ggt_ul                          numeric,
  total_bilirubin_mgdl            numeric,
  albumin_gdl                     numeric,
  globulin_gdl                    numeric,
  total_protein_gdl               numeric,
  albumin_globulin_ratio          numeric,

  -- ── METABOLIC ─────────────────────────────────────────────────────────
  glucose_mgdl                    numeric,
  hba1c_percent                   numeric,
  insulin_uiuml                   numeric,
  uric_acid_mgdl                  numeric,

  -- ── NUTRIENTS ─────────────────────────────────────────────────────────
  vitamin_d_ngml                  numeric,
  ferritin_ngml                   numeric,
  iron_ugdl                       numeric,
  iron_binding_capacity_ugdl      numeric,
  iron_saturation_percent         numeric,
  zinc_ugdl                       numeric,

  -- ── STRESS / AGING ────────────────────────────────────────────────────
  cortisol_ugdl                   numeric,

  -- ── THYROID ───────────────────────────────────────────────────────────
  tsh_uiuml                       numeric,
  t4_free_ngdl                    numeric,
  t3_free_pgml                    numeric,

  -- ── PRO TIER — INFLAMMATION (advanced) ───────────────────────────────
  il6_pgml                        numeric,
  nt_probnp_pgml                  numeric,

  -- ── PRO TIER — ADVANCED LIPIDS (NMR LipoProfile) ─────────────────────
  ldl_particle_number_nmoll       numeric,
  ldl_medium_nmoll                numeric,
  ldl_small_nmoll                 numeric,
  ldl_peak_size_angstroms         numeric,
  non_hdl_cholesterol_mgdl        numeric,
  hdl_large_umoll                 numeric,

  -- ── PRO TIER — HEAVY METALS ──────────────────────────────────────────
  mercury_ugl                     numeric,
  lead_ugdl                       numeric,

  -- ── PRO TIER — MALE HEALTH (PSA panel) ───────────────────────────────
  psa_total_ngml                  numeric,
  psa_free_ngml                   numeric,
  psa_free_percent                numeric,

  -- ── PRO TIER — PANCREAS ──────────────────────────────────────────────
  lipase_ul                       numeric,
  amylase_ul                      numeric,

  -- ── PRO TIER — ADVANCED NUTRIENTS (omega index, MMA) ────────────────
  mma_nmoll                       numeric,
  omega_check_percent             numeric,
  omega3_total_percent            numeric,
  omega3_epa_percent              numeric,
  omega3_dha_percent              numeric,
  omega3_dpa_percent              numeric,
  omega6_total_percent            numeric,
  omega6_linoleic_acid_percent    numeric,
  omega6_arachidonic_acid_percent numeric,
  omega_6_3_ratio                 numeric,
  arachidonic_epa_ratio           numeric,

  -- ── PRO TIER — ADVANCED THYROID (autoantibodies) ─────────────────────
  tg_antibodies_iuml              numeric,
  tpo_antibodies_iuml             numeric
);

CREATE INDEX idx_blood_results_user_collected
  ON blood_results(user_id, collected_at DESC);

-- ── Per-marker confidence tracking ──────────────────────────────────────────
-- One row per (blood_results id, marker_id) where the parser actually emitted
-- a value. Lets us debug parser quality forensically: what was the OCR text
-- that produced this number? Was the value computed (derived marker) or
-- extracted directly? This is the "future incidents are debuggable without
-- asking the user to re-upload" surface from the 14-bug incident doc § 5.

CREATE TABLE blood_marker_confidence (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blood_result_id     uuid NOT NULL REFERENCES blood_results(id) ON DELETE CASCADE,
  marker_id           text NOT NULL,
  confidence          numeric NOT NULL,
  raw_extracted_text  text,
  was_computed        boolean NOT NULL DEFAULT false,

  UNIQUE(blood_result_id, marker_id)
);

CREATE INDEX idx_marker_confidence_result
  ON blood_marker_confidence(blood_result_id);

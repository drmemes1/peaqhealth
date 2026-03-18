-- ============================================================================
-- Lab History & 24-hour Lock System
-- Migration: 20260318_lab_history.sql
-- ============================================================================

-- ── Step 1: Add lock + version columns to lab_results ───────────────────────

ALTER TABLE lab_results
  ADD COLUMN IF NOT EXISTS locked_at       timestamptz,
  ADD COLUMN IF NOT EXISTS lock_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_locked       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version         int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lab_name_parsed text;

-- UNIQUE constraint: one active lab row per user
-- (history goes to lab_history; lab_results holds only the current set)
ALTER TABLE lab_results
  ADD CONSTRAINT lab_results_user_id_unique UNIQUE (user_id);

-- ── Step 2: Create lab_history table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lab_history (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Marker values at time of lock
  ldl_mgdl              numeric,
  hdl_mgdl              numeric,
  triglycerides_mgdl    numeric,
  hs_crp_mgl            numeric,
  hba1c_pct             numeric,
  glucose_mgdl          numeric,
  vitamin_d_ngml        numeric,
  apob_mgdl             numeric,
  lpa_mgdl              numeric,
  egfr_mlmin            numeric,
  alt_ul                numeric,
  ast_ul                numeric,
  wbc_kul               numeric,
  hemoglobin_gdl        numeric,
  rdw_pct               numeric,
  albumin_gdl           numeric,
  bun_mgdl              numeric,
  alk_phos_ul           numeric,
  total_bilirubin_mgdl  numeric,
  sodium_mmoll          numeric,
  potassium_mmoll       numeric,
  total_cholesterol_mgdl numeric,
  non_hdl_mgdl          numeric,
  testosterone_ngdl     numeric,
  free_testo_pgml       numeric,
  shbg_nmoll            numeric,
  ferritin_ngml         numeric,
  tsh_uiuml             numeric,
  esr_mmhr              numeric,
  homocysteine_umoll    numeric,

  -- Score at time of lock
  total_score           numeric,
  blood_score           numeric,

  -- Metadata
  collection_date       date,
  lab_name              text,
  lock_type             text DEFAULT 'auto',  -- 'auto' | 'manual'
  locked_at             timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now(),

  CONSTRAINT lab_history_user_id_locked_at_unique UNIQUE (user_id, locked_at)
);

ALTER TABLE public.lab_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lab history"
  ON public.lab_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lab history"
  ON public.lab_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert (used by cron)
CREATE POLICY "Service role can insert lab history"
  ON public.lab_history FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update lab results"
  ON public.lab_results FOR UPDATE
  TO service_role
  USING (true);

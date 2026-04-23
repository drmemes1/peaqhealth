-- Questionnaire V2 — new fields + symptoms table
-- Adds 14 new columns to lifestyle_records, rewrites 2 existing fields

-- ── New fields on lifestyle_records ──

ALTER TABLE public.lifestyle_records
  ADD COLUMN IF NOT EXISTS neck_circumference_inches NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS sleep_consistency TEXT,
  ADD COLUMN IF NOT EXISTS cpap_or_mad_in_use TEXT[],
  ADD COLUMN IF NOT EXISTS ent_assessment_history TEXT,
  ADD COLUMN IF NOT EXISTS mouthwash_type_v2 TEXT,
  ADD COLUMN IF NOT EXISTS mouthwash_frequency TEXT,
  ADD COLUMN IF NOT EXISTS mouthwash_prescribed_by_dentist BOOLEAN,
  ADD COLUMN IF NOT EXISTS toothbrush_type TEXT,
  ADD COLUMN IF NOT EXISTS brushing_frequency TEXT,
  ADD COLUMN IF NOT EXISTS tongue_scraping_freq TEXT,
  ADD COLUMN IF NOT EXISTS xylitol_use TEXT,
  ADD COLUMN IF NOT EXISTS oral_probiotic_in_use TEXT[],
  ADD COLUMN IF NOT EXISTS last_dental_cleaning_months INTEGER,
  ADD COLUMN IF NOT EXISTS last_periodontal_exam_months INTEGER,
  ADD COLUMN IF NOT EXISTS preferred_units TEXT DEFAULT 'imperial',
  ADD COLUMN IF NOT EXISTS questionnaire_version TEXT DEFAULT 'v1';

-- ── Rewrite: snoring_frequency (replaces snoring_reported) ──

ALTER TABLE public.lifestyle_records
  ADD COLUMN IF NOT EXISTS snoring_frequency TEXT;

-- Migrate existing data
UPDATE public.lifestyle_records
SET snoring_frequency = CASE
  WHEN snoring_reported = 'frequent' THEN 'frequently'
  WHEN snoring_reported = 'osa_diagnosed' THEN 'diagnosed_osa'
  WHEN snoring_reported = 'occasional' THEN 'occasionally'
  WHEN snoring_reported = 'no' THEN 'never'
  WHEN snoring_reported = 'yes' THEN 'frequently'
  ELSE NULL
END
WHERE snoring_frequency IS NULL AND snoring_reported IS NOT NULL;

-- Mark old column deprecated (comment only — keep for backward compat)
COMMENT ON COLUMN public.lifestyle_records.snoring_reported IS 'DEPRECATED v2 — use snoring_frequency instead';

-- ── Rewrite: medications array (replaces medication_ppi_detail) ──

ALTER TABLE public.lifestyle_records
  ADD COLUMN IF NOT EXISTS medications_v2 TEXT[],
  ADD COLUMN IF NOT EXISTS medication_frequency TEXT;

UPDATE public.lifestyle_records
SET medications_v2 = CASE
  WHEN medication_ppi_detail IS NOT NULL AND medication_ppi_detail != '' AND medication_ppi_detail != 'none'
    THEN ARRAY['ppi']
  ELSE ARRAY['none']
END
WHERE medications_v2 IS NULL AND medication_ppi_detail IS NOT NULL;

COMMENT ON COLUMN public.lifestyle_records.medication_ppi_detail IS 'DEPRECATED v2 — use medications_v2 instead';

-- ── New table: user_symptoms ──

CREATE TABLE IF NOT EXISTS public.user_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dry_mouth_morning INTEGER,
  dry_mouth_daytime INTEGER,
  bleeding_gums INTEGER,
  gum_recession BOOLEAN,
  bad_breath_self INTEGER,
  bad_breath_partner_noted BOOLEAN,
  tooth_sensitivity INTEGER,
  jaw_pain_tmj BOOLEAN,
  morning_headache_freq INTEGER,
  daytime_fatigue_freq INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS user_symptoms_user_idx
  ON public.user_symptoms(user_id);

ALTER TABLE public.user_symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own symptoms"
  ON public.user_symptoms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptoms"
  ON public.user_symptoms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own symptoms"
  ON public.user_symptoms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage symptoms"
  ON public.user_symptoms FOR ALL
  USING (true)
  WITH CHECK (true);

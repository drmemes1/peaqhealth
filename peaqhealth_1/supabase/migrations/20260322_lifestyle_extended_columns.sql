-- ── Extended lifestyle_records columns ───────────────────────────────────────
-- The initial schema only captured 13 core fields.
-- The form and score engine now use additional optional fields.
-- All ADD COLUMN IF NOT EXISTS so safe to run against any DB state.

ALTER TABLE public.lifestyle_records
  -- Nutrition
  ADD COLUMN IF NOT EXISTS stress_level                  text,
  ADD COLUMN IF NOT EXISTS alcohol_drinks_per_week       integer,
  ADD COLUMN IF NOT EXISTS vegetable_servings_per_day    integer,
  ADD COLUMN IF NOT EXISTS fruit_servings_per_day        integer,
  ADD COLUMN IF NOT EXISTS processed_food_frequency      integer,
  ADD COLUMN IF NOT EXISTS sugary_drinks_per_week        integer,
  ADD COLUMN IF NOT EXISTS exercise_minutes_per_week     integer,
  ADD COLUMN IF NOT EXISTS diet_quality                  text,
  ADD COLUMN IF NOT EXISTS omega3_frequency              text,
  -- Medical history (extended)
  ADD COLUMN IF NOT EXISTS hypertension_dx               text,
  ADD COLUMN IF NOT EXISTS on_bp_meds                    text,
  ADD COLUMN IF NOT EXISTS on_statins                    text,
  ADD COLUMN IF NOT EXISTS on_diabetes_meds              text,
  ADD COLUMN IF NOT EXISTS family_history_cvd            text,
  ADD COLUMN IF NOT EXISTS family_history_hypertension   boolean;

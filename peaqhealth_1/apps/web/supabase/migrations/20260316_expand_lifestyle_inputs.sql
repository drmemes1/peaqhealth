-- Expand lifestyle_records with new questionnaire fields (v4.2)
ALTER TABLE lifestyle_records
ADD COLUMN IF NOT EXISTS hypertension_dx boolean,
ADD COLUMN IF NOT EXISTS on_bp_meds boolean,
ADD COLUMN IF NOT EXISTS on_statins boolean,
ADD COLUMN IF NOT EXISTS on_diabetes_meds boolean,
ADD COLUMN IF NOT EXISTS family_history_cvd boolean,
ADD COLUMN IF NOT EXISTS family_history_hypertension boolean,
ADD COLUMN IF NOT EXISTS vegetable_servings_per_day int,
ADD COLUMN IF NOT EXISTS fruit_servings_per_day int,
ADD COLUMN IF NOT EXISTS processed_food_frequency int,
ADD COLUMN IF NOT EXISTS sugary_drinks_per_week int,
ADD COLUMN IF NOT EXISTS alcohol_drinks_per_week int,
ADD COLUMN IF NOT EXISTS stress_level text;

-- Add wearable biometrics columns
ALTER TABLE wearable_connections
ADD COLUMN IF NOT EXISTS latest_resting_hr int,
ADD COLUMN IF NOT EXISTS latest_vo2max numeric;

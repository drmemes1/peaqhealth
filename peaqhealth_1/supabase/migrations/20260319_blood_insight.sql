-- Add blood_insight column to lab_results for OpenAI-generated marker summaries
ALTER TABLE lab_results
  ADD COLUMN IF NOT EXISTS blood_insight text;

-- Also ensure extended marker columns exist (egfr, hemoglobin — added by OpenAI parser)
ALTER TABLE lab_results
  ADD COLUMN IF NOT EXISTS egfr_mlmin    numeric,
  ADD COLUMN IF NOT EXISTS hemoglobin_gdl numeric;

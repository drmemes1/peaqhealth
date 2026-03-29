-- Extend lifestyle_checkins with self-reported energy, blood pressure feeling, and supplements
ALTER TABLE lifestyle_checkins
  ADD COLUMN IF NOT EXISTS energy_level           text,
  ADD COLUMN IF NOT EXISTS blood_pressure_feeling text,
  ADD COLUMN IF NOT EXISTS supplements            text[];

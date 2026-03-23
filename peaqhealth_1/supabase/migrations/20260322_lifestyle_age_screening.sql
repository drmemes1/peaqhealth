-- ── Age range, biological sex, and preventive screening columns ───────────────
-- Gates age/sex-weighted scoring and conditional form questions.
-- All ADD COLUMN IF NOT EXISTS — safe to run on any DB state.

ALTER TABLE public.lifestyle_records
  ADD COLUMN IF NOT EXISTS age_range                 text,
  ADD COLUMN IF NOT EXISTS biological_sex            text,
  ADD COLUMN IF NOT EXISTS cac_scored                boolean,
  ADD COLUMN IF NOT EXISTS colorectal_screening_done boolean,
  ADD COLUMN IF NOT EXISTS lung_ct_done              boolean,
  ADD COLUMN IF NOT EXISTS mammogram_done            boolean,
  ADD COLUMN IF NOT EXISTS dexa_done                 boolean,
  ADD COLUMN IF NOT EXISTS psa_discussed             boolean,
  ADD COLUMN IF NOT EXISTS cervical_screening_done   boolean;

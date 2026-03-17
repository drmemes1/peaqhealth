-- Score Engine v5.0 — new columns on score_snapshots
-- Adds Peaq%, Lp(a) flag, hsCRP retest flag, recency multiplier, interactions fired

ALTER TABLE score_snapshots
  ADD COLUMN IF NOT EXISTS peaq_percent               numeric,
  ADD COLUMN IF NOT EXISTS peaq_percent_label         text,
  ADD COLUMN IF NOT EXISTS lpa_flag                   text CHECK (lpa_flag IN ('elevated', 'very_elevated')),
  ADD COLUMN IF NOT EXISTS hscrp_retest_flag          boolean,
  ADD COLUMN IF NOT EXISTS blood_recency_multiplier   numeric,
  ADD COLUMN IF NOT EXISTS interactions_fired         jsonb,
  ADD COLUMN IF NOT EXISTS engine_version             text;

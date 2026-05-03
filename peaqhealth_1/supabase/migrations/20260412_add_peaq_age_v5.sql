-- Phase 2a: Add Peaq Age V5 columns to score_snapshots
-- These are written by the dual-write in recalculate.ts alongside the legacy score.
-- All nullable — existing rows keep their current values.

ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS peaq_age DECIMAL(5,1);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS pheno_age DECIMAL(5,1);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS oma_percentile DECIMAL(5,1);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS vo2_percentile INTEGER;
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS rhr_delta DECIMAL(4,2);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS sleep_dur_delta DECIMAL(4,2);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS sleep_reg_delta DECIMAL(4,2);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS cross_panel_i1 DECIMAL(4,2);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS cross_panel_i2 DECIMAL(4,2);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS cross_panel_i3 DECIMAL(4,2);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS peaq_age_delta DECIMAL(4,2);
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS peaq_age_band TEXT;
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS score_version TEXT DEFAULT 'v4';
ALTER TABLE score_snapshots ADD COLUMN IF NOT EXISTS peaq_age_breakdown JSONB;

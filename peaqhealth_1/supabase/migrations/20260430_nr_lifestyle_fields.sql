-- NR-α lifestyle fields
-- =====================
--
-- Adds two columns to lifestyle_records consumed by the NR-pathway confounder
-- logic in apps/web/lib/oral/nr-v1.ts. Both are nullable; existing rows remain
-- valid and are populated lazily as users answer q43/q44 in the wizard.
--
-- These coexist with the existing `dietary_nitrate_frequency` and
-- `tongue_scraping_freq` columns (added in 20260424). The existing columns
-- capture habit detail (5- and 4-option granularity); the new columns capture
-- the coarser binned signal that NR confounder logic actually consumes
-- (low/moderate/high; never/occasional/daily). See ADR-0019.
--
-- The matching `oral_kit_orders` v3 columns are intentionally NOT created in
-- this PR — NR scoring outputs are added in a later pipeline-integration PR
-- (NR-β1).

ALTER TABLE public.lifestyle_records
  ADD COLUMN IF NOT EXISTS dietary_nitrate_intake text,
  ADD COLUMN IF NOT EXISTS tongue_scraping        text;

-- Vocabularies (enforced at the application layer):
--   dietary_nitrate_intake: 'low' | 'moderate' | 'high'
--   tongue_scraping:        'never' | 'occasional' | 'daily'

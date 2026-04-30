-- Caries v3 lifestyle fields
-- ==========================
--
-- Adds two new columns to lifestyle_records used by the caries v3 confounder
-- logic in apps/web/lib/oral/caries-v3.ts. Both are nullable; existing rows
-- remain valid and are backfilled lazily as users update their lifestyle
-- records via the wizard.
--
-- The v3 module also reads two existing columns: `sugar_intake` and
-- `antibiotics_window`. Per ADR-0014, those are intentionally reused rather
-- than duplicated as new columns.
--
-- The matching `oral_kit_orders` v3 columns are intentionally NOT created in
-- this PR — they would be empty until the parser/schema PR (PR-α) extracts the
-- new species into `oral_kit_orders.*_pct` columns. See ADR-0014.

ALTER TABLE public.lifestyle_records
  ADD COLUMN IF NOT EXISTS chlorhexidine_use      text,
  ADD COLUMN IF NOT EXISTS xerostomia_self_report text;

-- Vocabularies (enforced at the application layer):
--   chlorhexidine_use:      'never' | 'past_8wks' | 'currently_using'
--   xerostomia_self_report: 'never' | 'occasional' | 'frequent' | 'constant'

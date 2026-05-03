-- PR-Ε — Upper airway + halitosis v2 schema additions.
-- Applied to production via Supabase MCP on 2026-05-03; this file is
-- the repo-tracked record of the schema change.
--
-- Three migrations bundled here:
--   1. lifestyle_records — halitosis blind-spot disclosure (tonsil
--      stones), LHM input (last dental cleaning), GERD diagnostic
--      refinement (5-state enum replaces the gerd_nocturnal boolean).
--   2. oral_kit_orders — halitosis driver species + genus
--      accumulators. Drops the duplicate p_intermedia_pct column,
--      consolidating on the canonical prevotella_intermedia_pct.
--   3. oral_kit_orders — upper-airway-v1 + halitosis-v2 algorithm
--      output columns.

-- ── 1. lifestyle_records ─────────────────────────────────────────────
ALTER TABLE public.lifestyle_records
  ADD COLUMN IF NOT EXISTS tonsil_stones_history TEXT CHECK (
    tonsil_stones_history IN ('never','occasional','frequent','tonsillectomy')
  ),
  ADD COLUMN IF NOT EXISTS last_dental_cleaning TEXT CHECK (
    last_dental_cleaning IN ('within_6_months','6_to_12_months','over_12_months','never')
  ),
  ADD COLUMN IF NOT EXISTS gerd_frequency TEXT CHECK (
    gerd_frequency IN ('never','occasional','frequent','daily','diagnosed_treated')
  );

COMMENT ON COLUMN public.lifestyle_records.tonsil_stones_history IS
  'Tonsil stone (tonsillolith) history. Methodology blind-spot acknowledgment for halitosis: tonsil stones produce dramatic VSCs but are invisible to salivary 16S sequencing.';

COMMENT ON COLUMN public.lifestyle_records.last_dental_cleaning IS
  'Self-reported last professional dental cleaning. Feeds halitosis Lifestyle Halitosis Modifier (LHM) — overdue cleanings amplify VSC-producer accumulation.';

COMMENT ON COLUMN public.lifestyle_records.gerd_frequency IS
  'Self-reported GERD/reflux frequency (5-state). Replaces the boolean gerd_nocturnal field. Cross-references upper airway and halitosis modules. Methodology disclosure: salivary 16S does not detect GERD-driven oral changes directly.';

-- Old boolean column had zero true rows in production at migration time.
ALTER TABLE public.lifestyle_records DROP COLUMN IF EXISTS gerd_nocturnal;

-- ── 2. oral_kit_orders species + genus accumulators ──────────────────
ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS s_moorei_pct                  numeric,
  ADD COLUMN IF NOT EXISTS atopobium_parvulum_pct        numeric,
  ADD COLUMN IF NOT EXISTS prevotella_nigrescens_pct     numeric,
  ADD COLUMN IF NOT EXISTS prevotella_melaninogenica_pct numeric,
  ADD COLUMN IF NOT EXISTS eikenella_corrodens_pct       numeric,
  ADD COLUMN IF NOT EXISTS dialister_invisus_pct         numeric,
  ADD COLUMN IF NOT EXISTS eubacterium_sulci_pct         numeric,
  ADD COLUMN IF NOT EXISTS selenomonas_total_pct         numeric,
  ADD COLUMN IF NOT EXISTS alloprevotella_total_pct      numeric;

-- Consolidate the duplicate Prevotella intermedia column. p_intermedia_pct
-- was added in error during PR-Δ-α-parser; the older column
-- prevotella_intermedia_pct is canonical (more code references). Backfill
-- any non-null p_intermedia_pct values into the canonical column, then drop.
UPDATE public.oral_kit_orders
SET prevotella_intermedia_pct = COALESCE(prevotella_intermedia_pct, p_intermedia_pct)
WHERE p_intermedia_pct IS NOT NULL;
ALTER TABLE public.oral_kit_orders DROP COLUMN IF EXISTS p_intermedia_pct;

-- ── 3. Upper-airway + halitosis algorithm output columns ─────────────
ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS upper_airway_tier              text,
  ADD COLUMN IF NOT EXISTS bacterial_osa_features_count   integer,
  ADD COLUMN IF NOT EXISTS bacterial_osa_features         jsonb,
  ADD COLUMN IF NOT EXISTS stop_score                     integer,
  ADD COLUMN IF NOT EXISTS stop_total_score               integer,
  ADD COLUMN IF NOT EXISTS nasal_obstruction_score        integer,
  ADD COLUMN IF NOT EXISTS nasal_obstruction_category     text,
  ADD COLUMN IF NOT EXISTS upper_airway_routing           jsonb,
  ADD COLUMN IF NOT EXISTS upper_airway_peroxide_severity text,
  ADD COLUMN IF NOT EXISTS upper_airway_v1_breakdown      jsonb,
  ADD COLUMN IF NOT EXISTS upper_airway_v1_computed_at    timestamptz,

  ADD COLUMN IF NOT EXISTS halitosis_hmi                  numeric,
  ADD COLUMN IF NOT EXISTS halitosis_hmi_category         text,
  ADD COLUMN IF NOT EXISTS halitosis_phenotype            text,
  ADD COLUMN IF NOT EXISTS halitosis_h2s_adjusted         numeric,
  ADD COLUMN IF NOT EXISTS halitosis_ch3sh_adjusted       numeric,
  ADD COLUMN IF NOT EXISTS halitosis_protective_modifier  numeric,
  ADD COLUMN IF NOT EXISTS halitosis_lhm                  numeric,
  ADD COLUMN IF NOT EXISTS halitosis_peroxide_caveat      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS halitosis_v2_drivers           jsonb,
  ADD COLUMN IF NOT EXISTS halitosis_v2_protective        jsonb,
  ADD COLUMN IF NOT EXISTS halitosis_v2_lhm_factors       jsonb,
  ADD COLUMN IF NOT EXISTS halitosis_v2_reliability_flags text[],
  ADD COLUMN IF NOT EXISTS halitosis_v2_computed_at       timestamptz;

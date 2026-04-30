-- Caries v3 species columns (PR-α)
-- ===============================
--
-- Adds 13 new species-level abundance columns required by the caries v3
-- module (apps/web/lib/oral/caries-v3.ts) plus an audit array for hyphenated
-- species calls that the parser resolved by assigning to the first listed
-- species name.
--
-- All new abundance columns default to 0 (not null) — the parser writes 0
-- for species absent from a sample, which is the correct biological value
-- for the v3 algorithm. This matches the existing oral_kit_orders.*_pct
-- column convention.
--
-- Per ADR-0015, two of these (b_dentium_pct, s_sputigena_pct) are not
-- currently detected by Zymo's V3-V4 panel and will populate as 0 for all
-- existing kits. They are added now for forward compatibility.

ALTER TABLE public.oral_kit_orders
  -- Tier 1 ADS species (caries v3 buffering)
  ADD COLUMN IF NOT EXISTS s_cristatus_pct        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS s_parasanguinis_pct    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS s_australis_pct        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS a_naeslundii_pct       numeric DEFAULT 0,

  -- S. mitis (tracked but NOT counted as ADS — Price 1986)
  ADD COLUMN IF NOT EXISTS s_mitis_pct            numeric DEFAULT 0,

  -- Species-level Rothia (genus-level rothia_pct continues to populate)
  ADD COLUMN IF NOT EXISTS rothia_dentocariosa_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rothia_aeria_pct       numeric DEFAULT 0,

  -- Acidogenic synergists (caries v3 CLI)
  ADD COLUMN IF NOT EXISTS b_dentium_pct          numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS s_sputigena_pct        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS p_acidifaciens_pct     numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leptotrichia_wadei_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leptotrichia_shahii_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS p_denticola_pct        numeric DEFAULT 0;

-- Parser bookkeeping for hyphenated / unresolved species calls.
-- Format per entry: "<genus_lower>;<species_with_hyphen> -> <genus_lower> <resolved_part>"
-- NULL = no hyphenated calls in this kit; never an empty array.
ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS parser_unresolved_species text[] DEFAULT NULL;

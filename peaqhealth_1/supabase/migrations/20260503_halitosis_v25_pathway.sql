-- PR-Ε halitosis v2.5 calibration update — applied via Supabase MCP on
-- 2026-05-03. Deprecates halitosis_phenotype (made redundant by category +
-- pathway combination). Adds:
--   halitosis_pathway            — primary diagnostic field (tongue_dominant
--                                  / gum_dominant / mixed / minimal_pressure)
--   halitosis_subjective_routing — fires when category=low + LHM > 1.30,
--                                  routes narrative to non-bacterial cause
--                                  investigation (postnasal drip, GERD, etc.)

ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS halitosis_pathway            text,
  ADD COLUMN IF NOT EXISTS halitosis_subjective_routing boolean DEFAULT false;

ALTER TABLE public.oral_kit_orders DROP COLUMN IF EXISTS halitosis_phenotype;

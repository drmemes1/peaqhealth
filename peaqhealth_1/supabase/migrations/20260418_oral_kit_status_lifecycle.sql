-- ── Oral kit status lifecycle expansion ──────────────────────────────────────
-- Adds support for: kit_sent, sample_received, zymo_processing, l7_ready,
-- results_uploaded, pipeline_running, results_ready, failed
-- No CHECK constraint — status is managed by application code.

-- Backfill: reset the two existing results_ready kits that have NULL species
-- data so they show up in the admin upload page for reprocessing.
UPDATE public.oral_kit_orders
SET status = 'l7_ready'
WHERE status = 'results_ready'
  AND neisseria_pct IS NULL
  AND porphyromonas_pct IS NULL
  AND s_mutans_pct IS NULL;

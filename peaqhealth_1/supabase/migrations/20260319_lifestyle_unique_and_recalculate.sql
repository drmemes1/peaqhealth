-- ── Deduplicate lifestyle_records (keep most recent per user) ───────────────
-- Required before adding unique constraint in case prior failed upserts created
-- duplicate rows (upsert silently failed when constraint was missing).
DELETE FROM public.lifestyle_records
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.lifestyle_records
  ORDER BY user_id, updated_at DESC NULLS LAST
);

-- ── Add unique constraint so upsert onConflict: "user_id" works ─────────────
ALTER TABLE public.lifestyle_records
  ADD CONSTRAINT lifestyle_records_user_id_unique UNIQUE (user_id);

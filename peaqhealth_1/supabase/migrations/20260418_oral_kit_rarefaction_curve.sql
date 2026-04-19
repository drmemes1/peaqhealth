ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS rarefaction_curve jsonb;

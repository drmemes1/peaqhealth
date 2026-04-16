-- Adds no_wearable_caveat — set by the oral scoring pipeline when differential
-- pattern scores are computed without wearable signals. Internal flag used by
-- the narrative engine to soften OSA/UARS language.

ALTER TABLE public.oral_kit_orders
  ADD COLUMN IF NOT EXISTS no_wearable_caveat boolean;

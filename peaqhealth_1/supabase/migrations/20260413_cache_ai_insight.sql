ALTER TABLE score_snapshots
  ADD COLUMN IF NOT EXISTS ai_insight_headline TEXT,
  ADD COLUMN IF NOT EXISTS ai_insight_body TEXT,
  ADD COLUMN IF NOT EXISTS ai_insight_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_guidance_items JSONB;

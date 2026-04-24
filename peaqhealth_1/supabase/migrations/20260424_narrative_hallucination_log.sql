CREATE TABLE IF NOT EXISTS narrative_hallucination_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  category TEXT,
  user_id_hashed TEXT,
  hallucinations TEXT[],
  raw_output_preview TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hallucination_log_time
  ON narrative_hallucination_log (occurred_at DESC);

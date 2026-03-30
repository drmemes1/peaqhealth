CREATE TABLE IF NOT EXISTS sleep_narratives (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at    timestamptz DEFAULT now(),
  period_start    date        NOT NULL,
  period_end      date        NOT NULL,
  nights_analyzed integer,

  -- Generated content
  headline        text,
  narrative       text,
  watch_signal    text,
  positive_signal text,

  -- Metrics snapshot
  avg_hrv         numeric,
  avg_efficiency  numeric,
  avg_deep_pct    numeric,
  avg_rem_pct     numeric,
  hrv_trend_pct   numeric,

  -- Cross-panel context used
  oral_context    jsonb,
  blood_context   jsonb,

  raw_response    jsonb,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE sleep_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own narratives" ON sleep_narratives
  FOR SELECT USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS sleep_narratives_user_period_key
  ON sleep_narratives(user_id, period_end);

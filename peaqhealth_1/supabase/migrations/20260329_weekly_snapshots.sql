CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start       date NOT NULL,
  generated_at     timestamptz NOT NULL DEFAULT now(),

  -- Score at time of generation
  total_score      integer,
  sleep_sub        integer,
  blood_sub        integer,
  oral_sub         integer,
  lifestyle_sub    integer,
  prev_total_score integer,

  -- Sleep metrics for the week
  avg_hrv          numeric(6,2),
  avg_efficiency   numeric(6,2),
  avg_deep_pct     numeric(6,2),
  avg_rem_pct      numeric(6,2),
  nights_tracked   integer DEFAULT 0,
  hrv_trend_pct    numeric(6,2),

  -- Generated narrative
  headline              text,
  body                  text,
  trend_direction       text CHECK (trend_direction IN ('improving', 'stable', 'declining')),
  retest_recommendation text,
  raw_response          jsonb,

  UNIQUE (user_id, week_start)
);

ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own weekly snapshots"
  ON weekly_snapshots FOR SELECT
  USING (auth.uid() = user_id);

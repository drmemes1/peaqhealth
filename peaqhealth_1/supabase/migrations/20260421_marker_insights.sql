CREATE TABLE IF NOT EXISTS public.marker_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marker_id text NOT NULL,
  panel text NOT NULL,
  data_hash text NOT NULL,
  prompt_version text NOT NULL,
  verdict text NOT NULL,
  verdict_label text NOT NULL,
  plain_meaning text NOT NULL,
  narrative text,
  scale_user_position numeric,
  cross_panel_observations jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz DEFAULT now(),
  generation_ms integer,
  model text DEFAULT 'gpt-4o',
  UNIQUE(user_id, marker_id, data_hash, prompt_version)
);

CREATE INDEX IF NOT EXISTS marker_insights_user_panel_idx
  ON public.marker_insights (user_id, panel);
CREATE INDEX IF NOT EXISTS marker_insights_user_recent_idx
  ON public.marker_insights (user_id, generated_at DESC);

ALTER TABLE public.marker_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own marker insights"
  ON public.marker_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage marker insights"
  ON public.marker_insights FOR ALL
  USING (true)
  WITH CHECK (true);

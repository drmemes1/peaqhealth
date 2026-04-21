CREATE TABLE IF NOT EXISTS public.converge_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  data_hash text NOT NULL,
  prompt_version integer NOT NULL DEFAULT 1,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS converge_cache_user_kind_idx
  ON public.converge_cache(user_id, kind);

ALTER TABLE public.converge_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own converge cache"
  ON public.converge_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage converge cache"
  ON public.converge_cache FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS panel_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  panel text NOT NULL CHECK (panel IN ('oral','blood','sleep')),
  tab text NOT NULL CHECK (tab IN ('summary','converge','questions')),
  content text,
  pullquotes jsonb DEFAULT '[]'::jsonb,
  citations jsonb DEFAULT '[]'::jsonb,
  prompt_version text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, panel, tab, prompt_version)
);

CREATE INDEX IF NOT EXISTS idx_panel_narratives_user_panel ON panel_narratives(user_id, panel);
CREATE INDEX IF NOT EXISTS idx_panel_narratives_lookup ON panel_narratives(user_id, panel, tab, prompt_version);

ALTER TABLE panel_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own panel narratives" ON panel_narratives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert panel narratives" ON panel_narratives FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update panel narratives" ON panel_narratives FOR UPDATE USING (true);

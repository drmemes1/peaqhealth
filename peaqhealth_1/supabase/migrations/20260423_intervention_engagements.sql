-- Tracks user engagement with intervention recommendations
CREATE TABLE IF NOT EXISTS intervention_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  intervention_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('committed', 'already_doing', 'not_relevant')),
  reason TEXT,
  reason_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retracted_at TIMESTAMPTZ
);

CREATE INDEX idx_engagements_user_intervention ON intervention_engagements (user_id, intervention_id, created_at DESC);

ALTER TABLE intervention_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engagements" ON intervention_engagements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own engagements" ON intervention_engagements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own engagements" ON intervention_engagements
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON intervention_engagements
  FOR ALL USING (auth.role() = 'service_role');

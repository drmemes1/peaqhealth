-- RLS policies for blood_results + blood_marker_confidence.
--
-- Companion to 20260501_blood_marker_reset.sql. That migration created the
-- new tables and Supabase auto-enabled RLS, but no policies were attached
-- — every auth-bound write hit code 42501 ("new row violates row-level
-- security policy for table 'blood_results'").
--
-- Mirrors the lifestyle_records pattern: "Users can manage own X" — ALL
-- commands gated by auth.uid() = user_id. blood_marker_confidence has no
-- direct user_id column, so its policy gates via the parent blood_results
-- row's user_id.

CREATE POLICY "Users can manage own blood results"
  ON blood_results FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own blood marker confidence"
  ON blood_marker_confidence FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blood_results br
      WHERE br.id = blood_marker_confidence.blood_result_id
        AND br.user_id = auth.uid()
    )
  );

-- Add airway/sinus questionnaire fields to lifestyle_records.
-- Unblocks the sinus/OSA modifier branches in the oral narrative prompt (v3).
-- All fields nullable — form never blocks submission on these.

alter table lifestyle_records
  add column if not exists nasal_obstruction text,
  add column if not exists sinus_history text,
  add column if not exists snoring_reported text,
  add column if not exists mouth_breathing text;

alter table lifestyle_records
  add constraint lifestyle_records_nasal_obstruction_check
  check (nasal_obstruction is null or nasal_obstruction in ('never', 'occasional', 'often', 'chronic'));

alter table lifestyle_records
  add constraint lifestyle_records_sinus_history_check
  check (sinus_history is null or sinus_history in ('none', 'recurrent_sinusitis', 'sinus_surgery', 'nasal_polyps', 'deviated_septum'));

alter table lifestyle_records
  add constraint lifestyle_records_snoring_reported_check
  check (snoring_reported is null or snoring_reported in ('no', 'occasional', 'frequent', 'osa_diagnosed'));

alter table lifestyle_records
  add constraint lifestyle_records_mouth_breathing_check
  check (mouth_breathing is null or mouth_breathing in ('rarely', 'sometimes', 'often', 'confirmed'));

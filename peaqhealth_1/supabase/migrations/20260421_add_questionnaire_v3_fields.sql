ALTER TABLE public.lifestyle_records
  ADD COLUMN IF NOT EXISTS sugar_intake text,
  ADD COLUMN IF NOT EXISTS antibiotics_window text,
  ADD COLUMN IF NOT EXISTS medication_ppi_detail text;

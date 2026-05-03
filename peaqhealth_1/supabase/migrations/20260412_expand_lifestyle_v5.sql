-- Phase 2b: Expand lifestyle_records for Peaq Age V5
--
-- ┌─────────────────────────┬───────────┬──────────────────────────────────────────┐
-- │ Column (from V5 spec)   │ Status    │ Notes                                    │
-- ├─────────────────────────┼───────────┼──────────────────────────────────────────┤
-- │ biological_sex          │ EXISTS    │ TEXT — already in schema                  │
-- │ mouthwash_type          │ EXISTS    │ TEXT — already in schema                  │
-- │ nasal_obstruction       │ EXISTS    │ TEXT with CHECK — already added           │
-- │ sinus_history           │ EXISTS    │ TEXT with CHECK (includes sinus_surgery)  │
-- │ snoring_reported        │ EXISTS    │ TEXT with CHECK (includes osa_diagnosed)  │
-- │ mouth_breathing         │ EXISTS    │ TEXT with CHECK — already added           │
-- │ known_hypertension      │ EXISTS    │ BOOLEAN — already in schema              │
-- │ known_diabetes          │ EXISTS    │ BOOLEAN — already in schema              │
-- │ smoking_status          │ EXISTS    │ TEXT — already in schema                  │
-- │ hypertension_dx         │ EXISTS    │ BOOLEAN — already in schema              │
-- │ on_bp_meds              │ EXISTS    │ BOOLEAN — already in schema              │
-- │ on_statins              │ EXISTS    │ BOOLEAN — already in schema              │
-- │ on_diabetes_meds        │ EXISTS    │ BOOLEAN — already in schema              │
-- ├─────────────────────────┼───────────┼──────────────────────────────────────────┤
-- │ hs_crp_available        │ CREATING  │ Gates PhenoAge + I1/I3 interactions       │
-- │ vo2_source              │ CREATING  │ 'oura' | 'whoop' | 'manual' | 'estimated'│
-- │ vo2_manual              │ CREATING  │ ml/kg/min if manually entered             │
-- │ antibiotics_last_60d    │ CREATING  │ Invalidates OMA if true                  │
-- │ antibiotics_last_90d    │ CREATING  │ Extended flag for fluoroquinolones        │
-- │ medications             │ CREATING  │ Free text array for AI context           │
-- │ eosinophil_history      │ CREATING  │ Eosinophilic CRS context                 │
-- │ oma_qc_pass             │ CREATING  │ Computed — false if antibiotics_last_60d  │
-- │ hs_crp_qc_pass          │ CREATING  │ Computed — false if standard CRP only    │
-- └─────────────────────────┴───────────┴──────────────────────────────────────────┘
--
-- 13 columns already exist. 9 columns created below.

ALTER TABLE lifestyle_records ADD COLUMN IF NOT EXISTS hs_crp_available BOOLEAN DEFAULT false;
ALTER TABLE lifestyle_records ADD COLUMN IF NOT EXISTS vo2_source TEXT;
ALTER TABLE lifestyle_records ADD COLUMN IF NOT EXISTS vo2_manual DECIMAL(5,1);
ALTER TABLE lifestyle_records ADD COLUMN IF NOT EXISTS antibiotics_last_60d BOOLEAN DEFAULT false;
ALTER TABLE lifestyle_records ADD COLUMN IF NOT EXISTS antibiotics_last_90d BOOLEAN DEFAULT false;
ALTER TABLE lifestyle_records ADD COLUMN IF NOT EXISTS medications TEXT[];
ALTER TABLE lifestyle_records ADD COLUMN IF NOT EXISTS eosinophil_history BOOLEAN DEFAULT false;
ALTER TABLE lifestyle_records ADD COLUMN IF NOT EXISTS oma_qc_pass BOOLEAN;
ALTER TABLE lifestyle_records ADD COLUMN IF NOT EXISTS hs_crp_qc_pass BOOLEAN;

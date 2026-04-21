# Database Field Usage Audit

**Date:** April 21, 2026
**Tables audited:** lifestyle_records (68 cols), oral_kit_orders (98 cols), lab_results (66 cols)

## Summary

- **43 fully orphaned columns** (no writer, no reader)
- **9 read-only columns** (read by scoring but never written by any form)
- **7 write-only columns** (written but nothing reads them)
- **3 notable bugs** found

## Fully Orphaned (safe to drop in cleanup migration)

### lifestyle_records (5)
- `medication_ppi`, `medication_antihistamine_chronic`, `medication_ssri`, `medication_corticosteroid`, `medication_immunosuppressant`

### lab_results (2)
- `insight_citations`, `insight_tone`

### oral_kit_orders (36)
- Tracking: `tracking_number`, `zymo_report_id`
- Collection metadata (never wired to UI): `collection_time`, `hours_sleep_prior_night`, `collection_method`, `collection_duration_seconds`, `fasting_hours`, `hydration_status`, `eligibility_passed`, `eligibility_assessed_at`
- Illness/medication snapshot (pre-collection form never built): `illness_oral_infection`, `illness_other_acute`, `antibiotic_name`, `antifungal_last_4w`, `dental_procedure_type`, `alcohol_units_prior_24h`, `mouthwash_prior_12h`, `mouthwash_type`, `menstrual_phase`
- Medication duplicates (exist on lifestyle_records already): `medication_ppi`, `medication_antihistamine`, `medication_betablocker`, `medication_ssri`, `medication_corticosteroid`, `medication_immunosuppressant`, `medication_other_relevant`
- Appliance/device (never wired): `night_guard_current`, `night_guard_type`, `orthodontic_appliance`, `orthodontic_type`
- Diet/lifestyle duplicates: `dietary_nitrate_daily`, `dietary_nitrate_frequency`, `smoking_status_current`, `alcohol_frequency_general`
- Trend tracking (never implemented): `prior_kit_id`, `days_since_prior_collection`, `env_ratio_delta`, `intervention_since_prior`, `convergence_signals`
- Unused scores: `score_metabolic_oral`, `score_gerd_oral`
- Unused flags: `whitening_toothpaste_daily`, `peroxide_mouthwash_daily`, `env_chlorhexidine_flag`

## Read-Only (read by scoring but never written)

### lifestyle_records (1)
- `family_history_hypertension` — recalculate.ts reads it but no form writes it

### oral_kit_orders (8)
- Pre-collection compliance fields read by `computeInterpretabilityTier`: `illness_upper_respiratory`, `illness_fever_7d`, `illness_gi_3d`, `antibiotics_last_4w`, `dental_cleaning_last_2w`, `dental_procedure_last_4w`, `alcohol_prior_24h`
- Whitening fields read by peroxide flag logic: `whitening_tray_last_48h`, `whitening_strips_last_48h`, `professional_whitening_last_7d`

**Action needed:** These fields affect scoring but have no UI to set them. Either add a pre-collection form or hardcode defaults.

## Write-Only (written but never consumed)

### lifestyle_records (4)
- `medications` (free-text array), `tongue_scraping_freq`, `nitrate_sources`, `wearable_worn_during_sleep`, `wearable_sleep_position_tracking`

### lab_results (3)
- `thyroglobulin_ngml`, `cea_ngml`, `ca199_uml` (written by labs/save, never displayed or scored)

### oral_kit_orders (1)
- `findings_snapshot` (written by oral-regen, never displayed)

## Notable Bugs

1. **`total_protein_gdl` key mismatch** — labs/save writes `total_protein_gdl` but blood-panel-client reads `totalprotein_gdl` (missing underscore). Always shows null in UI.

2. **`ldl_hdl_ratio` never computed** — displayed in blood panel zone ranges but no code writes/computes this value. Always null.

3. **`on_diabetes_meds` no form input** — only written via `/api/lifestyle/save` API, not exposed in any form. Users cannot set it.

## Medication Fields Assessment

| Field | On Table | Written By | Read By | Status |
|-------|----------|-----------|---------|--------|
| medications (array) | lifestyle_records | lifestyle-form (free text) | Nothing | Write-only |
| medication_ppi | lifestyle_records | Nothing | Nothing | Orphaned |
| medication_antihistamine_chronic | lifestyle_records | Nothing | Nothing | Orphaned |
| medication_ssri | lifestyle_records | Nothing | Nothing | Orphaned |
| medication_corticosteroid | lifestyle_records | Nothing | Nothing | Orphaned |
| medication_immunosuppressant | lifestyle_records | Nothing | Nothing | Orphaned |
| on_bp_meds | lifestyle_records | lifestyle-form | recalculate.ts | Active |
| on_statins | lifestyle_records | lifestyle-form | recalculate.ts | Active |
| on_diabetes_meds | lifestyle_records | API only (no form) | recalculate.ts | Active but no UI |
| sleep_medication | lifestyle_records | lifestyle-form (hardcoded "never") | oral narrative | Active (trivially) |

**Recommendation:** The 5 granular medication booleans were added for the oral narrative medication modifiers but never wired. PR 2 should surface `medication_ppi` in the questionnaire. The others can be wired later as the narrative engine evolves.

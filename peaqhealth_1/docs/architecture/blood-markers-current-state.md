# Blood Markers — Current State

**Generated:** 2026-04-30 (read-only diagnostic; no code/schema/data modified)
**Scope:** Every layer that touches a numeric blood-panel marker, end-to-end. Snapshots what is wired today so the next round of work has ground truth.
**Source of truth:** Live Supabase `information_schema` (project `xdkppgqtglvviuxgqavh`), and the in-tree files cited below.

This document describes **state, not desired state.** Drift and gaps are surfaced in §7 — the prescription is out of scope.

---

## 1. Database schema

Three tables hold blood-marker numerics. A fourth (`score_snapshots`) holds derived blood signals but no per-marker columns.

### 1a. `lab_results` — current/active panel (one row per user, upserted)

Single source of truth for the latest parsed lab. `parser_status` gates reads (`= 'complete'`). Locked rows freeze further mutations. **70 numeric marker columns.**

| Group | Columns |
|---|---|
| Lipids | `ldl_mgdl`, `hdl_mgdl`, `triglycerides_mgdl`, `total_cholesterol_mgdl`, `non_hdl_mgdl`, `vldl_mgdl`, `apob_mgdl`, `lpa_mgdl`, `ldl_hdl_ratio` |
| Inflammation | `hs_crp_mgl`, `esr_mmhr`, `homocysteine_umoll` |
| Metabolic | `glucose_mgdl`, `hba1c_pct`, `fasting_insulin_uiuml`, `uric_acid_mgdl` |
| Kidney | `creatinine_mgdl`, `egfr_mlmin`, `bun_mgdl` |
| Liver | `alt_ul`, `ast_ul`, `alk_phos_ul`, `total_bilirubin_mgdl`, `albumin_gdl`, `globulin_gdl`, `total_protein_gdl` |
| Electrolytes | `sodium_mmoll`, `potassium_mmoll`, `chloride_mmoll`, `co2_mmoll`, `calcium_mgdl` |
| CBC | `wbc_kul`, `hemoglobin_gdl`, `hematocrit_pct`, `rdw_pct`, `mcv_fl`, `mch_pg`, `mchc_gdl`, `platelets_kul`, `rbc_mil`, `neutrophils_pct`, `lymphs_pct` |
| Hormones | `testosterone_ngdl`, `free_testo_pgml`, `shbg_nmoll`, `dhea_s_ugdl`, `igf1_ngml`, `cortisol_ugdl` |
| Thyroid | `tsh_uiuml`, `free_t4_ngdl`, `free_t3_pgml`, `thyroglobulin_ngml`, `tpo_antibodies_iuml` |
| Nutrients | `vitamin_d_ngml`, `ferritin_ngml`, `vitamin_b12_pgml`, `folate_ngml` |
| Tumor markers | `psa_ngml`, `cea_ngml`, `ca199_uml` |
| Metadata | `id`, `user_id`, `source`, `lab_name`, `collection_date`, `uploaded_at`, `junction_parser_job_id`, `parser_status`, `raw_pdf_storage_path`, `is_locked`, `lock_expires_at`, `version`, `insight_citations`, `insight_tone` |

Naming convention: snake_case with the unit baked in (`hs_crp_mgl` = hs-CRP in mg/L). All numerics; nullable.

### 1b. `lab_history` — append-only history (locked snapshots)

Strict subset of `lab_results`. **27 numeric marker columns** plus snapshot metadata (`lock_type`, `locked_at`, `total_score`, `blood_score`, `peaq_percent`).

Columns present:
`ldl_mgdl, hdl_mgdl, triglycerides_mgdl, hs_crp_mgl, hba1c_pct, glucose_mgdl, vitamin_d_ngml, apob_mgdl, lpa_mgdl, egfr_mlmin, alt_ul, ast_ul, wbc_kul, hemoglobin_gdl, rdw_pct, albumin_gdl, bun_mgdl, alk_phos_ul, total_bilirubin_mgdl, sodium_mmoll, potassium_mmoll, total_cholesterol_mgdl, non_hdl_mgdl, testosterone_ngdl, free_testo_pgml, shbg_nmoll, ferritin_ngml, tsh_uiuml`

Columns from `lab_results` that **do NOT** carry into history:
ESR, homocysteine, fasting insulin, uric acid, creatinine, AST*, T3/T4, free T4, thyroglobulin, TPO, all electrolytes (Cl, CO₂, Ca), all CBC except hemoglobin/RDW/WBC/platelets-not-included, MCV, MCH, MCHC, RBC, neutrophils %, lymphs %, globulin, total protein, hematocrit, ldl_hdl_ratio, vldl, vitamin B12, folate, DHEA-S, IGF-1, cortisol, free testo (wait — present), PSA, CEA, CA-199, hematocrit, platelets, mcv_fl. (\*AST is missing from history but present in results — included above intentionally as drift evidence.)

Implication: history view is materially narrower than current view.

### 1c. `score_snapshots` — derived/aggregate, no per-marker columns

Blood-related fields only:
- `blood_sub` (numeric sub-score)
- `lpa_flag` (text, e.g. high/elevated)
- `hscrp_retest_flag` (boolean)
- `blood_recency_multiplier` (numeric; decays the contribution of stale labs)
- `lab_freshness` (text)
- `lab_result_id` (FK to `lab_results`)

No raw marker values. Read consumers needing the actual numbers join through `lab_result_id`.

### 1d. Other tables

`oral_kit_orders`, `lifestyle_records`, `sleep_data` — not blood-marker carriers; mentioned only because [/dashboard/blood/[marker]/page.tsx](apps/web/app/dashboard/blood/[marker]/page.tsx) joins them in for cross-panel context.

---

## 2. TypeScript types

Three different naming namespaces are in active use. Each is documented here.

### 2a. `BloodPanelData` — UI/converge consumer view

[apps/web/lib/user-context.ts:113-127](apps/web/lib/user-context.ts#L113-L127). camelCase, no units in field names. **25 markers.**

```
ldl, hdl, triglycerides, totalCholesterol
hsCrp, hba1c, glucose
wbc, hemoglobin, hematocrit
tsh, freeT4
egfr, creatinine, bun
alt, ast, albumin
vitaminD, ferritin, vitaminB12
sodium, potassium
platelets, rdw
```

Mapping happens in [user-context.ts:266-285](apps/web/lib/user-context.ts#L266-L285): reads `lab_results` snake_case columns, normalizes via `n()`, stuffs into camelCase keys.

This is the type passed into `ctx.bloodPanel` — every `lib/converge/*` and `lib/interventions/*` consumer sees the **25-field** subset, not the full 70.

### 2b. `BloodMarkers` — upload/save wire format

[apps/web/app/components/lab-upload.tsx:8](apps/web/app/components/lab-upload.tsx#L8). camelCase **with unit suffixes** (`hsCRP_mgL`, `ldl_mgdL`, `egfr_mLmin`). **~50 markers.** This is what the parser route returns and what `/api/labs/save` accepts as input.

### 2c. score-engine `BloodInputs`

[packages/score-engine/src/engine.ts:110](packages/score-engine/src/engine.ts#L110). Same casing as `BloodMarkers` (e.g. `hsCRP_mgL`, `apoB_mgdL`, `vitaminD_ngmL`, `eGFR_mLmin`). One drift point: WBC is named `wbc_x10L` in the engine (`engine.ts:757`) but the wire/DB form is `wbc_kul`. Translation lives in [recalculate.ts](apps/web/lib/score/recalculate.ts).

### 2d. `MarkerDef` (rich) and `MARKERS` (basic) — UI registries

- [apps/web/lib/markers/definitions.ts](apps/web/lib/markers/definitions.ts) — `MARKER_DEFINITIONS` with keys like `hs_crp`, `ldl`, `vitamin_d`, `hba1c`, `hdl`, `triglycerides`, `lpa`, `glucose`, `wbc`, `rdw`, `mpv`. Each has a `db_column: string` field that points back to `lab_results`. **11 entries cover blood; rest are sleep/oral.**
- [apps/web/lib/blood/marker-content.ts](apps/web/lib/blood/marker-content.ts) — `MARKERS` keyed by full DB column name (`ldl_mgdl`, `hs_crp_mgl`, etc.). **33 entries.** Used as the basic fallback when `MARKER_DEFINITIONS` lacks a key.

Both registries are read together by [/dashboard/blood/[marker]/page.tsx:11-13](apps/web/app/dashboard/blood/[marker]/page.tsx#L11-L13).

---

## 3. UI routes & components

### 3a. `/dashboard/blood`

- [page.tsx](apps/web/app/dashboard/blood/page.tsx): server component, fetches `lab_results` (most recent, `parser_status='complete'`), passes raw snake_case row to `BloodPanelClient`.
- [blood-panel-rebuild.tsx](apps/web/app/dashboard/blood/blood-panel-rebuild.tsx) — primary client. (Older `blood-panel-client.tsx` is also present; both files coexist in the directory.)
- Renders categories from `BLOOD_CATEGORIES` ([categories.ts](apps/web/lib/blood/categories.ts)) — 8 panels: heart, metabolic, kidney, liver, cbc, immune, nutrients, thyroid.

### 3b. `/dashboard/blood/[marker]`

- [page.tsx:11-13](apps/web/app/dashboard/blood/[marker]/page.tsx#L11-L13): validates marker against **either** `MARKER_DEFINITIONS` (rich) or `MARKERS` (basic). 404s only if both miss. Uses `richDef.db_column` to read the marker; if missing, falls back to the slug as the column name.
- [marker-client.tsx](apps/web/app/dashboard/blood/[marker]/marker-client.tsx): tabbed view (Why / Foods / Supplements / Learn), trend chart, threshold bands, connection lines from `evaluateConnection`.
- [page.tsx:48-50](apps/web/app/dashboard/blood/[marker]/page.tsx#L48-L50): also fetches up to 5 historical `lab_results` rows for the trend chart — note it queries `lab_results` not `lab_history`, so chart depth is bounded by however many `lab_results` rows exist (today: at most one per user, since `save/route.ts` upserts on `user_id`).

### 3c. Cross-panel readers (consume `bloodPanel`, not the raw row)

- `lib/converge/observations.ts` — uses `ctx.bloodPanel.ldl`, `.hsCrp`, `.hdl`, etc.
- `lib/interventions/registry.ts:250` — `b(ctx)!.hsCrp`.
- `lib/narrative/situationModel.ts:111,179` — gates on `ctx.hasBloodPanel`.

These all see only the **25-field** `BloodPanelData` view.

---

## 4. Scoring modules

### 4a. `recalculate.ts` — DB → engine adapter

[apps/web/lib/score/recalculate.ts:112-120](apps/web/lib/score/recalculate.ts#L112-L120). Reads snake_case `lab_results` row, builds engine input in `BloodMarkers`-style camelCase. Engine sees: `hsCRP_mgL`, `apoB_mgdL`, `ldl_mgdL`, `hba1c_pct`, plus more.

Same file at line 593 reads `ctx.labRow.ldl_mgdl` directly (snake_case) for an LDL gate — and at line 610 builds an LLM prompt directly from snake_case row keys. Both bypass the camelCase adapter.

### 4b. score-engine `engine.ts`

- [engine.ts:614](packages/score-engine/src/engine.ts#L614) — HbA1c sub-score weighting.
- [engine.ts:757](packages/score-engine/src/engine.ts#L757) — "core blood markers" array: `apoB, ldl, hdl, triglycerides, hsCRP, hba1c, glucose, vitaminD, eGFR, alt, ast, wbc, rdw, albumin, hemoglobin`. **15 markers.** Used for completeness scoring.
- [engine.ts:790-793](packages/score-engine/src/engine.ts#L790-L793) — glycemic band from `glucose_mgdL` + `hba1c_pct`.

### 4c. `buildConnectionInput.ts`

[buildConnectionInput.ts:65-67](apps/web/lib/score/buildConnectionInput.ts#L65-L67) — converts a snake_case `lab_results` row to the `evaluateConnection` input. Maps `ldl_mgdl → ldl`, `hs_crp_mgl → hs_crp`, `hba1c_pct → hba1c`. Note the destination uses **snake_case without units** — a fourth namespace for the connection-rule input.

### 4d. `generateBloodInsight` (insight LLM)

[save/route.ts:12-152](apps/web/app/api/labs/save/route.ts#L12-L152). Reads snake_case `lab_results` row directly (no adapter). Whitelists 14 markers for the prompt: LDL, HDL, TG, hsCRP, glucose, HbA1c, vitamin D, ApoB, eGFR, ALT, WBC, albumin, hemoglobin, Lp(a). Note Lp(a) is reported in nmol/L by multiplying mg/dL × 2.5 — inverse of the parser's nmol→mg/dL conversion at [upload/route.ts:325](apps/web/app/api/labs/upload/route.ts#L325).

---

## 5. Parser output shape

### 5a. Pipeline ([upload/route.ts](apps/web/app/api/labs/upload/route.ts))

1. **`unpdf`** extracts PDF text in-memory ([:282-295](apps/web/app/api/labs/upload/route.ts#L282-L295)). Original PDF buffer is **not persisted** anywhere.
2. **OpenAI gpt-4.1-mini** parses text→JSON ([:297-460](apps/web/app/api/labs/upload/route.ts#L297-L460)). HIPAA BAA + ZDR. Temperature 0.1, max_tokens 4096, 25 s abort. Prompt enumerates ~50 marker fields with exact unit-suffixed keys.
3. If `unpdf` yields no text (scanned PDF): **OpenAI Vision** (renders pages → PNG via `unpdf.renderPageAsImage`) extracts text, then back through the OpenAI parser.
4. If Vision fails: **Azure Document Intelligence** as legacy OCR fallback ([:531-535](apps/web/app/api/labs/upload/route.ts#L531-L535)).
5. If all of the above produce empty markers: **regex fallback** (`parseWithRegexFallback`) as last resort.
6. `extractFromParsedJson` ([:464-494](apps/web/app/api/labs/upload/route.ts#L464-L494)) keeps any field where the value is a positive number, drops zeros and negatives. Computes `ldlHdlRatio` from `ldl_mgdL / hdl_mgdL` if both present.
7. Multi-file uploads: merge by most-recent `collectionDate`, with per-marker source tracking ([:641-687](apps/web/app/api/labs/upload/route.ts#L641-L687)).

### 5b. Output JSON schema (camelCase + units)

The exact keys the LLM is instructed to return ([:363-425](apps/web/app/api/labs/upload/route.ts#L363-L425)):

`ldl_mgdL, hdl_mgdL, triglycerides_mgdL, totalCholesterol_mgdL, nonHDL_mgdL, vldl_mgdL, hsCRP_mgL, hba1c_pct, glucose_mgdL, fastingInsulin_uIUmL, vitaminD_ngmL, apoB_mgdL, lpa_mgdL, homocysteine_umolL, uricAcid_mgdL, creatinine_mgdL, egfr_mLmin, bun_mgdL, alt_UL, ast_UL, alkPhos_UL, totalBilirubin_mgdL, albumin_gdL, globulin_gdL, totalProtein_gdL, sodium_mmolL, potassium_mmolL, calcium_mgdL, chloride_mmolL, co2_mmolL, wbc_kul, hemoglobin_gdL, hematocrit_pct, rdw_pct, mcv_fL, mch_pg, mchc_gdl, platelets_kul, rbc_mil, neutrophils_pct, lymphs_pct, ferritin_ngmL, testosterone_ngdL, freeTesto_pgmL, shbg_nmolL, tsh_uIUmL, free_t4_ngdL, free_t3_pgmL, dhea_s_ugdL, igf1_ngmL, cortisol_ugdL, vitaminB12_pgmL, folate_ngmL, psa_ngmL, cea_ngmL, ca199_UmL, thyroglobulin_ngmL, tpoAntibodies_iuML`

Plus `collectionDate`, `labName`. **58 marker keys** in the parser schema.

### 5c. Save mapping ([save/route.ts:215-288](apps/web/app/api/labs/save/route.ts#L215-L288))

Translates each parser-camelCase field → DB snake_case column. Direct field-by-field map — no shared lookup table.

---

## 6. Four-way comparison

For each marker: ✓ = present, ✗ = missing, "—" = N/A. "Scored" = referenced in score-engine or `recalculate.ts` for sub-score computation. "Connection" = referenced as input to `evaluateConnection`/`buildConnectionInput`.

| Marker | DB column (`lab_results`) | Parser key | `BloodPanelData` | UI route reachable | Scored | Connection input |
|---|---|---|---|---|---|---|
| LDL | `ldl_mgdl` | `ldl_mgdL` | `ldl` ✓ | ✓ (`ldl` rich) | ✓ | ✓ |
| HDL | `hdl_mgdl` | `hdl_mgdL` | `hdl` ✓ | ✓ (`hdl` rich) | ✓ | ✓ |
| Triglycerides | `triglycerides_mgdl` | `triglycerides_mgdL` | `triglycerides` ✓ | ✓ (`triglycerides` rich) | ✓ | — |
| Total cholesterol | `total_cholesterol_mgdl` | `totalCholesterol_mgdL` | `totalCholesterol` ✓ | ✓ (basic) | ✗ | — |
| Non-HDL | `non_hdl_mgdl` | `nonHDL_mgdL` | ✗ | ✗ | ✗ | — |
| VLDL | `vldl_mgdl` | `vldl_mgdL` | ✗ | ✗ | ✗ | — |
| ApoB | `apob_mgdl` | `apoB_mgdL` | ✗ | ✓ (basic, generic) | ✓ | — |
| Lp(a) | `lpa_mgdl` | `lpa_mgdL` | ✗ | ✓ (`lpa` rich) | ✓ (flag) | — |
| LDL/HDL ratio | `ldl_hdl_ratio` | (computed) `ldlHdlRatio` | ✗ | ✗ | ✗ | — |
| hs-CRP | `hs_crp_mgl` | `hsCRP_mgL` | `hsCrp` ✓ | ✓ (`hs_crp` rich) | ✓ (retest flag) | ✓ |
| ESR | `esr_mmhr` | ✗ (not in prompt) | ✗ | ✗ | ✗ | — |
| Homocysteine | `homocysteine_umoll` | `homocysteine_umolL` | ✗ | ✓ (basic, generic) | ✗ | — |
| Glucose | `glucose_mgdl` | `glucose_mgdL` | `glucose` ✓ | ✓ (`glucose` rich) | ✓ (glycemic band) | — |
| HbA1c | `hba1c_pct` | `hba1c_pct` | `hba1c` ✓ | ✓ (`hba1c` rich) | ✓ (glycemic band) | ✓ |
| Fasting insulin | `fasting_insulin_uiuml` | `fastingInsulin_uIUmL` | ✗ | ✓ (basic, generic) | ✗ | — |
| Uric acid | `uric_acid_mgdl` | `uricAcid_mgdL` | ✗ | ✓ (basic, generic) | ✗ | — |
| eGFR | `egfr_mlmin` | `egfr_mLmin` | `egfr` ✓ | ✓ (basic) | ✓ (completeness) | — |
| Creatinine | `creatinine_mgdl` | `creatinine_mgdL` | `creatinine` ✓ | ✓ (basic) | ✗ | — |
| BUN | `bun_mgdl` | `bun_mgdL` | `bun` ✓ | ✓ (basic) | ✗ | — |
| Sodium | `sodium_mmoll` | `sodium_mmolL` | `sodium` ✓ | ✓ (basic, generic) | ✗ | — |
| Potassium | `potassium_mmoll` | `potassium_mmolL` | `potassium` ✓ | ✓ (basic, generic) | ✗ | — |
| Chloride | `chloride_mmoll` | `chloride_mmolL` | ✗ | ✗ | ✗ | — |
| CO₂ | `co2_mmoll` | `co2_mmolL` | ✗ | ✗ | ✗ | — |
| Calcium | `calcium_mgdl` | `calcium_mgdL` | ✗ | ✗ | ✗ | — |
| ALT | `alt_ul` | `alt_UL` | `alt` ✓ | ✓ (basic) | ✓ (completeness) | — |
| AST | `ast_ul` | `ast_UL` | `ast` ✓ | ✓ (basic) | ✓ (completeness) | — |
| Alk Phos | `alk_phos_ul` | `alkPhos_UL` | ✗ | ✓ (basic, generic) | ✗ | — |
| Total bilirubin | `total_bilirubin_mgdl` | `totalBilirubin_mgdL` | ✗ | ✓ (basic, generic) | ✗ | — |
| Albumin | `albumin_gdl` | `albumin_gdL` | `albumin` ✓ | ✓ (basic, generic) | ✓ (completeness) | — |
| Globulin | `globulin_gdl` | `globulin_gdL` | ✗ | ✗ | ✗ | — |
| Total protein | `total_protein_gdl` | `totalProtein_gdL` | ✗ | ✗ | ✗ | — |
| WBC | `wbc_kul` | `wbc_kul` | `wbc` ✓ | ✓ (`wbc` rich) | ✓ (`wbc_x10L` in engine) | — |
| Hemoglobin | `hemoglobin_gdl` | `hemoglobin_gdL` | `hemoglobin` ✓ | ✓ (basic) | ✓ (completeness) | — |
| Hematocrit | `hematocrit_pct` | `hematocrit_pct` | `hematocrit` ✓ | ✓ (basic, generic) | ✗ | — |
| RDW | `rdw_pct` | `rdw_pct` | `rdw` ✓ | ✓ (`rdw` rich) | ✓ (completeness) | — |
| MCV | `mcv_fl` | `mcv_fL` | ✗ | ✓ (basic, generic) | ✗ | — |
| MCH | `mch_pg` | `mch_pg` | ✗ | ✗ | ✗ | — |
| MCHC | `mchc_gdl` | `mchc_gdl` | ✗ | ✗ | ✗ | — |
| RBC | `rbc_mil` | `rbc_mil` | ✗ | ✗ | ✗ | — |
| Neutrophils % | `neutrophils_pct` | `neutrophils_pct` | ✗ | ✗ | ✗ | — |
| Lymphs % | `lymphs_pct` | `lymphs_pct` | ✗ | ✗ | ✗ | — |
| Platelets | `platelets_kul` | `platelets_kul` | `platelets` ✓ | ✗ | ✗ | — |
| **MPV** | ✗ (no DB column) | ✗ (no parser key) | ✗ | ✓ rich def `mpv` (broken) | ✗ | — |
| TSH | `tsh_uiuml` | `tsh_uIUmL` | `tsh` ✓ | ✓ (`tsh_uiuml` basic) | ✗ | — |
| Free T4 | `free_t4_ngdl` | `free_t4_ngdL` | `freeT4` ✓ | ✓ (basic, generic) | ✗ | — |
| Free T3 | `free_t3_pgml` | `free_t3_pgmL` | ✗ | ✗ | ✗ | — |
| Thyroglobulin | `thyroglobulin_ngml` | `thyroglobulin_ngmL` | ✗ | ✗ | ✗ | — |
| TPO Ab | `tpo_antibodies_iuml` | `tpoAntibodies_iuML` | ✗ | ✗ | ✗ | — |
| Testosterone | `testosterone_ngdl` | `testosterone_ngdL` | ✗ | ✗ | ✗ | — |
| Free testosterone | `free_testo_pgml` | `freeTesto_pgmL` | ✗ | ✗ | ✗ | — |
| SHBG | `shbg_nmoll` | `shbg_nmolL` | ✗ | ✗ | ✗ | — |
| DHEA-S | `dhea_s_ugdl` | `dhea_s_ugdL` | ✗ | ✗ | ✗ | — |
| IGF-1 | `igf1_ngml` | `igf1_ngmL` | ✗ | ✗ | ✗ | — |
| Cortisol | `cortisol_ugdl` | `cortisol_ugdL` | ✗ | ✗ | ✗ | — |
| Vitamin D | `vitamin_d_ngml` | `vitaminD_ngmL` | `vitaminD` ✓ | ✓ (`vitamin_d` rich) | ✓ (completeness) | — |
| Ferritin | `ferritin_ngml` | `ferritin_ngmL` | `ferritin` ✓ | ✓ (basic, generic) | ✗ | — |
| Vitamin B12 | `vitamin_b12_pgml` | `vitaminB12_pgmL` | `vitaminB12` ✓ | ✓ (basic, generic) | ✗ | — |
| Folate | `folate_ngml` | `folate_ngmL` | ✗ | ✗ | ✗ | — |
| PSA | `psa_ngml` | `psa_ngmL` | ✗ | ✗ | ✗ | — |
| CEA | `cea_ngml` | `cea_ngmL` | ✗ | ✗ | ✗ | — |
| CA-199 | `ca199_uml` | `ca199_UmL` | ✗ | ✗ | ✗ | — |

**Counts.** DB: 70 marker columns. Parser: 58 fields. `BloodPanelData`: 25 fields. UI rich definitions: 11 (10 valid + `mpv` broken). UI basic generics: 33. Score-engine "core": 15. Connection inputs: 4 (`ldl, hs_crp, hba1c, hdl`).

---

## 7. Gaps and drift

Findings only — no fixes prescribed.

### 7.1 Four naming namespaces, no shared lookup

The same marker is named four different ways across the system:
| Layer | Form | Example |
|---|---|---|
| DB | `snake_case_unit` | `hs_crp_mgl` |
| Parser/wire | `camelCase_Unit` | `hsCRP_mgL` |
| UI consumer (`BloodPanelData`) | `camelCase` | `hsCrp` |
| Connection input | `snake_case` (no unit) | `hs_crp` |

Translation tables live inline at four sites: [save/route.ts:217-288](apps/web/app/api/labs/save/route.ts#L217-L288) (parser→DB), [user-context.ts:266-285](apps/web/lib/user-context.ts#L266-L285) (DB→`BloodPanelData`), [recalculate.ts:108-130](apps/web/lib/score/recalculate.ts#L108-L130) (DB→engine), [buildConnectionInput.ts:62-72](apps/web/lib/score/buildConnectionInput.ts#L62-L72) (DB→connection). Every new marker requires updating all four. There is no canonical registry that maps them.

### 7.2 Broken rich definition: `mpv`

[markers/definitions.ts:394](apps/web/lib/markers/definitions.ts#L394) declares `db_column: 'mpv_fl'`, but **no `mpv_fl` column exists** on `lab_results` (the actual CBC column is `mcv_fl` for Mean Corpuscular Volume). Visiting `/dashboard/blood/mpv` resolves the rich def, reads `lab[mpv_fl]` which is undefined, and silently renders the "missing state" instead of failing loud. No incident has been filed for this; it surfaces only when a user browses to a marker route that the rich registry advertises but the DB cannot supply.

### 7.3 Computed values dropped on save

The parser computes `ldlHdlRatio` in `extractFromParsedJson` ([upload/route.ts:489-491](apps/web/app/api/labs/upload/route.ts#L489-L491)) and the DB has a `lab_results.ldl_hdl_ratio` column — but `save/route.ts` never writes it. The computed value reaches the parser response and dies there.

### 7.4 ESR has a column but no parser key

`lab_results.esr_mmhr` exists but is absent from the OpenAI prompt schema and from the save mapping. Currently uploadable only by direct DB write.

### 7.5 `BloodPanelData` is a hard ceiling at 25 markers

Anything outside the 25 fields (testosterone, free testo, SHBG, DHEA-S, IGF-1, cortisol, all tumor markers, free T3, thyroglobulin, TPO Ab, MCV, MCH, MCHC, RBC, neutrophils %, lymphs %, globulin, total protein, all electrolytes except Na/K, non-HDL, VLDL, ApoB, Lp(a), homocysteine, fasting insulin, uric acid, alk phos, total bilirubin, folate, ESR) is **invisible to all converge/intervention/narrative logic** even when the parser successfully extracted it and the DB has the column populated. They show up in `/dashboard/blood/[marker]` (basic generic) but contribute nothing to scores or cross-panel observations.

The user-context layer is therefore the bottleneck — adding a marker to DB + parser + save is necessary but **not sufficient** for the value to influence any cross-panel signal.

### 7.6 `lab_history` is materially narrower than `lab_results`

27 marker columns vs. 70. Markers persisted to `lab_history` on lock include the popular ones (LDL/HDL/TG/hsCRP/HbA1c/glucose/vitamin D/ApoB/Lp(a)/eGFR/ALT/AST/WBC/hemoglobin/RDW/albumin/BUN/alk phos/total bilirubin/Na/K/total chol/non-HDL/testosterone/free testo/SHBG/ferritin/TSH) but exclude all electrolytes-other-than-Na/K, all CBC differentials, all hormones except testosterone family + TSH, all tumor markers, free T3/T4, MCV/MCH/MCHC/RBC/platelets/hematocrit, ESR, homocysteine, fasting insulin, uric acid, creatinine. Trend chart on `/dashboard/blood/[marker]` reads from `lab_results` not `lab_history`, so the narrow history schema mostly does not bite the UI today — but any future "show me my LDL over 5 years" feature would inherit the gap.

### 7.7 No `parser_used` column on `lab_results`

Called out in [docs/incidents/2026-05-01-function-health-14-bug.md § 5(4)](docs/incidents/2026-05-01-function-health-14-bug.md). The route returns `parserUsed` in the API response but the column isn't persisted, so post-incident forensics ("which parser produced this row?") require re-uploading the original PDF — which itself isn't stored either.

### 7.8 No raw-PDF retention

`upload/route.ts:282-295` runs `unpdf` against an in-memory buffer; the buffer is discarded once parsing completes. No bucket, no encrypted storage. `lab_results.raw_pdf_storage_path` exists in the schema but no code path writes it. Reproducing a parser failure requires a user round-trip.

### 7.9 `lab_results` upserts on `user_id` — single row per user

[save/route.ts:288](apps/web/app/api/labs/save/route.ts#L288): `onConflict: "user_id"`. So a user can only have **one** active `lab_results` row at a time; a new upload mutates the existing row in place (after a `version` bump if locked). The 5-row trend chart in `/dashboard/blood/[marker]/page.tsx` thus realistically shows one point until the lock-and-history flow has fired multiple times, and even then only via `lab_history` → which it doesn't read. Effectively the trend chart is dead UI for almost all users today.

### 7.10 Two competing blood panel components

`apps/web/app/dashboard/blood/blood-panel-client.tsx` and `apps/web/app/dashboard/blood/blood-panel-rebuild.tsx` both exist. `page.tsx` imports the rebuild. The legacy client's status (deprecated, kept for rollback, in-progress migration) is not annotated in the file headers.

### 7.11 Unit conversion duplication

Lp(a) mg/dL ↔ nmol/L conversion appears in two places:
- Parser: [upload/route.ts:325](apps/web/app/api/labs/upload/route.ts#L325) — divides nmol/L by 2.5 on input.
- Insight prompt: [save/route.ts:33](apps/web/app/api/labs/save/route.ts#L33) — multiplies mg/dL by 2.5 on output to display nmol/L.

The factor 2.5 is a reasonable population average but not patient-specific (true molar mass varies by isoform). No shared helper.

---

## 8. Function Health "14-bug" cross-reference

Full incident: [docs/incidents/2026-05-01-function-health-14-bug.md](docs/incidents/2026-05-01-function-health-14-bug.md).

**What happened.** A Function Health PDF (analyzing partner: Quest Diagnostics) was uploaded by user `5614b84a-34dd-428f-981a-4811158dbaa2` on 2026-03-22. The parser extracted **31 marker fields, every one with the value `14.0`**. The save route persisted all 31. Score recalculation ran on the corrupted inputs. 48 `score_snapshots` rows were generated off the bad lab between 2026-03-28 and 2026-05-01.

**Root cause.** Function Health's consumer-facing PDF layout doesn't match the LabCorp/Quest "patient result on next line" convention the upload route is built around. `unpdf` flattening surfaced a recurring artifact (likely a "14 markers out of range" cover-page summary or a recency badge) on the line immediately after every test name. Both the OpenAI parser (instructed to take "the line immediately after a test name") and the regex fallback faithfully extracted the artifact for every marker.

**What this audit confirms.**
- The bug was caught at the **save layer** by `detectUniformValueArtifact` ([save/route.ts:189-198](apps/web/app/api/labs/save/route.ts#L189-L198)), not at the parser layer. Parser still emits whatever JSON the LLM returns.
- The corrupted row populated **every column the parser knows about** (~31). The 70-column `lab_results` table has many columns the parser never targets (ESR, free T3, thyroglobulin, TPO Ab, all tumor markers, MCH/MCHC, etc.), and those stayed null — so the row's nulls vs. populated fields actually fingerprint which markers the parser supports.
- The UI was reading those columns. `/dashboard/blood` rendered "14 mg/dL LDL" alongside "14 K/µL WBC" alongside "14 ng/mL vitamin D" — **clinically nonsensical but not visually flagged.** No row-level "values look uniform" warning anywhere in the read path.
- Per § 8 of the incident doc, the corrupted row is **not deletable** — 48 `score_snapshots` (some with AI-generated insights) FK-reference it. Three options (cascade, null FK, leave + null markers) are documented but none picked yet.
- Scope today: 1 of 3 production `lab_results` rows. `lab_history` empty.

**Defenses landed (per incident § Update).**
1. Write-time uniform-value guard: refuses payloads where ≥60 % of populated numerics share a single value (≥5 markers minimum). [`apps/web/lib/labs/uniform-value-guard.ts`](apps/web/lib/labs/uniform-value-guard.ts) + integration at [save/route.ts:189-198](apps/web/app/api/labs/save/route.ts#L189-L198).
2. Prompt hardening at [upload/route.ts:331](apps/web/app/api/labs/upload/route.ts#L331): "If you find yourself extracting the same numeric value for multiple markers, STOP. Identical values across different markers are almost always layout artifacts."

**Defenses NOT landed (still suggested in incident § 5).**
- Function-Health-specific normalizer (deferred until a sample PDF is available).
- Persist `parser_used` on `lab_results` (no schema change yet — see § 7.7).
- Optional encrypted raw-PDF retention (see § 7.8).

**One generalisation worth surfacing.** The bug is **format-specific, not lab-specific.** Other consumer-wellness brands that white-label Quest/LabCorp but ship a non-standard layout (Inside Tracker, Wild Health, Levels, Lifeforce, Marek Health) are likely to hit the same class of failure on first upload. The uniform-value guard catches the all-same-value mode. It does **not** catch a partial-corruption mode (e.g. half the markers wrong from a different repeating artifact); that would slip through both the prompt instruction and the 60 % guardrail.

---

## Appendix — files touched (read-only)

- DB: live `information_schema.columns` for `public.lab_results, lab_history, score_snapshots, lifestyle_records, oral_kit_orders` (project `xdkppgqtglvviuxgqavh`).
- [apps/web/app/api/labs/upload/route.ts](apps/web/app/api/labs/upload/route.ts)
- [apps/web/app/api/labs/save/route.ts](apps/web/app/api/labs/save/route.ts)
- [apps/web/app/components/lab-upload.tsx](apps/web/app/components/lab-upload.tsx)
- [apps/web/app/dashboard/blood/page.tsx](apps/web/app/dashboard/blood/page.tsx)
- [apps/web/app/dashboard/blood/[marker]/page.tsx](apps/web/app/dashboard/blood/[marker]/page.tsx)
- [apps/web/app/dashboard/blood/[marker]/marker-client.tsx](apps/web/app/dashboard/blood/[marker]/marker-client.tsx)
- [apps/web/lib/user-context.ts](apps/web/lib/user-context.ts)
- [apps/web/lib/blood/marker-content.ts](apps/web/lib/blood/marker-content.ts)
- [apps/web/lib/blood/categories.ts](apps/web/lib/blood/categories.ts)
- [apps/web/lib/markers/definitions.ts](apps/web/lib/markers/definitions.ts)
- [apps/web/lib/score/recalculate.ts](apps/web/lib/score/recalculate.ts)
- [apps/web/lib/score/buildConnectionInput.ts](apps/web/lib/score/buildConnectionInput.ts)
- [packages/score-engine/src/engine.ts](packages/score-engine/src/engine.ts)
- [docs/incidents/2026-05-01-function-health-14-bug.md](docs/incidents/2026-05-01-function-health-14-bug.md)

No code, schema, or data was modified by this audit.

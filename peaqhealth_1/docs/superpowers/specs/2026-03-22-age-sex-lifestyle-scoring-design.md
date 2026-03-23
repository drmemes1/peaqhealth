# Age & Biological Sex — Lifestyle Scoring Design

**Date:** 2026-03-22
**Status:** Approved
**Scope:** Lifestyle form, score engine, AI insights, oral parser findings language

---

## Overview

Add age range and biological sex to the lifestyle questionnaire. Both fields gate conditional preventive screening questions and modify scoring weights based on peer-reviewed guidelines (ACC/AHA 2019, USPSTF 2021/2024, ACSM 10th ed.). A cross-cutting medical disclaimer constraint requires all recommendation language — in the form, AI insights, and oral findings — to use hedged language ("consider discussing with your doctor") rather than directives.

---

## Cross-Cutting Constraint: No Medical Advice

Peaq cannot give medical advice. Every recommendation, screening prompt, and insight must use appropriately hedged language:

- ✅ "Consider discussing coronary artery calcium (CAC) scoring with your doctor"
- ✅ "Consider asking your provider about colorectal cancer screening options"
- ❌ "Schedule a dental cleaning within 2–4 weeks"
- ❌ "Stop antiseptic mouthwash immediately"

This applies to:
1. Form micro-copy on all screening questions
2. AI insights system prompt (`/api/labs/insight/route.ts`) — remove "never say consider" directive, replace with requirement to always hedge clinical recommendations
3. Oral parser findings (`oral-parser.ts`) — soften all `action` field strings
4. Any static recommendation text in ScoreWheel breakdown cards

---

## 1. Data Model

### New columns on `lifestyle_records`

Migration: `20260322_lifestyle_age_screening.sql`

```sql
ALTER TABLE public.lifestyle_records
  ADD COLUMN IF NOT EXISTS age_range                 text,
  ADD COLUMN IF NOT EXISTS biological_sex            text,
  ADD COLUMN IF NOT EXISTS cac_scored                boolean,
  ADD COLUMN IF NOT EXISTS colorectal_screening_done boolean,
  ADD COLUMN IF NOT EXISTS lung_ct_done              boolean,
  ADD COLUMN IF NOT EXISTS mammogram_done            boolean,
  ADD COLUMN IF NOT EXISTS dexa_done                 boolean,
  ADD COLUMN IF NOT EXISTS psa_discussed             boolean,
  ADD COLUMN IF NOT EXISTS cervical_screening_done   boolean;
```

### Valid values

| Field | Values |
|-------|--------|
| `age_range` | `"18_29"` \| `"30_39"` \| `"40_49"` \| `"50_59"` \| `"60_69"` \| `"70_plus"` |
| `biological_sex` | `"male"` \| `"female"` \| `"prefer_not_to_say"` |
| All screening booleans | `true` \| `false` \| `null` (null = not asked / not applicable) |

### `LifestyleInputs` additions (`engine.ts`)

```typescript
ageRange?:               "18_29" | "30_39" | "40_49" | "50_59" | "60_69" | "70_plus"
biologicalSex?:          "male" | "female" | "prefer_not_to_say"
cacScored?:              boolean
colorectalScreeningDone?: boolean
lungCtDone?:             boolean
mammogramDone?:          boolean
dexaDone?:               boolean
psaDiscussed?:           boolean
cervicalScreeningDone?:  boolean
```

All optional — existing users without these fields score identically.

### `mapLifestyleRow` additions (`recalculate.ts`)

```typescript
ageRange:               row.age_range as LifestyleInputs["ageRange"] | undefined,
biologicalSex:          row.biological_sex as LifestyleInputs["biologicalSex"] | undefined,
cacScored:              row.cac_scored === true ? true : undefined,
colorectalScreeningDone: row.colorectal_screening_done === true ? true : undefined,
lungCtDone:             row.lung_ct_done === true ? true : undefined,
mammogramDone:          row.mammogram_done === true ? true : undefined,
dexaDone:               row.dexa_done === true ? true : undefined,
psaDiscussed:           row.psa_discussed === true ? true : undefined,
cervicalScreeningDone:  row.cervical_screening_done === true ? true : undefined,
```

`false` and `null` both collapse to `undefined` — only compliance (`true`) is rewarded; non-completion carries no penalty.

---

## 2. Score Engine Changes

### Change 1 — Age + sex weighted medical history penalty (body change only)

The `medicalHistoryPenalty` function already takes `ls: LifestyleInputs` — **no signature change needed**. Only the function body changes: add `ageMultiplier` and `sexMultiplier` to the existing flat penalty.

Based on ACC/AHA 2019 Pooled Cohort Equations: the 40–59 decade is the primary prevention window where family history CVD and unmanaged hypertension are both most predictive and most actionable. Pre-menopausal females carry substantially lower absolute ASCVD risk (sex-specific Pooled Cohort coefficients).

```typescript
function medicalHistoryPenalty(ls: LifestyleInputs): number {
  const age = ls.ageRange

  // Age multiplier: higher penalty in the 40–59 primary prevention window
  const ageMultiplier =
    age === "18_29"   ? 0.5 :
    age === "30_39"   ? 1.0 :
    age === "40_49"   ? 1.5 :
    age === "50_59"   ? 1.5 :
    age === "60_69"   ? 1.0 :
    age === "70_plus" ? 0.5 : 1.0  // default when age not provided

  // Sex multiplier: pre-menopausal females (~under 50) have lower absolute ASCVD risk
  const isFemale = ls.biologicalSex === "female"
  const isPreMenopausal = isFemale && (age === "18_29" || age === "30_39" || age === "40_49")
  const sexMultiplier = isPreMenopausal ? 0.75 : 1.0

  let penalty = 0
  if (ls.familyHistoryCVD === true)                        penalty += 0.5
  if (ls.hypertensionDx === true && ls.onBPMeds !== true)  penalty += 0.5

  return penalty * ageMultiplier * sexMultiplier
}
```

**Example penalty values:**

| Profile | Penalty |
|---------|---------|
| 25F, no risk factors | 0 |
| 25F, family hx CVD | −0.19 (0.5 × 0.5 × 0.75) |
| 45M, family hx CVD + unmanaged hypertension | −1.5 (1.0 × 1.5 × 1.0) |
| 52F, family hx CVD + unmanaged hypertension | −1.5 (post-menopausal, sex multiplier = 1.0) |
| 72M, both risk factors | −0.5 (1.0 × 0.5 × 1.0) |

### Change 2 — Sex-adjusted VO2max thresholds

**Note: the male thresholds are also being tightened** alongside the addition of female norms. Under the current engine, males with VO2max 40–44 score 0.75; under this spec they score 0.5. This is intentional — the current thresholds were calibrated too loosely against ACSM norms. This will cause a minor score regression for males in that band on their next recalculate.

ACSM Guidelines for Exercise Testing and Prescription (10th ed.) normative VO2max ranges by sex:

```typescript
function scoreVO2Max(vo2?: number, sex?: string): number {
  if (vo2 == null || vo2 <= 0) return 0
  if (sex === "female") {
    // ACSM female norms: above-average ≥44, average 37–44, below-average 28–37
    if (vo2 > 44) return 1.0
    if (vo2 > 37) return 0.75
    if (vo2 > 28) return 0.5
    return 0
  }
  // male or unspecified — ACSM male norms: above-average ≥50, average 44–50, below-average 35–44
  if (vo2 > 50) return 1.0
  if (vo2 > 44) return 0.75
  if (vo2 > 35) return 0.5
  return 0
}
```

Update call site in `calculatePeaqScore`: `scoreVO2Max(lifestyle.vo2max, lifestyle.biologicalSex)`

### Change 3 — New `scorePreventiveScreening()` function

Adds up to **1.0 pt** to the raw lifestyle score before `(13/8)` scaling.

**Scoring boundaries follow guidelines strictly at the engine level** — the form UI provides a softer display gate (e.g., showing the colorectal question starting at 45), but the scoring function only awards points for age bands where the guideline unambiguously applies (50+). The "40_49" band is excluded from colorectal scoring to avoid rewarding 40–44 year olds who are outside USPSTF eligibility. The form question is shown from 45 onward as an informational prompt but does not award points for that age band.

**Lung CT eligibility includes `"70_plus"`** per USPSTF (50–80 window). A 75-year-old former smoker is eligible.

**DEXA eligibility** uses a single consolidated check covering both `"60_69"` (ages 65–69) and `"70_plus"` (ages 70+).

```typescript
function scorePreventiveScreening(ls: LifestyleInputs): number {
  const age = ls.ageRange
  const sex = ls.biologicalSex
  let pts = 0

  // CAC — ACC/AHA 2019: intermediate-risk adults 40–75
  const cacEligible = age === "40_49" || age === "50_59" || age === "60_69"
  if (cacEligible && ls.cacScored === true) pts += 0.5

  // Colorectal — USPSTF 2021: 50+ awarded in engine (45–49 shown in form but not scored)
  const colorectalEligible = age === "50_59" || age === "60_69" || age === "70_plus"
  if (colorectalEligible && ls.colorectalScreeningDone === true) pts += 0.25

  // Lung CT — USPSTF: 50–80 (covers 50_59, 60_69, 70_plus), smoking history required
  const lungEligible = (age === "50_59" || age === "60_69" || age === "70_plus") &&
                       ls.smokingStatus !== "never"
  if (lungEligible && ls.lungCtDone === true) pts += 0.25

  // Mammogram — USPSTF 2024: females 40+
  const mammoEligible = sex === "female" &&
    (age === "40_49" || age === "50_59" || age === "60_69" || age === "70_plus")
  if (mammoEligible && ls.mammogramDone === true) pts += 0.25

  // Cervical — USPSTF: females 25–65 (30_39 through 60_69 bands)
  const cervicalEligible = sex === "female" &&
    (age === "30_39" || age === "40_49" || age === "50_59" || age === "60_69")
  if (cervicalEligible && ls.cervicalScreeningDone === true) pts += 0.25

  // DEXA — USPSTF Grade B: females 65+ (60_69 = 60–69 includes 65–69; 70_plus = 70+)
  const dexaEligible = sex === "female" && (age === "60_69" || age === "70_plus")
  if (dexaEligible && ls.dexaDone === true) pts += 0.25

  // PSA — USPSTF Grade C: males 55–69 (50_59 = 50–59 includes 55–59; 60_69 = 60–69)
  const psaEligible = sex === "male" && (age === "50_59" || age === "60_69")
  if (psaEligible && ls.psaDiscussed === true) pts += 0.25

  return Math.min(1.0, pts)
}
```

### Updated raw score formula

```typescript
const screeningScore  = scorePreventiveScreening(lifestyle)
const vo2maxScore     = scoreVO2Max(lifestyle.vo2max, lifestyle.biologicalSex)  // updated call
const raw = exerciseScore + oralHygieneScore + dentalVisitScore +
            heartScore + restingHRScore + vo2maxScore + nutritionScore +
            alcoholScore + screeningScore
const net = raw - medicalHistoryPenalty(lifestyle)
lifestyleSub = Math.max(0, Math.min(13, Math.round(net * (13 / 8) * 2) / 2))
```

---

## 3. Form UI

### New questions — placement

Age range and biological sex appear at the **top of the Medical History section**, as a pair, before the existing smoking/hypertension questions. They are the demographic profile that gates all subsequent conditional screening questions.

### Question specs

**Age range**
```
Label: "Age range"
Type: single-select
Options: Under 30 · 30–39 · 40–49 · 50–59 · 60–69 · 70 or older
Values: 18_29 · 30_39 · 40_49 · 50_59 · 60_69 · 70_plus
```

**Biological sex**
```
Label: "Biological sex"
Micro-copy: "Used only for age-appropriate screening recommendations. Not stored with your identity."
Type: single-select
Options: Male · Female · Prefer not to say
Values: male · female · prefer_not_to_say
```

### Conditional screening questions

All hedged per the medical disclaimer constraint. Options: **Yes · No · Not sure** (Yes → `true`, No/Not sure → `false`).

| Condition | Question | Micro-copy |
|-----------|----------|------------|
| Age 40–75 (`40_49`–`60_69`) | "Have you had a coronary artery calcium (CAC) score?" | "Consider asking your doctor whether CAC scoring is appropriate for you. A score of 0 may support a conversation about delaying statin therapy (ACC/AHA 2019)." |
| Age 45+ (shown from `40_49` onward, scored from `50_59`) | "Are you up to date on colorectal cancer screening?" | "Consider discussing screening options (colonoscopy, Cologuard, or FIT) with your doctor. USPSTF recommends considering screening starting at age 45." |
| Age 50–80 (`50_59`–`70_plus`) + former/current smoker | "Have you discussed annual lung CT screening with your doctor?" | "Consider asking your doctor about low-dose CT lung screening if you have a significant smoking history (USPSTF)." |
| Female, age 40+ | "Are you up to date on mammography?" | "Consider discussing mammogram frequency with your doctor. USPSTF (2024) recommends considering biennial screening starting at 40." |
| Female, age 25–65 (`30_39`–`60_69`) | "Are you current on cervical cancer screening?" | "Consider discussing Pap smear or HPV testing schedules with your doctor (USPSTF)." |
| Female, age 65+ (`60_69`–`70_plus`) | "Have you had a bone density (DEXA) scan?" | "Consider asking your doctor about bone density screening. USPSTF recommends considering it for women 65 and older." |
| Male, age 55–69 (`50_59`–`60_69`) | "Have you discussed PSA screening with your doctor?" | "PSA screening is an individualized decision. Consider discussing the potential benefits and limitations with your doctor (USPSTF Grade C)." |

---

## 4. AI Insights System Prompt Update

**File:** `apps/web/app/api/labs/insight/route.ts`

Remove from `SYSTEM_PROMPT`:
> "You never say 'consider' or 'may want to' — you say what needs to be done and why."

Replace with:
> "You always frame clinical recommendations as things the patient should *consider discussing with their doctor* — Peaq provides health information, not medical advice. Use language like 'consider asking your doctor about...' or 'it may be worth discussing with your physician...'"

Add to the `LIFESTYLE:` section of the user prompt:
```
- Age range: ${ls.age_range ?? "not reported"}
- Biological sex: ${ls.biological_sex ?? "not reported"}
```

This allows GPT-4o to generate age/sex-appropriate insights (e.g., referencing post-menopausal cardiovascular risk for a 54-year-old woman, or CAC scoring for a 48-year-old male with borderline LDL).

---

## 5. Oral Parser Language Softening

**File:** `packages/score-engine/src/oral-parser.ts`

All `action` fields in `generateFindings()` use directive language that must be softened. The pattern is to replace directives with "Consider..." framing. Key changes:

| Before | After |
|--------|-------|
| "Stop antiseptic mouthwash immediately." | "Consider switching to an alcohol-free or fluoride rinse, and consider discussing mouthwash choices with your dentist." |
| "Schedule a dental cleaning within 2–4 weeks. Add water flossing daily." | "Consider scheduling a dental cleaning and mentioning this finding to your dentist. Consider adding daily flossing or a water flosser to your routine." |
| "Schedule dental cleaning within 30 days. Add daily flossing or water flosser." | "Consider scheduling a dental cleaning and discussing this finding with your dentist. Consider adding daily flossing or a water flosser." |
| "Try mouth taping during sleep (promotes nasal breathing)." | "Consider discussing mouth taping or nasal breathing techniques with your doctor." |
| "Increase dietary fibre from diverse plant sources..." | "Consider increasing dietary fibre from diverse plant sources... and discussing dietary changes with your doctor." |
| "Maintain with leafy green vegetables and avoid antiseptic mouthwash." | "Consider maintaining leafy green vegetables in your diet and discussing mouthwash choices with your dentist." |

The principle: keep the specific, evidence-grounded content; prefix actions with "Consider" and route clinical decisions through the patient's doctor or dentist.

---

## 6. Migration

Single file: `supabase/migrations/20260322_lifestyle_age_screening.sql`

All columns use `ADD COLUMN IF NOT EXISTS` — safe to run against any DB state. All new columns are nullable; no existing rows are affected.

---

## Implementation Order

1. **Migration** — add columns to `lifestyle_records`
2. **Supabase type regeneration** — run `supabase gen types typescript` to update `database.types.ts` so new columns are type-safe throughout the app
3. **Score engine** — update `LifestyleInputs` interface, update `medicalHistoryPenalty` body, update `scoreVO2Max` signature + body + call site, add `scorePreventiveScreening`, update raw score formula
4. **`recalculate.ts`** — update `mapLifestyleRow` with new field mappings
5. **Lifestyle form** — add age/sex questions at top of Medical History section; add conditional screening questions
6. **AI insights route** — update system prompt + add age/sex to user prompt
7. **Oral parser** — soften all `action` field strings in `generateFindings()`
8. **Dashboard** — no changes needed (score flows through existing snapshot pipeline)

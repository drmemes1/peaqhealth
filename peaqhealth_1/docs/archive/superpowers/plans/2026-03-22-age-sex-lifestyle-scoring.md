# Age & Biological Sex — Lifestyle Scoring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add age range and biological sex to the lifestyle questionnaire, use both to age/sex-weight CVD risk scoring and gate preventive screening bonus questions, and ensure all recommendation language across the app is appropriately hedged ("consider discussing with your doctor").

**Architecture:** New DB columns on `lifestyle_records` flow through `mapLifestyleRow` → `LifestyleInputs` → updated scoring functions in `engine.ts`. The score engine gains one new function (`scorePreventiveScreening`) and two updated functions (`medicalHistoryPenalty` body, `scoreVO2Max` signature + thresholds). The lifestyle form gains two demographic questions and up to seven conditional screening questions. The AI insights system prompt and oral parser action strings are softened for medical disclaimer compliance.

**Tech Stack:** TypeScript, Next.js 15 App Router, Supabase, `@peaq/score-engine` local package (tsx, no formal test runner — uses inline test block at bottom of `engine.ts`)

**Spec:** `docs/superpowers/specs/2026-03-22-age-sex-lifestyle-scoring-design.md`

---

## Chunk 1: Data Model & Engine Types

### Task 1: Migration file

**Files:**
- Create: `peaqhealth_1/supabase/migrations/20260322_lifestyle_age_screening.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ── Age range, biological sex, and preventive screening columns ───────────────
-- Gates age/sex-weighted scoring and conditional form questions.
-- All ADD COLUMN IF NOT EXISTS — safe to run on any DB state.

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

- [ ] **Step 2: Run in Supabase SQL Editor**

Paste the SQL above into your Supabase project → SQL Editor and execute. Verify no errors. All columns will be `null` for existing rows — that's correct.

- [ ] **Step 3: Commit**

```bash
git add peaqhealth_1/supabase/migrations/20260322_lifestyle_age_screening.sql
git commit -m "feat(db): add age_range, biological_sex, and screening columns to lifestyle_records"
```

---

### Task 2: Add new fields to `LifestyleInputs`

**Files:**
- Modify: `peaqhealth_1/packages/score-engine/src/engine.ts` (the `LifestyleInputs` interface, around line 65–101)

- [ ] **Step 1: Locate `LifestyleInputs` interface** in `engine.ts` (search for `export interface LifestyleInputs`). It ends around line 101.

- [ ] **Step 2: Add nine new optional fields** at the end of the interface, before the closing `}`:

```typescript
  // v7.0 — age/sex demographic + preventive screening
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

- [ ] **Step 3: Update the engine version string** — the version appears in TWO places that must both be updated to `"7.0"`:
  1. The `PeaqScoreResult` interface type literal (`version: "6.0"` ~line 137) — this is the TypeScript discriminant type
  2. The return value in `calculatePeaqScore` (`version: "6.0"` ~line 792) — this is the runtime value

  Update both occurrences from `"6.0"` to `"7.0"`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd peaqhealth_1/packages/score-engine
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add peaqhealth_1/packages/score-engine/src/engine.ts
git commit -m "feat(engine): add ageRange, biologicalSex, and screening fields to LifestyleInputs (v7.0)"
```

---

## Chunk 2: Score Engine Logic

### Task 3: Update `medicalHistoryPenalty` — age + sex weighted body

**Files:**
- Modify: `peaqhealth_1/packages/score-engine/src/engine.ts` (~line 296–301)

The function signature already takes `ls: LifestyleInputs` — only the body changes. The penalty is multiplied by an age multiplier (higher in the 40–59 primary prevention window per ACC/AHA 2019 Pooled Cohort Equations) and a sex multiplier (pre-menopausal females carry lower absolute ASCVD risk).

- [ ] **Step 1: Replace the existing `medicalHistoryPenalty` function body**

Find:
```typescript
function medicalHistoryPenalty(ls: LifestyleInputs): number {
  let p = 0
  if (ls.familyHistoryCVD) p += 0.5
  if (ls.hypertensionDx && !ls.onBPMeds) p += 0.5
  return p
}
```

Replace with:
```typescript
function medicalHistoryPenalty(ls: LifestyleInputs): number {
  // Age multiplier: 40–59 is the primary prevention window (ACC/AHA 2019 Pooled Cohort Equations)
  const age = ls.ageRange
  const ageMultiplier =
    age === "18_29"   ? 0.5 :
    age === "30_39"   ? 1.0 :
    age === "40_49"   ? 1.5 :
    age === "50_59"   ? 1.5 :
    age === "60_69"   ? 1.0 :
    age === "70_plus" ? 0.5 : 1.0  // default when age not provided

  // Sex multiplier: pre-menopausal females have lower absolute ASCVD risk
  const isFemale = ls.biologicalSex === "female"
  const isPreMenopausal = isFemale && (age === "18_29" || age === "30_39" || age === "40_49")
  const sexMultiplier = isPreMenopausal ? 0.75 : 1.0

  let p = 0
  if (ls.familyHistoryCVD === true)                       p += 0.5
  if (ls.hypertensionDx === true && ls.onBPMeds !== true) p += 0.5
  return p * ageMultiplier * sexMultiplier
}
```

- [ ] **Step 2: Add inline test cases** at the bottom of `engine.ts` in the existing test block (search for `// ---- inline tests` or `const t1 =`). Add after the last test case:

```typescript
// Age/sex penalty tests
const penaltyBase = { exerciseLevel: "moderate" as ExerciseLevel, brushingFreq: "twice_plus" as BrushingFreq, flossingFreq: "daily" as FlossingFreq, mouthwashType: "none" as MouthwashType, lastDentalVisit: "within_6mo" as DentalVisit, smokingStatus: "never" as SmokingStatus, knownHypertension: false, knownDiabetes: false, sleepDuration: "7_to_8" as SleepDuration, sleepLatency: "15_to_30min" as SleepLatency, sleepQualSelf: "good" as SleepQualSelf, daytimeFatigue: "sometimes" as DaytimeFatigue, nightWakings: "less_once_wk" as const, sleepMedication: "never" as const, familyHistoryCVD: true, hypertensionDx: true, onBPMeds: false }

const p25F = calculatePeaqScore(undefined, undefined, undefined, { ...penaltyBase, ageRange: "18_29", biologicalSex: "female" })
const p45M = calculatePeaqScore(undefined, undefined, undefined, { ...penaltyBase, ageRange: "40_49", biologicalSex: "male" })
const p45F = calculatePeaqScore(undefined, undefined, undefined, { ...penaltyBase, ageRange: "40_49", biologicalSex: "female" })
console.log(`Penalty test — 25F lifestyleSub: ${p25F.breakdown.lifestyleSub} (expect higher than 45M below)`)
console.log(`Penalty test — 45M lifestyleSub: ${p45M.breakdown.lifestyleSub} (expect lowest — full penalty × 1.5)`)
console.log(`Penalty test — 45F lifestyleSub: ${p45F.breakdown.lifestyleSub} (expect between 25F and 45M — pre-menopausal × 0.75)`)
console.assert(p25F.breakdown.lifestyleSub > p45M.breakdown.lifestyleSub, "25F should outscore 45M due to lower age multiplier")
console.assert(p45F.breakdown.lifestyleSub > p45M.breakdown.lifestyleSub, "45F should outscore 45M due to pre-menopausal sex multiplier")
```

- [ ] **Step 3: Run tests**

```bash
cd peaqhealth_1/packages/score-engine
npm test
```

Expected: all `console.assert` calls pass (no "Assertion failed" output). Penalty test lines print values with 25F > 45F > 45M for lifestyleSub.

- [ ] **Step 4: Commit**

```bash
git add peaqhealth_1/packages/score-engine/src/engine.ts
git commit -m "feat(engine): age+sex weighted medicalHistoryPenalty — 40-59 primary prevention window"
```

---

### Task 4: Update `scoreVO2Max` — sex-adjusted ACSM thresholds

**Files:**
- Modify: `peaqhealth_1/packages/score-engine/src/engine.ts` (~line 272–278 and ~line 727)

**Note:** Male thresholds are also being tightened here (40–44 → 0.5 instead of 0.75) to align with ACSM 10th ed. norms. This is an intentional calibration change, not a bug.

- [ ] **Step 1: Replace `scoreVO2Max` function**

Find:
```typescript
function scoreVO2Max(vo2?: number): number {
  if (vo2 === undefined) return 0
  if (vo2 > 50)  return 1
  if (vo2 >= 40) return 0.75
  if (vo2 >= 30) return 0.5
  return 0
}
```

Replace with:
```typescript
function scoreVO2Max(vo2?: number, sex?: string): number {
  if (vo2 == null || vo2 <= 0) return 0
  if (sex === "female") {
    // ACSM 10th ed. female norms: above-average ≥44, average 37–44, below-average 28–37
    if (vo2 > 44) return 1
    if (vo2 > 37) return 0.75
    if (vo2 > 28) return 0.5
    return 0
  }
  // male or unspecified — ACSM 10th ed. male norms: above-average ≥50, average 44–50, below-average 35–44
  if (vo2 > 50) return 1
  if (vo2 > 44) return 0.75
  if (vo2 > 35) return 0.5
  return 0
}
```

- [ ] **Step 2: Update the call site** in `calculatePeaqScore` (~line 727):

Find:
```typescript
vo2maxScore      = scoreVO2Max(lifestyle.vo2max)
```

Replace with:
```typescript
vo2maxScore      = scoreVO2Max(lifestyle.vo2max, lifestyle.biologicalSex)
```

- [ ] **Step 3: Add inline test cases**

```typescript
// VO2max sex-adjusted tests (ACSM 10th ed.)
console.assert(scoreVO2Max(38, "female") === 0.75, "Female VO2 38 should be 0.75 (above average for women)")
console.assert(scoreVO2Max(38, "male")   === 0.5,  "Male VO2 38 should be 0.5 (below average for men, tightened threshold)")
console.assert(scoreVO2Max(45, "female") === 1.0,  "Female VO2 45 should be 1.0")
console.assert(scoreVO2Max(45, "male")   === 0.75, "Male VO2 45 should be 0.75")
console.assert(scoreVO2Max(51, "male")   === 1.0,  "Male VO2 51 should be 1.0")
console.assert(scoreVO2Max(undefined)    === 0,    "undefined VO2 should be 0")
```

Note: `scoreVO2Max` is a module-internal function. To test it inline, temporarily call it directly in the test block (it is in scope within engine.ts).

- [ ] **Step 4: Run tests**

```bash
cd peaqhealth_1/packages/score-engine
npm test
```

Expected: no assertion failures.

- [ ] **Step 5: Commit**

```bash
git add peaqhealth_1/packages/score-engine/src/engine.ts
git commit -m "feat(engine): sex-adjusted VO2max thresholds per ACSM 10th ed."
```

---

### Task 5: Add `scorePreventiveScreening` function

**Files:**
- Modify: `peaqhealth_1/packages/score-engine/src/engine.ts` (add new function after `scoreAlcohol`, before `medicalHistoryPenalty`)

- [ ] **Step 1: Add `scorePreventiveScreening` after `scoreAlcohol`** (~line 294):

```typescript
// ── Preventive screening compliance (max 1.0 pt) ─────────────────────────────
// Guidelines: ACC/AHA 2019 (CAC), USPSTF 2021 (colorectal), USPSTF (lung CT, 50–80),
// USPSTF 2024 (mammogram, females 40+), USPSTF (cervical, females 25–65),
// USPSTF Grade B (DEXA, females 65+), USPSTF Grade C (PSA, males 55–69)
// Scoring gate is strictly guideline-eligible age bands.
// Colorectal: engine awards at 50+ only (45–49 shown in form as informational but not scored).
// Only compliance (true) is rewarded; non-completion carries no penalty.
function scorePreventiveScreening(ls: LifestyleInputs): number {
  const age = ls.ageRange
  const sex = ls.biologicalSex
  let pts = 0

  // CAC — ACC/AHA 2019: intermediate-risk adults 40–75
  const cacEligible = age === "40_49" || age === "50_59" || age === "60_69"
  if (cacEligible && ls.cacScored === true) pts += 0.5

  // Colorectal — USPSTF 2021: engine awards at 50+ (45–49 shown in form, not scored)
  const colorectalEligible = age === "50_59" || age === "60_69" || age === "70_plus"
  if (colorectalEligible && ls.colorectalScreeningDone === true) pts += 0.25

  // Lung CT — USPSTF: ages 50–80 (50_59, 60_69, 70_plus), smoking history required
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

  // DEXA — USPSTF Grade B: females 65+ (60_69 covers 65–69; 70_plus covers 70+)
  const dexaEligible = sex === "female" && (age === "60_69" || age === "70_plus")
  if (dexaEligible && ls.dexaDone === true) pts += 0.25

  // PSA — USPSTF Grade C: males 55–69 (50_59 covers 55–59; 60_69 covers 60–69)
  const psaEligible = sex === "male" && (age === "50_59" || age === "60_69")
  if (psaEligible && ls.psaDiscussed === true) pts += 0.25

  return Math.min(1.0, pts)
}
```

- [ ] **Step 2: Wire into `calculatePeaqScore`** — in the lifestyle section (~line 717–732):

Find:
```typescript
    const raw        = exerciseScore + oralHygieneScore + dentalVisitScore + heartScore + restingHRScore + vo2maxScore + nutritionScore + alcoholScore
```

Replace with:
```typescript
    const screeningScore = scorePreventiveScreening(lifestyle)
    const raw        = exerciseScore + oralHygieneScore + dentalVisitScore + heartScore + restingHRScore + vo2maxScore + nutritionScore + alcoholScore + screeningScore
```

- [ ] **Step 3: Add inline test cases** inside `runTests()`, after the Task 3 penalty tests, before the closing `}` of `runTests()`.

**Important:** `penaltyBase` is defined in the Task 3 test block and must already be in scope (i.e., Task 3 tests must already be present). Both test blocks live inside the same `runTests()` function.

```typescript
// Preventive screening tests
const screenerBase = { ...penaltyBase, familyHistoryCVD: false, hypertensionDx: false }

const t_cacM45 = calculatePeaqScore(undefined, undefined, undefined, { ...screenerBase, ageRange: "40_49", biologicalSex: "male", cacScored: true })
const t_cacM45_no = calculatePeaqScore(undefined, undefined, undefined, { ...screenerBase, ageRange: "40_49", biologicalSex: "male", cacScored: false })
console.assert(t_cacM45.breakdown.lifestyleSub > t_cacM45_no.breakdown.lifestyleSub, "CAC compliance should add pts for 45M")

const t_mammoF50 = calculatePeaqScore(undefined, undefined, undefined, { ...screenerBase, ageRange: "50_59", biologicalSex: "female", mammogramDone: true })
const t_mammoF50_no = calculatePeaqScore(undefined, undefined, undefined, { ...screenerBase, ageRange: "50_59", biologicalSex: "female", mammogramDone: false })
console.assert(t_mammoF50.breakdown.lifestyleSub > t_mammoF50_no.breakdown.lifestyleSub, "Mammogram compliance should add pts for 50F")

const t_colorectalM25 = calculatePeaqScore(undefined, undefined, undefined, { ...screenerBase, ageRange: "18_29", biologicalSex: "male", colorectalScreeningDone: true })
const t_colorectalM25_baseline = calculatePeaqScore(undefined, undefined, undefined, { ...screenerBase, ageRange: "18_29", biologicalSex: "male" })
console.assert(t_colorectalM25.breakdown.lifestyleSub === t_colorectalM25_baseline.breakdown.lifestyleSub, "Colorectal should NOT award pts for 18_29 (outside guideline age)")

const t_dexaF65 = calculatePeaqScore(undefined, undefined, undefined, { ...screenerBase, ageRange: "60_69", biologicalSex: "female", dexaDone: true })
const t_dexaF65_no = calculatePeaqScore(undefined, undefined, undefined, { ...screenerBase, ageRange: "60_69", biologicalSex: "female", dexaDone: false })
console.assert(t_dexaF65.breakdown.lifestyleSub > t_dexaF65_no.breakdown.lifestyleSub, "DEXA compliance should add pts for 65F (60_69 band)")
```

- [ ] **Step 4: Run tests**

```bash
cd peaqhealth_1/packages/score-engine
npm test
```

Expected: no assertion failures.

- [ ] **Step 5: Commit**

```bash
git add peaqhealth_1/packages/score-engine/src/engine.ts
git commit -m "feat(engine): scorePreventiveScreening — CAC, colorectal, lung CT, mammogram, cervical, DEXA, PSA"
```

---

## Chunk 3: Mapper & Lifestyle Form

### Task 6: Update `mapLifestyleRow` in `recalculate.ts`

**Files:**
- Modify: `peaqhealth_1/apps/web/lib/score/recalculate.ts` (~line 19–49)

- [ ] **Step 1: Add new field mappings** at the end of the `return { ... }` block in `mapLifestyleRow`, before the closing `}`:

```typescript
    // v7.0 — age/sex demographic + preventive screening
    ageRange:               row.age_range as LifestyleInputs["ageRange"] | undefined,
    biologicalSex:          row.biological_sex as LifestyleInputs["biologicalSex"] | undefined,
    // Only true maps to true — false/null both become undefined (no penalty for non-completion)
    cacScored:              row.cac_scored === true ? true : undefined,
    colorectalScreeningDone: row.colorectal_screening_done === true ? true : undefined,
    lungCtDone:             row.lung_ct_done === true ? true : undefined,
    mammogramDone:          row.mammogram_done === true ? true : undefined,
    dexaDone:               row.dexa_done === true ? true : undefined,
    psaDiscussed:           row.psa_discussed === true ? true : undefined,
    cervicalScreeningDone:  row.cervical_screening_done === true ? true : undefined,
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd peaqhealth_1/apps/web
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the new fields.

- [ ] **Step 3: Commit**

```bash
git add peaqhealth_1/apps/web/lib/score/recalculate.ts
git commit -m "feat(score): map age_range, biological_sex, and screening columns into LifestyleInputs"
```

---

### Task 7: Update the lifestyle form

**Files:**
- Modify: `peaqhealth_1/apps/web/app/settings/lifestyle/lifestyle-form.tsx`

This is the largest task. The form already has conditional rendering (`answers[key]` state + conditional display). Follow the existing pattern exactly.

- [ ] **Step 1: Add new answer keys to the initial state**

Find the `useState` that initializes `answers`. Add these keys (the form saves all answers to `handleSave`):

```typescript
ageRange: "",
biologicalSex: "",
cacScored: "",
colorectalScreeningDone: "",
lungCtDone: "",
mammogramDone: "",
dexaDone: "",
psaDiscussed: "",
cervicalScreeningDone: "",
```

- [ ] **Step 2: Add age range and biological sex questions** at the **top of the Medical History section** (before the smoking question). Follow the existing `Question` / option group pattern:

```tsx
{/* Age range */}
<Question
  label="Age range"
  name="ageRange"
  options={[
    { label: "Under 30",    value: "18_29"   },
    { label: "30–39",       value: "30_39"   },
    { label: "40–49",       value: "40_49"   },
    { label: "50–59",       value: "50_59"   },
    { label: "60–69",       value: "60_69"   },
    { label: "70 or older", value: "70_plus" },
  ]}
  value={answers.ageRange}
  onChange={v => setAnswers(a => ({ ...a, ageRange: v }))}
/>

{/* Biological sex */}
<Question
  label="Biological sex"
  hint="Used only for age-appropriate screening recommendations. Not stored with your identity."
  name="biologicalSex"
  options={[
    { label: "Male",             value: "male"            },
    { label: "Female",           value: "female"          },
    { label: "Prefer not to say", value: "prefer_not_to_say" },
  ]}
  value={answers.biologicalSex}
  onChange={v => setAnswers(a => ({ ...a, biologicalSex: v }))}
/>
```

- [ ] **Step 3: Add conditional screening questions** after the biological sex question. Each block uses the existing conditional rendering pattern (`age && condition && <Question ...>`). All use Yes/No/Not sure options.

Define a shared options array near the top of the component:
```typescript
const yesNoOptions = [
  { label: "Yes",      value: "yes"    },
  { label: "No",       value: "no"     },
  { label: "Not sure", value: "unsure" },
]
```

Then add the conditional questions:

```tsx
{/* CAC — ACC/AHA 2019: 40–75 */}
{(answers.ageRange === "40_49" || answers.ageRange === "50_59" || answers.ageRange === "60_69") && (
  <Question
    label="Have you had a coronary artery calcium (CAC) score?"
    hint="Consider asking your doctor whether CAC scoring is appropriate for you. A score of 0 may support a conversation about delaying statin therapy (ACC/AHA 2019)."
    name="cacScored"
    options={yesNoOptions}
    value={answers.cacScored}
    onChange={v => setAnswers(a => ({ ...a, cacScored: v }))}
  />
)}

{/* Colorectal — USPSTF 2021: shown from 45 (40_49 band) */}
{(answers.ageRange === "40_49" || answers.ageRange === "50_59" || answers.ageRange === "60_69" || answers.ageRange === "70_plus") && (
  <Question
    label="Are you up to date on colorectal cancer screening?"
    hint="Consider discussing screening options (colonoscopy, Cologuard, or FIT) with your doctor. USPSTF recommends considering screening starting at age 45."
    name="colorectalScreeningDone"
    options={yesNoOptions}
    value={answers.colorectalScreeningDone}
    onChange={v => setAnswers(a => ({ ...a, colorectalScreeningDone: v }))}
  />
)}

{/* Lung CT — USPSTF: 50–80, smoking history */}
{(answers.ageRange === "50_59" || answers.ageRange === "60_69" || answers.ageRange === "70_plus") &&
 (answers.smokingStatus === "current" || answers.smokingStatus === "former") && (
  <Question
    label="Have you discussed annual lung CT screening with your doctor?"
    hint="Consider asking your doctor about low-dose CT lung screening if you have a significant smoking history (USPSTF)."
    name="lungCtDone"
    options={yesNoOptions}
    value={answers.lungCtDone}
    onChange={v => setAnswers(a => ({ ...a, lungCtDone: v }))}
  />
)}

{/* Mammogram — USPSTF 2024: females 40+ */}
{answers.biologicalSex === "female" &&
 (answers.ageRange === "40_49" || answers.ageRange === "50_59" || answers.ageRange === "60_69" || answers.ageRange === "70_plus") && (
  <Question
    label="Are you up to date on mammography?"
    hint="Consider discussing mammogram frequency with your doctor. USPSTF (2024) recommends considering biennial screening starting at 40."
    name="mammogramDone"
    options={yesNoOptions}
    value={answers.mammogramDone}
    onChange={v => setAnswers(a => ({ ...a, mammogramDone: v }))}
  />
)}

{/* Cervical — USPSTF: females 25–65 */}
{answers.biologicalSex === "female" &&
 (answers.ageRange === "30_39" || answers.ageRange === "40_49" || answers.ageRange === "50_59" || answers.ageRange === "60_69") && (
  <Question
    label="Are you current on cervical cancer screening?"
    hint="Consider discussing Pap smear or HPV testing schedules with your doctor (USPSTF)."
    name="cervicalScreeningDone"
    options={yesNoOptions}
    value={answers.cervicalScreeningDone}
    onChange={v => setAnswers(a => ({ ...a, cervicalScreeningDone: v }))}
  />
)}

{/* DEXA — USPSTF Grade B: females 65+ */}
{answers.biologicalSex === "female" &&
 (answers.ageRange === "60_69" || answers.ageRange === "70_plus") && (
  <Question
    label="Have you had a bone density (DEXA) scan?"
    hint="Consider asking your doctor about bone density screening. USPSTF recommends considering it for women 65 and older."
    name="dexaDone"
    options={yesNoOptions}
    value={answers.dexaDone}
    onChange={v => setAnswers(a => ({ ...a, dexaDone: v }))}
  />
)}

{/* PSA — USPSTF Grade C: males 55–69 */}
{answers.biologicalSex === "male" &&
 (answers.ageRange === "50_59" || answers.ageRange === "60_69") && (
  <Question
    label="Have you discussed PSA screening with your doctor?"
    hint="PSA screening is an individualized decision. Consider discussing the potential benefits and limitations with your doctor (USPSTF Grade C)."
    name="psaDiscussed"
    options={yesNoOptions}
    value={answers.psaDiscussed}
    onChange={v => setAnswers(a => ({ ...a, psaDiscussed: v }))}
  />
)}
```

- [ ] **Step 4: Update `handleSave`** to include the new fields in the row sent to the API.

The form's `handleSave` builds a `row` object from `answers`. Add these mappings (find where other boolean fields like `hypertension_dx` are mapped):

```typescript
row["age_range"]                  = answers.ageRange     || null
row["biological_sex"]             = answers.biologicalSex || null
row["cac_scored"]                 = answers.cacScored === "yes"
row["colorectal_screening_done"]  = answers.colorectalScreeningDone === "yes"
row["lung_ct_done"]               = answers.lungCtDone === "yes"
row["mammogram_done"]             = answers.mammogramDone === "yes"
row["dexa_done"]                  = answers.dexaDone === "yes"
row["psa_discussed"]              = answers.psaDiscussed === "yes"
row["cervical_screening_done"]    = answers.cervicalScreeningDone === "yes"
```

- [ ] **Step 5: Pre-populate new fields from existing lifestyle data**

The form pre-fills answers via an `initial` object constructed before `useState` (search for `const initial = {` near the top of the component). The variable holding existing data is called `existing` (NOT `existingData`). Add the new fields to the `initial` object — this is the pattern used for all existing fields:

```typescript
// Inside the `const initial = { ... }` block, after existing fields:
ageRange:               existing?.age_range          ?? "",
biologicalSex:          existing?.biological_sex      ?? "",
cacScored:              existing?.cac_scored              ? "yes" : "",
colorectalScreeningDone: existing?.colorectal_screening_done ? "yes" : "",
lungCtDone:             existing?.lung_ct_done            ? "yes" : "",
mammogramDone:          existing?.mammogram_done           ? "yes" : "",
dexaDone:               existing?.dexa_done                ? "yes" : "",
psaDiscussed:           existing?.psa_discussed            ? "yes" : "",
cervicalScreeningDone:  existing?.cervical_screening_done  ? "yes" : "",
```

**Do not use imperative `setAnswers` calls for pre-fill** — all pre-fill happens declaratively in the `initial` object that seeds `useState`.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd peaqhealth_1/apps/web
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Manually test in browser**

- Navigate to the lifestyle settings page
- Verify age range and biological sex questions appear at the top of the Medical History section
- Select "40–49" and "Male" — confirm CAC and colorectal questions appear
- Select "50–59" and "Female" with "former" smoking — confirm lung CT, mammogram, cervical questions appear
- Select "60–69" and "Female" — confirm DEXA appears
- Select "18–29" and "Male" — confirm no screening questions appear
- Submit form, check Supabase `lifestyle_records` for the saved values

- [ ] **Step 8: Commit**

```bash
git add peaqhealth_1/apps/web/app/settings/lifestyle/lifestyle-form.tsx
git commit -m "feat(form): add age range, biological sex, and conditional preventive screening questions"
```

---

## Chunk 4: AI Insights & Oral Parser

### Task 8: Update AI insights system prompt and user prompt

**Files:**
- Modify: `peaqhealth_1/apps/web/app/api/labs/insight/route.ts`

- [ ] **Step 1: Update `SYSTEM_PROMPT`**

Find in the system prompt:
```typescript
"You never say 'consider' or 'may want to' — you say what needs to be done and why."
```

Replace with:
```typescript
"You always frame clinical recommendations as things the patient should consider discussing with their doctor — Oravi provides health information, not medical advice. Use language like 'consider asking your doctor about...' or 'it may be worth discussing with your physician...'"
```

- [ ] **Step 2: Add age and sex to the lifestyle section of the user prompt**

Find the lifestyle section in `userPrompt`:
```typescript
const userPrompt = `...
LIFESTYLE:
- Smoking: ${smoking}
- Exercise: ${exerciseFreq}
...`
```

Add after the `LIFESTYLE:` header (before the first `- Smoking:` line):
```typescript
`- Age range: ${lifestyle?.age_range ?? "not reported"}
- Biological sex: ${lifestyle?.biological_sex ?? "not reported"}`
```

- [ ] **Step 3: Verify the route still compiles**

```bash
cd peaqhealth_1/apps/web
npx tsc --noEmit 2>&1 | grep "insight"
```

Expected: no errors on the insight route.

- [ ] **Step 4: Commit**

```bash
git add peaqhealth_1/apps/web/app/api/labs/insight/route.ts
git commit -m "feat(insights): hedge recommendations with 'consider'; add age/sex to prompt context"
```

---

### Task 9: Soften oral parser action language

**Files:**
- Modify: `peaqhealth_1/packages/score-engine/src/oral-parser.ts`

All `action` fields in `generateFindings()` currently use directive language. Replace each with hedged "Consider..." framing. The `body` fields keep their evidence-grounded content unchanged — only `action` strings change.

- [ ] **Step 1: Update the mouthwash-detected finding action** (~line 249):

Find:
```typescript
action: "Stop antiseptic mouthwash immediately. Switch to alcohol-free or xylitol-based rinse if needed, or nothing at all.",
```
Replace with:
```typescript
action: "Consider switching to an alcohol-free or xylitol-based rinse, and consider discussing your mouthwash choices with your dentist.",
```

- [ ] **Step 2: Update the P. gingivalis critical finding action** (~line 264):

Find:
```typescript
action: "Schedule a dental cleaning within 2–4 weeks. Add water flossing daily. Consider oil pulling with coconut oil (mild evidence for P. gingivalis reduction). Inform your dentist of this finding.",
```
Replace with:
```typescript
action: "Consider scheduling a dental cleaning and mentioning this finding to your dentist. Consider adding daily flossing or a water flosser to your routine.",
```

- [ ] **Step 3: Update the P. gingivalis elevated finding action** (~line 278):

Find:
```typescript
action: "Schedule dental cleaning within 30 days. Add daily flossing or water flosser. Avoid antiseptic mouthwash (disrupts the protective microbiome that competes with P. gingivalis).",
```
Replace with:
```typescript
action: "Consider scheduling a dental cleaning and discussing this finding with your dentist. Consider adding daily flossing or a water flosser, and discuss mouthwash choices with your dentist.",
```

- [ ] **Step 4: Update the low-diversity finding action** (~line 293):

Find:
```typescript
action: "Increase dietary fibre from diverse plant sources (target 30+ plant species per week). Add fermented foods: kimchi, sauerkraut, kefir. Stop antiseptic mouthwash. Chew your food thoroughly.",
```
Replace with:
```typescript
action: "Consider increasing dietary fibre from diverse plant sources and adding fermented foods to your diet. Consider discussing mouthwash choices and dietary changes with your dentist or doctor.",
```

- [ ] **Step 5: Update the OSA signal finding action** (~line 306):

Find:
```typescript
action: "If you have a wearable: check your SpO2 dip data for confirmation. Try mouth taping during sleep (promotes nasal breathing). Consider a sleep study if you experience daytime sleepiness, morning headaches, or your partner reports snoring.",
```
Replace with:
```typescript
action: "If you have a wearable, consider checking your SpO2 dip data for confirmation. Consider discussing mouth taping or nasal breathing techniques with your doctor. Consider asking your doctor about a sleep study if you experience daytime sleepiness, morning headaches, or snoring.",
```

- [ ] **Step 6: Update the excellent nitrate finding action** (~line 321):

Find:
```typescript
action: "Maintain with leafy green vegetables and avoid antiseptic mouthwash. Beetroot or green powder before exercise can boost NO production through this pathway.",
```
Replace with:
```typescript
action: "Consider maintaining leafy green vegetables in your diet and discussing mouthwash choices with your dentist. Beetroot or green powder before exercise may support NO production through this pathway.",
```

- [ ] **Step 7: Update the excellent periodontal finding action** (~line 336):

Find:
```typescript
action: "Maintain with twice-daily brushing, daily flossing, and annual dental visits. Avoid antiseptic mouthwash.",
```
Replace with:
```typescript
action: "Consider maintaining twice-daily brushing, daily flossing, and regular dental visits. Consider discussing mouthwash choices with your dentist.",
```

- [ ] **Step 8: Run oral parser tests**

```bash
cd peaqhealth_1/packages/score-engine
npx tsx src/oral-parser.test.ts
```

Expected: all tests pass (action content has changed but structure/types are unchanged).

- [ ] **Step 9: Commit**

```bash
git add peaqhealth_1/packages/score-engine/src/oral-parser.ts
git commit -m "fix(oral-parser): hedge all action recommendations — 'consider discussing with your doctor/dentist'"
```

---

## Chunk 5: Integration & Merge

### Task 10: End-to-end verification and PR

- [ ] **Step 1: Full typecheck across the monorepo**

```bash
cd peaqhealth_1
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 2: Run score engine tests**

```bash
cd peaqhealth_1/packages/score-engine
npm test
```

Expected: no assertion failures, version prints as "7.0".

- [ ] **Step 3: Run the dev server and smoke test the form**

```bash
cd peaqhealth_1
pnpm dev
```

- Open `http://localhost:3000/settings/lifestyle`
- Complete the questionnaire as a 45-year-old female, former smoker
- Expected visible questions: age range, biological sex, CAC (40–75), colorectal (45+), lung CT (50–80 + smoker — should NOT appear at 40s), mammogram (female 40+), cervical (female 25–65)
- Submit and verify Supabase row has `age_range = "40_49"`, `biological_sex = "female"`, `mammogram_done = true/false`
- Reload dashboard — verify score changed (if lifestyle_sub was previously computed without screening bonus)

- [ ] **Step 4: Create branch, push, open PR**

```bash
git checkout -b feat/age-sex-lifestyle-scoring
git push -u origin feat/age-sex-lifestyle-scoring
gh pr create \
  --title "feat: age + sex weighted lifestyle scoring, preventive screening questions, medical disclaimer language" \
  --body "Adds age range and biological sex to the lifestyle questionnaire. Both gate up to 7 conditional preventive screening questions (CAC, colorectal, lung CT, mammogram, cervical, DEXA, PSA) grounded in ACC/AHA 2019, USPSTF 2021/2024, and ACSM 10th ed. guidelines. The score engine gains age-weighted CVD penalty, sex-adjusted VO2max thresholds, and a new preventive screening compliance function (max +1 pt). AI insights system prompt and oral parser action strings are updated to use hedged 'consider discussing with your doctor' language throughout. See spec: docs/superpowers/specs/2026-03-22-age-sex-lifestyle-scoring-design.md" \
  --base main
```

- [ ] **Step 5: Merge**

```bash
gh pr merge --merge --delete-branch
git checkout main && git pull
```

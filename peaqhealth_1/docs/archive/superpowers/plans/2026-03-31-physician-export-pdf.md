# Physician Export PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current print-dialog HTML export with a comprehensive 6-page clinical PDF, add email-to-physician via Resend, and upgrade the settings export button to a modal.

**Architecture:** A POST route at `/api/account/export` fetches all six data sources (profile, score snapshot, blood labs, 30-night sleep, oral kit, lifestyle), uses `@react-pdf/renderer` to render a real PDF buffer server-side, and either streams it as a download or emails it via Resend. The settings page replaces the plain Export button with an `ExportModal` that accepts an optional physician email. The legacy `buildReportHtml` + `window.print()` path is deleted entirely.

**Tech Stack:** `@react-pdf/renderer` v4 (Node.js PDF generation, no browser), `resend` (transactional email with attachment), Next.js 15 App Router, Supabase SSR client, TypeScript

---

## Audit Summary (pre-planning research)

| Item | Finding |
|---|---|
| Current export route | `GET /api/account/export` — returns JSON only, no PDF |
| PDF generation today | `buildReportHtml()` in `settings-client.tsx`, opens `window.print()` |
| Sleep table | `sleep_data` (not `whoop_sleep_data`). Fields: `date, source, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, spo2` |
| Score snapshot fields | `score, base_score, sleep_sub, blood_sub, oral_sub, modifier_total, modifiers_applied, engine_version, calculated_at` — all exist |
| `modifiers_applied` type | `Array<{id, panels, direction:'penalty'\|'bonus', points, label, rationale}>` |
| Oral kit table | `oral_kit_orders`, filter: `status in ('results_ready','scored')`. Fields: `oral_score_snapshot, shannon_diversity, nitrate_reducers_pct, periodontopathogen_pct, osa_taxa_pct, neuro_signal_pct, metabolic_signal_pct, proliferative_signal_pct, raw_otu_table, report_date` |
| Profile columns | `first_name, last_name` (not `full_name`) |
| Logo | `public/images/peaq_logo_transparent.png` |
| Email library | None installed |
| Settings export button | `app/settings/settings-client.tsx`, calls `exportData()` → GET `/api/account/export` |

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `apps/web/app/api/account/export/report-data.ts` | CREATE | Types + `fetchReportData()` + `computeSleepAverages()` |
| `apps/web/app/api/account/export/report-pdf.tsx` | CREATE | `@react-pdf/renderer` 6-page `ReportDocument` |
| `apps/web/app/api/account/export/route.ts` | REPLACE | POST handler — fetch → render → download or email |
| `apps/web/app/components/export-modal.tsx` | CREATE | Modal with physician name/email fields |
| `apps/web/app/settings/settings-client.tsx` | MODIFY | Remove `buildReportHtml` + `exportData`; wire `ExportModal` |

---

### Task 1: Install packages

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Install dependencies**

From the repo root (not `apps/web`), run:
```bash
cd apps/web && npm install @react-pdf/renderer resend
```

Expected: ends with `added N packages, found N vulnerabilities`.

- [ ] **Step 2: Add env keys to .env.example**

Append to `apps/web/.env.example`:
```
RESEND_API_KEY=           # Resend transactional email API key (resend.com)
REPORT_FROM_EMAIL=reports@oravi.health   # Resend verified sender address
```

- [ ] **Step 3: Verify packages installed**

```bash
cd apps/web && node -e "require('@react-pdf/renderer'); require('resend'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/.env.example
git commit -m "chore: install @react-pdf/renderer and resend"
```

---

### Task 2: Create report-data.ts — types + data fetching

**Files:**
- Create: `apps/web/app/api/account/export/report-data.ts`
- Test: `apps/web/app/api/account/export/report-data.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/app/api/account/export/report-data.test.ts`:

```typescript
import { computeSleepAverages } from './report-data'

describe('computeSleepAverages', () => {
  const night = (date: string, source: string, overrides: Partial<{
    total_sleep_minutes: number
    deep_sleep_minutes: number
    rem_sleep_minutes: number
    sleep_efficiency: number
    hrv_rmssd: number | null
    spo2: number | null
  }> = {}) => ({
    date,
    source,
    total_sleep_minutes: 420,
    deep_sleep_minutes: 80,
    rem_sleep_minutes: 100,
    sleep_efficiency: 90,
    hrv_rmssd: 30,
    spo2: 97,
    ...overrides,
  })

  it('computes weighted averages for a set of nights', () => {
    const nights = [
      night('2026-03-31', 'whoop', { hrv_rmssd: 30, sleep_efficiency: 90 }),
      night('2026-03-30', 'whoop', { hrv_rmssd: 34, sleep_efficiency: 92 }),
      night('2026-03-29', 'whoop', { hrv_rmssd: 26, sleep_efficiency: 88 }),
    ]
    const result = computeSleepAverages(nights)
    expect(result.trackedNights).toBe(3)
    expect(result.avgHrv).toBeGreaterThan(0)
    expect(result.avgEfficiency).toBeGreaterThan(85)
    expect(result.avgDeepPct).toBeGreaterThan(0)
    expect(result.avgRemPct).toBeGreaterThan(0)
    expect(result.avgSpo2).toBeGreaterThan(95)
    expect(result.avgTotalHours).toBeCloseTo(7, 0)
    expect(result.provider).toBe('whoop')
    expect(result.lastSyncDate).toBe('2026-03-31')
  })

  it('returns zeroes for empty array', () => {
    const result = computeSleepAverages([])
    expect(result.trackedNights).toBe(0)
    expect(result.avgHrv).toBe(0)
    expect(result.lastSyncDate).toBeNull()
  })

  it('deduplicates same date, keeps higher-priority provider', () => {
    const nights = [
      night('2026-03-31', 'garmin', { hrv_rmssd: 20 }),
      night('2026-03-31', 'whoop', { hrv_rmssd: 32 }),
    ]
    const result = computeSleepAverages(nights)
    expect(result.trackedNights).toBe(1)
    expect(result.avgHrv).toBe(32)
  })

  it('recent nights (i<7) get 3x weight vs older nights (i>=14) at 1x', () => {
    // One recent night (weight 3) at HRV=60, one old night (weight 1) at HRV=0
    // Weighted avg = (60*3 + 0*0) / 3 = 60  (0 hrv nights are excluded from wavg)
    const nights = [
      night('2026-03-31', 'whoop', { hrv_rmssd: 60 }),
      ...Array.from({ length: 14 }, (_, i) =>
        night(`2026-03-${String(17 - i).padStart(2, '0')}`, 'whoop', { hrv_rmssd: 0 })
      ),
    ]
    const result = computeSleepAverages(nights)
    // Only the night with hrv=60 contributes since others have hrv=0
    expect(result.avgHrv).toBe(60)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && npx jest report-data.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `FAIL` — `Cannot find module './report-data'`

- [ ] **Step 3: Create report-data.ts**

Create `apps/web/app/api/account/export/report-data.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SleepNight {
  date: string
  source: string
  total_sleep_minutes: number
  deep_sleep_minutes: number
  rem_sleep_minutes: number
  sleep_efficiency: number
  hrv_rmssd: number | null
  spo2: number | null
}

export interface SleepAverages {
  trackedNights: number
  provider: string
  avgHrv: number
  avgEfficiency: number
  avgDeepPct: number
  avgRemPct: number
  avgSpo2: number
  avgTotalHours: number
  lastSyncDate: string | null
}

export interface ReportModifier {
  id: string
  panels: string[]
  direction: "penalty" | "bonus"
  points: number
  label: string
  rationale: string
}

export interface ReportData {
  // Patient
  fullName: string
  email: string
  // Score
  score: number
  baseScore: number
  sleepSub: number
  bloodSub: number
  oralSub: number
  modifierTotal: number
  modifiersApplied: ReportModifier[]
  engineVersion: string
  calculatedAt: string
  // Blood
  labs: Record<string, unknown> | null
  labName: string | null
  collectionDate: string | null
  // Sleep
  sleepAverages: SleepAverages
  // Oral
  shannonDiversity: number | null
  nitrateReducerPct: number | null
  periodontopathogenPct: number | null
  osaTaxaPct: number | null
  neuroSignalPct: number | null
  metabolicSignalPct: number | null
  proliferativeSignalPct: number | null
  rawOtu: Record<string, number> | null
  reportDate: string | null
  oralScoreSnapshot: unknown | null
  // Lifestyle
  ageRange: string | null
  exerciseLevel: string | null
  smokingStatus: string | null
  brushingFreq: string | null
  flossingFreq: string | null
  mouthwashType: string | null
  lastDentalVisit: string | null
  knownHypertension: boolean | null
  knownDiabetes: boolean | null
}

// ─── Sleep helpers ────────────────────────────────────────────────────────────

const PROVIDER_PRIORITY: Record<string, number> = { whoop: 0, oura: 1, garmin: 2 }

export function computeSleepAverages(nights: SleepNight[]): SleepAverages {
  if (nights.length === 0) {
    return {
      trackedNights: 0, provider: "", avgHrv: 0, avgEfficiency: 0,
      avgDeepPct: 0, avgRemPct: 0, avgSpo2: 0, avgTotalHours: 0, lastSyncDate: null,
    }
  }

  // Deduplicate by date, prefer higher-priority provider
  const bestByDate = new Map<string, SleepNight>()
  for (const n of nights) {
    const existing = bestByDate.get(n.date)
    const p = PROVIDER_PRIORITY[n.source] ?? 99
    const ep = existing ? (PROVIDER_PRIORITY[existing.source] ?? 99) : Infinity
    if (p < ep) bestByDate.set(n.date, n)
  }

  const best = Array.from(bestByDate.values()).sort((a, b) => b.date.localeCompare(a.date))
  const getWeight = (i: number) => i < 7 ? 3 : i < 14 ? 2 : 1

  const wavg = (vals: (number | null)[]): number => {
    let sum = 0, tot = 0
    vals.forEach((v, i) => {
      if (v !== null && !isNaN(Number(v)) && Number(v) !== 0) {
        const w = getWeight(i)
        sum += Number(v) * w
        tot += w
      }
    })
    return tot > 0 ? Math.round((sum / tot) * 10) / 10 : 0
  }

  const avgDeepPct = wavg(best.map(n =>
    n.total_sleep_minutes > 0 ? (n.deep_sleep_minutes / n.total_sleep_minutes) * 100 : null
  ))
  const avgRemPct = wavg(best.map(n =>
    n.total_sleep_minutes > 0 ? (n.rem_sleep_minutes / n.total_sleep_minutes) * 100 : null
  ))
  const avgTotalHours = wavg(best.map(n =>
    n.total_sleep_minutes > 0 ? n.total_sleep_minutes / 60 : null
  ))

  // Dominant provider
  const providerCounts: Record<string, number> = {}
  for (const n of best) providerCounts[n.source] = (providerCounts[n.source] ?? 0) + 1
  const provider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""

  return {
    trackedNights: best.length,
    provider,
    avgHrv: wavg(best.map(n => n.hrv_rmssd)),
    avgEfficiency: wavg(best.map(n => n.sleep_efficiency)),
    avgDeepPct,
    avgRemPct,
    avgSpo2: wavg(best.map(n => n.spo2)),
    avgTotalHours,
    lastSyncDate: best[0]?.date ?? null,
  }
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

export async function fetchReportData(userId: string, supabase: SupabaseClient): Promise<ReportData> {
  const [
    { data: profile },
    { data: snapshot },
    { data: labs },
    { data: sleepNights },
    { data: oral },
    { data: lifestyle },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .single(),

    supabase
      .from("score_snapshots")
      .select("score, base_score, sleep_sub, blood_sub, oral_sub, modifier_total, modifiers_applied, engine_version, calculated_at")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("lab_results")
      .select("*")
      .eq("user_id", userId)
      .eq("parser_status", "complete")
      .order("collection_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("sleep_data")
      .select("date, source, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, sleep_efficiency, hrv_rmssd, spo2")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30),

    supabase
      .from("oral_kit_orders")
      .select("oral_score_snapshot, shannon_diversity, nitrate_reducers_pct, periodontopathogen_pct, osa_taxa_pct, neuro_signal_pct, metabolic_signal_pct, proliferative_signal_pct, raw_otu_table, report_date")
      .eq("user_id", userId)
      .in("status", ["results_ready", "scored"])
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("lifestyle_records")
      .select("age_range, exercise_level, smoking_status, brushing_freq, flossing_freq, mouthwash_type, last_dental_visit, known_hypertension, known_diabetes")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const firstName = (profile?.first_name as string | null) ?? ""
  const lastName = (profile?.last_name as string | null) ?? ""

  return {
    fullName: [firstName, lastName].filter(Boolean).join(" ").trim() || "Patient",
    email: (profile?.email as string | null) ?? "",

    score: Number(snapshot?.score ?? 0),
    baseScore: Number(snapshot?.base_score ?? 0),
    sleepSub: Number(snapshot?.sleep_sub ?? 0),
    bloodSub: Number(snapshot?.blood_sub ?? 0),
    oralSub: Number(snapshot?.oral_sub ?? 0),
    modifierTotal: Number(snapshot?.modifier_total ?? 0),
    modifiersApplied: (snapshot?.modifiers_applied as ReportModifier[] | null) ?? [],
    engineVersion: (snapshot?.engine_version as string | null) ?? "",
    calculatedAt: (snapshot?.calculated_at as string | null) ?? "",

    labs: labs as Record<string, unknown> | null,
    labName: (labs?.lab_name as string | null) ?? null,
    collectionDate: (labs?.collection_date as string | null) ?? null,

    sleepAverages: computeSleepAverages((sleepNights ?? []) as SleepNight[]),

    shannonDiversity: (oral?.shannon_diversity as number | null) ?? null,
    nitrateReducerPct: (oral?.nitrate_reducers_pct as number | null) ?? null,
    periodontopathogenPct: (oral?.periodontopathogen_pct as number | null) ?? null,
    osaTaxaPct: (oral?.osa_taxa_pct as number | null) ?? null,
    neuroSignalPct: (oral?.neuro_signal_pct as number | null) ?? null,
    metabolicSignalPct: (oral?.metabolic_signal_pct as number | null) ?? null,
    proliferativeSignalPct: (oral?.proliferative_signal_pct as number | null) ?? null,
    rawOtu: (oral?.raw_otu_table as Record<string, number> | null) ?? null,
    reportDate: (oral?.report_date as string | null) ?? null,
    oralScoreSnapshot: oral?.oral_score_snapshot ?? null,

    ageRange: (lifestyle?.age_range as string | null) ?? null,
    exerciseLevel: (lifestyle?.exercise_level as string | null) ?? null,
    smokingStatus: (lifestyle?.smoking_status as string | null) ?? null,
    brushingFreq: (lifestyle?.brushing_freq as string | null) ?? null,
    flossingFreq: (lifestyle?.flossing_freq as string | null) ?? null,
    mouthwashType: (lifestyle?.mouthwash_type as string | null) ?? null,
    lastDentalVisit: (lifestyle?.last_dental_visit as string | null) ?? null,
    knownHypertension: (lifestyle?.known_hypertension as boolean | null) ?? null,
    knownDiabetes: (lifestyle?.known_diabetes as boolean | null) ?? null,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx jest report-data.test.ts --no-coverage 2>&1 | tail -8
```

Expected: `Tests: 4 passed, 4 total`

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/account/export/report-data.ts apps/web/app/api/account/export/report-data.test.ts
git commit -m "feat: report-data types, fetchReportData, and computeSleepAverages"
```

---

### Task 3: Create report-pdf.tsx — 6-page PDF document

**Files:**
- Create: `apps/web/app/api/account/export/report-pdf.tsx`

`@react-pdf/renderer` is ESM and must be mocked in tests. Runtime usage (in the route handler with `export const runtime = "nodejs"`) works correctly. Built-in Helvetica font is used — no network requests needed.

- [ ] **Step 1: Write failing test**

Add to `apps/web/app/api/account/export/report-data.test.ts` (append after the existing tests):

```typescript
// ─── report-pdf.tsx smoke test ────────────────────────────────────────────────

jest.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => String(children ?? ''),
  View: ({ children }: { children: React.ReactNode }) => children,
  Image: () => null,
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  Font: { register: jest.fn() },
}))

import React from 'react'
import { buildReportDocument } from './report-pdf'
import type { ReportData } from './report-data'

const minimalData: ReportData = {
  fullName: 'Test Patient', email: 'test@example.com',
  score: 62, baseScore: 66, sleepSub: 18, bloodSub: 32, oralSub: 16,
  modifierTotal: -4,
  modifiersApplied: [{ id: 'm1', panels: ['oral', 'blood'], direction: 'penalty', points: 4, label: 'Oral-systemic inflammation', rationale: 'Elevated P. gingivalis alongside hs-CRP >1.0.' }],
  engineVersion: '8.1', calculatedAt: '2026-03-31T00:00:00Z',
  labs: { ldl_mgdl: 79, hdl_mgdl: 48, hs_crp_mgl: 1.18, lpa_mgdl: 44.88, lab_name: 'LabCorp' },
  labName: 'LabCorp', collectionDate: '2026-03-15',
  sleepAverages: { trackedNights: 23, provider: 'whoop', avgHrv: 27.2, avgEfficiency: 90.1, avgDeepPct: 28.9, avgRemPct: 27.1, avgSpo2: 97.3, avgTotalHours: 7.1, lastSyncDate: '2026-03-30' },
  shannonDiversity: 2.32, nitrateReducerPct: 13.0, periodontopathogenPct: 9.0, osaTaxaPct: 10.0,
  neuroSignalPct: null, metabolicSignalPct: null, proliferativeSignalPct: null,
  rawOtu: { 'Porphyromonas gingivalis': 9.0, 'Fusobacterium nucleatum': 10.0, 'Neisseria subflava': 8.0 },
  reportDate: '2026-03-01', oralScoreSnapshot: null,
  ageRange: '40_49', exerciseLevel: 'moderate', smokingStatus: 'never',
  brushingFreq: 'once_daily', flossingFreq: 'never', mouthwashType: 'none',
  lastDentalVisit: 'over_one_year', knownHypertension: false, knownDiabetes: false,
}

describe('buildReportDocument', () => {
  it('returns a truthy element without throwing for complete data', () => {
    expect(() => buildReportDocument(minimalData, null)).not.toThrow()
    expect(buildReportDocument(minimalData, null)).toBeTruthy()
  })

  it('handles null oral data without throwing', () => {
    const nullOral: ReportData = {
      ...minimalData,
      shannonDiversity: null, nitrateReducerPct: null, periodontopathogenPct: null,
      osaTaxaPct: null, rawOtu: null, reportDate: null,
    }
    expect(() => buildReportDocument(nullOral, null)).not.toThrow()
  })

  it('handles no sleep data without throwing', () => {
    const noSleep: ReportData = {
      ...minimalData,
      sleepAverages: { trackedNights: 0, provider: '', avgHrv: 0, avgEfficiency: 0, avgDeepPct: 0, avgRemPct: 0, avgSpo2: 0, avgTotalHours: 0, lastSyncDate: null },
    }
    expect(() => buildReportDocument(noSleep, null)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && npx jest report-data.test.ts --no-coverage 2>&1 | tail -5
```

Expected: `FAIL` — `Cannot find module './report-pdf'`

- [ ] **Step 3: Create report-pdf.tsx**

Create `apps/web/app/api/account/export/report-pdf.tsx`:

```tsx
import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import type { ReportData } from "./report-data"

// Letter = 612×792 pts. 0.75in margin = 54 pts.
const MARGIN = 54
const CONTENT_W = 612 - MARGIN * 2   // 504 pts

const INK     = "#141410"
const INK_60  = "#666660"
const INK_40  = "#888880"
const INK_20  = "#C8C8C4"
const INK_12  = "#E8E8E4"
const WARM    = "#F7F5F0"
const RED     = "#C0392B"
const BLUE    = "#4A7FB5"
const GREEN   = "#2D6A4F"
const GOLD    = "#B8860B"

const OPT_BG  = "#D4EDDA"; const OPT_FG  = "#2D6A4F"
const GOOD_BG = "#FFF3CD"; const GOOD_FG = "#856404"
const WTCH_BG = "#FFE0B2"; const WTCH_FG = "#664D03"
const ELEV_BG = "#FFCDD2"; const ELEV_FG = "#C0392B"
const NT_BG   = "#F0F0EE"; const NT_FG   = "#888880"

const s = StyleSheet.create({
  page:       { fontFamily: "Helvetica", fontSize: 10, color: INK, paddingTop: MARGIN, paddingBottom: MARGIN + 20, paddingLeft: MARGIN, paddingRight: MARGIN, lineHeight: 1.5 },
  hdr:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: INK_20, paddingBottom: 8, marginBottom: 18 },
  hdrL:       { fontSize: 8, color: INK_40, textTransform: "uppercase", letterSpacing: 1 },
  hdrR:       { fontSize: 8, color: INK_40 },
  secLabel:   { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.5, color: INK_40, marginBottom: 6 },
  body:       { fontSize: 10, color: INK, lineHeight: 1.6 },
  bodyS:      { fontSize: 9, color: INK_60, lineHeight: 1.6 },
  tblHdr:     { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: INK_20, paddingBottom: 4, marginBottom: 2 },
  tblHdrCell: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1, color: INK_40 },
  tblRow:     { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: INK_12 },
  tblCell:    { fontSize: 10, color: INK },
  ctx:        { backgroundColor: WARM, borderLeftWidth: 2, borderLeftColor: GOLD, padding: 10, marginBottom: 8 },
  ctxTitle:   { fontSize: 9, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 3 },
  ctxBody:    { fontSize: 9, color: INK_60, lineHeight: 1.6 },
  ctxSrc:     { fontSize: 8, color: INK_40, marginTop: 4 },
  hr:         { borderBottomWidth: 0.5, borderBottomColor: INK_12, marginVertical: 10 },
  footer:     { position: "absolute", bottom: MARGIN - 8, left: MARGIN, right: MARGIN, flexDirection: "row", justifyContent: "space-between" },
  ftTxt:      { fontSize: 8, color: INK_40 },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(v: number | null | undefined, dec = 1): string {
  if (v == null || isNaN(Number(v))) return "—"
  return Number(v).toFixed(dec)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) }
  catch { return iso }
}

const today = fmtDate(new Date().toISOString())

type Status = "OPTIMAL" | "GOOD" | "WATCH" | "ELEVATED" | "NOT TESTED"

function Badge({ st }: { st: Status }) {
  const [bg, fg] = {
    OPTIMAL: [OPT_BG, OPT_FG],
    GOOD: [GOOD_BG, GOOD_FG],
    WATCH: [WTCH_BG, WTCH_FG],
    ELEVATED: [ELEV_BG, ELEV_FG],
    "NOT TESTED": [NT_BG, NT_FG],
  }[st]
  return <Text style={{ fontSize: 8, paddingTop: 2, paddingBottom: 2, paddingLeft: 5, paddingRight: 5, backgroundColor: bg, color: fg }}>{st}</Text>
}

function PageHeader({ left, right }: { left: string; right?: string }) {
  return (
    <View style={s.hdr}>
      <Text style={s.hdrL}>{left}</Text>
      {right ? <Text style={s.hdrR}>{right}</Text> : null}
    </View>
  )
}

function PageFooter({ name }: { name: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.ftTxt}>Oravi · oravi.health · {name}</Text>
      <Text style={s.ftTxt}>Generated {today}</Text>
    </View>
  )
}

function HR() { return <View style={s.hr} /> }

// ─── Blood status ─────────────────────────────────────────────────────────────

function bloodSt(key: string, v: number | null): Status {
  if (v == null) return "NOT TESTED"
  const r: Record<string, (x: number) => Status> = {
    ldl_mgdl:            x => x <= 70 ? "OPTIMAL" : x <= 100 ? "GOOD" : x <= 130 ? "WATCH" : "ELEVATED",
    hdl_mgdl:            x => x >= 60 ? "OPTIMAL" : x >= 50 ? "GOOD" : x >= 40 ? "WATCH" : "ELEVATED",
    triglycerides_mgdl:  x => x < 100 ? "OPTIMAL" : x < 150 ? "GOOD" : x < 200 ? "WATCH" : "ELEVATED",
    total_cholesterol_mgdl: x => x < 170 ? "OPTIMAL" : x < 200 ? "GOOD" : x < 240 ? "WATCH" : "ELEVATED",
    apob_mgdl:           x => x < 80 ? "OPTIMAL" : x < 90 ? "GOOD" : x < 110 ? "WATCH" : "ELEVATED",
    lpa_mgdl:            x => x < 15 ? "OPTIMAL" : x < 30 ? "GOOD" : x < 50 ? "WATCH" : "ELEVATED",
    hs_crp_mgl:          x => x < 1.0 ? "OPTIMAL" : x < 2.0 ? "GOOD" : x < 3.0 ? "WATCH" : "ELEVATED",
    glucose_mgdl:        x => x >= 70 && x <= 85 ? "OPTIMAL" : x <= 99 ? "GOOD" : x <= 125 ? "WATCH" : "ELEVATED",
    hba1c_pct:           x => x < 5.4 ? "OPTIMAL" : x < 5.7 ? "GOOD" : x < 6.4 ? "WATCH" : "ELEVATED",
    fasting_insulin_uiuml: x => x < 5 ? "OPTIMAL" : x < 10 ? "GOOD" : x < 15 ? "WATCH" : "ELEVATED",
    vitamin_d_ngml:      x => x >= 50 && x <= 80 ? "OPTIMAL" : x >= 30 ? "GOOD" : x >= 20 ? "WATCH" : "ELEVATED",
    egfr_mlmin:          x => x >= 90 ? "OPTIMAL" : x >= 60 ? "GOOD" : x >= 45 ? "WATCH" : "ELEVATED",
    alt_ul:              x => x < 25 ? "OPTIMAL" : x < 40 ? "GOOD" : x < 60 ? "WATCH" : "ELEVATED",
    ast_ul:              x => x < 25 ? "OPTIMAL" : x < 40 ? "GOOD" : x < 60 ? "WATCH" : "ELEVATED",
    tsh_uiuml:           x => x >= 0.5 && x <= 2.5 ? "OPTIMAL" : x <= 4.5 ? "GOOD" : x <= 6.0 ? "WATCH" : "ELEVATED",
  }
  return r[key]?.(v) ?? "GOOD"
}

const BLOOD_MARKERS: Array<{ key: string; label: string; unit: string; reference: string }> = [
  { key: "ldl_mgdl",              label: "LDL Cholesterol",    unit: "mg/dL",   reference: "<100 optimal" },
  { key: "hdl_mgdl",              label: "HDL Cholesterol",    unit: "mg/dL",   reference: ">60 optimal" },
  { key: "triglycerides_mgdl",    label: "Triglycerides",      unit: "mg/dL",   reference: "<150" },
  { key: "total_cholesterol_mgdl",label: "Total Cholesterol",  unit: "mg/dL",   reference: "<200" },
  { key: "apob_mgdl",             label: "ApoB",               unit: "mg/dL",   reference: "<80 optimal" },
  { key: "lpa_mgdl",              label: "Lp(a)",              unit: "mg/dL",   reference: "<30" },
  { key: "hs_crp_mgl",            label: "hs-CRP",             unit: "mg/L",    reference: "<1.0 optimal" },
  { key: "glucose_mgdl",          label: "Glucose (fasting)",  unit: "mg/dL",   reference: "70–85 optimal" },
  { key: "hba1c_pct",             label: "HbA1c",              unit: "%",       reference: "<5.4% optimal" },
  { key: "fasting_insulin_uiuml", label: "Insulin (fasting)",  unit: "µIU/mL",  reference: "<5 optimal" },
  { key: "uric_acid_mgdl",        label: "Uric Acid",          unit: "mg/dL",   reference: "3.4–7.0" },
  { key: "egfr_mlmin",            label: "eGFR",               unit: "mL/min",  reference: ">90" },
  { key: "creatinine_mgdl",       label: "Creatinine",         unit: "mg/dL",   reference: "0.6–1.2" },
  { key: "bun_mgdl",              label: "BUN",                unit: "mg/dL",   reference: "7–25" },
  { key: "alt_ul",                label: "ALT",                unit: "U/L",     reference: "<25 optimal" },
  { key: "ast_ul",                label: "AST",                unit: "U/L",     reference: "<25 optimal" },
  { key: "vitamin_d_ngml",        label: "Vitamin D",          unit: "ng/mL",   reference: "50–80 optimal" },
  { key: "hemoglobin_gdl",        label: "Hemoglobin",         unit: "g/dL",    reference: "13.5–17.5" },
  { key: "tsh_uiuml",             label: "TSH",                unit: "µIU/mL",  reference: "0.5–2.5 optimal" },
  { key: "testosterone_ngdl",     label: "Testosterone",       unit: "ng/dL",   reference: "300–1000 (men)" },
  { key: "ferritin_ngml",         label: "Ferritin",           unit: "ng/mL",   reference: "30–300" },
  { key: "albumin_gdl",           label: "Albumin",            unit: "g/dL",    reference: "3.5–5.0" },
  { key: "wbc_kul",               label: "WBC",                unit: "K/µL",    reference: "4.0–10.5" },
]

const BLOOD_CTX: Record<string, { body: string; src: string }> = {
  lpa_mgdl: {
    body: "Lp(a) is largely genetically determined and is an independent cardiovascular risk factor. Levels >30 mg/dL are associated with increased atherosclerotic risk even with otherwise favorable lipid profiles. Discuss with your cardiologist, particularly in the context of any elevated periodontal burden.",
    src: "Tsimikas S, JACC 2017; Nordestgaard BG, Eur Heart J 2010",
  },
  hs_crp_mgl: {
    body: "hs-CRP 1–3 mg/L represents intermediate cardiovascular risk. Elevated oral periodontal bacteria (P. gingivalis, F. nucleatum) can contribute to systemic inflammatory load via the oral-systemic axis.",
    src: "Ridker PM, Circulation 2003; Kebschull M, J Dent Res 2010",
  },
  hdl_mgdl: {
    body: "HDL below 60 mg/dL reduces reverse cholesterol transport capacity. Aerobic exercise is the most evidence-backed HDL-raising intervention.",
    src: "Gordon DJ, Circulation 1989",
  },
  vitamin_d_ngml: {
    body: "Vitamin D deficiency is associated with immune dysfunction, cardiovascular risk, and impaired sleep quality. Supplementation of 2,000–4,000 IU/day typically raises levels into the optimal range within 3 months.",
    src: "Holick MF, NEJM 2007",
  },
  glucose_mgdl: {
    body: "Fasting glucose above 99 mg/dL enters the pre-diabetic range. Time-restricted eating and reduced refined carbohydrate intake are the most effective dietary interventions.",
    src: "ADA Standards of Medical Care 2024",
  },
  hba1c_pct: {
    body: "HbA1c reflects average blood glucose over the prior 3 months. Values 5.7–6.4% indicate pre-diabetes. Paired with fasting glucose, this provides a more complete metabolic picture.",
    src: "ADA Standards of Medical Care 2024",
  },
}

// ─── Page 1: Cover ────────────────────────────────────────────────────────────

function CoverPage({ data, logo }: { data: ReportData; logo: string | null }) {
  const C = [CONTENT_W * 0.45, CONTENT_W * 0.55]
  return (
    <Page size="LETTER" style={s.page}>
      {/* Logo + title */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <View>
          {logo
            ? <Image src={`data:image/png;base64,${logo}`} style={{ width: 80, height: 28 }} />
            : <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: INK }}>Oravi</Text>
          }
          <Text style={{ fontSize: 8, color: INK_40, marginTop: 4 }}>oravi.health</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 16, color: INK, marginBottom: 4 }}>Personal Health Report</Text>
          <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 2 }}>{data.fullName}</Text>
          <Text style={{ fontSize: 9, color: INK_40, marginBottom: 2 }}>{data.email}</Text>
          <Text style={{ fontSize: 9, color: INK_40 }}>Generated {today}</Text>
        </View>
      </View>

      <HR />

      {/* Score block */}
      <View style={{ backgroundColor: WARM, padding: 18, marginBottom: 18 }}>
        <View style={{ flexDirection: "row", gap: 28, marginBottom: data.modifiersApplied.length > 0 ? 14 : 0 }}>
          {/* Big score */}
          <View style={{ width: 80 }}>
            <Text style={s.secLabel}>Oravi Score</Text>
            <Text style={{ fontSize: 52, fontFamily: "Helvetica-Bold", color: INK, lineHeight: 1 }}>{data.score}</Text>
            <Text style={{ fontSize: 9, color: INK_40 }}>/ 100</Text>
          </View>
          {/* Breakdown */}
          <View style={{ flex: 1 }}>
            <Text style={[s.secLabel, { marginBottom: 8 }]}>Panel Breakdown</Text>
            {[
              ["Sleep",  data.sleepSub,  "/ 30 pts"],
              ["Blood",  data.bloodSub,  "/ 40 pts"],
              ["Oral",   data.oralSub,   "/ 30 pts"],
            ].map(([label, pts, suffix]) => (
              <View key={String(label)} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={s.body}>{label}</Text>
                <Text style={s.body}>{pts} {suffix}</Text>
              </View>
            ))}
            <HR />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: INK_40 }}>Base</Text>
              <Text style={{ fontSize: 9, color: INK_40 }}>{data.baseScore} / 100 pts</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: INK_40 }}>Cross-panel modifiers</Text>
              <Text style={{ fontSize: 9, color: data.modifierTotal < 0 ? RED : GREEN }}>
                {data.modifierTotal > 0 ? `+${data.modifierTotal}` : data.modifierTotal} pts
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: INK }}>Final score</Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: INK }}>{data.score} / 100 pts</Text>
            </View>
          </View>
        </View>

        {data.modifiersApplied.length > 0 && (
          <View style={{ borderTopWidth: 0.5, borderTopColor: INK_20, paddingTop: 10 }}>
            <Text style={[s.secLabel, { marginBottom: 6 }]}>Active Cross-Panel Signals</Text>
            {data.modifiersApplied.map((m, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: m.direction === "penalty" ? RED : GREEN, width: 30 }}>
                  {m.direction === "penalty" ? `\u2212${Math.abs(m.points)}` : `+${m.points}`}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: INK }}>{m.label}</Text>
                  <Text style={{ fontSize: 8, color: INK_60 }}>{m.rationale}</Text>
                  <Text style={{ fontSize: 8, color: INK_40 }}>{m.panels.join(" + ").toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Methodology */}
      <View style={{ borderWidth: 0.5, borderColor: INK_12, padding: 12 }}>
        <Text style={[s.secLabel, { marginBottom: 8 }]}>Scoring Methodology</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { label: "Blood · 40 pts", color: RED, body: "Cardiovascular and metabolic biomarkers (LabCorp/Quest)." },
            { label: "Sleep · 30 pts", color: BLUE, body: "Wearable-derived HRV, deep sleep, REM, efficiency, SpO\u2082 (WHOOP/Oura)." },
            { label: "Oral · 30 pts", color: GREEN, body: "16S rRNA microbiome sequencing via Zymo Research." },
          ].map(m => (
            <View key={m.label} style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: m.color, marginBottom: 3 }}>{m.label}</Text>
              <Text style={s.bodyS}>{m.body}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.bodyS, { marginTop: 8, color: INK_40 }]}>
          Modifiers (\u00b110 pts) apply when cross-panel signals compound risk. Engine v{data.engineVersion} \u00b7 {fmtDate(data.calculatedAt)}
        </Text>
      </View>

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 2: Blood ────────────────────────────────────────────────────────────

function BloodPage({ data }: { data: ReportData }) {
  const labs = data.labs ?? {}
  const val = (key: string): number | null => {
    const v = labs[key]
    return v != null && Number(v) !== 0 ? Number(v) : null
  }
  const CW = [CONTENT_W * 0.35, CONTENT_W * 0.14, CONTENT_W * 0.14, CONTENT_W * 0.24, CONTENT_W * 0.13]

  const ctxMarkers = BLOOD_MARKERS.filter(m => {
    const st = bloodSt(m.key, val(m.key))
    return (st === "WATCH" || st === "ELEVATED") && BLOOD_CTX[m.key]
  })

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader left="Blood Panel" right={`${data.labName ?? "Lab"} \u00b7 Collection date: ${fmtDate(data.collectionDate)}`} />

      {data.labs == null ? (
        <Text style={[s.body, { color: INK_40, fontStyle: "italic" }]}>No blood panel on file.</Text>
      ) : (
        <>
          <View style={s.tblHdr}>
            {["Marker", "Result", "Unit", "Reference", "Status"].map((h, i) => (
              <Text key={h} style={[s.tblHdrCell, { width: CW[i] }]}>{h}</Text>
            ))}
          </View>
          {BLOOD_MARKERS.map(m => {
            const v = val(m.key)
            const st = bloodSt(m.key, v)
            return (
              <View key={m.key} style={s.tblRow}>
                <Text style={[s.tblCell, { width: CW[0] }]}>{m.label}</Text>
                <Text style={[s.tblCell, { width: CW[1], fontFamily: "Helvetica-Bold" }]}>{v != null ? n(v) : "\u2014"}</Text>
                <Text style={[s.tblCell, { width: CW[2], color: INK_40 }]}>{m.unit}</Text>
                <Text style={[s.tblCell, { width: CW[3], fontSize: 8, color: INK_40 }]}>{m.reference}</Text>
                <View style={{ width: CW[4] }}><Badge st={st} /></View>
              </View>
            )
          })}

          {ctxMarkers.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[s.secLabel, { marginBottom: 10 }]}>Clinical Context</Text>
              {ctxMarkers.map(m => {
                const ctx = BLOOD_CTX[m.key]!
                return (
                  <View key={m.key} style={s.ctx}>
                    <Text style={s.ctxTitle}>{m.label} {val(m.key) != null ? n(val(m.key)) : "\u2014"} {m.unit} \u2014 {bloodSt(m.key, val(m.key))}</Text>
                    <Text style={s.ctxBody}>{ctx.body}</Text>
                    <Text style={s.ctxSrc}>[{ctx.src}]</Text>
                  </View>
                )
              })}
            </View>
          )}
        </>
      )}

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 3: Sleep ────────────────────────────────────────────────────────────

function sleepSt(key: "hrv" | "deep" | "rem" | "efficiency" | "spo2", v: number): Status {
  if (v === 0) return "NOT TESTED"
  const r: Record<string, (x: number) => Status> = {
    hrv:        x => x >= 60 ? "OPTIMAL" : x >= 40 ? "GOOD" : x >= 20 ? "WATCH" : "ELEVATED",
    deep:       x => x >= 22 ? "OPTIMAL" : x >= 17 ? "GOOD" : x >= 10 ? "WATCH" : "ELEVATED",
    rem:        x => x >= 25 ? "OPTIMAL" : x >= 18 ? "GOOD" : x >= 12 ? "WATCH" : "ELEVATED",
    efficiency: x => x >= 85 ? "OPTIMAL" : x >= 78 ? "GOOD" : x >= 70 ? "WATCH" : "ELEVATED",
    spo2:       x => x >= 96 ? "OPTIMAL" : x >= 94 ? "GOOD" : x >= 90 ? "WATCH" : "ELEVATED",
  }
  return r[key](v)
}

function SleepPage({ data }: { data: ReportData }) {
  const avg = data.sleepAverages
  const noSleep = avg.trackedNights === 0
  const CW = [CONTENT_W * 0.28, CONTENT_W * 0.13, CONTENT_W * 0.17, CONTENT_W * 0.18, CONTENT_W * 0.12, CONTENT_W * 0.12]

  const metrics: Array<{ label: string; value: number; unit: string; target: string; key: "hrv" | "deep" | "rem" | "efficiency" | "spo2" }> = [
    { label: "Deep sleep",       value: avg.avgDeepPct,    unit: "% of TST", target: "\u226517%",  key: "deep" },
    { label: "HRV (RMSSD)",      value: avg.avgHrv,        unit: "ms",       target: "age-adj.",  key: "hrv" },
    { label: "SpO\u2082 (avg)",  value: avg.avgSpo2,       unit: "%",        target: "\u226596%",  key: "spo2" },
    { label: "REM sleep",        value: avg.avgRemPct,     unit: "% of TST", target: "\u226518%",  key: "rem" },
    { label: "Sleep efficiency", value: avg.avgEfficiency, unit: "% in bed", target: "\u226585%",  key: "efficiency" },
  ]

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        left={`Sleep & Recovery \u00b7 ${avg.provider ? avg.provider.toUpperCase() : "Wearable"} \u00b7 30-day weighted avg`}
        right={avg.lastSyncDate ? `Last sync: ${fmtDate(avg.lastSyncDate)}` : undefined}
      />

      {noSleep ? (
        <Text style={[s.body, { color: INK_40, fontStyle: "italic" }]}>No wearable data on file. Connect a wearable device in Oravi.</Text>
      ) : (
        <>
          <View style={s.tblHdr}>
            {["Metric", "Value", "Unit", "Target", "Status"].map((h, i) => (
              <Text key={h} style={[s.tblHdrCell, { width: CW[i] }]}>{h}</Text>
            ))}
          </View>
          {metrics.map(m => {
            const st: Status = m.value === 0 ? "NOT TESTED" : sleepSt(m.key, m.value)
            return (
              <View key={m.label} style={s.tblRow}>
                <Text style={[s.tblCell, { width: CW[0] }]}>{m.label}</Text>
                <Text style={[s.tblCell, { width: CW[1], fontFamily: "Helvetica-Bold" }]}>{m.value === 0 ? "\u2014" : n(m.value)}</Text>
                <Text style={[s.tblCell, { width: CW[2], color: INK_40 }]}>{m.unit}</Text>
                <Text style={[s.tblCell, { width: CW[3], fontSize: 9, color: INK_40 }]}>{m.target}</Text>
                <View style={{ width: CW[4] }}><Badge st={st} /></View>
              </View>
            )
          })}

          {/* 30-night summary tiles */}
          <View style={{ backgroundColor: WARM, padding: 12, marginTop: 14, marginBottom: 14 }}>
            <Text style={[s.secLabel, { marginBottom: 8 }]}>30-Night Summary</Text>
            <View style={{ flexDirection: "row", gap: 24 }}>
              {[
                ["Nights tracked", String(avg.trackedNights)],
                ["Avg total sleep", `${n(avg.avgTotalHours)} hrs`],
                ["Provider", avg.provider.toUpperCase()],
                ["Last sync", fmtDate(avg.lastSyncDate)],
              ].map(([label, value]) => (
                <View key={label}>
                  <Text style={{ fontSize: 8, color: INK_40 }}>{label}</Text>
                  <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: INK }}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Clinical context for low HRV / low deep sleep */}
          {(avg.avgHrv > 0 && avg.avgHrv < 40) && (
            <View style={s.ctx}>
              <Text style={s.ctxTitle}>HRV {n(avg.avgHrv)} ms RMSSD \u2014 WATCH</Text>
              <Text style={s.ctxBody}>Below age-adjusted target. Low HRV reflects reduced autonomic resilience and is associated with cardiovascular risk. Consistent sleep timing (variance {"<"}30 min) shifts RMSSD 5\u20138 ms over 4 weeks. Oral nitrate-reducing bacteria modulate autonomic tone through the nitric oxide pathway.</Text>
              <Text style={s.ctxSrc}>[Shaffer & Ginsberg, Front. Public Health 2017; Dalton 2025 n=1,139]</Text>
            </View>
          )}
          {(avg.avgDeepPct > 0 && avg.avgDeepPct < 17) && (
            <View style={s.ctx}>
              <Text style={s.ctxTitle}>Deep sleep {n(avg.avgDeepPct)}% of TST \u2014 WATCH</Text>
              <Text style={s.ctxBody}>Below the 17% clinical target. N3 sleep is the primary window for growth hormone secretion, memory consolidation, and glymphatic clearance. Alcohol, late eating, and high sympathetic tone are common suppressors.</Text>
              <Text style={s.ctxSrc}>[Walker MP, Why We Sleep 2017; Xie L, Science 2013]</Text>
            </View>
          )}
        </>
      )}

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 4: Oral ─────────────────────────────────────────────────────────────

function oralSt(key: "shannon" | "nitrate" | "periodontal" | "osa", v: number | null): Status {
  if (v == null) return "NOT TESTED"
  const r: Record<string, (x: number) => Status> = {
    shannon:     x => x >= 3.0 ? "OPTIMAL" : x >= 2.0 ? "GOOD" : x >= 1.5 ? "WATCH" : "ELEVATED",
    nitrate:     x => x >= 20 ? "OPTIMAL" : x >= 15 ? "GOOD" : x >= 10 ? "WATCH" : "ELEVATED",
    periodontal: x => x < 0.5 ? "OPTIMAL" : x < 1.0 ? "GOOD" : x < 1.5 ? "WATCH" : "ELEVATED",
    osa:         x => x < 2.0 ? "OPTIMAL" : x < 5.0 ? "GOOD" : x < 8.0 ? "WATCH" : "ELEVATED",
  }
  return r[key](v)
}

function OralPage({ data }: { data: ReportData }) {
  const sp = (k: string) => data.rawOtu?.[k] ?? 0
  const gingivalis  = sp("Porphyromonas gingivalis")
  const denticola   = sp("Treponema denticola")
  const forsythia   = sp("Tannerella forsythia")
  const fusobact    = sp("Fusobacterium nucleatum")
  const prevotella  = sp("Prevotella melaninogenica")
  const neisseria   = sp("Neisseria subflava") + sp("Neisseria flavescens")
  const rothia      = sp("Rothia mucilaginosa")
  const salivarius  = sp("Streptococcus salivarius")

  const CW = [CONTENT_W * 0.34, CONTENT_W * 0.14, CONTENT_W * 0.14, CONTENT_W * 0.18, CONTENT_W * 0.20]

  const dims: Array<{ label: string; value: string; unit: string; target: string; st: Status }> = [
    { label: "D1  Shannon diversity",  value: data.shannonDiversity != null ? n(data.shannonDiversity, 2) : "\u2014", unit: "index",   target: "\u22653.0", st: oralSt("shannon", data.shannonDiversity) },
    { label: "D2  Nitrate reducers",   value: data.nitrateReducerPct != null ? n(data.nitrateReducerPct, 1) : "\u2014", unit: "% reads", target: "\u226520%", st: oralSt("nitrate", data.nitrateReducerPct) },
    { label: "D3  Periodontal burden", value: data.periodontopathogenPct != null ? n(data.periodontopathogenPct, 2) : "\u2014", unit: "%", target: "<0.5%", st: oralSt("periodontal", data.periodontopathogenPct) },
    { label: "D4  OSA-associated taxa", value: data.osaTaxaPct != null ? n(data.osaTaxaPct, 2) : "\u2014", unit: "%", target: "<2.0%", st: oralSt("osa", data.osaTaxaPct) },
    { label: "D5  Neurological balance", value: data.neuroSignalPct != null ? n(data.neuroSignalPct, 2) : "\u2014", unit: "%", target: "<0.1%", st: data.neuroSignalPct == null ? "NOT TESTED" : data.neuroSignalPct < 0.1 ? "OPTIMAL" : "WATCH" },
    { label: "D6  Metabolic balance",  value: data.metabolicSignalPct != null ? n(data.metabolicSignalPct, 2) : "\u2014", unit: "%", target: "target", st: data.metabolicSignalPct == null ? "NOT TESTED" : "GOOD" },
    { label: "D7  Cellular environment", value: data.proliferativeSignalPct != null ? n(data.proliferativeSignalPct, 2) : "\u2014", unit: "%", target: "target", st: data.proliferativeSignalPct == null ? "NOT TESTED" : "GOOD" },
  ]

  const speciesRows: Array<{ name: string; val: number; st: Status; role: string }> = [
    { name: "P. gingivalis", val: gingivalis, st: gingivalis > 1 ? "ELEVATED" : gingivalis > 0.5 ? "WATCH" : "GOOD", role: "Primary periodontal pathogen" },
    { name: "T. denticola",  val: denticola,  st: denticola > 1 ? "ELEVATED" : denticola > 0.5 ? "WATCH" : "GOOD",   role: "Periodontal pathogen" },
    { name: "T. forsythia",  val: forsythia,  st: forsythia > 1 ? "ELEVATED" : forsythia > 0.5 ? "WATCH" : "GOOD",   role: "Periodontal pathogen" },
    { name: "F. nucleatum",  val: fusobact,   st: fusobact > 5 ? "ELEVATED" : fusobact > 2 ? "WATCH" : "GOOD",       role: "Systemic inflammation marker" },
    { name: "Prevotella spp.", val: prevotella, st: prevotella > 5 ? "WATCH" : "GOOD",                              role: "Metabolic signal" },
    { name: "Neisseria spp.", val: neisseria, st: neisseria >= 10 ? "OPTIMAL" : neisseria >= 5 ? "GOOD" : "WATCH",   role: "Nitrate reducer" },
    { name: "Rothia spp.",   val: rothia,    st: rothia >= 5 ? "OPTIMAL" : rothia >= 2 ? "GOOD" : "WATCH",           role: "Nitrate reducer" },
    { name: "S. salivarius", val: salivarius, st: salivarius >= 5 ? "OPTIMAL" : salivarius >= 2 ? "GOOD" : "WATCH", role: "Protective species" },
  ].filter(r => r.val > 0)

  const SCW = [CONTENT_W * 0.36, CONTENT_W * 0.14, CONTENT_W * 0.16, CONTENT_W * 0.34]

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader left={`Oral Microbiome \u00b7 Zymo Research 16S rRNA${data.reportDate ? ` \u00b7 ${fmtDate(data.reportDate)}` : ""}`} />

      {data.shannonDiversity == null ? (
        <Text style={[s.body, { color: INK_40, fontStyle: "italic" }]}>No oral microbiome results on file. Order a Oravi oral kit to include microbiome data.</Text>
      ) : (
        <>
          {/* Dimensions */}
          <View style={s.tblHdr}>
            {["Dimension", "Value", "Unit", "Target", "Status"].map((h, i) => (
              <Text key={h} style={[s.tblHdrCell, { width: CW[i] }]}>{h}</Text>
            ))}
          </View>
          {dims.map(d => (
            <View key={d.label} style={s.tblRow}>
              <Text style={[s.tblCell, { width: CW[0] }]}>{d.label}</Text>
              <Text style={[s.tblCell, { width: CW[1], fontFamily: "Helvetica-Bold" }]}>{d.value}</Text>
              <Text style={[s.tblCell, { width: CW[2], color: INK_40 }]}>{d.unit}</Text>
              <Text style={[s.tblCell, { width: CW[3], fontSize: 9, color: INK_40 }]}>{d.target}</Text>
              <View style={{ width: CW[4] }}><Badge st={d.st} /></View>
            </View>
          ))}

          {/* Key species */}
          {speciesRows.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={[s.secLabel, { marginBottom: 6 }]}>Key Species Detected</Text>
              <View style={s.tblHdr}>
                {["Species", "% Reads", "Status", "Role"].map((h, i) => (
                  <Text key={h} style={[s.tblHdrCell, { width: SCW[i] }]}>{h}</Text>
                ))}
              </View>
              {speciesRows.map(r => (
                <View key={r.name} style={s.tblRow}>
                  <Text style={[s.tblCell, { width: SCW[0], fontStyle: "italic" }]}>{r.name}</Text>
                  <Text style={[s.tblCell, { width: SCW[1], fontFamily: "Helvetica-Bold" }]}>{n(r.val, 2)}%</Text>
                  <View style={{ width: SCW[2] }}><Badge st={r.st} /></View>
                  <Text style={[s.tblCell, { width: SCW[3], fontSize: 8, color: INK_40 }]}>{r.role}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Clinical context */}
          <View style={{ marginTop: 14 }}>
            <Text style={[s.secLabel, { marginBottom: 8 }]}>Clinical Context</Text>
            {gingivalis > 1 && (
              <View style={s.ctx}>
                <Text style={s.ctxTitle}>P. gingivalis {n(gingivalis, 2)}% \u2014 ELEVATED</Text>
                <Text style={s.ctxBody}>Detected inside human coronary artery plaques in epidemiological studies. Associated with cardiovascular risk through LPS-mediated inflammation and TLR4 activation.</Text>
                <Text style={s.ctxSrc}>[Hussain M et al., JACC 2023, n=1,791; Hajishengallis G, Nat Rev Immunol 2015]</Text>
              </View>
            )}
            {data.nitrateReducerPct != null && data.nitrateReducerPct < 15 && (
              <View style={s.ctx}>
                <Text style={s.ctxTitle}>Low nitrate reducers {n(data.nitrateReducerPct, 1)}% \u2014 below 20% functional threshold</Text>
                <Text style={s.ctxBody}>Oral nitrate-reducing bacteria (Neisseria, Rothia, Veillonella) are the primary route for dietary nitrate-to-nitric oxide conversion, supporting vascular tone and autonomic balance. Low levels may contribute to reduced HRV.</Text>
                <Text style={s.ctxSrc}>[Lundberg JO et al., Nat Rev Drug Discov 2008; Bryan NS, Free Radic Biol Med 2012]</Text>
              </View>
            )}
            {data.shannonDiversity != null && data.shannonDiversity < 2.5 && (
              <View style={s.ctx}>
                <Text style={s.ctxTitle}>Shannon diversity {n(data.shannonDiversity, 2)} \u2014 below optimal (\u22653.0)</Text>
                <Text style={s.ctxBody}>Low oral microbiome diversity is associated with periodontal disease and systemic inflammatory burden. Antiseptic mouthwash and antibiotics are common suppressors.</Text>
                <Text style={s.ctxSrc}>[Zaura E, J Dent Res 2009; Sharma N, PLoS ONE 2018]</Text>
              </View>
            )}
          </View>
        </>
      )}

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 5: Cross-Panel Signals ─────────────────────────────────────────────

function CrossPanelPage({ data }: { data: ReportData }) {
  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader left="Cross-Panel Signals" />

      <Text style={[s.secLabel, { marginBottom: 12 }]}>Active Modifiers</Text>

      {data.modifiersApplied.length === 0 ? (
        <Text style={[s.body, { color: INK_40, fontStyle: "italic" }]}>No active modifiers. Modifiers appear when signals across two or more panels compound risk.</Text>
      ) : (
        <>
          {data.modifiersApplied.map((m, i) => (
            <View key={i} style={{ flexDirection: "row", borderWidth: 0.5, borderColor: INK_12, padding: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: m.direction === "penalty" ? RED : GREEN, width: 36 }}>
                {m.direction === "penalty" ? `\u2212${Math.abs(m.points)}` : `+${m.points}`}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 3 }}>{m.label}</Text>
                <Text style={{ fontSize: 9, color: INK_60, lineHeight: 1.5 }}>{m.rationale}</Text>
                <Text style={{ fontSize: 8, color: INK_40, marginTop: 3 }}>{m.panels.join(" \u00b7 ").toUpperCase()}</Text>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: INK_40 }}>Total modifier impact: </Text>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: data.modifierTotal < 0 ? RED : GREEN }}>
              {data.modifierTotal > 0 ? `+${data.modifierTotal}` : data.modifierTotal} pts
            </Text>
          </View>
        </>
      )}

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 6: Lifestyle + Disclaimer ──────────────────────────────────────────

function LifestylePage({ data }: { data: ReportData }) {
  const fmt = (map: Record<string, string>, v: string | null) => (v ? (map[v] ?? v) : "\u2014")

  const AGE   = { "18_29": "18\u201329", "30_39": "30\u201339", "40_49": "40\u201349", "50_59": "50\u201359", "60_69": "60\u201369", "70_plus": "70+" }
  const EXER  = { none: "None", low: "Low", moderate: "Moderate", high: "High" }
  const SMOKE = { never: "Never", former: "Former smoker", current: "Current smoker" }
  const BRUSH = { once_daily: "Once daily", twice_daily: "Twice daily", less_than_daily: "Less than daily" }
  const FLOSS = { never: "Never / rarely", occasional: "Occasional", daily: "Daily" }
  const MWASH = { none: "None", fluoride: "Fluoride", antiseptic: "Antiseptic (Listerine / CHX)", natural: "Natural / alcohol-free" }
  const DENT  = { within_6_months: "Within 6 months", within_one_year: "Within 1 year", over_one_year: "Over 1 year ago", never: "Never" }

  const rows: Array<[string, string]> = [
    ["Age range",          fmt(AGE,   data.ageRange)],
    ["Exercise level",     fmt(EXER,  data.exerciseLevel)],
    ["Smoking status",     fmt(SMOKE, data.smokingStatus)],
    ["Brushing frequency", fmt(BRUSH, data.brushingFreq)],
    ["Flossing frequency", fmt(FLOSS, data.flossingFreq)],
    ["Mouthwash type",     fmt(MWASH, data.mouthwashType)],
    ["Last dental visit",  fmt(DENT,  data.lastDentalVisit)],
    ["Known hypertension", data.knownHypertension == null ? "\u2014" : data.knownHypertension ? "Yes" : "No"],
    ["Known diabetes",     data.knownDiabetes == null ? "\u2014" : data.knownDiabetes ? "Yes" : "No"],
  ]

  const labs = data.labs ?? {}
  const missing: Array<[string, string, string]> = []
  if (!labs.hba1c_pct)             missing.push(["HbA1c",     "Metabolic health marker",       "\u223c3 pts"])
  if (!labs.apob_mgdl)             missing.push(["ApoB",      "Atherogenic particle count",    "\u223c3 pts"])
  if (!labs.vitamin_d_ngml)        missing.push(["Vitamin D", "Immune and cardiovascular",     "\u223c2 pts"])

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader left="Lifestyle Context & Disclaimer" />

      <Text style={[s.secLabel, { marginBottom: 8 }]}>Lifestyle Context (Self-Reported)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {rows.map(([label, value]) => (
          <View key={label} style={{ width: "50%", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: INK_12, paddingRight: 10 }}>
            <Text style={{ fontSize: 9, color: INK_40 }}>{label}</Text>
            <Text style={{ fontSize: 9, color: INK, fontFamily: "Helvetica-Bold" }}>{value}</Text>
          </View>
        ))}
      </View>

      {missing.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <Text style={[s.secLabel, { marginBottom: 8 }]}>What to Add Next</Text>
          {missing.map(([marker, desc, pts]) => (
            <View key={marker} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: INK_12 }}>
              <View>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: INK }}>{marker}</Text>
                <Text style={{ fontSize: 9, color: INK_40 }}>{desc}</Text>
              </View>
              <Text style={{ fontSize: 10, color: GOLD }}>{pts}</Text>
            </View>
          ))}
        </View>
      )}

      <HR />

      <View style={{ marginTop: 12, borderTopWidth: 0.5, borderTopColor: INK_20, paddingTop: 14 }}>
        <Text style={[s.secLabel, { marginBottom: 6 }]}>Disclaimer</Text>
        <Text style={{ fontSize: 9, color: INK_40, lineHeight: 1.7 }}>
          This report is generated by Oravi for informational purposes only and is intended to support conversations with your healthcare provider. It is not a medical diagnosis, treatment recommendation, or clinical document. All findings should be reviewed in the context of the patient{"\u2019"}s complete medical history by a qualified physician or dentist.{"\n\n"}Scoring methodology, scientific citations, and full platform documentation available at oravi.health/science
        </Text>
      </View>

      <View style={{ marginTop: 20, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 8, color: INK_40 }}>Oravi \u00b7 oravi.health</Text>
        <Text style={{ fontSize: 8, color: INK_40 }}>Generated {today}</Text>
      </View>

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function buildReportDocument(data: ReportData, logoBase64: string | null) {
  return (
    <Document title={`Oravi Report \u2014 ${data.fullName}`} author="Oravi" creator="oravi.health">
      <CoverPage data={data} logo={logoBase64} />
      <BloodPage data={data} />
      <SleepPage data={data} />
      <OralPage data={data} />
      <CrossPanelPage data={data} />
      <LifestylePage data={data} />
    </Document>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx jest report-data.test.ts --no-coverage 2>&1 | tail -8
```

Expected: `Tests: 7 passed, 7 total`

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/account/export/report-pdf.tsx apps/web/app/api/account/export/report-data.test.ts
git commit -m "feat: 6-page @react-pdf/renderer clinical report document"
```

---

### Task 4: Replace route.ts — POST for PDF download and email

**Files:**
- Replace: `apps/web/app/api/account/export/route.ts`
- Test: `apps/web/app/api/account/export/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/app/api/account/export/route.test.ts`:

```typescript
// Must mock ESM packages before any imports
jest.mock('@react-pdf/renderer', () => ({
  pdf: jest.fn().mockReturnValue({ toBuffer: jest.fn().mockResolvedValue(Buffer.from('%PDF-mock')) }),
  Document: ({ children }: { children: unknown }) => children,
  Page: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  View: ({ children }: { children: unknown }) => children,
  Image: () => null,
  StyleSheet: { create: (x: unknown) => x },
  Font: { register: jest.fn() },
}))

jest.mock('./report-data', () => ({
  fetchReportData: jest.fn().mockResolvedValue({
    fullName: 'Test Patient', email: 'test@example.com',
    score: 62, baseScore: 66, sleepSub: 18, bloodSub: 32, oralSub: 16,
    modifierTotal: 0, modifiersApplied: [], engineVersion: '8.1', calculatedAt: '',
    labs: null, labName: null, collectionDate: null,
    sleepAverages: { trackedNights: 0, provider: '', avgHrv: 0, avgEfficiency: 0, avgDeepPct: 0, avgRemPct: 0, avgSpo2: 0, avgTotalHours: 0, lastSyncDate: null },
    shannonDiversity: null, nitrateReducerPct: null, periodontopathogenPct: null, osaTaxaPct: null,
    neuroSignalPct: null, metabolicSignalPct: null, proliferativeSignalPct: null,
    rawOtu: null, reportDate: null, oralScoreSnapshot: null,
    ageRange: null, exerciseLevel: null, smokingStatus: null, brushingFreq: null,
    flossingFreq: null, mouthwashType: null, lastDentalVisit: null,
    knownHypertension: null, knownDiabetes: null,
  }),
  computeSleepAverages: jest.fn(),
}))

jest.mock('./report-pdf', () => ({
  buildReportDocument: jest.fn().mockReturnValue(null),
}))

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-logo')),
}))

const mockEmailSend = jest.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null })
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockEmailSend } })),
}))

jest.mock('../../../../lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { POST, GET } from './route'
import { createClient } from '../../../../lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function makeAuthClient() {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
  }
}

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/account/export', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/account/export', () => {
  beforeEach(() => {
    mockEmailSend.mockClear()
    mockCreateClient.mockResolvedValue(makeAuthClient() as never)
  })

  it('returns PDF with correct headers for download', async () => {
    const res = await POST(makeRequest({ sendEmail: false }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment.*\.pdf/)
  })

  it('returns 401 when not authenticated', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    const res = await POST(makeRequest({ sendEmail: false }))
    expect(res.status).toBe(401)
  })

  it('calls Resend.emails.send with PDF attachment when sendEmail=true', async () => {
    const res = await POST(makeRequest({ sendEmail: true, recipientEmail: 'doc@clinic.com', recipientName: 'Dr. Jones' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { sent: boolean; to: string }
    expect(body.sent).toBe(true)
    expect(body.to).toBe('doc@clinic.com')
    expect(mockEmailSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'doc@clinic.com',
      attachments: expect.arrayContaining([
        expect.objectContaining({ filename: expect.stringMatching(/\.pdf$/) }),
      ]),
    }))
  })

  it('returns 500 when Resend returns an error', async () => {
    mockEmailSend.mockResolvedValueOnce({ data: null, error: { message: 'Invalid API key' } })
    const res = await POST(makeRequest({ sendEmail: true, recipientEmail: 'doc@clinic.com' }))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/account/export', () => {
  it('returns 405', async () => {
    const res = await GET()
    expect(res.status).toBe(405)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web && npx jest route.test.ts --testPathPattern="account/export" --no-coverage 2>&1 | tail -5
```

Expected: `FAIL` — `Cannot find module './route'` or missing exports

- [ ] **Step 3: Replace route.ts**

Replace `apps/web/app/api/account/export/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { pdf } from "@react-pdf/renderer"
import fs from "fs"
import path from "path"
import { Resend } from "resend"
import { fetchReportData } from "./report-data"
import { buildReportDocument } from "./report-pdf"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as {
    sendEmail?: boolean
    recipientEmail?: string
    recipientName?: string
  }

  const reportData = await fetchReportData(user.id, supabase)

  // Load logo from public/ — fails gracefully if missing
  let logoBase64: string | null = null
  try {
    const logoPath = path.join(process.cwd(), "public", "images", "peaq_logo_transparent.png")
    logoBase64 = fs.readFileSync(logoPath).toString("base64")
  } catch {
    // PDF renders without logo
  }

  const doc = buildReportDocument(reportData, logoBase64)
  const pdfBuffer = await pdf(doc).toBuffer()

  const dateStr = new Date().toISOString().split("T")[0]
  const safeName = reportData.fullName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-").toLowerCase()
  const filename = `peaq-health-report-${safeName}-${dateStr}.pdf`

  // Email path
  if (body.sendEmail && body.recipientEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: process.env.REPORT_FROM_EMAIL ?? "reports@oravi.health",
      to: body.recipientEmail,
      subject: `Oravi Report — ${reportData.fullName}`,
      text: [
        `Please find attached the Oravi personal health report for ${reportData.fullName},`,
        `generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
        "",
        "This report includes blood biomarker analysis, sleep & recovery data, and oral microbiome",
        "sequencing results with cross-panel clinical context.",
        "",
        `Oravi Score: ${reportData.score} / 100  —  Blood ${reportData.bloodSub}pts · Sleep ${reportData.sleepSub}pts · Oral ${reportData.oralSub}pts`,
        "",
        "Oravi · oravi.health",
      ].join("\n"),
      attachments: [{ filename, content: pdfBuffer.toString("base64") }],
    })

    if (error) {
      console.error("[export] Resend error:", error)
      return NextResponse.json({ error: "Failed to send email", detail: (error as { message?: string }).message }, { status: 500 })
    }

    return NextResponse.json({ sent: true, to: body.recipientEmail })
  }

  // Download path
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  })
}

// Backwards-compatible stub — old GET callers get a clear error
export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx jest route.test.ts --testPathPattern="account/export" --no-coverage 2>&1 | tail -8
```

Expected: `Tests: 5 passed, 5 total`

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/account/export/route.ts apps/web/app/api/account/export/route.test.ts
git commit -m "feat: POST export route — PDF download + Resend email with attachment"
```

---

### Task 5: Create ExportModal component

**Files:**
- Create: `apps/web/app/components/export-modal.tsx`

- [ ] **Step 1: Create export-modal.tsx**

Create `apps/web/app/components/export-modal.tsx`:

```tsx
"use client"

import { useState } from "react"

interface ExportModalProps {
  onClose: () => void
}

export function ExportModal({ onClose }: ExportModalProps) {
  const [email, setEmail] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (sendEmail: boolean) => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/account/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendEmail,
          recipientEmail: sendEmail ? email : null,
          recipientName: sendEmail ? recipientName : null,
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? "Something went wrong. Please try again.")
        return
      }

      if (sendEmail) {
        setSent(true)
      } else {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `peaq-health-report-${new Date().toISOString().split("T")[0]}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        onClose()
      }
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: "var(--white)", borderRadius: 12, padding: "28px 32px", maxWidth: 440, width: "100%", margin: "0 16px" }}>
        <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 20, marginBottom: 6, color: "var(--ink)" }}>
          Export health report
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-40)", marginBottom: 20, lineHeight: 1.6 }}>
          Download your full Oravi report or send it directly to your physician or dentist.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-40)", display: "block", marginBottom: 6 }}>
            Send to physician (optional)
          </label>
          <input
            type="text"
            placeholder="Dr. Smith"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "0.5px solid var(--ink-20)", borderRadius: 6, fontSize: 13, marginBottom: 8, boxSizing: "border-box", background: "var(--white)", color: "var(--ink)", outline: "none" }}
          />
          <input
            type="email"
            placeholder="physician@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "0.5px solid var(--ink-20)", borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: "var(--white)", color: "var(--ink)", outline: "none" }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "var(--blood-c, #C0392B)", marginBottom: 12 }}>{error}</p>
        )}

        {sent ? (
          <p style={{ fontSize: 13, color: "#1D9E75", padding: "10px 0" }}>✓ Report sent to {email}</p>
        ) : (
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {email && (
              <button
                onClick={() => handleExport(true)}
                disabled={sending}
                style={{ flex: 1, padding: 10, background: "var(--ink)", color: "var(--white)", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500, opacity: sending ? 0.5 : 1 }}
              >
                {sending ? "Sending…" : "Send to physician"}
              </button>
            )}
            <button
              onClick={() => handleExport(false)}
              disabled={sending}
              style={{ flex: 1, padding: 10, background: "transparent", color: "var(--ink)", border: "0.5px solid var(--ink-20)", borderRadius: 6, fontSize: 13, cursor: "pointer", opacity: sending ? 0.5 : 1 }}
            >
              {sending ? "Building…" : "Download PDF"}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: 12, width: "100%", padding: 8, background: "transparent", border: "none", color: "var(--ink-30)", fontSize: 12, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep export-modal
```

Expected: no output (no errors for this file)

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/components/export-modal.tsx
git commit -m "feat: ExportModal with physician email and download PDF"
```

---

### Task 6: Wire ExportModal into settings page

**Files:**
- Modify: `apps/web/app/settings/settings-client.tsx`

The current file has `buildReportHtml` (a large HTML template function) and `exportData` (which calls the old GET route). Both are deleted. The export `RowItem` button is rewired to open the modal.

- [ ] **Step 1: Add import at the top of the file**

In `apps/web/app/settings/settings-client.tsx`, add to the import block (after the existing imports):

```tsx
import { ExportModal } from "../components/export-modal"
```

- [ ] **Step 2: Delete buildReportHtml**

Delete the entire `buildReportHtml` function. It starts at the comment `// ─── Report generator` (around line 86) and ends just before `// ─── Main settings component`. This is approximately lines 86–351.

- [ ] **Step 3: Delete exportData and exporting state**

Inside `SettingsClient`:

Delete: `const [exporting, setExporting] = useState(false)`

Delete: the entire `const exportData = async () => { ... }` function (lines 429–446 approximately).

- [ ] **Step 4: Add exportModalOpen state**

After the other `useState` declarations inside `SettingsClient`, add:

```tsx
const [exportModalOpen, setExportModalOpen] = useState(false)
```

- [ ] **Step 5: Replace the export RowItem button**

Find the RowItem with `label="Export health report"` (around line 561 in the original, adjusted after deletions). Replace its `right` prop's button content:

Change:
```tsx
<button
  onClick={exportData}
  disabled={exporting}
  className="h-8 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
  style={{ border: "0.5px solid var(--ink-30)", color: "var(--ink)" }}
>
  {exporting ? "Building…" : "Export"}
</button>
```

To:
```tsx
<button
  onClick={() => setExportModalOpen(true)}
  className="h-8 px-4 font-body text-[10px] uppercase tracking-[0.1em] font-medium transition-opacity hover:opacity-70"
  style={{ border: "0.5px solid var(--ink-30)", color: "var(--ink)" }}
>
  Export
</button>
```

- [ ] **Step 6: Add modal to render output**

Inside the `return (...)` JSX, just before the final closing `</div>` of the root element, add:

```tsx
{exportModalOpen && (
  <ExportModal onClose={() => setExportModalOpen(false)} />
)}
```

- [ ] **Step 7: Verify TypeScript and run tests**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "settings-client|ExportModal|error"
```

Expected: no errors.

```bash
cd apps/web && npm test 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/settings/settings-client.tsx
git commit -m "feat: wire ExportModal in settings, remove legacy buildReportHtml + exportData"
```

---

## Self-Review

### Spec coverage

| Spec section | Covered by |
|---|---|
| Part 1 — Audit | Pre-planning research (completed) |
| Part 2 — All 6 data sources | Task 2 `fetchReportData()` |
| Part 3 — PDF generation approach | @react-pdf/renderer (Task 1 installs, Tasks 3–4 use) |
| Part 4 — Page 1 Cover + Score | `CoverPage` in report-pdf.tsx |
| Part 5 — Page 2 Blood Panel | `BloodPage` in report-pdf.tsx |
| Part 6 — Page 3 Sleep Data | `SleepPage` in report-pdf.tsx |
| Part 7 — Page 4 Oral Microbiome | `OralPage` in report-pdf.tsx |
| Part 8 — Page 5 Cross-Panel | `CrossPanelPage` in report-pdf.tsx |
| Part 9 — Page 6 Lifestyle + Disclaimer | `LifestylePage` in report-pdf.tsx |
| Part 10 — Email to physician | `ExportModal` (Task 5) + route.ts Resend branch (Task 4) |
| Part 11 — Logo | `fs.readFileSync` in route.ts + `CoverPage` renders it |
| Part 12 — Verify | Run tests + manual test with real user |

### Notes on spec deviations

- **`whoop_sleep_data`** in the spec → actual table is `sleep_data` (confirmed from `dashboard/page.tsx`)
- **`profiles.full_name`** in the spec → actual columns are `first_name, last_name` (confirmed from existing routes)
- **`results_date`** in the oral query → actual column is `report_date` (confirmed from `oral-panel-client.tsx`)
- **reportlab / puppeteer** in the spec → neither is set up; `@react-pdf/renderer` is used instead (Node.js native, Vercel-compatible)
- Part 12 "generate for Igor" step requires live env vars — not scripted in the plan; run manually after deploy

---

## Execution Handoff

Plan saved. Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, two-stage review between tasks

**2. Inline Execution** — Execute tasks in this session using executing-plans

Which approach?

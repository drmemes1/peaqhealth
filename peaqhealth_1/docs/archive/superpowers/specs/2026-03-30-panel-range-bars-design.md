# Panel Range Bars & Oral Audit — Design Spec
**Date:** 2026-03-30
**Status:** Approved

## Overview

Three targeted UI improvements: replicate the clinical zone range bar from the dashboard blood panel onto the `/dashboard/blood` page and the dashboard sleep panel; audit the `/dashboard/oral` page (add range bars to metric cards, remove three low-value emerging-research dimension cards).

---

## Change 1 — `/dashboard/blood`: zone range bars

**File:** `app/dashboard/blood/blood-panel-client.tsx`

The current `MarkerRow` component renders a minimal spectrum bar: a thin horizontal line, an optimal-zone rectangle, and a positioned dot. Replace with the same segmented zone bar used in `score-wheel/index.tsx`.

### New `BLOOD_ZONES` constant

Add a `BLOOD_ZONES` record at the top of `blood-panel-client.tsx` (self-contained — no shared module). Mirrors the structure already used in `score-wheel/index.tsx`:

```ts
const BLOOD_ZONES: Record<string, {
  zones: { label: string; color: string; min: number; max: number }[]
  markerColor: string
}> = {
  ldl_mgdl:            { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 70 }, { label: 'Good', color: '#FFF3CD', min: 70, max: 100 }, { label: 'Watch', color: '#FFE0B2', min: 100, max: 130 }, { label: 'High', color: '#FFCDD2', min: 130, max: 200 }] },
  hdl_mgdl:            { markerColor: '#2D6A4F', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 40 }, { label: 'Watch', color: '#FFE0B2', min: 40, max: 50 }, { label: 'Good', color: '#FFF3CD', min: 50, max: 60 }, { label: 'Optimal', color: '#D4EDDA', min: 60, max: 100 }] },
  triglycerides_mgdl:  { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 100 }, { label: 'Good', color: '#FFF3CD', min: 100, max: 150 }, { label: 'Watch', color: '#FFE0B2', min: 150, max: 200 }, { label: 'High', color: '#FFCDD2', min: 200, max: 400 }] },
  apob_mgdl:           { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 80 }, { label: 'Good', color: '#FFF3CD', min: 80, max: 100 }, { label: 'Watch', color: '#FFE0B2', min: 100, max: 130 }, { label: 'High', color: '#FFCDD2', min: 130, max: 200 }] },
  lpa_mgdl:            { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 30 }, { label: 'Watch', color: '#FFE0B2', min: 30, max: 50 }, { label: 'High', color: '#FFCDD2', min: 50, max: 150 }] },
  totalcholesterol_mgdl:{ markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 200 }, { label: 'Good', color: '#FFF3CD', min: 200, max: 240 }, { label: 'High', color: '#FFCDD2', min: 240, max: 400 }] },
  hs_crp_mgl:          { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 0.5 }, { label: 'Good', color: '#FFF3CD', min: 0.5, max: 1.0 }, { label: 'Watch', color: '#FFE0B2', min: 1.0, max: 3.0 }, { label: 'High', color: '#FFCDD2', min: 3.0, max: 10.0 }] },
  wbc_kul:             { markerColor: '#4A7FB5', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 4 }, { label: 'Optimal', color: '#D4EDDA', min: 4, max: 10 }, { label: 'Watch', color: '#FFE0B2', min: 10, max: 15 }, { label: 'High', color: '#FFCDD2', min: 15, max: 20 }] },
  albumin_gdl:         { markerColor: '#2D6A4F', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 3.5 }, { label: 'Watch', color: '#FFE0B2', min: 3.5, max: 4.0 }, { label: 'Optimal', color: '#D4EDDA', min: 4.0, max: 5.5 }] },
  glucose_mgdl:        { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 65, max: 85 }, { label: 'Good', color: '#FFF3CD', min: 85, max: 99 }, { label: 'Watch', color: '#FFE0B2', min: 99, max: 125 }, { label: 'High', color: '#FFCDD2', min: 125, max: 200 }] },
  hba1c_pct:           { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 4, max: 5.4 }, { label: 'Good', color: '#FFF3CD', min: 5.4, max: 5.7 }, { label: 'Watch', color: '#FFE0B2', min: 5.7, max: 6.5 }, { label: 'High', color: '#FFCDD2', min: 6.5, max: 10 }] },
  fastinginsulin_uiuml:{ markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 2, max: 8 }, { label: 'Watch', color: '#FFE0B2', min: 8, max: 20 }, { label: 'High', color: '#FFCDD2', min: 20, max: 30 }] },
  uricacid_mgdl:       { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 3, max: 6 }, { label: 'Watch', color: '#FFE0B2', min: 6, max: 7 }, { label: 'High', color: '#FFCDD2', min: 7, max: 12 }] },
  egfr_mlmin:          { markerColor: '#4A7FB5', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 60 }, { label: 'Watch', color: '#FFE0B2', min: 60, max: 90 }, { label: 'Good', color: '#FFF3CD', min: 90, max: 105 }, { label: 'Optimal', color: '#D4EDDA', min: 105, max: 150 }] },
  creatinine_mgdl:     { markerColor: '#4A7FB5', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0.7, max: 1.3 }, { label: 'Watch', color: '#FFE0B2', min: 1.3, max: 1.5 }, { label: 'High', color: '#FFCDD2', min: 1.5, max: 3.0 }] },
  bun_mgdl:            { markerColor: '#4A7FB5', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 7, max: 20 }, { label: 'Watch', color: '#FFE0B2', min: 20, max: 30 }, { label: 'High', color: '#FFCDD2', min: 30, max: 50 }] },
  alt_ul:              { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 5, max: 33 }, { label: 'Watch', color: '#FFE0B2', min: 33, max: 56 }, { label: 'High', color: '#FFCDD2', min: 56, max: 100 }] },
  ast_ul:              { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 5, max: 33 }, { label: 'Watch', color: '#FFE0B2', min: 33, max: 40 }, { label: 'High', color: '#FFCDD2', min: 40, max: 100 }] },
  vitamin_d_ngml:      { markerColor: '#B8860B', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 20 }, { label: 'Watch', color: '#FFE0B2', min: 20, max: 30 }, { label: 'Good', color: '#FFF3CD', min: 30, max: 50 }, { label: 'Optimal', color: '#D4EDDA', min: 50, max: 100 }] },
  hemoglobin_gdl:      { markerColor: '#C0392B', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 12.0 }, { label: 'Watch', color: '#FFE0B2', min: 12.0, max: 13.5 }, { label: 'Good', color: '#FFF3CD', min: 13.5, max: 14.5 }, { label: 'Optimal', color: '#D4EDDA', min: 14.5, max: 18.0 }] },
  tsh_uiuml:           { markerColor: '#B8860B', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 0.5 }, { label: 'Optimal', color: '#D4EDDA', min: 0.5, max: 3.0 }, { label: 'Watch', color: '#FFE0B2', min: 3.0, max: 4.0 }, { label: 'High', color: '#FFCDD2', min: 4.0, max: 8.0 }] },
  testosterone_ngdl:   { markerColor: '#4A7FB5', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 300 }, { label: 'Watch', color: '#FFE0B2', min: 300, max: 400 }, { label: 'Good', color: '#FFF3CD', min: 400, max: 700 }, { label: 'Optimal', color: '#D4EDDA', min: 700, max: 1200 }] },
  ferritin_ngml:       { markerColor: '#B8860B', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 20 }, { label: 'Watch', color: '#FFE0B2', min: 20, max: 30 }, { label: 'Good', color: '#FFF3CD', min: 30, max: 100 }, { label: 'Optimal', color: '#D4EDDA', min: 100, max: 300 }] },
}
```

Markers not in `BLOOD_ZONES` (RDW, ALT Phos, Bilirubin, Potassium, Free Testosterone, SHBG, MCV, WBC-sub, etc.) keep the existing spectrum bar as-is — no change.

### New `RangeBar` component

Add to `blood-panel-client.tsx` (identical logic to `score-wheel/index.tsx`'s `RangeBar`):

```tsx
function RangeBar({ value, markerKey }: { value: number | null; markerKey: string }) {
  const config = BLOOD_ZONES[markerKey]
  if (!config || value === null || value === 0) return null

  const zones = config.zones
  const totalMin = zones[0].min
  const totalMax = zones[zones.length - 1].max
  const totalRange = totalMax - totalMin
  const clampedValue = Math.max(totalMin, Math.min(totalMax, value))
  const markerPct = ((clampedValue - totalMin) / totalRange) * 100

  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '1px' }}>
        {zones.map((zone, i) => {
          const zonePct = ((zone.max - zone.min) / totalRange) * 100
          return (
            <div key={i} style={{
              flex: `0 0 ${zonePct}%`,
              background: zone.color,
              borderRadius: i === 0 ? '4px 0 0 4px' : i === zones.length - 1 ? '0 4px 4px 0' : '0',
            }} />
          )
        })}
      </div>
      <div style={{
        position: 'absolute', top: '50%', left: `${markerPct}%`,
        transform: 'translate(-50%, -50%)',
        width: '12px', height: '12px', borderRadius: '50%',
        background: config.markerColor,
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        zIndex: 2,
      }} />
      <div style={{ display: 'flex', marginTop: '4px', gap: '1px' }}>
        {zones.map((zone, i) => {
          const zonePct = ((zone.max - zone.min) / totalRange) * 100
          return (
            <div key={i} style={{
              flex: `0 0 ${zonePct}%`,
              fontSize: '9px', color: 'var(--ink-30)', textAlign: 'center',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              {zone.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### Updated `MarkerRow` in `blood-panel-client.tsx`

Replace the existing spectrum bar block (lines ~195–213) with:

```tsx
{!notTested && (
  <>
    <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", margin: "2px 0 0 18px" }}>
      Target {def.target}
    </p>
    <div style={{ margin: "0 0 0 18px" }}>
      {BLOOD_ZONES[def.key]
        ? <RangeBar value={val} markerKey={def.key} />
        : (
          /* Fallback: existing spectrum bar for markers without zone definitions */
          <div style={{ marginTop: 6, position: "relative", height: 12 }}>
            <div style={{ position: "absolute", top: 5, left: 0, right: 0, height: 1, background: "var(--ink-08)" }} />
            <div style={{
              position: "absolute", top: 3, height: 5, borderRadius: 2,
              left: `${(def.optimalRange[0] / def.displayMax) * 100}%`,
              width: `${((def.optimalRange[1] - def.optimalRange[0]) / def.displayMax) * 100}%`,
              background: "rgba(45,106,79,0.12)",
            }} />
            <div style={{
              position: "absolute", top: 1, width: 8, height: 8, borderRadius: "50%",
              background: s.dot,
              left: `${Math.min((val! / def.displayMax) * 100, 100)}%`,
              transform: "translateX(-50%)",
            }} />
          </div>
        )
      }
    </div>
  </>
)}
```

---

## Change 2 — `/dashboard/oral`: range bars + card audit

**File:** `app/dashboard/oral/oral-panel-client.tsx`

### Remove three emerging-research dimension cards

Delete the three `MetricCard` blocks for `neuroSignalRaw`, `metabolicSignalRaw`, and `proliferativeSignalRaw` (lines ~477–525). Also delete the three `toDisplayPct` / `neuroSignalPct` / `metabolicSignalPct` / `proliferativeSignalPct` variable declarations that are only used by those cards. The `toDisplayPct` helper can be removed entirely if unused after this.

### Add `ORAL_ZONES` constant

```ts
const ORAL_ZONES: Record<string, {
  zones: { label: string; color: string; min: number; max: number }[]
  markerColor: string
}> = {
  shannon: {
    markerColor: '#2D6A4F',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,   max: 2.0 },
      { label: 'Watch',   color: '#FFE0B2', min: 2.0, max: 2.5 },
      { label: 'Good',    color: '#FFF3CD', min: 2.5, max: 3.0 },
      { label: 'Optimal', color: '#D4EDDA', min: 3.0, max: 5.0 },
    ]
  },
  nitrate: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,   max: 2.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 2.0, max: 5.0  },
      { label: 'Good',    color: '#FFF3CD', min: 5.0, max: 15.0 },
      { label: 'Optimal', color: '#D4EDDA', min: 15.0,max: 30.0 },
    ]
  },
  periodontal: {
    markerColor: '#C0392B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,   max: 0.5 },
      { label: 'Good',    color: '#FFF3CD', min: 0.5, max: 1.0 },
      { label: 'Watch',   color: '#FFE0B2', min: 1.0, max: 2.0 },
      { label: 'Elevated',color: '#FFCDD2', min: 2.0, max: 5.0 },
    ]
  },
  osa: {
    markerColor: '#B8860B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,   max: 1.0 },
      { label: 'Watch',   color: '#FFE0B2', min: 1.0, max: 3.0 },
      { label: 'Elevated',color: '#FFCDD2', min: 3.0, max: 10.0 },
    ]
  },
}
```

### New `OralRangeBar` component

Add to `oral-panel-client.tsx`:

```tsx
function OralRangeBar({ value, zoneKey }: { value: number; zoneKey: string }) {
  const config = ORAL_ZONES[zoneKey]
  if (!config) return null

  const zones = config.zones
  const totalMin = zones[0].min
  const totalMax = zones[zones.length - 1].max
  const totalRange = totalMax - totalMin
  const clampedValue = Math.max(totalMin, Math.min(totalMax, value))
  const markerPct = ((clampedValue - totalMin) / totalRange) * 100

  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', gap: '1px' }}>
        {zones.map((zone, i) => {
          const zonePct = ((zone.max - zone.min) / totalRange) * 100
          return (
            <div key={i} style={{
              flex: `0 0 ${zonePct}%`,
              background: zone.color,
              borderRadius: i === 0 ? '3px 0 0 3px' : i === zones.length - 1 ? '0 3px 3px 0' : '0',
            }} />
          )
        })}
      </div>
      <div style={{
        position: 'absolute', top: '50%', left: `${markerPct}%`,
        transform: 'translate(-50%, -50%)',
        width: '10px', height: '10px', borderRadius: '50%',
        background: config.markerColor,
        border: '2px solid white',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        zIndex: 2,
      }} />
    </div>
  )
}
```

### Updated `MetricCard`

Add a `zoneKey?: string` and `numericValue?: number` prop. When `zoneKey` is provided, render the `OralRangeBar` below the status badge. Move the status badge inline with the value row (right-aligned):

```tsx
function MetricCard({ label, sub, value, unit, color, status, statusLabel, zoneKey, numericValue }: {
  label: string
  sub: string
  value: string | number
  unit: string
  color: string
  status: "optimal" | "watch" | "attention"
  statusLabel: string
  zoneKey?: string
  numericValue?: number
}) {
  const statusBg = status === "optimal" ? "#EAF3DE" : status === "watch" ? "#FEF3C7" : "#FEE2E2"
  const statusTxt = status === "optimal" ? "#2D6A4F" : status === "watch" ? "#92400E" : "#991B1B"
  return (
    <div style={{ flex: "1 1 calc(50% - 6px)", border: "0.5px solid var(--ink-12)", padding: "12px 14px", minWidth: 0 }}>
      <p style={{ margin: "0 0 2px", fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color }}>
        {label}
      </p>
      <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-30)" }}>{sub}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "var(--ink)" }}>{value}</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-30)" }}>{unit}</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 6px", background: statusBg, color: statusTxt }}>
          {statusLabel}
        </span>
      </div>
      {zoneKey !== undefined && numericValue !== undefined && (
        <OralRangeBar value={numericValue} zoneKey={zoneKey} />
      )}
    </div>
  )
}
```

### Updated metric card calls

Replace the four metric card renders with:

```tsx
<MetricCard
  label="Shannon Diversity"
  sub="Species richness & evenness — target ≥3.0"
  value={shannon.toFixed(2)}
  unit="index"
  color="#2D6A4F"
  status={shannon >= 3 ? "optimal" : shannon >= 2 ? "watch" : "attention"}
  statusLabel={shannon >= 3 ? "Optimal" : shannon >= 2 ? "Watch" : "Low"}
  zoneKey="shannon"
  numericValue={shannon}
/>
<MetricCard
  label="Nitrate-Reducing"
  sub="Neisseria · Rothia · Veillonella — target ≥5%"
  value={nitratePct.toFixed(1)}
  unit="% reads"
  color="#4A7FB5"
  status={nitratePct >= 5 ? "optimal" : nitratePct >= 2 ? "watch" : "attention"}
  statusLabel={nitratePct >= 5 ? "Optimal" : nitratePct >= 2 ? "Watch" : "Low"}
  zoneKey="nitrate"
  numericValue={nitratePct}
/>
<MetricCard
  label="Periodontal Burden"
  sub="P. gingivalis · T. denticola — target <0.5%"
  value={periodontalPct.toFixed(2)}
  unit="% reads"
  color="#C0392B"
  status={periodontalPct < 0.5 ? "optimal" : periodontalPct < 1.5 ? "watch" : "attention"}
  statusLabel={periodontalPct < 0.5 ? "Optimal" : periodontalPct < 1.5 ? "Watch" : "Elevated"}
  zoneKey="periodontal"
  numericValue={periodontalPct}
/>
<MetricCard
  label="OSA-Associated Taxa"
  sub="Prevotella · Fusobacterium — target <1%"
  value={osaPct.toFixed(2)}
  unit="% reads"
  color="#B8860B"
  status={osaPct < 1 ? "optimal" : osaPct < 3 ? "watch" : "attention"}
  statusLabel={osaPct < 1 ? "Optimal" : osaPct < 3 ? "Watch" : "Elevated"}
  zoneKey="osa"
  numericValue={osaPct}
/>
```

Note: OSA card now shows the numeric `osaPct` value (e.g. `0.60`) and unit `% reads` instead of the previous text descriptor. The `osaDesc` variable is no longer needed and can be deleted.

---

## Change 3 — Dashboard sleep panel: zone range bars

**Files:** `app/components/score-wheel/marker-row.tsx`, `app/components/score-wheel/index.tsx`

### New `SLEEP_ZONES` constant in `marker-row.tsx`

```ts
export const SLEEP_ZONES: Record<string, {
  zones: { label: string; color: string; min: number; max: number }[]
  markerColor: string
}> = {
  deep: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,  max: 10 },
      { label: 'Watch',   color: '#FFE0B2', min: 10, max: 17 },
      { label: 'Good',    color: '#FFF3CD', min: 17, max: 22 },
      { label: 'Optimal', color: '#D4EDDA', min: 22, max: 35 },
    ]
  },
  hrv: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,  max: 20  },
      { label: 'Watch',   color: '#FFE0B2', min: 20, max: 40  },
      { label: 'Good',    color: '#FFF3CD', min: 40, max: 60  },
      { label: 'Optimal', color: '#D4EDDA', min: 60, max: 120 },
    ]
  },
  spo2Avg: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 85, max: 90 },
      { label: 'Watch',   color: '#FFE0B2', min: 90, max: 94 },
      { label: 'Good',    color: '#FFF3CD', min: 94, max: 96 },
      { label: 'Optimal', color: '#D4EDDA', min: 96, max: 100 },
    ]
  },
  rem: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,  max: 12 },
      { label: 'Watch',   color: '#FFE0B2', min: 12, max: 18 },
      { label: 'Good',    color: '#FFF3CD', min: 18, max: 25 },
      { label: 'Optimal', color: '#D4EDDA', min: 25, max: 35 },
    ]
  },
  efficiency: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 60, max: 70 },
      { label: 'Watch',   color: '#FFE0B2', min: 70, max: 78 },
      { label: 'Good',    color: '#FFF3CD', min: 78, max: 85 },
      { label: 'Optimal', color: '#D4EDDA', min: 85, max: 100 },
    ]
  },
}
```

### New `zoneKey` prop on `MarkerRow`

In `marker-row.tsx`, add `zoneKey?: string` to the `MarkerRow` props interface. When `zoneKey` is provided and the value is non-null/non-zero, render a zone bar below the name/value row instead of the existing `barPct` progress bar.

**New zone bar render block** (replaces the existing `<div style={{ marginTop: 6... }}>` progress bar when `zoneKey` is set):

```tsx
{zoneKey && value !== null && value > 0 && (() => {
  const config = SLEEP_ZONES[zoneKey]
  if (!config) return null
  const zones = config.zones
  const totalMin = zones[0].min
  const totalMax = zones[zones.length - 1].max
  const totalRange = totalMax - totalMin
  const clampedValue = Math.max(totalMin, Math.min(totalMax, value))
  const markerPct = ((clampedValue - totalMin) / totalRange) * 100
  return (
    <div style={{ position: 'relative', marginTop: 6, marginLeft: 0 }}>
      <div style={{ display: 'flex', height: '7px', borderRadius: '4px', overflow: 'hidden', gap: '1px' }}>
        {zones.map((zone, i) => {
          const zonePct = ((zone.max - zone.min) / totalRange) * 100
          return (
            <div key={i} style={{
              flex: `0 0 ${zonePct}%`,
              background: zone.color,
              borderRadius: i === 0 ? '4px 0 0 4px' : i === zones.length - 1 ? '0 4px 4px 0' : '0',
            }} />
          )
        })}
      </div>
      <div style={{
        position: 'absolute', top: '50%', left: `${markerPct}%`,
        transform: 'translate(-50%, -50%)',
        width: '11px', height: '11px', borderRadius: '50%',
        background: config.markerColor,
        border: '2px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        zIndex: 2,
      }} />
      <div style={{ display: 'flex', marginTop: '3px', gap: '1px' }}>
        {zones.map((zone, i) => {
          const zonePct = ((zone.max - zone.min) / totalRange) * 100
          return (
            <div key={i} style={{
              flex: `0 0 ${zonePct}%`,
              fontSize: '8px', color: 'var(--ink-30)', textAlign: 'center',
              letterSpacing: '0.04em', textTransform: 'uppercase',
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              {zone.label}
            </div>
          )
        })}
      </div>
    </div>
  )
})()}
```

The existing progress bar block (currently renders when `barPct` is provided) stays in place for any `MarkerRow` calls that don't pass `zoneKey`.

### Updated sleep marker array in `index.tsx`

Add `zoneKey` to each sleep row:

```tsx
{ name: "Deep sleep",       sub: "Slow-wave · target ≥17%",      val: sleepData?.deepPct,    unit: "% of TST",  flagKey: "deep",       max: 30, zoneKey: "deep"       },
{ name: "HRV",              sub: "RMSSD · age-adjusted target",   val: sleepData?.hrv,        unit: "ms RMSSD",  flagKey: "hrv",        max: 100, zoneKey: "hrv"       },
{ name: "SpO2",             sub: "Avg saturation · target ≥96%",  val: sleepData?.spo2Avg,    unit: "%",         flagKey: "spo2Avg",    max: 100, zoneKey: "spo2Avg"   },
{ name: "REM",              sub: "Target ≥18%",                   val: sleepData?.remPct,     unit: "% of TST",  flagKey: "rem",        max: 30, zoneKey: "rem"        },
{ name: "Sleep efficiency", sub: "Target ≥85%",                   val: sleepData?.efficiency, unit: "% in bed",  flagKey: "efficiency", max: 100, zoneKey: "efficiency" },
```

Pass `zoneKey={row.zoneKey}` to the `MarkerRow` call.

---

## Files changed summary

| File | Change |
|---|---|
| `app/dashboard/blood/blood-panel-client.tsx` | Add `BLOOD_ZONES`, `RangeBar`; update `MarkerRow` to use zone bar with spectrum fallback |
| `app/dashboard/oral/oral-panel-client.tsx` | Add `ORAL_ZONES`, `OralRangeBar`; update `MetricCard`; remove 3 emerging-research cards; fix OSA card to show numeric value |
| `app/components/score-wheel/marker-row.tsx` | Add `SLEEP_ZONES`, `zoneKey` prop, zone bar render path |
| `app/components/score-wheel/index.tsx` | Add `zoneKey` to sleep marker array; pass `zoneKey` to `MarkerRow` |

---

## Non-goals

- No changes to scoring logic
- No changes to the species breakdown section in oral
- No changes to the blood insights AI endpoint
- No changes to the "Consider testing" missing markers section in blood
- No new Supabase tables or API routes

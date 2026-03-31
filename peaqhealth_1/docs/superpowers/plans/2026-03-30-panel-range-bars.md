# Panel Range Bars & Oral Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace simple progress/spectrum bars with segmented clinical zone bars across the sleep panel (dashboard), `/dashboard/blood`, and `/dashboard/oral`; remove three low-value oral metric cards.

**Architecture:** Three independent file edits — `marker-row.tsx` gains a `SLEEP_ZONES` constant and optional `zoneKey` prop that switches the bar render path; `blood-panel-client.tsx` gets a self-contained `BLOOD_ZONES` + `RangeBar`; `oral-panel-client.tsx` gets `ORAL_ZONES` + `OralRangeBar` on `MetricCard` and drops three emerging-research cards. No shared modules, no new routes, no Supabase changes.

**Tech Stack:** Next.js 15 App Router, TypeScript, inline styles (no CSS modules), `npx tsc --noEmit` for type-checking.

---

## File map

| File | Role |
|---|---|
| `apps/web/app/components/score-wheel/marker-row.tsx` | Add `SLEEP_ZONES` + `zoneKey` prop to `MarkerRow` |
| `apps/web/app/components/score-wheel/index.tsx` | Add `zoneKey` to sleep rows array; pass to `MarkerRow` |
| `apps/web/app/dashboard/blood/blood-panel-client.tsx` | Add `BLOOD_ZONES` + `RangeBar`; update `MarkerRow`'s spectrum bar |
| `apps/web/app/dashboard/oral/oral-panel-client.tsx` | Add `ORAL_ZONES` + `OralRangeBar`; update `MetricCard`; remove 3 cards; fix OSA card |

---

## Task 1: Sleep panel — add `SLEEP_ZONES` and `zoneKey` to `MarkerRow`

**Files:**
- Modify: `apps/web/app/components/score-wheel/marker-row.tsx`

- [ ] **Step 1: Add `SLEEP_ZONES` constant**

Insert after line 13 (after `FLAG_STYLES`) in `marker-row.tsx`:

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

- [ ] **Step 2: Add `zoneKey` to `MarkerRowProps` interface**

The interface currently ends at line 30. Replace it with:

```ts
interface MarkerRowProps {
  name: string
  sub: string
  value: number | string | null
  unit: string
  flag: Flag
  barPct: number  // 0–100, used when zoneKey is absent
  color: string
  trackColor: string
  hoverBg: string
  mounted: boolean
  zoneKey?: string  // when provided, renders zone bar instead of progress bar
  infoKey?: string
  expandedKey?: string | null
  onInfoToggle?: (key: string) => void
  infoContent?: { explanation: string; source: string }
}
```

- [ ] **Step 3: Add `zoneKey` to the function signature destructure**

Current line 32:
```ts
export function MarkerRow({ name, sub, value, unit, flag, barPct, color, trackColor, hoverBg, mounted, infoKey, expandedKey, onInfoToggle, infoContent }: MarkerRowProps) {
```

Replace with:
```ts
export function MarkerRow({ name, sub, value, unit, flag, barPct, color, trackColor, hoverBg, mounted, zoneKey, infoKey, expandedKey, onInfoToggle, infoContent }: MarkerRowProps) {
```

- [ ] **Step 4: Replace the bar block with zone-or-progress logic**

The current bar block is lines 76–85:
```tsx
        {/* Bar */}
        <div style={{ flex: 1, minWidth: 60 }}>
          <div style={{ height: 3, borderRadius: 2, background: trackColor, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: mounted ? `${barPct}%` : "0%",
              background: isPending ? "transparent" : color,
              borderRadius: 2, transition: "width 1.4s cubic-bezier(.16,1,.3,1) 400ms",
            }} />
          </div>
        </div>
```

Replace the entire block (from `{/* Bar */}` through the closing `</div>`) with:

```tsx
        {/* Bar — zone bar when zoneKey provided, else progress bar */}
        <div style={{ flex: 1, minWidth: 60 }}>
          {zoneKey && !isPending && typeof value === 'number' && (() => {
            const config = SLEEP_ZONES[zoneKey]
            if (!config) return (
              <div style={{ height: 3, borderRadius: 2, background: trackColor, overflow: "hidden" }}>
                <div style={{ height: "100%", width: mounted ? `${barPct}%` : "0%", background: color, borderRadius: 2, transition: "width 1.4s cubic-bezier(.16,1,.3,1) 400ms" }} />
              </div>
            )
            const zones = config.zones
            const totalMin = zones[0].min
            const totalMax = zones[zones.length - 1].max
            const totalRange = totalMax - totalMin
            const clampedValue = Math.max(totalMin, Math.min(totalMax, value as number))
            const markerPct = ((clampedValue - totalMin) / totalRange) * 100
            return (
              <div style={{ position: 'relative' }}>
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
                        fontSize: '8px', color: 'var(--ink-30)', textAlign: 'center' as const,
                        letterSpacing: '0.04em', textTransform: 'uppercase' as const,
                        overflow: 'hidden', whiteSpace: 'nowrap' as const,
                      }}>
                        {zone.label}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
          {(!zoneKey || isPending || typeof value !== 'number') && (
            <div style={{ height: 3, borderRadius: 2, background: trackColor, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: mounted ? `${barPct}%` : "0%",
                background: isPending ? "transparent" : color,
                borderRadius: 2, transition: "width 1.4s cubic-bezier(.16,1,.3,1) 400ms",
              }} />
            </div>
          )}
        </div>
```

- [ ] **Step 5: Type-check**

Run from `apps/web/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/components/score-wheel/marker-row.tsx
git commit -m "feat: sleep zone bars in MarkerRow — SLEEP_ZONES + zoneKey prop"
```

---

## Task 2: Wire `zoneKey` into the sleep rows in `index.tsx`

**Files:**
- Modify: `apps/web/app/components/score-wheel/index.tsx:1882-1900`

- [ ] **Step 1: Add `zoneKey` to the sleep rows array**

Current lines 1882–1888:
```tsx
            {[
              { name: "Deep sleep",       sub: "Slow-wave · target ≥17%",       val: sleepData?.deepPct,   unit: "% of TST",  flagKey: "deep",       max: 30 },
              { name: "HRV",              sub: "RMSSD · age-adjusted target",   val: sleepData?.hrv,       unit: "ms RMSSD",  flagKey: "hrv",        max: 100 },
              { name: "SpO2",             sub: "Avg saturation · target ≥96%",  val: sleepData?.spo2Avg,   unit: "%",         flagKey: "spo2Avg",    max: 100 },
              { name: "REM",              sub: "Target ≥18%",                   val: sleepData?.remPct,    unit: "% of TST",  flagKey: "rem",        max: 30 },
              { name: "Sleep efficiency", sub: "Target ≥85%",                   val: sleepData?.efficiency,unit: "% in bed",  flagKey: "efficiency", max: 100 },
            ].map(row => (
```

Replace with:
```tsx
            {[
              { name: "Deep sleep",       sub: "Slow-wave · target ≥17%",       val: sleepData?.deepPct,    unit: "% of TST",  flagKey: "deep",       max: 30,  zoneKey: "deep"       },
              { name: "HRV",              sub: "RMSSD · age-adjusted target",   val: sleepData?.hrv,        unit: "ms RMSSD",  flagKey: "hrv",        max: 100, zoneKey: "hrv"        },
              { name: "SpO2",             sub: "Avg saturation · target ≥96%",  val: sleepData?.spo2Avg,    unit: "%",         flagKey: "spo2Avg",    max: 100, zoneKey: "spo2Avg"    },
              { name: "REM",              sub: "Target ≥18%",                   val: sleepData?.remPct,     unit: "% of TST",  flagKey: "rem",        max: 30,  zoneKey: "rem"        },
              { name: "Sleep efficiency", sub: "Target ≥85%",                   val: sleepData?.efficiency, unit: "% in bed",  flagKey: "efficiency", max: 100, zoneKey: "efficiency" },
            ].map(row => (
```

- [ ] **Step 2: Pass `zoneKey` to `MarkerRow`**

Current lines 1889–1899:
```tsx
              <MarkerRow key={row.name} name={row.name} sub={row.sub}
                value={row.val ?? null} unit={row.unit}
                flag={sf ? (sf[row.flagKey as keyof typeof sf] as Flag) : "pending"}
                barPct={row.val !== undefined ? fa(row.val, row.max) : 0}
                color="var(--sleep-c)" trackColor="var(--sleep-bg)"
                hoverBg="rgba(74,127,181,0.04)" mounted={mounted}
                infoKey={row.flagKey}
                expandedKey={expandedSleepMetric}
                onInfoToggle={k => setExpandedSleepMetric(prev => prev === k ? null : k)}
                infoContent={SLEEP_INFO[row.flagKey]}
              />
```

Replace with:
```tsx
              <MarkerRow key={row.name} name={row.name} sub={row.sub}
                value={row.val ?? null} unit={row.unit}
                flag={sf ? (sf[row.flagKey as keyof typeof sf] as Flag) : "pending"}
                barPct={row.val !== undefined ? fa(row.val, row.max) : 0}
                color="var(--sleep-c)" trackColor="var(--sleep-bg)"
                hoverBg="rgba(74,127,181,0.04)" mounted={mounted}
                zoneKey={row.zoneKey}
                infoKey={row.flagKey}
                expandedKey={expandedSleepMetric}
                onInfoToggle={k => setExpandedSleepMetric(prev => prev === k ? null : k)}
                infoContent={SLEEP_INFO[row.flagKey]}
              />
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/score-wheel/index.tsx
git commit -m "feat: wire zoneKey into sleep marker rows"
```

---

## Task 3: Blood dashboard — `BLOOD_ZONES` + `RangeBar` + updated `MarkerRow`

**Files:**
- Modify: `apps/web/app/dashboard/blood/blood-panel-client.tsx`

- [ ] **Step 1: Add `BLOOD_ZONES` constant**

Insert after line 89 (after the `ADDITIONAL_NAMES` object closing `}`) and before `// ─── Status helpers`:

```ts
// ─── Clinical zone definitions ───────────────────────────────────────────────

const BLOOD_ZONES: Record<string, {
  zones: { label: string; color: string; min: number; max: number }[]
  markerColor: string
}> = {
  ldl_mgdl:             { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 70 }, { label: 'Good', color: '#FFF3CD', min: 70, max: 100 }, { label: 'Watch', color: '#FFE0B2', min: 100, max: 130 }, { label: 'High', color: '#FFCDD2', min: 130, max: 200 }] },
  hdl_mgdl:             { markerColor: '#2D6A4F', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 40 }, { label: 'Watch', color: '#FFE0B2', min: 40, max: 50 }, { label: 'Good', color: '#FFF3CD', min: 50, max: 60 }, { label: 'Optimal', color: '#D4EDDA', min: 60, max: 100 }] },
  triglycerides_mgdl:   { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 100 }, { label: 'Good', color: '#FFF3CD', min: 100, max: 150 }, { label: 'Watch', color: '#FFE0B2', min: 150, max: 200 }, { label: 'High', color: '#FFCDD2', min: 200, max: 400 }] },
  apob_mgdl:            { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 80 }, { label: 'Good', color: '#FFF3CD', min: 80, max: 100 }, { label: 'Watch', color: '#FFE0B2', min: 100, max: 130 }, { label: 'High', color: '#FFCDD2', min: 130, max: 200 }] },
  lpa_mgdl:             { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 30 }, { label: 'Watch', color: '#FFE0B2', min: 30, max: 50 }, { label: 'High', color: '#FFCDD2', min: 50, max: 150 }] },
  totalcholesterol_mgdl:{ markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 200 }, { label: 'Good', color: '#FFF3CD', min: 200, max: 240 }, { label: 'High', color: '#FFCDD2', min: 240, max: 400 }] },
  hs_crp_mgl:           { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 0.5 }, { label: 'Good', color: '#FFF3CD', min: 0.5, max: 1.0 }, { label: 'Watch', color: '#FFE0B2', min: 1.0, max: 3.0 }, { label: 'High', color: '#FFCDD2', min: 3.0, max: 10.0 }] },
  wbc_kul:              { markerColor: '#4A7FB5', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 4 }, { label: 'Optimal', color: '#D4EDDA', min: 4, max: 10 }, { label: 'Watch', color: '#FFE0B2', min: 10, max: 15 }, { label: 'High', color: '#FFCDD2', min: 15, max: 20 }] },
  albumin_gdl:          { markerColor: '#2D6A4F', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 3.5 }, { label: 'Watch', color: '#FFE0B2', min: 3.5, max: 4.0 }, { label: 'Optimal', color: '#D4EDDA', min: 4.0, max: 5.5 }] },
  glucose_mgdl:         { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 65, max: 85 }, { label: 'Good', color: '#FFF3CD', min: 85, max: 99 }, { label: 'Watch', color: '#FFE0B2', min: 99, max: 125 }, { label: 'High', color: '#FFCDD2', min: 125, max: 200 }] },
  hba1c_pct:            { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 4, max: 5.4 }, { label: 'Good', color: '#FFF3CD', min: 5.4, max: 5.7 }, { label: 'Watch', color: '#FFE0B2', min: 5.7, max: 6.5 }, { label: 'High', color: '#FFCDD2', min: 6.5, max: 10 }] },
  fastinginsulin_uiuml: { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 2, max: 8 }, { label: 'Watch', color: '#FFE0B2', min: 8, max: 20 }, { label: 'High', color: '#FFCDD2', min: 20, max: 30 }] },
  uricacid_mgdl:        { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 3, max: 6 }, { label: 'Watch', color: '#FFE0B2', min: 6, max: 7 }, { label: 'High', color: '#FFCDD2', min: 7, max: 12 }] },
  egfr_mlmin:           { markerColor: '#4A7FB5', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 60 }, { label: 'Watch', color: '#FFE0B2', min: 60, max: 90 }, { label: 'Good', color: '#FFF3CD', min: 90, max: 105 }, { label: 'Optimal', color: '#D4EDDA', min: 105, max: 150 }] },
  creatinine_mgdl:      { markerColor: '#4A7FB5', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0.7, max: 1.3 }, { label: 'Watch', color: '#FFE0B2', min: 1.3, max: 1.5 }, { label: 'High', color: '#FFCDD2', min: 1.5, max: 3.0 }] },
  bun_mgdl:             { markerColor: '#4A7FB5', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 7, max: 20 }, { label: 'Watch', color: '#FFE0B2', min: 20, max: 30 }, { label: 'High', color: '#FFCDD2', min: 30, max: 50 }] },
  alt_ul:               { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 5, max: 33 }, { label: 'Watch', color: '#FFE0B2', min: 33, max: 56 }, { label: 'High', color: '#FFCDD2', min: 56, max: 100 }] },
  ast_ul:               { markerColor: '#C0392B', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 5, max: 33 }, { label: 'Watch', color: '#FFE0B2', min: 33, max: 40 }, { label: 'High', color: '#FFCDD2', min: 40, max: 100 }] },
  vitamin_d_ngml:       { markerColor: '#B8860B', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 20 }, { label: 'Watch', color: '#FFE0B2', min: 20, max: 30 }, { label: 'Good', color: '#FFF3CD', min: 30, max: 50 }, { label: 'Optimal', color: '#D4EDDA', min: 50, max: 100 }] },
  hemoglobin_gdl:       { markerColor: '#C0392B', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 12.0 }, { label: 'Watch', color: '#FFE0B2', min: 12.0, max: 13.5 }, { label: 'Good', color: '#FFF3CD', min: 13.5, max: 14.5 }, { label: 'Optimal', color: '#D4EDDA', min: 14.5, max: 18.0 }] },
  tsh_uiuml:            { markerColor: '#B8860B', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 0.5 }, { label: 'Optimal', color: '#D4EDDA', min: 0.5, max: 3.0 }, { label: 'Watch', color: '#FFE0B2', min: 3.0, max: 4.0 }, { label: 'High', color: '#FFCDD2', min: 4.0, max: 8.0 }] },
  testosterone_ngdl:    { markerColor: '#4A7FB5', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 300 }, { label: 'Watch', color: '#FFE0B2', min: 300, max: 400 }, { label: 'Good', color: '#FFF3CD', min: 400, max: 700 }, { label: 'Optimal', color: '#D4EDDA', min: 700, max: 1200 }] },
  ferritin_ngml:        { markerColor: '#B8860B', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 20 }, { label: 'Watch', color: '#FFE0B2', min: 20, max: 30 }, { label: 'Good', color: '#FFF3CD', min: 30, max: 100 }, { label: 'Optimal', color: '#D4EDDA', min: 100, max: 300 }] },
}
```

- [ ] **Step 2: Add `RangeBar` component**

Insert after `BLOOD_ZONES` (before `// ─── Status helpers`):

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
              fontSize: '9px', color: 'var(--ink-30)', textAlign: 'center' as const,
              letterSpacing: '0.04em', textTransform: 'uppercase' as const,
              overflow: 'hidden', whiteSpace: 'nowrap' as const,
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

- [ ] **Step 3: Replace the spectrum bar in `MarkerRow`**

The current spectrum bar block in `blood-panel-client.tsx`'s `MarkerRow` is lines 194–213:
```tsx
          {/* Spectrum bar */}
          <div style={{ margin: "6px 0 0 18px", position: "relative", height: 12 }}>
            <div style={{ position: "absolute", top: 5, left: 0, right: 0, height: 1, background: "var(--ink-08)" }} />
            {/* Optimal zone */}
            <div style={{
              position: "absolute", top: 3, height: 5, borderRadius: 2,
              left: `${(def.optimalRange[0] / def.displayMax) * 100}%`,
              width: `${((def.optimalRange[1] - def.optimalRange[0]) / def.displayMax) * 100}%`,
              background: "rgba(45,106,79,0.12)",
            }} />
            {/* Value dot */}
            <div style={{
              position: "absolute", top: 1, width: 8, height: 8, borderRadius: "50%",
              background: s.dot,
              left: `${Math.min((val! / def.displayMax) * 100, 100)}%`,
              transform: "translateX(-50%)",
            }} />
          </div>
```

Replace with:
```tsx
          <div style={{ margin: "0 0 0 18px" }}>
            {BLOOD_ZONES[def.key] ? (
              <RangeBar value={val} markerKey={def.key} />
            ) : (
              /* Fallback spectrum bar for markers without zone definitions */
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
            )}
          </div>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dashboard/blood/blood-panel-client.tsx
git commit -m "feat: clinical zone range bars on /dashboard/blood"
```

---

## Task 4: Oral page — `ORAL_ZONES`, `OralRangeBar`, updated `MetricCard`, remove 3 cards

**Files:**
- Modify: `apps/web/app/dashboard/oral/oral-panel-client.tsx`

- [ ] **Step 1: Add `ORAL_ZONES` constant**

Insert after the `PANEL_LABEL` record (after line 89, before `// ─── Collapsible section`):

```ts
// ─── Oral metric zone definitions ────────────────────────────────────────────

const ORAL_ZONES: Record<string, {
  zones: { label: string; color: string; min: number; max: number }[]
  markerColor: string
}> = {
  shannon: {
    markerColor: '#2D6A4F',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,    max: 2.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 2.0,  max: 2.5  },
      { label: 'Good',    color: '#FFF3CD', min: 2.5,  max: 3.0  },
      { label: 'Optimal', color: '#D4EDDA', min: 3.0,  max: 5.0  },
    ]
  },
  nitrate: {
    markerColor: '#4A7FB5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,    max: 2.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 2.0,  max: 5.0  },
      { label: 'Good',    color: '#FFF3CD', min: 5.0,  max: 15.0 },
      { label: 'Optimal', color: '#D4EDDA', min: 15.0, max: 30.0 },
    ]
  },
  periodontal: {
    markerColor: '#C0392B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,    max: 0.5  },
      { label: 'Good',    color: '#FFF3CD', min: 0.5,  max: 1.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 1.0,  max: 2.0  },
      { label: 'Elevated',color: '#FFCDD2', min: 2.0,  max: 5.0  },
    ]
  },
  osa: {
    markerColor: '#B8860B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,    max: 1.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 1.0,  max: 3.0  },
      { label: 'Elevated',color: '#FFCDD2', min: 3.0,  max: 10.0 },
    ]
  },
}
```

- [ ] **Step 2: Add `OralRangeBar` component**

Insert after `ORAL_ZONES`, before `// ─── Collapsible section`:

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

- [ ] **Step 3: Update `MetricCard` to accept `zoneKey` and `numericValue`**

Current `MetricCard` signature (lines ~241–267):
```tsx
function MetricCard({ label, sub, value, unit, color, status, statusLabel }: {
  label: string
  sub: string
  value: string | number
  unit: string
  color: string
  status: "optimal" | "watch" | "attention"
  statusLabel: string
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
      </div>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 6px", background: statusBg, color: statusTxt }}>
        {statusLabel}
      </span>
    </div>
  )
}
```

Replace the entire `MetricCard` function with:

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

- [ ] **Step 4: Replace the 7 metric card calls with 4 (remove 3 emerging-research cards)**

The current metric cards section (lines ~431–526) renders Shannon, Nitrate, Periodontal, OSA, then three emerging-research cards (neuro, metabolic, cellular). Replace the entire `<div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>` block with:

```tsx
        {/* 4 key metrics */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
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
        </div>
```

- [ ] **Step 5: Remove now-unused variables**

After replacing the metric cards, delete these variable declarations that are no longer referenced anywhere (they were only used by the three removed cards):

```ts
const toDisplayPct = (v: number | null) => v === null ? null : (v > 1 ? v : v * 100)
const neuroSignalPct = toDisplayPct(neuroSignalRaw)
const metabolicSignalPct = toDisplayPct(metabolicSignalRaw)
const proliferativeSignalPct = toDisplayPct(proliferativeSignalRaw)
```

Also delete the `osaDesc` variable declaration (now replaced by inline logic in the MetricCard call):
```ts
const osaDesc = osaPct < 1 ? "Within target" : osaPct < 3 ? "Worth watching" : osaPct < 5 ? "Elevated" : "Notably elevated"
const osaSt = osaPct < 1 ? "optimal" as const : osaPct < 3 ? "watch" as const : "attention" as const
```

Note: `neuroSignalRaw`, `metabolicSignalRaw`, and `proliferativeSignalRaw` source declarations can stay — they're fetched from `oral` and removing them would require also changing the data access pattern. TypeScript will flag unused variables if the checker is strict; if so, prefix with `_` or remove them too.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors. If TypeScript complains about unused `neuroSignalRaw` / `metabolicSignalRaw` / `proliferativeSignalRaw`, prefix them with `_`: `const _neuroSignalRaw = ...`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/dashboard/oral/oral-panel-client.tsx
git commit -m "feat: oral zone range bars on metric cards, remove 3 emerging-research cards"
```

---

## Self-review

**Spec coverage:**
- ✅ Change 1 (`/dashboard/blood`): `BLOOD_ZONES` + `RangeBar` + spectrum fallback — Task 3
- ✅ Change 2 (`/dashboard/oral`): `ORAL_ZONES` + `OralRangeBar` + 4-card layout + OSA numeric — Task 4
- ✅ Change 3 (sleep panel): `SLEEP_ZONES` + `zoneKey` prop + wired in index.tsx — Tasks 1 & 2

**Placeholder scan:** No TBDs or "implement later" — all code is explicit.

**Type consistency:**
- `SLEEP_ZONES` defined in Task 1, imported implicitly (same file); used in Task 1 Step 4 ✅
- `zoneKey` added to `MarkerRowProps` in Task 1 Step 2, destructured in Task 1 Step 3, passed in Task 2 Step 2 ✅
- `BLOOD_ZONES` and `RangeBar` both defined in Task 3, `RangeBar` called in Task 3 Step 3 ✅
- `ORAL_ZONES` defined in Task 4 Step 1, `OralRangeBar` uses it in Task 4 Step 2, called in Task 4 Step 3 ✅
- `zoneKey` / `numericValue` added to `MetricCard` in Task 4 Step 3, passed in Task 4 Step 4 ✅

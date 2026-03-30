"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Area, AreaChart,
  ReferenceLine, ComposedChart,
} from "recharts"
import { Nav } from "../components/nav"

// ─── Types ──────────────────────────────────────────────────────────────────────

interface WeeklySnapshot {
  week_start:            string
  generated_at:          string
  total_score:           number | null
  sleep_sub:             number | null
  blood_sub:             number | null
  oral_sub:              number | null
  lifestyle_sub:         number | null
  prev_total_score:      number | null
  avg_hrv:               number | null
  avg_efficiency:        number | null
  avg_deep_pct:          number | null
  avg_rem_pct:           number | null
  nights_tracked:        number
  hrv_trend_pct:         number | null
  headline:              string | null
  body:                  string | null
  trend_direction:       "improving" | "stable" | "declining" | null
  retest_recommendation: string | null
  raw_response:          {
    positive_highlight?: string | null
    watch_note?:         string | null
  } | null
}

interface Snapshot {
  date: string
  total: number
  sleep: number
  blood: number
  oral: number
  lifestyle: number
}

interface SleepNight {
  date: string
  hrv: number | null
  efficiency: number | null
  deepPct: number | null
  remPct: number | null
  totalMinutes: number | null
  spo2: number | null
  restingHeartRate: number | null
  provider: string | null
}

interface TrendEvent {
  type: "blood" | "oral" | "wearable"
  date: string
  label: string
}

interface CheckinRecord {
  checked_in_at: string
  exercise_frequency: string | null
  diet_quality: string | null
  stress_level: string | null
  alcohol_frequency: string | null
  sleep_priority: string | null
  energy_level: string | null
  supplements: string[] | null
}

interface TrendsData {
  current: Snapshot | null
  previous: Snapshot | null
  first: Snapshot | null
  snapshots: Snapshot[]
  sleepNights: SleepNight[]
  streak: number
  avgHrv: number | null
  hrvTrendPct: number | null
  daysSinceLastLab: number | null
  daysSinceOral: number | null
  lastLabDate: string | null
  lastOralDate: string | null
  lastCheckin: CheckinRecord | null
  checkinHistory: CheckinRecord[]
  shouldPromptCheckin: boolean
  showCrossPanelAlert: boolean
  hrvTrendPctValue: number | null
  wearableProvider: string | null
  events: TrendEvent[]
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const C = {
  sleep: "#4A7FB5",
  blood: "#C0392B",
  oral: "#2D6A4F",
  lifestyle: "#B8860B",
  ink: "var(--ink)",
} as const

const serif = "'Cormorant Garamond', Georgia, serif"
const body = "var(--font-body, 'Instrument Sans', sans-serif)"

const card: React.CSSProperties = {
  border: "0.5px solid var(--ink-08)",
  borderRadius: 6,
  padding: "20px 24px",
  background: "var(--white)",
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined) return "—"
  return Number(val).toFixed(decimals)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}


function estimateNextSnapshotDate(daysSinceBlood: number | null, daysSinceOral: number | null): string | null {
  if (daysSinceBlood === null && daysSinceOral === null) return null
  const bloodDaysLeft = daysSinceBlood !== null ? Math.max(0, 90 - daysSinceBlood) : Infinity
  const oralDaysLeft  = daysSinceOral  !== null ? Math.max(0, 150 - daysSinceOral) : Infinity
  const daysUntil = Math.min(bloodDaysLeft, oralDaysLeft)
  if (daysUntil <= 0) return "Overdue"
  const d = new Date(Date.now() + daysUntil * 86400000)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function getRetestRecommendation(daysSinceBlood: number | null, daysSinceOral: number | null): string {
  const noBlood = daysSinceBlood === null
  const noOral  = daysSinceOral  === null

  if (noBlood && noOral) {
    return "Upload your blood panel and order an oral kit to unlock your full Peaq score. For the most meaningful snapshot, consider doing both around the same time — blood and oral data taken together paint a much clearer picture of your cardiovascular and systemic health."
  }
  if (!noBlood && noOral) {
    return "You have blood data but no oral microbiome results yet. Order an oral kit — when tested around the same time as your blood panel, the two together reveal cross-panel signals (like how your oral bacteria may be influencing your Lp(a) and hsCRP) that neither panel can show alone."
  }
  if (noBlood && !noOral) {
    return "You have oral microbiome data but no blood panel yet. Uploading your labs will complete your baseline — blood and oral tested close together is when the most interesting cross-panel patterns emerge."
  }

  const bloodDue = (daysSinceBlood ?? 0) >= 90
  const oralDue  = (daysSinceOral  ?? 0) >= 150

  if (bloodDue && oralDue) {
    return `Your blood panel is ${daysSinceBlood} days old and your oral kit is ${daysSinceOral} days old. Consider retesting both around the same time — a simultaneous blood and oral snapshot gives you the strongest cross-panel comparison to your baseline.`
  }
  if (bloodDue && !oralDue) {
    return `Your blood panel is ${daysSinceBlood} days old — consider uploading fresh labs. When you do, timing it close to your next oral kit (due in ~${Math.max(0, 150 - (daysSinceOral ?? 0))} days) will give you the most meaningful snapshot comparison.`
  }
  if (!bloodDue && oralDue) {
    return `Your oral kit is ${daysSinceOral} days old — consider ordering a new one. Timing it close to your next blood upload will give you the strongest cross-panel picture.`
  }

  const nextBloodDays = Math.max(0, 90  - (daysSinceBlood ?? 0))
  const nextOralDays  = Math.max(0, 150 - (daysSinceOral  ?? 0))
  const nextDays = Math.min(nextBloodDays, nextOralDays)
  return `Your panels are up to date. Next recommended snapshot in ~${nextDays} days. For best results, consider retesting blood and oral within 2 weeks of each other — simultaneous snapshots reveal the most meaningful cross-panel patterns.`
}

// ─── Tooltips ───────────────────────────────────────────────────────────────────

function ScoreTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, number | string> }> }) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload
  return (
    <div style={{
      background: "var(--white)", border: "0.5px solid var(--ink-12)", borderRadius: 4,
      padding: "10px 14px", fontFamily: body, fontSize: 12, color: C.ink,
      boxShadow: "0 4px 16px var(--ink-06)", minWidth: 140,
    }}>
      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--ink-60)" }}>{pt.label}</p>
      {[
        { k: "total", l: "Total", c: C.ink },
        { k: "sleep", l: "Sleep", c: C.sleep },
        { k: "blood", l: "Blood", c: C.blood },
        { k: "oral", l: "Oral", c: C.oral },
      ].map(({ k, l, c }) => (
        <p key={k} style={{ margin: "2px 0", color: "var(--ink-60)" }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: c, marginRight: 6, verticalAlign: "middle" }} />
          {l}: <span style={{ color: C.ink, fontWeight: 500 }}>{pt[k] != null ? fmt(pt[k] as number, 0) : "—"}</span>
        </p>
      ))}
    </div>
  )
}

function SleepTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "var(--white)", border: "0.5px solid var(--ink-12)", borderRadius: 4,
      padding: "8px 12px", fontFamily: body, fontSize: 12, color: C.ink,
      boxShadow: "0 4px 16px var(--ink-06)",
    }}>
      <p style={{ margin: 0, color: "var(--ink-60)" }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontWeight: 500 }}>{payload[0].value != null ? fmt(payload[0].value, 1) : "—"}</p>
    </div>
  )
}

// ─── CollapsibleSection ─────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  badge?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 0", background: "transparent", border: "none",
          borderBottom: "0.5px solid var(--ink-08)", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: body, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--ink-50)", fontWeight: 500,
          }}>
            {title}
          </span>
          {badge && (
            <span style={{
              fontFamily: body, fontSize: 10, padding: "2px 7px", borderRadius: 4,
              background: "var(--ink-06)", color: "var(--ink-40)",
            }}>
              {badge}
            </span>
          )}
        </div>
        <span style={{ fontFamily: serif, fontSize: 18, color: "var(--ink-30)", lineHeight: 1 }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div style={{ paddingTop: 16 }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── CheckinRow ─────────────────────────────────────────────────────────────────

function CheckinRow({ label, options, value, onChange, previous }: {
  label: string
  options: Array<{ value: string; label: string }>
  value: string | null
  onChange: (v: string) => void
  previous?: string | null
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{
          fontFamily: body, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "var(--ink-40)",
        }}>
          {label}
        </span>
        {previous && (
          <span style={{ fontFamily: body, fontSize: 11, color: "var(--ink-20)" }}>
            Last time: {previous}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map(opt => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                fontFamily: body, padding: "7px 14px", borderRadius: 20, fontSize: 13,
                border: active ? `1.5px solid var(--ink)` : "0.5px solid var(--ink-20)",
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--off-white)" : "var(--ink-60)",
                cursor: "pointer", transition: "all 0.15s ease",
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── SupplementPicker ───────────────────────────────────────────────────────────

const SUPPLEMENTS = ["Fish oil", "Magnesium", "Vitamin D", "Creatine", "Berberine", "Statin", "None"]

function SupplementPicker({ value, onChange }: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: body, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 8 }}>
        Supplements
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SUPPLEMENTS.map(s => {
          const active = value.includes(s)
          return (
            <button
              key={s}
              onClick={() => {
                const updated = active ? value.filter(x => x !== s) : [...value, s]
                onChange(updated)
              }}
              style={{
                fontFamily: body, padding: "7px 14px", borderRadius: 20, fontSize: 13,
                border: active ? `1.5px solid var(--ink)` : "0.5px solid var(--ink-20)",
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--off-white)" : "var(--ink-60)",
                cursor: "pointer", transition: "all 0.15s ease",
              }}
            >
              {s}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── MiniChart ──────────────────────────────────────────────────────────────────

function MiniChart({
  data, dataKey, color, refY, label, unit, domain,
}: {
  data: Array<Record<string, unknown>>
  dataKey: string
  color: string
  refY: number
  label: string
  unit: string
  domain: [number, number]
}) {
  return (
    <div style={{ ...card, marginBottom: 12 }}>
      <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 12px" }}>
        {label} <span style={{ color: "var(--ink-20)" }}>· {unit}</span>
      </p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontFamily: serif, fontSize: 11, fill: "var(--ink-30)" }}
            axisLine={false} tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8))}
          />
          <YAxis
            domain={domain}
            tick={{ fontFamily: serif, fontSize: 11, fill: "var(--ink-30)" }}
            axisLine={false} tickLine={false} tickCount={4}
          />
          <Tooltip content={<SleepTooltip />} cursor={{ stroke: "var(--ink-12)", strokeWidth: 1 }} />
          <ReferenceLine y={refY} stroke="var(--ink-15)" strokeDasharray="4 4" />
          <Area
            type="monotone" dataKey={dataKey}
            stroke={color} strokeWidth={1.5}
            fill={color} fillOpacity={0.08}
            dot={false} connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── WeeklySnapshotCard ─────────────────────────────────────────────────────────

function WeeklySnapshotCard({ snapshot }: { snapshot: WeeklySnapshot | null }) {
  if (!snapshot?.headline) return null

  const trendColor = snapshot.trend_direction === "improving" ? "#1D9E75"
    : snapshot.trend_direction === "declining" ? "#C0392B"
    : "#B8860B"

  const trendLabel = snapshot.trend_direction === "improving" ? "Trending up"
    : snapshot.trend_direction === "declining" ? "Worth watching"
    : "Holding steady"

  const trendArrow = snapshot.trend_direction === "improving" ? "▲"
    : snapshot.trend_direction === "declining" ? "▼"
    : "—"

  const metrics = [
    { label: "Nights",      value: snapshot.nights_tracked > 0 ? String(snapshot.nights_tracked) : null,         unit: "" },
    { label: "Avg HRV",     value: snapshot.avg_hrv       != null ? fmt(snapshot.avg_hrv, 1)       : null,         unit: " ms" },
    { label: "Efficiency",  value: snapshot.avg_efficiency != null ? fmt(snapshot.avg_efficiency, 1) : null,        unit: "%" },
    { label: "Deep sleep",  value: snapshot.avg_deep_pct  != null ? fmt(snapshot.avg_deep_pct, 1)  : null,         unit: "%" },
  ].filter(m => m.value != null)

  return (
    <div style={{ ...card, marginBottom: 24 }}>
      {/* Week label + trend */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontFamily: body, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-40)" }}>
          Week of {new Date(snapshot.week_start + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <span style={{ fontFamily: body, fontSize: 11, color: trendColor, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 8 }}>{trendArrow}</span>
          {trendLabel}
        </span>
      </div>

      {/* Headline */}
      <p style={{ fontFamily: serif, fontSize: 22, fontWeight: 300, color: C.ink, lineHeight: 1.3, margin: "0 0 10px" }}>
        {snapshot.headline}
      </p>

      {/* Body */}
      <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-60)", lineHeight: 1.65, margin: snapshot.retest_recommendation ? "0 0 16px" : "0" }}>
        {snapshot.body}
      </p>

      {/* Positive highlight */}
      {snapshot.raw_response?.positive_highlight && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(29,158,117,0.07)", borderRadius: 8, borderLeft: "3px solid #1D9E75", fontFamily: body, fontSize: 13, color: "var(--ink-60)", lineHeight: 1.5 }}>
          {snapshot.raw_response.positive_highlight}
        </div>
      )}

      {/* Watch note */}
      {snapshot.raw_response?.watch_note && (
        <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(184,134,11,0.07)", borderRadius: 8, borderLeft: `3px solid ${C.lifestyle}`, fontFamily: body, fontSize: 13, color: "var(--ink-60)", lineHeight: 1.5 }}>
          {snapshot.raw_response.watch_note}
        </div>
      )}

      {/* Retest recommendation */}
      {snapshot.retest_recommendation && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "0.5px solid var(--ink-08)", fontFamily: body, fontSize: 12, color: "var(--ink-40)", lineHeight: 1.55, fontStyle: "italic" }}>
          {snapshot.retest_recommendation}
        </div>
      )}

      {/* Sleep metrics summary */}
      {metrics.length > 0 && (
        <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 14, borderTop: "0.5px solid var(--ink-08)", flexWrap: "wrap" }}>
          {metrics.map(m => (
            <div key={m.label}>
              <div style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-40)", marginBottom: 2 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: serif, fontSize: 16, color: C.sleep }}>
                {m.value}{m.unit}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function TrendsClient() {
  const [data, setData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [weeklySnapshot, setWeeklySnapshot] = useState<WeeklySnapshot | null>(null)

  // Check-in form state
  const [lifestyleChanged, setLifestyleChanged] = useState<boolean | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [checkinSaved, setCheckinSaved] = useState(false)
  const [checkinSubmitting, setCheckinSubmitting] = useState(false)
  const [checkinResult, setCheckinResult] = useState<{ shouldUpdateQuestionnaire: boolean; changeDirection: string; message: string } | null>(null)
  const [checkin, setCheckin] = useState({
    exercise_frequency: null as string | null,
    diet_quality:       null as string | null,
    stress_level:       null as string | null,
    alcohol_frequency:  null as string | null,
    sleep_priority:     null as string | null,
    energy_level:       null as string | null,
    supplements:        [] as string[],
  })

  useEffect(() => {
    fetch("/api/trends")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch("/api/trends/weekly-snapshot")
      .then(r => r.json())
      .then(d => { if (d.snapshot) setWeeklySnapshot(d.snapshot as WeeklySnapshot) })
      .catch(() => {})
  }, [])

  async function handleNoChange() {
    setLifestyleChanged(false)
    setExpanded(false)
    await fetch("/api/trends/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise_frequency: "same", diet_quality: "same", stress_level: "same",
        alcohol_frequency: "same", sleep_priority: "same",
      }),
    })
  }

  async function handleSubmitCheckin() {
    if (checkinSubmitting) return
    setCheckinSubmitting(true)
    try {
      const res = await fetch("/api/trends/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkin),
      })
      const result = await res.json() as { shouldUpdateQuestionnaire: boolean; changeDirection: string; message: string }
      setCheckinResult(result)
      setCheckinSaved(true)
      setExpanded(false)
    } catch {
      // silent fail
    } finally {
      setCheckinSubmitting(false)
    }
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

  if (loading) {
    return (
      <div className="min-h-svh bg-off-white">
        <Nav />
        <main className="mx-auto max-w-[720px] px-6 pt-14 pb-10">
          <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-30)", textAlign: "center", paddingTop: 80 }}>
            Loading trends...
          </p>
        </main>
      </div>
    )
  }

  const noData = !data || data.snapshots.length === 0
  const hasSleep = data != null && data.sleepNights.length > 0
  const lastNight = hasSleep ? data!.sleepNights[data!.sleepNights.length - 1] : null
  const lastNightRecent = lastNight != null && (() => {
    const d = new Date(lastNight.date)
    const now = new Date()
    return (now.getTime() - d.getTime()) < 2 * 86400000
  })()
  const prevCheckin = data?.lastCheckin ?? null
  const isFirstCheckin = prevCheckin == null
  const daysSinceCheckin = prevCheckin
    ? Math.floor((Date.now() - new Date(prevCheckin.checked_in_at).getTime()) / 86400000)
    : null

  // Sleep chart data
  const sleepChartData = hasSleep
    ? [...data!.sleepNights].map(n => ({ ...n, label: fmtDate(n.date) }))
    : []

  const hasSpO2 = sleepChartData.some(n => n.spo2 != null)
  const hasRHR  = sleepChartData.some(n => n.restingHeartRate != null)

  // Next full snapshot
  const daysSinceBlood   = data?.daysSinceLastLab ?? null
  const daysSinceOral    = data?.daysSinceOral    ?? null
  const nextSnapshotDate = estimateNextSnapshotDate(daysSinceBlood, daysSinceOral)

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main className="mx-auto max-w-[720px] px-6 pt-14 pb-20">

        {/* ─── HEADER ──────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 40 }}>
          <h1 style={{ fontFamily: serif, fontSize: 34, fontWeight: 300, color: C.ink, margin: 0 }}>
            Trends
          </h1>
          <span style={{ fontFamily: body, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-30)" }}>
            {today}
          </span>
        </div>

        {/* ─── EMPTY STATE ─────────────────────────────────── */}
        {noData && (
          <div style={{ ...card, textAlign: "center", padding: "60px 24px" }}>
            <p style={{ fontFamily: serif, fontSize: 22, fontWeight: 300, color: C.ink, margin: "0 0 12px" }}>
              Your score history will appear here
            </p>
            <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-40)", margin: 0, maxWidth: 360, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>
              After your first full data submission, we&apos;ll begin tracking how your scores change over time.
            </p>
          </div>
        )}

        <WeeklySnapshotCard snapshot={weeklySnapshot} />

        {/* ─── NEXT FULL SNAPSHOT (always visible) ─────────── */}
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: body, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-40)", marginBottom: 6 }}>
                Next full snapshot
              </div>
              <div style={{ fontFamily: serif, fontSize: 20, color: C.ink }}>
                {nextSnapshotDate ?? "Schedule when ready"}
              </div>
            </div>
            <div style={{ fontFamily: body, fontSize: 11, color: "var(--ink-40)", textAlign: "right" }}>
              {daysSinceBlood !== null && <div>Blood · {daysSinceBlood}d ago</div>}
              {daysSinceOral  !== null && <div>Oral · {daysSinceOral}d ago</div>}
            </div>
          </div>
          <div style={{
            fontFamily: body, fontSize: 13, color: "var(--ink-60)", lineHeight: 1.65,
            marginBottom: 16, padding: "12px 14px",
            background: "var(--off-white)", borderRadius: 8,
            borderLeft: `3px solid ${C.lifestyle}`,
          }}>
            {getRetestRecommendation(daysSinceBlood, daysSinceOral)}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/dashboard/blood" style={{ fontFamily: body, fontSize: 12, color: C.blood, fontWeight: 500, textDecoration: "none" }}>
              Upload labs →
            </Link>
            <Link href="/shop" style={{ fontFamily: body, fontSize: 12, color: C.oral, fontWeight: 500, textDecoration: "none" }}>
              Order oral kit →
            </Link>
          </div>
        </div>

        {data && data.snapshots.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* ─── LAST NIGHT ──────────────────────────────── */}
            {hasSleep && (
              <CollapsibleSection
                title="Last night"
                defaultOpen={!!lastNightRecent}
                badge={lastNight ? fmtDate(lastNight.date) : undefined}
              >
                {lastNightRecent && lastNight ? (
                  <div style={{ ...card, borderLeft: `3px solid ${C.sleep}`, padding: "16px 20px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 8px" }}>
                          {data.wearableProvider ? data.wearableProvider.toUpperCase() : "WEARABLE"}
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          {[
                            { label: `Deep ${fmt(lastNight.deepPct, 1)}%`, ok: (lastNight.deepPct ?? 0) >= 17 },
                            { label: `REM ${fmt(lastNight.remPct, 1)}%`, ok: (lastNight.remPct ?? 0) >= 18 },
                            { label: `Eff ${fmt(lastNight.efficiency, 1)}%`, ok: (lastNight.efficiency ?? 0) >= 85 },
                            { label: `HRV ${fmt(lastNight.hrv, 1)} ms`, ok: (lastNight.hrv ?? 0) >= 50 },
                          ].map(({ label, ok }) => (
                            <span key={label} style={{
                              fontFamily: body, fontSize: 11, padding: "3px 10px", borderRadius: 12,
                              background: ok ? `${C.sleep}12` : "var(--ink-04)",
                              color: ok ? C.sleep : "var(--ink-40)",
                            }}>
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontFamily: serif, fontSize: 28, fontWeight: 300, color: C.sleep, margin: 0, lineHeight: 1 }}>
                          {fmt(data.current?.sleep, 0)}
                        </p>
                        <p style={{ fontFamily: body, fontSize: 9, color: "var(--ink-30)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Sleep /27
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-40)", padding: "8px 0 16px", lineHeight: 1.7 }}>
                    No data from last night yet — check back after your next sync.
                  </p>
                )}
              </CollapsibleSection>
            )}

            {/* ─── SLEEP STREAK ────────────────────────────── */}
            {hasSleep && (
              <CollapsibleSection title="Sleep streak" defaultOpen={true}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                  <div style={card}>
                    <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 8px" }}>
                      STREAK
                    </p>
                    <p style={{ fontFamily: serif, fontSize: 32, fontWeight: 300, color: C.ink, margin: "0 0 8px", lineHeight: 1 }}>
                      {fmt(data!.streak, 0)}<span style={{ fontSize: 16, color: "var(--ink-30)", marginLeft: 4 }}>nights</span>
                    </p>
                    <div style={{ display: "flex", gap: 4 }}>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const filled = i < Math.min(data!.streak, 7)
                        return <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: filled ? C.sleep : "var(--ink-08)" }} />
                      })}
                    </div>
                  </div>
                  <div style={card}>
                    <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 8px" }}>
                      7-DAY AVG HRV
                    </p>
                    <p style={{ fontFamily: serif, fontSize: 32, fontWeight: 300, color: C.sleep, margin: "0 0 4px", lineHeight: 1 }}>
                      {fmt(data!.avgHrv, 1)}<span style={{ fontSize: 14, color: "var(--ink-30)", marginLeft: 4 }}>ms</span>
                    </p>
                    <p style={{ fontFamily: body, fontSize: 11, color: "var(--ink-30)", margin: 0 }}>
                      Target: 50 ms
                      {data!.hrvTrendPct != null && (
                        <span style={{ marginLeft: 8, color: data!.hrvTrendPct >= 0 ? "#2D6A4F" : "#C0392B" }}>
                          {data!.hrvTrendPct >= 0 ? "+" : ""}{fmt(data!.hrvTrendPct, 1)}% vs last week
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* ─── CROSS-PANEL ALERT ───────────────────────── */}
            {data!.showCrossPanelAlert && (
              <div style={{ ...card, borderLeft: `3px solid ${C.lifestyle}`, padding: "16px 20px", marginBottom: 4 }}>
                <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.lifestyle, margin: "0 0 8px" }}>
                  CROSS-PANEL SIGNAL
                </p>
                <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-60)", margin: 0, lineHeight: 1.7 }}>
                  Your HRV has trended down {fmt(Math.abs(data!.hrvTrendPctValue ?? 0), 1)}% this week. Your oral nitrate reducers are low — these two are connected through the nitric oxide pathway. Worth keeping an eye on together.
                </p>
              </div>
            )}

            {/* ─── CHECK-INS ───────────────────────────────── */}
            <CollapsibleSection
              title="Check-ins"
              defaultOpen={data!.shouldPromptCheckin && !checkinSaved}
              badge={checkinSaved ? "Saved" : data!.shouldPromptCheckin ? "Due" : daysSinceCheckin != null ? `${daysSinceCheckin}d ago` : undefined}
            >
              <div style={{ marginBottom: 8 }}>
                {!checkinSaved ? (
                  <div style={{ ...card, border: "0.5px solid var(--ink-12)" }}>
                    <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 300, color: C.ink, margin: "0 0 4px" }}>
                      Has your lifestyle changed recently?
                    </p>
                    <p style={{ fontFamily: body, fontSize: 12, color: "var(--ink-30)", margin: "0 0 20px" }}>
                      {isFirstCheckin ? "First check-in" : `Last check-in ${daysSinceCheckin} days ago`}
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        onClick={handleNoChange}
                        style={{
                          fontFamily: body, padding: "10px 24px", borderRadius: 8, fontSize: 14,
                          border: lifestyleChanged === false ? `1.5px solid var(--ink)` : "0.5px solid var(--ink-20)",
                          background: lifestyleChanged === false ? "var(--ink)" : "transparent",
                          color: lifestyleChanged === false ? "var(--off-white)" : "var(--ink-60)",
                          cursor: "pointer",
                        }}
                      >
                        No, about the same
                      </button>
                      <button
                        onClick={() => { setLifestyleChanged(true); setExpanded(true) }}
                        style={{
                          fontFamily: body, padding: "10px 24px", borderRadius: 8, fontSize: 14,
                          border: lifestyleChanged === true ? `1.5px solid var(--ink)` : "0.5px solid var(--ink-20)",
                          background: lifestyleChanged === true ? "var(--ink)" : "transparent",
                          color: lifestyleChanged === true ? "var(--off-white)" : "var(--ink-60)",
                          cursor: "pointer",
                        }}
                      >
                        Yes, things have changed
                      </button>
                    </div>
                    {lifestyleChanged === false && (
                      <div style={{ marginTop: 16, fontFamily: body, fontSize: 13, color: "var(--ink-40)", borderTop: "0.5px solid var(--ink-08)", paddingTop: 14 }}>
                        Got it — we&apos;ll check in again in 30 days. Your lifestyle score stays the same.
                      </div>
                    )}
                    {expanded && (
                      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--ink-08)", paddingTop: 20 }}>
                        <CheckinRow
                          label="Exercise"
                          options={[{ value: "less", label: "Less than before" }, { value: "same", label: "Same" }, { value: "more", label: "More than before" }]}
                          value={checkin.exercise_frequency}
                          onChange={v => setCheckin(c => ({ ...c, exercise_frequency: v }))}
                          previous={isFirstCheckin ? undefined : prevCheckin?.exercise_frequency}
                        />
                        <CheckinRow
                          label="Diet"
                          options={[{ value: "worse", label: "Worse" }, { value: "same", label: "Same" }, { value: "better", label: "Better" }]}
                          value={checkin.diet_quality}
                          onChange={v => setCheckin(c => ({ ...c, diet_quality: v }))}
                          previous={isFirstCheckin ? undefined : prevCheckin?.diet_quality}
                        />
                        <CheckinRow
                          label="Stress"
                          options={[{ value: "higher", label: "Higher" }, { value: "same", label: "Same" }, { value: "lower", label: "Lower" }]}
                          value={checkin.stress_level}
                          onChange={v => setCheckin(c => ({ ...c, stress_level: v }))}
                          previous={isFirstCheckin ? undefined : prevCheckin?.stress_level}
                        />
                        <CheckinRow
                          label="Alcohol"
                          options={[{ value: "more", label: "More" }, { value: "same", label: "Same" }, { value: "less", label: "Less" }, { value: "none", label: "None" }]}
                          value={checkin.alcohol_frequency}
                          onChange={v => setCheckin(c => ({ ...c, alcohol_frequency: v }))}
                          previous={isFirstCheckin ? undefined : prevCheckin?.alcohol_frequency}
                        />
                        <CheckinRow
                          label="Sleep focus"
                          options={[{ value: "less", label: "Less priority" }, { value: "same", label: "Same" }, { value: "more", label: "More priority" }]}
                          value={checkin.sleep_priority}
                          onChange={v => setCheckin(c => ({ ...c, sleep_priority: v }))}
                          previous={isFirstCheckin ? undefined : prevCheckin?.sleep_priority}
                        />
                        <CheckinRow
                          label="Energy & mood"
                          options={[{ value: "lower", label: "Lower than usual" }, { value: "normal", label: "About normal" }, { value: "better", label: "Better than usual" }]}
                          value={checkin.energy_level}
                          onChange={v => setCheckin(c => ({ ...c, energy_level: v }))}
                          previous={isFirstCheckin ? undefined : prevCheckin?.energy_level}
                        />
                        <SupplementPicker
                          value={checkin.supplements}
                          onChange={v => setCheckin(c => ({ ...c, supplements: v }))}
                        />
                        <button
                          onClick={handleSubmitCheckin}
                          disabled={checkinSubmitting}
                          style={{
                            fontFamily: body, marginTop: 4, padding: "12px 28px", fontSize: 14,
                            background: "var(--ink)", color: "var(--off-white)",
                            border: "none", borderRadius: 8,
                            cursor: checkinSubmitting ? "wait" : "pointer",
                            opacity: checkinSubmitting ? 0.6 : 1,
                            width: "100%", transition: "opacity 0.15s ease",
                          }}
                        >
                          {checkinSubmitting ? "Saving..." : "Save check-in"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : checkinResult ? (
                  <div style={{ ...card, borderLeft: `3px solid #2D6A4F`, padding: "20px 24px" }}>
                    <p style={{ fontFamily: body, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2D6A4F", margin: "0 0 10px" }}>
                      ✓ Check-in saved
                    </p>
                    {checkinResult.shouldUpdateQuestionnaire ? (
                      <>
                        <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-60)", margin: "0 0 16px", lineHeight: 1.7 }}>
                          {checkinResult.changeDirection === "positive"
                            ? "A lot has changed since your last assessment. Want to update your full lifestyle score?"
                            : "Your lifestyle has shifted. Updating your full assessment will keep your score accurate."
                          }{" "}It takes about 2 minutes.
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <Link href="/settings/lifestyle" style={{ fontFamily: body, fontSize: 12, fontWeight: 500, padding: "8px 18px", background: "var(--ink)", color: "var(--off-white)", textDecoration: "none", borderRadius: 4 }}>
                            Update lifestyle score →
                          </Link>
                          <button onClick={() => setCheckinResult(null)} style={{ fontFamily: body, fontSize: 12, color: "var(--ink-30)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            Maybe later
                          </button>
                        </div>
                      </>
                    ) : (
                      <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-60)", margin: 0, lineHeight: 1.7 }}>
                        Your lifestyle looks consistent — no score update needed.
                        <br />We&apos;ll check in again in 30 days.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </CollapsibleSection>

            {/* ─── SLEEP TRENDS ────────────────────────────── */}
            {hasSleep && (
              <CollapsibleSection title="Sleep · 30 nights" defaultOpen={false}>
                <div style={{ marginBottom: 8 }}>
                  <MiniChart
                    data={sleepChartData}
                    dataKey="hrv"
                    color={C.sleep}
                    refY={50}
                    label="Nightly HRV"
                    unit="ms"
                    domain={[0, 80]}
                  />
                  <MiniChart
                    data={sleepChartData}
                    dataKey="efficiency"
                    color={C.sleep}
                    refY={85}
                    label="Sleep efficiency"
                    unit="%"
                    domain={[60, 100]}
                  />
                  {hasSpO2 && (
                    <MiniChart
                      data={sleepChartData}
                      dataKey="spo2"
                      color={C.sleep}
                      refY={96}
                      label="SpO2 nightly avg"
                      unit="%"
                      domain={[88, 100]}
                    />
                  )}
                  {hasRHR && (
                    <MiniChart
                      data={sleepChartData}
                      dataKey="restingHeartRate"
                      color={C.blood}
                      refY={60}
                      label="Resting heart rate"
                      unit="bpm"
                      domain={[40, 90]}
                    />
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* No sleep empty state */}
            {!hasSleep && (
              <div style={{ ...card, textAlign: "center", padding: "32px 24px", marginBottom: 4 }}>
                <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-40)", margin: 0, lineHeight: 1.7 }}>
                  Connect a wearable in <Link href="/settings" style={{ color: C.sleep, textDecoration: "none" }}>Settings</Link> to see nightly sleep trends.
                </p>
              </div>
            )}

            {/* ─── SCORE HISTORY ───────────────────────────── */}
            <CollapsibleSection title="Score history" defaultOpen={false}>
              <div style={{ marginBottom: 8 }}>
                {/* Legend */}
                <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
                  {[
                    { l: "Total", c: C.ink }, { l: "Sleep", c: C.sleep },
                    { l: "Blood", c: C.blood }, { l: "Oral", c: C.oral },
                  ].map(({ l, c }) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 2, background: c, borderRadius: 1 }} />
                      <span style={{ fontFamily: body, fontSize: 11, color: "var(--ink-50)" }}>{l}</span>
                    </div>
                  ))}
                </div>

                {(() => {
                  const snaps = data!.snapshots
                  if (snaps.length <= 1) return (
                    <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
                      <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-40)", margin: 0, lineHeight: 1.7 }}>
                        {snaps.length === 0
                          ? "No snapshots yet."
                          : "One data point so far. More snapshots will appear as you update your data."}
                      </p>
                    </div>
                  )
                  const firstDate = new Date(snaps[0].date).getTime()
                  const lastDate  = new Date(snaps[snaps.length - 1].date).getTime()
                  const spanDays  = (lastDate - firstDate) / 86400000
                  if (spanDays < 7) return (
                    <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
                      <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-40)", margin: 0, lineHeight: 1.7 }}>
                        Your score history will build here over time. Check back after your next data update.
                      </p>
                    </div>
                  )
                  return (
                    <div style={card}>
                      <ResponsiveContainer width="100%" height={180}>
                        <ComposedChart
                          data={data!.snapshots.map(s => ({ ...s, label: fmtDate(s.date) }))}
                          margin={{ top: 8, right: 16, left: -20, bottom: 0 }}
                        >
                          <XAxis dataKey="label" tick={{ fontFamily: serif, fontSize: 12, fill: "var(--ink-40)" }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontFamily: serif, fontSize: 12, fill: "var(--ink-40)" }} axisLine={false} tickLine={false} tickCount={5} />
                          <Tooltip content={<ScoreTooltip />} cursor={{ stroke: "var(--ink-12)", strokeWidth: 1 }} />
                          {data!.events.map((ev, i) => {
                            const evDate = fmtDate(ev.date)
                            const color = ev.type === "blood" ? C.blood : ev.type === "oral" ? C.oral : C.sleep
                            return <ReferenceLine key={`ev-${i}`} x={evDate} stroke={color} strokeDasharray="3 3" strokeOpacity={0.35} />
                          })}
                          <Area type="monotone" dataKey="total" stroke={C.ink} strokeWidth={2} fill={C.ink} fillOpacity={0.04}
                            dot={{ r: 3, fill: C.ink, stroke: "var(--white)", strokeWidth: 1.5 }}
                            activeDot={{ r: 5, fill: C.ink, stroke: "var(--white)", strokeWidth: 2 }}
                            connectNulls={false}
                          />
                          <Line type="monotone" dataKey="sleep" stroke={C.sleep} strokeWidth={1.25} dot={{ r: 2.5, fill: C.sleep, stroke: "var(--white)", strokeWidth: 1 }} connectNulls={false} />
                          <Line type="monotone" dataKey="blood" stroke={C.blood} strokeWidth={1.25} dot={{ r: 2.5, fill: C.blood, stroke: "var(--white)", strokeWidth: 1 }} connectNulls={false} />
                          <Line type="monotone" dataKey="oral" stroke={C.oral} strokeWidth={1.25} dot={{ r: 2.5, fill: C.oral, stroke: "var(--white)", strokeWidth: 1 }} connectNulls={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })()}
              </div>
            </CollapsibleSection>

            {/* ─── SNAPSHOTS ───────────────────────────────── */}
            <CollapsibleSection title="Snapshots" defaultOpen={false}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: data!.previous ? "1fr 1fr" : "1fr", gap: 12 }}>
                  <div style={{ ...card, borderLeft: `3px solid var(--ink)` }}>
                    <p style={{ fontFamily: body, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 10px" }}>
                      Current · {data!.current?.date ? fmtMonthYear(data!.current.date) : "—"}
                    </p>
                    <p style={{ fontFamily: serif, fontSize: 32, fontWeight: 300, color: C.ink, margin: "0 0 12px", lineHeight: 1 }}>
                      {fmt(data!.current?.total, 0)}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(["sleep", "blood", "oral"] as const).map(k => (
                        <span key={k} style={{ fontFamily: body, fontSize: 10, padding: "3px 10px", borderRadius: 12, background: `${C[k]}12`, color: C[k], fontWeight: 500 }}>
                          {k.charAt(0).toUpperCase() + k.slice(1)} {fmt(data!.current?.[k], 0)}
                        </span>
                      ))}
                    </div>
                  </div>
                  {data!.previous && (
                    <div style={{ ...card, borderLeft: "3px solid var(--ink-12)", opacity: 0.7 }}>
                      <p style={{ fontFamily: body, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 10px" }}>
                        Previous · {fmtMonthYear(data!.previous.date)}
                      </p>
                      <p style={{ fontFamily: serif, fontSize: 32, fontWeight: 300, color: "var(--ink-40)", margin: "0 0 12px", lineHeight: 1 }}>
                        {fmt(data!.previous.total, 0)}
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {(["sleep", "blood", "oral"] as const).map(k => (
                          <span key={k} style={{ fontFamily: body, fontSize: 10, padding: "3px 10px", borderRadius: 12, background: "var(--ink-06)", color: "var(--ink-40)", fontWeight: 500 }}>
                            {k.charAt(0).toUpperCase() + k.slice(1)} {fmt(data!.previous![k], 0)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {!data!.previous && (
                  <p style={{ fontFamily: body, fontSize: 12, color: "var(--ink-30)", marginTop: 12, fontStyle: "italic" }}>
                    More snapshots will appear as you update your data.
                  </p>
                )}
              </div>
            </CollapsibleSection>

          </div>
        )}

      </main>
    </div>
  )
}

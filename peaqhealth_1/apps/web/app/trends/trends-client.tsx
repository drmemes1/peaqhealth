"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Area, AreaChart,
  ReferenceLine, ComposedChart,
} from "recharts"
import { Nav } from "../components/nav"

// ─── Types ──────────────────────────────────────────────────────────────────────

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
  lastLabDate: string | null
  lastOralDate: string | null
  lastCheckin: (CheckinRecord & { notes?: string }) | null
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
  ink: "#141410",
} as const

const serif = "'Cormorant Garamond', Georgia, serif"
const body = "var(--font-body, 'Instrument Sans', sans-serif)"

const card: React.CSSProperties = {
  border: "0.5px solid var(--ink-08)",
  borderRadius: 6,
  padding: "20px 24px",
  background: "white",
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" })
}
function fmtWeekday(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function delta(current: number, previous: number | null | undefined, isFirst: boolean): { text: string; color: string } {
  if (isFirst || previous == null) return { text: "first result", color: "var(--ink-30)" }
  const diff = current - previous
  if (diff === 0) return { text: "— unchanged", color: "var(--ink-30)" }
  if (diff > 0) return { text: `+${diff}`, color: "#2D6A4F" }
  return { text: `${diff}`, color: "#C0392B" }
}

function estimateNext(lastLabDate: string | null) {
  if (!lastLabDate) return "—"
  const d = new Date(lastLabDate)
  d.setMonth(d.getMonth() + 3)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

// ─── Tooltips ───────────────────────────────────────────────────────────────────

function ScoreTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, number | string> }> }) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload
  return (
    <div style={{
      background: "white", border: "0.5px solid var(--ink-12)", borderRadius: 4,
      padding: "10px 14px", fontFamily: body, fontSize: 12, color: C.ink,
      boxShadow: "0 4px 16px rgba(20,20,16,0.06)", minWidth: 140,
    }}>
      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--ink-60)" }}>{pt.label}</p>
      {[
        { k: "total", l: "Total", c: C.ink },
        { k: "sleep", l: "Sleep", c: C.sleep },
        { k: "blood", l: "Blood", c: C.blood },
        { k: "oral", l: "Oral", c: C.oral },
        { k: "lifestyle", l: "Lifestyle", c: C.lifestyle },
      ].map(({ k, l, c }) => (
        <p key={k} style={{ margin: "2px 0", color: "var(--ink-60)" }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: c, marginRight: 6, verticalAlign: "middle" }} />
          {l}: <span style={{ color: C.ink, fontWeight: 500 }}>{pt[k] ?? "—"}</span>
        </p>
      ))}
    </div>
  )
}

function SleepTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "white", border: "0.5px solid var(--ink-12)", borderRadius: 4,
      padding: "8px 12px", fontFamily: body, fontSize: 12, color: C.ink,
      boxShadow: "0 4px 16px rgba(20,20,16,0.06)",
    }}>
      <p style={{ margin: 0, color: "var(--ink-60)" }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontWeight: 500 }}>{payload[0].value != null ? payload[0].value : "—"}</p>
    </div>
  )
}

// ─── Pill toggle ────────────────────────────────────────────────────────────────

function PillToggle({ options, value, onChange, previous }: {
  options: Array<{ value: string; label: string }>
  value: string | null
  onChange: (v: string) => void
  previous?: string | null
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              fontFamily: body, fontSize: 12, padding: "6px 14px",
              borderRadius: 20, border: `1px solid ${active ? C.ink : "var(--ink-12)"}`,
              background: active ? C.ink : "transparent",
              color: active ? "var(--off-white)" : "var(--ink-60)",
              cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            {opt.label}
          </button>
        )
      })}
      {previous && (
        <span style={{ fontFamily: body, fontSize: 11, color: "var(--ink-20)", marginLeft: 4 }}>
          Last time: {previous}
        </span>
      )}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function TrendsClient() {
  const [data, setData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Check-in form state
  const [checkinOpen, setCheckinOpen] = useState(true)
  const [checkinSaved, setCheckinSaved] = useState(false)
  const [checkinSubmitting, setCheckinSubmitting] = useState(false)
  const [exercise, setExercise] = useState<string | null>(null)
  const [diet, setDiet] = useState<string | null>(null)
  const [stress, setStress] = useState<string | null>(null)
  const [alcohol, setAlcohol] = useState<string | null>(null)
  const [sleepPriority, setSleepPriority] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/trends")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function submitCheckin() {
    if (checkinSubmitting) return
    setCheckinSubmitting(true)
    try {
      await fetch("/api/trends/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_frequency: exercise,
          diet_quality: diet,
          stress_level: stress,
          alcohol_frequency: alcohol,
          sleep_priority: sleepPriority,
        }),
      })
      setCheckinSaved(true)
      setCheckinOpen(false)
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

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main className="mx-auto max-w-[720px] px-6 pt-14 pb-20">

        {/* ─── 4a HEADER ───────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 40 }}>
          <h1 style={{ fontFamily: serif, fontSize: 34, fontWeight: 300, color: C.ink, margin: 0 }}>
            Trends
          </h1>
          <span style={{ fontFamily: body, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-30)" }}>
            {today}
          </span>
        </div>

        {/* ─── EMPTY STATE ─────────────────────────────── */}
        {noData && (
          <div style={{ ...card, textAlign: "center", padding: "60px 24px" }}>
            <p style={{ fontFamily: serif, fontSize: 22, fontWeight: 300, color: C.ink, margin: "0 0 12px" }}>
              Your score history will appear here
            </p>
            <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-40)", margin: 0, maxWidth: 360, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>
              After your first full data submission, we'll begin tracking how your scores change over time.
            </p>
          </div>
        )}

        {data && data.snapshots.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* ─── 4b LAST NIGHT CARD ──────────────────── */}
            {hasSleep && lastNightRecent && lastNight && (
              <div style={{ ...card, borderLeft: `3px solid ${C.sleep}`, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 8px" }}>
                      LAST NIGHT{data.wearableProvider ? ` · ${data.wearableProvider.toUpperCase()}` : ""}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {[
                        { label: `Deep ${lastNight.deepPct ?? "—"}%`, ok: (lastNight.deepPct ?? 0) >= 17 },
                        { label: `REM ${lastNight.remPct ?? "—"}%`, ok: (lastNight.remPct ?? 0) >= 18 },
                        { label: `Eff ${lastNight.efficiency ?? "—"}%`, ok: (lastNight.efficiency ?? 0) >= 85 },
                        { label: `HRV ${lastNight.hrv ?? "—"}ms`, ok: (lastNight.hrv ?? 0) >= 50 },
                      ].map(({ label, ok }) => (
                        <span key={label} style={{
                          fontFamily: body, fontSize: 11, padding: "3px 10px",
                          borderRadius: 12,
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
                      {data.current?.sleep ?? "—"}
                    </p>
                    <p style={{ fontFamily: body, fontSize: 9, color: "var(--ink-30)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Sleep /27
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 4c STREAK + 7-DAY AVG ───────────────── */}
            {hasSleep && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Streak */}
                <div style={card}>
                  <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 8px" }}>
                    STREAK
                  </p>
                  <p style={{ fontFamily: serif, fontSize: 32, fontWeight: 300, color: C.ink, margin: "0 0 8px", lineHeight: 1 }}>
                    {data!.streak}<span style={{ fontSize: 16, color: "var(--ink-30)", marginLeft: 4 }}>nights</span>
                  </p>
                  <div style={{ display: "flex", gap: 4 }}>
                    {Array.from({ length: 7 }).map((_, i) => {
                      const filled = i < Math.min(data!.streak, 7)
                      return (
                        <div key={i} style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: filled ? C.sleep : "var(--ink-08)",
                        }} />
                      )
                    })}
                  </div>
                </div>

                {/* 7-day avg HRV */}
                <div style={card}>
                  <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 8px" }}>
                    7-DAY AVG HRV
                  </p>
                  <p style={{ fontFamily: serif, fontSize: 32, fontWeight: 300, color: C.sleep, margin: "0 0 4px", lineHeight: 1 }}>
                    {data!.avgHrv ?? "—"}<span style={{ fontSize: 14, color: "var(--ink-30)", marginLeft: 4 }}>ms</span>
                  </p>
                  <p style={{ fontFamily: body, fontSize: 11, color: "var(--ink-30)", margin: 0 }}>
                    Target: 50ms
                    {data!.hrvTrendPct != null && (
                      <span style={{ marginLeft: 8, color: data!.hrvTrendPct >= 0 ? "#2D6A4F" : "#C0392B" }}>
                        {data!.hrvTrendPct >= 0 ? "+" : ""}{data!.hrvTrendPct}% vs last week
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* No sleep empty state */}
            {!hasSleep && (
              <div style={{ ...card, textAlign: "center", padding: "32px 24px" }}>
                <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-40)", margin: 0, lineHeight: 1.7 }}>
                  Connect a wearable in <Link href="/settings" style={{ color: C.sleep, textDecoration: "none" }}>Settings</Link> to see nightly sleep trends.
                </p>
              </div>
            )}

            {/* ─── 4d CROSS-PANEL ALERT ────────────────── */}
            {data!.showCrossPanelAlert && (
              <div style={{ ...card, borderLeft: `3px solid ${C.lifestyle}`, padding: "16px 20px" }}>
                <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: C.lifestyle, margin: "0 0 8px" }}>
                  CROSS-PANEL SIGNAL
                </p>
                <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-60)", margin: 0, lineHeight: 1.7 }}>
                  Your HRV has trended down {Math.abs(data!.hrvTrendPctValue ?? 0)}% this week. Your oral nitrate reducers are low — these two are connected through the nitric oxide pathway. Worth keeping an eye on together.
                </p>
              </div>
            )}

            {/* ─── 4e LIFESTYLE CHECK-IN ───────────────── */}
            {data!.shouldPromptCheckin && !checkinSaved && (
              <div style={{ ...card, border: "0.5px solid var(--ink-12)" }}>
                <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 300, color: C.ink, margin: "0 0 4px" }}>
                  How has your lifestyle been lately?
                </p>
                <p style={{ fontFamily: body, fontSize: 12, color: "var(--ink-30)", margin: "0 0 20px" }}>
                  {isFirstCheckin ? "First check-in" : `Last check-in: ${data!.lastCheckin ? Math.floor((Date.now() - new Date(data!.lastCheckin.checked_in_at).getTime()) / 86400000) : "?"} days ago`}
                </p>

                {checkinOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Exercise */}
                    <div>
                      <p style={{ fontFamily: body, fontSize: 11, color: "var(--ink-50)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Exercise</p>
                      <PillToggle
                        options={[
                          { value: "less", label: "Less than before" },
                          { value: "same", label: "Same" },
                          { value: "more", label: "More than before" },
                        ]}
                        value={exercise}
                        onChange={setExercise}
                        previous={isFirstCheckin ? undefined : prevCheckin?.exercise_frequency}
                      />
                    </div>

                    {/* Diet */}
                    <div>
                      <p style={{ fontFamily: body, fontSize: 11, color: "var(--ink-50)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Diet</p>
                      <PillToggle
                        options={[
                          { value: "worse", label: "Worse" },
                          { value: "same", label: "Same" },
                          { value: "better", label: "Better" },
                        ]}
                        value={diet}
                        onChange={setDiet}
                        previous={isFirstCheckin ? undefined : prevCheckin?.diet_quality}
                      />
                    </div>

                    {/* Stress */}
                    <div>
                      <p style={{ fontFamily: body, fontSize: 11, color: "var(--ink-50)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Stress</p>
                      <PillToggle
                        options={[
                          { value: "higher", label: "Higher" },
                          { value: "same", label: "Same" },
                          { value: "lower", label: "Lower" },
                        ]}
                        value={stress}
                        onChange={setStress}
                        previous={isFirstCheckin ? undefined : prevCheckin?.stress_level}
                      />
                    </div>

                    {/* Alcohol */}
                    <div>
                      <p style={{ fontFamily: body, fontSize: 11, color: "var(--ink-50)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Alcohol</p>
                      <PillToggle
                        options={[
                          { value: "more", label: "More" },
                          { value: "same", label: "Same" },
                          { value: "less", label: "Less" },
                          { value: "none", label: "None" },
                        ]}
                        value={alcohol}
                        onChange={setAlcohol}
                        previous={isFirstCheckin ? undefined : prevCheckin?.alcohol_frequency}
                      />
                    </div>

                    {/* Sleep focus */}
                    <div>
                      <p style={{ fontFamily: body, fontSize: 11, color: "var(--ink-50)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sleep focus</p>
                      <PillToggle
                        options={[
                          { value: "less", label: "Less priority" },
                          { value: "same", label: "Same" },
                          { value: "more", label: "More priority" },
                        ]}
                        value={sleepPriority}
                        onChange={setSleepPriority}
                        previous={isFirstCheckin ? undefined : prevCheckin?.sleep_priority}
                      />
                    </div>

                    {/* Submit */}
                    <button
                      onClick={submitCheckin}
                      disabled={checkinSubmitting}
                      style={{
                        fontFamily: body, fontSize: 13, fontWeight: 500,
                        padding: "10px 24px", borderRadius: 4,
                        border: "none", background: C.ink, color: "var(--off-white)",
                        cursor: checkinSubmitting ? "wait" : "pointer",
                        opacity: checkinSubmitting ? 0.6 : 1,
                        alignSelf: "flex-start",
                        transition: "opacity 0.15s ease",
                      }}
                    >
                      {checkinSubmitting ? "Saving..." : "Submit check-in"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Check-in confirmation */}
            {checkinSaved && (
              <div style={{ ...card, borderLeft: `3px solid #2D6A4F`, padding: "14px 20px" }}>
                <p style={{ fontFamily: body, fontSize: 13, color: "#2D6A4F", margin: 0 }}>
                  Check-in saved — we'll factor this into your next insights.
                </p>
              </div>
            )}

            {/* ─── 4f HRV CHART ────────────────────────── */}
            {hasSleep && (
              <div>
                <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 300, color: C.ink, margin: "0 0 16px" }}>
                  Sleep detail
                </h2>
                <div style={{ ...card, marginBottom: 12 }}>
                  <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 12px" }}>
                    Nightly HRV <span style={{ color: "var(--ink-20)" }}>· ms</span>
                  </p>
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart
                      data={data!.sleepNights.map(n => ({ ...n, label: fmtDate(n.date) }))}
                      margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="label"
                        tick={{ fontFamily: serif, fontSize: 11, fill: "rgba(20,20,16,0.3)" }}
                        axisLine={false} tickLine={false}
                        interval={Math.max(0, Math.floor(data!.sleepNights.length / 8))}
                      />
                      <YAxis
                        domain={[0, 80]}
                        tick={{ fontFamily: serif, fontSize: 11, fill: "rgba(20,20,16,0.3)" }}
                        axisLine={false} tickLine={false} tickCount={4}
                      />
                      <Tooltip content={<SleepTooltip />} cursor={{ stroke: "var(--ink-12)", strokeWidth: 1 }} />
                      <ReferenceLine y={50} stroke="rgba(20,20,16,0.15)" strokeDasharray="4 4" />
                      <Area
                        type="monotone" dataKey="hrv"
                        stroke={C.sleep} strokeWidth={1.5}
                        fill={C.sleep} fillOpacity={0.08}
                        dot={false} connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* ─── 4g SLEEP EFFICIENCY ──────────────── */}
                <div style={card}>
                  <p style={{ fontFamily: body, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 12px" }}>
                    Sleep efficiency <span style={{ color: "var(--ink-20)" }}>· %</span>
                  </p>
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart
                      data={data!.sleepNights.map(n => ({ ...n, label: fmtDate(n.date) }))}
                      margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="label"
                        tick={{ fontFamily: serif, fontSize: 11, fill: "rgba(20,20,16,0.3)" }}
                        axisLine={false} tickLine={false}
                        interval={Math.max(0, Math.floor(data!.sleepNights.length / 8))}
                      />
                      <YAxis
                        domain={[60, 100]}
                        tick={{ fontFamily: serif, fontSize: 11, fill: "rgba(20,20,16,0.3)" }}
                        axisLine={false} tickLine={false} tickCount={4}
                      />
                      <Tooltip content={<SleepTooltip />} cursor={{ stroke: "var(--ink-12)", strokeWidth: 1 }} />
                      <ReferenceLine y={85} stroke="rgba(20,20,16,0.15)" strokeDasharray="4 4" />
                      <Area
                        type="monotone" dataKey="efficiency"
                        stroke={C.sleep} strokeWidth={1.5}
                        fill={C.sleep} fillOpacity={0.08}
                        dot={false} connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ─── 4h SCORE OVER TIME ──────────────────── */}
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 300, color: C.ink, margin: "0 0 16px" }}>
                Score over time
              </h2>

              {/* Legend */}
              <div style={{ display: "flex", gap: 20, marginBottom: 12, flexWrap: "wrap" }}>
                {[
                  { l: "Total", c: C.ink },
                  { l: "Sleep", c: C.sleep },
                  { l: "Blood", c: C.blood },
                  { l: "Oral", c: C.oral },
                  { l: "Lifestyle", c: C.lifestyle },
                ].map(({ l, c }) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 2, background: c, borderRadius: 1 }} />
                    <span style={{ fontFamily: body, fontSize: 11, color: "var(--ink-50)" }}>{l}</span>
                  </div>
                ))}
              </div>

              {data!.snapshots.length === 1 ? (
                <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
                  <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-40)", margin: 0, lineHeight: 1.7 }}>
                    One data point so far. More snapshots will appear as you update your data.
                  </p>
                </div>
              ) : (
                <div style={card}>
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart
                      data={data!.snapshots.map(s => ({ ...s, label: fmtDate(s.date) }))}
                      margin={{ top: 8, right: 16, left: -20, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="label"
                        tick={{ fontFamily: serif, fontSize: 12, fill: "rgba(20,20,16,0.4)" }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontFamily: serif, fontSize: 12, fill: "rgba(20,20,16,0.4)" }}
                        axisLine={false} tickLine={false} tickCount={5}
                      />
                      <Tooltip content={<ScoreTooltip />} cursor={{ stroke: "var(--ink-12)", strokeWidth: 1 }} />

                      {/* Event markers */}
                      {data!.events.map((ev, i) => {
                        const evDate = fmtDate(ev.date)
                        const color = ev.type === "blood" ? C.blood : ev.type === "oral" ? C.oral : C.sleep
                        return <ReferenceLine key={`ev-${i}`} x={evDate} stroke={color} strokeDasharray="3 3" strokeOpacity={0.35} />
                      })}

                      <Area type="monotone" dataKey="total" stroke={C.ink} strokeWidth={2} fill={C.ink} fillOpacity={0.04}
                        dot={{ r: 3, fill: C.ink, stroke: "white", strokeWidth: 1.5 }}
                        activeDot={{ r: 5, fill: C.ink, stroke: "white", strokeWidth: 2 }}
                        connectNulls={false}
                      />
                      <Line type="monotone" dataKey="sleep" stroke={C.sleep} strokeWidth={1.25}
                        dot={{ r: 2.5, fill: C.sleep, stroke: "white", strokeWidth: 1 }} connectNulls={false} />
                      <Line type="monotone" dataKey="blood" stroke={C.blood} strokeWidth={1.25}
                        dot={{ r: 2.5, fill: C.blood, stroke: "white", strokeWidth: 1 }} connectNulls={false} />
                      <Line type="monotone" dataKey="oral" stroke={C.oral} strokeWidth={1.25}
                        dot={{ r: 2.5, fill: C.oral, stroke: "white", strokeWidth: 1 }} connectNulls={false} />
                      <Line type="monotone" dataKey="lifestyle" stroke={C.lifestyle} strokeWidth={1.25}
                        dot={{ r: 2.5, fill: C.lifestyle, stroke: "white", strokeWidth: 1 }} connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ─── 4i SNAPSHOT COMPARISON ───────────────── */}
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 300, color: C.ink, margin: "0 0 16px" }}>
                Snapshots
              </h2>

              {/* Delta cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                {([
                  { key: "total" as const, label: "TOTAL", max: 100 },
                  { key: "sleep" as const, label: "SLEEP", max: 27 },
                  { key: "blood" as const, label: "BLOOD", max: 33 },
                  { key: "oral" as const, label: "ORAL", max: 27 },
                ]).map(panel => {
                  const cur = data!.current?.[panel.key] ?? 0
                  const prev = data!.previous?.[panel.key]
                  const d = delta(cur, prev, data!.previous == null)
                  const color = C[panel.key as keyof typeof C] ?? C.ink
                  return (
                    <div key={panel.key} style={{ ...card, borderTop: `2px solid ${color}`, padding: "14px 14px 12px" }}>
                      <p style={{ fontFamily: body, fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 6px" }}>
                        {panel.label} {panel.key !== "total" && <span style={{ color: "var(--ink-20)" }}>/{panel.max}</span>}
                      </p>
                      <p style={{ fontFamily: serif, fontSize: 28, fontWeight: 300, color, margin: "0 0 4px", lineHeight: 1 }}>
                        {cur}
                      </p>
                      <p style={{ fontFamily: body, fontSize: 10, color: d.color, margin: 0 }}>{d.text}</p>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: data!.previous ? "1fr 1fr" : "1fr", gap: 12 }}>
                {/* Current */}
                <div style={{ ...card, borderLeft: `3px solid ${C.ink}` }}>
                  <p style={{ fontFamily: body, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 10px" }}>
                    Current · {data!.current?.date ? fmtMonthYear(data!.current.date) : "—"}
                  </p>
                  <p style={{ fontFamily: serif, fontSize: 32, fontWeight: 300, color: C.ink, margin: "0 0 12px", lineHeight: 1 }}>
                    {data!.current?.total ?? 0}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(["sleep", "blood", "oral", "lifestyle"] as const).map(k => (
                      <span key={k} style={{
                        fontFamily: body, fontSize: 10, padding: "3px 10px",
                        borderRadius: 12, background: `${C[k]}12`, color: C[k], fontWeight: 500,
                      }}>
                        {k.charAt(0).toUpperCase() + k.slice(1)} {data!.current?.[k] ?? 0}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Previous */}
                {data!.previous && (
                  <div style={{ ...card, borderLeft: "3px solid var(--ink-12)", opacity: 0.7 }}>
                    <p style={{ fontFamily: body, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: "0 0 10px" }}>
                      Previous · {fmtMonthYear(data!.previous.date)}
                    </p>
                    <p style={{ fontFamily: serif, fontSize: 32, fontWeight: 300, color: "var(--ink-40)", margin: "0 0 12px", lineHeight: 1 }}>
                      {data!.previous.total}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(["sleep", "blood", "oral", "lifestyle"] as const).map(k => (
                        <span key={k} style={{
                          fontFamily: body, fontSize: 10, padding: "3px 10px",
                          borderRadius: 12, background: "var(--ink-06)", color: "var(--ink-40)", fontWeight: 500,
                        }}>
                          {k.charAt(0).toUpperCase() + k.slice(1)} {data!.previous![k]}
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

            {/* ─── 4j NEXT SNAPSHOT + PROGRESS BAR ─────── */}
            <div style={{ ...card, background: "var(--off-white)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <p style={{ fontFamily: body, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-40)", margin: 0 }}>
                  Next full snapshot
                </p>
                <span style={{ fontFamily: body, fontSize: 11, color: "var(--ink-30)" }}>
                  Est. {estimateNext(data!.lastLabDate)}
                </span>
              </div>
              <p style={{ fontFamily: body, fontSize: 13, color: "var(--ink-60)", margin: "0 0 12px", lineHeight: 1.7, maxWidth: 480 }}>
                {data!.daysSinceLastLab != null
                  ? `Blood panel is ${data!.daysSinceLastLab} days old.`
                  : "No blood panel uploaded yet."
                }
                {data!.lastOralDate && ` Oral kit submitted ${fmtDate(data!.lastOralDate)}.`}
              </p>

              {/* Progress bar */}
              {data!.daysSinceLastLab != null && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    height: 6, borderRadius: 3,
                    background: "var(--ink-06)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      background: C.ink,
                      opacity: 0.25,
                      width: `${Math.min((data!.daysSinceLastLab / 90) * 100, 100)}%`,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  <p style={{ fontFamily: body, fontSize: 10, color: "var(--ink-25)", margin: "4px 0 0" }}>
                    {data!.daysSinceLastLab} of 90 days
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: 16 }}>
                <Link href="/dashboard/blood" style={{
                  fontFamily: body, fontSize: 12, color: C.blood,
                  textDecoration: "none", letterSpacing: "0.02em",
                }}>
                  Upload labs →
                </Link>
                <Link href="/shop" style={{
                  fontFamily: body, fontSize: 12, color: C.oral,
                  textDecoration: "none", letterSpacing: "0.02em",
                }}>
                  Order oral kit →
                </Link>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  )
}

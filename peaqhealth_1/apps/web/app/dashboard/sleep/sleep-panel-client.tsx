"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Nav } from "../../components/nav"
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts"
import { markerInfo } from "../../../lib/markerInfo"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  nights: Array<Record<string, unknown>>
  snapshot: Record<string, unknown> | null
  wearable: Record<string, unknown> | null
}

// ─── Provider priority for dedup ─────────────────────────────────────────────

const PROVIDER_PRIORITY: Record<string, number> = {
  whoop: 0,
  oura: 1,
  garmin: 2,
}

function bestNightPerDate(nights: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const byDate = new Map<string, Record<string, unknown>>()
  for (const night of nights) {
    const date = night.date as string
    const src = (night.source as string | null) ?? "unknown"
    const existing = byDate.get(date)
    if (!existing) {
      byDate.set(date, night)
    } else {
      const existingSrc = (existing.source as string | null) ?? "unknown"
      const existingPrio = PROVIDER_PRIORITY[existingSrc] ?? 99
      const newPrio = PROVIDER_PRIORITY[src] ?? 99
      if (newPrio < existingPrio) byDate.set(date, night)
    }
  }
  return Array.from(byDate.values()).sort((a, b) =>
    (b.date as string).localeCompare(a.date as string)
  )
}

function avg(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !isNaN(v))
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

// ─── Zone definitions ─────────────────────────────────────────────────────────

type Zone = { label: string; color: string; min: number; max: number }

const SLEEP_ZONES: Record<string, { zones: Zone[]; markerColor: string }> = {
  deepSleep: {
    markerColor: "#185FA5",
    zones: [
      { label: "Low",     color: "#FFCDD2", min: 0,  max: 10 },
      { label: "Watch",   color: "#FFE0B2", min: 10, max: 15 },
      { label: "Good",    color: "#FFF3CD", min: 15, max: 20 },
      { label: "Optimal", color: "#D4EDDA", min: 20, max: 40 },
    ],
  },
  hrv: {
    markerColor: "#185FA5",
    zones: [
      { label: "Low",     color: "#FFCDD2", min: 0,  max: 25 },
      { label: "Watch",   color: "#FFE0B2", min: 25, max: 35 },
      { label: "Good",    color: "#FFF3CD", min: 35, max: 45 },
      { label: "Optimal", color: "#D4EDDA", min: 45, max: 80 },
    ],
  },
  spo2: {
    markerColor: "#185FA5",
    zones: [
      { label: "Low",     color: "#FFCDD2", min: 88, max: 92 },
      { label: "Watch",   color: "#FFE0B2", min: 92, max: 95 },
      { label: "Good",    color: "#FFF3CD", min: 95, max: 96 },
      { label: "Optimal", color: "#D4EDDA", min: 96, max: 100 },
    ],
  },
  rem: {
    markerColor: "#185FA5",
    zones: [
      { label: "Low",     color: "#FFCDD2", min: 0,  max: 12 },
      { label: "Watch",   color: "#FFE0B2", min: 12, max: 16 },
      { label: "Good",    color: "#FFF3CD", min: 16, max: 22 },
      { label: "Optimal", color: "#D4EDDA", min: 22, max: 40 },
    ],
  },
  efficiency: {
    markerColor: "#185FA5",
    zones: [
      { label: "Low",     color: "#FFCDD2", min: 60, max: 75 },
      { label: "Watch",   color: "#FFE0B2", min: 75, max: 82 },
      { label: "Good",    color: "#FFF3CD", min: 82, max: 88 },
      { label: "Optimal", color: "#D4EDDA", min: 88, max: 100 },
    ],
  },
}

type Status = "optimal" | "good" | "watch" | "attention"

function getStatus(value: number | null, zoneKey: string): Status {
  if (value == null) return "attention"
  const config = SLEEP_ZONES[zoneKey]
  if (!config) return "attention"
  const zones = config.zones
  // zones ordered: Low, Watch, Good, Optimal
  const labels = ["Low", "Watch", "Good", "Optimal"]
  for (const zone of zones) {
    if (value >= zone.min && value < zone.max) {
      const label = zone.label
      if (label === "Optimal") return "optimal"
      if (label === "Good") return "good"
      if (label === "Watch") return "watch"
      return "attention"
    }
  }
  // Check if value equals max of last zone
  const last = zones[zones.length - 1]
  if (value >= last.min && value <= last.max) return "optimal"
  // Below all zones
  if (value < zones[0].min) return "attention"
  return "attention"
}

// ─── Range bar ───────────────────────────────────────────────────────────────

function SleepRangeBar({ value, zoneKey }: { value: number; zoneKey: string }) {
  const config = SLEEP_ZONES[zoneKey]
  if (!config) return null

  const zones = config.zones
  const totalMin = zones[0].min
  const totalMax = zones[zones.length - 1].max
  const totalRange = totalMax - totalMin
  const clampedValue = Math.max(totalMin, Math.min(totalMax, value))
  const markerPct = ((clampedValue - totalMin) / totalRange) * 100
  const zonePcts = zones.map(z => ((z.max - z.min) / totalRange) * 100)

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ position: "relative", height: "14px", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: "6px", display: "flex", borderRadius: "3px", overflow: "hidden", gap: "1px" }}>
          {zones.map((zone, i) => (
            <div key={i} style={{
              flex: `0 0 ${zonePcts[i]}%`,
              background: zone.color,
              borderRadius: i === 0 ? "3px 0 0 3px" : i === zones.length - 1 ? "0 3px 3px 0" : "0",
            }} />
          ))}
        </div>
        <div style={{
          position: "absolute", top: "50%", left: `${markerPct}%`,
          transform: "translate(-50%, -50%)",
          width: "10px", height: "10px", borderRadius: "50%",
          background: config.markerColor,
          border: "2px solid white",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          zIndex: 2,
          pointerEvents: "none",
        }} />
      </div>
    </div>
  )
}

// ─── Collapsible section ─────────────────────────────────────────────────────

function Section({ title, defaultOpen, children }: {
  title: string
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 0 8px", border: "none", background: "transparent", cursor: "pointer",
          borderBottom: "0.5px solid var(--ink-12)",
        }}
      >
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)", fontWeight: 600 }}>
          {title}
        </span>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: "var(--ink-30)",
          width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
          border: "0.5px solid var(--ink-12)", borderRadius: "50%",
        }}>
          {open ? "−" : "+"}
        </span>
      </button>
      <div style={{ maxHeight: open ? 8000 : 0, opacity: open ? 1 : 0, overflow: "hidden", transition: "max-height 0.35s ease, opacity 0.3s ease" }}>
        {children}
      </div>
    </div>
  )
}

// ─── Status badge styles ─────────────────────────────────────────────────────

const FLAG_STYLES: Record<Status, { bg: string; color: string; label: string }> = {
  optimal:   { bg: "#EAF3DE", color: "#3B6D11", label: "Optimal" },
  good:      { bg: "#EBF2FA", color: "#185FA5", label: "Good" },
  watch:     { bg: "#FEF3C7", color: "#92400E", label: "Watch" },
  attention: { bg: "#FEE2E2", color: "#991B1B", label: "Low" },
}

// ─── Sleep mini chart ────────────────────────────────────────────────────────

function SleepMiniChart({
  data, dataKey, color, refY, label, unit, domain,
}: {
  data: Array<{ label: string; value: number | null }>
  dataKey: string
  color: string
  refY: number
  label: string
  unit: string
  domain: [number, number]
}) {
  return (
    <div style={{
      background: "var(--peaq-bg-card, #fff)",
      border: "0.5px solid var(--ink-08)",
      borderRadius: 8,
      padding: "14px 16px",
      marginBottom: 12,
    }}>
      <p style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em",
        color: "var(--ink-40)", margin: "0 0 12px",
      }}>
        {label} <span style={{ color: "var(--ink-20)" }}>· {unit}</span>
      </p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, fill: "var(--ink-30)" }}
            axisLine={false} tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8))}
          />
          <YAxis
            domain={domain}
            tick={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, fill: "var(--ink-30)" }}
            axisLine={false} tickLine={false} tickCount={4}
          />
          <Tooltip
            contentStyle={{
              fontFamily: "var(--font-body)", fontSize: 12,
              background: "var(--peaq-bg-card, #fff)",
              border: "0.5px solid var(--ink-08)",
              borderRadius: 6, padding: "6px 10px",
            }}
          />
          <ReferenceLine y={refY} stroke="var(--ink-12)" strokeDasharray="4 4" />
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

// ─── Sleep metric row ────────────────────────────────────────────────────────

function MetricRow({
  name,
  sublabel,
  value,
  unit,
  status,
  zoneKey,
  numericValue,
  infoContent,
}: {
  name: string
  sublabel: string
  value: string
  unit: string
  status: Status
  zoneKey: string
  numericValue: number | null
  infoContent?: { why: string; target: string; citation: string; tip?: string }
}) {
  const [expanded, setExpanded] = useState(false)
  const fs = FLAG_STYLES[status]
  const dotColor = status === "optimal" ? "#3B6D11" : status === "good" ? "#185FA5" : status === "watch" ? "#C49A3C" : "#A32D2D"

  return (
    <div style={{ borderBottom: "0.5px solid var(--ink-06)" }}>
      <div style={{ padding: "12px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: "var(--ink)" }}>{name}</span>
              {infoContent && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{
                    background: "none", border: "0.5px solid var(--ink-20)", borderRadius: "50%",
                    width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0, flexShrink: 0,
                    fontFamily: "var(--font-body)", fontSize: 9, color: "var(--ink-40)",
                  }}
                  aria-label={expanded ? "Hide info" : "Show info"}
                >
                  ⓘ
                </button>
              )}
            </div>
            <p style={{ margin: "1px 0 0 14px", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)" }}>{sublabel}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink)" }}>
              {value}
              <span style={{ fontSize: 10, color: "var(--ink-30)", marginLeft: 2 }}>{unit}</span>
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 7px", background: fs.bg, color: fs.color }}>
              {fs.label}
            </span>
          </div>
        </div>
        {numericValue != null && (
          <div style={{ marginLeft: 14 }}>
            <SleepRangeBar value={numericValue} zoneKey={zoneKey} />
          </div>
        )}
      </div>
      <div style={{ maxHeight: expanded && infoContent ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s ease, opacity 0.3s ease", opacity: expanded && infoContent ? 1 : 0 }}>
        {infoContent && (
          <div style={{
            background: "var(--peaq-bg-secondary, #F0EFE8)",
            borderRadius: "0 0 8px 8px",
            padding: "12px 16px",
            marginTop: 0,
            marginBottom: 8,
          }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, lineHeight: 1.6, color: "var(--ink-60)", margin: "0 0 8px" }}>
              {infoContent.why}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", fontStyle: "italic", margin: "0 0 4px" }}>
              Target: {infoContent.target}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", fontStyle: "italic", margin: 0 }}>
              {infoContent.citation}
            </p>
            {infoContent.tip && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-accent-gold, #C49A3C)", margin: "8px 0 0" }}>
                · {infoContent.tip}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SleepPanelClient({ nights, snapshot, wearable }: Props) {
  const sleepSub = snapshot?.sleep_sub as number | undefined

  const [narrative, setNarrative] = useState<{
    headline: string | null
    narrative: string | null
    positive_signal: string | null
    watch_signal: string | null
    nights_analyzed: number | null
    avg_hrv: number | null
    avg_efficiency: number | null
    avg_deep_pct: number | null
    avg_rem_pct: number | null
    raw_response: { trend_summary?: string } | null
  } | null>(null)

  useEffect(() => {
    fetch("/api/trends/sleep-narrative")
      .then(r => r.json())
      .then((d: { narrative: typeof narrative }) => setNarrative(d.narrative))
      .catch(() => {})
  }, [])

  const provider = wearable?.provider as string | null | undefined
  const lastSynced = wearable?.last_synced_at as string | null | undefined

  const deduped = bestNightPerDate(nights)

  if (deduped.length === 0) {
    return (
      <div className="min-h-svh bg-off-white">
        <Nav />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Sleep</h1>
            <Link
              href="/dashboard"
              style={{ fontFamily: "var(--font-body)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-30)", textDecoration: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#C49A3C" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-30)" }}
            >
              ← Dashboard
            </Link>
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)", marginTop: 24 }}>
            No sleep data available. Connect your wearable to begin.
          </p>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)", display: "inline-block", marginTop: 12 }}>
            ← Back to dashboard
          </Link>
        </main>
      </div>
    )
  }

  // ── Compute 30-day averages ───────────────────────────────────────────────

  const deepPcts = deduped.map(n => {
    const total = n.total_sleep_minutes as number | null
    const deep = n.deep_sleep_minutes as number | null
    if (!total || !deep || total === 0) return null
    return (deep / total) * 100
  })

  const remPcts = deduped.map(n => {
    const total = n.total_sleep_minutes as number | null
    const rem = n.rem_sleep_minutes as number | null
    if (!total || !rem || total === 0) return null
    return (rem / total) * 100
  })

  const hrvValues = deduped.map(n => n.hrv_rmssd as number | null)
  const spo2Values = deduped.map(n => n.spo2 as number | null)
  const effValues = deduped.map(n => n.sleep_efficiency as number | null)

  const avgDeep = avg(deepPcts)
  const avgRem = avg(remPcts)
  const avgHrv = avg(hrvValues)
  const avgSpo2 = avg(spo2Values)
  const avgEff = avg(effValues)

  // ── Last 7 nights ────────────────────────────────────────────────────────

  const last7 = deduped.slice(0, 7)

  // ── 30-night trend data (oldest → newest for left-to-right charts) ───────

  const bestNights = deduped.slice(0, 30).reverse()

  // ── Status computations ──────────────────────────────────────────────────

  const deepStatus = getStatus(avgDeep, "deepSleep")
  const hrvStatus = getStatus(avgHrv, "hrv")
  const spo2Status = getStatus(avgSpo2, "spo2")
  const remStatus = getStatus(avgRem, "rem")
  const effStatus = getStatus(avgEff, "efficiency")

  const fmt = (v: number | null, decimals = 0) => v == null ? "—" : v.toFixed(decimals)

  const providerLabel = provider
    ? provider.charAt(0).toUpperCase() + provider.slice(1)
    : null

  const syncLabel = lastSynced
    ? new Date(lastSynced).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Sleep</h1>
            {sleepSub !== undefined && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-30)" }}>Sleep panel</span>
            )}
          </div>
          <Link
            href="/dashboard"
            style={{ fontFamily: "var(--font-body)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-30)", textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#C49A3C" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-30)" }}
          >
            ← Dashboard
          </Link>
        </div>

        {/* Source line */}
        {(providerLabel || syncLabel) && (
          <p style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)", margin: "0 0 24px" }}>
            {[providerLabel, syncLabel ? `Synced ${syncLabel}` : null].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Summary metrics — 3-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
          {/* Deep Sleep */}
          <div style={{ border: "0.5px solid var(--ink-12)", padding: "14px", background: "#fff" }}>
            <p style={{ margin: "0 0 2px", fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#185FA5" }}>
              Deep Sleep
            </p>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-30)" }}>30-day avg</p>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--ink)", lineHeight: 1 }}>
              {avgDeep != null ? Math.round(avgDeep) : "—"}
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-30)", marginLeft: 4 }}>%</span>
          </div>

          {/* HRV */}
          <div style={{ border: "0.5px solid var(--ink-12)", padding: "14px", background: "#fff" }}>
            <p style={{ margin: "0 0 2px", fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#185FA5" }}>
              HRV
            </p>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-30)" }}>30-day avg</p>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--ink)", lineHeight: 1 }}>
              {avgHrv != null ? Math.round(avgHrv) : "—"}
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-30)", marginLeft: 4 }}>ms</span>
          </div>

          {/* Sleep Efficiency */}
          <div style={{ border: "0.5px solid var(--ink-12)", padding: "14px", background: "#fff" }}>
            <p style={{ margin: "0 0 2px", fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "#185FA5" }}>
              Efficiency
            </p>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-30)" }}>30-day avg</p>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: "var(--ink)", lineHeight: 1 }}>
              {avgEff != null ? Math.round(avgEff) : "—"}
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-30)", marginLeft: 4 }}>%</span>
          </div>
        </div>

        {/* Sleep Insight */}
        {narrative && (
          <div style={{
            borderLeft: "3px solid var(--sleep-c, #185FA5)",
            background: "var(--peaq-bg-card, #fff)",
            border: "0.5px solid var(--ink-08)",
            borderLeftWidth: 3,
            borderLeftColor: "var(--sleep-c, #185FA5)",
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-40)" }}>
                Sleep · last {narrative.nights_analyzed ?? "—"} nights
              </span>
              {narrative.raw_response?.trend_summary && (
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500,
                  color: narrative.raw_response.trend_summary === "improving" ? "#1D9E75"
                    : narrative.raw_response.trend_summary === "declining" ? "#A32D2D" : "#C49A3C",
                }}>
                  {narrative.raw_response.trend_summary === "improving" ? "↑ Improving"
                    : narrative.raw_response.trend_summary === "declining" ? "↓ Worth watching" : "→ Holding steady"}
                </span>
              )}
            </div>

            {narrative.headline && (
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: "var(--ink)", lineHeight: 1.3, margin: "0 0 10px" }}>
                {narrative.headline}
              </p>
            )}

            {narrative.narrative && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)", lineHeight: 1.65, margin: "0 0 14px" }}>
                {narrative.narrative}
              </p>
            )}

            {narrative.positive_signal && (
              <div style={{ padding: "10px 14px", background: "rgba(29,158,117,0.07)", borderRadius: 6, borderLeft: "3px solid #1D9E75", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.5, marginBottom: 8 }}>
                {narrative.positive_signal}
              </div>
            )}

            {narrative.watch_signal && (
              <div style={{ padding: "10px 14px", background: "rgba(184,134,11,0.07)", borderRadius: 6, borderLeft: "3px solid #C49A3C", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.5 }}>
                {narrative.watch_signal}
              </div>
            )}
          </div>
        )}

        {/* Sleep Metrics section */}
        <Section title="Sleep Metrics" defaultOpen={true}>
          <MetricRow
            name="Deep Sleep"
            sublabel="Slow-wave · target ≥17%"
            value={fmt(avgDeep)}
            unit="%"
            status={deepStatus}
            zoneKey="deepSleep"
            numericValue={avgDeep}
            infoContent={markerInfo["deep-sleep"]}
          />
          <MetricRow
            name="HRV"
            sublabel="RMSSD · age-adjusted target"
            value={fmt(avgHrv)}
            unit="ms"
            status={hrvStatus}
            zoneKey="hrv"
            numericValue={avgHrv}
            infoContent={markerInfo["hrv"]}
          />
          <MetricRow
            name="SpO₂"
            sublabel="Avg saturation · target ≥96%"
            value={fmt(avgSpo2, 1)}
            unit="%"
            status={spo2Status}
            zoneKey="spo2"
            numericValue={avgSpo2}
            infoContent={markerInfo["spo2"]}
          />
          <MetricRow
            name="REM"
            sublabel="Target ≥18%"
            value={fmt(avgRem)}
            unit="%"
            status={remStatus}
            zoneKey="rem"
            numericValue={avgRem}
            infoContent={markerInfo["rem"]}
          />
          <MetricRow
            name="Sleep Efficiency"
            sublabel="Target ≥85%"
            value={fmt(avgEff)}
            unit="%"
            status={effStatus}
            zoneKey="efficiency"
            numericValue={avgEff}
            infoContent={markerInfo["sleep-efficiency"]}
          />
        </Section>

        {/* Last 7 Nights section */}
        <Section title="Last 7 Nights" defaultOpen={true}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", padding: "6px 0 4px", borderBottom: "0.5px solid var(--ink-12)" }}>
            <span style={{ flex: "0 0 90px", fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-30)" }}>Date</span>
            <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-30)", textAlign: "center" }}>Deep</span>
            <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-30)", textAlign: "center" }}>HRV</span>
            <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-30)", textAlign: "center" }}>Eff</span>
            <span style={{ flex: "0 0 50px", fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-30)", textAlign: "right" }}>Source</span>
          </div>
          {last7.map((night, i) => {
            const date = night.date as string
            const total = night.total_sleep_minutes as number | null
            const deep = night.deep_sleep_minutes as number | null
            const hrv = night.hrv_rmssd as number | null
            const eff = night.sleep_efficiency as number | null
            const src = (night.source as string | null) ?? "—"

            const deepPct = total && deep && total > 0 ? (deep / total) * 100 : null

            const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })

            return (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
                <span style={{ flex: "0 0 90px", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink)" }}>{dateLabel}</span>
                <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", textAlign: "center" }}>
                  {deepPct != null ? `${Math.round(deepPct)}%` : "—"}
                </span>
                <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", textAlign: "center" }}>
                  {hrv != null ? `${Math.round(hrv)} ms` : "—"}
                </span>
                <span style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", textAlign: "center" }}>
                  {eff != null ? `${Math.round(eff)}%` : "—"}
                </span>
                <span style={{ flex: "0 0 50px", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", textAlign: "right", textTransform: "capitalize" }}>
                  {src}
                </span>
              </div>
            )
          })}
        </Section>

        {/* Sleep Trends */}
        <Section title="Sleep trends · 30 nights" defaultOpen={false}>
          {bestNights.length >= 3 ? (
            <>
              <SleepMiniChart
                data={bestNights.map(n => ({
                  label: new Date((n.date as string) + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  value: n.deep_sleep_minutes && n.total_sleep_minutes
                    ? ((n.deep_sleep_minutes as number) / (n.total_sleep_minutes as number)) * 100
                    : null,
                }))}
                dataKey="value"
                color="#185FA5"
                refY={17}
                label="Deep sleep"
                unit="% of TST"
                domain={[0, 45]}
              />
              <SleepMiniChart
                data={bestNights.map(n => ({
                  label: new Date((n.date as string) + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  value: n.hrv_rmssd as number | null,
                }))}
                dataKey="value"
                color="#185FA5"
                refY={40}
                label="HRV"
                unit="ms RMSSD"
                domain={[0, 80]}
              />
              <SleepMiniChart
                data={bestNights.map(n => ({
                  label: new Date((n.date as string) + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  value: n.sleep_efficiency as number | null,
                }))}
                dataKey="value"
                color="#185FA5"
                refY={85}
                label="Sleep efficiency"
                unit="%"
                domain={[60, 100]}
              />
              <SleepMiniChart
                data={bestNights.map(n => ({
                  label: new Date((n.date as string) + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                  value: n.spo2 as number | null,
                }))}
                dataKey="value"
                color="#185FA5"
                refY={96}
                label="SpO₂"
                unit="% avg"
                domain={[88, 100]}
              />
            </>
          ) : (
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-40)", padding: "12px 0" }}>
              Need at least 3 nights of data to show trends.
            </p>
          )}
        </Section>

      </main>
    </div>
  )
}

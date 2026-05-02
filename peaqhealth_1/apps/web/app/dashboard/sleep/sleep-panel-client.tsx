// PATTERN: Editorial layout mirrors /dashboard/oral (hero + dividers + always-on sections + drawers).
// Descriptive content (range bars, info expansions, 7-night table, trend mini-charts) preserved.
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { evaluateConnection } from "@peaq/score-engine"
import { ConnectionLineCard } from "../../components/connection-line"
import { Divider } from "../../components/oral/v3/Divider"
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts"
import { markerInfo } from "../../../lib/markerInfo"

const SERIF = "var(--font-display)"
const SANS = "var(--font-body)"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  nights: Array<Record<string, unknown>>
  snapshot: Record<string, unknown> | null
  wearable: Record<string, unknown> | null
  connectionInput?: import("@peaq/score-engine").ConnectionInput
}

// ─── Provider priority for dedup ─────────────────────────────────────────────

const PROVIDER_PRIORITY: Record<string, number> = { whoop: 0, oura: 1, garmin: 2 }

function bestNightPerDate(nights: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const byDate = new Map<string, Record<string, unknown>>()
  for (const night of nights) {
    const date = night.date as string
    const src = (night.source as string | null) ?? "unknown"
    const existing = byDate.get(date)
    if (!existing) { byDate.set(date, night); continue }
    const existingPrio = PROVIDER_PRIORITY[(existing.source as string | null) ?? "unknown"] ?? 99
    const newPrio = PROVIDER_PRIORITY[src] ?? 99
    if (newPrio < existingPrio) byDate.set(date, night)
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

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"]
function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return ""
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
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
  for (const zone of zones) {
    if (value >= zone.min && value < zone.max) {
      const label = zone.label
      if (label === "Optimal") return "optimal"
      if (label === "Good") return "good"
      if (label === "Watch") return "watch"
      return "attention"
    }
  }
  const last = zones[zones.length - 1]
  if (value >= last.min && value <= last.max) return "optimal"
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
              flex: `0 0 ${zonePcts[i]}%`, background: zone.color,
              borderRadius: i === 0 ? "3px 0 0 3px" : i === zones.length - 1 ? "0 3px 3px 0" : "0",
            }} />
          ))}
        </div>
        <div style={{
          position: "absolute", top: "50%", left: `${markerPct}%`,
          transform: "translate(-50%, -50%)",
          width: "10px", height: "10px", borderRadius: "50%",
          background: config.markerColor, border: "2px solid white",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)", zIndex: 2, pointerEvents: "none",
        }} />
      </div>
    </div>
  )
}

// ─── Status flag styles ──────────────────────────────────────────────────────

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
      background: "#fff", border: "0.5px solid var(--ink-12)",
      borderRadius: 10, padding: "16px 18px", marginBottom: 14,
    }}>
      <p style={{
        fontFamily: SANS, fontSize: 10, textTransform: "uppercase",
        letterSpacing: "0.12em", color: "var(--ink-60)",
        fontWeight: 600, margin: "0 0 12px",
      }}>
        {label} <span style={{ color: "var(--ink-30)", fontWeight: 400 }}>· {unit}</span>
      </p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontFamily: SANS, fontSize: 11, fill: "var(--ink-60)" }}
            axisLine={false} tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8))}
          />
          <YAxis
            domain={domain}
            tick={{ fontFamily: SANS, fontSize: 11, fill: "var(--ink-60)" }}
            axisLine={false} tickLine={false} tickCount={4}
          />
          <Tooltip
            contentStyle={{
              fontFamily: SANS, fontSize: 12, background: "#fff",
              border: "0.5px solid var(--ink-12)", borderRadius: 6, padding: "6px 10px",
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
  name, sublabel, value, unit, status, zoneKey, numericValue, infoContent,
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
    <div style={{ borderBottom: "0.5px solid var(--ink-12)" }}>
      <div style={{ padding: "16px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>{name}</span>
              {infoContent && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{
                    background: "none", border: "0.5px solid var(--ink-20)", borderRadius: "50%",
                    width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0, flexShrink: 0,
                    fontFamily: SANS, fontSize: 9, color: "var(--ink-60)",
                  }}
                  aria-label={expanded ? "Hide info" : "Show info"}
                >
                  ⓘ
                </button>
              )}
            </div>
            <p style={{ margin: "2px 0 0 16px", fontFamily: SANS, fontSize: 12, color: "var(--ink-60)" }}>{sublabel}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              {value}
              <span style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink-60)", marginLeft: 3, fontWeight: 400 }}>{unit}</span>
            </span>
            <span style={{
              fontFamily: SANS, fontSize: 9, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "3px 8px", borderRadius: 20, background: fs.bg, color: fs.color,
            }}>
              {fs.label}
            </span>
          </div>
        </div>
        {numericValue != null && (
          <div style={{ marginLeft: 16, marginTop: 4 }}>
            <SleepRangeBar value={numericValue} zoneKey={zoneKey} />
          </div>
        )}
      </div>
      <div style={{
        maxHeight: expanded && infoContent ? 320 : 0,
        overflow: "hidden",
        transition: "max-height 0.35s ease, opacity 0.3s ease",
        opacity: expanded && infoContent ? 1 : 0,
      }}>
        {infoContent && (
          <div style={{
            background: "var(--off-white)", borderRadius: 8,
            padding: "14px 16px", marginBottom: 12,
            border: "0.5px solid var(--ink-12)",
          }}>
            <p style={{ fontFamily: SANS, fontSize: 13, lineHeight: 1.6, color: "var(--ink-80)", margin: "0 0 8px" }}>
              {infoContent.why}
            </p>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "var(--ink-60)", margin: "0 0 4px" }}>
              Target: {infoContent.target}
            </p>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "var(--ink-60)", margin: 0 }}>
              {infoContent.citation}
            </p>
            {infoContent.tip && (
              <p style={{ fontFamily: SANS, fontSize: 12, color: "var(--gold)", margin: "10px 0 0", fontWeight: 500 }}>
                · {infoContent.tip}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{
        fontFamily: SERIF, fontSize: 28, fontWeight: 600,
        color: "var(--ink)", margin: "0 0 6px", letterSpacing: "-0.02em",
      }}>
        {title}
      </h2>
      <p style={{
        fontFamily: SANS, fontSize: 14, color: "var(--ink-60)",
        margin: 0, maxWidth: 640, lineHeight: 1.55,
      }}>
        {intro}
      </p>
    </div>
  )
}

// ─── Stat block ──────────────────────────────────────────────────────────────

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: "0.16em",
        textTransform: "uppercase", color: "var(--ink-60)",
        fontWeight: 600, marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: SERIF, fontSize: 36, fontWeight: 500,
        color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1,
      }}>
        {value}
      </div>
      {hint && (
        <div style={{
          fontFamily: SANS, fontSize: 11, color: "var(--ink-60)",
          marginTop: 6, lineHeight: 1.4,
        }}>
          {hint}
        </div>
      )}
    </div>
  )
}

// ─── Methodology drawer ─────────────────────────────────────────────────────

function SleepMethodologyDrawer() {
  const NOTES: Array<{ heading: string; body: string }> = [
    {
      heading: "Source data",
      body: "Nightly metrics come from your wearable provider's API — total sleep, deep sleep, REM, sleep efficiency, HRV (RMSSD), and SpO₂ where available. When multiple wearables are connected, we use the highest-priority device (Whoop > Oura > Garmin) for any given night.",
    },
    {
      heading: "30-day averages",
      body: "All headline numbers are rolling averages over your most recent 30 nights of data. Single-night swings are normal; the trend is what tracks recovery.",
    },
    {
      heading: "Zone thresholds",
      body: "Optimal/Good/Watch/Low bands are derived from population research — Walker (sleep architecture), Shaffer & Ginsberg (HRV), AASM and Aktas (SpO₂). They are not personalized; longevity-leaning interpretation favors the upper end of each Optimal band.",
    },
    {
      heading: "Connection lines",
      body: "Cross-panel connections are evaluated against your current oral, blood, and lifestyle data. They surface when there is enough signal in two or more panels to support a real pattern, not a guess.",
    },
  ]
  return (
    <details style={{
      border: "0.5px solid var(--ink-12)", borderRadius: 12,
      padding: "18px 22px", background: "var(--off-white)", marginBottom: 12,
    }}>
      <summary style={{
        fontFamily: SANS, fontSize: 13, fontWeight: 600,
        color: "var(--ink)", cursor: "pointer", listStyle: "none",
      }}>
        Methodology — what was measured and how
      </summary>
      <div style={{ marginTop: 14 }}>
        {NOTES.map((n, i) => (
          <div key={n.heading} style={{
            padding: "16px 0",
            borderTop: i === 0 ? undefined : "0.5px solid var(--ink-12)",
          }}>
            <h4 style={{
              fontFamily: SERIF, fontSize: 14, fontWeight: 600,
              color: "var(--ink)", margin: "0 0 6px", letterSpacing: "-0.01em",
            }}>{n.heading}</h4>
            <p style={{
              fontFamily: SANS, fontSize: 13, color: "var(--ink-80)",
              lineHeight: 1.6, margin: 0,
            }}>{n.body}</p>
          </div>
        ))}
      </div>
    </details>
  )
}

function SleepReferencesDrawer() {
  const REFS: string[] = [
    "Walker MP. Why We Sleep. Scribner 2017. (Sleep architecture and longevity)",
    "Shaffer F, Ginsberg JP. Front Public Health 2017. (HRV measurement and population norms)",
    "Aktas G et al. Sleep Med Rev 2020. (Nocturnal SpO₂ and cardiovascular outcomes)",
    "Pinheiro AB et al. PLoS One 2018. (RMSSD as recovery marker)",
    "Hirshkowitz M et al. Sleep Health 2015. (National Sleep Foundation duration recommendations)",
  ]
  return (
    <details style={{
      border: "0.5px solid var(--ink-12)", borderRadius: 12,
      padding: "18px 22px", background: "var(--off-white)", marginBottom: 12,
    }}>
      <summary style={{
        fontFamily: SANS, fontSize: 13, fontWeight: 600,
        color: "var(--ink)", cursor: "pointer", listStyle: "none",
      }}>
        References
      </summary>
      <ul style={{ margin: "14px 0 0", paddingLeft: 20 }}>
        {REFS.map((ref, i) => (
          <li key={i} style={{
            fontFamily: SANS, fontSize: 12, color: "var(--ink-80)",
            lineHeight: 1.6, marginBottom: 6,
          }}>{ref}</li>
        ))}
      </ul>
    </details>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SleepPanelClient({ nights, snapshot, wearable, connectionInput }: Props) {
  void snapshot

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

  const providerLabel = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : null
  const monthYearLabel = formatMonthYear(lastSynced)

  // ── Empty state ───────────────────────────────────────────────────────────

  if (deduped.length === 0) {
    return (
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 28px 120px" }}>
        <section style={{ marginBottom: 48 }}>
          <p style={{
            fontFamily: SANS, fontSize: 11, letterSpacing: "0.16em",
            textTransform: "uppercase", fontWeight: 600,
            color: "var(--gold)", margin: "0 0 16px",
          }}>
            Sleep
          </p>
          <h1 style={{
            fontFamily: SERIF, fontSize: 56, fontWeight: 700,
            color: "var(--ink)", margin: "0 0 24px",
            letterSpacing: "-0.035em", lineHeight: 1.05,
          }}>
            How you slept.
          </h1>
          <p style={{
            fontFamily: SANS, fontSize: 18, fontWeight: 400,
            color: "var(--ink-80)", margin: "0 0 18px",
            lineHeight: 1.6, maxWidth: 720,
          }}>
            Your wearable hasn&apos;t synced any nights yet. Once data starts flowing, this page will show your sleep architecture, recovery vitals, and a 30-night trend across HRV, deep sleep, efficiency, and SpO₂.
          </p>
          <p style={{
            fontFamily: SERIF, fontStyle: "italic", fontSize: 16,
            color: "var(--ink-60)", margin: 0, lineHeight: 1.55, maxWidth: 720,
          }}>
            Sleep is where the body does its quiet repair work.
          </p>
          <Link href="/dashboard" style={{
            fontFamily: SANS, fontSize: 13, color: "var(--gold)",
            fontWeight: 600, letterSpacing: "0.04em",
            textDecoration: "none", display: "inline-block", marginTop: 24,
          }}>
            ← Back to dashboard
          </Link>
        </section>
      </main>
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
  const totalSleepMinutes = deduped.map(n => n.total_sleep_minutes as number | null)

  const avgDeep = avg(deepPcts)
  const avgRem = avg(remPcts)
  const avgHrv = avg(deduped.map(n => n.hrv_rmssd as number | null))
  const avgSpo2 = avg(deduped.map(n => n.spo2 as number | null))
  const avgEff = avg(deduped.map(n => n.sleep_efficiency as number | null))
  const avgTotalMin = avg(totalSleepMinutes)
  const avgDurationHrs = avgTotalMin != null ? avgTotalMin / 60 : null

  const deepStatus = getStatus(avgDeep, "deepSleep")
  const hrvStatus = getStatus(avgHrv, "hrv")
  const spo2Status = getStatus(avgSpo2, "spo2")
  const remStatus = getStatus(avgRem, "rem")
  const effStatus = getStatus(avgEff, "efficiency")

  const fmt = (v: number | null, decimals = 0) => v == null ? "—" : v.toFixed(decimals)

  const last7 = deduped.slice(0, 7)
  const bestNights = deduped.slice(0, 30).reverse()

  const eyebrowParts: string[] = ["Sleep"]
  if (providerLabel) eyebrowParts.push(providerLabel)
  if (monthYearLabel) eyebrowParts.push(monthYearLabel)
  const eyebrow = eyebrowParts.join(" · ")

  const lede = `Your last ${deduped.length} ${deduped.length === 1 ? "night" : "nights"} averaged ${avgDurationHrs != null ? `${avgDurationHrs.toFixed(1)} hours of sleep` : "—"}, ${avgHrv != null ? `HRV around ${Math.round(avgHrv)} ms` : "HRV not yet recorded"}, and ${avgEff != null ? `${Math.round(avgEff)}% sleep efficiency` : "efficiency not yet recorded"}. The detail below shows where you sit on each of the architecture and recovery axes.`

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 28px 120px" }}>

      {/* HERO */}
      <section style={{ marginBottom: 48 }}>
        <p style={{
          fontFamily: SANS, fontSize: 11, letterSpacing: "0.16em",
          textTransform: "uppercase", fontWeight: 600,
          color: "var(--gold)", margin: "0 0 16px",
        }}>
          {eyebrow}
        </p>
        <h1 style={{
          fontFamily: SERIF, fontSize: 56, fontWeight: 700,
          color: "var(--ink)", margin: "0 0 24px",
          letterSpacing: "-0.035em", lineHeight: 1.05,
        }}>
          How you slept.
        </h1>
        <p style={{
          fontFamily: SANS, fontSize: 18, fontWeight: 400,
          color: "var(--ink-80)", margin: "0 0 18px",
          lineHeight: 1.6, maxWidth: 720,
        }}>
          {lede}
        </p>
        <p style={{
          fontFamily: SERIF, fontStyle: "italic", fontSize: 16,
          color: "var(--ink-60)", margin: 0, lineHeight: 1.55, maxWidth: 720,
        }}>
          Sleep is where the body does its quiet repair work.
        </p>
      </section>

      <Divider />

      {/* SNAPSHOT */}
      <section id="snapshot" style={{ marginBottom: 16 }}>
        <SectionHeader
          title="Where you stand right now"
          intro="A quick read on the 30-day shape of your sleep. Each panel below digs into a specific axis."
        />
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 24, padding: "24px 28px",
          background: "var(--off-white)",
          border: "0.5px solid var(--ink-12)",
          borderRadius: 14,
        }}>
          <Stat
            label="Sleep duration"
            value={avgDurationHrs != null ? `${avgDurationHrs.toFixed(1)} hr` : "—"}
            hint={avgDurationHrs != null
              ? avgDurationHrs >= 7 && avgDurationHrs <= 9
                ? "In target window"
                : avgDurationHrs < 7 ? "Below target" : "Above target"
              : undefined}
          />
          <Stat
            label="HRV (RMSSD)"
            value={avgHrv != null ? `${Math.round(avgHrv)} ms` : "—"}
            hint={avgHrv != null
              ? avgHrv >= 45 ? "Optimal" : avgHrv >= 35 ? "Good" : avgHrv >= 25 ? "Watch" : "Low"
              : undefined}
          />
          <Stat
            label="Sleep efficiency"
            value={avgEff != null ? `${Math.round(avgEff)}%` : "—"}
            hint={avgEff != null
              ? avgEff >= 88 ? "Optimal" : avgEff >= 82 ? "Good" : avgEff >= 75 ? "Watch" : "Low"
              : undefined}
          />
        </div>
      </section>

      <Divider />

      {/* AI NARRATIVE — insight from last 14 nights */}
      {narrative?.headline && (
        <>
          <section>
            <SectionHeader
              title="What stands out"
              intro={`A read on the last ${narrative.nights_analyzed ?? "few"} nights — the pattern your wearable surfaced.`}
            />
            <div style={{
              background: "#fff", border: "0.5px solid var(--ink-12)",
              borderLeft: "3px solid #185FA5", borderRadius: 10,
              padding: "22px 26px",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 12,
              }}>
                <span style={{
                  fontFamily: SANS, fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "var(--ink-60)", fontWeight: 600,
                }}>
                  Insight · last {narrative.nights_analyzed ?? "—"} nights
                </span>
                {narrative.raw_response?.trend_summary && (
                  <span style={{
                    fontFamily: SANS, fontSize: 11, fontWeight: 600,
                    color: narrative.raw_response.trend_summary === "improving" ? "#1D9E75"
                      : narrative.raw_response.trend_summary === "declining" ? "#A32D2D" : "#C49A3C",
                  }}>
                    {narrative.raw_response.trend_summary === "improving" ? "↑ Improving"
                      : narrative.raw_response.trend_summary === "declining" ? "↓ Worth watching" : "→ Holding steady"}
                  </span>
                )}
              </div>

              <p style={{
                fontFamily: SERIF, fontSize: 22, fontWeight: 600,
                color: "var(--ink)", lineHeight: 1.3,
                margin: "0 0 12px", letterSpacing: "-0.01em",
              }}>
                {narrative.headline}
              </p>

              {narrative.narrative && (
                <p style={{
                  fontFamily: SANS, fontSize: 15, color: "var(--ink-80)",
                  lineHeight: 1.65, margin: "0 0 16px",
                }}>
                  {narrative.narrative}
                </p>
              )}

              {narrative.positive_signal && (
                <div style={{
                  padding: "12px 16px",
                  background: "rgba(29,158,117,0.07)",
                  borderRadius: 6, borderLeft: "3px solid #1D9E75",
                  fontFamily: SANS, fontSize: 13, color: "var(--ink-80)",
                  lineHeight: 1.55, marginBottom: 8,
                }}>
                  {narrative.positive_signal}
                </div>
              )}

              {narrative.watch_signal && (
                <div style={{
                  padding: "12px 16px",
                  background: "rgba(184,134,11,0.07)",
                  borderRadius: 6, borderLeft: "3px solid #C49A3C",
                  fontFamily: SANS, fontSize: 13, color: "var(--ink-80)",
                  lineHeight: 1.55,
                }}>
                  {narrative.watch_signal}
                </div>
              )}
            </div>
          </section>
          <Divider />
        </>
      )}

      {/* SLEEP ARCHITECTURE — Deep + REM */}
      <section>
        <SectionHeader
          title="Sleep architecture"
          intro="Deep sleep is where the body repairs tissue and consolidates physical recovery; REM is where memory and mood get processed. Both are needed — neither alone tells the whole story."
        />
        <MetricRow
          name="Deep sleep"
          sublabel="Slow-wave · target ≥17% of total sleep"
          value={fmt(avgDeep)}
          unit="%"
          status={deepStatus}
          zoneKey="deepSleep"
          numericValue={avgDeep}
          infoContent={markerInfo["deep-sleep"]}
        />
        {connectionInput && <ConnectionLineCard connection={evaluateConnection("deep_sleep", connectionInput)} />}
        <MetricRow
          name="REM sleep"
          sublabel="Target ≥18% of total sleep"
          value={fmt(avgRem)}
          unit="%"
          status={remStatus}
          zoneKey="rem"
          numericValue={avgRem}
          infoContent={markerInfo["rem"]}
        />
        {connectionInput && <ConnectionLineCard connection={evaluateConnection("rem", connectionInput)} />}
      </section>

      <Divider />

      {/* RECOVERY & VITALS — HRV + SpO₂ + Efficiency */}
      <section>
        <SectionHeader
          title="Recovery & vitals"
          intro="HRV captures parasympathetic recovery overnight; SpO₂ reflects breathing quality; efficiency is the percentage of time in bed that you actually slept. Together they show whether the night was restorative."
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
        {connectionInput && <ConnectionLineCard connection={evaluateConnection("recovery_hrv", connectionInput)} />}
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
          name="Sleep efficiency"
          sublabel="Time asleep ÷ time in bed · target ≥85%"
          value={fmt(avgEff)}
          unit="%"
          status={effStatus}
          zoneKey="efficiency"
          numericValue={avgEff}
          infoContent={markerInfo["sleep-efficiency"]}
        />
        {connectionInput && <ConnectionLineCard connection={evaluateConnection("duration", connectionInput)} />}
      </section>

      <Divider />

      {/* LAST 7 NIGHTS */}
      <section>
        <SectionHeader
          title="Last 7 nights"
          intro="Single-night detail for the most recent week. Use this to spot weekend patterns or days with unusual recovery."
        />
        <div style={{
          background: "#fff", border: "0.5px solid var(--ink-12)",
          borderRadius: 12, padding: "16px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", padding: "6px 0 8px", borderBottom: "0.5px solid var(--ink-12)" }}>
            <span style={{ flex: "0 0 100px", fontFamily: SANS, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-60)", fontWeight: 600 }}>Date</span>
            <span style={{ flex: 1, fontFamily: SANS, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-60)", fontWeight: 600, textAlign: "center" }}>Deep</span>
            <span style={{ flex: 1, fontFamily: SANS, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-60)", fontWeight: 600, textAlign: "center" }}>HRV</span>
            <span style={{ flex: 1, fontFamily: SANS, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-60)", fontWeight: 600, textAlign: "center" }}>Eff</span>
            <span style={{ flex: "0 0 60px", fontFamily: SANS, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-60)", fontWeight: 600, textAlign: "right" }}>Source</span>
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
              weekday: "short", month: "short", day: "numeric",
            })
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", padding: "10px 0",
                borderBottom: i === last7.length - 1 ? "none" : "0.5px solid var(--ink-12)",
              }}>
                <span style={{ flex: "0 0 100px", fontFamily: SANS, fontSize: 13, color: "var(--ink)" }}>{dateLabel}</span>
                <span style={{ flex: 1, fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", textAlign: "center" }}>
                  {deepPct != null ? `${Math.round(deepPct)}%` : "—"}
                </span>
                <span style={{ flex: 1, fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", textAlign: "center" }}>
                  {hrv != null ? `${Math.round(hrv)} ms` : "—"}
                </span>
                <span style={{ flex: 1, fontFamily: SANS, fontSize: 13, color: "var(--ink-80)", textAlign: "center" }}>
                  {eff != null ? `${Math.round(eff)}%` : "—"}
                </span>
                <span style={{ flex: "0 0 60px", fontFamily: SANS, fontSize: 12, color: "var(--ink-60)", textAlign: "right", textTransform: "capitalize" }}>
                  {src}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <Divider />

      {/* TRENDS — 30 nights */}
      <section>
        <SectionHeader
          title="30-night trends"
          intro="Tracking how each marker drifts across the month. Trends matter more than any single night — these charts reveal the direction your recovery is heading."
        />
        {bestNights.length >= 3 ? (
          <>
            <SleepMiniChart
              data={bestNights.map(n => ({
                label: new Date((n.date as string) + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                value: n.deep_sleep_minutes && n.total_sleep_minutes
                  ? ((n.deep_sleep_minutes as number) / (n.total_sleep_minutes as number)) * 100
                  : null,
              }))}
              dataKey="value" color="#185FA5" refY={17}
              label="Deep sleep" unit="% of TST" domain={[0, 45]}
            />
            <SleepMiniChart
              data={bestNights.map(n => ({
                label: new Date((n.date as string) + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                value: n.hrv_rmssd as number | null,
              }))}
              dataKey="value" color="#185FA5" refY={40}
              label="HRV" unit="ms RMSSD" domain={[0, 80]}
            />
            <SleepMiniChart
              data={bestNights.map(n => ({
                label: new Date((n.date as string) + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                value: n.sleep_efficiency as number | null,
              }))}
              dataKey="value" color="#185FA5" refY={85}
              label="Sleep efficiency" unit="%" domain={[60, 100]}
            />
            <SleepMiniChart
              data={bestNights.map(n => ({
                label: new Date((n.date as string) + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                value: n.spo2 as number | null,
              }))}
              dataKey="value" color="#185FA5" refY={96}
              label="SpO₂" unit="% avg" domain={[88, 100]}
            />
          </>
        ) : (
          <p style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-60)", padding: "12px 0" }}>
            Need at least 3 nights of data to show trends.
          </p>
        )}
      </section>

      <Divider />

      {/* DRAWERS */}
      <div style={{ marginTop: 12, marginBottom: 32 }}>
        <SleepMethodologyDrawer />
        <SleepReferencesDrawer />
      </div>

      {/* CONVERGE LINK */}
      <div style={{ textAlign: "center" }}>
        <Link href="/dashboard/converge" style={{
          fontFamily: SANS, fontSize: 13, color: "var(--gold)",
          fontWeight: 600, letterSpacing: "0.04em", textDecoration: "none",
        }}>
          See how this connects to your other panels →
        </Link>
      </div>

    </main>
  )
}

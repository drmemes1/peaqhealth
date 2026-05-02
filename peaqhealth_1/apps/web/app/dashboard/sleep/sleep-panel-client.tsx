// ============================================================================
// SLEEP PANEL — TILE GRID WITH STATUS SECTIONS (mirrors blood panel)
// ============================================================================
"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Nav } from "../../components/nav"
import { SectionHeader } from "../../components/panels"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

interface Props {
  nights: Array<Record<string, unknown>>
  snapshot: Record<string, unknown> | null
  wearable: Record<string, unknown> | null
  connectionInput?: import("@peaq/score-engine").ConnectionInput
}

// ── Provider priority for dedup ─────────────────────────────────────────────

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
  const valid = values.filter((v): v is number => v != null && !isNaN(v) && v > 0)
  if (valid.length === 0) return null
  return valid.reduce((s, v) => s + v, 0) / valid.length
}

// ── Status logic ────────────────────────────────────────────────────────────

type Status = "attention" | "watch" | "strong" | "not_tested"

const STATUS_ORDER: Record<Status, number> = { attention: 0, watch: 1, strong: 2, not_tested: 3 }

const STATUS_META: Record<Status, { dot: string; bg: string; border: string; bar: string; badgeBg: string; badgeText: string; label: string }> = {
  attention: { dot: "#9B3838", bg: "#FDF8F6", border: "#E5C4C4", bar: "#9B3838", badgeBg: "rgba(155,56,56,0.1)", badgeText: "#9B3838", label: "Attention" },
  watch:     { dot: "#C4992E", bg: "#FDFAF1", border: "#E8D5A0", bar: "#C4992E", badgeBg: "rgba(196,153,46,0.12)", badgeText: "#946F1B", label: "Watch" },
  strong:    { dot: "#4A7A4A", bg: "#F7FAF4", border: "#C8D8C0", bar: "#4A7A4A", badgeBg: "rgba(74,122,74,0.1)", badgeText: "#3A6A3A", label: "Strong" },
  not_tested:{ dot: "#A8A59B", bg: "transparent", border: "#C4C1B6", bar: "#C4C1B6", badgeBg: "rgba(168,165,155,0.1)", badgeText: "#8C897F", label: "Not tested" },
}

const SECTION_META: Record<Status, { title: string; subtitle: string }> = {
  attention:  { title: "Needs your attention", subtitle: "" },
  watch:      { title: "Keep an eye on these", subtitle: "" },
  strong:     { title: "In your strong zone", subtitle: "" },
  not_tested: { title: "Not yet measured", subtitle: "Available with wearable sync" },
}

// ── Sleep metric definitions ────────────────────────────────────────────────

interface SleepMetric {
  key: string
  href: string | null
  displayName: string
  unit: string
  decimals: number
  optimal: { min?: number; max?: number }       // strong band
  good?: { min?: number; max?: number }         // wider strong
  watch: { min: number; max: number }           // watch band
  scaleMin: number
  scaleMax: number
}

const SLEEP_METRICS: SleepMetric[] = [
  { key: "deep_sleep", href: "/dashboard/sleep/deep_sleep",
    displayName: "Deep sleep", unit: "%", decimals: 0,
    optimal: { min: 20, max: 40 }, good: { min: 15, max: 20 }, watch: { min: 10, max: 15 },
    scaleMin: 0, scaleMax: 40 },
  { key: "hrv", href: "/dashboard/sleep/recovery_hrv",
    displayName: "HRV", unit: "ms", decimals: 0,
    optimal: { min: 45, max: 80 }, good: { min: 35, max: 45 }, watch: { min: 25, max: 35 },
    scaleMin: 0, scaleMax: 80 },
  { key: "spo2", href: null,
    displayName: "SpO₂", unit: "%", decimals: 1,
    optimal: { min: 96, max: 100 }, good: { min: 95, max: 96 }, watch: { min: 92, max: 95 },
    scaleMin: 88, scaleMax: 100 },
  { key: "rem", href: "/dashboard/sleep/rem",
    displayName: "REM", unit: "%", decimals: 0,
    optimal: { min: 22, max: 40 }, good: { min: 16, max: 22 }, watch: { min: 12, max: 16 },
    scaleMin: 0, scaleMax: 40 },
  { key: "efficiency", href: null,
    displayName: "Sleep efficiency", unit: "%", decimals: 0,
    optimal: { min: 88, max: 100 }, good: { min: 82, max: 88 }, watch: { min: 75, max: 82 },
    scaleMin: 60, scaleMax: 100 },
]

function getStatus(value: number | null, m: SleepMetric): Status {
  if (value == null) return "not_tested"
  const o = m.optimal, g = m.good, w = m.watch
  if (o.min != null && value >= o.min && (o.max == null || value <= o.max)) return "strong"
  if (g && g.min != null && value >= g.min && (g.max == null || value <= g.max)) return "strong"
  if (value >= w.min && value < w.max) return "watch"
  return "attention"
}

function tickPosition(value: number, m: SleepMetric): number {
  const range = m.scaleMax - m.scaleMin
  const pct = ((value - m.scaleMin) / range) * 100
  return Math.max(2, Math.min(98, pct))
}

function deltaLabel(value: number, m: SleepMetric): { text: string; color: string } | null {
  const status = getStatus(value, m)
  if (status === "strong") return { text: "optimal", color: "#4A7A4A" }
  if (status === "watch") {
    const target = m.optimal.min ?? m.watch.max
    return value < target ? { text: "↓ below target", color: "#C4992E" } : { text: "↑ above target", color: "#C4992E" }
  }
  if (status === "attention") {
    const target = m.optimal.min ?? m.watch.max
    return value < target ? { text: "↓ below range", color: "#9B3838" } : { text: "↑ above range", color: "#9B3838" }
  }
  return null
}

function scaleLabels(m: SleepMetric): string[] {
  const lo = m.scaleMin
  const hi = m.scaleMax
  const mid = Math.round((lo + hi) / 2)
  const q1 = Math.round((lo + mid) / 2)
  const q3 = Math.round((mid + hi) / 2)
  return [String(lo), String(q1), String(mid), String(q3), String(hi)]
}

// ── Populated tile ──────────────────────────────────────────────────────────

function PopulatedCard({ metric, value, status }: { metric: SleepMetric; value: number; status: Status }) {
  const meta = STATUS_META[status]
  const tickPos = tickPosition(value, metric)
  const delta = deltaLabel(value, metric)
  const labels = scaleLabels(metric)
  const formatted = metric.decimals === 0 ? Math.round(value).toString() : value.toFixed(metric.decimals)

  const cardStyle: React.CSSProperties = {
    display: "block", textDecoration: "none", position: "relative",
    background: meta.bg, border: `1px solid ${meta.border}`,
    borderRadius: 14, padding: "20px 22px",
    transition: "transform 0.15s, box-shadow 0.15s",
    cursor: metric.href ? "pointer" : "default", overflow: "hidden",
  }

  const inner = (
    <>
      {/* Left accent stripe */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: meta.bar, opacity: 0.7, borderRadius: "14px 0 0 14px" }} />

      {/* Category + status row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: serif, fontSize: 12, fontStyle: "italic", color: "#A8A59B" }}>Sleep</span>
        <span style={{
          fontFamily: sans, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
          background: meta.badgeBg, color: meta.badgeText,
          padding: "3px 9px", borderRadius: 20,
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.dot }} />
          {meta.label}
        </span>
      </div>

      {/* Metric name */}
      <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", margin: "0 0 12px", lineHeight: 1.2 }}>
        {metric.displayName}
      </h3>

      {/* Value + delta row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span style={{ fontFamily: serif, fontSize: 46, fontWeight: 500, color: "#2C2A24", lineHeight: 1, letterSpacing: "-0.02em" }}>
            {formatted}
          </span>
          <span style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: "#8C897F", marginLeft: 4 }}>{metric.unit}</span>
        </div>
        {delta && (
          <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, color: delta.color }}>{delta.text}</span>
        )}
      </div>

      {/* Range bar */}
      <div style={{ position: "relative", height: 4, borderRadius: 2, marginBottom: 6,
        background: "linear-gradient(90deg, rgba(229,196,196,0.3) 0% 18%, rgba(232,213,160,0.35) 18% 30%, #C8D8C0 30% 70%, rgba(232,213,160,0.35) 70% 82%, rgba(229,196,196,0.3) 82% 100%)",
      }}>
        <div style={{
          position: "absolute", top: -3, left: `${tickPos}%`, width: 2, height: 10,
          background: meta.dot, borderRadius: 1, transform: "translateX(-1px)",
          boxShadow: "0 0 0 2px #F5F3EE",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {labels.map((l, i) => (
          <span key={i} style={{ fontFamily: sans, fontSize: 9, color: "#A8A59B", fontVariantNumeric: "tabular-nums" }}>{l}</span>
        ))}
      </div>
    </>
  )

  if (metric.href) {
    return (
      <Link
        href={metric.href}
        style={cardStyle}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(44,42,36,0.08)" }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none" }}
      >
        {inner}
      </Link>
    )
  }
  return <div style={cardStyle}>{inner}</div>
}

// ── Empty (not tested) tile ─────────────────────────────────────────────────

function EmptyCard({ metric }: { metric: SleepMetric }) {
  return (
    <div style={{
      border: "1px dashed #C4C1B6", borderRadius: 10,
      padding: "14px 16px", minHeight: 78,
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div>
        <span style={{ fontFamily: serif, fontSize: 11, fontStyle: "italic", color: "#A8A59B", display: "block", marginBottom: 2 }}>Sleep</span>
        <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 500, color: "#6B6860" }}>{metric.displayName}</span>
      </div>
      <span style={{ fontFamily: sans, fontSize: 8, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A8A59B" }}>NOT TESTED</span>
    </div>
  )
}

// ── Section header ──────────────────────────────────────────────────────────

function StatusSection({ status, count, isFirst }: { status: Status; count: number; isFirst: boolean }) {
  const meta = STATUS_META[status]
  const section = SECTION_META[status]
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: isFirst ? 0 : 32, marginBottom: 16 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
      <span style={{ fontFamily: serif, fontSize: 18, fontStyle: "italic", color: "#6B6860", whiteSpace: "nowrap" }}>
        {section.title}
      </span>
      <div style={{ flex: 1, height: 1, background: "#E8E4D8" }} />
      <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A59B", whiteSpace: "nowrap" }}>
        {status === "not_tested" ? section.subtitle : `${count} metric${count === 1 ? "" : "s"}`}
      </span>
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────

export function SleepPanelClient({ nights, wearable }: Props) {
  const [narrative, setNarrative] = useState<{
    headline: string | null
    narrative: string | null
  } | null>(null)

  useEffect(() => {
    fetch("/api/trends/sleep-narrative")
      .then(r => r.json())
      .then((d: { narrative: { headline: string | null; narrative: string | null } | null }) => setNarrative(d.narrative))
      .catch(() => {})
  }, [])

  const provider = wearable?.provider as string | null | undefined
  const lastSynced = wearable?.last_synced_at as string | null | undefined
  const deduped = bestNightPerDate(nights)

  // ── Compute averages ──────────────────────────────────────────────────────

  const values = useMemo(() => {
    const deepPcts = deduped.map(n => {
      const total = n.total_sleep_minutes as number | null
      const deep = n.deep_sleep_minutes as number | null
      return total && deep && total > 0 ? (deep / total) * 100 : null
    })
    const remPcts = deduped.map(n => {
      const total = n.total_sleep_minutes as number | null
      const rem = n.rem_sleep_minutes as number | null
      return total && rem && total > 0 ? (rem / total) * 100 : null
    })
    return {
      deep_sleep: avg(deepPcts),
      hrv: avg(deduped.map(n => n.hrv_rmssd as number | null)),
      spo2: avg(deduped.map(n => n.spo2 as number | null)),
      rem: avg(remPcts),
      efficiency: avg(deduped.map(n => n.sleep_efficiency as number | null)),
    } as Record<string, number | null>
  }, [deduped])

  const allMetrics = useMemo(() =>
    SLEEP_METRICS.map(m => {
      const v = values[m.key]
      return { metric: m, value: v, status: getStatus(v, m) }
    }),
  [values])

  const populatedCount = allMetrics.filter(m => m.status !== "not_tested").length
  const attentionCount = allMetrics.filter(m => m.status === "attention" || m.status === "watch").length

  const statusGroups = useMemo(() => {
    const groups: Record<Status, typeof allMetrics> = { attention: [], watch: [], strong: [], not_tested: [] }
    for (const m of allMetrics) groups[m.status].push(m)
    for (const k of Object.keys(groups) as Status[]) {
      groups[k].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    }
    return groups
  }, [allMetrics])

  // ── Empty state ───────────────────────────────────────────────────────────

  if (deduped.length === 0) {
    return (
      <div className="min-h-svh" style={{ background: "#F5F3EE" }}>
        <Nav />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
          <SectionHeader title="Sleep panel" subtitle="No sleep data on file." />
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 24 }}>
            <p style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", margin: "0 0 8px" }}>Connect a wearable to see your sleep metrics</p>
            <p style={{ fontFamily: sans, fontSize: 13, color: "#92400E", margin: "0 0 16px" }}>Your nightly data will appear here as a tile grid with deep sleep, HRV, REM, SpO₂, and efficiency.</p>
            <Link href="/settings" style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#B8860B", textDecoration: "none" }}>Connect wearable →</Link>
          </div>
        </div>
      </div>
    )
  }

  const providerLabel = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : null
  const syncLabel = lastSynced ? new Date(lastSynced).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
      <SectionHeader
        title="What your sleep data is showing"
        subtitle={`${populatedCount} metric${populatedCount === 1 ? "" : "s"} measured${attentionCount > 0 ? ` · ${attentionCount} need attention` : ""}`}
      />

      {/* Source pill */}
      {(providerLabel || syncLabel) && (
        <p style={{ fontFamily: sans, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#8C897F", margin: "0 0 24px" }}>
          {[providerLabel, syncLabel ? `Synced ${syncLabel}` : null].filter(Boolean).join(" · ")} · {deduped.length} night{deduped.length === 1 ? "" : "s"}
        </p>
      )}

      {/* Optional narrative card */}
      {narrative?.headline && (
        <div style={{
          background: "#FFFFFF", border: "1px solid #E8E4D8", borderLeft: "3px solid #4A7FB5",
          borderRadius: 10, padding: "18px 22px", marginBottom: 28,
        }}>
          <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: "#2C2A24", margin: "0 0 6px", lineHeight: 1.35 }}>
            {narrative.headline}
          </p>
          {narrative.narrative && (
            <p style={{ fontFamily: sans, fontSize: 13, color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              {narrative.narrative}
            </p>
          )}
        </div>
      )}

      {/* Status-grouped tile sections */}
      {(["attention", "watch", "strong", "not_tested"] as Status[]).map((s, si) => {
        const group = statusGroups[s]
        if (group.length === 0) return null
        const isFirst = si === 0 || (["attention", "watch", "strong", "not_tested"] as Status[]).slice(0, si).every(ps => statusGroups[ps].length === 0)
        return (
          <div key={s}>
            <StatusSection status={s} count={group.length} isFirst={isFirst} />
            {s === "not_tested" ? (
              <div className="sleep-empty-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {group.map(m => <EmptyCard key={m.metric.key} metric={m.metric} />)}
              </div>
            ) : (
              <div className="sleep-tile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {group.map(m => <PopulatedCard key={m.metric.key} metric={m.metric} value={m.value!} status={m.status} />)}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <Link href="/dashboard/converge" style={{ fontFamily: sans, fontSize: 13, color: "#B8860B", textDecoration: "none", fontWeight: 500 }}>
          See how this connects to your other panels →
        </Link>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .sleep-tile-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .sleep-empty-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .sleep-tile-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .sleep-empty-grid { grid-template-columns: 1fr !important; gap: 6px !important; }
        }
      `}</style>
    </div>
  )
}

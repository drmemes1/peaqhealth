// PATTERN: Every marker section in this file uses evaluateConnection() + <ConnectionLineCard />.
// See docs/CONNECTION_LINE_PATTERN.md for the standard.
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Nav } from "../../components/nav"
import { evaluateConnection } from "@peaq/score-engine"
import { ConnectionLineCard } from "../../components/connection-line"

// ─── Types ───────────────────────────────────────────────────────────────────

interface OralFinding {
  id: string
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "POSITIVE"
  panel: "nitrate" | "periodontal" | "osa" | "diversity" | "general"
  title: string
  body: string
  action: string
  impact: string
  retestDays: number
  citation: string
}

interface OralSnapshot {
  total: number
  shannonSub: number
  nitrateSub: number
  periodontalSub: number
  osaSub: number
  shannonDiversity: number
  nitrateReducerPct: number
  periodontalBurden: number
  osaBurden: number
  pGingivalisPct: number
  fNucleatumPct: number
  prevotellaPct: number
  mouthwashDetected: boolean
  highPeriodontalRisk: boolean
  highOsaRisk: boolean
  lowDiversity: boolean
  findings: OralFinding[]
  recommendations: string[]
  watchSignals: {
    systemicInflammationSignal: number
    metabolicDysbiosisSignal: number
    autoimmuneInflammationSignal: number
    gutOralAxisSignal: number
  }
  sampleId: string
  collectionDate: string
  totalReads: number
  speciesCount: number
}

interface Props {
  oral: Record<string, unknown> | null
  snapshot: Record<string, unknown> | null
  connectionInput?: import("@peaq/score-engine").ConnectionInput
}

// ─── Finding priority colors ─────────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL:  { bg: "#FEE2E2", text: "#991B1B", dot: "#A32D2D" },
  HIGH:      { bg: "#FEE2E2", text: "#991B1B", dot: "#A32D2D" },
  MEDIUM:    { bg: "#FEF3C7", text: "#92400E", dot: "#C49A3C" },
  LOW:       { bg: "#EBF2FA", text: "#185FA5", dot: "#185FA5" },
  POSITIVE:  { bg: "#EAF3DE", text: "#3B6D11", dot: "#3B6D11" },
}

const PRIORITY_DISPLAY: Record<string, string> = {
  CRITICAL: "Notable signal",
  HIGH:     "Worth discussing",
  MEDIUM:   "Worth monitoring",
  LOW:      "Interesting pattern",
  POSITIVE: "Strong signal",
}

const PANEL_COLOR: Record<string, string> = {
  nitrate:    "#185FA5",
  periodontal: "#A32D2D",
  osa:        "#C49A3C",
  diversity:  "#3B6D11",
  general:    "var(--ink-40)",
}

const PANEL_LABEL: Record<string, string> = {
  nitrate:    "Nitrate / Cardiovascular",
  periodontal: "Periodontal",
  osa:        "OSA / Sleep",
  diversity:  "Diversity",
  general:    "General",
}

// ─── Oral metric zone definitions ────────────────────────────────────────────

const ORAL_ZONES: Record<string, {
  zones: { label: string; color: string; min: number; max: number }[]
  markerColor: string
}> = {
  shannon: {
    markerColor: '#3B6D11',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,    max: 2.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 2.0,  max: 2.5  },
      { label: 'Good',    color: '#FFF3CD', min: 2.5,  max: 3.0  },
      { label: 'Optimal', color: '#D4EDDA', min: 3.0,  max: 5.0  },
    ]
  },
  nitrate: {
    markerColor: '#185FA5',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,    max: 2.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 2.0,  max: 5.0  },
      { label: 'Good',    color: '#FFF3CD', min: 5.0,  max: 15.0 },
      { label: 'Optimal', color: '#D4EDDA', min: 15.0, max: 30.0 },
    ]
  },
  periodontal: {
    markerColor: '#A32D2D',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,    max: 0.5  },
      { label: 'Good',    color: '#FFF3CD', min: 0.5,  max: 1.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 1.0,  max: 1.5  },
      { label: 'Elevated',color: '#FFCDD2', min: 1.5,  max: 5.0  },
    ]
  },
  osa: {
    markerColor: '#C49A3C',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,    max: 1.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 1.0,  max: 3.0  },
      { label: 'Elevated',color: '#FFCDD2', min: 3.0,  max: 10.0 },
    ]
  },
}

function OralRangeBar({ value, zoneKey }: { value: number; zoneKey: string }) {
  const config = ORAL_ZONES[zoneKey]
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
      <div style={{ position: 'relative', height: '14px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '6px', display: 'flex', borderRadius: '3px', overflow: 'hidden', gap: '1px' }}>
          {zones.map((zone, i) => (
            <div key={i} style={{
              flex: `0 0 ${zonePcts[i]}%`,
              background: zone.color,
              borderRadius: i === 0 ? '3px 0 0 3px' : i === zones.length - 1 ? '0 3px 3px 0' : '0',
            }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', top: '50%', left: `${markerPct}%`,
          transform: 'translate(-50%, -50%)',
          width: '10px', height: '10px', borderRadius: '50%',
          background: config.markerColor,
          border: '2px solid white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          zIndex: 2,
          pointerEvents: 'none',
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

// ─── Species row ─────────────────────────────────────────────────────────────

type Flag = "optimal" | "watch" | "attention" | "pending"

function SpeciesRow({ name, role, val, target, isPathogen, note, learnWhat, learnWhy, learnCitation, flagFn }: {
  name: string
  role: string
  val: number
  target: string
  isPathogen: boolean
  note: string
  learnWhat: string
  learnWhy: string
  learnCitation: string
  flagFn: (v: number) => Flag
}) {
  const [expanded, setExpanded] = useState(false)
  const flag = flagFn(val)
  const pct = val.toFixed(2)

  const flagStyle: Record<Flag, { bg: string; color: string; label: string }> = {
    optimal:   { bg: "#EAF3DE", color: "#3B6D11", label: isPathogen ? "Low — Good" : "Optimal" },
    watch:     { bg: "#FEF3C7", color: "#92400E", label: "Watch" },
    attention: { bg: "#FEE2E2", color: "#991B1B", label: isPathogen ? "Elevated" : "Low" },
    pending:   { bg: "#F7F5F0", color: "var(--ink-35)", label: "—" },
  }
  const fs = flagStyle[flag]
  const dotColor = flag === "optimal" ? "#3B6D11" : flag === "watch" ? "#C49A3C" : "#A32D2D"

  return (
    <div style={{ padding: "10px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 14, color: "var(--ink)" }}>{name}</span>
          </div>
          <p style={{ margin: "1px 0 0 14px", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)" }}>{role}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink)" }}>{pct}%</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 7px", background: fs.bg, color: fs.color }}>
            {fs.label}
          </span>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: "none", border: "0.5px solid var(--ink-12)", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", color: "var(--ink-30)", fontFamily: "'Cormorant Garamond', serif", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
          >
            {expanded ? "−" : "+"}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ margin: "10px 0 4px 14px", padding: "10px 12px", background: "var(--warm-50)", borderLeft: `2px solid ${dotColor}` }}>
          <p style={{ margin: "0 0 6px", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)", fontStyle: "italic" }}>Target: {target}</p>
          {note && <p style={{ margin: "0 0 6px", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)" }}>{note}</p>}
          <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink)", fontWeight: 600 }}>What it does</p>
          <p style={{ margin: "0 0 6px", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)", lineHeight: 1.6 }}>{learnWhat}</p>
          <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink)", fontWeight: 600 }}>Why it matters</p>
          <p style={{ margin: "0 0 6px", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)", lineHeight: 1.6 }}>{learnWhy}</p>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-30)", fontStyle: "italic" }}>{learnCitation}</p>
        </div>
      )}
    </div>
  )
}

function flag(good: boolean, ok: boolean): Flag {
  return good ? "optimal" : ok ? "watch" : "attention"
}

// ─── Descriptor helpers for emerging-research dimensions ────────────────────
// ─── Wellness-framed narrative (no disease language) ─────────────────────────

function generateOralNarrative(periodontalBurden: number, nitrateReducerPct: number, shannonDiversity: number): string {
  const issues: string[] = []
  const positives: string[] = []

  // periodontalBurden and nitrateReducerPct are in OTU scale (percentage for mock data)
  if (periodontalBurden > 2)     issues.push("elevated periodontal bacteria")
  if (nitrateReducerPct < 10)    issues.push("low nitrate-reducing bacteria")
  if (shannonDiversity < 2.5)    issues.push("reduced microbiome diversity")
  if (nitrateReducerPct >= 15)   positives.push("good nitrate-reducing bacteria")
  if (shannonDiversity >= 3.0)   positives.push("healthy microbiome diversity")

  if (issues.length === 0) {
    const positiveText = positives.length > 0
      ? ` Notably, your ${positives.join(" and ")} are supporting systemic health.`
      : ""
    return `Your oral microbiome is in good balance.${positiveText}`
  }

  const issueText = issues.join(" and ")
  const positiveText = positives.length > 0
    ? ` Your ${positives.join(" and ")} ${positives.length > 1 ? "are" : "is"} a positive sign.`
    : ""
  return `Your oral microbiome shows ${issueText} — worth keeping an eye on and discussing with your dentist at your next visit.${positiveText}`
}

// ─── Metric card ─────────────────────────────────────────────────────────────

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
  const statusTxt = status === "optimal" ? "#3B6D11" : status === "watch" ? "#92400E" : "#991B1B"
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

// ─── Main component ──────────────────────────────────────────────────────────

type OralNarrative = {
  headline: string | null
  narrative: string | null
  positive_signal: string | null
  watch_signal: string | null
}

// ── NHANES Comparison Component ──────────────────────────────────────────────

const NHANES_PCTLS: Record<string, Record<string, number>> = {
  shannon: {
    p5: 3.409, p10: 3.774, p15: 3.964, p20: 4.111, p25: 4.229,
    p30: 4.326, p35: 4.419, p40: 4.505, p45: 4.586, p50: 4.662,
    p55: 4.740, p60: 4.809, p65: 4.886, p70: 4.964, p75: 5.058,
    p80: 5.165, p85: 5.266, p90: 5.410, p95: 5.636,
  },
  observed_asvs: {
    p5: 66.8, p10: 79.9, p15: 88.9, p20: 95.8, p25: 101.6,
    p30: 107.0, p35: 112.8, p40: 117.6, p45: 122.5, p50: 127.6,
    p55: 133.1, p60: 138.4, p65: 144.2, p70: 150.2, p75: 156.9,
    p80: 165.5, p85: 175.2, p90: 186.9, p95: 206.1,
  },
}

function nhanesPercentile(value: number, table: Record<string, number>): number {
  const keys = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]
  const entries = keys.map(p => ({ pct: p, val: table[`p${p}`] })).filter(e => e.val !== undefined)
  if (entries.length === 0) return 50
  if (value <= entries[0].val) return Math.max(1, Math.round(entries[0].pct * (value / entries[0].val)))
  if (value >= entries[entries.length - 1].val) return 97
  for (let i = 0; i < entries.length - 1; i++) {
    if (value >= entries[i].val && value <= entries[i + 1].val) {
      const frac = (value - entries[i].val) / (entries[i + 1].val - entries[i].val)
      return Math.round(entries[i].pct + frac * (entries[i + 1].pct - entries[i].pct))
    }
  }
  return 50
}

function NHANESBar({ label, value, formatVal, metricKey }: {
  label: string; value: number; formatVal: string; metricKey: string
}) {
  const table = NHANES_PCTLS[metricKey]
  if (!table) return null
  const pct = nhanesPercentile(value, table)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink)" }}>
          {label} {formatVal} → <span style={{ color: "#C49A3C", fontWeight: 600 }}>{pct}th percentile</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          borderRadius: 2, background: "#C49A3C",
          width: `${pct}%`, transition: "width 500ms ease",
        }} />
        <div style={{
          position: "absolute", left: `${pct}%`, top: -7, transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "3px solid transparent", borderRight: "3px solid transparent",
          borderTop: "4px solid #C49A3C",
        }} />
      </div>
    </div>
  )
}

function NHANESComparison({ shannon, nitratePct, periodontalPct }: {
  shannon: number; nitratePct: number; periodontalPct: number
}) {
  const [open, setOpen] = useState(true)
  const shannonPct = nhanesPercentile(shannon, NHANES_PCTLS.shannon)
  const median = NHANES_PCTLS.shannon.p50

  return (
    <div style={{
      background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
      borderRadius: 10, padding: "18px 20px", marginBottom: 32,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: 0, border: "none", background: "transparent", cursor: "pointer",
          marginBottom: open ? 14 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase",
            letterSpacing: "1.5px", color: "#C49A3C", cursor: "pointer",
          }}>
            How you compare {open ? "▾" : "▸"}
          </span>
        </div>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 9, color: "#C49A3C",
          background: "rgba(196,154,60,0.08)", padding: "2px 8px", borderRadius: 10,
        }}>
          n=9,660
        </span>
      </button>

      {open && (
        <div>
          <NHANESBar label="Bacterial diversity" value={shannon} formatVal={shannon.toFixed(2)} metricKey="shannon" />

          <p style={{
            fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)",
            lineHeight: 1.5, margin: "0 0 12px",
          }}>
            {shannonPct >= 50
              ? `Your bacterial diversity is above ${shannonPct}% of 9,660 Americans (median: ${median.toFixed(2)}).`
              : `Your bacterial diversity is below ${100 - shannonPct}% of 9,660 Americans (median: ${median.toFixed(2)}). This is one of the most actionable signals in your biology.`
            }
          </p>

          <p
            title="NHANES used an oral rinse; your Zymo kit uses a saliva swab. Both use the same sequencing technology. Results are comparable in direction and meaning."
            style={{
              fontFamily: "var(--font-body)", fontSize: 9, color: "#bbb",
              textAlign: "center", margin: "0 0 8px", cursor: "help",
            }}
          >
            Based on the CDC&rsquo;s NHANES study of 9,660 Americans &mdash; the largest oral microbiome reference dataset available.
          </p>

          <Link
            href="/explore"
            style={{
              fontFamily: "var(--font-body)", fontSize: 9, color: "#C49A3C",
              letterSpacing: "1.5px", textTransform: "uppercase", textDecoration: "none",
              display: "block", textAlign: "center",
            }}
          >
            Full CDC comparison →
          </Link>
        </div>
      )}
    </div>
  )
}

export function OralPanelClient({ oral, snapshot, connectionInput }: Props) {
  const oralSub = snapshot?.oral_sub as number | undefined

  const [aiNarrative, setAiNarrative] = useState<OralNarrative | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(true)

  useEffect(() => {
    fetch("/api/oral/narrative")
      .then(r => { if (!r.ok) { console.warn("[OralPanel] narrative fetch non-ok:", r.status); return null; } return r.json() })
      .then(data => {
        if (data?.narrative) setAiNarrative(data.narrative as OralNarrative)
      })
      .catch((err: unknown) => { console.warn("[OralPanel] narrative fetch failed, using fallback:", err) })
      .finally(() => setNarrativeLoading(false))
  }, [])

  if (!oral) {
    return (
      <div className="min-h-svh bg-off-white">
        <Nav />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: "0 0 24px" }}>Oral Microbiome</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)" }}>No oral results on file.</p>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)", display: "inline-block", marginTop: 12 }}>
            ← Back to dashboard
          </Link>
        </main>
      </div>
    )
  }

  const oralScore = oral.oral_score_snapshot as OralSnapshot | null
  const rawOtu = oral.raw_otu_table as Record<string, number> | null
  const reportDate = oral.report_date as string | null

  // raw_otu_table stores values already as percentages (0.22 = 0.22% of reads)
  // — the scoring engine converts fractions→% before storage, so no *100 here
  const sp = (key: string) => (rawOtu ? (rawOtu[key] ?? 0) : 0)
  const genus = (prefix: string) =>
    rawOtu
      ? Object.entries(rawOtu)
          .filter(([k]) => k.toLowerCase().startsWith(prefix.toLowerCase()))
          .reduce((sum, [, v]) => sum + v, 0)
      : 0

  const shannon = (oral.shannon_diversity as number | null) ?? 0
  // Summary cards computed directly from raw_otu_table — same source as the full species panel
  const nitratePct  = sp("Neisseria subflava") + sp("Rothia mucilaginosa") + sp("Veillonella parvula") + sp("Neisseria flavescens")
  const periodontalPct = sp("Porphyromonas gingivalis") + sp("Treponema denticola") + sp("Tannerella forsythia")
  const osaPct = sp("Prevotella melaninogenica") + sp("Fusobacterium nucleatum")

  // D5–D7 emerging-research dimension values (stored as fractions 0–1, display as %)
  const _neuroSignalRaw = (oral.neuro_signal_pct as number | null) ?? null
  const _metabolicSignalRaw = (oral.metabolic_signal_pct as number | null) ?? null
  const _proliferativeSignalRaw = (oral.proliferative_signal_pct as number | null) ?? null
  // Convert to percentage for display — values > 1 are already percentages
  const toDisplayPct = (v: number | null) => v === null ? null : (v > 1 ? v : v * 100)
  const neuroSignalPct = toDisplayPct(_neuroSignalRaw)
  const metabolicSignalPct = toDisplayPct(_metabolicSignalRaw)
  const proliferativeSignalPct = toDisplayPct(_proliferativeSignalRaw)

  // Derive insights from findings (sorted by priority)
  const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "POSITIVE"] as const
  const findings = oralScore?.findings ?? []
  const sortedFindings = [...findings].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  )
  const secondaryFindings = sortedFindings.slice(1, 4)

  const speciesCount = oralScore?.speciesCount ?? (rawOtu ? Object.values(rawOtu).filter(v => v > 0).length : 0)

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Oral</h1>
            {oralSub !== undefined && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-30)" }}>OMA panel</span>
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

        {reportDate && (
          <p style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)", margin: "0 0 24px" }}>
            {new Date(reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
          </p>
        )}

        {/* Mouthwash warning */}
        {oralScore?.mouthwashDetected && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, borderRadius: 4, background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)" }}>
            <span style={{ color: "#d97706" }}>⚑</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#92400e" }}>
              Antiseptic mouthwash detected. This suppresses nitrate-reducing bacteria and may understate cardiovascular protective capacity.
            </span>
          </div>
        )}

        {/* Top narrative — AI-generated, falls back to hardcoded */}
        {narrativeLoading ? (
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 17,
            color: "var(--ink-30)", lineHeight: 1.55, margin: "0 0 24px",
          }}>
            Analysing your microbiome data…
          </p>
        ) : typeof aiNarrative?.narrative === "string" ? (
          <div style={{ border: "0.5px solid var(--ink-12)", padding: "16px 18px", marginBottom: 24, background: "#fff" }}>
            {typeof aiNarrative.headline === "string" && (
              <p style={{ margin: "0 0 8px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 16, fontWeight: 400, color: "var(--ink)", lineHeight: 1.4 }}>
                {aiNarrative.headline}
              </p>
            )}
            <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", lineHeight: 1.65 }}>
              {aiNarrative.narrative}
            </p>
            {(typeof aiNarrative.positive_signal === "string" || typeof aiNarrative.watch_signal === "string") && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {typeof aiNarrative.positive_signal === "string" && (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px", background: "#EAF3DE", color: "#3B6D11" }}>
                    {aiNarrative.positive_signal}
                  </span>
                )}
                {typeof aiNarrative.watch_signal === "string" && (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px", background: "#FEF3C7", color: "#92400E" }}>
                    {aiNarrative.watch_signal}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 17,
            color: "var(--ink-65)", lineHeight: 1.55, margin: "0 0 24px",
          }}>
            {generateOralNarrative(periodontalPct, nitratePct, shannon)}
          </p>
        )}

        {/* 4 key metrics */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
          <MetricCard
            label="Shannon Diversity"
            sub="Species richness & evenness — target ≥3.0"
            value={shannon.toFixed(2)}
            unit="index"
            color="#3B6D11"
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
            color="#185FA5"
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
            color="#A32D2D"
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
            color="#C49A3C"
            status={osaPct < 1 ? "optimal" : osaPct < 3 ? "watch" : "attention"}
            statusLabel={osaPct < 1 ? "Optimal" : osaPct < 3 ? "Watch" : "Elevated"}
            zoneKey="osa"
            numericValue={osaPct}
          />
        </div>

        {/* Connection lines for key oral markers */}
        {connectionInput && (
          <div style={{ marginBottom: 16 }}>
            <ConnectionLineCard connection={evaluateConnection("good_bacteria", connectionInput)} />
            <ConnectionLineCard connection={evaluateConnection("harmful_bacteria", connectionInput)} />
            <ConnectionLineCard connection={evaluateConnection("diversity", connectionInput)} />
            <ConnectionLineCard connection={evaluateConnection("inflammation_risk", connectionInput)} />
            <ConnectionLineCard connection={evaluateConnection("cavity_risk", connectionInput)} />
            <ConnectionLineCard connection={evaluateConnection("breath_health", connectionInput)} />
          </div>
        )}

        {/* NHANES Comparison */}
        <NHANESComparison shannon={shannon} nitratePct={nitratePct} periodontalPct={periodontalPct} />

        {/* Secondary insights */}
        {secondaryFindings.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)", marginBottom: 12 }}>
              Insights
            </p>
            {secondaryFindings.map(f => {
              const ps = PRIORITY_STYLE[f.priority] ?? PRIORITY_STYLE.LOW
              const panelColor = PANEL_COLOR[f.panel] ?? "var(--ink-40)"
              const panelLabel = PANEL_LABEL[f.panel] ?? f.panel
              return (
                <div key={f.id} style={{ border: "0.5px solid var(--ink-12)", borderLeft: `3px solid ${panelColor}`, padding: "14px 16px", marginBottom: 10 }}>
                  <p style={{ margin: "0 0 5px", fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 400, color: "var(--ink)" }}>{f.title}</p>
                  <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: 12, lineHeight: 1.65, color: "var(--ink-60)" }}>{f.body}</p>
                  {f.action && (
                    <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: 11, color: "#3B6D11", lineHeight: 1.5 }}>{f.action}</p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", background: `${panelColor}15`, color: panelColor }}>
                      {panelLabel}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", background: ps.bg, color: ps.text }}>
                      {PRIORITY_DISPLAY[f.priority] ?? f.priority}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Watch signals */}
        {oralScore?.watchSignals && (
          (() => {
            const ws = oralScore.watchSignals
            const signals = [
              { key: "systemicInflammationSignal", label: "Systemic inflammation signal (P. gingivalis)", val: ws.systemicInflammationSignal },
              { key: "gutOralAxisSignal", label: "Oral-gut axis signal (F. nucleatum)", val: ws.gutOralAxisSignal },
              { key: "metabolicDysbiosisSignal", label: "Metabolic dysbiosis signal", val: ws.metabolicDysbiosisSignal },
              { key: "autoimmuneInflammationSignal", label: "Inflammatory periodontal burden", val: ws.autoimmuneInflammationSignal },
            ].filter(s => s.val > 0)
            if (signals.length === 0) return null
            return (
              <div style={{ marginBottom: 32 }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)", marginBottom: 10 }}>
                  Systemic watch signals
                </p>
                {signals.map(s => (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)" }}>{s.label}</span>
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 7px",
                      background: s.val >= 2 ? "#FEE2E2" : "#FEF3C7",
                      color: s.val >= 2 ? "#991B1B" : "#92400E",
                    }}>
                      {s.val >= 2 ? "Elevated" : "Watch"}
                    </span>
                  </div>
                ))}
                <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", lineHeight: 1.6 }}>
                  These signals indicate taxa associated with systemic conditions in observational research. They do not diagnose disease — consider discussing with your doctor.
                </p>
              </div>
            )
          })()
        )}

        {/* Species sections */}
        {rawOtu && (
          <>
            <Section title="Nitrate & Cardiovascular" defaultOpen={true}>
              <SpeciesRow name="Neisseria subflava" role="Primary nitrate reducer — NO pathway" val={sp("Neisseria subflava")} target=">2% reads" isPathogen={false} note="Converts dietary nitrate to vasodilating nitric oxide; depleted by antiseptic mouthwash within days" flagFn={v => flag(v >= 2, v >= 0.5)} learnWhat="Reduces nitrate from food (beetroot, spinach) to nitrite, which is further converted to nitric oxide in the gut and bloodstream." learnWhy="Nitric oxide is a potent vasodilator. Low Neisseria subflava abundance is associated with impaired endothelial function and elevated blood pressure." learnCitation="Velmurugan et al., Free Radical Biology and Medicine, 2016. n=19, crossover RCT." />
              <SpeciesRow name="Rothia mucilaginosa" role="Nitrate reducer + anti-inflammatory commensal" val={sp("Rothia mucilaginosa")} target=">1% reads" isPathogen={false} note="Dual role: nitrate reduction and mucosal immune modulation" flagFn={v => flag(v >= 1, v >= 0.3)} learnWhat="A highly abundant commensal that participates in nitrate reduction and produces enzymes that neutralize reactive oxygen species." learnWhy="Consistently found at higher abundance in healthy individuals. Its loss correlates with oral inflammation and cardiovascular risk markers." learnCitation="Rosenbaum et al., Cell Host & Microbe, 2021. Oral microbiome-cardiovascular cohort." />
              <SpeciesRow name="Veillonella parvula" role="Lactate metaboliser — nitrate pathway co-contributor" val={sp("Veillonella parvula")} target=">1% reads" isPathogen={false} note="Consumes lactic acid from other bacteria, reducing cariogenic potential while supporting NO pathway" flagFn={v => flag(v >= 1, v >= 0.3)} learnWhat="Converts lactic acid (produced by Streptococci) to propionate and acetate, and also participates in nitrate reduction cooperatively with Neisseria." learnWhy="A key cross-feeder in oral biofilm ecology. Its presence moderates acidity and supports cardiovascular-protective pathways." learnCitation="Mashima & Nakazawa, Frontiers in Microbiology, 2015. Oral microbiome metabolic interactions." />
              <SpeciesRow name="Neisseria flavescens" role="Secondary nitrate reducer — cardiovascular support" val={sp("Neisseria flavescens")} target=">0.5% reads" isPathogen={false} note="Related to N. subflava; contributes to the aggregate nitrate-reducing capacity" flagFn={v => flag(v >= 0.5, v >= 0.1)} learnWhat="A commensal Neisseria species with moderate nitrate-reducing activity, supporting the oral-systemic NO pathway alongside N. subflava." learnWhy="Part of the protective Neisseria community. Loss of this species contributes to reduced aggregate nitrate-reducing capacity." learnCitation="Hyde et al., mBio, 2014. Oral microbiome and nitrate metabolism." />
            </Section>

            <Section title="Periodontal Pathogens" defaultOpen={true}>
              <SpeciesRow name="Porphyromonas gingivalis" role="Keystone periodontal pathogen — systemic inflammation" val={sp("Porphyromonas gingivalis")} target="<0.1% reads" isPathogen={true} note="Found in coronary artery plaques in autopsy studies; manipulates host immune response" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="A low-abundance keystone pathogen that dysregulates the host immune response out of proportion to its numbers, enabling growth of the broader pathogenic community." learnWhy="Identified in coronary artery plaques in multiple autopsy studies. Associated with elevated hsCRP and cardiovascular events independent of traditional risk factors." learnCitation="Hussain et al., Frontiers in Immunology, 2023. n=1,791. Cardiovascular meta-analysis." />
              <SpeciesRow name="Treponema denticola" role="Red complex pathogen — periodontal disease and systemic inflammation" val={sp("Treponema denticola")} target="<0.1% reads" isPathogen={true} note="Part of the red complex; produces proteases that can enter circulation" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="Part of the 'red complex' — the most pathogenic bacterial consortium in periodontal disease. Produces enzymes that destroy connective tissue and evade immune defenses." learnWhy="Associated with elevated systemic inflammation and periodontal disease severity. Gingipain proteases from this organism can enter the bloodstream through inflamed gum tissue." learnCitation="Socransky et al., Journal of Clinical Periodontology, 1998. Red complex classification." />
              <SpeciesRow name="Tannerella forsythia" role="Red complex pathogen — bone resorption" val={sp("Tannerella forsythia")} target="<0.1% reads" isPathogen={true} note="Synergizes with P. gingivalis and T. denticola to accelerate periodontal bone loss" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="The third member of the red complex. Produces surface proteins that inhibit apoptosis of infected cells, allowing persistent infection and tissue destruction." learnWhy="A reliable diagnostic marker for severe chronic periodontitis. Its abundance correlates with probing depth and clinical attachment loss." learnCitation="Socransky et al., Journal of Clinical Periodontology, 1998. Original red complex classification." />
              <SpeciesRow name="Prevotella intermedia" role="Hormone-responsive periodontopathogen — gingival inflammation" val={sp("Prevotella intermedia")} target="<0.5% reads" isPathogen={true} note="Uses progesterone and estrogen as growth factors — elevated during hormonal fluctuations" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="A gram-negative anaerobe that can substitute sex hormones (progesterone, estradiol) for vitamin K as growth factors, making it highly active during hormonal fluctuations." learnWhy="Elevated during pregnancy, puberty, and oral contraceptive use. Associated with systemic inflammation and elevated periodontal disease severity." learnCitation="Kornman & Loesche, Journal of Periodontal Research, 1980. Hormonal effects on oral microbiome." />
              <SpeciesRow name="Fusobacterium nucleatum" role="Periodontal disease and systemic inflammation bridge organism" val={sp("Fusobacterium nucleatum")} target="<0.5% reads" isPathogen={true} note="Bridges the oral cavity to other body sites; associated with periodontal disease and elevated systemic inflammation when elevated" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="An opportunistic pathogen that invades vascular endothelium and can translocate from the oral cavity to other body compartments. A consistent marker of oral dysbiosis." learnWhy="Associated with periodontal disease and elevated systemic inflammation. Its abundance is a reliable indicator of oral microbiome imbalance." learnCitation="Hajishengallis G. Nature Reviews Immunology. 2015. Oral dysbiosis and systemic disease." />
            </Section>

            <Section title="Caries & Dental Health" defaultOpen={false}>
              <SpeciesRow name="Streptococcus mutans" role="Primary cavity-causing bacterium" val={sp("Streptococcus mutans")} target="<1% reads" isPathogen={true} note="Ferments dietary sugars to lactic acid, dissolving tooth enamel at pH below 5.5" flagFn={v => flag(v < 1, v < 3)} learnWhat="Produces lactic acid by fermenting sucrose and synthesizes sticky glucans that anchor biofilm to tooth surfaces, creating highly acidic local environments." learnWhy="The most extensively studied cariogenic pathogen. High abundance predicts future caries development and is heritable — mothers with high S. mutans transmit it to infants." learnCitation="Loesche, Microbiological Reviews, 1986. S. mutans as the principal cause of dental caries." />
              <SpeciesRow name="Streptococcus sobrinus" role="Works with S. mutans — amplifies caries risk" val={sp("Streptococcus sobrinus")} target="<0.5% reads" isPathogen={true} note="More acidogenic than S. mutans; co-infection dramatically increases caries severity" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Similar cariogenic mechanism to S. mutans but more acid-tolerant and more efficient at fermentation at lower pH, meaning it remains active even as the environment acidifies." learnWhy="When present alongside S. mutans, caries risk is significantly amplified. Some studies show S. sobrinus may be a stronger predictor of caries activity than S. mutans alone." learnCitation="van Houte et al., Journal of Dental Research, 1991. Role of S. sobrinus in human caries." />
              <SpeciesRow name="Lactobacillus spp." role="Acid producers — secondary caries colonizers" val={genus("Lactobacillus")} target="<2% reads" isPathogen={true} note="Not primary initiators, but thrive in acidic lesions created by Streptococci and deepen cavities" flagFn={v => flag(v < 2, v < 5)} learnWhat="Obligate acid producers that colonize early carious lesions once the pH drops sufficiently for their growth. Produce lactic acid efficiently, accelerating dentinal decay." learnWhy="High Lactobacillus counts in saliva correlate with active caries progression. They indicate established acidogenic niches in the mouth." learnCitation="Caufield et al., Caries Research, 2015. Lactobacillus ecology in caries progression." />
              <SpeciesRow name="Streptococcus salivarius" role="Protective commensal — natural probiotic" val={sp("Streptococcus salivarius")} target=">2% reads" isPathogen={false} note="Produces bacteriocins (salivaricins) that inhibit S. mutans and S. pyogenes growth" flagFn={v => flag(v >= 2, v >= 0.5)} learnWhat="One of the first and most abundant colonizers of the oral cavity. Produces bacteriocin-like inhibitory substances (BLIS) that suppress pathogenic streptococci and help maintain microbiome balance." learnWhy="Commercial probiotic strains are based on S. salivarius K12. Low abundance correlates with increased pathogen colonization and recurrent streptococcal throat infections." learnCitation="Wescombe et al., Probiotics and Antimicrobial Proteins, 2012. S. salivarius K12 clinical trials." />
              <SpeciesRow name="Streptococcus sanguinis" role="Inhibits S. mutans — caries protective" val={sp("Streptococcus sanguinis")} target=">1% reads" isPathogen={false} note="Produces hydrogen peroxide that is directly bactericidal to S. mutans; inverse relationship" flagFn={v => flag(v >= 1, v >= 0.3)} learnWhat="An early colonizer of clean tooth surfaces that produces hydrogen peroxide to maintain an oxidative environment hostile to strict anaerobes like S. mutans." learnWhy="Inverse relationship with S. mutans: high S. sanguinis = low S. mutans. Its abundance is a reliable marker of caries-free status in population studies." learnCitation="Kreth et al., Journal of Bacteriology, 2005. H₂O₂-mediated competition between S. sanguinis and S. mutans." />
              <SpeciesRow name="Actinomyces spp." role="Biofilm scaffold — root surface protection" val={genus("Actinomyces")} target="1–5% reads" isPathogen={false} note="Forms the structural backbone of supragingival plaque; low abundance may indicate shallow biofilm" flagFn={v => flag(v >= 1 && v <= 5, v >= 0.3 && v <= 8)} learnWhat="Gram-positive rods that form the architectural scaffold of dental biofilm. Co-aggregate with other species and contribute to biofilm maturation." learnWhy="Moderate abundance maintains biofilm homeostasis. Very low levels may indicate disrupted biofilm ecology; very high levels may contribute to root caries." learnCitation="Kolenbrander et al., Microbiology, 2010. Oral biofilm architecture and Actinomyces." />
            </Section>

            <Section title="Protective & Beneficial" defaultOpen={false}>
              <SpeciesRow name="Streptococcus salivarius" role="Oral probiotic — bacteriocin producer" val={sp("Streptococcus salivarius")} target=">2% reads" isPathogen={false} note="Produces salivaricins A2 and B — natural antibiotics against S. pyogenes and S. mutans" flagFn={v => flag(v >= 2, v >= 0.5)} learnWhat="One of the first colonizers of the neonatal oral cavity and a lifelong dominant commensal. Produces bacteriocin-like substances (BLIS) that competitively exclude pathogens." learnWhy="The most well-studied oral probiotic bacterium. Its commercial derivatives (BLIS K12) are used to prevent throat infections and maintain oral microbiome balance." learnCitation="Wescombe et al., Probiotics and Antimicrobial Proteins, 2012. S. salivarius clinical evidence." />
              <SpeciesRow name="Streptococcus sanguinis" role="Caries defense — H₂O₂ producer" val={sp("Streptococcus sanguinis")} target=">1% reads" isPathogen={false} note="Inverse relationship with S. mutans: competes for the same tooth-surface niches" flagFn={v => flag(v >= 1, v >= 0.3)} learnWhat="Produces hydrogen peroxide as a metabolic byproduct that kills strict anaerobes and creates an aerobic microenvironment hostile to cariogenic bacteria." learnWhy="Population studies consistently show high S. sanguinis in caries-free individuals. Its abundance is one of the strongest predictors of caries resistance." learnCitation="Kreth et al., Journal of Bacteriology, 2005. Competitive exclusion of S. mutans." />
              <SpeciesRow name="Rothia dentocariosa" role="Anti-inflammatory commensal — biofilm stabilizer" val={sp("Rothia dentocariosa")} target=">0.5% reads" isPathogen={false} note="Produces urease that neutralizes organic acids, preventing pH drops that promote caries" flagFn={v => flag(v >= 0.5, v >= 0.1)} learnWhat="An alkalinogenic bacterium that hydrolyzes urea and produces ammonia, raising plaque pH and counteracting acidogenic species. Also has anti-inflammatory properties." learnWhy="Low Rothia dentocariosa is found in dysbiotic oral microbiomes. Its urease activity is a key pH-buffering mechanism in healthy dental biofilm." learnCitation="Nascimento et al., Journal of Dental Research, 2009. Alkalinogenic bacteria and caries resistance." />
              <SpeciesRow name="Haemophilus parainfluenzae" role="Commensal — early biofilm colonizer" val={sp("Haemophilus parainfluenzae")} target="1–3% reads" isPathogen={false} note="Provides growth factors for other commensals; its abundance indicates a mature, diverse microbiome" flagFn={v => flag(v >= 1 && v <= 3, v >= 0.3 && v <= 5)} learnWhat="An early and abundant colonizer of the oral and upper respiratory mucosa. Provides hemin and NAD growth factors to fastidious commensals that cannot synthesize them." learnWhy="Consistently found at high abundance in healthy individuals. Loss may destabilize the commensal community and create openings for pathogens." learnCitation="Bik et al., PLOS Biology, 2010. Core oral microbiome across 120 individuals." />
            </Section>

            <Section title="OSA & Sleep-Associated" defaultOpen={osaPct >= 1}>
              <SpeciesRow name="Prevotella melaninogenica" role="OSA-enriched — airway inflammation" val={sp("Prevotella melaninogenica")} target="<1% reads" isPathogen={true} note="Consistently elevated in OSA patients across multiple cohort studies" flagFn={v => flag(v < 1, v < 2)} learnWhat="An anaerobe enriched in the upper airway microbiome of OSA patients. Produces lipopolysaccharide that promotes upper airway inflammation and may contribute to airway tissue remodeling." learnWhy="OSA patients are 2.46\u00d7 more likely to have periodontitis across meta-analyses of 88,000+ patients. P. melaninogenica abundance is elevated in OSA-associated dysbiosis profiles." learnCitation="Portelli et al., Dentistry Journal 2024 (meta-analysis, n=88,040). Mi et al., BMC Oral Health 2023 (Mendelian randomization)." />
              <SpeciesRow name="Fusobacterium nucleatum" role="OSA-associated systemic bridge organism" val={sp("Fusobacterium nucleatum")} target="<0.5% reads" isPathogen={true} note="Elevated in OSA cohorts alongside P. melaninogenica; contributes to upper airway dysbiosis" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Found at elevated levels in both the oral and pharyngeal microbiome of OSA patients. Its invasive properties may allow penetration of upper airway epithelium." learnWhy="Contributes to the oral-OSA inflammatory pathway. Its concurrent elevation with other OSA-associated taxa is consistent with the bidirectional periodontitis-OSA relationship confirmed across meta-analyses." learnCitation="Zhu et al., Sleep and Breathing 2023 (meta-analysis, n=31,800). Incerti-Parenti et al., Applied Sciences 2025." />
              <SpeciesRow name="Fusobacterium periodonticum" role="Periodontal + sleep pathway — bridging species" val={sp("Fusobacterium periodonticum")} target="<0.5% reads" isPathogen={true} note="Closely related to F. nucleatum; shares OSA-enrichment and periodontal risk associations" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="A Fusobacterium species closely related to F. nucleatum with similar invasive and co-aggregating properties. Bridges periodontal and systemic compartments." learnWhy="Elevated in OSA-associated dysbiosis profiles. Its co-occurrence with F. nucleatum amplifies periodontal-systemic risk." learnCitation="Almeida-Santos et al., mBio, 2021. Fusobacterium species in oral-systemic disease." />
              <SpeciesRow name="Peptostreptococcus spp." role="Anaerobic commensal — sleep microbiome marker" val={genus("Peptostreptococcus")} target="<1% reads" isPathogen={true} note="Part of the OSA-enriched microbial community; contributes to anaerobic dysbiosis in the upper airway" flagFn={v => flag(v < 1, v < 3)} learnWhat="Strictly anaerobic gram-positive cocci that thrive in oxygen-depleted environments. Their abundance in the upper airway increases under hypoxic conditions associated with sleep apnea." learnWhy="Part of the core dysbiotic community found in OSA. High abundance indicates an anaerobic-shifted microbiome consistent with nocturnal oxygen desaturation." learnCitation="Portelli et al., Dentistry Journal 2024 (meta-analysis, n=88,040). Hao G et al., BMC Oral Health 2025 (NHANES, n=4,729)." />
            </Section>

            <Section title="Breath & Metabolic" defaultOpen={false}>
              <SpeciesRow name="Solobacterium moorei" role="Primary halitosis organism — VSC producer" val={sp("Solobacterium moorei")} target="<0.5% reads" isPathogen={true} note="Produces volatile sulfur compounds (H₂S, CH₃SH) that are the primary chemical cause of chronic halitosis" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Produces volatile sulfur compounds (VSCs) — hydrogen sulfide and methyl mercaptan — the chemical signature of breath malodor. Thrives on protein substrates and tongue dorsum biofilm." learnWhy="The dominant organism in tongue biofilm of patients with refractory halitosis. VSC production correlates directly with organoleptic scores of breath odor severity." learnCitation="Haraszthy et al., Journal of Periodontology, 2007. Solobacterium moorei and halitosis." />
              <SpeciesRow name="Prevotella spp." role="Aggregate Prevotella — VSC + inflammation" val={genus("Prevotella")} target="<3% reads" isPathogen={true} note="Total Prevotella genus abundance; includes all species — pathogenic and commensal" flagFn={v => flag(v < 3, v < 6)} learnWhat="The Prevotella genus includes species across a virulence spectrum — from key pathogens (P. intermedia, P. melaninogenica) to moderate commensals. Produces proteolytic enzymes and VSCs." learnWhy="High total Prevotella burden is associated with periodontal disease, OSA, and halitosis. Elevated aggregate Prevotella is a consistent finding in oral dysbiosis." learnCitation="Hajishengallis & Lamont, Trends in Immunology, 2012. Oral dysbiosis and the Prevotella genus." />
              <SpeciesRow name="Fusobacterium spp." role="Aggregate Fusobacterium — periodontal disease and systemic inflammation" val={genus("Fusobacterium")} target="<1% reads" isPathogen={true} note="Total Fusobacterium genus; includes F. nucleatum, F. periodonticum, and other species" flagFn={v => flag(v < 1, v < 3)} learnWhat="The Fusobacterium genus contains multiple species with invasive and pro-inflammatory properties. They produce butyrate and other metabolites that can modulate host immunity." learnWhy="Elevated total Fusobacterium abundance is associated with periodontal disease, OSA, and elevated systemic inflammation. A reliable marker of oral dysbiosis." learnCitation="Hajishengallis G. Nature Reviews Immunology. 2015. Oral dysbiosis and systemic inflammation." />
              <SpeciesRow name="Peptostreptococcus spp." role="Anaerobic VSC producer — breath marker" val={genus("Peptostreptococcus")} target="<1% reads" isPathogen={true} note="Proteolytic anaerobes that produce sulfur compounds from amino acid metabolism" flagFn={v => flag(v < 1, v < 3)} learnWhat="Strictly anaerobic proteolytic bacteria that metabolize cysteine and methionine to produce volatile sulfur compounds. Dominant in deep periodontal pockets and tongue dorsum biofilm." learnWhy="High abundance correlates with clinical malodor scores and is found in both halitosis and periodontal disease patient profiles." learnCitation="Persson et al., Journal of Clinical Periodontology, 2011. Peptostreptococcus in oral malodor." />
            </Section>

            <Section title="Diversity Metrics" defaultOpen={true}>
              <div style={{ padding: "12px 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
                  <div>
                    <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", color: "var(--ink)" }}>Shannon Diversity Index</p>
                    <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)" }}>Species richness and evenness — target ≥3.0</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 16, color: shannon >= 3 ? "#3B6D11" : shannon >= 2 ? "#92400E" : "#991B1B" }}>
                      {shannon.toFixed(2)}
                    </p>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 6px", background: shannon >= 3 ? "#EAF3DE" : shannon >= 2 ? "#FEF3C7" : "#FEE2E2", color: shannon >= 3 ? "#3B6D11" : shannon >= 2 ? "#92400E" : "#991B1B" }}>
                      {shannon >= 3 ? "Optimal" : shannon >= 2 ? "Watch" : "Attention"}
                    </span>
                  </div>
                </div>
                {speciesCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
                    <div>
                      <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", color: "var(--ink)" }}>Species Richness</p>
                      <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)" }}>Total OTUs detected — target &gt;150</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 16, color: speciesCount > 150 ? "#3B6D11" : speciesCount > 80 ? "#92400E" : "#991B1B" }}>
                        {speciesCount}
                      </p>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 6px", background: speciesCount > 150 ? "#EAF3DE" : speciesCount > 80 ? "#FEF3C7" : "#FEE2E2", color: speciesCount > 150 ? "#3B6D11" : speciesCount > 80 ? "#92400E" : "#991B1B" }}>
                        {speciesCount > 150 ? "Optimal" : speciesCount > 80 ? "Watch" : "Attention"}
                      </span>
                    </div>
                  </div>
                )}
                <p style={{ margin: "10px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-50)", lineHeight: 1.6 }}>
                  Higher diversity generally indicates a more resilient oral microbiome with better resistance to pathogen colonization. A Shannon index below 2.0 is associated with dysbiosis-related systemic risk.
                </p>
              </div>
            </Section>
          </>
        )}

        {/* Recommendations */}
        {oralScore?.recommendations && oralScore.recommendations.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)", marginBottom: 10 }}>
              Recommendations
            </p>
            {oralScore.recommendations.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
                <span style={{ color: "#3B6D11", flexShrink: 0, fontFamily: "var(--font-body)", fontSize: 12 }}>→</span>
                <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", lineHeight: 1.6 }}>{r}</p>
              </div>
            ))}
          </div>
        )}

        {/* Emerging research recommendations for D5/D6/D7 */}
        {((neuroSignalPct !== null && neuroSignalPct > 0.5) ||
          (metabolicSignalPct !== null && metabolicSignalPct > 3) ||
          (proliferativeSignalPct !== null && proliferativeSignalPct > 0.5)) && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)", marginBottom: 10 }}>
              Emerging Research Recommendations
            </p>

            {neuroSignalPct !== null && neuroSignalPct > 0.5 && (
              <div style={{ border: "0.5px solid var(--ink-12)", borderLeft: "3px solid #C49A3C", padding: "14px 16px", marginBottom: 10 }}>
                <p style={{ margin: "0 0 5px", fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 400, color: "var(--ink)" }}>
                  Supporting oral neurological balance
                </p>
                <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: 12, lineHeight: 1.65, color: "var(--ink-60)" }}>
                  Research is exploring the connection between certain oral bacteria and neurological health pathways. Professional dental cleaning and L. reuteri probiotics have shown promise in reducing these bacteria.
                </p>
                <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", fontStyle: "italic" }}>
                  Speak with your dentist about your results
                </p>
              </div>
            )}

            {metabolicSignalPct !== null && metabolicSignalPct > 3 && (
              <div style={{ border: "0.5px solid var(--ink-12)", borderLeft: "3px solid #C49A3C", padding: "14px 16px", marginBottom: 10 }}>
                <p style={{ margin: "0 0 5px", fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 400, color: "var(--ink)" }}>
                  Supporting metabolic microbiome balance
                </p>
                <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, lineHeight: 1.65, color: "var(--ink-60)" }}>
                  Certain Prevotella species are associated with metabolic health pathways. A diet rich in diverse plant fibers supports a balanced oral microbiome.
                </p>
              </div>
            )}

            {proliferativeSignalPct !== null && proliferativeSignalPct > 0.5 && (
              <div style={{ border: "0.5px solid var(--ink-12)", borderLeft: "3px solid #C49A3C", padding: "14px 16px", marginBottom: 10 }}>
                <p style={{ margin: "0 0 5px", fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 400, color: "var(--ink)" }}>
                  Supporting cellular environment balance
                </p>
                <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: 12, lineHeight: 1.65, color: "var(--ink-60)" }}>
                  Fusobacterium species are being studied in connection with cellular health. Regular dental cleaning, good oral hygiene, and dietary fiber support a balanced microbiome.
                </p>
                <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", fontStyle: "italic" }}>
                  Speak with your dentist about your results
                </p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

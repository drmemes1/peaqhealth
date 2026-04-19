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
  val: number | null
  target: string
  isPathogen: boolean
  note: string
  learnWhat: string
  learnWhy: string
  learnCitation: string
  flagFn: (v: number) => Flag
}) {
  const [expanded, setExpanded] = useState(false)
  const flag = val != null ? flagFn(val) : "pending" as Flag
  const pct = val != null ? val.toFixed(2) : "—"

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
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: val != null ? "var(--ink)" : "var(--ink-30)" }}>{val != null ? `${pct}%` : "—"}</span>
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
// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({ label, sub, value, unit, color, status, statusLabel, zoneKey, numericValue }: {
  label: string
  sub: string
  value: string | number
  unit: string
  color: string
  status: "optimal" | "watch" | "attention" | "pending"
  statusLabel: string
  zoneKey?: string
  numericValue?: number
}) {
  const statusBg = status === "pending" ? "#F7F5F0" : status === "optimal" ? "#EAF3DE" : status === "watch" ? "#FEF3C7" : "#FEE2E2"
  const statusTxt = status === "pending" ? "var(--ink-35)" : status === "optimal" ? "#3B6D11" : status === "watch" ? "#92400E" : "#991B1B"
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
  shannon: number | null; nitratePct: number | null; periodontalPct: number | null
}) {
  if (shannon == null) return null
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
  const rawOtu = oral.raw_otu_table as Record<string, unknown> | null
  const reportDate = oral.report_date as string | null

  // ── Read from dedicated DB columns (authoritative source for scored metrics) ──
  const col = (key: string): number | null => {
    const v = oral[key]
    if (v == null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const sumOrNull = (...vals: (number | null)[]): number | null => {
    const present = vals.filter((v): v is number => v != null)
    return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null
  }

  // raw_otu_table flat lookups (for individual SpeciesRow tiles — fallback for species
  // not tracked in dedicated columns). Keys are "Genus species" → fractional abundance.
  const sp = (key: string): number | null => {
    if (!rawOtu) return null
    const v = rawOtu[key]
    return typeof v === "number" ? v : null
  }
  const genus = (prefix: string): number | null => {
    if (!rawOtu) return null
    const entries = Object.entries(rawOtu).filter(([k]) => k !== "__meta" && k.toLowerCase().startsWith(prefix.toLowerCase()))
    if (entries.length === 0) return null
    return entries.reduce((sum, [, v]) => sum + (typeof v === "number" ? v : 0), 0)
  }

  const shannon: number | null = oral.shannon_diversity as number | null

  // Summary cards from dedicated columns — not OTU lookups
  const nitratePct  = sumOrNull(col("neisseria_pct"), col("rothia_pct"), col("veillonella_pct"))
  const periodontalPct = sumOrNull(col("porphyromonas_pct"), col("tannerella_pct"), col("treponema_pct"))
  const osaPct = sumOrNull(col("fusobacterium_pct"), col("prevotella_commensal_pct"))

  // D5–D7 emerging-research dimension values (stored as fractions 0–1, display as %)
  const _neuroSignalRaw = (oral.neuro_signal_pct as number | null) ?? null
  const _metabolicSignalRaw = (oral.metabolic_signal_pct as number | null) ?? null
  const _proliferativeSignalRaw = (oral.proliferative_signal_pct as number | null) ?? null
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

  const speciesCount = (oral.species_count as number | null) ?? oralScore?.speciesCount ?? (rawOtu ? Object.entries(rawOtu).filter(([k, v]) => k !== "__meta" && typeof v === "number" && v > 0).length : 0)

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
            fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 15,
            color: "var(--ink-30)", lineHeight: 1.55, margin: "0 0 24px",
          }}>
            Your personalised narrative is being prepared.
          </p>
        )}

        {/* 4 key metrics */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
          <MetricCard
            label="Shannon Diversity"
            sub="Species richness & evenness — target ≥3.0"
            value={shannon != null ? shannon.toFixed(2) : "—"}
            unit={shannon != null ? "index" : ""}
            color="#3B6D11"
            status={shannon == null ? "pending" : shannon >= 3 ? "optimal" : shannon >= 2 ? "watch" : "attention"}
            statusLabel={shannon == null ? "—" : shannon >= 3 ? "Optimal" : shannon >= 2 ? "Watch" : "Low"}
            zoneKey={shannon != null ? "shannon" : undefined}
            numericValue={shannon ?? undefined}
          />
          <MetricCard
            label="Nitrate-Reducing"
            sub="Neisseria · Rothia · Veillonella — target ≥5%"
            value={nitratePct != null ? nitratePct.toFixed(1) : "—"}
            unit={nitratePct != null ? "% reads" : ""}
            color="#185FA5"
            status={nitratePct == null ? "pending" : nitratePct >= 5 ? "optimal" : nitratePct >= 2 ? "watch" : "attention"}
            statusLabel={nitratePct == null ? "—" : nitratePct >= 5 ? "Optimal" : nitratePct >= 2 ? "Watch" : "Low"}
            zoneKey={nitratePct != null ? "nitrate" : undefined}
            numericValue={nitratePct ?? undefined}
          />
          <MetricCard
            label="Periodontal Burden"
            sub="P. gingivalis · T. denticola — target <0.5%"
            value={periodontalPct != null ? periodontalPct.toFixed(2) : "—"}
            unit={periodontalPct != null ? "% reads" : ""}
            color="#A32D2D"
            status={periodontalPct == null ? "pending" : periodontalPct < 0.5 ? "optimal" : periodontalPct < 1.5 ? "watch" : "attention"}
            statusLabel={periodontalPct == null ? "—" : periodontalPct < 0.5 ? "Optimal" : periodontalPct < 1.5 ? "Watch" : "Elevated"}
            zoneKey={periodontalPct != null ? "periodontal" : undefined}
            numericValue={periodontalPct ?? undefined}
          />
          <MetricCard
            label="OSA-Associated Taxa"
            sub="Prevotella · Fusobacterium — target <1%"
            value={osaPct != null ? osaPct.toFixed(2) : "—"}
            unit={osaPct != null ? "% reads" : ""}
            color="#C49A3C"
            status={osaPct == null ? "pending" : osaPct < 1 ? "optimal" : osaPct < 3 ? "watch" : "attention"}
            statusLabel={osaPct == null ? "—" : osaPct < 1 ? "Optimal" : osaPct < 3 ? "Watch" : "Elevated"}
            zoneKey={osaPct != null ? "osa" : undefined}
            numericValue={osaPct ?? undefined}
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

        {/* Species sections — prefer dedicated columns, fall back to OTU */}
        {(col("neisseria_pct") != null || rawOtu) && (
          <>
            <Section title="Nitrate & Cardiovascular" defaultOpen={true}>
              <SpeciesRow name="Neisseria (all species)" role="Primary nitrate reducer — NO pathway" val={col("neisseria_pct") ?? genus("Neisseria")} target=">10% reads" isPathogen={false} note="Converts dietary nitrate to vasodilating nitric oxide; depleted by antiseptic mouthwash within days" flagFn={v => flag(v >= 10, v >= 5)} learnWhat="Reduces nitrate from food (beetroot, spinach) to nitrite, which is further converted to nitric oxide in the gut and bloodstream." learnWhy="Nitric oxide is a potent vasodilator. Low Neisseria abundance is associated with impaired endothelial function and elevated blood pressure." learnCitation="Velmurugan et al., Free Radical Biology and Medicine, 2016. n=19, crossover RCT." />
              <SpeciesRow name="Rothia (all species)" role="Nitrate reducer + anti-inflammatory commensal" val={col("rothia_pct") ?? genus("Rothia")} target=">5% reads" isPathogen={false} note="Dual role: nitrate reduction and mucosal immune modulation" flagFn={v => flag(v >= 5, v >= 2)} learnWhat="A highly abundant commensal that participates in nitrate reduction and produces enzymes that neutralize reactive oxygen species." learnWhy="Consistently found at higher abundance in healthy individuals. Its loss correlates with oral inflammation and cardiovascular risk markers." learnCitation="Rosenbaum et al., Cell Host & Microbe, 2021. Oral microbiome-cardiovascular cohort." />
              <SpeciesRow name="Veillonella (all species)" role="Lactate metaboliser — nitrate pathway co-contributor" val={col("veillonella_pct") ?? genus("Veillonella")} target=">2% reads" isPathogen={false} note="Consumes lactic acid from other bacteria, reducing cariogenic potential while supporting NO pathway" flagFn={v => flag(v >= 2, v >= 1)} learnWhat="Converts lactic acid (produced by Streptococci) to propionate and acetate, and also participates in nitrate reduction cooperatively with Neisseria." learnWhy="A key cross-feeder in oral biofilm ecology. Its presence moderates acidity and supports cardiovascular-protective pathways." learnCitation="Mashima & Nakazawa, Frontiers in Microbiology, 2015. Oral microbiome metabolic interactions." />
              <SpeciesRow name="Haemophilus (all species)" role="NO pathway co-contributor — cardiovascular support" val={col("haemophilus_pct") ?? genus("Haemophilus")} target="≥4% reads" isPathogen={false} note="Contributes to the aggregate nitrate-reducing capacity; associated with better glucose regulation" flagFn={v => flag(v >= 4, v >= 2)} learnWhat="A commensal genus with nitrate-reducing activity, supporting the oral-systemic NO pathway." learnWhy="NHANES data shows association between Haemophilus abundance and better HbA1c and blood pressure readings." learnCitation="Hyde et al., mBio, 2014. Oral microbiome and nitrate metabolism." />
            </Section>

            <Section title="Periodontal Pathogens" defaultOpen={true}>
              <SpeciesRow name="Porphyromonas (all species)" role="Keystone periodontal pathogen — systemic inflammation" val={col("porphyromonas_pct") ?? genus("Porphyromonas")} target="<0.5% reads" isPathogen={true} note="Found in coronary artery plaques in autopsy studies; manipulates host immune response" flagFn={v => flag(v < 0.5, v < 2)} learnWhat="A low-abundance keystone pathogen that dysregulates the host immune response out of proportion to its numbers, enabling growth of the broader pathogenic community." learnWhy="Identified in coronary artery plaques in multiple autopsy studies. Associated with elevated hsCRP and cardiovascular events independent of traditional risk factors." learnCitation="Hussain et al., Frontiers in Immunology, 2023. n=1,791. Cardiovascular meta-analysis." />
              <SpeciesRow name="Treponema (all species)" role="Red complex pathogen — periodontal and systemic inflammation" val={col("treponema_pct") ?? genus("Treponema")} target="<0.5% reads" isPathogen={true} note="Part of the red complex; produces proteases that can enter circulation" flagFn={v => flag(v < 0.5, v < 2)} learnWhat="Part of the 'red complex' — the most pathogenic bacterial consortium in periodontal disease. Produces enzymes that destroy connective tissue and evade immune defenses." learnWhy="Associated with elevated systemic inflammation and periodontal disease severity." learnCitation="Socransky et al., Journal of Clinical Periodontology, 1998. Red complex classification." />
              <SpeciesRow name="Tannerella forsythia" role="Red complex pathogen — bone resorption" val={col("tannerella_pct") ?? sp("Tannerella forsythia")} target="<0.5% reads" isPathogen={true} note="Synergizes with Porphyromonas and Treponema to accelerate periodontal bone loss" flagFn={v => flag(v < 0.5, v < 2)} learnWhat="The third member of the red complex. Produces surface proteins that inhibit apoptosis of infected cells, allowing persistent infection and tissue destruction." learnWhy="A reliable diagnostic marker for severe chronic periodontitis. Its abundance correlates with probing depth and clinical attachment loss." learnCitation="Socransky et al., Journal of Clinical Periodontology, 1998. Original red complex classification." />
              <SpeciesRow name="Prevotella intermedia" role="Hormone-responsive periodontopathogen — gingival inflammation" val={col("prevotella_intermedia_pct") ?? sp("Prevotella intermedia")} target="<0.5% reads" isPathogen={true} note="Uses progesterone and estrogen as growth factors — elevated during hormonal fluctuations" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="A gram-negative anaerobe that can substitute sex hormones (progesterone, estradiol) for vitamin K as growth factors, making it highly active during hormonal fluctuations." learnWhy="Elevated during pregnancy, puberty, and oral contraceptive use. Associated with systemic inflammation and elevated periodontal disease severity." learnCitation="Kornman & Loesche, Journal of Periodontal Research, 1980. Hormonal effects on oral microbiome." />
              <SpeciesRow name="Fusobacterium (all species)" role="Periodontal and systemic inflammation bridge organism" val={col("fusobacterium_pct") ?? genus("Fusobacterium")} target="<0.5% reads" isPathogen={true} note="Bridges the oral cavity to other body sites; associated with periodontal disease and elevated systemic inflammation when elevated" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="An opportunistic pathogen that invades vascular endothelium and can translocate from the oral cavity to other body compartments." learnWhy="Associated with periodontal disease and elevated systemic inflammation. Its abundance is a reliable indicator of oral microbiome imbalance." learnCitation="Hajishengallis G. Nature Reviews Immunology. 2015. Oral dysbiosis and systemic disease." />
              <SpeciesRow name="Aggregatibacter (all species)" role="Aggressive periodontal pathogen" val={col("aggregatibacter_pct") ?? genus("Aggregatibacter")} target="<0.5% reads" isPathogen={true} note="Associated with aggressive forms of periodontal change in younger individuals" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Associated with aggressive periodontal disease. Produces leukotoxin that kills immune cells." learnWhy="Its abundance is a reliable marker of aggressive periodontal activity, particularly in younger patients." learnCitation="Haffajee & Socransky, 2005. Periodontal microbial complexes." />
            </Section>

            <Section title="Caries & Dental Health" defaultOpen={false}>
              <SpeciesRow name="Streptococcus mutans" role="Primary cavity-causing bacterium" val={col("s_mutans_pct") ?? sp("Streptococcus mutans")} target="<0.5% reads" isPathogen={true} note="Ferments dietary sugars to lactic acid, dissolving tooth enamel at pH below 5.5" flagFn={v => flag(v < 0.5, v < 1)} learnWhat="Produces lactic acid by fermenting sucrose and synthesizes sticky glucans that anchor biofilm to tooth surfaces, creating highly acidic local environments." learnWhy="The most extensively studied cariogenic pathogen. High abundance predicts future caries development and is heritable." learnCitation="Loesche, Microbiological Reviews, 1986. S. mutans as the principal cause of dental caries." />
              <SpeciesRow name="Streptococcus sobrinus" role="Works with S. mutans — amplifies caries risk" val={col("s_sobrinus_pct") ?? sp("Streptococcus sobrinus")} target="<0.5% reads" isPathogen={true} note="More acidogenic than S. mutans; co-infection dramatically increases caries severity" flagFn={v => flag(v < 0.5, v < 1)} learnWhat="Similar cariogenic mechanism to S. mutans but more acid-tolerant and more efficient at fermentation at lower pH." learnWhy="When present alongside S. mutans, caries risk is significantly amplified." learnCitation="van Houte et al., Journal of Dental Research, 1991. Role of S. sobrinus in human caries." />
              <SpeciesRow name="Lactobacillus (all species)" role="Acid producers — secondary caries colonizers" val={col("lactobacillus_pct") ?? genus("Lactobacillus")} target="<2% reads" isPathogen={true} note="Not primary initiators, but thrive in acidic lesions created by Streptococci" flagFn={v => flag(v < 2, v < 5)} learnWhat="Obligate acid producers that colonize early carious lesions once the pH drops sufficiently." learnWhy="High Lactobacillus counts in saliva correlate with active caries progression." learnCitation="Caufield et al., Caries Research, 2015. Lactobacillus ecology in caries progression." />
              <SpeciesRow name="Scardovia wiggsiae" role="Early childhood caries pathogen" val={col("scardovia_pct") ?? sp("Scardovia wiggsiae")} target="<0.2% reads" isPathogen={true} note="Associated with severe early childhood caries independent of S. mutans" flagFn={v => flag(v < 0.2, v < 0.5)} learnWhat="An aciduric organism associated with deep dentin caries lesions." learnWhy="Identified as a caries pathogen independent of the Streptococcus mutans pathway." learnCitation="Tanner et al., Journal of Dental Research, 2011. Scardovia in childhood caries." />
              <SpeciesRow name="Streptococcus sanguinis" role="Inhibits S. mutans — caries protective" val={col("s_sanguinis_pct") ?? sp("Streptococcus sanguinis")} target="≥1.5% reads" isPathogen={false} note="Produces hydrogen peroxide that is directly bactericidal to S. mutans" flagFn={v => flag(v >= 1.5, v >= 0.5)} learnWhat="An early colonizer of clean tooth surfaces that produces hydrogen peroxide hostile to cariogenic bacteria." learnWhy="Inverse relationship with S. mutans. Its abundance is a reliable marker of caries-free status." learnCitation="Kreth et al., Journal of Bacteriology, 2005. H₂O₂-mediated competition." />
              <SpeciesRow name="Streptococcus gordonii" role="Caries protective commensal" val={col("s_gordonii_pct") ?? sp("Streptococcus gordonii")} target="≥0.3% reads" isPathogen={false} note="Competes with S. mutans for tooth surface colonization" flagFn={v => flag(v >= 0.3, v >= 0.1)} learnWhat="Produces hydrogen peroxide and competes with cariogenic streptococci." learnWhy="Part of the protective streptococcal community that maintains oral homeostasis." learnCitation="Kreth et al., 2005. Streptococcal interspecies competition." />
              <SpeciesRow name="Actinomyces (all species)" role="Biofilm scaffold — root surface protection" val={col("actinomyces_pct") ?? genus("Actinomyces")} target="1–5% reads" isPathogen={false} note="Forms the structural backbone of supragingival plaque" flagFn={v => flag(v >= 1 && v <= 8, v >= 0.3)} learnWhat="Gram-positive rods that form the architectural scaffold of dental biofilm." learnWhy="Moderate abundance maintains biofilm homeostasis." learnCitation="Kolenbrander et al., Microbiology, 2010. Oral biofilm architecture." />
            </Section>

            <Section title="Protective & Beneficial" defaultOpen={false}>
              <SpeciesRow name="S. salivarius + vestibularis" role="Oral probiotic — bacteriocin producer" val={col("s_salivarius_pct") ?? sp("Streptococcus salivarius")} target=">2% reads" isPathogen={false} note="Produces salivaricins A2 and B — natural antibiotics against S. pyogenes and S. mutans" flagFn={v => flag(v >= 2, v >= 0.5)} learnWhat="One of the first colonizers of the neonatal oral cavity and a lifelong dominant commensal." learnWhy="The most well-studied oral probiotic bacterium. Low abundance correlates with increased pathogen colonization." learnCitation="Wescombe et al., Probiotics and Antimicrobial Proteins, 2012. S. salivarius K12 clinical trials." />
              <SpeciesRow name="Prevotella commensal" role="Metabolic health marker" val={col("prevotella_commensal_pct")} target=">5% reads" isPathogen={false} note="Commensal Prevotella species associated with better triglycerides and LDL" flagFn={v => flag(v >= 5, v >= 2)} learnWhat="Non-pathogenic Prevotella species that participate in complex carbohydrate metabolism." learnWhy="Population research associates commensal Prevotella with better cardiovascular metabolic markers." learnCitation="NHANES oral-blood correlation analysis." />
              <SpeciesRow name="Haemophilus (all species)" role="Commensal — early biofilm colonizer" val={col("haemophilus_pct") ?? genus("Haemophilus")} target="≥4% reads" isPathogen={false} note="Provides growth factors for other commensals; abundance indicates a mature, diverse microbiome" flagFn={v => flag(v >= 4, v >= 2)} learnWhat="An early and abundant colonizer of the oral and upper respiratory mucosa." learnWhy="Consistently found at high abundance in healthy individuals." learnCitation="Bik et al., PLOS Biology, 2010. Core oral microbiome across 120 individuals." />
              <SpeciesRow name="Granulicatella (all species)" role="Protective commensal" val={col("granulicatella_pct") ?? genus("Granulicatella")} target=">0.5% reads" isPathogen={false} note="Part of the healthy oral commensal community" flagFn={v => flag(v >= 0.5, v >= 0.1)} learnWhat="A nutritionally variant streptococcus-like organism that is part of the healthy oral flora." learnWhy="Its presence is associated with a balanced oral microbiome." learnCitation="Aas et al., Journal of Clinical Microbiology, 2005. Healthy oral microbiome." />
            </Section>

            <Section title="Sleep-Associated" defaultOpen={(osaPct ?? 0) >= 1}>
              <SpeciesRow name="Campylobacter (all species)" role="Sleep-disordered breathing marker" val={col("campylobacter_pct") ?? genus("Campylobacter")} target="<1% reads" isPathogen={true} note="Enriched in oral microbiomes associated with sleep-disordered breathing" flagFn={v => flag(v < 1, v < 2)} learnWhat="An anaerobe found at elevated levels in individuals with disrupted nighttime breathing patterns." learnWhy="Part of the microbial community shift associated with altered oxygenation during sleep." learnCitation="Portelli et al., Dentistry Journal 2024 (meta-analysis, n=88,040)." />
              <SpeciesRow name="Peptostreptococcus (all species)" role="Anaerobic — sleep microbiome marker" val={col("peptostreptococcus_pct") ?? genus("Peptostreptococcus")} target="<1% reads" isPathogen={true} note="Strict anaerobes that thrive in oxygen-depleted conditions" flagFn={v => flag(v < 1, v < 3)} learnWhat="Strictly anaerobic gram-positive cocci that thrive in oxygen-depleted environments." learnWhy="High abundance indicates an anaerobic-shifted microbiome." learnCitation="Hao G et al., BMC Oral Health 2025 (NHANES, n=4,729)." />
            </Section>

            <Section title="Streptococcus Overview" defaultOpen={false}>
              <SpeciesRow name="Streptococcus total" role="All Streptococcus species combined" val={col("streptococcus_total_pct")} target="15–30% reads" isPathogen={false} note="Streptococcus is the dominant genus in a healthy oral microbiome. Total is mainly driven by S. salivarius." flagFn={v => flag(v >= 15 && v <= 35, v >= 5)} learnWhat="The Streptococcus genus contains both protective (salivarius, sanguinis, gordonii) and pathogenic (mutans, sobrinus) species." learnWhy="Total Streptococcus abundance is a community stability marker." learnCitation="Aas et al., Journal of Clinical Microbiology, 2005." />
            </Section>

            <Section title="Diversity Metrics" defaultOpen={true}>
              <div style={{ padding: "12px 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
                  <div>
                    <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: "italic", color: "var(--ink)" }}>Shannon Diversity Index</p>
                    <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)" }}>Species richness and evenness — target ≥3.0</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {shannon != null ? (
                      <>
                        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 16, color: shannon >= 3 ? "#3B6D11" : shannon >= 2 ? "#92400E" : "#991B1B" }}>
                          {shannon.toFixed(2)}
                        </p>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 6px", background: shannon >= 3 ? "#EAF3DE" : shannon >= 2 ? "#FEF3C7" : "#FEE2E2", color: shannon >= 3 ? "#3B6D11" : shannon >= 2 ? "#92400E" : "#991B1B" }}>
                          {shannon >= 3 ? "Optimal" : shannon >= 2 ? "Watch" : "Attention"}
                        </span>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 16, color: "var(--ink-30)" }}>—</p>
                    )}
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

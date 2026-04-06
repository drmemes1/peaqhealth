"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Nav } from "../components/nav"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "-apple-system, BlinkMacSystemFont, sans-serif"

// ── NHANES reference data (embedded from nhanes_oral_reference.json) ──────
// Using the percentile tables for the KDE-style distribution visualization
const NHANES_PERCENTILES = {
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
  simpson: {
    p5: 0.784, p10: 0.830, p15: 0.853, p20: 0.869, p25: 0.882,
    p30: 0.891, p35: 0.899, p40: 0.906, p45: 0.911, p50: 0.916,
    p55: 0.921, p60: 0.926, p65: 0.930, p70: 0.934, p75: 0.938,
    p80: 0.942, p85: 0.947, p90: 0.952, p95: 0.959,
  },
} as const

type MetricKey = keyof typeof NHANES_PERCENTILES

// ── Percentile interpolation ─────────────────────────────────────────────────

function findPercentile(value: number, table: Record<string, number>): number {
  const keys = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]
  const entries = keys.map(p => ({ pct: p, val: table[`p${p}`] }))

  if (value <= entries[0].val) return Math.max(1, Math.round(entries[0].pct * (value / entries[0].val)))
  if (value >= entries[entries.length - 1].val) return 97

  for (let i = 0; i < entries.length - 1; i++) {
    if (value >= entries[i].val && value <= entries[i + 1].val) {
      const range = entries[i + 1].val - entries[i].val
      if (range === 0) return entries[i].pct
      const frac = (value - entries[i].val) / range
      return Math.round(entries[i].pct + frac * (entries[i + 1].pct - entries[i].pct))
    }
  }
  return 50
}

// ── Distribution curve SVG ───────────────────────────────────────────────────

function DistributionCurve({
  metricKey, label, tooltip, userValue, unit,
}: {
  metricKey: MetricKey
  label: string
  tooltip: string
  userValue: number | null
  unit?: string
}) {
  const table = NHANES_PERCENTILES[metricKey]
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t) }, [])

  const percentile = userValue !== null ? findPercentile(userValue, table) : null

  // Build a smooth distribution curve from percentile data
  const W = 400, H = 160
  const padL = 0, padR = 0, padT = 20, padB = 36
  const chartW = W - padL - padR, chartH = H - padT - padB

  // Use percentile points to create a pseudo-density curve
  const keys = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]
  const xMin = table.p5 * 0.9
  const xMax = table.p95 * 1.05

  // Map a value to x coordinate
  const toX = (v: number) => padL + ((v - xMin) / (xMax - xMin)) * chartW

  // Density approximation: spacing between consecutive percentile values
  // Narrow spacing = high density
  const densityPoints: { x: number; y: number }[] = []
  for (let i = 0; i < keys.length - 1; i++) {
    const v1 = table[`p${keys[i]}` as keyof typeof table]
    const v2 = table[`p${keys[i + 1]}` as keyof typeof table]
    const midVal = (v1 + v2) / 2
    const spacing = v2 - v1
    const density = spacing > 0 ? 5 / spacing : 0
    densityPoints.push({ x: toX(midVal), y: density })
  }

  // Normalize density to chart height
  const maxDensity = Math.max(...densityPoints.map(p => p.y))
  const normalizedPoints = densityPoints.map(p => ({
    x: p.x,
    y: padT + chartH - (p.y / maxDensity) * chartH * 0.85,
  }))

  // Build smooth path
  const baseY = padT + chartH
  let path = `M ${normalizedPoints[0].x} ${baseY}`
  for (const pt of normalizedPoints) {
    path += ` L ${pt.x} ${pt.y}`
  }
  path += ` L ${normalizedPoints[normalizedPoints.length - 1].x} ${baseY} Z`

  // Smooth curve using cubic bezier
  let curvePath = `M ${normalizedPoints[0].x} ${baseY}`
  curvePath += ` L ${normalizedPoints[0].x} ${normalizedPoints[0].y}`
  for (let i = 0; i < normalizedPoints.length - 1; i++) {
    const p0 = normalizedPoints[i]
    const p1 = normalizedPoints[i + 1]
    const cpx = (p0.x + p1.x) / 2
    curvePath += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`
  }
  curvePath += ` L ${normalizedPoints[normalizedPoints.length - 1].x} ${baseY} Z`

  // Stroke-only curve (no fill path)
  let strokePath = `M ${normalizedPoints[0].x} ${normalizedPoints[0].y}`
  for (let i = 0; i < normalizedPoints.length - 1; i++) {
    const p0 = normalizedPoints[i]
    const p1 = normalizedPoints[i + 1]
    const cpx = (p0.x + p1.x) / 2
    strokePath += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`
  }

  // User marker position
  const userX = userValue !== null ? toX(Math.max(xMin, Math.min(xMax, userValue))) : null
  // Find Y at user position by interpolating on curve
  let userY = baseY
  if (userX !== null) {
    for (let i = 0; i < normalizedPoints.length - 1; i++) {
      if (userX >= normalizedPoints[i].x && userX <= normalizedPoints[i + 1].x) {
        const frac = (userX - normalizedPoints[i].x) / (normalizedPoints[i + 1].x - normalizedPoints[i].x)
        userY = normalizedPoints[i].y + frac * (normalizedPoints[i + 1].y - normalizedPoints[i].y)
        break
      }
    }
  }

  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div style={{
      background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
      borderRadius: 12, padding: 24,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: "#1a1a18" }}>
          {label}
        </span>
        <span
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{
            width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.06)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: sans, fontSize: 9, color: "#8C8A82", cursor: "help",
            position: "relative",
          }}
        >
          i
          {showTooltip && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
              transform: "translateX(-50%)", background: "#1a1a18", color: "#fff",
              fontFamily: sans, fontSize: 11, lineHeight: 1.5, padding: "8px 12px",
              borderRadius: 6, whiteSpace: "nowrap", zIndex: 10,
            }}>
              {tooltip}
            </div>
          )}
        </span>
      </div>

      {/* SVG curve */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {/* Fill under curve */}
        <path
          d={curvePath} fill="rgba(196,154,60,0.08)" stroke="none"
          opacity={mounted ? 1 : 0}
          style={{ transition: "opacity 500ms ease" }}
        />
        {/* Stroke on curve */}
        <path
          d={strokePath} fill="none" stroke="rgba(196,154,60,0.4)"
          strokeWidth={1.5} strokeLinecap="round"
          opacity={mounted ? 1 : 0}
          style={{ transition: "opacity 500ms ease" }}
        />
        {/* Baseline */}
        <line x1={padL} y1={baseY} x2={padL + chartW} y2={baseY}
          stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />

        {/* Axis labels */}
        <text x={toX(table.p5)} y={baseY + 14} textAnchor="middle"
          fontFamily={sans} fontSize={9} fill="#bbb">
          {metricKey === "simpson" ? table.p5.toFixed(2) : metricKey === "shannon" ? table.p5.toFixed(1) : Math.round(table.p5)}
        </text>
        <text x={toX(table.p50)} y={baseY + 14} textAnchor="middle"
          fontFamily={sans} fontSize={9} fill="#8C8A82">
          {metricKey === "simpson" ? table.p50.toFixed(2) : metricKey === "shannon" ? table.p50.toFixed(1) : Math.round(table.p50)}
        </text>
        <text x={toX(table.p95)} y={baseY + 14} textAnchor="middle"
          fontFamily={sans} fontSize={9} fill="#bbb">
          {metricKey === "simpson" ? table.p95.toFixed(2) : metricKey === "shannon" ? table.p95.toFixed(1) : Math.round(table.p95)}
        </text>

        {/* Median marker */}
        <line x1={toX(table.p50)} y1={baseY} x2={toX(table.p50)} y2={baseY + 4}
          stroke="#8C8A82" strokeWidth={0.5} />

        {/* User marker */}
        {userX !== null && percentile !== null && (
          <g style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 400ms ease 300ms",
          }}>
            <line x1={userX} y1={baseY} x2={userX} y2={userY}
              stroke="#C49A3C" strokeWidth={2} />
            <circle cx={userX} cy={userY} r={4} fill="#C49A3C" />
            <text x={userX} y={userY - 10} textAnchor="middle"
              fontFamily={serif} fontSize={12} fill="#C49A3C">
              You · {percentile}th
            </text>
          </g>
        )}
      </svg>

      {/* Percentile bar */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          position: "relative", height: 6, borderRadius: 3,
          background: "rgba(0,0,0,0.06)",
        }}>
          {percentile !== null && (
            <div style={{
              position: "absolute", left: 0, top: 0, height: "100%",
              borderRadius: 3, background: "#C49A3C",
              width: `${percentile}%`,
              transition: "width 500ms ease",
            }} />
          )}
          {percentile !== null && (
            <div style={{
              position: "absolute",
              left: `${percentile}%`, top: -10,
              transform: "translateX(-50%)",
            }}>
              <div style={{
                width: 0, height: 0,
                borderLeft: "4px solid transparent", borderRight: "4px solid transparent",
                borderTop: "5px solid #C49A3C",
              }} />
            </div>
          )}
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", marginTop: 4,
        }}>
          <span style={{ fontFamily: sans, fontSize: 8, color: "#bbb" }}>0th</span>
          <span style={{ fontFamily: sans, fontSize: 8, color: "#8C8A82" }}>50th</span>
          <span style={{ fontFamily: sans, fontSize: 8, color: "#bbb" }}>100th</span>
        </div>
      </div>

      {/* Context text */}
      {userValue !== null && percentile !== null && (
        <p style={{
          fontFamily: sans, fontSize: 12, color: "#8C8A82",
          lineHeight: 1.5, marginTop: 12, marginBottom: 0,
        }}>
          The median is {metricKey === "simpson" ? table.p50.toFixed(3) : metricKey === "shannon" ? table.p50.toFixed(2) : Math.round(table.p50)}{unit ? ` ${unit}` : ""}.
          You are {percentile >= 50 ? "above" : "below"} {percentile >= 50 ? percentile : 100 - percentile}% of the population.
        </p>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  // Form state
  const [age, setAge] = useState("")
  const [sex, setSex] = useState<"male" | "female">("male")
  const [shannon, setShannon] = useState("")
  const [observedAsvs, setObservedAsvs] = useState("")
  const [simpson, setSimpson] = useState("")

  // Advanced genus inputs
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [veillonella, setVeillonella] = useState("")
  const [rothia, setRothia] = useState("")
  const [neisseria, setNeisseria] = useState("")
  const [porphyromonas, setPorphyromonas] = useState("")
  const [treponema, setTreponema] = useState("")
  const [fusobacterium, setFusobacterium] = useState("")

  // Results
  const [results, setResults] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [showViz, setShowViz] = useState(false)

  const hasAnyInput = shannon || observedAsvs || simpson || veillonella || rothia || neisseria || porphyromonas || treponema || fusobacterium

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = {}
      if (age) body.age = parseInt(age)
      body.sex = sex
      if (shannon) body.shannon = parseFloat(shannon)
      if (observedAsvs) body.observed_asvs = parseFloat(observedAsvs)
      if (simpson) body.simpson = parseFloat(simpson)
      if (veillonella) body.veillonella_pct = parseFloat(veillonella)
      if (rothia) body.rothia_pct = parseFloat(rothia)
      if (neisseria) body.neisseria_pct = parseFloat(neisseria)
      if (porphyromonas) body.porphyromonas_pct = parseFloat(porphyromonas)
      if (treponema) body.treponema_pct = parseFloat(treponema)
      if (fusobacterium) body.fusobacterium_pct = parseFloat(fusobacterium)

      if (hasAnyInput) {
        const res = await fetch("/api/nhanes/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (res.ok) setResults(await res.json())
      }
    } catch (e) {
      console.error("NHANES compare error:", e)
    } finally {
      setLoading(false)
      setShowViz(true)
    }
  }, [age, sex, shannon, observedAsvs, simpson, veillonella, rothia, neisseria, porphyromonas, treponema, fusobacterium, hasAnyInput])

  // Input component
  const NumInput = ({ label, value, onChange, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string
  }) => (
    <div style={{ flex: 1, minWidth: 140 }}>
      <label style={{ fontFamily: sans, fontSize: 11, color: "#8C8A82", display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <input
        type="number" step="any" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontFamily: sans, fontSize: 14, color: "#1a1a18",
          background: "#F6F4EF", border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: 6, padding: "10px 12px", width: "100%",
          outline: "none",
        }}
      />
    </div>
  )

  return (
    <div style={{ background: "#F6F4EF", minHeight: "100vh" }}>
      <Nav />

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{
            fontFamily: sans, fontSize: 9, letterSpacing: "2px",
            textTransform: "uppercase", color: "#C49A3C",
            display: "block", marginBottom: 16,
          }}>
            NHANES Oral Microbiome Reference
          </span>
          <h1 style={{
            fontFamily: serif, fontSize: 48, fontWeight: 300,
            color: "#1a1a18", lineHeight: 1.15, margin: "0 0 20px",
          }}>
            How does your oral microbiome compare to 9,660 Americans?
          </h1>
          <p style={{
            fontFamily: sans, fontSize: 14, color: "#8C8A82",
            lineHeight: 1.65, maxWidth: 560, margin: "0 auto 24px",
          }}>
            The CDC&rsquo;s NHANES dataset is the only nationally representative oral
            microbiome study in the United States. For the first time, you can see
            exactly where you stand.
          </p>
          <span style={{
            fontFamily: sans, fontSize: 9, color: "#8C8A82",
            background: "#F6F4EF", border: "0.5px solid rgba(0,0,0,0.08)",
            borderRadius: 20, padding: "5px 14px", display: "inline-block",
          }}>
            NHANES 2009-2012 · Lancet Microbe 2022 · JAMA Network Open 2025
          </span>
        </div>

        {/* ── INPUT PANEL ──────────────────────────────────────────────────── */}
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
          borderRadius: 16, padding: 32, marginBottom: 40,
        }}>
          {/* Profile */}
          <span style={{
            fontFamily: sans, fontSize: 9, letterSpacing: "2px",
            textTransform: "uppercase", color: "#bbb",
            display: "block", marginBottom: 16,
          }}>
            Your profile
          </span>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <NumInput label="Age" value={age} onChange={setAge} placeholder="e.g. 43" />
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontFamily: sans, fontSize: 11, color: "#8C8A82", display: "block", marginBottom: 4 }}>
                Sex
              </label>
              <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.1)" }}>
                {(["male", "female"] as const).map(s => (
                  <button key={s} onClick={() => setSex(s)} style={{
                    flex: 1, padding: "10px 0", fontFamily: sans, fontSize: 14,
                    border: "none", cursor: "pointer",
                    background: sex === s ? "#1a1a18" : "#F6F4EF",
                    color: sex === s ? "#fff" : "#8C8A82",
                    transition: "background 150ms ease, color 150ms ease",
                    textTransform: "capitalize",
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Diversity metrics */}
          <span style={{
            fontFamily: sans, fontSize: 9, letterSpacing: "2px",
            textTransform: "uppercase", color: "#bbb",
            display: "block", marginBottom: 4,
          }}>
            Enter your results (if you have them)
          </span>
          <span style={{
            fontFamily: sans, fontSize: 9, color: "#bbb",
            display: "block", marginBottom: 16,
          }}>
            Leave blank to see the population distribution
          </span>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <NumInput label="Shannon Index" value={shannon} onChange={setShannon} placeholder="e.g. 3.2" />
            <NumInput label="Observed ASVs" value={observedAsvs} onChange={setObservedAsvs} placeholder="e.g. 180" />
            <NumInput label="Simpson Index" value={simpson} onChange={setSimpson} placeholder="e.g. 0.94" />
          </div>

          {/* Advanced genus inputs */}
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            style={{
              fontFamily: sans, fontSize: 11, color: "#8C8A82",
              background: "none", border: "none", cursor: "pointer",
              padding: 0, display: "flex", alignItems: "center", gap: 6,
              marginBottom: advancedOpen ? 16 : 0,
            }}
          >
            <span style={{
              fontSize: 8, transform: advancedOpen ? "rotate(90deg)" : "none",
              transition: "transform 150ms ease", display: "inline-block",
            }}>
              ▶
            </span>
            Advanced: Enter genus abundances
          </button>
          {advancedOpen && (
            <div>
              <span style={{
                fontFamily: sans, fontSize: 9, letterSpacing: "2px",
                textTransform: "uppercase", color: "#3B6D11",
                display: "block", marginBottom: 12,
              }}>
                Protective bacteria (% relative abundance)
              </span>
              <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                <NumInput label="Veillonella" value={veillonella} onChange={setVeillonella} placeholder="e.g. 5.5" />
                <NumInput label="Rothia" value={rothia} onChange={setRothia} placeholder="e.g. 9.1" />
                <NumInput label="Neisseria" value={neisseria} onChange={setNeisseria} placeholder="e.g. 1.5" />
              </div>
              <span style={{
                fontFamily: sans, fontSize: 9, letterSpacing: "2px",
                textTransform: "uppercase", color: "#A32D2D",
                display: "block", marginBottom: 12,
              }}>
                Periodontal pathogens (% relative abundance)
              </span>
              <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                <NumInput label="Porphyromonas" value={porphyromonas} onChange={setPorphyromonas} placeholder="e.g. 1.2" />
                <NumInput label="Treponema" value={treponema} onChange={setTreponema} placeholder="e.g. 0.01" />
                <NumInput label="Fusobacterium" value={fusobacterium} onChange={setFusobacterium} placeholder="e.g. 2.2" />
              </div>
              <span style={{ fontFamily: sans, fontSize: 9, color: "#bbb", fontStyle: "italic" }}>
                Found in your Zymo report under genus-level relative abundance
              </span>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", marginTop: 24, padding: "14px 0",
              background: loading ? "#8C8A82" : "#C49A3C",
              color: "#fff", fontFamily: sans, fontSize: 9,
              letterSpacing: "1.5px", textTransform: "uppercase",
              border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer",
              transition: "background 150ms ease",
            }}
          >
            {loading ? "Analyzing..." : "See how you compare →"}
          </button>
        </div>

        {/* ── VISUALIZATION ────────────────────────────────────────────────── */}
        {showViz && (
          <div style={{ marginBottom: 48 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
            }}>
              <DistributionCurve
                metricKey="shannon" label="Shannon Diversity"
                tooltip="Measures the richness and evenness of bacterial species"
                userValue={shannon ? parseFloat(shannon) : null}
              />
              <DistributionCurve
                metricKey="observed_asvs" label="Observed ASVs"
                tooltip="Number of unique amplicon sequence variants detected"
                userValue={observedAsvs ? parseFloat(observedAsvs) : null}
                unit="ASVs"
              />
              <DistributionCurve
                metricKey="simpson" label="Simpson Diversity"
                tooltip="Probability that two randomly chosen sequences belong to different species"
                userValue={simpson ? parseFloat(simpson) : null}
              />
              {/* Summary card in 4th position */}
              {results ? (
                <div style={{
                  background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
                  borderRadius: 12, padding: 24,
                  display: "flex", flexDirection: "column", justifyContent: "center",
                }}>
                  <span style={{
                    fontFamily: sans, fontSize: 9, letterSpacing: "2px",
                    textTransform: "uppercase", color: "#C49A3C",
                    display: "block", marginBottom: 12,
                  }}>
                    Your snapshot
                  </span>
                  <div style={{
                    fontFamily: serif, fontSize: 48, fontWeight: 300,
                    color: "#C49A3C", lineHeight: 1, marginBottom: 8,
                  }}>
                    {(results as { overall_percentile?: number }).overall_percentile ?? "—"}
                    <span style={{ fontSize: 14, fontFamily: sans, color: "#bbb", marginLeft: 4 }}>th</span>
                  </div>
                  <p style={{
                    fontFamily: sans, fontSize: 12, color: "#8C8A82",
                    lineHeight: 1.5, margin: "0 0 16px",
                  }}>
                    {(results as { summary?: string }).summary}
                  </p>
                  <span style={{
                    fontFamily: sans, fontSize: 9, color: "#bbb",
                  }}>
                    Compared to {((results as { n_reference?: number }).n_reference ?? 9660).toLocaleString()} Americans · {(results as { age_sex_group?: string }).age_sex_group}
                  </span>
                </div>
              ) : (
                <div style={{
                  background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
                  borderRadius: 12, padding: 24,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  textAlign: "center",
                }}>
                  <p style={{
                    fontFamily: sans, fontSize: 13, color: "#8C8A82",
                    lineHeight: 1.5, margin: "0 0 16px",
                  }}>
                    Enter your diversity metrics to see where you stand against the US population.
                  </p>
                  <Link href="/shop" style={{
                    fontFamily: sans, fontSize: 9, color: "#C49A3C",
                    letterSpacing: "1.5px", textTransform: "uppercase",
                    textDecoration: "none",
                  }}>
                    Order your Zymo kit →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WHAT THIS MEANS ─────────────────────────────────────────────── */}
        {results && (
          <div style={{
            background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
            borderRadius: 12, padding: 24, marginBottom: 48,
          }}>
            <span style={{
              fontFamily: sans, fontSize: 9, letterSpacing: "2px",
              textTransform: "uppercase", color: "#bbb",
              display: "block", marginBottom: 16,
            }}>
              Your oral microbiome snapshot
            </span>
            {Object.entries((results as { metrics?: Record<string, { value: number; percentile: number; interpretation: string }> }).metrics ?? {}).map(([key, m]) => (
              <div key={key} style={{
                padding: "10px 0",
                borderBottom: "0.5px solid rgba(0,0,0,0.04)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontFamily: sans, fontSize: 12, color: "#1a1a18", textTransform: "capitalize" }}>
                  {key.replace(/_/g, " ")}
                </span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: serif, fontSize: 16, color: "#C49A3C" }}>
                    {m.percentile}th
                  </span>
                  <span style={{ fontFamily: sans, fontSize: 10, color: "#bbb", marginLeft: 8 }}>
                    ({typeof m.value === "number" ? (m.value < 1 ? m.value.toFixed(3) : m.value.toFixed(1)) : m.value})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── NO DATA — population summary ────────────────────────────────── */}
        {showViz && !hasAnyInput && (
          <div style={{
            background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
            borderRadius: 12, padding: 24, marginBottom: 48,
            textAlign: "center",
          }}>
            <p style={{ fontFamily: sans, fontSize: 13, color: "#8C8A82", lineHeight: 1.6, margin: "0 0 8px" }}>
              For US adults, the typical oral microbiome:
            </p>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
              {([
                ["Shannon", "4.66"],
                ["ASVs", "128"],
                ["Simpson", "0.916"],
              ] as const).map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontFamily: serif, fontSize: 24, color: "#1a1a18" }}>{val}</div>
                  <div style={{ fontFamily: sans, fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
                </div>
              ))}
            </div>
            <Link href="/shop" style={{
              display: "inline-block", padding: "10px 24px",
              background: "#C49A3C", color: "#fff",
              fontFamily: sans, fontSize: 9, letterSpacing: "1.5px",
              textTransform: "uppercase", textDecoration: "none",
              borderRadius: 6,
            }}>
              Order your Zymo kit to see where you stand →
            </Link>
          </div>
        )}
      </main>

      {/* ── SCIENCE FOOTER ─────────────────────────────────────────────────── */}
      <div style={{ background: "#16150F", padding: "48px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: serif, fontSize: 28, fontWeight: 300,
            color: "#fff", marginBottom: 32,
          }}>
            How this works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
            {[
              {
                title: "The dataset",
                body: "NHANES 2009-2012 · 9,660 US adults · Nationally representative · Mortality outcomes tracked via National Death Index",
                cite: "Chaturvedi AK et al. JAMA Network Open 2025",
              },
              {
                title: "The method",
                body: "16S rRNA V4 region · Same sequencing approach as Zymo Research · DADA2 pipeline · SILVA v123 taxonomy database",
                cite: "Vogtmann E et al. Lancet Microbe 2022",
              },
              {
                title: "Why it matters",
                body: "Higher oral diversity is associated with lower all-cause mortality (HR=0.63, 9-year follow-up, n=7,055).",
                cite: "Shen et al. J Clin Periodontol 2024",
              },
            ].map((col) => (
              <div key={col.title}>
                <div style={{
                  fontFamily: sans, fontSize: 9, letterSpacing: "2px",
                  textTransform: "uppercase", color: "#C49A3C",
                  marginBottom: 12,
                }}>
                  {col.title}
                </div>
                <p style={{
                  fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.6, margin: "0 0 12px",
                }}>
                  {col.body}
                </p>
                <span style={{ fontFamily: sans, fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                  {col.cite}
                </span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link href="/signup" style={{
              display: "inline-block", padding: "12px 32px",
              background: "#C49A3C", color: "#fff",
              fontFamily: sans, fontSize: 9, letterSpacing: "1.5px",
              textTransform: "uppercase", textDecoration: "none",
              borderRadius: 6,
            }}>
              Start with Peaq →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .explore-viz-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

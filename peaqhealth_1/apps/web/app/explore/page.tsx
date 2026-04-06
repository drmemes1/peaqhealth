"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Nav } from "../components/nav"
import { FindingsExplorer } from "./findings-explorer"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "-apple-system, BlinkMacSystemFont, sans-serif"

// ── Embedded NHANES percentile tables (from nhanes_oral_reference.json) ──────

const NHANES_OVERALL: Record<string, Record<string, number>> = {
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
}

// ── Percentile interpolation ────────────────────────────────────────────────

function findPercentile(value: number, table: Record<string, number>): number {
  const keys = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]
  const entries = keys.map(p => ({ pct: p, val: table[`p${p}`] }))
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

// ── Distribution curve SVG ──────────────────────────────────────────────────

function DistributionPanel({
  label, tooltip, metricKey, userValue, formatVal,
}: {
  label: string; tooltip: string; metricKey: string; userValue: number | null; formatVal?: (v: number) => string
}) {
  const table = NHANES_OVERALL[metricKey]
  if (!table) return null
  const fmt = formatVal ?? ((v: number) => v < 1 ? v.toFixed(3) : v < 10 ? v.toFixed(1) : String(Math.round(v)))
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t) }, [])
  const [tipOpen, setTipOpen] = useState(false)

  const pct = userValue !== null ? findPercentile(userValue, table) : null

  const W = 300, H = 100, padT = 10, padB = 18
  const chartH = H - padT - padB
  const keys = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]
  const xMin = table.p5 * 0.92, xMax = table.p95 * 1.04
  const toX = (v: number) => ((v - xMin) / (xMax - xMin)) * W

  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < keys.length - 1; i++) {
    const v1 = table[`p${keys[i]}`], v2 = table[`p${keys[i + 1]}`]
    const spacing = v2 - v1
    pts.push({ x: toX((v1 + v2) / 2), y: spacing > 0 ? 5 / spacing : 0 })
  }
  const maxD = Math.max(...pts.map(p => p.y))
  const norm = pts.map(p => ({ x: p.x, y: padT + chartH - (p.y / maxD) * chartH * 0.85 }))
  const baseY = padT + chartH

  let fill = `M ${norm[0].x} ${baseY} L ${norm[0].x} ${norm[0].y}`
  let stroke = `M ${norm[0].x} ${norm[0].y}`
  for (let i = 0; i < norm.length - 1; i++) {
    const cpx = (norm[i].x + norm[i + 1].x) / 2
    fill += ` C ${cpx} ${norm[i].y}, ${cpx} ${norm[i + 1].y}, ${norm[i + 1].x} ${norm[i + 1].y}`
    stroke += ` C ${cpx} ${norm[i].y}, ${cpx} ${norm[i + 1].y}, ${norm[i + 1].x} ${norm[i + 1].y}`
  }
  fill += ` L ${norm[norm.length - 1].x} ${baseY} Z`

  let userX = 0, userY = baseY
  if (userValue !== null) {
    userX = toX(Math.max(xMin, Math.min(xMax, userValue)))
    for (let i = 0; i < norm.length - 1; i++) {
      if (userX >= norm[i].x && userX <= norm[i + 1].x) {
        const f = (userX - norm[i].x) / (norm[i + 1].x - norm[i].x)
        userY = norm[i].y + f * (norm[i + 1].y - norm[i].y)
        break
      }
    }
  }

  return (
    <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: "#1a1a18" }}>{label}</span>
          <span
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            style={{
              width: 15, height: 15, borderRadius: "50%", background: "rgba(0,0,0,0.05)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: sans, fontSize: 8, color: "#8C8A82", cursor: "help", position: "relative",
            }}
          >
            i
            {tipOpen && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
                transform: "translateX(-50%)", background: "#1a1a18", color: "#fff",
                fontFamily: sans, fontSize: 10, lineHeight: 1.5, padding: "6px 10px",
                borderRadius: 4, whiteSpace: "nowrap", zIndex: 10, maxWidth: 260,
              }}>
                {tooltip}
              </div>
            )}
          </span>
        </div>
        {pct !== null && (
          <span style={{
            fontFamily: sans, fontSize: 8, textTransform: "uppercase", letterSpacing: "0.5px",
            background: "rgba(196,154,60,0.08)", color: "#C49A3C", borderRadius: 4, padding: "2px 8px",
          }}>
            {pct}th percentile
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <path d={fill} fill="rgba(196,154,60,0.08)" opacity={mounted ? 1 : 0} style={{ transition: "opacity 500ms ease" }} />
        <path d={stroke} fill="none" stroke="rgba(196,154,60,0.35)" strokeWidth={1.5} opacity={mounted ? 1 : 0} style={{ transition: "opacity 500ms ease" }} />
        <line x1={0} y1={baseY} x2={W} y2={baseY} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
        <text x={toX(table.p10)} y={baseY + 12} textAnchor="middle" fontFamily={sans} fontSize={7} fill="#bbb">Low</text>
        <text x={toX(table.p50)} y={baseY + 12} textAnchor="middle" fontFamily={sans} fontSize={7} fill="#8C8A82">Median</text>
        <text x={toX(table.p90)} y={baseY + 12} textAnchor="middle" fontFamily={sans} fontSize={7} fill="#bbb">High</text>
        <text x={toX(table.p10)} y={baseY + 18} textAnchor="middle" fontFamily={sans} fontSize={6} fill="#ccc">{fmt(table.p10)}</text>
        <text x={toX(table.p50)} y={baseY + 18} textAnchor="middle" fontFamily={sans} fontSize={6} fill="#aaa">{fmt(table.p50)}</text>
        <text x={toX(table.p90)} y={baseY + 18} textAnchor="middle" fontFamily={sans} fontSize={6} fill="#ccc">{fmt(table.p90)}</text>
        {userValue !== null && pct !== null && mounted && (
          <g opacity={1} style={{ transition: "opacity 400ms ease 300ms" }}>
            <line x1={userX} y1={baseY} x2={userX} y2={userY} stroke="#C49A3C" strokeWidth={1.5} />
            <circle cx={userX} cy={userY} r={3} fill="#C49A3C" />
            <text x={userX} y={userY - 8} textAnchor="middle" fontFamily={serif} fontSize={9} fontStyle="italic" fill="#C49A3C">
              You &middot; {pct}th
            </text>
          </g>
        )}
      </svg>
      <div style={{ marginTop: 12 }}>
        <div style={{ position: "relative", height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)" }}>
          {pct !== null && (
            <>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 2, background: "#C49A3C", width: `${pct}%`, transition: "width 600ms ease" }} />
              <div style={{ position: "absolute", left: `${pct}%`, top: -8, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "3px solid transparent", borderRight: "3px solid transparent", borderTop: "4px solid #C49A3C" }} />
              <span style={{ position: "absolute", left: `${pct}%`, top: -16, transform: "translateX(-50%)", fontFamily: sans, fontSize: 7, color: "#C49A3C" }}>You</span>
            </>
          )}
        </div>
      </div>
      {userValue !== null && pct !== null && (
        <p style={{ fontFamily: sans, fontSize: 11, color: "#8C8A82", lineHeight: 1.5, marginTop: 10, marginBottom: 0 }}>
          The median is {fmt(table.p50)}. You are {pct >= 50 ? "above" : "below"} {pct >= 50 ? pct : 100 - pct}% of the population.
        </p>
      )}
    </div>
  )
}

// ── Reusable input ──────────────────────────────────────────────────────────

function LabeledInput({ label, value, onChange, placeholder, note }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; note?: string
}) {
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <label style={{ fontFamily: sans, fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>{label}</label>
      <input
        type="number" step="any" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontFamily: sans, fontSize: 14, color: "#1a1a18",
          background: "#F6F4EF", border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: 6, padding: "10px 12px", width: "100%", outline: "none",
        }}
      />
      {note && <p style={{ fontFamily: sans, fontSize: 10, color: "#bbb", margin: "4px 0 0", lineHeight: 1.4 }}>{note}</p>}
    </div>
  )
}

// ── Types for API response ──────────────────────────────────────────────────

interface APIMetric {
  value: number; percentile: number; score: number
  population_median: number; population_p25?: number; population_p75?: number; interpretation: string
}

interface APIResponse {
  overall_score: number; overall_percentile: number
  metrics: Record<string, APIMetric>
  n_reference: number; age_sex_group: string; stratified: boolean; summary: string
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [age, setAge] = useState("")
  const [sex, setSex] = useState<"male" | "female">("male")
  const [shannon, setShannon] = useState("")
  const [observedAsvs, setObservedAsvs] = useState("")
  const [simpson, setSimpson] = useState("")

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [veillonella, setVeillonella] = useState("")
  const [rothia, setRothia] = useState("")
  const [neisseria, setNeisseria] = useState("")
  const [porphyromonas, setPorphyromonas] = useState("")
  const [treponema, setTreponema] = useState("")
  const [fusobacterium, setFusobacterium] = useState("")

  const [results, setResults] = useState<APIResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showViz, setShowViz] = useState(false)

  const hasAnyInput = !!(shannon || observedAsvs || simpson || veillonella || rothia || neisseria || porphyromonas || treponema || fusobacterium)

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    setShowViz(true)
    if (!hasAnyInput) { setLoading(false); return }
    try {
      const body: Record<string, unknown> = { sex, source: "zymo_raw" }
      if (age) body.age = parseInt(age)
      if (shannon) body.shannon = parseFloat(shannon)
      if (observedAsvs) body.observed_asvs = parseFloat(observedAsvs)
      if (simpson) body.simpson = parseFloat(simpson)
      if (veillonella) body.veillonella_pct = parseFloat(veillonella)
      if (rothia) body.rothia_pct = parseFloat(rothia)
      if (neisseria) body.neisseria_pct = parseFloat(neisseria)
      if (porphyromonas) body.porphyromonas_pct = parseFloat(porphyromonas)
      if (treponema) body.treponema_pct = parseFloat(treponema)
      if (fusobacterium) body.fusobacterium_pct = parseFloat(fusobacterium)

      const res = await fetch("/api/nhanes/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) setResults(await res.json())
    } catch (e) { console.error("NHANES compare error:", e) }
    finally { setLoading(false) }
  }, [age, sex, shannon, observedAsvs, simpson, veillonella, rothia, neisseria, porphyromonas, treponema, fusobacterium, hasAnyInput])

  const pctColor = (p: number) => p >= 75 ? "#3B6D11" : p >= 25 ? "#C49A3C" : "#A32D2D"

  return (
    <div style={{ background: "#F6F4EF", minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — HERO
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ textAlign: "center", padding: "80px 0 48px" }}>
          <span style={{
            fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#C49A3C", display: "block", marginBottom: 16,
          }}>
            CDC NHANES Study · 9,660 Americans
          </span>
          <h1 style={{
            fontFamily: serif, fontSize: 44, fontWeight: 300,
            color: "#1A1917", lineHeight: 1.15, margin: "0 0 16px",
          }}>
            What your mouth bacteria<br />predict about your blood
          </h1>
          <p style={{
            fontFamily: sans, fontSize: 16, color: "#6B6960",
            lineHeight: 1.6, maxWidth: 520, margin: "0 auto 32px",
          }}>
            We ran every genus of oral bacteria against every blood marker in the
            CDC&rsquo;s national dataset. Specific bacteria showed consistent signals.
            Overall diversity showed none.
          </p>

          {/* Stat cards */}
          <div className="stat-cards" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16, maxWidth: 640, margin: "0 auto",
          }}>
            {[
              { num: "9,848", label: "Americans with oral + blood data", sub: null },
              { num: "28", label: "Significant bacteria\u2013marker pairs", sub: "out of 60 tested" },
              { num: "0", label: "Shannon diversity correlations", sub: "with any blood marker" },
            ].map(c => (
              <div key={c.num} style={{
                background: "#fff", borderRadius: 12,
                padding: "20px 24px", border: "0.5px solid rgba(0,0,0,0.06)",
              }}>
                <div style={{ fontFamily: serif, fontSize: 32, color: "#1A1917", lineHeight: 1, marginBottom: 6 }}>{c.num}</div>
                <div style={{ fontFamily: sans, fontSize: 12, color: "#6B6960", lineHeight: 1.4 }}>{c.label}</div>
                {c.sub && <div style={{ fontFamily: sans, fontSize: 11, color: "#9E9C93", marginTop: 2 }}>{c.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — INTERACTIVE FINDINGS
            ═══════════════════════════════════════════════════════════════════ */}
        <FindingsExplorer />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — HOW YOU COMPARE
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
          borderRadius: 16, padding: 32, marginBottom: 32,
        }}>
          <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#C49A3C", display: "block", marginBottom: 8 }}>
            Compare yourself
          </span>
          <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 300, color: "#1A1917", margin: "0 0 8px", lineHeight: 1.2 }}>
            Where do you stand in the study?
          </h2>
          <p style={{ fontFamily: sans, fontSize: 14, color: "#6B6960", lineHeight: 1.6, maxWidth: 480, margin: "0 0 24px" }}>
            Enter your results from your Zymo report to see how your oral diversity
            compares to Americans your age and sex.
          </p>

          {/* Profile inputs */}
          <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#bbb", display: "block", marginBottom: 16 }}>
            Your profile
          </span>
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <LabeledInput label="Age" value={age} onChange={setAge} placeholder="e.g. 43" />
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontFamily: sans, fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>Sex</label>
              <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.1)" }}>
                {(["male", "female"] as const).map(s => (
                  <button key={s} onClick={() => setSex(s)} style={{
                    flex: 1, padding: "10px 0", fontFamily: sans, fontSize: 10,
                    textTransform: "uppercase", border: "none", cursor: "pointer",
                    background: sex === s ? "#1a1a18" : "rgba(0,0,0,0.05)",
                    color: sex === s ? "#fff" : "#555",
                    transition: "background 150ms ease, color 150ms ease",
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ height: "0.5px", background: "rgba(0,0,0,0.06)", margin: "20px 0" }} />

          <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#bbb", display: "block", marginBottom: 4 }}>
            Your results (optional)
          </span>
          <span style={{ fontFamily: sans, fontSize: 10, color: "#bbb", display: "block", marginBottom: 16 }}>
            Leave blank to see the population distribution
          </span>
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <LabeledInput label="Shannon Index" value={shannon} onChange={setShannon} placeholder="e.g. 3.4"
              note="Zymo reports typically show 2.0-4.0. We automatically adjust for comparison with the CDC reference population." />
            <LabeledInput label="Observed ASVs" value={observedAsvs} onChange={setObservedAsvs} placeholder="e.g. 180"
              note="Number of unique bacterial variants detected." />
            <LabeledInput label="Simpson Index" value={simpson} onChange={setSimpson} placeholder="e.g. 0.94"
              note="Simpson diversity from your Zymo report. Range 0-1, higher = more diverse." />
          </div>

          {/* Advanced genus inputs */}
          <button onClick={() => setAdvancedOpen(!advancedOpen)} style={{
            fontFamily: sans, fontSize: 11, color: "#8C8A82", background: "none",
            border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6,
            marginBottom: advancedOpen ? 16 : 0,
          }}>
            <span style={{ fontSize: 8, transform: advancedOpen ? "rotate(90deg)" : "none", transition: "transform 150ms ease", display: "inline-block" }}>▶</span>
            Enter your genus data (from Zymo report)
          </button>
          {advancedOpen && (
            <div>
              <p style={{ fontFamily: sans, fontSize: 10, color: "#bbb", margin: "0 0 12px" }}>
                Enter % relative abundance from your Zymo genus-level report
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#3B6D11", display: "block", marginBottom: 10 }}>Protective bacteria</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <LabeledInput label="Veillonella %" value={veillonella} onChange={setVeillonella} placeholder="e.g. 8.2" />
                    <LabeledInput label="Rothia %" value={rothia} onChange={setRothia} placeholder="e.g. 5.1" />
                    <LabeledInput label="Neisseria %" value={neisseria} onChange={setNeisseria} placeholder="e.g. 3.4" />
                  </div>
                </div>
                <div>
                  <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#A32D2D", display: "block", marginBottom: 10 }}>Periodontal pathogens</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <LabeledInput label="Porphyromonas %" value={porphyromonas} onChange={setPorphyromonas} placeholder="e.g. 0.8" />
                    <LabeledInput label="Treponema %" value={treponema} onChange={setTreponema} placeholder="e.g. 0.3" />
                    <LabeledInput label="Fusobacterium %" value={fusobacterium} onChange={setFusobacterium} placeholder="e.g. 1.2" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{
            width: "100%", marginTop: 24, padding: "14px 0",
            background: loading ? "#8C8A82" : "#C49A3C", color: "#fff",
            fontFamily: sans, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase",
            border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer",
            transition: "opacity 150ms ease",
          }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = "0.88" }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1" }}
            onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.98)" }}
            onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = "" }}
          >
            {loading ? "Analyzing..." : "See how you compare \u2192"}
          </button>
        </div>

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        {showViz && (
          <div style={{ animation: "fadeUp 0.5s ease forwards", opacity: 0 }}>
            {results && (
              <div style={{
                background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
                borderRadius: 12, padding: "20px 24px", marginBottom: 24,
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
              }}>
                <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#bbb" }}>
                  Your oral microbiome
                </span>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: serif, fontSize: 52, fontWeight: 300, color: pctColor(results.overall_percentile), lineHeight: 1 }}>
                    {results.overall_percentile}<span style={{ fontSize: 14, fontFamily: sans, color: "#bbb", marginLeft: 2 }}>th</span>
                  </div>
                  <span style={{ fontFamily: sans, fontSize: 9, color: "#8C8A82" }}>percentile</span>
                  <br />
                  <span style={{ fontFamily: sans, fontSize: 9, color: "#bbb" }}>
                    compared to {results.n_reference.toLocaleString()} US adults
                    {results.stratified ? ` \u00b7 ${results.age_sex_group}` : ""}
                  </span>
                </div>
                <span style={{
                  fontFamily: sans, fontSize: 8, textTransform: "uppercase", letterSpacing: "1px",
                  padding: "3px 8px", borderRadius: 4,
                  background: Object.keys(results.metrics).length >= 3 ? "rgba(59,109,17,0.08)" : "rgba(196,154,60,0.08)",
                  color: Object.keys(results.metrics).length >= 3 ? "#3B6D11" : "#C49A3C",
                }}>
                  {Object.keys(results.metrics).length >= 3 ? "High confidence" : "Moderate confidence"}
                </span>
              </div>
            )}

            <div className="compare-panels" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div>
                <DistributionPanel metricKey="shannon" label="Shannon Diversity" userValue={shannon ? parseFloat(shannon) : null}
                  tooltip="Richness and evenness of bacterial species" formatVal={v => v.toFixed(1)} />
                {shannon && (
                  <p style={{ fontFamily: sans, fontSize: 9, color: "#bbb", fontStyle: "italic", margin: "6px 0 0", lineHeight: 1.4 }}>
                    Your diversity score has been adjusted for comparison with the CDC study (which uses higher-depth sequencing). The comparison is directionally accurate.
                  </p>
                )}
              </div>
              <DistributionPanel metricKey="observed_asvs" label="Observed ASVs" userValue={observedAsvs ? parseFloat(observedAsvs) : null}
                tooltip="Number of unique amplicon sequence variants" formatVal={v => String(Math.round(v))} />
              <DistributionPanel metricKey="simpson" label="Simpson Diversity" userValue={simpson ? parseFloat(simpson) : null}
                tooltip="Probability two random sequences are different species. Higher = more diverse." formatVal={v => v.toFixed(3)} />
              {results ? (
                <div style={{
                  background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
                  borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", justifyContent: "center",
                }}>
                  <p style={{ fontFamily: sans, fontSize: 12, color: "#8C8A82", lineHeight: 1.6, margin: "0 0 12px" }}>{results.summary}</p>
                  {results.stratified && <span style={{ fontFamily: sans, fontSize: 9, color: "#C49A3C" }}>Stratified by {results.age_sex_group}</span>}
                </div>
              ) : (
                <div style={{
                  background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)",
                  borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
                }}>
                  <p style={{ fontFamily: sans, fontSize: 12, color: "#8C8A82", lineHeight: 1.5, margin: "0 0 12px" }}>Enter your diversity metrics to see where you stand.</p>
                  <Link href="/shop" style={{ fontFamily: sans, fontSize: 9, color: "#C49A3C", letterSpacing: "1.5px", textTransform: "uppercase", textDecoration: "none" }}>Order your Zymo kit &rarr;</Link>
                </div>
              )}
            </div>

            {results && (
              <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 300, color: "#1a1a18", margin: "0 0 16px" }}>Your oral microbiome snapshot</h3>
                {Object.entries(results.metrics).map(([key, m]) => (
                  <div key={key} style={{ padding: "8px 0", borderBottom: "0.5px solid rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontFamily: sans, fontSize: 11, color: "#555", textTransform: "capitalize", flex: 1 }}>{key.replace(/_/g, " ")}</span>
                    <span style={{ fontFamily: sans, fontSize: 11, color: "#1a1a18", fontWeight: 600 }}>{m.value < 1 ? m.value.toFixed(3) : m.value < 10 ? m.value.toFixed(1) : Math.round(m.value)}</span>
                    <span style={{ fontFamily: sans, fontSize: 8, textTransform: "uppercase", letterSpacing: "0.5px", padding: "2px 6px", borderRadius: 3, background: `${pctColor(m.percentile)}12`, color: pctColor(m.percentile) }}>{m.percentile}th</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, padding: "12px 0 0", borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: results.overall_percentile >= 60 ? "#3B6D11" : results.overall_percentile >= 40 ? "#C49A3C" : "#A32D2D" }} />
                  <span style={{ fontFamily: sans, fontSize: 12, color: "#1a1a18", lineHeight: 1.5 }}>
                    {results.overall_percentile >= 60 ? "Your oral diversity is stronger than most Americans your age."
                      : results.overall_percentile >= 40 ? "Your oral diversity is near the median for US adults."
                        : "Your oral diversity has room to grow. This is one of the most actionable signals in your biology."}
                  </span>
                </div>
                <div style={{ background: "#16150F", borderRadius: 10, padding: 20, marginTop: 20 }}>
                  <p style={{ fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, margin: "0 0 4px" }}>See how your oral score connects to your blood and sleep panels.</p>
                  <p style={{ fontFamily: sans, fontSize: 10, color: "rgba(255,255,255,0.4)", margin: "0 0 12px" }}>The oral panel is one of three signals in your Peaq Resilience Index.</p>
                  <Link href="/shop" style={{ display: "inline-block", padding: "8px 20px", background: "#C49A3C", color: "#fff", borderRadius: 6, fontFamily: sans, fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", textDecoration: "none" }}>Start with Peaq &rarr;</Link>
                </div>
              </div>
            )}

            {!hasAnyInput && (
              <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: 24, marginBottom: 24, textAlign: "center" }}>
                <p style={{ fontFamily: sans, fontSize: 13, color: "#8C8A82", lineHeight: 1.6, margin: "0 0 16px" }}>For US adults, the typical oral microbiome looks like this:</p>
                <div style={{ display: "flex", gap: 32, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
                  {([["Shannon", "4.66"], ["Observed ASVs", "128"], ["Veillonella", "99% have it"]] as const).map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontFamily: serif, fontSize: 24, color: "#1a1a18" }}>{v}</div>
                      <div style={{ fontFamily: sans, fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "1px" }}>{l}</div>
                    </div>
                  ))}
                </div>
                <Link href="/shop" style={{ display: "inline-block", padding: "10px 24px", background: "#C49A3C", color: "#fff", borderRadius: 6, fontFamily: sans, fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", textDecoration: "none" }}>
                  Order your oral kit to see where you stand &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 — METHODOLOGY
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: "#fff", borderRadius: 16,
          padding: 32, marginBottom: 80,
        }}>
          <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#C49A3C", display: "block", marginBottom: 20 }}>
            Methodology
          </span>

          <div className="method-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[
              { title: "The study", body: "The CDC\u2019s National Health and Nutrition Examination Survey (NHANES) 2009\u20132012 sequenced the mouth bacteria of 9,660 Americans using 16S rRNA DNA sequencing. It is the largest nationally representative oral microbiome study in the US. The full genus-level data was publicly released in November 2024." },
              { title: "Our analysis", body: "We linked the oral microbiome data to NHANES blood marker files for 9,848 participants with both datasets. We tested correlations between 10 pre-specified bacterial genera and 7 blood marker categories \u2014 inflammation, lipids, glucose, blood pressure, and HbA1c. This specific analysis has not been previously published." },
              { title: "Honest framing", body: "NHANES used oral rinse collection; your Zymo kit uses a swab. Both use the same sequencing technology. Comparisons are directionally accurate. NHANES data is genus-level only \u2014 species-level detail was not possible due to NCHS policy. Effect sizes are small (r\u00a0=\u00a00.03\u20130.09). These are population associations, not individual predictors." },
            ].map(c => (
              <div key={c.title}>
                <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: "#1A1917", marginBottom: 8 }}>{c.title}</div>
                <p style={{ fontFamily: sans, fontSize: 12, color: "#6B6960", lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>

          <p style={{
            fontFamily: sans, fontSize: 11, color: "#9E9C93",
            lineHeight: 1.6, marginTop: 24, paddingTop: 16,
            borderTop: "0.5px solid rgba(0,0,0,0.06)",
          }}>
            Analysis: Peaq Health, April 2026 &middot; Dataset: NHANES 2009&ndash;2012, genus-level
            16S rRNA V4 sequencing (DADA2-RB pipeline) linked to NHANES laboratory files &middot;
            Spearman rank correlations on log-transformed genus relative abundances &middot;
            * p&lt;0.05 ** p&lt;0.01 *** p&lt;0.001
          </p>
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          .stat-cards { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .method-cols { grid-template-columns: 1fr !important; gap: 20px !important; }
          .compare-panels { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

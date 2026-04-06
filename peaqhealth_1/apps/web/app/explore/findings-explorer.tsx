"use client"

import { useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "-apple-system, BlinkMacSystemFont, sans-serif"

type Finding = {
  genus: string
  marker: string
  r: number
  p: string
  type: "prot" | "path"
}

const FINDINGS: Finding[] = [
  // Protective
  { genus: "Haemophilus", marker: "HbA1c",           r: -0.074, p: "9\u00d710\u207b\u00b9\u00b3", type: "prot" },
  { genus: "Haemophilus", marker: "Triglycerides",    r: -0.094, p: "3\u00d710\u207b\u00b9\u2070", type: "prot" },
  { genus: "Haemophilus", marker: "Systolic BP",      r: -0.047, p: "5\u00d710\u207b\u2076",       type: "prot" },
  { genus: "Haemophilus", marker: "Diastolic BP",     r: -0.030, p: "0.003",                        type: "prot" },
  { genus: "Haemophilus", marker: "HDL",              r: +0.040, p: "1\u00d710\u207b\u2074",       type: "prot" },
  { genus: "Neisseria",   marker: "Systolic BP",      r: -0.061, p: "2\u00d710\u207b\u2079",       type: "prot" },
  { genus: "Neisseria",   marker: "Diastolic BP",     r: -0.048, p: "4\u00d710\u207b\u2076",       type: "prot" },
  { genus: "Neisseria",   marker: "Triglycerides",    r: -0.058, p: "1\u00d710\u207b\u2074",       type: "prot" },
  { genus: "Neisseria",   marker: "hsCRP",            r: -0.051, p: "5\u00d710\u207b\u2074",       type: "prot" },
  { genus: "Neisseria",   marker: "HbA1c",            r: -0.042, p: "5\u00d710\u207b\u2075",       type: "prot" },
  // Pathogenic
  { genus: "Tannerella",     marker: "Diastolic BP",       r: +0.052, p: "4\u00d710\u207b\u2077", type: "path" },
  { genus: "Tannerella",     marker: "Total cholesterol",  r: +0.056, p: "8\u00d710\u207b\u2078", type: "path" },
  { genus: "Tannerella",     marker: "HbA1c",              r: +0.050, p: "1\u00d710\u207b\u2076", type: "path" },
  { genus: "Tannerella",     marker: "Glucose",            r: +0.054, p: "3\u00d710\u207b\u2074", type: "path" },
  { genus: "Tannerella",     marker: "Systolic BP",        r: +0.041, p: "8\u00d710\u207b\u2075", type: "path" },
  { genus: "Porphyromonas",  marker: "hsCRP",              r: +0.037, p: "0.012",                  type: "path" },
  { genus: "Fusobacterium",  marker: "LDL",                r: +0.058, p: "1\u00d710\u207b\u2074", type: "path" },
  { genus: "Fusobacterium",  marker: "Glucose",            r: +0.038, p: "0.010",                  type: "path" },
  { genus: "Prevotella",     marker: "hsCRP",              r: +0.035, p: "0.017",                  type: "path" },
]

const SHANNON_NULLS = [
  { marker: "hsCRP",         r: "+0.003", p: "0.86" },
  { marker: "Triglycerides", r: "+0.010", p: "0.50" },
  { marker: "Glucose",       r: "\u22120.009", p: "0.55" },
  { marker: "Systolic BP",   r: "\u2014",  p: "\u2014" },
  { marker: "HbA1c",         r: "\u2014",  p: "\u2014" },
]

const MAX_ABS_R = 0.094 // Haemophilus × Triglycerides

type Filter = "all" | "prot" | "path"

export function FindingsExplorer() {
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = filter === "all" ? FINDINGS : FINDINGS.filter(f => f.type === filter)

  const filters: { key: Filter; label: string; activeBg: string; activeBorder: string; activeText: string }[] = [
    { key: "all",  label: "All findings",         activeBg: "#F6F4EF", activeBorder: "#C49A3C", activeText: "#1A1917" },
    { key: "prot", label: "Protective bacteria",   activeBg: "#EAF3DE", activeBorder: "#3B6D11", activeText: "#27500A" },
    { key: "path", label: "Pathogenic bacteria",    activeBg: "#FCEBEB", activeBorder: "#A32D2D", activeText: "#791F1F" },
  ]

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      padding: 32, marginBottom: 32,
    }}>
      {/* Label */}
      <span style={{
        fontFamily: sans, fontSize: 9, letterSpacing: "2px",
        textTransform: "uppercase", color: "#C49A3C",
        display: "block", marginBottom: 16,
      }}>
        Findings
      </span>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {filters.map(f => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                fontFamily: sans, fontSize: 11, cursor: "pointer",
                padding: "6px 14px", borderRadius: 20,
                background: active ? f.activeBg : "#fff",
                border: `1px solid ${active ? f.activeBorder : "#E5E3DC"}`,
                color: active ? f.activeText : "#9E9C93",
                transition: "all 150ms ease",
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Column headers */}
      <div className="findings-row" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 100px",
        gap: 12, padding: "0 0 8px",
        borderBottom: "0.5px solid rgba(0,0,0,0.06)",
      }}>
        <span style={{ fontFamily: sans, fontSize: 11, textTransform: "uppercase", color: "#9E9C93", letterSpacing: "0.5px" }}>Bacteria</span>
        <span style={{ fontFamily: sans, fontSize: 11, textTransform: "uppercase", color: "#9E9C93", letterSpacing: "0.5px" }}>Blood marker</span>
        <span className="findings-bar-col" style={{ fontFamily: sans, fontSize: 11, textTransform: "uppercase", color: "#9E9C93", letterSpacing: "0.5px" }}>Effect</span>
        <span style={{ fontFamily: sans, fontSize: 11, textTransform: "uppercase", color: "#9E9C93", letterSpacing: "0.5px", textAlign: "right" }}>p-value</span>
      </div>

      {/* Findings rows */}
      {filtered.map((f, i) => {
        const barWidth = (Math.abs(f.r) / MAX_ABS_R) * 100
        const barColor = f.type === "prot" ? "#639922" : "#E24B4A"
        const dotColor = f.type === "prot" ? "#639922" : "#E24B4A"
        const rColor = f.r < 0 ? "#639922" : "#E24B4A"

        return (
          <div
            key={`${f.genus}-${f.marker}-${i}`}
            className="findings-row"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 100px",
              gap: 12,
              padding: "10px 0",
              borderBottom: "0.5px solid rgba(0,0,0,0.03)",
              alignItems: "center",
            }}
          >
            {/* Bacteria */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: "#1A1917" }}>{f.genus}</span>
              </div>
              <span style={{ fontFamily: sans, fontSize: 11, color: dotColor, marginLeft: 12 }}>
                {f.type === "prot" ? "protective" : "pathogenic"}
              </span>
            </div>

            {/* Blood marker */}
            <span style={{ fontFamily: sans, fontSize: 13, color: "#6B6960" }}>{f.marker}</span>

            {/* Effect bar */}
            <div className="findings-bar-col">
              <div style={{ height: 6, borderRadius: 3, background: "#F1EFE8", position: "relative" }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  background: barColor,
                  width: `${barWidth}%`,
                  transition: "width 400ms ease",
                }} />
              </div>
            </div>

            {/* r + p-value */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: sans, fontSize: 13, color: rColor, fontVariantNumeric: "tabular-nums" }}>
                {f.r > 0 ? "+" : ""}{f.r.toFixed(3)}
              </div>
              <div style={{ fontFamily: sans, fontSize: 11, color: "#9E9C93" }}>
                {f.p}
              </div>
            </div>
          </div>
        )
      })}

      {/* ── Shannon comparison ──────────────────────────────────────────── */}
      <div style={{ height: "0.5px", background: "rgba(0,0,0,0.06)", margin: "24px 0" }} />

      <span style={{
        fontFamily: sans, fontSize: 9, letterSpacing: "2px",
        textTransform: "uppercase", color: "#C49A3C",
        display: "block", marginBottom: 8,
      }}>
        Compare: Shannon diversity vs the same markers
      </span>

      <p style={{ fontFamily: sans, fontSize: 14, color: "#6B6960", lineHeight: 1.6, maxWidth: 560, margin: "0 0 16px" }}>
        The diversity score most oral microbiome tests report &mdash; including
        Shannon index &mdash; showed zero significant correlation with any of
        these blood markers.
      </p>

      {SHANNON_NULLS.map((s, i) => (
        <div
          key={s.marker}
          className="findings-row"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 100px",
            gap: 12,
            padding: "8px 0",
            borderBottom: i < SHANNON_NULLS.length - 1 ? "0.5px solid rgba(0,0,0,0.03)" : "none",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: sans, fontSize: 13, color: "#9E9C93" }}>Shannon</span>
          <span style={{ fontFamily: sans, fontSize: 13, color: "#9E9C93" }}>{s.marker}</span>
          <div className="findings-bar-col">
            <div style={{ height: 6, borderRadius: 3, background: "#F1EFE8" }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: sans, fontSize: 13, color: "#9E9C93", fontVariantNumeric: "tabular-nums" }}>{s.r}</div>
            <div style={{ fontFamily: sans, fontSize: 11, color: "#9E9C93" }}>
              {s.p !== "\u2014" ? `p = ${s.p}` : ""} n.s.
            </div>
          </div>
        </div>
      ))}

      {/* Callout */}
      <div style={{
        background: "#F6F4EF", borderRadius: 8,
        padding: 16, marginTop: 16,
      }}>
        <p style={{ fontFamily: sans, fontSize: 14, fontStyle: "italic", color: "#6B6960", lineHeight: 1.6, margin: 0 }}>
          Shannon diversity tells you how many different bacteria you have &mdash; but
          not which ones. In 9,848 Americans, that number predicted nothing about blood
          markers. Specific bacteria did.
        </p>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .findings-bar-col { display: none !important; }
          .findings-row { grid-template-columns: 1fr 1fr 80px !important; }
        }
      `}</style>
    </div>
  )
}

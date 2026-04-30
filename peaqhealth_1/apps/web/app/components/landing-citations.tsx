"use client"

import { useState, useEffect } from "react"

/* ─── Tokens ──────────────────────────────────────────────────────────────── */

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

const INK    = "#1a1a18"
const INK_20 = "rgba(20,20,16,0.20)"
const INK_40 = "rgba(20,20,16,0.40)"
const INK_60 = "rgba(20,20,16,0.60)"
const BORDER = "rgba(20,20,16,0.10)"
const ORAL   = "#3B6D11"
const BLOOD  = "#A32D2D"

const hexToRgb = (hex: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : "20, 20, 16"
}

/* ─── Data ────────────────────────────────────────────────────────────────── */

const citations = [
  {
    id: "tran-2026",
    journal: "Circulation, 2026",
    authors: "Tran AH et al. (AHA)",
    quote: "Periodontal disease increases ASCVD risk through bacteremia and chronic inflammation.",
    tag: "Oral \u2192 Blood",
    tagColor: ORAL,
    panelBorderColor: ORAL,
    expandedFinding: "AHA Scientific Statement synthesizing Mendelian randomization studies confirming directional causality from periodontal disease to atherosclerotic cardiovascular disease. Includes bacteremia and chronic systemic inflammation as dual pathways.",
    effectSize: "MR studies confirm directional effect. Periodontal intervention trials show downstream hsCRP reduction.",
    peaqMeaning: "This is why Oravi connects your P. gingivalis level to your hsCRP score. The pathway is confirmed at the highest institutional level of evidence.",
    evidenceType: "AHA Scientific Statement",
    affectedPanels: ["oral", "blood"],
  },
  {
    id: "kurt-2025",
    journal: "European Heart Journal, 2025",
    authors: "Kurt B, Ridker PM et al. \u00b7 n = 448,653",
    quote: "Residual inflammatory risk is at least as strong a predictor as residual cholesterol risk.",
    tag: "Blood",
    tagColor: BLOOD,
    panelBorderColor: BLOOD,
    expandedFinding: "Large prospective cohort of 448,653 UK Biobank participants without known ASCVD. hsCRP independently predicts MACE (HR=1.20) and cardiovascular death (HR=1.35) after full confounder adjustment.",
    effectSize: "HR = 1.20 for MACE \u00b7 HR = 1.35 for CV death \u00b7 p < 0.001",
    peaqMeaning: "This study \u2014 co-authored by Paul Ridker, the cardiologist who defined residual inflammatory risk \u2014 directly validates the weight Oravi assigns to your hsCRP score relative to your LDL-C.",
    evidenceType: "Large prospective cohort",
    affectedPanels: ["blood"],
  },
  {
    id: "irwin-2016",
    journal: "Biological Psychiatry, 2016",
    authors: "Irwin MR, Olmstead R, Carroll JE",
    quote: "Elevated CRP fragments sleep architecture and suppresses deep sleep \u2014 which further elevates CRP.",
    tag: "Blood \u2192 Sleep",
    tagColor: "#185FA5",
    panelBorderColor: "#185FA5",
    expandedFinding: "Meta-analysis demonstrating that systemic inflammation (hsCRP, IL-6) disrupts slow-wave sleep via hypothalamic-pituitary-adrenal axis activation. Sleep loss then amplifies inflammatory cytokines, creating a self-reinforcing cycle.",
    effectSize: "Short sleep (<6h) associated with 1.45x higher CRP. Each 1 mg/L CRP increase associated with 8\u201312% reduction in N3 sleep.",
    peaqMeaning: "This is why Oravi tracks hsCRP and deep sleep together. When your blood panel shows elevated CRP and your wearable shows declining deep sleep, the cycle is already in motion \u2014 and both panels confirm it.",
    evidenceType: "Meta-analysis + mechanistic review",
    affectedPanels: ["blood", "sleep"],
  },
] as const

/* ─── Component ───────────────────────────────────────────────────────────── */

export function LandingCitations({
  onActivePanels,
}: {
  onActivePanels?: (panels: string[]) => void
}) {
  const [hovered, setHovered]   = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)

  useEffect(() => {
    const active = hovered || expanded
    if (active) {
      const c = citations.find(x => x.id === active)
      onActivePanels?.(c ? [...c.affectedPanels] : [])
    } else {
      onActivePanels?.([])
    }
  }, [hovered, expanded, onActivePanels])

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {citations.map((c, i) => {
        const isHovered  = hovered === c.id
        const isExpanded = expanded === c.id
        const isActive   = isHovered || isExpanded

        return (
          <div key={c.id}>
            {/* Citation row */}
            <div
              className="citation-row"
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              style={{
                padding: "28px 0",
                paddingLeft: isActive ? 20 : 0,
                borderBottom: i < citations.length - 1 && !isExpanded ? `0.5px solid ${BORDER}` : "none",
                borderLeft: `3px solid ${isActive ? c.panelBorderColor : "transparent"}`,
                marginLeft: -3,
                background: isActive ? `rgba(${hexToRgb(c.panelBorderColor)}, 0.025)` : "transparent",
                borderRadius: isExpanded ? "0 8px 8px 0" : 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 48,
                flexWrap: "wrap",
                cursor: "pointer",
                transition: "padding 250ms ease, background 250ms ease",
                minHeight: 44,
              }}
            >
              {/* Left — journal + authors */}
              <div style={{ minWidth: 140, flexShrink: 0 }}>
                <p style={{
                  fontFamily: sans, fontSize: 11, textTransform: "uppercase",
                  letterSpacing: "0.06em", color: INK_40, margin: "0 0 2px",
                }}>
                  {c.journal}
                </p>
                <p style={{ fontFamily: sans, fontSize: 12, color: INK_40, margin: 0 }}>
                  {c.authors}
                </p>
              </div>

              {/* Center — quote */}
              <p style={{
                fontFamily: serif, fontSize: 18, fontWeight: 400,
                fontStyle: "italic", lineHeight: 1.5,
                color: isActive ? `rgba(${hexToRgb(c.panelBorderColor)}, 0.90)` : INK,
                maxWidth: 440, margin: 0, flex: 1,
                transition: "color 0.25s ease",
              }}>
                &ldquo;{c.quote}&rdquo;
              </p>

              {/* Right — tag + expand indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <span
                    onMouseEnter={(e) => { e.stopPropagation(); setHoveredTag(c.id) }}
                    onMouseLeave={() => setHoveredTag(null)}
                    style={{
                      fontFamily: sans, fontSize: 10, fontWeight: 500,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      color: c.tagColor, padding: "4px 10px",
                      border: `1px solid ${c.tagColor}${isActive ? "" : "30"}`,
                      background: isActive ? `rgba(${hexToRgb(c.tagColor)}, 0.06)` : "transparent",
                      borderRadius: 3, whiteSpace: "nowrap",
                      transition: "background 150ms ease, border-color 150ms ease",
                    }}
                  >
                    {c.tag}
                  </span>

                  {/* Tooltip */}
                  {hoveredTag === c.id && (
                    <div style={{
                      position: "absolute", right: 0, top: 32,
                      background: INK, color: BG_COLOR,
                      fontSize: 12, padding: "8px 12px", borderRadius: 4,
                      whiteSpace: "nowrap", zIndex: 10,
                      fontFamily: sans, lineHeight: 1.5,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    }}>
                      {c.tag.includes("\u2192")
                        ? "Cross-panel signal: research linking these two dimensions"
                        : "Single-panel signal: evidence within this measurement category"
                      }
                      <div style={{
                        position: "absolute", top: -4, right: 16,
                        width: 8, height: 8, background: INK,
                        transform: "rotate(45deg)",
                      }} />
                    </div>
                  )}
                </div>

                {/* Expand indicator */}
                <span style={{
                  fontFamily: serif, fontSize: 18, fontWeight: 300,
                  color: isExpanded ? c.panelBorderColor : isHovered ? INK_40 : INK_20,
                  transition: "transform 0.25s ease, color 0.25s ease",
                  transform: isExpanded ? "rotate(45deg)" : "rotate(0deg)",
                  display: "inline-block",
                  lineHeight: 1,
                }}>
                  +
                </span>
              </div>
            </div>

            {/* Expanded panel */}
            <div style={{
              maxHeight: isExpanded ? 800 : 0,
              overflow: "hidden",
              transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }}>
              <div className="citation-expanded" style={{
                padding: "24px 0 32px 20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 32,
                borderBottom: `1px solid ${c.panelBorderColor}22`,
                borderLeft: `3px solid ${c.panelBorderColor}`,
                marginLeft: -3,
              }}>
                {/* Column 1 — Full finding */}
                <div>
                  <p style={{
                    fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: "rgba(20,20,16,0.35)",
                    margin: "0 0 10px",
                  }}>
                    Full Finding
                  </p>
                  <p style={{
                    fontFamily: sans, fontSize: 13, color: "rgba(20,20,16,0.65)",
                    lineHeight: 1.75, margin: 0,
                  }}>
                    {c.expandedFinding}
                  </p>
                </div>

                {/* Column 2 — Effect size */}
                <div>
                  <p style={{
                    fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: "rgba(20,20,16,0.35)",
                    margin: "0 0 10px",
                  }}>
                    Effect Size
                  </p>
                  <p style={{
                    fontFamily: sans, fontSize: 13, fontWeight: 500,
                    color: c.panelBorderColor, lineHeight: 1.75, margin: 0,
                  }}>
                    {c.effectSize}
                  </p>
                  <p style={{
                    fontFamily: sans, fontSize: 11, fontStyle: "italic",
                    color: "rgba(20,20,16,0.35)", marginTop: 8,
                  }}>
                    {c.evidenceType}
                  </p>
                </div>

                {/* Column 3 — What this means */}
                <div style={{
                  background: `rgba(${hexToRgb(c.panelBorderColor)}, 0.04)`,
                  borderRadius: 8, padding: "16px 20px",
                }}>
                  <p style={{
                    fontFamily: sans, fontSize: 10, fontWeight: 500,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: c.panelBorderColor, margin: "0 0 10px",
                  }}>
                    What this means for your score
                  </p>
                  <p style={{
                    fontFamily: serif, fontSize: 15, fontStyle: "italic",
                    color: "rgba(20,20,16,0.70)", lineHeight: 1.75, margin: 0,
                  }}>
                    {c.peaqMeaning}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const BG_COLOR = "#F6F4EF"

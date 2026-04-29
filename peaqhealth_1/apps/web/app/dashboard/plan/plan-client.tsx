"use client"

import { useState } from "react"
import Link from "next/link"
import { Nav } from "../../components/nav"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const NON_STANDARD_TEST_COPY: Record<string, { name: string; ask_for: string; why_short: string }> = {
  hs_crp: {
    name: "High-sensitivity CRP",
    ask_for: 'Ask for "hs-CRP" — standard CRP is not the same test',
    why_short: "The inflammation marker most relevant to biological aging and cardiovascular risk. Not included on most standard panels.",
  },
  lpa: {
    name: "Lp(a)",
    ask_for: 'Ask for "Lp(a)" or "lipoprotein little a" — not on a standard lipid panel',
    why_short: "A genetically determined cardiovascular risk factor independent of LDL. The ACC now recommends everyone test once in their life.",
  },
  vitamin_d: {
    name: "Vitamin D (25-OH)",
    ask_for: 'Ask for "25-OH vitamin D" specifically',
    why_short: "Affects immune regulation, oral tissue health, and sleep architecture. Deficiency is common and easy to correct.",
  },
  rdw: {
    name: "RDW",
    ask_for: "Usually included in a standard CBC — ask if it was reported",
    why_short: "A sensitive marker of cellular stress and nutritional status — reflects inflammation and iron/B12/folate balance beyond anemia screening.",
  },
  mpv: {
    name: "MPV",
    ask_for: "Usually included in a standard CBC differential",
    why_short: "Platelet size reflects cardiovascular and inflammatory state. Already on most CBC reports but rarely discussed.",
  },
  hba1c: {
    name: "HbA1c",
    ask_for: 'Ask for "HbA1c" or "hemoglobin A1c"',
    why_short: "A 3-month blood sugar average. Catches metabolic drift before fasting glucose does.",
  },
}

interface Props {
  firstName?: string
  updatedAt: string | null
  positiveSignals: Array<{ key: string; text: string }>
  planItems: Array<{ id?: string; title: string; timing: string; why?: string; marker_link?: string; marker_label?: string }>
  missingTests: string[]
}

const SIGNAL_LINKS: Record<string, string> = {
  good_bacteria: "/dashboard/oral/good_bacteria",
  diversity: "/dashboard/oral/diversity",
  deep_sleep: "/dashboard/sleep/deep_sleep",
  rem: "/dashboard/sleep/rem",
  duration: "/dashboard/sleep/duration",
  hrv: "/dashboard/sleep/recovery_hrv",
  phenoage: "/dashboard/blood",
  vitamin_d: "/dashboard/blood/vitamin_d",
  ldl: "/dashboard/blood/ldl",
  low_crp: "/dashboard/blood/hs_crp",
}

export function PlanClient({ updatedAt, positiveSignals, planItems, missingTests }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const updatedStr = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null

  return (
    <div className="min-h-svh" style={{ background: "#FAFAF8" }}>
      <Nav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>

        <Link href="/dashboard" style={{
          fontFamily: sans, fontSize: 12, color: "#B8860B",
          textDecoration: "none", display: "inline-block", marginBottom: 24,
        }}>
          ← Back to dashboard
        </Link>

        <h1 style={{
          fontFamily: serif, fontSize: 36, fontWeight: 400,
          color: "#141410", margin: "0 0 6px", lineHeight: 1.15,
        }}>
          Your Plan
        </h1>
        {updatedStr && (
          <p style={{ fontFamily: sans, fontSize: 13, color: "#9B9891", margin: "0 0 40px" }}>
            Updated {updatedStr} · Based on your latest results
          </p>
        )}

        {/* ── WHAT'S WORKING ─────────────────────────────────────────────── */}
        {positiveSignals.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <p style={{
              fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#9B9891",
              margin: "0 0 18px",
            }}>
              What&rsquo;s working
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {positiveSignals.map((signal, i) => {
                const href = SIGNAL_LINKS[signal.key]
                const inner = (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{
                      color: "#1A8C4E", fontSize: 18, lineHeight: 1.4,
                      flexShrink: 0, marginTop: 1,
                    }}>✓</span>
                    <p style={{
                      fontFamily: sans, fontSize: 15, color: "#3D3B35",
                      lineHeight: 1.6, margin: 0, flex: 1,
                    }}>
                      {signal.text}
                    </p>
                    {href && <span style={{ color: "#9B9891", fontSize: 14, flexShrink: 0 }}>→</span>}
                  </div>
                )
                return href ? (
                  <Link key={i} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                    {inner}
                  </Link>
                ) : <div key={i}>{inner}</div>
              })}
            </div>
          </section>
        )}

        {/* ── YOUR ACTION ITEMS ──────────────────────────────────────────── */}
        <section style={{ marginBottom: 48 }}>
          <p style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#9B9891",
            margin: "0 0 18px",
          }}>
            Your action items
          </p>

          {planItems.length === 0 ? (
            <p style={{ fontFamily: sans, fontSize: 14, color: "#7A7A6E", margin: 0 }}>
              All markers in range. Keep going.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {planItems.map((item, i) => {
                const expanded = expandedIdx === i
                return (
                  <div key={i} style={{
                    border: "1px solid #E8E6E0", borderRadius: 10,
                    overflow: "hidden",
                  }}>
                    <div
                      onClick={() => setExpandedIdx(expanded ? null : i)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "16px 20px", cursor: "pointer", background: "#FAFAF8",
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "#B8860B", color: "#FFFFFF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 600, flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <p style={{
                        fontFamily: sans, fontSize: 15, color: "#2C2A24",
                        margin: 0, flex: 1, fontWeight: 500,
                      }}>
                        {item.title}
                      </p>
                      <span style={{
                        fontFamily: sans, fontSize: 12, color: "#9B9891", flexShrink: 0,
                      }}>
                        {item.timing}
                      </span>
                      {item.why && (
                        <span style={{ color: "#9B9891", fontSize: 12 }}>
                          {expanded ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                    {expanded && item.why && (
                      <div style={{
                        padding: "0 20px 18px 62px", background: "#FAFAF8",
                        borderTop: "1px solid #F0EDE6",
                      }}>
                        <p style={{
                          fontFamily: sans, fontSize: 14, color: "#5C5A54",
                          lineHeight: 1.65, margin: "14px 0 10px",
                        }}>
                          {item.why}
                        </p>
                        {item.marker_link && item.marker_label && (
                          <Link href={item.marker_link} style={{
                            fontFamily: sans, fontSize: 13, color: "#B8860B",
                            textDecoration: "none",
                          }}>
                            See your {item.marker_label} results →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── TESTS TO DISCUSS WITH YOUR DOCTOR ──────────────────────────── */}
        {missingTests.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <p style={{
              fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#9B9891",
              margin: "0 0 18px",
            }}>
              Tests worth adding to your next blood draw
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {missingTests.map(key => {
                const t = NON_STANDARD_TEST_COPY[key]
                if (!t) return null
                return (
                  <div key={key} style={{
                    background: "#FFFFFF", border: "0.5px solid #EDE9E0",
                    borderRadius: 10, padding: "16px 20px",
                  }}>
                    <p style={{
                      fontFamily: serif, fontSize: 18, fontWeight: 400,
                      color: "#141410", margin: "0 0 4px",
                    }}>
                      {t.name}
                    </p>
                    <p style={{
                      fontFamily: sans, fontSize: 12, color: "#B8860B",
                      margin: "0 0 8px", fontWeight: 500,
                    }}>
                      {t.ask_for}
                    </p>
                    <p style={{
                      fontFamily: sans, fontSize: 13, color: "#5C5A54",
                      lineHeight: 1.6, margin: 0,
                    }}>
                      {t.why_short}
                    </p>
                  </div>
                )
              })}
            </div>
            <Link href="/learn/why-these-tests" style={{
              fontFamily: sans, fontSize: 13, color: "#B8860B",
              textDecoration: "none", display: "inline-block", marginTop: 16,
            }}>
              Read more about why Oravi uses these tests →
            </Link>
          </section>
        )}

      </main>
    </div>
  )
}

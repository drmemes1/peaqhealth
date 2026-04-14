"use client"

import { useState } from "react"
import Link from "next/link"
import { Nav } from "../../../components/nav"
import { ConnectionLineCard } from "../../../components/connection-line"
import { evaluateConnection } from "@peaq/score-engine"
import type { ConnectionInput } from "@peaq/score-engine"
import type { MarkerDef } from "../../../../lib/markers/definitions"
import { MARKER_RULES_COUNT } from "../../../../lib/markers/definitions"
import { LineChart, Line, XAxis, YAxis, ReferenceArea, Tooltip, ResponsiveContainer, Dot } from "recharts"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const THRESHOLD_COLORS = { green: "#1A8C4E", amber: "#E07B00", red: "#D42B2B" } as const
const SUPPLEMENT_DOT = { strong: "#4A7FB5", moderate: "#E07B00", emerging: "#7A7A6E" } as const

function getStatus(value: number, def: MarkerDef): { label: string; color: 'green' | 'amber' | 'red' } {
  for (const t of def.thresholds) {
    if (t.min !== undefined && t.max !== undefined) {
      if (value >= t.min && value < t.max) return { label: t.label, color: t.color }
    } else if (t.max !== undefined) {
      if (value < t.max) return { label: t.label, color: t.color }
    } else if (t.min !== undefined) {
      if (value >= t.min) return { label: t.label, color: t.color }
    }
  }
  return { label: "Unknown", color: "amber" }
}

interface HistoryPoint { date: string; value: number }

interface Props {
  def: MarkerDef
  value: number | null
  connectionInput: ConnectionInput
  history: HistoryPoint[]
  articles: Array<{ slug: string; title: string; summary: string; readTime: number }>
  backHref?: string
  backLabel?: string
  panelColor?: string
  panelLabel?: string
}

type Tab = "why" | "foods" | "supplements" | "learn"

function getThresholdColor(v: number, def: MarkerDef): string {
  for (const t of def.thresholds) {
    if (t.min !== undefined && t.max !== undefined) {
      if (v >= t.min && v < t.max) return THRESHOLD_COLORS[t.color]
    } else if (t.max !== undefined) {
      if (v < t.max) return THRESHOLD_COLORS[t.color]
    } else if (t.min !== undefined) {
      if (v >= t.min) return THRESHOLD_COLORS[t.color]
    }
  }
  return THRESHOLD_COLORS.amber
}

function getTrend(hist: HistoryPoint[], higherIsBetter?: boolean): { direction: string; assessment: string } {
  if (hist.length < 2) return { direction: "stable", assessment: "stable" }
  const first = hist[0].value
  const last = hist[hist.length - 1].value
  const pctChange = ((last - first) / first) * 100
  if (Math.abs(pctChange) < 3) return { direction: "stable", assessment: "stable" }
  const goingUp = pctChange > 0
  const favorable = higherIsBetter ? goingUp : !goingUp
  return {
    direction: goingUp ? "up" : "down",
    assessment: favorable ? "favorable" : "watch",
  }
}

export function MarkerDetailClient({ def, value, connectionInput, history, articles, backHref, backLabel, panelColor, panelLabel }: Props) {
  const [tab, setTab] = useState<Tab>("why")
  const rawConnection = evaluateConnection(def.id, connectionInput)
  const status = value !== null ? getStatus(value, def) : null
  const connection = status?.color === "green"
    ? rawConnection.filter(c => c.direction !== "unfavorable")
    : rawConnection
  const rulesCount = MARKER_RULES_COUNT[def.id] ?? 0
  const trend = getTrend(history, def.higher_is_better)

  function renderDot(props: Record<string, unknown>) {
    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { value: number } }
    if (!payload) return <circle />
    const color = getThresholdColor(payload.value, def)
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#FFFFFF" strokeWidth={2} />
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "why", label: "Why it matters" },
    { key: "foods", label: "Foods" },
    { key: "supplements", label: "Supplements" },
    { key: "learn", label: "Learn more" },
  ]

  return (
    <div className="min-h-svh" style={{ background: "#FAFAF8" }}>
      <Nav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px 80px" }}>

        <Link href={backHref ?? "/dashboard/blood"} style={{
          fontFamily: sans, fontSize: 12, color: "#B8860B",
          textDecoration: "none", display: "inline-block", marginBottom: 24,
        }}>
          ← {backLabel ?? "Back to Blood Panel"}
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            fontFamily: sans, fontSize: 9, letterSpacing: "0.1em",
            textTransform: "uppercase", fontWeight: 600,
            color: panelColor ?? "#C0392B", background: `${panelColor ?? "#C0392B"}14`,
            border: `0.5px solid ${panelColor ?? "#C0392B"}30`,
            borderRadius: 20, padding: "2px 10px",
          }}>
            {panelLabel ?? "Blood"}
          </span>
        </div>

        <h1 style={{
          fontFamily: serif, fontSize: 36, fontWeight: 300,
          color: "#141410", margin: "0 0 4px", lineHeight: 1.15,
        }}>
          {def.label}
        </h1>
        <p style={{
          fontFamily: sans, fontSize: 13, color: "#7A7A6E",
          margin: "0 0 28px",
        }}>
          {def.fullName}
        </p>

        {/* ── VALUE EXISTS ──────────────────────────────────────────────── */}
        {value !== null && status ? (
          <>
            <div style={{
              background: "#FFFFFF", border: "0.5px solid #EDE9E0",
              borderRadius: 12, padding: "28px 32px", marginBottom: 24,
              boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                <span style={{ fontFamily: serif, fontSize: 48, fontWeight: 300, color: "#141410" }}>
                  {typeof value === "number" ? (value < 10 ? value.toFixed(1) : Math.round(value)) : value}
                </span>
                <span style={{ fontFamily: sans, fontSize: 14, color: "#7A7A6E" }}>{def.unit}</span>
                <span style={{
                  fontFamily: sans, fontSize: 11, fontWeight: 500,
                  padding: "3px 12px", borderRadius: 20, marginLeft: "auto",
                  background: `${THRESHOLD_COLORS[status.color]}14`,
                  color: THRESHOLD_COLORS[status.color],
                  border: `0.5px solid ${THRESHOLD_COLORS[status.color]}40`,
                }}>
                  {status.label}
                </span>
              </div>
              <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7A6E", margin: 0 }}>
                Target: {def.thresholds.find(t => t.color === "green")?.label ?? "Optimal"} range
                {def.thresholds[0].max !== undefined && ` (${def.higher_is_better ? ">" : "<"}${def.thresholds.find(t => t.color === "green")?.max ?? def.thresholds.find(t => t.color === "green")?.min} ${def.unit})`}
              </p>
            </div>

            <ConnectionLineCard connection={connection} />

            {/* ── TREND CHART ────────────────────────────────────────── */}
            {history.length >= 2 && (
              <div style={{
                background: "#FFFFFF", border: "0.5px solid #EDE9E0",
                borderRadius: 12, padding: "24px 24px 16px", marginTop: 24,
                boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "#7A7A6E",
                  display: "block", marginBottom: 16,
                }}>
                  TREND
                </span>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={history.map(h => ({ ...h, date: new Date(h.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) }))}>
                    {def.thresholds.map((t, i) => {
                      const vals = history.map(h => h.value)
                      const chartMin = Math.min(...vals) * 0.8
                      const chartMax = Math.max(...vals) * 1.2
                      const lo = t.min ?? chartMin
                      const hi = t.max ?? chartMax
                      const fill = THRESHOLD_COLORS[t.color]
                      return <ReferenceArea key={i} y1={lo} y2={hi} fill={fill} fillOpacity={0.06} />
                    })}
                    <XAxis
                      dataKey="date" tick={{ fontFamily: sans, fontSize: 10, fill: "#7A7A6E" }}
                      axisLine={{ stroke: "#EDE9E0" }} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontFamily: sans, fontSize: 10, fill: "#7A7A6E" }}
                      axisLine={false} tickLine={false} width={40}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{ fontFamily: sans, fontSize: 12, borderRadius: 6, border: "0.5px solid #EDE9E0" }}
                      formatter={(v) => [`${v} ${def.unit}`, def.label]}
                    />
                    <Line
                      type="monotone" dataKey="value"
                      stroke="#141410" strokeWidth={1.5}
                      dot={renderDot}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#FFFFFF" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p style={{
                  fontFamily: sans, fontSize: 13, color: "#4A4A42",
                  margin: "12px 0 4px",
                }}>
                  Trending {trend.direction} — <span style={{
                    color: trend.assessment === "favorable" ? "#1A8C4E" : trend.assessment === "watch" ? "#E07B00" : "#7A7A6E",
                    fontWeight: 500,
                  }}>{trend.assessment}</span>
                </p>
                <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7A6E", margin: 0 }}>
                  Target: {def.thresholds.find(t => t.color === "green")?.label ?? "Optimal"} range
                </p>
              </div>
            )}
            {history.length > 0 && history.length < 2 && (
              <p style={{ fontFamily: sans, fontSize: 11, color: "#7A7A6E", textAlign: "center", margin: "24px 0 0" }}>
                Trend will appear after your next blood draw.
              </p>
            )}
          </>
        ) : (
          /* ── VALUE MISSING ──────────────────────────────────────────── */
          <div style={{
            background: def.missing_state.urgency === "high" ? "#FEF6E7" : "#FFFFFF",
            border: def.missing_state.urgency === "high" ? "0.5px solid rgba(184,134,11,0.25)" : "0.5px solid #EDE9E0",
            borderRadius: 12, padding: "32px",
            marginBottom: 24, boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "2px dashed #7A7A6E", display: "flex",
              alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" stroke="#7A7A6E" strokeWidth={1.5} fill="none">
                <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
              </svg>
            </div>

            <h2 style={{
              fontFamily: serif, fontSize: 24, fontWeight: 400,
              color: "#141410", margin: "0 0 10px",
            }}>
              {def.missing_state.headline}
            </h2>
            <p style={{
              fontFamily: sans, fontSize: 14, color: "#7A7A6E",
              lineHeight: 1.7, margin: "0 0 20px", maxWidth: "55ch",
            }}>
              {def.missing_state.body}
            </p>

            {def.missing_state.urgency === "high" ? (
              <button style={{
                fontFamily: sans, fontSize: 13, fontWeight: 500,
                color: "#FFFFFF", background: "#B8860B",
                border: "none", borderRadius: 6, padding: "12px 24px",
                cursor: "pointer", display: "block", marginBottom: 8,
              }}>
                {def.missing_state.cta}
              </button>
            ) : (
              <button style={{
                fontFamily: sans, fontSize: 13, fontWeight: 500,
                color: "#B8860B", background: "transparent",
                border: "1px solid #B8860B", borderRadius: 6,
                padding: "10px 20px", cursor: "pointer", display: "block",
                marginBottom: 8,
              }}>
                {def.missing_state.cta}
              </button>
            )}

            {def.missing_state.cta_sub && (
              <p style={{ fontFamily: sans, fontSize: 11, color: "#7A7A6E", margin: "0 0 12px" }}>
                {def.missing_state.cta_sub}
              </p>
            )}

            {rulesCount > 0 && (
              <p style={{ fontFamily: sans, fontSize: 12, color: "#B8860B", margin: 0 }}>
                Unlocks up to {rulesCount} Peaq connections
              </p>
            )}
          </div>
        )}

        {/* ── TABS ──────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 0, borderBottom: "0.5px solid #EDE9E0",
          marginBottom: 24,
        }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                fontFamily: sans, fontSize: 12, fontWeight: tab === t.key ? 500 : 400,
                color: tab === t.key ? "#141410" : "#7A7A6E",
                background: "none", border: "none", cursor: "pointer",
                padding: "12px 16px",
                borderBottom: tab === t.key ? "2px solid #B8860B" : "2px solid transparent",
                marginBottom: -1, transition: "color 120ms ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Why it matters ──────────────────────────────────────── */}
        {tab === "why" && (
          <div>
            {def.why_it_matters.split("\n\n").map((para, i) => (
              <p key={i} style={{
                fontFamily: sans, fontSize: 15, color: "#4A4A42",
                lineHeight: 1.8, margin: "0 0 16px",
              }}>
                {para}
              </p>
            ))}
          </div>
        )}

        {/* ── TAB: Foods ──────────────────────────────────────────────── */}
        {tab === "foods" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {def.foods.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#1A8C4E", flexShrink: 0, marginTop: 6,
                }} />
                <div>
                  <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: "#141410", margin: "0 0 2px" }}>
                    {f.name}
                  </p>
                  <p style={{ fontFamily: sans, fontSize: 13, color: "#7A7A6E", margin: 0, lineHeight: 1.5 }}>
                    {f.why}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: Supplements ────────────────────────────────────────── */}
        {tab === "supplements" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {def.supplements.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: SUPPLEMENT_DOT[s.strength], flexShrink: 0, marginTop: 6,
                  }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: "#141410", margin: 0 }}>
                        {s.name}
                      </p>
                      <span style={{
                        fontFamily: sans, fontSize: 9, textTransform: "uppercase",
                        letterSpacing: "0.06em", color: SUPPLEMENT_DOT[s.strength],
                        background: `${SUPPLEMENT_DOT[s.strength]}14`,
                        padding: "1px 6px", borderRadius: 3,
                      }}>
                        {s.strength}
                      </span>
                    </div>
                    <p style={{ fontFamily: sans, fontSize: 13, color: "#7A7A6E", margin: "2px 0 0", lineHeight: 1.5 }}>
                      {s.why}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{
              fontFamily: sans, fontSize: 11, color: "#7A7A6E",
              padding: "12px 0", borderTop: "0.5px solid #EDE9E0",
            }}>
              Discuss supplements with your doctor before starting.
            </p>
          </div>
        )}

        {/* ── TAB: Learn more ─────────────────────────────────────────── */}
        {tab === "learn" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {status?.color === "green" && (
              <div style={{
                background: "rgba(26,140,78,0.04)", border: "0.5px solid rgba(26,140,78,0.15)",
                borderLeft: "3px solid #1A8C4E", borderRadius: "0 8px 8px 0",
                padding: "14px 16px", marginBottom: 4,
              }}>
                <p style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: "#0F6E56", margin: "0 0 4px" }}>
                  Your {def.label} is in the optimal range.
                </p>
                <p style={{ fontFamily: sans, fontSize: 13, color: "#7A7A6E", margin: 0, lineHeight: 1.5 }}>
                  Keep doing what you are doing. Retest in 6 months to confirm stability.
                </p>
              </div>
            )}
            {articles.length > 0 ? articles.map(a => (
              <Link key={a.slug} href={`/learn/${a.slug}`} style={{
                textDecoration: "none", display: "block",
                background: "#FFFFFF", border: "0.5px solid #EDE9E0",
                borderRadius: 8, padding: "16px 20px",
                transition: "transform 150ms ease",
              }}>
                <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: "#141410", margin: "0 0 4px" }}>
                  {a.title}
                </p>
                <p style={{ fontFamily: sans, fontSize: 12, color: "#7A7A6E", margin: "0 0 4px", lineHeight: 1.5 }}>
                  {a.summary}
                </p>
                <span style={{ fontFamily: sans, fontSize: 11, color: "#B8860B" }}>
                  {a.readTime} min read →
                </span>
              </Link>
            )) : (
              <p style={{ fontFamily: sans, fontSize: 13, color: "#7A7A6E" }}>
                Related articles coming soon.
              </p>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

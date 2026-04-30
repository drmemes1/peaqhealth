"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { ConvergeObservation } from "../../../lib/converge/observations"
import type { InterventionWithState } from "../../../lib/interventions/engagements"
import { ActionPlan } from "../../components/interventions/ActionPlan"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const serif = "var(--font-manrope), system-ui, sans-serif"

const SEVERITY_DOT: Record<string, string> = {
  positive: "#1A8C4E",
  watch: "#E07B00",
  attention: "#D42B2B",
  recheck: "#B8860B",
  context: "#9B9891",
}

const SEVERITY_LABEL: Record<string, string> = {
  positive: "Positive",
  watch: "Watch",
  attention: "Attention",
  recheck: "Recheck",
  context: "Context",
}

const VERDICT_COLOR: Record<string, string> = {
  good: "#1A8C4E",
  watch: "#E07B00",
  low: "#C0392B",
  attention: "#D42B2B",
}

function panelTag(panels: string[]): string {
  if (panels.length === 0) return "General"
  return panels.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" × ")
}

function panelTagColor(panels: string[]): string {
  if (panels.includes("oral") && panels.includes("blood")) return "#2D6A4F"
  if (panels.includes("oral") && panels.includes("sleep")) return "#4A7FB5"
  if (panels.includes("sleep") && panels.includes("blood")) return "#B8860B"
  if (panels.includes("oral")) return "#2D6A4F"
  if (panels.includes("blood")) return "#C0392B"
  if (panels.includes("sleep")) return "#4A7FB5"
  return "#9B9891"
}

function ObservationCard({ obs }: { obs: ConvergeObservation }) {
  const [expanded, setExpanded] = useState(false)
  const dot = SEVERITY_DOT[obs.severity] ?? "#9B9891"
  const tag = panelTag(obs.panels)
  const tagColor = panelTagColor(obs.panels)

  return (
    <div
      id={obs.id}
      style={{
        background: "#FFFFFF", border: "1px solid #E8E6E0", borderRadius: 14,
        overflow: "hidden", marginBottom: 16,
        boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
      }}
    >
      {/* Tag bar */}
      <div style={{ padding: "16px 24px 0", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontFamily: sans, fontSize: 9, letterSpacing: "0.12em",
          textTransform: "uppercase", fontWeight: 600,
          color: tagColor, background: `${tagColor}14`,
          border: `0.5px solid ${tagColor}30`,
          borderRadius: 20, padding: "3px 10px",
        }}>
          {tag}
        </span>
        <span style={{
          fontFamily: sans, fontSize: 9, letterSpacing: "0.1em",
          textTransform: "uppercase", color: dot, fontWeight: 500,
        }}>
          {SEVERITY_LABEL[obs.severity] ?? obs.severity}
        </span>
      </div>

      {/* Title + narrative */}
      <div style={{ padding: "12px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 7 }} />
          <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: "#2C2A24", margin: 0, lineHeight: 1.3 }}>
            {obs.title}
          </h3>
        </div>

        <p style={{ fontFamily: sans, fontSize: 14, color: "#7A7870", lineHeight: 1.65, margin: "0 0 12px" }}>
          {obs.oneLiner}
        </p>

        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              fontFamily: sans, fontSize: 12, color: "#B8860B",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            Read more →
          </button>
        )}

        {expanded && (
          <>
            <p style={{ fontFamily: sans, fontSize: 14, color: "#4A4A42", lineHeight: 1.7, margin: "0 0 16px" }}>
              {obs.narrative}
            </p>

            {obs.chain && (
              <div style={{
                background: "#FAF8F2", border: "1px solid #E8E4D8",
                borderRadius: 10, padding: "14px 18px", marginBottom: 16,
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 9, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: "#B8860B", fontWeight: 500,
                  display: "block", marginBottom: 6,
                }}>
                  {obs.chain.label}
                </span>
                <p style={{ fontFamily: sans, fontSize: 13, color: "#4A4A42", lineHeight: 1.5, margin: 0 }}>
                  {obs.chain.text}
                </p>
              </div>
            )}

            {obs.datapoints && obs.datapoints.length > 0 && (
              <div className="converge-datapoints" style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: 8, marginBottom: 16,
              }}>
                {obs.datapoints.map((dp, i) => (
                  <div key={i} style={{
                    background: "#FAFAF8", border: "1px solid #E8E6E0",
                    borderRadius: 8, padding: "10px 12px",
                  }}>
                    <span style={{
                      fontFamily: sans, fontSize: 9, letterSpacing: "0.1em",
                      textTransform: "uppercase", color: "#9B9891",
                      display: "block", marginBottom: 4,
                    }}>
                      {dp.label}
                    </span>
                    <span style={{
                      fontFamily: sans, fontSize: 16, fontWeight: 600,
                      color: dp.verdict ? VERDICT_COLOR[dp.verdict] ?? "#2C2A24" : "#2C2A24",
                    }}>
                      {dp.value}{dp.unit && <span style={{ fontSize: 11, fontWeight: 400, color: "#9B9891", marginLeft: 2 }}>{dp.unit}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {obs.missingData && (
              <div style={{
                background: "#FFFBEB", border: "1px solid #FDE68A",
                borderRadius: 10, padding: "12px 16px",
                display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8,
              }}>
                <span style={{ fontSize: 14, marginTop: 1 }}>+</span>
                <div>
                  <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: "#92400E", margin: "0 0 2px" }}>
                    Add {obs.missingData.whichPanel}{obs.missingData.whichMarker ? ` (${obs.missingData.whichMarker.replace(/_/g, " ")})` : ""}
                  </p>
                  <p style={{ fontFamily: sans, fontSize: 12, color: "#92400E", margin: 0, opacity: 0.8 }}>
                    {obs.missingData.whyItMatters}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setExpanded(false)}
              style={{
                fontFamily: sans, fontSize: 12, color: "#9B9891",
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              Show less
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function ConvergeClient({ observations, availablePanels, panelCount, firstName, interventions = [], heroNarrative }: {
  observations: ConvergeObservation[]
  availablePanels: string[]
  panelCount: number
  firstName: string | null
  interventions?: InterventionWithState[]
  heroNarrative?: { headline: string; paragraphs: string[] } | null
}) {
  const attentionObs = observations.filter(o => o.severity === "attention" || o.severity === "watch")
  const positiveObs = observations.filter(o => o.severity === "positive")
  const otherObs = observations.filter(o => o.severity !== "attention" && o.severity !== "watch" && o.severity !== "positive")

  const [hero, setHero] = useState<{ headline: string; paragraphs: string[] } | null>(heroNarrative ?? null)

  useEffect(() => {
    if (hero || panelCount < 2) return
    fetch("/api/converge/hero", { method: "POST" })
      .then(r => r.json())
      .then(data => setHero({ headline: data.headline, paragraphs: data.paragraphs ?? [] }))
      .catch(() => {})
  }, [hero, panelCount])

  return (
    <main className="converge-main" style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Header */}
      <Link href="/dashboard" style={{
        fontFamily: sans, fontSize: 12, color: "#B8860B",
        textDecoration: "none", display: "inline-block", marginBottom: 24,
      }}>
        ← Dashboard
      </Link>

      <h1 style={{
        fontFamily: serif, fontSize: 38, fontWeight: 300,
        color: "#2C2A24", margin: "0 0 8px", lineHeight: 1.2,
      }}>
        Your cross-panel picture
      </h1>
      <p style={{
        fontFamily: sans, fontSize: 13, color: "#9B9891", margin: "0 0 32px",
      }}>
        {panelCount} panel{panelCount === 1 ? "" : "s"} active · {observations.length} observation{observations.length === 1 ? "" : "s"} ·
        {" "}{availablePanels.filter(p => p !== "questionnaire").join(", ") || "No panels yet"}
      </p>

      {/* Hero narrative — AI generated */}
      {panelCount >= 2 && (
        <div style={{
          background: "linear-gradient(135deg, #2C2A24 0%, #3D3B35 100%)",
          borderRadius: 16, padding: "32px 28px", marginBottom: 32,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -40, right: -40, width: 200, height: 200,
            background: "radial-gradient(circle, rgba(184,134,11,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <span style={{
            fontFamily: sans, fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "rgba(184,134,11,0.8)",
            display: "block", marginBottom: 12,
          }}>
            THE STORY YOUR PANELS TELL TOGETHER
          </span>
          {hero ? (
            <>
              <h2 style={{
                fontFamily: serif, fontSize: 24, fontWeight: 400,
                color: "#F5F3EE", margin: "0 0 16px", lineHeight: 1.3,
              }}>
                {hero.headline}
              </h2>
              {hero.paragraphs.map((p, i) => (
                <p key={i} style={{
                  fontFamily: serif, fontSize: 17, color: "rgba(245,243,238,0.9)",
                  lineHeight: 1.75, margin: i < hero.paragraphs.length - 1 ? "0 0 14px" : 0,
                }}
                dangerouslySetInnerHTML={{
                  __html: p.replace(/\*([^*]+)\*/g, '<em style="color: rgba(212,169,52,0.9); font-style: italic;">$1</em>')
                }}
                />
              ))}
            </>
          ) : (
            <p style={{
              fontFamily: serif, fontSize: 18, color: "rgba(245,243,238,0.9)",
              lineHeight: 1.7, margin: 0,
            }}>
              {firstName ? `${firstName}, y` : "Y"}our {availablePanels.filter(p => p !== "questionnaire").join(" and ")} data
              are starting to paint a connected picture.
              {attentionObs.length > 0
                ? ` ${attentionObs.length} cross-panel finding${attentionObs.length === 1 ? "" : "s"} need${attentionObs.length === 1 ? "s" : ""} attention, and ${positiveObs.length} signal${positiveObs.length === 1 ? "" : "s"} are working in your favor.`
                : positiveObs.length > 0
                ? ` ${positiveObs.length} positive signal${positiveObs.length === 1 ? "" : "s"} — your panels are aligned.`
                : " More data will strengthen the connections."
              }
            </p>
          )}
        </div>
      )}

      {/* Action plan */}
      {interventions.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <ActionPlan
            density="full"
            interventions={interventions}
            onEngage={async (id, action, reason) => {
              if (action === "committed") {
                const existing = interventions.find(i => i.id === id)
                if (existing?.state === "committed") {
                  await fetch("/api/interventions/engagement", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interventionId: id }) })
                  window.location.reload()
                  return
                }
              }
              await fetch("/api/interventions/engagement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interventionId: id, action, reason }) })
              window.location.reload()
            }}
          />
        </div>
      )}

      {/* Attention observations */}
      {attentionObs.length > 0 && (
        <>
          <h2 style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#D42B2B", margin: "0 0 16px",
          }}>
            Needs attention ({attentionObs.length})
          </h2>
          {attentionObs.map(obs => <ObservationCard key={obs.id} obs={obs} />)}
        </>
      )}

      {/* Positive observations */}
      {positiveObs.length > 0 && (
        <>
          <h2 style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#1A8C4E", margin: "24px 0 16px",
          }}>
            Working in your favor ({positiveObs.length})
          </h2>
          {positiveObs.map(obs => <ObservationCard key={obs.id} obs={obs} />)}
        </>
      )}

      {/* Other observations (recheck, context) */}
      {otherObs.length > 0 && (
        <>
          <h2 style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#9B9891", margin: "24px 0 16px",
          }}>
            {otherObs.some(o => o.missingData) ? "What would unlock more" : "Additional context"}
          </h2>
          {otherObs.map(obs => <ObservationCard key={obs.id} obs={obs} />)}
        </>
      )}
      <style>{`
        @media (max-width: 640px) {
          .converge-main { padding: 20px 16px 60px !important; }
          .converge-datapoints { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </main>
  )
}

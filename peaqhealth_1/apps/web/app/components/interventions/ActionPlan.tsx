"use client"

import { useState } from "react"
import Link from "next/link"
import type { InterventionWithState } from "../../../lib/interventions/engagements"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const CATEGORY_COLORS: Record<string, string> = {
  professional: "#9B3838",
  behavioral: "#B8935A",
  product: "#4A6485",
  dietary: "#4A7A4A",
  probiotic: "#6B5B8C",
  monitoring: "#8C897F",
}

const EVIDENCE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  strong: { bg: "#2C2A24", border: "none", color: "#F5F3EE" },
  moderate: { bg: "transparent", border: "1px solid #2C2A24", color: "#2C2A24" },
  emerging: { bg: "transparent", border: "1px dashed #8C897F", color: "#8C897F" },
}

function InterventionCard({ item, onEngage }: {
  item: InterventionWithState
  onEngage: (id: string, action: "committed" | "already_doing" | "not_relevant", reason?: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [dismissReason, setDismissReason] = useState("")
  const catColor = CATEGORY_COLORS[item.category] ?? "#8C897F"
  const evStyle = EVIDENCE_STYLE[item.evidence ?? "emerging"] ?? EVIDENCE_STYLE.emerging

  if (item.state === "already_doing") {
    return (
      <div style={{
        background: "#F7FAF4", border: "1px solid #C8D8C0",
        borderRadius: 12, padding: "14px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "#4A7A4A", fontSize: 16 }}>&#10003;</span>
          <span style={{ fontFamily: serif, fontSize: 16, fontWeight: 500, color: "#2C2A24" }}>{item.title}</span>
        </div>
        <p style={{ fontFamily: serif, fontSize: 13.5, fontStyle: "italic", color: "#4A4740", lineHeight: 1.5, margin: 0 }}>
          {item.why}
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: "#FAFAF8", border: "1px solid #D6D3C8",
      borderRadius: 16, padding: "18px 22px", position: "relative", overflow: "hidden",
      transition: "transform 0.15s, box-shadow 0.15s",
      ...(item.state === "committed" ? { boxShadow: "inset 0 0 0 1000px rgba(44,42,36,0.04)" } : {}),
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(44,42,36,0.06)" }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = item.state === "committed" ? "inset 0 0 0 1000px rgba(44,42,36,0.04)" : "none" }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: catColor, opacity: 0.7, borderRadius: "16px 0 0 16px" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: serif, fontSize: 11, fontStyle: "italic", textTransform: "uppercase", color: "#8C897F" }}>
          {item.category}
        </span>
        {item.evidence && (
          <span style={{
            fontFamily: sans, fontSize: 8, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase",
            padding: "2px 8px", borderRadius: 10,
            background: evStyle.bg, border: evStyle.border, color: evStyle.color,
          }}>
            {item.evidence}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: "#2C2A24", margin: "0 0 8px", lineHeight: 1.2 }}>
        {item.title}
      </h3>

      {/* Rationale */}
      <p style={{
        fontFamily: serif, fontSize: 14.5, fontStyle: "italic", color: "#4A4740", lineHeight: 1.5,
        margin: "0 0 12px",
        ...(expanded ? {} : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }),
      }}>
        {item.why}
      </p>

      {!expanded && item.why.length > 150 && (
        <button onClick={() => setExpanded(true)} style={{
          fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#B8935A",
          background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12,
        }}>
          Read more →
        </button>
      )}

      {/* Timing */}
      <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C897F", marginBottom: 14 }}>
        {item.timing}
      </div>

      {/* Footer: engagement buttons or committed state */}
      {item.state === "committed" ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4A7A4A", fontWeight: 500 }}>
            Committed · {new Date(item.committedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <button onClick={() => onEngage(item.id, "committed")} style={{
            fontFamily: sans, fontSize: 10, color: "#8C897F", background: "none", border: "none", cursor: "pointer",
          }}>Undo</button>
        </div>
      ) : dismissing ? (
        <div style={{ borderTop: "1px solid #E8E4D8", paddingTop: 12 }}>
          <p style={{ fontFamily: sans, fontSize: 11, color: "#8C897F", margin: "0 0 8px" }}>Why isn't this for you?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {["I don't have this issue", "I already tried this, didn't work", "My doctor told me to avoid this"].map(r => (
              <button key={r} onClick={() => { onEngage(item.id, "not_relevant", r); setDismissing(false) }} style={{
                fontFamily: sans, fontSize: 11, color: "#2C2A24", background: "#F5F3EE", border: "1px solid #D6D3C8",
                borderRadius: 6, padding: "8px 12px", cursor: "pointer", textAlign: "left",
              }}>{r}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={dismissReason} onChange={e => setDismissReason(e.target.value)} maxLength={140} placeholder="Other reason..." style={{
              flex: 1, fontFamily: sans, fontSize: 11, padding: "6px 10px", border: "1px solid #D6D3C8", borderRadius: 4, background: "#fff",
            }} />
            <button onClick={() => { onEngage(item.id, "not_relevant", dismissReason); setDismissing(false) }} style={{
              fontFamily: sans, fontSize: 10, fontWeight: 500, color: "#8C897F", background: "none", border: "1px solid #D6D3C8", borderRadius: 4, padding: "6px 10px", cursor: "pointer",
            }}>Submit</button>
          </div>
          <button onClick={() => setDismissing(false)} style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", background: "none", border: "none", cursor: "pointer", marginTop: 6 }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => onEngage(item.id, "committed")} style={{
            fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em",
            background: "#2C2A24", color: "#F5F3EE", border: "none", borderRadius: 6,
            padding: "8px 16px", cursor: "pointer",
          }}>I'll try this</button>
          <button onClick={() => onEngage(item.id, "already_doing")} style={{
            fontFamily: sans, fontSize: 11, fontWeight: 500,
            background: "transparent", color: "#2C2A24", border: "1px solid #2C2A24",
            borderRadius: 6, padding: "7px 14px", cursor: "pointer",
          }}>Already doing</button>
          <button onClick={() => setDismissing(true)} style={{
            fontFamily: sans, fontSize: 10, color: "#8C897F", background: "none", border: "none", cursor: "pointer", marginLeft: "auto",
          }}>Not relevant</button>
        </div>
      )}

      {item.markerLink && expanded && (
        <Link href={item.markerLink} style={{ fontFamily: sans, fontSize: 11, color: "#B8935A", display: "block", marginTop: 10 }}>
          See related marker →
        </Link>
      )}
    </div>
  )
}

interface ActionPlanProps {
  density: "compact" | "full"
  interventions: InterventionWithState[]
  onEngage: (id: string, action: "committed" | "already_doing" | "not_relevant", reason?: string) => void
}

export function ActionPlan({ density, interventions, onEngage }: ActionPlanProps) {
  const [showAll, setShowAll] = useState(false)
  const [showAffirmations, setShowAffirmations] = useState(false)

  const actionable = interventions.filter(i => i.state === "actionable")
  const committed = interventions.filter(i => i.state === "committed")
  const affirmations = interventions.filter(i => i.state === "already_doing")
  const allActive = [...actionable, ...committed]

  const displayCount = density === "compact" ? 3 : showAll ? allActive.length : 3
  const displayed = allActive.slice(0, displayCount)
  const remaining = allActive.length - displayCount

  if (interventions.length === 0) {
    return (
      <div style={{ background: "#FAFAF8", border: "1px solid #D6D3C8", borderRadius: 12, padding: "20px 24px" }}>
        <p style={{ fontFamily: serif, fontSize: density === "compact" ? 14 : 16, fontStyle: "italic", color: "#8C897F", margin: 0 }}>
          Your action plan will appear here once your sample is processed and you've completed the questionnaire.
        </p>
      </div>
    )
  }

  if (allActive.length === 0 && affirmations.length > 0) {
    return (
      <div>
        <h2 style={{ fontFamily: serif, fontSize: density === "compact" ? 18 : 24, fontStyle: "italic", color: "#2C2A24", margin: "0 0 12px" }}>
          Your action plan
        </h2>
        <p style={{ fontFamily: sans, fontSize: 13, color: "#4A7A4A", marginBottom: 16 }}>
          Your oral data looks good across the board. Here is what you are doing right:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {affirmations.map(a => <InterventionCard key={a.id} item={a} onEngage={onEngage} />)}
        </div>
      </div>
    )
  }

  return (
    <div id="plan">
      <h2 style={{ fontFamily: serif, fontSize: density === "compact" ? 18 : 24, fontStyle: "italic", color: "#2C2A24", margin: "0 0 4px" }}>
        Your action plan
      </h2>
      {density === "full" && (
        <p style={{ fontFamily: sans, fontSize: 12, color: "#8C897F", margin: "0 0 16px" }}>
          {allActive.length} thing{allActive.length !== 1 ? "s" : ""} to address{affirmations.length > 0 ? `, ${affirmations.length} thing${affirmations.length !== 1 ? "s" : ""} you're doing right` : ""}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {displayed.map(item => <InterventionCard key={item.id} item={item} onEngage={onEngage} />)}
      </div>

      {remaining > 0 && density === "compact" && (
        <Link href="/dashboard/converge#plan" style={{
          fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#B8935A",
          display: "block", marginTop: 12, textDecoration: "none",
        }}>
          See {remaining} more →
        </Link>
      )}

      {remaining > 0 && density === "full" && !showAll && (
        <button onClick={() => setShowAll(true)} style={{
          fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#B8935A",
          background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 12,
        }}>
          Show all {allActive.length} actionable →
        </button>
      )}

      {density === "full" && affirmations.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button onClick={() => setShowAffirmations(o => !o)} style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "#4A7A4A", background: "none", border: "none", cursor: "pointer", padding: 0,
          }}>
            Already doing ({affirmations.length}) {showAffirmations ? "↑" : "↓"}
          </button>
          {showAffirmations && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {affirmations.map(a => <InterventionCard key={a.id} item={a} onEngage={onEngage} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

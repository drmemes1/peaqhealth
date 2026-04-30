"use client"

import { useState } from "react"
import type { GuidanceCard as GuidanceCardType, GoodMetric } from "../../../lib/guidanceService"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

// ── Status badge colors ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  attention: { bg: "#FCEBEB", color: "#791F1F" },
  watch:     { bg: "#FAEEDA", color: "#633806" },
}

// ── Guidance Card ──────────────────────────────────────────────────────────

export function GuidanceCard({ card }: { card: GuidanceCardType }) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const [scienceOpen, setScienceOpen] = useState(false)

  const statusStyle = STATUS_STYLES[card.status] ?? STATUS_STYLES.watch

  const toggleActions = () => {
    setActionsOpen(o => !o)
    if (!actionsOpen) setScienceOpen(false)
  }
  const toggleScience = () => {
    setScienceOpen(o => !o)
    if (!scienceOpen) setActionsOpen(false)
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: "0.5px solid rgba(0,0,0,0.06)",
      overflow: "hidden", marginBottom: 16,
    }}>
      {/* ── Strip: metric name + status + reading ──────────────────────── */}
      <div style={{ padding: "18px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{
            fontFamily: sans, fontSize: 13, fontWeight: 500,
            color: "#1a1a18",
          }}>
            {card.metricName}
          </span>
          <span style={{
            fontFamily: sans, fontSize: 10, fontWeight: 500,
            letterSpacing: "0.5px", textTransform: "uppercase",
            background: statusStyle.bg, color: statusStyle.color,
            borderRadius: 20, padding: "3px 10px",
          }}>
            {card.status}
          </span>
        </div>
        <span style={{ fontFamily: sans, fontSize: 12, color: "#bbb" }}>
          {card.reading}
        </span>
      </div>

      {/* ── Primary action (the one thing) ─────────────────────────────── */}
      <div style={{
        padding: "16px 20px",
        borderTop: "0.5px solid rgba(0,0,0,0.04)",
      }}>
        <span style={{
          fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#C49A3C",
          display: "block", marginBottom: 8,
        }}>
          What to do
        </span>
        <p style={{
          fontFamily: sans, fontSize: 16, fontWeight: 500,
          color: "#1a1a18", lineHeight: 1.4, margin: "0 0 6px",
        }}>
          {card.primaryAction}
        </p>
        <p style={{
          fontFamily: sans, fontSize: 12, color: "#888",
          lineHeight: 1.5, margin: 0,
        }}>
          {card.primaryWhy}
        </p>
      </div>

      {/* ── Cleaning note (periodontal only) ────────────────────────────── */}
      {card.cleaningNote?.show && (
        <div style={{
          background: "#F6F4EF", borderRadius: 8,
          margin: "0 18px 14px", padding: "14px 16px",
        }}>
          {/* Regular cleaning */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C49A3C", flexShrink: 0 }} />
              <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#1a1a18" }}>
                {card.cleaningNote.regularTitle}
              </span>
            </div>
            <p style={{ fontFamily: sans, fontSize: 11, color: "#888", lineHeight: 1.5, margin: "0 0 2px", paddingLeft: 12 }}>
              {card.cleaningNote.regularDesc}
            </p>
            <p style={{ fontFamily: sans, fontSize: 10, color: "#C49A3C", margin: 0, paddingLeft: 12 }}>
              {card.cleaningNote.regularWhen}
            </p>
          </div>

          {/* Deep cleaning */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A32D2D", flexShrink: 0 }} />
              <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, color: "#1a1a18" }}>
                {card.cleaningNote.deepTitle}
              </span>
            </div>
            <p style={{ fontFamily: sans, fontSize: 11, color: "#888", lineHeight: 1.5, margin: "0 0 2px", paddingLeft: 12 }}>
              {card.cleaningNote.deepDesc}
            </p>
            <p style={{ fontFamily: sans, fontSize: 10, color: "#A32D2D", margin: 0, paddingLeft: 12 }}>
              {card.cleaningNote.deepWhen}
            </p>
          </div>
        </div>
      )}

      {/* ── Cross-panel note ────────────────────────────────────────────── */}
      {card.crossPanelNote && (
        <div style={{
          background: "#FDF8F0",
          borderTop: "0.5px solid #F5EFE0",
          padding: "12px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#C49A3C", flexShrink: 0, marginTop: 5,
            }} />
            <p style={{
              fontFamily: sans, fontSize: 12, color: "#7a7060",
              lineHeight: 1.55, margin: 0,
            }}>
              {card.crossPanelNote}
            </p>
          </div>
        </div>
      )}

      {/* ── Toggle buttons ──────────────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        borderTop: "0.5px solid rgba(0,0,0,0.06)",
      }}>
        <button onClick={toggleActions} style={{
          fontFamily: sans, fontSize: 11, color: "#888",
          background: "none", border: "none", borderRight: "0.5px solid rgba(0,0,0,0.06)",
          padding: "12px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "background 150ms ease",
        }}>
          <span>{actionsOpen ? "Fewer actions" : "More actions"}</span>
          <span style={{
            display: "inline-block", fontSize: 10,
            transform: actionsOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}>
            ▼
          </span>
        </button>
        <button onClick={toggleScience} style={{
          fontFamily: sans, fontSize: 11, color: "#888",
          background: "none", border: "none",
          padding: "12px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "background 150ms ease",
        }}>
          <span>{scienceOpen ? "Hide science" : "The science"}</span>
          <span style={{
            display: "inline-block", fontSize: 10,
            transform: scienceOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}>
            ▼
          </span>
        </button>
      </div>

      {/* ── Actions panel (layer 2) ─────────────────────────────────────── */}
      <div style={{
        maxHeight: actionsOpen ? 600 : 0,
        overflow: "hidden",
        transition: "max-height 350ms cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{
          padding: "16px 20px",
          borderTop: "0.5px solid rgba(0,0,0,0.04)",
        }}>
          {/* Primary action as #1 */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <span style={{ fontFamily: serif, fontSize: 20, color: "#C49A3C", lineHeight: 1, minWidth: 20 }}>1</span>
            <div>
              <p style={{ fontFamily: sans, fontSize: 13, color: "#333", lineHeight: 1.5, margin: "0 0 2px" }}>
                {card.primaryAction}
              </p>
              <span style={{ fontFamily: sans, fontSize: 10, color: "#bbb" }}>Today</span>
            </div>
          </div>

          {card.moreActions.map(a => (
            <div key={a.rank} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <span style={{ fontFamily: serif, fontSize: 20, color: "#C49A3C", lineHeight: 1, minWidth: 20 }}>{a.rank}</span>
              <div>
                <p style={{ fontFamily: sans, fontSize: 13, color: "#333", lineHeight: 1.5, margin: "0 0 2px" }}>
                  {a.action}
                </p>
                <span style={{ fontFamily: sans, fontSize: 10, color: "#bbb" }}>{a.timing}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Science panel (layer 3) ─────────────────────────────────────── */}
      <div style={{
        maxHeight: scienceOpen ? 1200 : 0,
        overflow: "hidden",
        transition: "max-height 350ms cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{
          padding: "16px 20px",
          background: "#FAFAFA",
          borderTop: "0.5px solid rgba(0,0,0,0.04)",
        }}>
          {card.science.map((s, i) => (
            <div key={i} style={{ marginBottom: i < card.science.length - 1 ? 16 : 0 }}>
              <span style={{
                fontFamily: sans, fontSize: 10, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#bbb",
                display: "block", marginBottom: 6,
              }}>
                {s.label}
              </span>
              <p style={{
                fontFamily: sans, fontSize: 12, color: "#666",
                lineHeight: 1.65, margin: "0 0 4px",
              }}>
                {s.body}
              </p>
              {s.citation && (
                <span style={{
                  fontFamily: sans, fontSize: 10, fontStyle: "italic",
                  color: "#bbb",
                }}>
                  {s.citation}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Good Metric Card ───────────────────────────────────────────────────────

export function GoodMetricCard({ metric }: { metric: GoodMetric }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 10,
      border: "0.5px solid rgba(0,0,0,0.06)",
      padding: "14px 18px", marginBottom: 8,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: sans, fontSize: 13, fontWeight: 500,
          color: "#1a1a18", display: "block", marginBottom: 2,
        }}>
          {metric.name}
        </span>
        <span style={{
          fontFamily: sans, fontSize: 11, color: "#888",
          lineHeight: 1.4,
        }}>
          {metric.note}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{
          fontFamily: serif, fontSize: 20, fontWeight: 400,
          color: "#1a1a18",
        }}>
          {metric.value}
        </span>
        <span style={{
          fontFamily: sans, fontSize: 9, fontWeight: 500,
          letterSpacing: "0.5px", textTransform: "uppercase",
          background: "#E1F5EE", color: "#085041",
          borderRadius: 20, padding: "3px 8px",
          whiteSpace: "nowrap",
        }}>
          Good
        </span>
      </div>
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────

export function GuidanceCardSkeleton() {
  return (
    <div style={{
      background: "#F0EEE8", borderRadius: 14,
      height: 220, marginBottom: 16,
      animation: "shimmer 1.8s ease-in-out infinite",
    }} />
  )
}

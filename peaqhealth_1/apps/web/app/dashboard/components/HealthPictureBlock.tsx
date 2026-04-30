"use client"

import Link from "next/link"
import type { ConvergeObservation } from "../../../lib/converge/observations"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const SEVERITY_DOT: Record<string, string> = {
  positive: "#1A8C4E",
  watch: "#E07B00",
  attention: "#D42B2B",
  recheck: "#B8860B",
  context: "#9B9891",
}

export interface HealthPictureBlockProps {
  observations: ConvergeObservation[]
  panelsActive: { oral: boolean; blood: boolean; sleep: boolean }
  updatedAt: string | null
  speciesCount?: number | null
}

export function HealthPictureBlock({ observations, panelsActive, updatedAt, speciesCount }: HealthPictureBlockProps) {
  const top3 = observations.slice(0, 3)
  const attentionCount = observations.filter(o => o.severity === "attention" || o.severity === "watch").length
  const hasAnyPanel = panelsActive.oral || panelsActive.blood || panelsActive.sleep

  const activePanelNames = [
    panelsActive.oral && "oral",
    panelsActive.blood && "blood",
    panelsActive.sleep && "sleep",
  ].filter(Boolean)

  const dateStr = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null

  const badgeText = !hasAnyPanel
    ? "Waiting for markers"
    : attentionCount > 0
    ? `${attentionCount} signal${attentionCount === 1 ? "" : "s"} need attention`
    : "All clear"

  const badgeDot = !hasAnyPanel ? "#9B9891" : attentionCount > 0 ? "#E07B00" : "#1A8C4E"

  return (
    <div className="health-picture-block" style={{ display: "flex", gap: 16, marginBottom: 36 }}>

      {/* LEFT — Species Found dark card */}
      <Link href="/dashboard/oral" className="species-card" style={{
        flex: "0 0 200px", borderRadius: 16, overflow: "hidden",
        position: "relative", textDecoration: "none", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: 240,
        boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
        border: "0.5px solid #EDE9E0",
      }}>
        <video src="/bac_moving.mp4" autoPlay loop muted playsInline style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", filter: "blur(2px) brightness(0.35)",
        }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: 24 }}>
          <span style={{
            fontFamily: sans, fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.6)",
            display: "block", marginBottom: 12,
          }}>
            SPECIES FOUND
          </span>
          <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 12px" }}>
            <svg viewBox="0 0 96 96" style={{ width: 96, height: 96, transform: "rotate(-90deg)" }}>
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
              <circle cx="48" cy="48" r="40" fill="none" stroke="#2D6A4F" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(1, (speciesCount ?? 0) / 200))}`}
                style={{ filter: "drop-shadow(0 0 6px #2D6A4F)", transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <span style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 36, fontWeight: 300, color: "#FFFFFF",
              letterSpacing: -1,
            }}>
              {speciesCount ?? "—"}
            </span>
          </div>
          <span style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {speciesCount ? "unique bacteria detected" : "Order kit to discover"}
          </span>
        </div>
      </Link>

      {/* RIGHT — Your Health Picture */}
      <div style={{
        flex: 1, background: "#FAFAF8", border: "1px solid #E8E6E0",
        borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
            <span style={{
              fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#B8860B", fontWeight: 500,
            }}>
              YOUR HEALTH PICTURE
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: sans, fontSize: 12, color: "#6B6762",
              background: "#F0EDE6", padding: "5px 12px", borderRadius: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: badgeDot }} />
              {badgeText}
            </span>
          </div>
          {dateStr && (
            <p style={{ fontFamily: sans, fontSize: 12, color: "#9B9891", margin: 0 }}>
              Updated {dateStr} · Based on your latest {activePanelNames.join(", ") || "data"}
            </p>
          )}
        </div>

        {/* Observation rows */}
        <div style={{ flex: 1 }}>
          {top3.length === 0 ? (
            <p style={{
              fontFamily: sans, fontSize: 13, color: "#7A7A6E",
              padding: "0 24px 20px", margin: 0,
            }}>
              Connect more panels to surface cross-panel signals.
            </p>
          ) : (
            top3.map((obs, i) => (
              <Link
                key={obs.id}
                href={`/dashboard/converge#${obs.id}`}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "14px 24px",
                  borderTop: "1px solid #F5F3EE",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#F5F3EE" }}
                onMouseLeave={e => { e.currentTarget.style.background = "" }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: SEVERITY_DOT[obs.severity] ?? "#9B9891",
                    flexShrink: 0, marginTop: 7,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: sans, fontSize: 14, fontWeight: 500, color: "#2C2A24",
                      margin: "0 0 3px", lineHeight: 1.4,
                    }}>
                      {obs.title}
                    </p>
                    <p style={{
                      fontFamily: sans, fontSize: 13, color: "#7A7870",
                      lineHeight: 1.5, margin: 0,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {obs.oneLiner}
                    </p>
                  </div>
                  <span style={{
                    color: "#B8860B", fontSize: 14, flexShrink: 0,
                    fontWeight: 500, marginTop: 3,
                  }}>→</span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: "#F5F3EE", padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {[
              { label: "Oral", color: "#2D6A4F", active: panelsActive.oral },
              { label: "Blood", color: "#C0392B", active: panelsActive.blood },
              { label: "Sleep", color: "#4A7FB5", active: panelsActive.sleep },
            ].map(p => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: p.active ? p.color : "#D1CFC7",
                }} />
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: p.active ? p.color : "#9B9891",
                  fontWeight: 500,
                }}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/converge" style={{
            fontFamily: sans, fontSize: 13, color: "#B8860B",
            textDecoration: "none", fontWeight: 500,
          }}>
            See full picture →
          </Link>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .health-picture-block {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .species-card {
            flex: 0 0 auto !important;
            min-height: 100px !important;
            max-height: 120px !important;
            flex-direction: row !important;
            padding: 16px 20px !important;
          }
          .species-card > video {
            border-radius: 16px;
          }
          .species-card > div {
            flex-direction: row !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 12px 16px !important;
          }
        }
      `}</style>
    </div>
  )
}

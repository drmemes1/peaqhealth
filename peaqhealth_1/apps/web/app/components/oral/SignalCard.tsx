"use client"

import type { SubInsight } from "../../../lib/oral/subInsights"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

type Status = "strong" | "watch" | "attention" | "strong-with-note"

const ACCENT: Record<string, string> = {
  strong: "#4A7A4A",
  watch: "#B8860B",
  attention: "#9B3838",
  "strong-with-note": "#4A7A4A",
}

const BADGE_BG: Record<string, string> = {
  strong: "rgba(74,122,74,0.1)",
  watch: "rgba(184,134,11,0.1)",
  attention: "rgba(155,56,56,0.08)",
  "strong-with-note": "rgba(74,122,74,0.1)",
}

const BADGE_TEXT: Record<string, string> = {
  strong: "#3A6A3A",
  watch: "#946F1B",
  attention: "#9B3838",
  "strong-with-note": "#3A6A3A",
}

const STATUS_LABEL: Record<string, string> = {
  strong: "Strong",
  watch: "Watch",
  attention: "Attention",
  "strong-with-note": "Strong",
}

export interface SignalCardProps {
  status: Status
  variant?: "default" | "sleep-tint" | "synthesis"
  eyebrow: string
  title: string
  value: string | number
  valueUnit?: string
  statusLabel?: string
  primaryRead: string
  secondaryRead?: string
  subInsight?: SubInsight | null
  chips?: { label: string; flagged?: boolean; href?: string }[]
  confidenceDots?: { label: string; filled: boolean }[]
  sources?: string
  children?: React.ReactNode
}

export function SignalCard({ status, variant, eyebrow, title, value, valueUnit, statusLabel, primaryRead, secondaryRead, subInsight, chips, confidenceDots, sources, children }: SignalCardProps) {
  const effectiveStatus = subInsight ? "strong-with-note" : status
  const accent = ACCENT[effectiveStatus]
  const isSleep = variant === "sleep-tint"

  const cardBg = isSleep
    ? "linear-gradient(135deg, rgba(168,191,212,0.10) 0%, rgba(168,191,212,0.03) 100%), #FAFAF8"
    : "#FAFAF8"
  const borderColor = isSleep ? "#D8E3EE" : "#D6D3C8"
  const hoverShadow = isSleep ? "0 6px 20px rgba(46,62,92,0.12)" : "0 6px 20px rgba(44,42,36,0.08)"

  return (
    <div
      className="oral-signal-card"
      style={{
        background: cardBg, border: `1px solid ${borderColor}`,
        borderRadius: 16, overflow: "hidden", marginBottom: 16,
        position: "relative",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = hoverShadow }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none" }}
    >
      {/* Left accent stripe */}
      {effectiveStatus === "strong-with-note" ? (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, height: "60%", width: 3, background: "#4A7A4A", borderRadius: "16px 0 0 0" }} />
          <div style={{ position: "absolute", left: 0, bottom: 0, height: "40%", width: 3, background: "#B8860B", borderRadius: "0 0 0 16px" }} />
        </>
      ) : (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent, opacity: 0.8, borderRadius: "16px 0 0 16px" }} />
      )}

      {/* Moon decoration for sleep-tint */}
      {isSleep && (
        <div style={{
          position: "absolute", top: 16, right: 20, width: 36, height: 36,
          borderRadius: "50%", opacity: 0.08,
          background: "radial-gradient(circle at 35% 35%, #FAFCFE 0%, #7A95B5 100%)",
          pointerEvents: "none",
        }} />
      )}

      <div style={{ padding: "24px 28px 20px", position: "relative" }}>
        {/* Eyebrow + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{
            fontFamily: sans, fontSize: 10, fontWeight: 600,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: isSleep ? "#4A6485" : "#8C897F",
          }}>
            {eyebrow}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{
              fontFamily: sans, fontSize: 9, fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase",
              background: BADGE_BG[effectiveStatus], color: BADGE_TEXT[effectiveStatus],
              padding: "3px 10px", borderRadius: 20,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent }} />
              {statusLabel ?? STATUS_LABEL[effectiveStatus]}
            </span>
            {effectiveStatus === "strong-with-note" && (
              <span style={{
                fontFamily: sans, fontSize: 9, fontWeight: 600,
                letterSpacing: "0.12em", textTransform: "uppercase",
                background: "rgba(184,134,11,0.1)", color: "#946F1B",
                padding: "3px 10px", borderRadius: 20,
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#B8860B" }} />
                One to notice
              </span>
            )}
          </div>
        </div>

        {/* Title + value row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, gap: 16 }}>
          <h3 style={{
            fontFamily: serif, fontSize: 26, fontWeight: 500,
            letterSpacing: "-0.01em", margin: 0, lineHeight: 1.2,
            color: isSleep ? "#2E3E5C" : "#2C2A24",
          }}>
            {title}
          </h3>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span style={{
              fontFamily: serif, fontSize: 32, fontWeight: 500,
              color: isSleep ? "#2E3E5C" : "#2C2A24",
              lineHeight: 1, letterSpacing: "-0.02em",
            }}>
              {value}
            </span>
            {valueUnit && (
              <span style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: "#8C897F", marginLeft: 3 }}>{valueUnit}</span>
            )}
          </div>
        </div>

        {/* Primary read */}
        <p style={{
          fontFamily: serif, fontSize: 16, lineHeight: 1.6,
          color: isSleep ? "#2E3E5C" : "#4A4740",
          margin: "0 0 8px", maxWidth: 600,
        }}>
          {primaryRead}
        </p>

        {secondaryRead && (
          <p style={{
            fontFamily: sans, fontSize: 12, color: "#8C897F",
            lineHeight: 1.5, margin: "0 0 8px",
          }}>
            {secondaryRead}
          </p>
        )}

        {/* Confidence dots (synthesis variant) */}
        {confidenceDots && confidenceDots.length > 0 && (
          <div style={{ display: "flex", gap: 14, marginTop: 12, marginBottom: 4 }}>
            {confidenceDots.map((d, i) => (
              <span key={i} style={{
                fontFamily: sans, fontSize: 10, color: d.filled ? "#2C2A24" : "#B0ADA4",
                display: "inline-flex", alignItems: "center", gap: 4,
                fontWeight: d.filled ? 500 : 400,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: d.filled ? "#2C2A24" : "#D6D3C8",
                }} />
                {d.label}
              </span>
            ))}
          </div>
        )}

        {/* Sources */}
        {sources && (
          <p style={{
            fontFamily: sans, fontSize: 10, fontStyle: "italic",
            color: "#A8A59B", margin: "8px 0 0",
          }}>
            {sources}
          </p>
        )}
      </div>

      {/* Sub-insight callout */}
      {subInsight && (
        <div style={{
          margin: "0 20px 16px",
          padding: "14px 18px",
          background: "rgba(184,134,11,0.06)",
          border: "1px solid rgba(184,134,11,0.15)",
          borderLeft: "3px solid #B8860B",
          borderRadius: "0 10px 10px 0",
        }}>
          <span style={{
            fontFamily: sans, fontSize: 9, fontWeight: 600,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "#946F1B", display: "block", marginBottom: 6,
          }}>
            {subInsight.calloutTitle}
          </span>
          <p style={{
            fontFamily: serif, fontSize: 15, fontStyle: "italic",
            lineHeight: 1.55, color: "#4A4740", margin: 0,
          }}>
            {subInsight.calloutBody}
          </p>
        </div>
      )}

      {/* Bacterial chips */}
      {chips && chips.length > 0 && (
        <div style={{
          padding: "0 28px 18px",
          display: "flex", flexWrap: "wrap", gap: 6,
        }}>
          {chips.map((chip, i) => (
            <span key={i} style={{
              fontFamily: serif, fontSize: 13, fontStyle: "italic",
              color: chip.flagged ? "#946F1B" : "#B8935A",
              background: chip.flagged ? "rgba(184,134,11,0.08)" : "rgba(184,147,90,0.08)",
              border: `1px solid ${chip.flagged ? "rgba(184,134,11,0.2)" : "rgba(184,147,90,0.15)"}`,
              padding: "4px 10px", borderRadius: 20,
              display: "inline-flex", alignItems: "center", gap: 4,
              cursor: chip.href ? "pointer" : "default",
            }}>
              {chip.label}
              {chip.flagged && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#B8860B" }} />}
            </span>
          ))}
        </div>
      )}

      {children}
    </div>
  )
}

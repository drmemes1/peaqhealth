"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

type Variant = "default" | "mechanism" | "methodology" | "caution"

const VARIANT_STYLES: Record<Variant, { bg: string; border: string }> = {
  default: { bg: "rgba(184,147,90,0.06)", border: "#B8935A" },
  mechanism: { bg: "#F0EBDB", border: "#B8935A" },
  methodology: { bg: "rgba(168,191,212,0.08)", border: "#4A6485" },
  caution: { bg: "rgba(184,146,60,0.08)", border: "#B8923C" },
}

export function WhatThisMeans({ variant = "default", label, children, citation, citationUrl }: {
  variant?: Variant
  label?: string
  children: React.ReactNode
  citation?: string
  citationUrl?: string
}) {
  const style = VARIANT_STYLES[variant]
  const eyebrow = label ?? "What this means"

  return (
    <div style={{
      padding: "20px 24px",
      background: style.bg,
      borderRadius: 12,
      borderLeft: `3px solid ${style.border}`,
    }}>
      <div style={{
        fontFamily: sans, fontSize: 9, letterSpacing: "0.16em",
        textTransform: "uppercase", color: style.border,
        fontWeight: 600, marginBottom: 8,
      }}>
        {eyebrow}
      </div>
      <div style={{
        fontFamily: serif, fontStyle: "italic", fontSize: 16,
        lineHeight: 1.55, color: "#3A3830",
      }}>
        {children}
        {citation && (
          <span style={{ fontFamily: sans, fontSize: 12, fontStyle: "normal", color: "#8C897F", marginLeft: 6 }}>
            {citationUrl ? <a href={citationUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#8C897F", textDecoration: "none" }}>{citation}</a> : citation}
          </span>
        )}
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function ExploreHint() {
  return (
    <Link href="/explore" style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        background: "#F4F1E8", border: "1px solid #E8E4D8",
        borderRadius: 14, padding: "20px 24px",
        marginTop: 32,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#B8935A"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(44,42,36,0.06)" }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8E4D8"; e.currentTarget.style.boxShadow = "none" }}
      >
        <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#B8935A", display: "block", marginBottom: 6 }}>
          EXPLORE YOUR BACTERIA
        </span>
        <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: "#2C2A24", margin: "0 0 4px" }}>
          Dive deeper into individual species
        </p>
        <p style={{ fontFamily: sans, fontSize: 13, color: "#8C897F", margin: 0 }}>
          Browse your full bacterial library with species-level detail, research context, and cross-panel connections.
        </p>
      </div>
    </Link>
  )
}

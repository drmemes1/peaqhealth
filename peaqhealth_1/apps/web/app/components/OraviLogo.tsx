"use client"

import { useState } from "react"
import { OraviMark } from "./OraviMark"

const OraviLogo = ({
  size = "md",
  showTagline = true,
  dark = false,
  onClick,
}: {
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
  dark?: boolean
  onClick?: () => void
}) => {
  const [hovered, setHovered] = useState(false)

  const sizes = {
    sm: { height: 24, tagline: "9px" },
    md: { height: 32, tagline: "11px" },
    lg: { height: 48, tagline: "13px" },
  }
  const h = sizes[size].height

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        cursor: onClick ? "pointer" : "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div style={{ position: "relative", height: h, display: "inline-flex", alignItems: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            opacity: hovered ? 0 : 1,
            transition: "opacity 0.35s ease",
            // Dark variant inverts source colors, then screen-blends so the
            // (now-light) wordmark sits on a dark background without the
            // surrounding white-now-black halo. Light variant multiplies so
            // the white source background drops into the cream / paper page.
            filter: dark ? "invert(1)" : undefined,
          }}
        >
          <OraviMark height={h} blend={dark ? "screen" : "multiply"} />
        </span>

        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: h,
            display: "flex",
            alignItems: "center",
            fontFamily: "var(--font-manrope, sans-serif)",
            fontSize: Math.round(h * 0.7),
            fontWeight: 700,
            color: dark ? "rgba(250,250,248,0.9)" : "var(--ink)",
            letterSpacing: "-0.02em",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.35s ease 0.1s",
            whiteSpace: "nowrap",
          }}
        >
          converge
        </span>
      </div>

      {showTagline && (
        <p
          style={{
            fontSize: sizes[size].tagline,
            letterSpacing: "0.15em",
            color: dark ? "rgba(250,250,248,0.5)" : "#9B9891",
            textTransform: "lowercase",
            marginTop: "6px",
            marginBottom: 0,
            opacity: hovered ? 1 : 0.5,
            transition: "opacity 0.35s ease 0.15s",
            fontFamily: "Instrument Sans, sans-serif",
          }}
        >
          we fill in the gaps
        </p>
      )}
    </div>
  )
}

export default OraviLogo

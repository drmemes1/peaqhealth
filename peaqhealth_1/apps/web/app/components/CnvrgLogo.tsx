"use client"

import { useState } from "react"

const CnvrgLogo = ({
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
    sm: { height: "24px", tagline: "9px" },
    md: { height: "36px", tagline: "11px" },
    lg: { height: "56px", tagline: "13px" },
  }

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
      <div style={{ position: "relative", height: sizes[size].height }}>
        <img
          src="/cnvrg-logo.png"
          alt="Cnvrg"
          style={{
            height: sizes[size].height,
            opacity: hovered ? 0 : 1,
            transition: "opacity 0.35s ease",
            filter: dark ? "invert(1)" : undefined,
          }}
        />

        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: sizes[size].height,
            display: "flex",
            alignItems: "center",
            fontFamily: "var(--font-display, Cormorant Garamond), serif",
            fontSize: `calc(${sizes[size].height} * 0.85)`,
            fontWeight: 500,
            color: dark ? "rgba(250,250,248,0.9)" : "#1a1a1a",
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

export default CnvrgLogo

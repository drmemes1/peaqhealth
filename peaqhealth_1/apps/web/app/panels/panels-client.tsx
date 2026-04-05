"use client"

import Link from "next/link"
import { AuthLayout } from "../components/auth-layout"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "-apple-system, BlinkMacSystemFont, sans-serif"

const PANELS = [
  {
    key: "blood",
    label: "Blood",
    color: "#A32D2D",
    bg: "#FCEBEB",
    text: "#791F1F",
    href: "/panels/blood",
    description:
      "40+ biomarkers from your bloodwork — cardiovascular, metabolic, inflammatory, and organ function markers scored against clinical thresholds.",
    source: "LabCorp · Quest · Any standard lab",
    score: "/ 40 pts",
  },
  {
    key: "sleep",
    label: "Sleep",
    color: "#185FA5",
    bg: "#E6F1FB",
    text: "#0C447C",
    href: "/panels/sleep",
    description:
      "Nightly deep sleep, HRV, SpO\u2082, REM, and sleep efficiency — synced from your wearable and scored against age-adjusted clinical targets.",
    source: "WHOOP · Oura · Garmin",
    score: "/ 30 pts",
  },
  {
    key: "oral",
    label: "Oral Microbiome",
    color: "#3B6D11",
    bg: "#EAF3DE",
    text: "#27500A",
    href: "/panels/oral",
    description:
      "16S rRNA species-level sequencing of your oral microbiome — Shannon diversity, nitrate reducers, periodontal pathogens, and OSA-associated taxa.",
    source: "Zymo Research 16S rRNA",
    score: "/ 30 pts",
  },
]

export function PanelsClient({ initials }: { initials: string }) {
  return (
    <AuthLayout pageId="panels" initials={initials}>
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
        <h1
          style={{
            fontFamily: serif,
            fontSize: 36,
            fontWeight: 300,
            color: "#1a1a18",
            margin: "0 0 8px",
          }}
        >
          Panels
        </h1>
        <p
          style={{
            fontFamily: sans,
            fontSize: 14,
            color: "#999",
            lineHeight: 1.7,
            margin: "0 0 40px",
            maxWidth: 480,
          }}
        >
          Your Peaq score is built from three biological panels. Each measures a different
          system — together they reveal what no single test can see.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PANELS.map((p) => (
            <Link
              key={p.key}
              href={p.href}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
                borderRadius: 10,
                border: "0.5px solid rgba(0,0,0,0.08)",
                borderLeft: `3px solid ${p.color}`,
                background: "#fff",
                padding: "20px 24px",
                transition: "transform 150ms ease, box-shadow 150ms ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = "translateY(-2px)"
                el.style.boxShadow = `0 8px 24px rgba(0,0,0,0.06), 0 0 0 1.5px ${p.color}`
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = ""
                el.style.boxShadow = ""
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: p.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: sans,
                      fontSize: 15,
                      fontWeight: 500,
                      color: "#1a1a18",
                    }}
                  >
                    {p.label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: serif,
                    fontSize: 14,
                    color: "#bbb",
                  }}
                >
                  {p.score}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  fontFamily: sans,
                  fontSize: 13,
                  color: "#999",
                  lineHeight: 1.6,
                  margin: "0 0 10px",
                }}
              >
                {p.description}
              </p>

              {/* Source badge */}
              <span
                style={{
                  fontFamily: sans,
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: p.text,
                  background: p.bg,
                  padding: "2px 8px 2px 6px",
                  borderRadius: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: p.color,
                  }}
                />
                {p.source}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </AuthLayout>
  )
}

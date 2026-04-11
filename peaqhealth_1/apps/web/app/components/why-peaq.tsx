"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

// ── Brand tokens (spec-locked — see BRAND.md) ────────────────────────────────
const INK         = "#141410"
const OFF_WHITE   = "#FAFAF8"
const GOLD        = "#B8860B"
const ORAL_GREEN  = "#2D6A4F"
const AMBER       = "#92650A"

const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif"
const FONT_BODY    = "'Instrument Sans', system-ui, sans-serif"

// ── Data ─────────────────────────────────────────────────────────────────────
type Mark = "yes" | "partial" | "no"
type Row  = { label: string; sub: string; cells: [Mark, Mark, Mark, Mark] }

const ROWS: Row[] = [
  { label: "Oral microbiome",           sub: "16S sequencing, species-level",     cells: ["yes", "no",      "no",      "yes"    ] },
  { label: "Blood biomarkers",          sub: "Lipids, glucose, inflammation",     cells: ["yes", "yes",     "partial", "no"     ] },
  { label: "Nightly sleep data",        sub: "HRV, REM, deep sleep, RHR",        cells: ["yes", "no",      "yes",     "no"     ] },
  { label: "Cross-panel insights",      sub: "All three connected in one score",  cells: ["yes", "no",      "no",      "no"     ] },
  { label: "Dentist-led expertise",     sub: "Clinical oral-systemic knowledge",  cells: ["yes", "no",      "no",      "no"     ] },
  { label: "Personalised action plan",  sub: "Plain English, no jargon",          cells: ["yes", "partial", "partial", "partial"] },
]

const COLUMNS: { full: string; short: string; sub: string }[] = [
  { full: "Peaq",          short: "Peaq",     sub: "All three, connected" },
  { full: "Blood testing", short: "Blood",    sub: "Labs & biomarkers"    },
  { full: "Wearables",     short: "Wearable", sub: "Oura, WHOOP, Apple"   },
  { full: "Oral tests",    short: "Oral",     sub: "Microbiome kits"      },
]

// ── Custom SVG marks ─────────────────────────────────────────────────────────
function MarkIcon({ type, size = 28 }: { type: Mark; size?: number }) {
  if (type === "yes") {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" role="img" aria-label="yes">
        <circle cx="14" cy="14" r="14" fill={ORAL_GREEN} />
        <path d="M7.5 14.3 L12.2 18.8 L20.5 9.8" stroke={OFF_WHITE} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === "partial") {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" role="img" aria-label="partial">
        <circle cx="14" cy="14" r="14" fill={AMBER} />
        <path d="M8 14 H20" stroke={OFF_WHITE} strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" role="img" aria-label="not included">
      <circle cx="14" cy="14" r="13" fill="none" stroke="rgba(250,250,248,0.25)" strokeWidth="1" />
      <path d="M9 9 L19 19 M19 9 L9 19" stroke="rgba(250,250,248,0.32)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── IntersectionObserver hook (one-shot scroll reveal) ──────────────────────
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -60px 0px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return { ref, inView }
}

// ── Peaq column shared styles ───────────────────────────────────────────────
const PEAQ_COL_BG    = "rgba(45,106,79,0.15)"
const PEAQ_BORDER_L  = "1px solid rgba(184,134,11,0.25)"
const PEAQ_BORDER_R  = "1px solid rgba(184,134,11,0.25)"

// ── Main component ──────────────────────────────────────────────────────────
export function WhyPeaq() {
  const { ref, inView } = useInView<HTMLDivElement>()
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const rowAnim = (rowIdx: number) => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 620ms cubic-bezier(0.16,1,0.3,1) ${rowIdx * 80}ms, transform 620ms cubic-bezier(0.16,1,0.3,1) ${rowIdx * 80}ms`,
  })

  return (
    <section className="wp-section" style={{ background: INK, color: OFF_WHITE, position: "relative", overflow: "hidden" }}>
      <style>{`
        .wp-section { padding: 128px 24px; }
        .wp-full { display: inline; }
        .wp-short { display: none; }
        .wp-sub { display: block; }
        .wp-headline { font-size: clamp(36px, 5.2vw, 56px); }
        @media (max-width: 720px) {
          .wp-section { padding: 80px 18px; }
          .wp-full { display: none; }
          .wp-short { display: inline; }
          .wp-sub { display: none; }
          .wp-headline { font-size: 34px; }
        }
      `}</style>

      {/* Subtle radial glow behind the table */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 820,
          height: 520,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse at center, rgba(45,106,79,0.11) 0%, rgba(45,106,79,0) 62%)",
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        {/* ── Header block ───────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 76px" }}>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: GOLD,
              margin: "0 0 22px",
              opacity: inView ? 1 : 0,
              transition: "opacity 700ms ease",
            }}
          >
            Why Peaq
          </p>
          <h2
            className="wp-headline"
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 300,
              color: OFF_WHITE,
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              margin: "0 0 20px",
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 800ms ease 80ms, transform 800ms ease 80ms",
            }}
          >
            The complete picture, finally
          </h2>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 17,
              fontWeight: 400,
              color: "rgba(250,250,248,0.56)",
              lineHeight: 1.5,
              margin: 0,
              opacity: inView ? 1 : 0,
              transition: "opacity 900ms ease 180ms",
            }}
          >
            Most platforms give you one signal. Peaq connects three.
          </p>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div ref={ref} style={{ maxWidth: 980, margin: "0 auto" }}>
          <table style={{
            tableLayout: "fixed",
            width: "100%",
            borderCollapse: "collapse",
            borderSpacing: 0,
          }}>
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>

            <thead>
              <tr>
                {/* Col 1: empty */}
                <th style={{ padding: "20px 12px", ...rowAnim(0) }} />

                {/* Col 2: Peaq pill header */}
                <th style={{
                  padding: "20px 12px 18px",
                  textAlign: "center",
                  verticalAlign: "bottom",
                  background: ORAL_GREEN,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  borderLeft: PEAQ_BORDER_L,
                  borderRight: PEAQ_BORDER_R,
                  borderTop: `1px solid rgba(184,134,11,0.25)`,
                  ...rowAnim(0),
                }}>
                  <span className="wp-full" style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: OFF_WHITE }}>
                    Peaq
                  </span>
                  <span className="wp-short" style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: OFF_WHITE }}>
                    Peaq
                  </span>
                  <p className="wp-sub" style={{ fontFamily: FONT_BODY, fontSize: 10, color: "rgba(250,250,248,0.78)", margin: "5px 0 0", fontStyle: "italic", letterSpacing: "0.01em" }}>
                    All three, connected
                  </p>
                </th>

                {/* Cols 3–5: competitor headers */}
                {COLUMNS.slice(1).map((col) => (
                  <th
                    key={col.full}
                    style={{
                      padding: "20px 12px",
                      textAlign: "center",
                      verticalAlign: "bottom",
                      ...rowAnim(0),
                    }}
                  >
                    <span className="wp-full" style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 18, fontWeight: 400, color: "rgba(250,250,248,0.76)" }}>
                      {col.full}
                    </span>
                    <span className="wp-short" style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 15, fontWeight: 400, color: "rgba(250,250,248,0.76)" }}>
                      {col.short}
                    </span>
                    <p className="wp-sub" style={{ fontFamily: FONT_BODY, fontSize: 10, color: "rgba(250,250,248,0.36)", margin: "5px 0 0", letterSpacing: "0.02em" }}>
                      {col.sub}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {ROWS.map((row, rIdx) => {
                const rowIdx  = rIdx + 1
                const isFirst = rIdx === 0
                const hovered = hoveredRow === rowIdx
                const bg      = hovered ? "rgba(250,250,248,0.03)" : "transparent"
                const onEnter = () => setHoveredRow(rowIdx)
                const onLeave = () => setHoveredRow(null)

                return (
                  <tr
                    key={row.label}
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeave}
                    style={{
                      borderTop: isFirst ? "none" : "1px solid rgba(250,250,248,0.07)",
                    }}
                  >
                    {/* Feature label cell */}
                    <td style={{
                      padding: "20px 12px 20px 0",
                      textAlign: "left",
                      verticalAlign: "middle",
                      background: bg,
                      ...rowAnim(rowIdx),
                    }}>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 400, color: OFF_WHITE, lineHeight: 1.35 }}>
                        {row.label}
                      </div>
                      <div className="wp-sub" style={{ fontFamily: FONT_BODY, fontSize: 11, color: "rgba(250,250,248,0.42)", marginTop: 3, lineHeight: 1.4 }}>
                        {row.sub}
                      </div>
                    </td>

                    {/* Data cells */}
                    {row.cells.map((cell, cIdx) => {
                      const isPeaq = cIdx === 0
                      return (
                        <td
                          key={cIdx}
                          style={{
                            padding: "20px 12px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            background: isPeaq ? PEAQ_COL_BG : (hovered ? bg : "transparent"),
                            borderLeft: isPeaq ? PEAQ_BORDER_L : "none",
                            borderRight: isPeaq ? PEAQ_BORDER_R : "none",
                            ...rowAnim(rowIdx),
                          }}
                        >
                          <div style={{ display: "inline-flex", justifyContent: "center" }}>
                            <MarkIcon type={cell} />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Legend ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 30,
            marginTop: 42,
            ...rowAnim(ROWS.length + 1),
          }}
        >
          {([
            { type: "yes",     label: "Yes"     },
            { type: "partial", label: "Partial" },
            { type: "no",      label: "Not included" },
          ] as const).map((item) => (
            <div key={item.type} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <MarkIcon type={item.type} size={13} />
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(250,250,248,0.42)",
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <div
          style={{
            textAlign: "center",
            marginTop: 64,
            ...rowAnim(ROWS.length + 2),
          }}
        >
          <Link
            href="/dashboard"
            style={{
              fontFamily: FONT_DISPLAY,
              fontStyle: "italic",
              fontSize: 24,
              fontWeight: 400,
              color: GOLD,
              textDecoration: "none",
              letterSpacing: "-0.005em",
              borderBottom: "1px solid rgba(184,134,11,0)",
              paddingBottom: 2,
              transition: "border-color 260ms ease, color 260ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderBottomColor = "rgba(184,134,11,0.55)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderBottomColor = "rgba(184,134,11,0)"
            }}
          >
            See your full Peaqture →
          </Link>
        </div>
      </div>
    </section>
  )
}

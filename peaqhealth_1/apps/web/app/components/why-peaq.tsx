"use client"

import Link from "next/link"
import { Fragment, useEffect, useRef, useState } from "react"

// ── Brand tokens (spec-locked — see BRAND.md) ────────────────────────────────
const INK         = "#141410"
const OFF_WHITE   = "#FAFAF8"
const GOLD        = "#B8860B"
const ORAL_GREEN  = "#2D6A4F"
const AMBER       = "#BF8533"

const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif"
const FONT_BODY    = "'Instrument Sans', system-ui, sans-serif"

// ── Data ─────────────────────────────────────────────────────────────────────
type Mark = "yes" | "partial" | "no"
type Row  = { label: string; sub: string; cells: [Mark, Mark, Mark, Mark] }

const ROWS: Row[] = [
  { label: "Oral microbiome",        sub: "16S sequencing, species-level",     cells: ["yes", "no",      "no",      "yes"    ] },
  { label: "Blood biomarkers",       sub: "Lipids, glucose, inflammation",     cells: ["yes", "yes",     "partial", "no"     ] },
  { label: "Nightly sleep data",     sub: "HRV, REM, deep sleep, RHR",         cells: ["yes", "no",      "yes",     "no"     ] },
  { label: "Cross-panel insights",   sub: "All three connected in one score",  cells: ["yes", "no",      "no",      "no"     ] },
  { label: "Dentist-led expertise",  sub: "Clinical oral-systemic knowledge",  cells: ["yes", "no",      "no",      "no"     ] },
  { label: "Personalised action plan", sub: "Plain English, no jargon",        cells: ["yes", "partial", "partial", "partial"] },
]

const COLUMNS: { full: string; short: string; sub: string }[] = [
  { full: "Peaq",          short: "Peaq",     sub: "All three, connected" },
  { full: "Blood testing", short: "Blood",    sub: "Labs & biomarkers"    },
  { full: "Wearables",     short: "Wearable", sub: "Oura, WHOOP, Apple"   },
  { full: "Oral tests",    short: "Oral",     sub: "Microbiome kits"      },
]

// ── Custom SVG marks ─────────────────────────────────────────────────────────
function Mark({ type, size = 22 }: { type: Mark; size?: number }) {
  if (type === "yes") {
    return (
      <svg width={size} height={size} viewBox="0 0 22 22" role="img" aria-label="yes">
        <circle cx="11" cy="11" r="11" fill={ORAL_GREEN} />
        <path d="M6 11.2 L9.7 14.8 L16 7.8" stroke={OFF_WHITE} strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === "partial") {
    return (
      <svg width={size} height={size} viewBox="0 0 22 22" role="img" aria-label="partial">
        <circle cx="11" cy="11" r="11" fill={AMBER} />
        <path d="M6.2 11 H15.8" stroke={OFF_WHITE} strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" role="img" aria-label="not included">
      <circle cx="11" cy="11" r="10.25" fill="none" stroke="rgba(250,250,248,0.18)" strokeWidth="1" />
      <path d="M7.2 7.2 L14.8 14.8 M14.8 7.2 L7.2 14.8" stroke="rgba(250,250,248,0.32)" strokeWidth="1.3" strokeLinecap="round" />
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
      {/* Scoped responsive rules — the rest is inline */}
      <style>{`
        .wp-section { padding: 128px 24px; }
        .wp-grid { grid-template-columns: 1.55fr 1fr 1fr 1fr 1fr; }
        .wp-full { display: inline; }
        .wp-short { display: none; }
        .wp-sub { display: block; }
        .wp-cell { padding: 24px 14px; }
        .wp-first-cell { padding: 24px 28px 24px 4px; }
        .wp-headline { font-size: clamp(36px, 5.2vw, 56px); }
        .wp-pill-pad { padding: 20px 12px 18px; }
        @media (max-width: 720px) {
          .wp-section { padding: 80px 18px; }
          .wp-grid { grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr; }
          .wp-full { display: none; }
          .wp-short { display: inline; }
          .wp-sub { display: none; }
          .wp-cell { padding: 18px 4px; }
          .wp-first-cell { padding: 18px 10px 18px 2px; }
          .wp-headline { font-size: 34px; }
          .wp-pill-pad { padding: 14px 6px 12px; }
        }
      `}</style>

      {/* Subtle radial glow behind the table — atmosphere, not decoration */}
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
        <div
          ref={ref}
          className="wp-grid"
          style={{
            display: "grid",
            position: "relative",
            maxWidth: 980,
            margin: "0 auto",
          }}
        >
          {/* Peaq column highlight — runs from below the pill to the last row */}
          <div
            aria-hidden
            style={{
              gridColumn: "2",
              gridRow: `2 / span ${ROWS.length}`,
              background: "rgba(45,106,79,0.09)",
              borderLeft: `1px solid rgba(184,134,11,0.30)`,
              borderRight: `1px solid rgba(184,134,11,0.30)`,
              borderBottom: `1px solid rgba(184,134,11,0.18)`,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          {/* ── Header row ────────────────────────────────────────────── */}
          {/* Col 1: spacer */}
          <div className="wp-cell" style={{ ...rowAnim(0) }} />

          {/* Col 2: Peaq pill */}
          <div
            className="wp-pill-pad"
            style={{
              background: ORAL_GREEN,
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              textAlign: "center",
              position: "relative",
              zIndex: 1,
              boxShadow: "0 -1px 0 rgba(184,134,11,0.30), 1px 0 0 rgba(184,134,11,0.30), -1px 0 0 rgba(184,134,11,0.30)",
              ...rowAnim(0),
            }}
          >
            <span className="wp-full" style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: OFF_WHITE }}>
              Peaq
            </span>
            <span className="wp-short" style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: OFF_WHITE }}>
              Peaq
            </span>
            <p className="wp-sub" style={{ fontFamily: FONT_BODY, fontSize: 10, color: "rgba(250,250,248,0.78)", margin: "5px 0 0", fontStyle: "italic", letterSpacing: "0.01em" }}>
              All three, connected
            </p>
          </div>

          {/* Cols 3–5: competitor categories */}
          {COLUMNS.slice(1).map((col) => (
            <div
              key={col.full}
              className="wp-cell"
              style={{
                textAlign: "center",
                paddingTop: 24,
                paddingBottom: 20,
                position: "relative",
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
            </div>
          ))}

          {/* ── Data rows ─────────────────────────────────────────────── */}
          {ROWS.map((row, rIdx) => {
            const rowIdx  = rIdx + 1
            const isLast  = rIdx === ROWS.length - 1
            const hovered = hoveredRow === rowIdx
            const divider = isLast ? "none" : "1px solid rgba(250,250,248,0.07)"
            const bg      = hovered ? "rgba(250,250,248,0.03)" : "transparent"
            const onEnter = () => setHoveredRow(rowIdx)
            const onLeave = () => setHoveredRow(null)
            const delay   = `${rowIdx * 80}ms`
            const combinedTransition =
              `opacity 620ms cubic-bezier(0.16,1,0.3,1) ${delay},` +
              ` transform 620ms cubic-bezier(0.16,1,0.3,1) ${delay},` +
              ` background-color 240ms ease`

            return (
              <Fragment key={row.label}>
                {/* Feature label cell */}
                <div
                  className="wp-first-cell"
                  onMouseEnter={onEnter}
                  onMouseLeave={onLeave}
                  style={{
                    borderBottom: divider,
                    background: bg,
                    position: "relative",
                    zIndex: 1,
                    opacity: inView ? 1 : 0,
                    transform: inView ? "translateY(0)" : "translateY(12px)",
                    transition: combinedTransition,
                  }}
                >
                  <div style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 400, color: OFF_WHITE, lineHeight: 1.35 }}>
                    {row.label}
                  </div>
                  <div className="wp-sub" style={{ fontFamily: FONT_BODY, fontSize: 11, color: "rgba(250,250,248,0.42)", marginTop: 3, lineHeight: 1.4 }}>
                    {row.sub}
                  </div>
                </div>

                {/* Check cells */}
                {row.cells.map((cell, cIdx) => {
                  const isPeaq = cIdx === 0
                  return (
                    <div
                      key={cIdx}
                      className="wp-cell"
                      onMouseEnter={onEnter}
                      onMouseLeave={onLeave}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderBottom: divider,
                        // Peaq column already has its own tint via overlay; keep hover additive
                        background: !isPeaq && hovered ? "rgba(250,250,248,0.03)" : "transparent",
                        position: "relative",
                        zIndex: 1,
                        opacity: inView ? 1 : 0,
                        transform: inView ? "translateY(0)" : "translateY(12px)",
                        transition: combinedTransition,
                      }}
                    >
                      <Mark type={cell} />
                    </div>
                  )
                })}
              </Fragment>
            )
          })}
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
              <Mark type={item.type} size={13} />
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

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Nav } from "../components/nav"
import { FindingsExplorer } from "./findings-explorer"
import { BACTERIA } from "../../lib/bacteria-data"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

// ── Animated counter ────────────────────────────────────────────────────────

function AnimatedNumber({ target, duration = 1500, formatComma = false }: {
  target: number; duration?: number; formatComma?: boolean
}) {
  const [value, setValue] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect() } },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started || target === 0) return
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [started, target, duration])

  const display = formatComma ? value.toLocaleString() : String(value)
  return <span ref={ref}>{display}</span>
}

// ── Zero pulse component ────────────────────────────────────────────────────

function PulsingZero() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <span ref={ref} style={{
      display: "inline-block",
      animation: visible ? "zeroPulse 800ms ease 200ms both" : "none",
    }}>
      0
    </span>
  )
}

// ── Ranking teaser ─────────────────────────────────────────────────────────

const RANKING_BACTERIA = [
  { name: "Haemophilus", type: "protective" as const, width: 72 },
  { name: "P. gingivalis", type: "pathogenic" as const, width: 58 },
  { name: "Neisseria", type: "protective" as const, width: 64 },
  { name: "Tannerella", type: "pathogenic" as const, width: 45 },
  { name: "Fusobacterium", type: "pathogenic" as const, width: 38 },
]

function RankingTeaser() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{
      background: "#141410", borderRadius: 14,
      padding: "40px 36px 36px",
      marginBottom: 56,
      position: "relative", overflow: "hidden",
    }}>
      {/* Subtle gradient overlay */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "50%", height: "100%",
        background: "radial-gradient(ellipse at 100% 50%, rgba(154,114,0,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <span style={{
        fontFamily: sans, fontSize: 11, letterSpacing: "2px",
        textTransform: "uppercase", color: "#9A7200",
        display: "block", marginBottom: 12,
        position: "relative", zIndex: 1,
      }}>
        Where do you rank?
      </span>

      <p style={{
        fontFamily: serif, fontSize: 24, fontWeight: 400,
        color: "#fff", lineHeight: 1.3,
        margin: "0 0 28px", maxWidth: 420,
        position: "relative", zIndex: 1,
      }}>
        See how your bacteria compare to<br />
        <em style={{ fontStyle: "italic", color: "#9A7200" }}>9,848 Americans.</em>
      </p>

      {/* Animated bars */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {RANKING_BACTERIA.map((b, i) => {
          const isProtective = b.type === "protective"
          const barColor = isProtective ? "#2D6A4F" : "#C0392B"
          const pillDelay = 600 + i * 200

          return (
            <div key={b.name} style={{ marginBottom: i < RANKING_BACTERIA.length - 1 ? 14 : 0 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.4)",
                  width: 100, flexShrink: 0, textAlign: "right",
                }}>
                  {b.name}
                </span>
                <div style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: "rgba(255,255,255,0.06)",
                  position: "relative", overflow: "visible",
                }}>
                  {/* Population bar */}
                  <div style={{
                    height: "100%", borderRadius: 3,
                    background: `${barColor}60`,
                    width: visible ? `${b.width}%` : "0%",
                    transition: `width 1000ms cubic-bezier(0.4, 0, 0.2, 1) ${i * 150}ms`,
                  }} />

                  {/* "you?" pill */}
                  <div style={{
                    position: "absolute", top: -11,
                    left: visible ? `${Math.min(b.width + 4, 88)}%` : "0%",
                    transition: `left 1200ms cubic-bezier(0.4, 0, 0.2, 1) ${pillDelay}ms, opacity 400ms ease ${pillDelay}ms`,
                    opacity: visible ? 1 : 0,
                  }}>
                    <span style={{
                      fontFamily: sans, fontSize: 9, fontWeight: 600,
                      color: "#141410", background: "#9A7200",
                      borderRadius: 10, padding: "3px 8px",
                      whiteSpace: "nowrap",
                      letterSpacing: "0.5px",
                    }}>
                      you?
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", marginTop: 32, position: "relative", zIndex: 1 }}>
        <Link href="/dashboard/oral" className="ranking-cta" style={{
          fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
          textTransform: "uppercase", textDecoration: "none",
          color: "#9A7200", border: "1px solid rgba(154,114,0,0.4)",
          borderRadius: 6, padding: "10px 24px",
          display: "inline-block",
          transition: "background 200ms ease, color 200ms ease, border-color 200ms ease",
        }}>
          Find out &rarr;
        </Link>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ExplorePage() {
  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — HERO
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ textAlign: "center", padding: "88px 0 48px" }}>
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "2px",
            textTransform: "uppercase", color: "#9A7200",
            display: "block", marginBottom: 20,
          }}>
            CDC NHANES Study &middot; 9,660 Americans
          </span>
          <h1 style={{
            fontFamily: serif, fontSize: 52, fontWeight: 400,
            color: "#141410", lineHeight: 1.15,
            margin: "0 0 20px",
          }}>
            Your oral bacteria show up<br />in your <em style={{ fontStyle: "italic", color: "#9A7200" }}>blood.</em>
          </h1>
          <p style={{
            fontFamily: sans, fontSize: 15, color: "rgba(20,20,16,0.5)",
            lineHeight: 1.7, maxWidth: 480, margin: "0 auto",
          }}>
            We ran the CDC&rsquo;s national oral microbiome dataset against real blood
            markers. Specific bacteria showed consistent signals across thousands of
            Americans. Generic diversity scores alone showed none.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            HERO VISUAL — microscopy placeholder
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          width: "100%", height: 320, borderRadius: 12,
          background: "#141410",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          marginBottom: 40, overflow: "hidden",
          position: "relative",
        }}>
          {/* Bacteria microscopy image */}
          <img
            src="/bacteria.png"
            alt=""
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center 40%",
              opacity: 0.55,
            }}
          />
          {/* Dark vignette overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(20,20,16,0.7) 100%)",
            pointerEvents: "none",
          }} />
          <span style={{
            fontFamily: serif, fontSize: 72, fontWeight: 300,
            color: "#9A7200", lineHeight: 1, letterSpacing: "-2px",
            position: "relative", zIndex: 1,
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}>
            10,000&times;
          </span>
          <span style={{
            fontFamily: sans, fontSize: 12,
            color: "rgba(255,255,255,0.45)",
            marginTop: 8, letterSpacing: "0.5px",
            position: "relative", zIndex: 1,
          }}>
            What lives in your mouth, magnified.
          </span>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — STAT CARDS (two only)
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 16, marginBottom: 64, maxWidth: 520, marginLeft: "auto", marginRight: "auto",
        }}>
          {/* 9,848 card */}
          <div style={{
            background: "#fff", borderRadius: 10,
            padding: "28px 24px",
            border: "0.5px solid rgba(20,20,16,0.08)",
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: serif, fontSize: 52, fontWeight: 300,
              color: "#141410", lineHeight: 1, marginBottom: 8,
            }}>
              <AnimatedNumber target={9848} duration={1500} formatComma />
            </div>
            <div style={{
              fontFamily: sans, fontSize: 12,
              color: "rgba(20,20,16,0.5)", lineHeight: 1.4,
            }}>
              People with oral + blood data
            </div>
          </div>

          {/* 0 card — dramatic */}
          <div style={{
            background: "#fff", borderRadius: 10,
            padding: "28px 24px",
            border: "0.5px solid rgba(20,20,16,0.08)",
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: serif, fontSize: 52, fontWeight: 300,
              color: "#141410", lineHeight: 1, marginBottom: 8,
            }}>
              <PulsingZero />
            </div>
            <div style={{
              fontFamily: sans, fontSize: 12,
              color: "rgba(20,20,16,0.5)", lineHeight: 1.4,
            }}>
              Connections found using<br />diversity score alone
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — FINDINGS (client component)
            ═══════════════════════════════════════════════════════════════════ */}
        <FindingsExplorer />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3b — ANIMATED RANKING TEASER
            ═══════════════════════════════════════════════════════════════════ */}
        <RankingTeaser />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 — METHODOLOGY
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          borderTop: "2px solid #9A7200",
          paddingTop: 48, paddingBottom: 56,
        }}>
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "2px",
            textTransform: "uppercase", color: "#9A7200",
            display: "block", marginBottom: 28,
          }}>
            Methodology
          </span>

          <div className="method-cols" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 32,
          }}>
            {[
              {
                ord: "01",
                title: "The study",
                body: "CDC NHANES 2009\u20132012 sequenced the mouth bacteria of 9,660 Americans using 16S rRNA sequencing. Largest nationally representative oral microbiome study in the US.",
              },
              {
                ord: "02",
                title: "Our analysis",
                body: "We linked oral microbiome data to blood marker files for 9,848 participants. We tested correlations between pre-specified bacteria and blood markers across inflammation, lipids, glucose, and blood pressure.",
              },
              {
                ord: "03",
                title: "Honest framing",
                body: "These are population associations, not individual predictions. Effect sizes are small (r=0.03\u20130.09). Your Zymo kit uses a swab; NHANES used oral rinse. Both use the same sequencing technology. Comparisons are directionally accurate.",
              },
            ].map(c => (
              <div key={c.title} style={{ position: "relative" }}>
                {/* Decorative ordinal */}
                <span style={{
                  fontFamily: serif, fontSize: 48, fontWeight: 300,
                  color: "rgba(20,20,16,0.05)",
                  position: "absolute", top: -8, left: 0,
                  lineHeight: 1, pointerEvents: "none",
                }}>
                  {c.ord}
                </span>
                <div style={{
                  fontFamily: sans, fontSize: 11, fontWeight: 600,
                  color: "#141410", marginBottom: 8,
                  letterSpacing: "0.3px",
                  position: "relative", zIndex: 1, paddingTop: 4,
                }}>
                  {c.title}
                </div>
                <p style={{
                  fontFamily: sans, fontSize: 12,
                  color: "rgba(20,20,16,0.45)", lineHeight: 1.65,
                  margin: 0, position: "relative", zIndex: 1,
                }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          <p style={{
            fontFamily: sans, fontSize: 11,
            color: "rgba(20,20,16,0.3)", lineHeight: 1.6,
            marginTop: 32, paddingTop: 20,
            borderTop: "0.5px solid rgba(20,20,16,0.06)",
          }}>
            Analysis: Peaq Health, April 2026 &middot; Dataset: NHANES 2009&ndash;2012 &middot;
            Spearman rank correlations on log-transformed genus relative abundances
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5 — BOTTOM CTA
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          textAlign: "center",
          padding: "48px 0 88px",
        }}>
          <p style={{
            fontFamily: serif, fontSize: 28, fontWeight: 400,
            color: "#141410", lineHeight: 1.25,
            margin: "0 0 24px",
          }}>
            See where your bacteria stand.
          </p>
          <Link href="/dashboard/oral" className="explore-cta" style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
            textTransform: "uppercase", textDecoration: "none",
            color: "#9A7200", border: "1px solid #9A7200",
            borderRadius: 6, padding: "12px 28px",
            display: "inline-block",
            transition: "background 200ms ease, color 200ms ease",
          }}>
            View my oral panel &rarr;
          </Link>
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          main h1 { font-size: 36px !important; }
          .stat-cards { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .method-cols { grid-template-columns: 1fr !important; gap: 20px !important; }
          .card-grid { grid-template-columns: 1fr !important; }
        }
        .explore-card {
          transition: transform 200ms ease;
        }
        .explore-card:hover {
          transform: translateY(-1px);
        }
        .explore-cta:hover {
          background: #9A7200 !important;
          color: #fff !important;
        }
        .ranking-cta:hover {
          background: #9A7200 !important;
          color: #141410 !important;
          border-color: #9A7200 !important;
        }
        @keyframes zeroPulse {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

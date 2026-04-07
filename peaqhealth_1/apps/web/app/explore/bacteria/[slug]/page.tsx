"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Nav } from "../../../components/nav"
import { BACTERIA } from "../../../../lib/bacteria-data"
import type { BacteriaEntry, BacteriaInteraction } from "../../../../lib/bacteria-data"
import {
  HeartPulse, Brain, Bone, Microscope, Activity, FlaskConical, Baby, Dna,
  TrendingDown, TrendingUp, Droplets, Wind, Flame, AlertTriangle, Zap,
  ArrowRight, Clock, ChevronRight,
} from "lucide-react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

// ── Icon map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  HeartPulse, Brain, Bone, Microscope, Activity, FlaskConical, Baby, Dna,
  TrendingDown, TrendingUp, Droplets, Wind, Flame, AlertTriangle, Zap,
  ArrowRight, Clock,
}

function getIcon(name: string) {
  return ICON_MAP[name] || AlertTriangle
}

// ── Scroll reveal ──────────────────────────────────────────────────────────

function useScrollReveal(staggerMs = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTimeout(() => setVisible(true), staggerMs); observer.disconnect() } },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [staggerMs])

  return { ref, style: {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(24px)",
    transition: "opacity 600ms ease, transform 600ms ease",
  } as const }
}

// ── Animated bar ───────────────────────────────────────────────────────────

function AnimatedBar({ width, color, delay }: { width: number; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTimeout(() => setVisible(true), delay); observer.disconnect() } },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} style={{
      height: 6, borderRadius: 3, background: "rgba(20,20,16,0.06)",
      overflow: "hidden",
    }}>
      <div style={{
        height: "100%", borderRadius: 3,
        background: color,
        width: visible ? `${width}%` : "0%",
        transition: `width 800ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
      }} />
    </div>
  )
}

// ── Mechanism chain ────────────────────────────────────────────────────────

function MechanismChain({ chain, color }: { chain: string[]; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", flexWrap: "wrap",
      gap: 0, margin: "20px 0 0",
    }}>
      {chain.map((step, i) => (
        <div key={step} style={{ display: "flex", alignItems: "center" }}>
          <span style={{
            fontFamily: sans, fontSize: 12, fontWeight: 500,
            color: "#fff", background: color,
            borderRadius: 20, padding: "5px 14px",
            whiteSpace: "nowrap",
          }}>
            {step}
          </span>
          {i < chain.length - 1 && (
            <ChevronRight size={16} color={color} style={{ margin: "0 4px", opacity: 0.5 }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Interaction card ───────────────────────────────────────────────────────

function InteractionCard({ item, color, accentBg, stagger }: {
  item: BacteriaInteraction; color: string; accentBg: string; stagger: number
}) {
  const Icon = getIcon(item.icon)
  const reveal = useScrollReveal(stagger)

  return (
    <div ref={reveal.ref} style={reveal.style}>
      <div style={{
        background: "#fff", borderRadius: 10,
        borderLeft: `3px solid ${color}30`,
        padding: "20px 20px 16px",
        height: "100%",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 8,
        }}>
          <Icon size={18} color={color} strokeWidth={1.5} />
          <div style={{
            fontFamily: serif, fontSize: 15, fontWeight: 500,
            color: "#141410", lineHeight: 1.3,
          }}>
            {item.title}
          </div>
        </div>
        <p style={{
          fontFamily: sans, fontSize: 12,
          color: "rgba(20,20,16,0.55)", lineHeight: 1.65,
          margin: "0 0 8px",
        }}>
          {item.body}
        </p>
        <p style={{
          fontFamily: sans, fontSize: 10, fontStyle: "italic",
          color: "rgba(20,20,16,0.35)", lineHeight: 1.5,
          margin: 0,
        }}>
          {item.citation}
        </p>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function BacteriaDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const entry = BACTERIA.find(b => b.slug === slug)

  if (!entry) {
    return (
      <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
        <Nav />
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "120px 24px", textAlign: "center" }}>
          <h1 style={{ fontFamily: serif, fontSize: 36, color: "#141410", marginBottom: 16 }}>
            Bacteria not found
          </h1>
          <Link href="/explore" style={{
            fontFamily: sans, fontSize: 13, color: "#9A7200", textDecoration: "none",
          }}>
            &larr; Back to explore
          </Link>
        </main>
      </div>
    )
  }

  const isProtective = entry.type === "protective"
  const accentColor = isProtective ? "#2D6A4F" : "#C0392B"
  const accentBg = isProtective ? "rgba(45,106,79,0.08)" : "rgba(192,57,43,0.08)"
  const barColor = isProtective ? "#2D6A4F" : "#C0392B"

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      <Nav />

      {/* ═══════════════════════════════════════════════════════════════════
          DARK HERO
          ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: "#141410",
        backgroundImage: "radial-gradient(ellipse at 80% 40%, rgba(40,38,30,0.6) 0%, transparent 60%)",
        padding: "100px 24px 56px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Abstract bacteria SVG — top right, decorative */}
        <svg
          viewBox="0 0 200 200"
          style={{
            position: "absolute", top: 20, right: -20,
            width: 280, height: 280, opacity: 0.04,
          }}
        >
          <circle cx="100" cy="100" r="70" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="45" fill="none" stroke="#fff" strokeWidth="1" />
          <circle cx="100" cy="100" r="20" fill="#fff" fillOpacity="0.3" />
          <circle cx="60" cy="55" r="8" fill="#fff" fillOpacity="0.2" />
          <circle cx="145" cy="70" r="6" fill="#fff" fillOpacity="0.15" />
          <circle cx="75" cy="150" r="10" fill="#fff" fillOpacity="0.15" />
          <circle cx="140" cy="140" r="5" fill="#fff" fillOpacity="0.2" />
          <line x1="100" y1="30" x2="100" y2="170" stroke="#fff" strokeWidth="0.5" opacity="0.15" />
          <line x1="30" y1="100" x2="170" y2="100" stroke="#fff" strokeWidth="0.5" opacity="0.15" />
        </svg>

        <div style={{ maxWidth: 760, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Back link */}
          <Link href="/explore" style={{
            fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.4)",
            textDecoration: "none", display: "inline-block", marginBottom: 24,
            transition: "color 200ms ease",
          }}>
            &larr; Back to explore
          </Link>

          {/* Badge */}
          <span style={{
            display: "inline-block", marginBottom: 16,
            fontFamily: sans, fontSize: 10, letterSpacing: "1.5px",
            textTransform: "uppercase",
            background: `${accentColor}20`, color: accentColor,
            borderRadius: 4, padding: "4px 10px",
            marginLeft: 0,
          }}>
            {entry.badge}
          </span>

          {/* Name */}
          <h1 style={{
            fontFamily: serif, fontSize: 44, fontWeight: 400,
            color: "#fff", lineHeight: 1.15,
            margin: "0 0 4px",
          }}>
            {entry.name}
          </h1>

          {/* Latin name */}
          <p style={{
            fontFamily: serif, fontSize: 18, fontStyle: "italic",
            color: "rgba(255,255,255,0.35)",
            margin: "0 0 20px",
          }}>
            {entry.latinName}
          </p>

          {/* Hero summary */}
          <p style={{
            fontFamily: sans, fontSize: 14,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.7, maxWidth: 540,
            margin: 0,
          }}>
            {entry.heroSummary}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          STATS GRID
          ═══════════════════════════════════════════════════════════════════ */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
        <div className="bacteria-stats-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16, margin: "-28px 0 48px",
          position: "relative", zIndex: 2,
        }}>
          {entry.stats.map((stat, i) => {
            const reveal = useScrollReveal(i * 80) // eslint-disable-line react-hooks/rules-of-hooks
            return (
              <div key={stat.label} ref={reveal.ref} style={reveal.style}>
                <div style={{
                  background: "#fff", borderRadius: 10,
                  padding: "22px 18px",
                  border: "0.5px solid rgba(20,20,16,0.08)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  textAlign: "center",
                }}>
                  <div style={{
                    fontFamily: serif, fontSize: 28, fontWeight: 300,
                    color: accentColor, lineHeight: 1, marginBottom: 6,
                  }}>
                    {stat.number}
                  </div>
                  <div style={{
                    fontFamily: sans, fontSize: 11,
                    color: "rgba(20,20,16,0.45)", lineHeight: 1.4,
                  }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            HEADLINE + BODY
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 48 }}>
          <p style={{
            fontFamily: serif, fontSize: 24, fontWeight: 400,
            color: accentColor, lineHeight: 1.35,
            margin: "0 0 16px",
          }}>
            {entry.headline}
          </p>
          <p style={{
            fontFamily: sans, fontSize: 14,
            color: "rgba(20,20,16,0.6)", lineHeight: 1.7,
            margin: 0, maxWidth: 600,
          }}>
            {entry.bodyText}
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            DISEASE INTERACTIONS
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 48 }}>
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "2px",
            textTransform: "uppercase", color: "#9A7200",
            display: "block", marginBottom: 20,
          }}>
            {isProtective ? "Protective Associations" : "Disease Interactions"}
          </span>

          <div className="bacteria-interactions-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}>
            {entry.interactions.map((item, i) => (
              <InteractionCard
                key={item.title}
                item={item}
                color={accentColor}
                accentBg={accentBg}
                stagger={i * 80}
              />
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            MECHANISM (pathogenic only)
            ═══════════════════════════════════════════════════════════════════ */}
        {entry.mechanism && (
          <div style={{
            background: "rgba(20,20,16,0.03)",
            borderLeft: `3px solid ${accentColor}40`,
            borderRadius: 10, padding: "28px 28px 24px",
            marginBottom: 48,
          }}>
            <span style={{
              fontFamily: sans, fontSize: 11, letterSpacing: "2px",
              textTransform: "uppercase", color: "#9A7200",
              display: "block", marginBottom: 12,
            }}>
              {entry.mechanism.title}
            </span>
            <p style={{
              fontFamily: sans, fontSize: 13,
              color: "rgba(20,20,16,0.6)", lineHeight: 1.65,
              margin: 0, maxWidth: 560,
            }}>
              {entry.mechanism.body}
            </p>
            <MechanismChain chain={entry.mechanism.chain} color={accentColor} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            BLOOD MARKER BARS
            ═══════════════════════════════════════════════════════════════════ */}
        {entry.bloodMarkers.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <span style={{
              fontFamily: sans, fontSize: 11, letterSpacing: "2px",
              textTransform: "uppercase", color: "#9A7200",
              display: "block", marginBottom: 20,
            }}>
              Blood Marker Associations
            </span>

            <div style={{
              background: "#fff", borderRadius: 10,
              padding: "24px 24px 20px",
              border: "0.5px solid rgba(20,20,16,0.08)",
            }}>
              {entry.bloodMarkers.map((marker, i) => (
                <div key={marker.name} style={{
                  marginBottom: i < entry.bloodMarkers.length - 1 ? 18 : 0,
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "baseline", marginBottom: 6,
                  }}>
                    <span style={{
                      fontFamily: sans, fontSize: 13, fontWeight: 500,
                      color: "#141410",
                    }}>
                      {marker.name}
                    </span>
                    <span style={{
                      fontFamily: sans, fontSize: 11,
                      color: accentColor, fontWeight: 500,
                    }}>
                      {marker.effect}
                    </span>
                  </div>
                  <AnimatedBar width={marker.strength} color={barColor} delay={i * 120} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CITATIONS
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 48 }}>
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "2px",
            textTransform: "uppercase", color: "#9A7200",
            display: "block", marginBottom: 16,
          }}>
            Key Research
          </span>

          <div style={{
            borderLeft: "2px solid rgba(20,20,16,0.06)",
            paddingLeft: 20,
          }}>
            {entry.citations.map((cite, i) => (
              <p key={i} style={{
                fontFamily: sans, fontSize: 12,
                color: "rgba(20,20,16,0.45)", lineHeight: 1.6,
                margin: i < entry.citations.length - 1 ? "0 0 10px" : 0,
              }}>
                {cite}
              </p>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            WHAT YOU CAN DO
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: isProtective ? "rgba(45,106,79,0.06)" : "rgba(45,106,79,0.04)",
          borderLeft: "3px solid #2D6A4F",
          borderRadius: 10, padding: "28px 28px 24px",
          marginBottom: 48,
        }}>
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "2px",
            textTransform: "uppercase", color: "#2D6A4F",
            display: "block", marginBottom: 16,
          }}>
            What you can do
          </span>

          {entry.whatToDo.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              marginBottom: i < entry.whatToDo.length - 1 ? 12 : 0,
            }}>
              <span style={{
                fontFamily: sans, fontSize: 14, color: "#2D6A4F",
                lineHeight: 1, marginTop: 2,
              }}>
                &bull;
              </span>
              <p style={{
                fontFamily: sans, fontSize: 13,
                color: "rgba(20,20,16,0.6)", lineHeight: 1.6,
                margin: 0,
              }}>
                {item}
              </p>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            BOTTOM CTA
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          textAlign: "center",
          padding: "24px 0 88px",
          borderTop: "0.5px solid rgba(20,20,16,0.06)",
        }}>
          <p style={{
            fontFamily: serif, fontSize: 22, fontWeight: 400,
            color: "#141410", lineHeight: 1.3,
            margin: "0 0 20px",
          }}>
            See where your bacteria stand.
          </p>
          <Link href="/dashboard/oral" className="bacteria-cta" style={{
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
          .bacteria-stats-grid { grid-template-columns: 1fr !important; margin-top: -16px !important; }
          .bacteria-interactions-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .bacteria-interactions-grid { grid-template-columns: 1fr !important; }
        }
        .bacteria-cta:hover {
          background: #9A7200 !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  )
}

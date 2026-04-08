"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

// ── Data ────────────────────────────────────────────────────────────────────

interface BacteriaCard {
  slug: string
  name: string
  type: "protective" | "pathogenic"
  headline: string
  pills: string[]
  expanded: string
  dataLine: string
  featured?: boolean
}

const PROTECTIVE: BacteriaCard[] = [
  {
    slug: "haemophilus",
    name: "Haemophilus",
    type: "protective",
    headline: "Higher levels linked to lower blood sugar, lower triglycerides, lower blood pressure",
    pills: ["HbA1c", "Triglycerides", "Blood pressure", "HDL"],
    expanded: "Haemophilus helps your body produce nitric oxide \u2014 a molecule that relaxes blood vessels, improves blood flow, and reduces blood sugar buildup. People with more Haemophilus tend to have lower HbA1c and better cardiovascular markers. It declines naturally with age, which may partly explain why metabolic health worsens over time.",
    dataLine: "In 9,848 Americans: HbA1c r=\u22120.074 (p=9\u00d710\u207b\u00b9\u00b3) \u00b7 Triglycerides r=\u22120.094 (p=3\u00d710\u207b\u00b9\u2070)",
  },
  {
    slug: "neisseria",
    name: "Neisseria",
    type: "protective",
    headline: "Higher levels linked to lower inflammation and lower blood pressure",
    pills: ["hsCRP", "Blood pressure", "Triglycerides"],
    expanded: "Neisseria is the primary nitrate-reducing bacteria in your mouth. It converts dietary nitrates from vegetables into nitric oxide \u2014 the molecule your blood vessels use to stay relaxed and flexible. People with more Neisseria consistently show lower hsCRP and lower blood pressure. It\u2019s one reason leafy greens improve cardiovascular health: your mouth bacteria do the converting.",
    dataLine: "In 9,848 Americans: Systolic BP r=\u22120.061 (p=2\u00d710\u207b\u2079) \u00b7 hsCRP r=\u22120.051 (p=5\u00d710\u207b\u2074)",
  },
]

const PATHOGENIC: BacteriaCard[] = [
  {
    slug: "p-gingivalis",
    name: "P. gingivalis",
    type: "pathogenic",
    featured: true,
    headline: "Found in Alzheimer\u2019s brain tissue. Linked to elevated inflammation and cardiovascular risk.",
    pills: ["hsCRP", "Cardiovascular", "Neuroinflammation"],
    expanded: "P. gingivalis is the most studied pathogen in periodontal disease. It produces toxic proteins called gingipains that degrade tissue and evade your immune system. In peer-reviewed research, gingipains have been detected in the brain tissue of over 90% of Alzheimer\u2019s patients studied. It has been found in arterial plaque and linked to elevated inflammation. Low levels are manageable. Elevated and persistent levels are worth knowing about early.",
    dataLine: "Source: Dominy et al., Science Advances 2019 \u00b7 Haditsch et al., J Alzheimer\u2019s Disease 2020",
  },
  {
    slug: "tannerella",
    name: "Tannerella",
    type: "pathogenic",
    headline: "Higher levels linked to higher blood sugar, higher inflammation, higher blood pressure",
    pills: ["Glucose", "HbA1c", "hsCRP", "Blood pressure"],
    expanded: "Tannerella forsythia is part of the \u2018red complex\u2019 \u2014 three bacteria strongly associated with advanced gum disease and systemic inflammation. In the CDC dataset, higher Tannerella showed up consistently across blood sugar, HbA1c, hsCRP, and blood pressure simultaneously. One of the clearest examples of an oral pathogen leaving a fingerprint in your bloodstream.",
    dataLine: "In 9,848 Americans: HbA1c r=+0.050 (p=1\u00d710\u207b\u2076) \u00b7 Diastolic BP r=+0.052 (p=4\u00d710\u207b\u2077)",
  },
  {
    slug: "fusobacterium",
    name: "Fusobacterium",
    type: "pathogenic",
    headline: "Higher levels linked to higher LDL cholesterol and higher blood sugar",
    pills: ["LDL", "Glucose", "Colorectal cancer risk"],
    expanded: "Fusobacterium nucleatum is one of the most studied bacteria in cancer research \u2014 consistently found enriched in colorectal tumor tissue and studied as an early detection biomarker. In the CDC blood marker data, elevated Fusobacterium correlated with higher LDL and blood glucose. A bacteria most people have never heard of, found in most mouths, with implications well beyond oral health.",
    dataLine: "In 9,848 Americans: LDL r=+0.058 (p=1\u00d710\u207b\u2074) \u00b7 Glucose r=+0.038 (p=0.010)",
  },
  {
    slug: "prevotella",
    name: "Prevotella",
    type: "pathogenic",
    headline: "Elevated levels linked to higher systemic inflammation",
    pills: ["hsCRP", "Inflammation"],
    expanded: "Prevotella intermedia is a periodontal pathogen linked to gum inflammation and bleeding. It thrives in inflamed tissue and produces compounds that further drive immune activation. In the CDC data, higher Prevotella correlated with elevated hsCRP \u2014 a marker of systemic inflammation that predicts cardiovascular events. Inflammation that starts in the mouth doesn\u2019t always stay there.",
    dataLine: "In 9,848 Americans: hsCRP r=+0.035 (p=0.017)",
  },
]

// ── Bacteria icon sprites ───────────────────────────────────────────────────
// Cropped from 5x5 grid in /bacteria-icons.png (1024x1024, ~204px per cell)
// objectPosition picks the cell: "col% row%"

const BACTERIA_SPRITE: Record<string, { col: number; row: number }> = {
  "p-gingivalis":  { col: 0, row: 0 },   // concentric target shape
  "tannerella":    { col: 2, row: 0 },   // spiky circular
  "fusobacterium": { col: 1, row: 1 },   // rod-shaped
  "prevotella":    { col: 0, row: 2 },   // wavy flagellated
  "haemophilus":   { col: 0, row: 1 },   // cluster
  "neisseria":     { col: 1, row: 3 },   // double lobe (diplococcus)
  "veillonella":   { col: 3, row: 4 },   // branching
}

// ── Scroll reveal hook ──────────────────────────────────────────────────────

function useScrollReveal(staggerMs = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTimeout(() => setVisible(true), staggerMs); observer.disconnect() } },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [staggerMs])

  return { ref, style: {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: "opacity 600ms ease, transform 600ms ease",
  } as const }
}

// ── Expandable Card ─────────────────────────────────────────────────────────

function Card({ card, stagger }: { card: BacteriaCard; stagger: number }) {
  const [open, setOpen] = useState(false)
  const reveal = useScrollReveal(stagger)
  const isProtective = card.type === "protective"
  const accentColor = isProtective ? "#2D6A4F" : "#C0392B"
  const accentBg = isProtective ? "rgba(45,106,79,0.06)" : "rgba(192,57,43,0.06)"
  const headlineColor = isProtective ? "#2D6A4F" : "#C0392B"

  return (
    <div ref={reveal.ref} style={reveal.style}>
      <Link href={`/explore/bacteria/${card.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="explore-card" style={{
        background: "#fff",
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 10,
        padding: "24px 24px 20px",
        position: "relative",
        cursor: "pointer",
      }}>
        {/* Featured badge — P. gingivalis */}
        {card.featured && (
          <span style={{
            position: "absolute", top: 16, left: 24,
            fontFamily: sans, fontSize: 10, letterSpacing: "1px",
            textTransform: "uppercase",
            background: "rgba(192,57,43,0.08)", color: "#C0392B",
            borderRadius: 4, padding: "2px 6px",
          }}>
            Key Pathogen
          </span>
        )}

        {/* Bacteria icon from sprite sheet */}
        {(() => {
          const sprite = BACTERIA_SPRITE[card.slug]
          if (!sprite) return null
          // Each cell in the 5x5 grid is ~204px. Display at 56px = scale 0.274
          const cellSize = 204
          const displaySize = 56
          const scaledTotal = 1024 * (displaySize / cellSize)  // ~280px
          const offsetX = -sprite.col * displaySize
          const offsetY = -sprite.row * displaySize
          // Recolor via CSS filter: screen blend removes black bg,
          // hue-rotate shifts neon colors to red/green
          const hue = isProtective ? "hue-rotate(90deg)" : "hue-rotate(330deg)"
          return (
            <div style={{
              position: "absolute", top: 20, right: 20,
              width: displaySize, height: displaySize, borderRadius: 8,
              overflow: "hidden",
              mixBlendMode: "screen",
              opacity: 0.45,
            }}>
              <img
                src="/bacteria-icons.png"
                alt=""
                draggable={false}
                style={{
                  display: "block",
                  width: scaledTotal,
                  height: scaledTotal,
                  marginLeft: offsetX,
                  marginTop: offsetY,
                  filter: `${hue} saturate(0.5) brightness(1.2)`,
                }}
              />
            </div>
          )
        })()}

        {/* Bacteria name + tag */}
        <div style={{ marginBottom: 10, paddingRight: 84, marginTop: card.featured ? 28 : 0 }}>
          <span style={{
            fontFamily: serif, fontSize: 18, fontWeight: 500,
            color: accentColor, display: "block", lineHeight: 1.2,
          }}>
            {card.name}
          </span>
          <span style={{
            fontFamily: sans, fontSize: 10, color: accentColor,
            letterSpacing: "0.5px", opacity: 0.7,
          }}>
            {card.type}
          </span>
        </div>

        {/* Headline */}
        <p style={{
          fontFamily: serif, fontSize: 16, fontWeight: 400,
          color: headlineColor, lineHeight: 1.35, margin: "0 0 12px",
          maxWidth: 340,
        }}>
          {card.headline}
        </p>

        {/* Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {card.pills.map(pill => (
            <span key={pill} style={{
              fontFamily: sans, fontSize: 11,
              background: accentBg, color: accentColor,
              borderRadius: 20, padding: "3px 10px",
              whiteSpace: "nowrap",
            }}>
              {pill}
            </span>
          ))}
        </div>

        {/* Expand toggle */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
          style={{
            fontFamily: sans, fontSize: 11, color: "#9A7200",
            background: "none", border: "none", cursor: "pointer",
            padding: 0, letterSpacing: "0.3px",
          }}
        >
          {open ? "Show less \u2212" : "What does this mean? +"}
        </button>

        {/* Expanded content */}
        <div style={{
          maxHeight: open ? 500 : 0,
          overflow: "hidden",
          transition: "max-height 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease",
          opacity: open ? 1 : 0,
        }}>
          <div style={{ paddingTop: 14 }}>
            <p style={{
              fontFamily: sans, fontSize: 13,
              color: "rgba(20,20,16,0.65)", lineHeight: 1.65,
              margin: "0 0 10px",
            }}>
              {card.expanded}
            </p>
            <p style={{
              fontFamily: sans, fontSize: 11, fontStyle: "italic",
              color: "rgba(20,20,16,0.4)", lineHeight: 1.5,
              margin: 0,
            }}>
              {card.dataLine}
            </p>
          </div>
        </div>
      </div>
      </Link>
    </div>
  )
}

// ── Exported Component ──────────────────────────────────────────────────────

export function FindingsExplorer() {
  return (
    <div>
      {/* ── PROTECTIVE BACTERIA ──────────────────────────────────────── */}
      <span style={{
        fontFamily: sans, fontSize: 11, letterSpacing: "2px",
        textTransform: "uppercase", color: "#9A7200",
        display: "block", marginBottom: 20,
      }}>
        Protective Bacteria
      </span>

      <div className="card-grid" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 16, marginBottom: 40,
      }}>
        {PROTECTIVE.map((c, i) => <Card key={c.name} card={c} stagger={i * 100} />)}
      </div>

      {/* ── NITRIC OXIDE PATHWAY CALLOUT ─────────────────────────────── */}
      <div style={{
        background: "rgba(45,106,79,0.06)",
        borderLeft: "3px solid #2D6A4F",
        borderRadius: 8,
        padding: "24px 32px",
        marginBottom: 48,
      }}>
        <p style={{
          fontFamily: serif, fontSize: 20, fontWeight: 400,
          color: "#141410", lineHeight: 1.45,
          margin: "0 0 10px", maxWidth: 560,
        }}>
          Vegetables improve your heart health partly because your mouth bacteria convert
          their nitrates into nitric oxide &mdash; the molecule your blood vessels use to
          stay relaxed. Without the right bacteria, the conversion doesn&rsquo;t happen.
        </p>
        <span style={{
          fontFamily: sans, fontSize: 12,
          color: "rgba(20,20,16,0.4)",
        }}>
          The oral-cardiovascular pathway
        </span>
      </div>

      {/* ── PATHOGENIC BACTERIA ──────────────────────────────────────── */}
      <span style={{
        fontFamily: sans, fontSize: 11, letterSpacing: "2px",
        textTransform: "uppercase", color: "#9A7200",
        display: "block", marginBottom: 20,
      }}>
        Pathogenic Bacteria
      </span>

      <div className="card-grid" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 16, marginBottom: 48,
      }}>
        {PATHOGENIC.map((c, i) => <Card key={c.name} card={c} stagger={i * 100} />)}
      </div>

      {/* ── SHANNON NOTE ─────────────────────────────────────────────── */}
      <div style={{
        background: "rgba(20,20,16,0.025)",
        borderRadius: 10, padding: "24px 28px",
        marginBottom: 48,
        borderLeft: "3px solid rgba(20,20,16,0.08)",
      }}>
        <p style={{
          fontFamily: serif, fontSize: 16, fontWeight: 400,
          color: "#141410", margin: "0 0 10px",
        }}>
          A note on diversity scores
        </p>
        <p style={{
          fontFamily: sans, fontSize: 13,
          color: "rgba(20,20,16,0.55)", lineHeight: 1.65,
          margin: 0, maxWidth: 560,
        }}>
          Shannon diversity &mdash; a measure of how many different bacteria you have &mdash;
          showed no significant connection to blood markers when tested alone across 9,848 people.
          Peaq still includes diversity as one signal in your oral score, because research shows it
          matters for overall oral ecosystem health. But diversity alone doesn&rsquo;t tell you which
          bacteria are present. That&rsquo;s why specific bacteria are at the center of your score.
        </p>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

// ── Data ────────────────────────────────────────────────────────────────────

interface BacteriaCard {
  name: string
  type: "protective" | "pathogenic"
  headline: string
  pills: string[]
  expanded: string
  dataLine: string
}

const PROTECTIVE: BacteriaCard[] = [
  {
    name: "Haemophilus",
    type: "protective",
    headline: "Higher levels linked to lower blood sugar, lower triglycerides, lower blood pressure",
    pills: ["HbA1c", "Triglycerides", "Blood pressure", "HDL"],
    expanded: "Haemophilus helps your body produce nitric oxide \u2014 a molecule that relaxes blood vessels, improves blood flow, and reduces blood sugar buildup. People with more Haemophilus tend to have lower HbA1c and better cardiovascular markers. It declines naturally with age, which may partly explain why metabolic health worsens over time.",
    dataLine: "In 9,848 Americans: HbA1c r=\u22120.074 (p=9\u00d710\u207b\u00b9\u00b3) \u00b7 Triglycerides r=\u22120.094 (p=3\u00d710\u207b\u00b9\u2070)",
  },
  {
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
    name: "P. gingivalis",
    type: "pathogenic",
    headline: "Found in Alzheimer\u2019s brain tissue. Linked to elevated inflammation and cardiovascular risk.",
    pills: ["hsCRP", "Cardiovascular", "Neuroinflammation"],
    expanded: "P. gingivalis is the most studied pathogen in periodontal disease. It produces toxic proteins called gingipains that degrade tissue and evade your immune system. In peer-reviewed research, gingipains have been detected in the brain tissue of over 90% of Alzheimer\u2019s patients studied. It has been found in arterial plaque and linked to elevated inflammation. Low levels are manageable. Elevated and persistent levels are worth knowing about early.",
    dataLine: "Source: Dominy et al., Science Advances 2019 \u00b7 Haditsch et al., J Alzheimer\u2019s Disease 2020",
  },
  {
    name: "Tannerella",
    type: "pathogenic",
    headline: "Higher levels linked to higher blood sugar, higher inflammation, higher blood pressure",
    pills: ["Glucose", "HbA1c", "hsCRP", "Blood pressure"],
    expanded: "Tannerella forsythia is part of the \u2018red complex\u2019 \u2014 three bacteria strongly associated with advanced gum disease and systemic inflammation. In the CDC dataset, higher Tannerella showed up consistently across blood sugar, HbA1c, hsCRP, and blood pressure simultaneously. One of the clearest examples of an oral pathogen leaving a fingerprint in your bloodstream.",
    dataLine: "In 9,848 Americans: HbA1c r=+0.050 (p=1\u00d710\u207b\u2076) \u00b7 Diastolic BP r=+0.052 (p=4\u00d710\u207b\u2077)",
  },
  {
    name: "Fusobacterium",
    type: "pathogenic",
    headline: "Higher levels linked to higher LDL cholesterol and higher blood sugar",
    pills: ["LDL", "Glucose", "Colorectal cancer risk"],
    expanded: "Fusobacterium nucleatum is one of the most studied bacteria in cancer research \u2014 consistently found enriched in colorectal tumor tissue and studied as an early detection biomarker. In the CDC blood marker data, elevated Fusobacterium correlated with higher LDL and blood glucose. A bacteria most people have never heard of, found in most mouths, with implications well beyond oral health.",
    dataLine: "In 9,848 Americans: LDL r=+0.058 (p=1\u00d710\u207b\u2074) \u00b7 Glucose r=+0.038 (p=0.010)",
  },
  {
    name: "Prevotella",
    type: "pathogenic",
    headline: "Elevated levels linked to higher systemic inflammation",
    pills: ["hsCRP", "Inflammation"],
    expanded: "Prevotella intermedia is a periodontal pathogen linked to gum inflammation and bleeding. It thrives in inflamed tissue and produces compounds that further drive immune activation. In the CDC data, higher Prevotella correlated with elevated hsCRP \u2014 a marker of systemic inflammation that predicts cardiovascular events. Inflammation that starts in the mouth doesn\u2019t always stay there.",
    dataLine: "In 9,848 Americans: hsCRP r=+0.035 (p=0.017)",
  },
]

// ── Expandable Card ─────────────────────────────────────────────────────────

function Card({ card }: { card: BacteriaCard }) {
  const [open, setOpen] = useState(false)
  const isProtective = card.type === "protective"
  const accentColor = isProtective ? "#2D6A4F" : "#C0392B"
  const accentBg = isProtective ? "rgba(45,106,79,0.06)" : "rgba(192,57,43,0.06)"

  return (
    <div className="explore-card" style={{
      background: "#fff",
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 10,
      padding: "24px 24px 20px",
      position: "relative",
      transition: "transform 200ms ease",
    }}>
      {/* Image placeholder */}
      <div style={{
        position: "absolute", top: 20, right: 20,
        width: 52, height: 52, borderRadius: 10,
        background: "rgba(20,20,16,0.03)",
        border: "0.5px solid rgba(20,20,16,0.06)",
      }}>
        {/* // TODO: bacteria microscopy image */}
      </div>

      {/* Bacteria name + tag */}
      <div style={{ marginBottom: 10, paddingRight: 64 }}>
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
        color: "#141410", lineHeight: 1.35, margin: "0 0 12px",
        maxWidth: 340,
      }}>
        {card.headline}
      </p>

      {/* Pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {card.pills.map(pill => (
          <span key={pill} style={{
            fontFamily: sans, fontSize: 11,
            background: accentBg,
            color: accentColor,
            borderRadius: 20, padding: "3px 10px",
            whiteSpace: "nowrap",
          }}>
            {pill}
          </span>
        ))}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setOpen(o => !o)}
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
        maxHeight: open ? 400 : 0,
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
        gap: 16, marginBottom: 48,
      }}>
        {PROTECTIVE.map(c => <Card key={c.name} card={c} />)}
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
        {PATHOGENIC.map(c => <Card key={c.name} card={c} />)}
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

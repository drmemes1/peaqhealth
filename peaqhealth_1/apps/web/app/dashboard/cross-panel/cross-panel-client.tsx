"use client"
import Link from "next/link"
import { Nav } from "../../components/nav"

interface Modifier {
  id: string
  label: string
  points: number
  direction: "penalty" | "bonus"
  rationale: string
  panels: string[]
}

const SIGNAL_DETAILS: Record<string, { why: string; action: string }> = {
  triple_cardio_risk: {
    why: "These three signals share overlapping biological pathways. Periodontal pathogens drive systemic inflammation (elevating CRP and oxidative stress), which directly suppresses autonomic function (lowering HRV), while Lp(a) independently accelerates atherosclerosis. When all three are present simultaneously, the cardiovascular risk compounds multiplicatively, not additively.",
    action: "Prioritize dental cleaning to reduce periodontal pathogen load — this is the most modifiable of the three signals.",
  },
  dysbiosis_inflammation: {
    why: "A diverse oral microbiome keeps pathogenic species in check through competitive exclusion. When diversity drops (Shannon index <2.5), pathogenic species overgrow and increase bacteraemic exposure, driving hsCRP elevation through repeated low-grade immune activation.",
    action: "Increase dietary fiber and fermented food intake. Avoid antiseptic mouthwash — it kills the diversity-maintaining species.",
  },
  complete_picture: {
    why: "With all three panels providing data, the cross-panel intelligence engine can detect compound signals — both positive and negative — that single-panel approaches miss entirely. This bonus reflects the additional predictive value of the integrated view.",
    action: "Keep all three panels updated. Blood labs every 6 months, oral kit annually, sleep wearable nightly.",
  },
  oral_systemic_inflammation: {
    why: "Periodontal bacteria enter the bloodstream through inflamed gum tissue, triggering hepatic CRP production. The combination of elevated periodontal burden and hsCRP >1.0 suggests this oral-systemic pathway is actively contributing to systemic inflammation.",
    action: "Schedule a comprehensive periodontal evaluation — not just a routine cleaning.",
  },
  no_pathway_depleted: {
    why: "Oral nitrate-reducing bacteria convert dietary nitrate to nitric oxide — a critical vasodilator. When these bacteria are depleted (<10%) and HRV is already low (<40ms), nitric oxide availability drops, compounding autonomic dysfunction.",
    action: "Stop antiseptic mouthwash immediately. Increase dietary nitrate intake (beetroot, spinach, arugula).",
  },
  no_pathway_intact: {
    why: "Strong nitrate-reducing bacteria combined with good HRV indicates the oral nitric oxide pathway is functioning well — converting dietary nitrate to nitric oxide and supporting cardiovascular recovery.",
    action: "Maintain current oral care routine and dietary nitrate intake.",
  },
  sleep_antiinflammatory: {
    why: "Deep sleep drives anti-inflammatory cytokine release and glymphatic clearance. When deep sleep is strong (≥20%) and hsCRP is low (<1.0), the overnight anti-inflammatory cycle is functioning as intended.",
    action: "Maintain consistent sleep schedule. Both metrics reinforce each other.",
  },
  oral_systemic_resilience: {
    why: "High oral microbiome diversity (Shannon ≥3.0) provides competitive exclusion against pathogens, while low hsCRP confirms that the oral-systemic inflammation axis is not active.",
    action: "Continue supporting diversity through diet. Avoid unnecessary antibiotic exposure.",
  },
  metabolic_autonomic_loop: {
    why: "Low HRV, poor sleep efficiency, and elevated glucose form a bidirectional metabolic loop. Poor sleep raises cortisol and insulin resistance, while metabolic dysfunction fragments sleep architecture.",
    action: "Address sleep consistency first — it has the fastest downstream effect on glucose and HRV.",
  },
  oral_blood_lpa: {
    why: "Periodontal pathogens and elevated Lp(a) both drive vascular inflammation through overlapping pathways — bacteraemic exposure amplifies the atherogenic effect of Lp(a).",
    action: "Reduce periodontal burden through professional dental care. Lp(a) is largely genetic — focus on modifiable risk factors.",
  },
}

const PANEL_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  oral:  { dot: "#3B6D11", bg: "var(--panel-oral-bg, #EAF3DE)",  text: "var(--panel-oral-text, #27500A)" },
  blood: { dot: "#A32D2D", bg: "var(--panel-blood-bg, #FCEBEB)", text: "var(--panel-blood-text, #791F1F)" },
  sleep: { dot: "#185FA5", bg: "var(--panel-sleep-bg, #E6F1FB)", text: "var(--panel-sleep-text, #0C447C)" },
}

export function CrossPanelClient({ snapshot }: { snapshot: Record<string, unknown> | null }) {
  const modifiers = (snapshot?.modifiers_applied ?? []) as Modifier[]
  const modifierTotal = (snapshot?.modifier_total as number) ?? 0
  const baseScore = (snapshot?.base_score as number) ?? 0
  const score = (snapshot?.score as number) ?? 0

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: 0 }}>
            Cross-panel signals
          </h1>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-30)", textDecoration: "none" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#C49A3C" }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--ink-30)" }}>
            ← Dashboard
          </Link>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 22, lineHeight: 1.4, color: "var(--ink)", margin: "0 0 16px" }}>
            When panels compound, the score reflects it.
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.7, color: "var(--ink-60)", margin: "0 0 24px", maxWidth: 560 }}>
            Cross-panel modifiers fire when signals from multiple panels amplify each other — either compounding risk or reinforcing protection. Unlike individual panel scores, these modifiers detect patterns that no single test can see.
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: modifierTotal < 0 ? "var(--status-attention-text, #791F1F)" : "var(--status-optimal-text, #27500A)", margin: 0 }}>
            Net effect: {modifierTotal > 0 ? "+" : ""}{modifierTotal} pts
          </p>
        </div>

        {/* Signal rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48 }}>
          {modifiers.map(m => {
            const details = SIGNAL_DETAILS[m.id]
            const accentColor = m.direction === "bonus" ? "#3B6D11" : "#A32D2D"
            const pointColor = m.direction === "bonus" ? "var(--status-optimal-text, #27500A)" : "var(--status-attention-text, #791F1F)"
            return (
              <div key={m.id} style={{
                borderLeft: `3px solid ${accentColor}`,
                background: "var(--ink-04, rgba(20,20,16,0.04))",
                border: "0.5px solid var(--ink-08)",
                borderLeftWidth: 3,
                borderLeftColor: accentColor,
                borderRadius: 10,
                padding: "20px 24px",
              }}>
                {/* Top row: chips + points */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {m.panels.map(p => {
                      const pc = PANEL_COLORS[p]
                      return pc ? (
                        <span key={p} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 10, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
                          fontFamily: "var(--font-body)", color: pc.text, background: pc.bg,
                          padding: "2px 8px 2px 6px", borderRadius: 4,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: pc.dot }} />
                          {p}
                        </span>
                      ) : null
                    })}
                  </div>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: pointColor }}>
                    {m.direction === "bonus" ? "+" : "−"}{m.points} pts
                  </span>
                </div>

                {/* Signal name */}
                <p style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 500, color: "var(--ink)", margin: "0 0 6px" }}>
                  {m.label}
                </p>

                {/* Description */}
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.6, margin: "0 0 16px" }}>
                  {m.rationale}
                </p>

                {details && (
                  <>
                    <div style={{ height: 0.5, background: "var(--ink-08)", margin: "0 0 16px" }} />

                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)", margin: "0 0 6px" }}>
                        Why this fires
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.6, margin: 0 }}>
                        {details.why}
                      </p>
                    </div>

                    <div>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)", margin: "0 0 6px" }}>
                        What to do
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink)", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                        {details.action}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {modifiers.length === 0 && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 17, color: "var(--ink-40)", lineHeight: 1.4 }}>
              Your panels show no compounding risk signals. Check back as your data updates.
            </p>
          )}
        </div>

        {/* Score context card */}
        <div style={{
          background: "var(--peaq-bg-secondary, #F0EFE8)",
          borderRadius: 10,
          padding: 24,
        }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)", lineHeight: 1.7, margin: "0 0 16px" }}>
            Without cross-panel modifiers your base score would be {baseScore}. The {modifierTotal >= 0 ? "+" : ""}{modifierTotal} net effect brings your Peaq score to {score}. {modifiers.find(m => m.id === "triple_cardio_risk") ? "Improving the Triple cardiovascular signal alone would recover up to 5 points." : ""}
          </p>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-accent-gold, #C49A3C)", textDecoration: "none" }}>
            View your full score breakdown →
          </Link>
        </div>
      </main>
    </div>
  )
}

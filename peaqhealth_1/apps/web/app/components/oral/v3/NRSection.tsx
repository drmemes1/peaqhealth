/**
 * NR v1 section — two-axis honest display.
 *
 * Surfaces NR Capacity (biomass) AND NO Signature (composition pattern)
 * as separate cards. Risk category is derived synthesis. Paradox flag,
 * if set, gets a distinct callout above the cards.
 */
import type { OralPageData } from "../../../../lib/oral/v3/page-data"
import { ConfounderBadges } from "./CariesSection"

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

const RISK_HEADLINES: Record<string, string> = {
  optimal:                   "Optimal nitric oxide pathway",
  capacity_constrained:      "Limited bacterial biomass for NO production",
  composition_constrained:   "Bacterial mix limits NO conversion",
  compromised:               "Both biomass and composition limit NO",
  insufficient_data:         "Insufficient data for NO classification",
}

function statusColor(category: string | null): string {
  if (!category) return "var(--ink-60)"
  if (/robust|exceptional|favorable|strongly_favorable/.test(category)) return "var(--status-strong)"
  if (/moderate|low/.test(category)) return "var(--status-watch)"
  if (/depleted|unfavorable|strongly_unfavorable/.test(category)) return "var(--status-attention)"
  return "var(--ink-60)"
}

function ScoreCard({
  label,
  value,
  unit,
  category,
  description,
  thresholdNote,
}: {
  label: string
  value: string
  unit?: string
  category: string | null
  description: string
  thresholdNote?: string
}) {
  return (
    <div
      style={{
        background: "var(--off-white)",
        border: "0.5px solid var(--ink-12)",
        borderRadius: 12,
        padding: "24px 26px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-60)",
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: SERIF,
            fontSize: 44,
            fontWeight: 500,
            color: "var(--ink)",
            lineHeight: 1,
            letterSpacing: "-0.025em",
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: SANS, fontSize: 13, color: "var(--ink-60)" }}>{unit}</span>
        )}
      </div>
      {category && (
        <div
          style={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: statusColor(category),
            marginBottom: 14,
          }}
        >
          {category.replace(/_/g, " ")}
        </div>
      )}
      <p
        style={{
          fontFamily: SANS,
          fontSize: 13,
          color: "var(--ink-80)",
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {description}
      </p>
      {thresholdNote && (
        <p
          style={{
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: 12,
            color: "var(--ink-60)",
            marginTop: 12,
            marginBottom: 0,
            lineHeight: 1.5,
          }}
        >
          {thresholdNote}
        </p>
      )}
    </div>
  )
}

function ParadoxCallout() {
  return (
    <div
      style={{
        background: "rgba(184,137,58,0.10)",
        border: "0.5px solid var(--status-watch)",
        borderRadius: 12,
        padding: "18px 22px",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--status-watch)",
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Paradox flag
      </div>
      <h3
        style={{
          fontFamily: SERIF,
          fontSize: 22,
          fontWeight: 600,
          color: "var(--ink)",
          margin: "0 0 10px",
          letterSpacing: "-0.015em",
          lineHeight: 1.25,
        }}
      >
        Substantial biomass, unfavorable composition
      </h3>
      <p style={{ fontFamily: SANS, fontSize: 14, color: "var(--ink-80)", margin: 0, lineHeight: 1.6 }}>
        Your nitrate-reducing community has adequate biomass, but the composition pattern is
        associated with poor systemic NO response in published cohorts. Dietary nitrate alone may
        produce limited benefit until composition shifts.
      </p>
    </div>
  )
}

export function NRSection({ data }: { data: OralPageData }) {
  const nr = data.nr
  if (!nr) {
    return (
      <section id="nitric-oxide" style={{ marginBottom: 16 }}>
        <Eyebrow text="Nitric oxide · cardiovascular pathway" />
        <h2 style={titleStyle}>Nitric oxide analysis pending</h2>
        <p style={bodyStyle}>
          Your kit hasn&apos;t been classified by the NR-α pipeline yet — refresh this page
          after the next batch run completes.
        </p>
      </section>
    )
  }

  const headline = RISK_HEADLINES[nr.risk_category] ?? nr.risk_category.replace(/_/g, " ")
  const confounders = Object.entries(nr.confounder_adjustments)

  return (
    <section id="nitric-oxide" style={{ marginBottom: 16 }}>
      <Eyebrow text="Nitric oxide · cardiovascular pathway" />
      <h2 style={titleStyle}>{headline}</h2>
      <p style={bodyStyle}>
        Two scores — surfaced honestly side by side. <strong>NR Capacity</strong> is how much
        nitrate-reducing biomass you have. <strong>NO Signature</strong> is whether the species
        mix predicts strong systemic NO conversion. They can disagree, and when they do, that&apos;s
        information.
      </p>

      {nr.paradox_flag && <ParadoxCallout />}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <ScoreCard
          label="NR Capacity"
          value={nr.capacity_index != null ? nr.capacity_index.toFixed(1) : "—"}
          category={nr.capacity_category}
          description="How much nitrate-reducing bacterial biomass you have. Tiered by per-cell efficiency: Neisseria and Rothia weigh most, Veillonella weighs less."
        />
        <ScoreCard
          label="NO Signature"
          value={nr.no_signature != null ? nr.no_signature.toFixed(2) : "—"}
          unit="ratio"
          category={nr.no_signature_category}
          description="How well your bacterial composition predicts systemic NO conversion. Derived from Vanhatalo 2018 — patients with greatest plasma nitrite response had higher Rothia + Neisseria relative to Veillonella + Prevotella."
          thresholdNote="Thresholds derived from reported abundances; not directly published predictor cutoffs. See methodology."
        />
      </div>

      {confounders.length > 0 && <ConfounderBadges confounders={confounders} />}
    </section>
  )
}

const titleStyle: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: 36,
  fontWeight: 700,
  color: "var(--ink)",
  margin: "0 0 14px",
  letterSpacing: "-0.025em",
  lineHeight: 1.1,
}

const bodyStyle: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 15,
  color: "var(--ink-80)",
  margin: "0 0 22px",
  maxWidth: 720,
  lineHeight: 1.6,
}

function Eyebrow({ text }: { text: string }) {
  return (
    <p
      style={{
        fontFamily: SANS,
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        fontWeight: 600,
        color: "var(--gold)",
        margin: "0 0 12px",
      }}
    >
      {text}
    </p>
  )
}

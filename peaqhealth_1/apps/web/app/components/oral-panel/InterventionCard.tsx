"use client"

import type { Intervention } from "../../../lib/oral/interventionRegistry"

export type InterventionCardVariant = "standard" | "escalation"

export interface InterventionCardProps {
  intervention: Intervention
  variant?: InterventionCardVariant
  /** When true, render the alternativeAffirm variant ("you're already doing this — good"). */
  showAffirmation?: boolean
}

/**
 * InterventionCard — renders a single intervention from the
 * interventionRegistry. Three modes:
 *
 *   1. variant='standard'    — title, rationale, steps, meta footer
 *   2. variant='escalation'  — escalation copy when the standard path failed
 *   3. showAffirmation=true  — soft "keep doing what you're doing" treatment
 *
 * The card consumes the Intervention shape directly. There is no
 * transformation layer: anything renderable on the card is a property
 * on the registry entry.
 */
export default function InterventionCard({
  intervention,
  variant = "standard",
  showAffirmation = false,
}: InterventionCardProps) {
  if (showAffirmation) {
    return <AffirmationCard intervention={intervention} />
  }
  if (variant === "escalation") {
    return <EscalationCard intervention={intervention} />
  }
  return <StandardCard intervention={intervention} />
}

function StandardCard({ intervention: i }: { intervention: Intervention }) {
  return (
    <article
      className="oravi-intervention oravi-intervention-standard"
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hairline)",
        borderLeft: "3px solid var(--gold)",
        borderRadius: 4,
        padding: "26px 28px",
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        {i.category} · {i.evidenceTier} evidence
      </div>
      <h3
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          margin: "0 0 12px",
        }}
      >
        {i.title}
      </h3>
      <p
        className="body-small"
        style={{ color: "var(--ink-soft)", margin: "0 0 18px" }}
      >
        {i.rationale}
      </p>
      <ul role="list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {i.steps.map((step, idx) => (
          <li
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              fontFamily: "var(--font-instrument-sans), sans-serif",
              fontWeight: 400,
              fontSize: 15,
              color: "var(--ink-soft)",
              lineHeight: 1.55,
              padding: "7px 0",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "var(--gold)",
                marginTop: 10,
                flexShrink: 0,
              }}
            />
            <span style={{ minWidth: 0 }}>{step}</span>
          </li>
        ))}
      </ul>
      <MetaFooter intervention={i} />
      <ResponsivePadding />
    </article>
  )
}

function EscalationCard({ intervention: i }: { intervention: Intervention }) {
  if (!i.escalation) {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.warn(`InterventionCard: variant='escalation' but intervention "${i.id}" has no escalation field.`)
    }
    return null
  }
  const e = i.escalation
  return (
    <article
      className="oravi-intervention oravi-intervention-escalation"
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hairline)",
        borderLeft: "3px solid var(--status-attention)",
        borderRadius: 4,
        padding: "26px 28px",
      }}
    >
      <div className="eyebrow" style={{ color: "var(--status-attention)", marginBottom: 10 }}>
        Escalation · if behavioral fixes don&rsquo;t work
      </div>
      <h3
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          margin: "0 0 12px",
        }}
      >
        {e.title}
      </h3>
      <p className="body-small" style={{ color: "var(--ink-soft)", margin: 0 }}>
        {e.body}
      </p>
      <ResponsivePadding />
    </article>
  )
}

function AffirmationCard({ intervention: i }: { intervention: Intervention }) {
  if (!i.alternativeAffirm) return null
  const a = i.alternativeAffirm
  return (
    <article
      className="oravi-intervention oravi-intervention-affirmation"
      style={{
        background: "var(--paper-warm)",
        border: "1px solid var(--hairline)",
        borderRadius: 4,
        padding: "22px 24px",
      }}
    >
      <div className="eyebrow-subtle" style={{ marginBottom: 8 }}>
        You&rsquo;re already doing it
      </div>
      <h3
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          margin: "0 0 8px",
        }}
      >
        {a.title}
      </h3>
      <p className="body-small" style={{ color: "var(--ink-soft)", margin: 0 }}>
        {a.body}
      </p>
      <ResponsivePadding />
    </article>
  )
}

function MetaFooter({ intervention: i }: { intervention: Intervention }) {
  const items: { label: string; value: string }[] = []
  if (i.whatToTrack) items.push({ label: "Track", value: i.whatToTrack })
  if (i.expectedWeeks) items.push({ label: "Retest", value: `~${i.expectedWeeks} weeks` })
  if (i.citations.length > 0) items.push({ label: "Refs", value: i.citations.join(", ") })
  if (items.length === 0) return null
  return (
    <div
      className="oravi-intervention-meta"
      style={{
        marginTop: 20,
        paddingTop: 14,
        borderTop: "1px solid var(--hairline)",
        display: "flex",
        flexWrap: "wrap",
        gap: "12px 24px",
      }}
    >
      {items.map((it, idx) => (
        <div key={idx} style={{ minWidth: 0, maxWidth: "100%" }}>
          <div
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-soft-2)",
              marginBottom: 4,
            }}
          >
            {it.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-instrument-sans), sans-serif",
              fontWeight: 400,
              fontSize: 11,
              color: "var(--ink-soft)",
              lineHeight: 1.5,
            }}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function ResponsivePadding() {
  return (
    <style jsx>{`
      @media (max-width: 640px) {
        :global(.oravi-intervention) {
          padding: 20px 22px !important;
        }
      }
    `}</style>
  )
}

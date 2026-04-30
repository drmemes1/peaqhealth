"use client"

import type { ReactNode } from "react"

export interface ConnectionCardProps {
  /** Small uppercase label — e.g. "Cross-panel signal". */
  eyebrow?: string
  /** Card title. */
  title: string
  /** Body content. Use ConnectionCard.Biomarker for inline biomarker emphasis. */
  children: ReactNode
}

/**
 * ConnectionCard — surfaces cross-panel synthesis (e.g. "your oral
 * inflammatory pattern + your hs-CRP suggest the same root cause"). It
 * is visually distinct from InterventionCard because it represents
 * reasoning across data sources, not a specific action.
 *
 * Use ConnectionCard for narrative cross-panel claims. Use
 * InterventionCard for action recommendations. Use Panel for single-
 * source data displays.
 *
 * Inline biomarker references should be wrapped in
 * `<ConnectionCard.Biomarker>` so they render with extra weight to
 * stand out within prose.
 */
function ConnectionCardBase({ eyebrow, title, children }: ConnectionCardProps) {
  return (
    <article
      className="oravi-connection-card"
      style={{
        background: "var(--link-accent-pale)",
        borderLeft: "3px solid var(--link-accent)",
        borderRadius: 4,
        padding: "26px 30px",
      }}
    >
      {eyebrow ? (
        <div
          className="eyebrow"
          style={{ color: "var(--link-accent)", marginBottom: 10 }}
        >
          {eyebrow}
        </div>
      ) : null}
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
        {title}
      </h3>
      <div
        style={{
          fontFamily: "var(--font-instrument-sans), sans-serif",
          fontWeight: 400,
          fontSize: 15,
          color: "var(--ink-soft)",
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
      <style jsx>{`
        @media (max-width: 640px) {
          .oravi-connection-card {
            padding: 20px 22px !important;
          }
        }
      `}</style>
    </article>
  )
}

/**
 * Biomarker — inline emphasis for biomarker references inside a
 * ConnectionCard body, e.g. <Biomarker>hs-CRP</Biomarker>. Exported as
 * a named export rather than a dot-property on ConnectionCard so it
 * survives Next.js's client-reference serialization when consumed from
 * a server component.
 */
export function Biomarker({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-manrope), sans-serif",
        fontWeight: 700,
        color: "var(--ink)",
      }}
    >
      {children}
    </span>
  )
}

export default ConnectionCardBase

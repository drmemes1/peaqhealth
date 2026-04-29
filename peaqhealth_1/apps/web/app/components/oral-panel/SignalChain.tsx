"use client"

export interface SignalChainItem {
  /** Where the signal came from — e.g. "Questionnaire", "Oral microbiome", "Connection". */
  source: string
  /** The headline finding from this source. */
  finding: string
  /** Optional supporting detail. */
  detail?: string
}

export interface SignalChainProps {
  items: SignalChainItem[]
}

/**
 * SignalChain — visualizes a cross-source pattern by showing each
 * contributing signal as a flex-equal cell with a gold connector arrow
 * between cells.
 *
 * Use SignalChain inside narrative-style "pattern to understand"
 * sections, where the goal is to make the reasoning across data sources
 * legible. On mobile, items stack vertically with downward arrows.
 *
 * For action-oriented content with steps, use InterventionCard. For a
 * single cross-panel synthesis paragraph, use ConnectionCard.
 */
export default function SignalChain({ items }: SignalChainProps) {
  if (items.length === 0) return null

  return (
    <div
      role="list"
      aria-label="Signal chain"
      className="oravi-signal-chain"
      style={{
        background: "var(--cream)",
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        padding: 16,
        display: "flex",
        gap: 0,
        alignItems: "stretch",
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <div
            key={i}
            role="listitem"
            className="oravi-signal-item"
            style={{
              flex: 1,
              minWidth: 130,
              padding: "16px 18px",
              textAlign: "center",
              borderRight: isLast ? "none" : "1px dashed var(--hairline-strong)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              className="eyebrow-subtle"
              style={{
                color: "var(--gold)",
                fontSize: 10,
              }}
            >
              {item.source}
            </div>
            <div
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "-0.015em",
                color: "var(--ink)",
                lineHeight: 1.3,
              }}
            >
              {item.finding}
            </div>
            {item.detail ? (
              <div
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  fontWeight: 500,
                  fontSize: 11,
                  color: "var(--ink-soft-2)",
                  lineHeight: 1.4,
                }}
              >
                {item.detail}
              </div>
            ) : null}
            {!isLast ? (
              <>
                <span
                  className="oravi-signal-arrow-h"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: -8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontFamily: "var(--font-manrope), sans-serif",
                    fontWeight: 600,
                    fontSize: 18,
                    color: "var(--gold)",
                    background: "var(--cream)",
                    padding: "0 4px",
                    lineHeight: 1,
                  }}
                >
                  →
                </span>
                <span
                  className="oravi-signal-arrow-v"
                  aria-hidden="true"
                  style={{
                    display: "none",
                    fontFamily: "var(--font-manrope), sans-serif",
                    fontWeight: 600,
                    fontSize: 18,
                    color: "var(--gold)",
                    lineHeight: 1,
                    marginTop: 8,
                  }}
                >
                  ↓
                </span>
              </>
            ) : null}
          </div>
        )
      })}

      <style jsx>{`
        @media (max-width: 640px) {
          .oravi-signal-chain {
            flex-direction: column !important;
          }
          .oravi-signal-item {
            border-right: none !important;
            border-bottom: 1px dashed var(--hairline-strong) !important;
            padding-bottom: 22px !important;
          }
          .oravi-signal-item:last-child {
            border-bottom: none !important;
          }
          :global(.oravi-signal-arrow-h) {
            display: none !important;
          }
          :global(.oravi-signal-arrow-v) {
            display: inline-block !important;
          }
        }
      `}</style>
    </div>
  )
}

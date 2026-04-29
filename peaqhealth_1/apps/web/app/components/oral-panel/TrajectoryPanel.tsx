"use client"

export interface TrajectoryTest {
  /** Display date — e.g. "April 2026" or "~October 2026". */
  date: string
  /** Optional sub-label rendered below the date — e.g. "baseline", "recommended retest". */
  label?: string
}

export interface TrajectoryPanelProps {
  pastTests?: TrajectoryTest[]
  nextTest?: TrajectoryTest
  note?: string
}

/**
 * TrajectoryPanel — "this is your baseline" panel showing past samples
 * and an optional next recommended retest as a horizontal timeline.
 *
 * Use at the top of the oral panel before the headline metrics, to
 * frame the user's current snapshot in the context of their testing
 * cadence. Past dots are solid gold; the next-test dot is a dashed
 * empty circle.
 */
export default function TrajectoryPanel({ pastTests = [], nextTest, note }: TrajectoryPanelProps) {
  if (pastTests.length === 0 && !nextTest) return null

  const sequence: { test: TrajectoryTest; kind: "past" | "next" }[] = [
    ...pastTests.map(t => ({ test: t, kind: "past" as const })),
    ...(nextTest ? [{ test: nextTest, kind: "next" as const }] : []),
  ]

  return (
    <section
      style={{
        background: "var(--paper-warm)",
        border: "1px dashed var(--hairline-strong)",
        borderRadius: 6,
        padding: 32,
        textAlign: "center",
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 18 }}>
        Your testing trajectory
      </div>
      <ol
        className="oravi-trajectory-line"
        aria-label="Testing trajectory"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {sequence.map(({ test, kind }, i) => {
          const isLast = i === sequence.length - 1
          return (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 92 }}>
                <span
                  aria-hidden="true"
                  style={
                    kind === "past"
                      ? {
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: "var(--gold)",
                        }
                      : {
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: "var(--paper)",
                          border: "2px dashed var(--gold)",
                        }
                  }
                />
                <div
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    fontWeight: 500,
                    fontSize: 14,
                    color: "var(--ink-soft)",
                  }}
                >
                  {test.date}
                </div>
                {test.label ? (
                  <div
                    style={{
                      fontFamily: "var(--font-manrope), sans-serif",
                      fontWeight: 600,
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: kind === "past" ? "var(--gold)" : "var(--ink-soft-2)",
                    }}
                  >
                    {test.label}
                  </div>
                ) : null}
              </div>
              {!isLast ? (
                <span
                  className="oravi-trajectory-connector"
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 80,
                    height: 1,
                    background: "var(--gold-line)",
                    marginTop: 7,
                  }}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
      {note ? (
        <p
          style={{
            fontFamily: "var(--font-instrument-sans), sans-serif",
            fontWeight: 400,
            fontSize: 14,
            fontStyle: "italic",
            color: "var(--ink-soft-2)",
            marginTop: 16,
            marginBottom: 0,
          }}
        >
          {note}
        </p>
      ) : null}
      <style jsx>{`
        @media (max-width: 640px) {
          .oravi-trajectory-line {
            gap: 10px !important;
          }
          :global(.oravi-trajectory-connector) {
            width: 30px !important;
          }
        }
      `}</style>
    </section>
  )
}

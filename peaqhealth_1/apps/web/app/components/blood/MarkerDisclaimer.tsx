/**
 * Mandatory disclaimer rendered on every marker page.
 * Text is exact per the writing guide — do not edit.
 */
export function MarkerDisclaimer() {
  return (
    <p
      style={{
        fontFamily: "var(--font-body), 'Instrument Sans', sans-serif",
        fontSize: 12,
        lineHeight: 1.6,
        color: "var(--ink-50, rgba(20,20,16,0.5))",
        margin: "16px 0 28px",
        padding: "12px 14px",
        borderLeft: "2px solid var(--ink-12, rgba(20,20,16,0.12))",
      }}
    >
      This information is for wellness purposes only and is not a medical assessment. Always consult a medical professional about any health concerns.
    </p>
  )
}

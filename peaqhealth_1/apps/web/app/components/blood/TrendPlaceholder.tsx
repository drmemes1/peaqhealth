/**
 * Static placeholder shown until trend infrastructure rebuilds. Per
 * ADR-0020: the dropped lab_history table no longer carries trend data;
 * future trend infra will source from blood_results ordered by
 * collected_at + score_snapshots joined via blood_result_id.
 */
export function TrendPlaceholder() {
  const sans = "var(--font-body), 'Instrument Sans', sans-serif"
  const serif = "var(--font-display), 'Manrope', sans-serif"
  return (
    <section
      style={{
        background: "var(--paper, #FAFAF8)",
        border: "0.5px dashed var(--ink-12, rgba(20,20,16,0.12))",
        borderRadius: 12,
        padding: "20px 22px",
        marginBottom: 32,
        textAlign: "center",
      }}
    >
      <h3
        style={{
          fontFamily: serif,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--ink-60, rgba(20,20,16,0.6))",
          margin: "0 0 6px",
        }}
      >
        Trend over time
      </h3>
      <p
        style={{
          fontFamily: sans,
          fontSize: 12,
          color: "var(--ink-40, rgba(20,20,16,0.4))",
          margin: 0,
        }}
      >
        Upload another panel to start a trend line for this marker.
      </p>
    </section>
  )
}

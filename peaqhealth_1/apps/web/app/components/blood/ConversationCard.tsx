/**
 * Standard "For your next visit" card. Uses the approved passive CTA from
 * the writing guide — no directive language, no "you should", no
 * "we recommend".
 */
export function ConversationCard() {
  const sans = "var(--font-body), 'Instrument Sans', sans-serif"
  const serif = "var(--font-display), 'Manrope', sans-serif"
  return (
    <section
      style={{
        background: "white",
        border: "0.5px solid var(--ink-12, rgba(20,20,16,0.12))",
        borderRadius: 12,
        padding: "20px 22px",
        marginBottom: 32,
      }}
    >
      <h3
        style={{
          fontFamily: serif,
          fontSize: 16,
          fontWeight: 500,
          color: "var(--ink, #141410)",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
        }}
      >
        For your next visit
      </h3>
      <p
        style={{
          fontFamily: sans,
          fontSize: 14,
          lineHeight: 1.65,
          color: "var(--ink-70, rgba(20,20,16,0.75))",
          margin: 0,
        }}
      >
        These ranges are oravi-specific and longevity-oriented — they are not the same as the clinical reference ranges your doctor uses. Bringing this number to your next visit is a useful starting point for a longer conversation about what it means for you.
      </p>
    </section>
  )
}

"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function TrajectorySection({ sampleDate }: { sampleDate: string | null }) {
  const sample = sampleDate ? new Date(sampleDate) : new Date()
  const retest = new Date(sample.getTime() + 56 * 86400000)
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const weeksUntil = Math.max(0, Math.round((retest.getTime() - Date.now()) / (7 * 86400000)))

  return (
    <div style={{ background: "var(--paper)", border: "1px solid #D6D3C8", borderRadius: 18, padding: "32px 36px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32, alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C897F", fontWeight: 600, marginBottom: 8 }}>First sample</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500 }}>{fmt(sample)}</div>
        </div>
        <div style={{ textAlign: "center", fontFamily: serif, fontStyle: "italic", color: "#6B6860", fontSize: 14, lineHeight: 1.6 }}>
          <em>tracking</em>
          <div style={{ height: 1, background: "linear-gradient(to right, transparent, #B8935A, transparent)", margin: "8px 0" }} />
          Shannon · NR composite · gum bacteria · Veillonella context
        </div>
        <div>
          <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8C897F", fontWeight: 600, marginBottom: 8 }}>Recommended retest</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 500 }}>{fmt(retest)} <em style={{ fontStyle: "italic", color: "#6B6860", fontSize: 16 }}>· in {weeksUntil} weeks</em></div>
        </div>
      </div>
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px dashed #E5E2D8", fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#6B6860", lineHeight: 1.6 }}>
        Eight weeks is the timeframe at which dietary changes show up in your oral microbiome composition. Your retest will tell us whether the gum-tissue signals are responding to flossing and breathing changes — and whether your Veillonella context has shifted.
      </div>
    </div>
  )
}

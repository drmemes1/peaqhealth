"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

interface Stat {
  label: string
  value: string
  unit?: string
  verdict: "good" | "watch" | "concern"
  verdictLabel: string
}

const VERDICT_COLORS = { good: "#1A8C4E", watch: "#D4A934", concern: "#E88A7A" }

export function EspressoHero({ eyebrow, title, titleAccent, subtitle, stats }: {
  eyebrow: string
  title: string
  titleAccent: string
  subtitle: string
  stats?: Stat[]
}) {
  return (
    <div style={{
      background: "#2C2A24", position: "relative", overflow: "hidden",
      borderRadius: 12, marginBottom: 24,
    }}>
      {/* Radial glows */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 320, height: 320, background: "radial-gradient(circle, rgba(212,169,52,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -40, width: 240, height: 240, background: "radial-gradient(circle, rgba(212,169,52,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />

      <div className="espresso-hero-inner" style={{
        position: "relative", padding: "36px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32, flexWrap: "wrap",
      }}>
        {/* Left: title + subtitle */}
        <div style={{ flex: "1 1 400px", minWidth: 0 }}>
          <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(212,169,52,0.9)", marginBottom: 12 }}>
            {eyebrow}
          </div>
          <h1 style={{ fontFamily: serif, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 400, color: "#F5F3EE", margin: "0 0 14px", lineHeight: 1.15, letterSpacing: "-0.01em" }}>
            {title}{" "}
            <span style={{ color: "#D4A934", fontStyle: "italic" }}>{titleAccent}</span>
          </h1>
          <p style={{ fontFamily: serif, fontSize: 16, color: "rgba(245,243,238,0.85)", lineHeight: 1.65, margin: 0, maxWidth: 520 }}>
            {subtitle}
          </p>
        </div>

        {/* Right: stats */}
        {stats && stats.length > 0 && (
          <div style={{ display: "flex", gap: 24, flexShrink: 0, flexWrap: "wrap" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: "center", minWidth: 70 }}>
                <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,243,238,0.5)", marginBottom: 6 }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: serif, fontSize: 32, fontWeight: 500, color: "#F5F3EE", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {s.value}
                  {s.unit && <span style={{ fontSize: 16, fontWeight: 400, color: "rgba(245,243,238,0.5)", marginLeft: 2 }}>{s.unit}</span>}
                </div>
                <div style={{ fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: VERDICT_COLORS[s.verdict], marginTop: 4 }}>
                  {s.verdictLabel}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@media (max-width: 768px) { .espresso-hero-inner { padding: 24px 20px !important; } }`}</style>
    </div>
  )
}

"use client"


const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const BAND_COLORS: Record<string, string> = {
  EXCEPTIONAL: "#34d399",
  OPTIMIZED:   "#34d399",
  "ON PACE":   "#fbbf24",
  ELEVATED:    "#fb923c",
  ACCELERATED: "#f87171",
}

const BAND_LABELS: Record<string, string> = {
  EXCEPTIONAL: "Exceptional",
  OPTIMIZED:   "Optimized",
  "ON PACE":   "On Pace",
  ELEVATED:    "Elevated",
  ACCELERATED: "Accelerated",
}

export interface PeaqAgeHeroProps {
  peaqAge: number
  chronoAge: number
  delta: number
  band: string
  phenoAge: number | null
  firstName?: string
  headline?: string
}

function Gauge({ peaqAge, chronoAge, band }: { peaqAge: number; chronoAge: number; band: string }) {
  const MIN_AGE = 18
  const MAX_AGE = 80
  const clamp = (v: number) => Math.max(MIN_AGE, Math.min(MAX_AGE, v))
  const pct = (age: number) => (clamp(age) - MIN_AGE) / (MAX_AGE - MIN_AGE)

  const cx = 200, cy = 170, r = 140
  const startAngle = Math.PI * 0.8
  const endAngle   = Math.PI * 0.2
  const sweep      = 2 * Math.PI - (startAngle - endAngle)
  const totalLength = r * sweep

  const pointOnArc = (frac: number) => {
    const angle = startAngle - frac * sweep
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) }
  }

  const needleFrac = pct(peaqAge)
  const chronoPos  = pointOnArc(pct(chronoAge))
  const startPos   = pointOnArc(0)
  const needlePos  = pointOnArc(needleFrac)
  const color      = BAND_COLORS[band] ?? "#fbbf24"

  const arcPath = (frac: number) => {
    const s = pointOnArc(0)
    const e = pointOnArc(frac)
    const angle = frac * sweep
    const large = angle > Math.PI ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`
  }

  const spline = "0.34 1.2 0.64 1"
  const targetDashoffset = totalLength * (1 - needleFrac)

  return (
    <svg viewBox="0 0 400 220" style={{ width: "100%", maxWidth: 360, height: "auto" }}>
      {/* Background arc */}
      <path d={arcPath(1)} fill="none" stroke="rgba(250,250,248,0.06)" strokeWidth="6" strokeLinecap="round" />
      {/* Filled arc — animated via stroke-dashoffset (Firefox-safe) */}
      <path
        d={arcPath(1)}
        fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={totalLength}
        strokeDashoffset={totalLength}
        style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
      >
        <animate attributeName="stroke-dashoffset" from={totalLength} to={targetDashoffset} dur="1.2s" begin="0.3s" fill="freeze" calcMode="spline" keySplines={spline} keyTimes="0;1" />
      </path>
      {/* Chrono marker */}
      <circle cx={chronoPos.x} cy={chronoPos.y} r="4" fill="none" stroke="rgba(250,250,248,0.35)" strokeWidth="1.5" />
      <text x={chronoPos.x} y={chronoPos.y - 10} textAnchor="middle" fontFamily={sans} fontSize="8" fill="rgba(250,250,248,0.3)" letterSpacing="0.08em">
        CHRONO
      </text>
      {/* Needle dot — SMIL animation (Firefox-safe) */}
      <circle cx={startPos.x} cy={startPos.y} r="7" fill={color} style={{ filter: `drop-shadow(0 0 12px ${color}60)` }}>
        <animate attributeName="cx" from={startPos.x} to={needlePos.x} dur="1.2s" begin="0.3s" fill="freeze" calcMode="spline" keySplines={spline} keyTimes="0;1" />
        <animate attributeName="cy" from={startPos.y} to={needlePos.y} dur="1.2s" begin="0.3s" fill="freeze" calcMode="spline" keySplines={spline} keyTimes="0;1" />
      </circle>
      {/* Center text — fade in after animation starts */}
      <text x={cx} y={cy - 20} textAnchor="middle" fontFamily={serif} fontSize="52" fontWeight="300" fill="#FAFAF8" opacity="0">
        {peaqAge.toFixed(1)}
        <animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.8s" fill="freeze" />
      </text>
      <text x={cx} y={cy + 5} textAnchor="middle" fontFamily={sans} fontSize="10" fill="rgba(250,250,248,0.4)" letterSpacing="0.12em" style={{ textTransform: "uppercase" }}>
        PEAQ AGE
      </text>
      {/* Min/max labels */}
      <text x={pointOnArc(0).x - 5} y={pointOnArc(0).y + 16} textAnchor="middle" fontFamily={sans} fontSize="9" fill="rgba(250,250,248,0.2)">18</text>
      <text x={pointOnArc(1).x + 5} y={pointOnArc(1).y + 16} textAnchor="middle" fontFamily={sans} fontSize="9" fill="rgba(250,250,248,0.2)">80</text>
    </svg>
  )
}

export function PeaqAgeHero({ peaqAge, chronoAge, delta, band, phenoAge, firstName, headline }: PeaqAgeHeroProps) {
  const color = BAND_COLORS[band] ?? "#fbbf24"
  const bandLabel = BAND_LABELS[band] ?? band

  const deltaStr = delta > 0
    ? `${delta.toFixed(1)} yrs younger`
    : delta < 0
      ? `${Math.abs(delta).toFixed(1)} yrs older`
      : "on pace"

  const targetLow  = Math.floor(Math.min(peaqAge, chronoAge) - 1)
  const targetHigh = Math.floor(Math.min(peaqAge, chronoAge))
  const targetStr  = `${targetLow}\u2013${targetHigh}`

  return (
    <div style={{
      background: "rgba(250,250,248,0.03)",
      border: "0.5px solid rgba(250,250,248,0.08)",
      borderRadius: 16,
      padding: "32px 28px 24px",
      marginBottom: 28,
    }}>
      {/* Greeting + headline */}
      {headline && (
        <p style={{
          fontFamily: serif, fontStyle: "italic", fontSize: 15,
          color: "rgba(250,250,248,0.5)", margin: "0 0 20px",
          textAlign: "center", lineHeight: 1.5,
        }}>
          {headline}
        </p>
      )}

      {/* Gauge */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <Gauge peaqAge={peaqAge} chronoAge={chronoAge} band={band} />
      </div>

      {/* Band chip */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <span style={{
          fontFamily: sans, fontSize: 10, fontWeight: 500,
          letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "4px 16px", borderRadius: 20,
          background: `${color}18`, color, border: `0.5px solid ${color}40`,
        }}>
          {bandLabel}
        </span>
      </div>

      {/* Three-column stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr",
        gap: 0, alignItems: "stretch",
      }}>
        {/* Peaq Age */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 12px" }}>
          <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(250,250,248,0.35)", marginBottom: 4 }}>
            Peaq Age
          </span>
          <span style={{ fontFamily: serif, fontSize: 36, fontWeight: 300, color: "#FAFAF8", lineHeight: 1 }}>
            {peaqAge.toFixed(1)}
          </span>
          <span style={{ fontFamily: sans, fontSize: 10, color: "rgba(250,250,248,0.3)", marginTop: 2 }}>years</span>
        </div>

        {/* Divider */}
        <div style={{ width: "0.5px", background: "rgba(250,250,248,0.08)", margin: "4px 0" }} />

        {/* Chronological */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 12px" }}>
          <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(250,250,248,0.35)", marginBottom: 4 }}>
            Chronological
          </span>
          <span style={{ fontFamily: serif, fontSize: 28, fontWeight: 300, color: "rgba(250,250,248,0.55)", lineHeight: 1 }}>
            {chronoAge}
          </span>
          <span style={{ fontFamily: sans, fontSize: 10, color, marginTop: 4 }}>
            {deltaStr}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: "0.5px", background: "rgba(250,250,248,0.08)", margin: "4px 0" }} />

        {/* 6-month target */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 12px" }}>
          <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(250,250,248,0.35)", marginBottom: 4 }}>
            6-month target
          </span>
          <span style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: "#34d399", lineHeight: 1 }}>
            {targetStr}
          </span>
          <span style={{
            fontFamily: sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.06em",
            padding: "2px 10px", borderRadius: 20, marginTop: 6,
            background: "rgba(52,211,153,0.12)", color: "#34d399",
            border: "0.5px solid rgba(52,211,153,0.3)",
          }}>
            Actionable
          </span>
        </div>
      </div>
    </div>
  )
}

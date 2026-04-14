"use client"

import { useState } from "react"
import Link from "next/link"
import { Nav } from "../components/nav"
import { type ScoreWheelProps } from "../components/score-wheel"
import { PushNotificationPrompt } from "../components/push-notification-prompt"
import { IOSInstallBanner } from "../components/ios-install-banner"
import { PanelConvergence } from "../components/panel-convergence"
import { RefreshCw } from "lucide-react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

// ─── Design System Colors ───────────────────────────────────────────────────
const DS = {
  pageBg:    "#FAFAF8",
  sectionBg: "#F7F5F0",
  cardBg:    "#FFFFFF",
  cardBorder:"#EDE9E0",
  ink:       "#141410",
  inkMuted:  "#7A7A6E",
  gold:      "#B8860B",
  goldDark:  "#854F0B",
  goldBg:    "#F5EDD4",
  sleep:     "#4A7FB5",
  blood:     "#C0392B",
  oral:      "#2D6A4F",
  oralLight: "#5A9E7A",
  greenDark: "#0F6E56",
  redDark:   "#A32D2D",
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface LabHistoryPoint {
  locked_at: string
  total_score: number | null
  blood_score: number | null
  collection_date: string | null
  ldl_mgdl: number | null
  hdl_mgdl: number | null
  hs_crp_mgl: number | null
  vitamin_d_ngml: number | null
}

type DotColor = "green" | "amber" | "red" | "gray"

const DOT_COLORS: Record<DotColor, string> = {
  green: "#2D6A4F",
  amber: "#B8860B",
  red:   "#C0392B",
  gray:  "#D1CFC7",
}

interface Indicator {
  label: string
  color: DotColor
  tooltip: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncateInsightBody(text: string, max = 100): string {
  let cleaned = text
    .replace(/Peaq\s*Age\s*of\s*[\d.]+\s*(?:years?)?/gi, "")
    .replace(/delta\s*of\s*[+-]?[\d.]+/gi, "")
    .replace(/eGFR\s*(?:at\s*)?\d+\s*mL\/min/gi, "")
    .replace(/\d+\.?\d*\s*(?:mL|mg|mmol)(?:\/[a-zA-Z]+)?/gi, "")
    .replace(/\s{2,}/g, " ").trim()
  if (cleaned.length > max) cleaned = cleaned.slice(0, max).replace(/\s+\S*$/, "") + "..."
  return cleaned
}

function worstDot(...colors: DotColor[]): DotColor {
  if (colors.includes("red")) return "red"
  if (colors.includes("amber")) return "amber"
  if (colors.includes("green")) return "green"
  return "gray"
}

// ─── Indicator Builders ─────────────────────────────────────────────────────

function buildOralIndicators(
  oralData?: ScoreWheelProps["oralData"],
): Indicator[] {
  if (!oralData) {
    return [
      { label: "Good bacteria", color: "gray", tooltip: "Connect oral panel" },
      { label: "Harmful bacteria", color: "gray", tooltip: "Connect oral panel" },
      { label: "Cavity risk", color: "gray", tooltip: "Connect oral panel" },
      { label: "Breath health", color: "gray", tooltip: "Connect oral panel" },
      { label: "Diversity", color: "gray", tooltip: "Connect oral panel" },
      { label: "Inflammation risk", color: "gray", tooltip: "Connect oral panel" },
    ]
  }

  const nitrate = oralData.nitrateReducersPct ?? 0
  const patho = oralData.periodontPathPct ?? 0
  const species = oralData.species ?? {}
  const shannon = oralData.shannonDiversity ?? 0

  // 1. Good bacteria
  const goodColor: DotColor = nitrate >= 15 ? "green" : nitrate >= 5 ? "amber" : "red"
  const goodTip = `Nitrate-reducing bacteria at ${nitrate.toFixed(1)}%`

  // 2. Harmful bacteria
  const harmColor: DotColor = patho < 1 ? "green" : patho <= 5 ? "amber" : "red"
  const harmTip = `Periodontal pathogens at ${patho.toFixed(1)}%`

  // 3. Cavity risk
  const mutans = species["Streptococcus mutans"] ?? 0
  const sobrinus = species["Streptococcus sobrinus"] ?? 0
  const cavityWorst = Math.max(mutans, sobrinus)
  let cavityColor: DotColor = "gray"
  let cavityTip = "No species data available"
  if (Object.keys(species).length > 0) {
    cavityColor = cavityWorst <= 0.1 ? "green" : cavityWorst <= 0.5 ? "amber" : "red"
    cavityTip = `S. mutans ${mutans.toFixed(2)}%, S. sobrinus ${sobrinus.toFixed(2)}%`
  }

  // 4. Breath health
  const fuso = species["Fusobacterium nucleatum"] ?? 0
  const solo = species["Solobacterium moorei"] ?? 0
  const pepto = species["Peptostreptococcus spp."] ?? 0
  const breathWorst = Math.max(fuso, solo, pepto)
  let breathColor: DotColor = "gray"
  let breathTip = "No species data available"
  if (Object.keys(species).length > 0) {
    breathColor = breathWorst < 1 ? "green" : breathWorst <= 3 ? "amber" : "red"
    breathTip = `Volatile sulfur producers at ${breathWorst.toFixed(1)}%`
  }

  // 5. Diversity
  const divColor: DotColor = shannon >= 3.5 ? "green" : shannon >= 2.5 ? "amber" : "red"
  const divTip = `Shannon diversity index: ${shannon.toFixed(2)}`

  // 6. Inflammation risk
  let infColor: DotColor = "green"
  if (patho > 5 && nitrate < 5) infColor = "red"
  else if (patho > 2 || nitrate < 10) infColor = "amber"
  const infTip = infColor === "red"
    ? "High pathogens with low protective bacteria"
    : infColor === "amber"
    ? "Moderate imbalance detected"
    : "Balanced oral inflammation markers"

  return [
    { label: "Good bacteria", color: goodColor, tooltip: goodTip },
    { label: "Harmful bacteria", color: harmColor, tooltip: harmTip },
    { label: "Cavity risk", color: cavityColor, tooltip: cavityTip },
    { label: "Breath health", color: breathColor, tooltip: breathTip },
    { label: "Diversity", color: divColor, tooltip: divTip },
    { label: "Inflammation risk", color: infColor, tooltip: infTip },
  ]
}

function buildBloodIndicators(
  bloodData?: ScoreWheelProps["bloodData"],
): Indicator[] {
  if (!bloodData) {
    return [
      { label: "Cholesterol", color: "gray", tooltip: "Upload blood panel" },
      { label: "Inflammation", color: "gray", tooltip: "Upload blood panel" },
      { label: "Blood sugar", color: "gray", tooltip: "Upload blood panel" },
      { label: "Heart health", color: "gray", tooltip: "Upload blood panel" },
      { label: "Vitamin levels", color: "gray", tooltip: "Upload blood panel" },
      { label: "Cellular health", color: "gray", tooltip: "Available in next update" },
    ]
  }

  const { ldl, hdl, triglycerides, hsCRP, hba1c, glucose, lpa, vitaminD } = bloodData

  // 1. Cholesterol — worst of ldl, hdl (inverted), triglycerides
  const ldlDot: DotColor = ldl === 0 ? "gray" : ldl < 100 ? "green" : ldl <= 130 ? "amber" : "red"
  const hdlDot: DotColor = hdl === 0 ? "gray" : hdl > 60 ? "green" : hdl >= 40 ? "amber" : "red"
  const triDot: DotColor = triglycerides === 0 ? "gray" : triglycerides < 100 ? "green" : triglycerides <= 150 ? "amber" : "red"
  const cholDots = [ldlDot, hdlDot, triDot].filter(d => d !== "gray")
  const cholColor = cholDots.length > 0 ? worstDot(...cholDots) : "gray" as DotColor
  const cholTip = cholColor === "gray" ? "No cholesterol data" : `LDL ${ldl}, HDL ${hdl}, Triglycerides ${triglycerides}`

  // 2. Inflammation — hsCRP
  let crpColor: DotColor = "gray"
  let crpTip = "Add hs-CRP to next blood draw"
  if (hsCRP > 0) {
    crpColor = hsCRP < 1.0 ? "green" : hsCRP <= 3.0 ? "amber" : "red"
    crpTip = `hs-CRP at ${hsCRP.toFixed(1)} mg/L`
  }

  // 3. Blood sugar — worst of hba1c, glucose
  const a1cDot: DotColor = hba1c === 0 ? "gray" : hba1c < 5.7 ? "green" : hba1c < 6.5 ? "amber" : "red"
  const gluDot: DotColor = glucose === 0 ? "gray" : glucose < 100 ? "green" : glucose < 126 ? "amber" : "red"
  const sugarDots = [a1cDot, gluDot].filter(d => d !== "gray")
  const sugarColor = sugarDots.length > 0 ? worstDot(...sugarDots) : "gray" as DotColor
  const sugarTip = sugarColor === "gray" ? "No blood sugar data" : `HbA1c ${hba1c}%, Glucose ${glucose}`

  // 4. Heart health — lpa
  let heartColor: DotColor = "gray"
  let heartTip = "Lp(a) not tested"
  if (lpa > 0) {
    heartColor = lpa < 30 ? "green" : lpa <= 50 ? "amber" : "red"
    heartTip = `Lp(a) at ${lpa} nmol/L`
  }

  // 5. Vitamin levels — vitaminD
  let vitColor: DotColor = "gray"
  let vitTip = "Vitamin D not tested"
  if (vitaminD > 0) {
    vitColor = vitaminD > 50 ? "green" : vitaminD >= 30 ? "amber" : "red"
    vitTip = `Vitamin D at ${vitaminD} ng/mL`
  }

  return [
    { label: "Cholesterol", color: cholColor, tooltip: cholTip },
    { label: "Inflammation", color: crpColor, tooltip: crpTip },
    { label: "Blood sugar", color: sugarColor, tooltip: sugarTip },
    { label: "Heart health", color: heartColor, tooltip: heartTip },
    { label: "Vitamin levels", color: vitColor, tooltip: vitTip },
    { label: "Cellular health", color: "gray", tooltip: "Available in next update" },
  ]
}

function buildSleepIndicators(
  sleepData?: ScoreWheelProps["sleepData"],
  connected?: boolean,
): Indicator[] {
  if (!connected || !sleepData) {
    return [
      { label: "Deep sleep", color: "gray", tooltip: "Connect wearable" },
      { label: "REM", color: "gray", tooltip: "Connect wearable" },
      { label: "Duration", color: "gray", tooltip: "Connect wearable" },
      { label: "Recovery", color: "gray", tooltip: "Connect wearable" },
      { label: "Consistency", color: "gray", tooltip: "Coming soon — bedtime tracking updating" },
    ]
  }

  const { deepPct, remPct, efficiency, hrv } = sleepData

  const deepColor: DotColor = deepPct >= 20 ? "green" : deepPct >= 15 ? "amber" : "red"
  const remColor: DotColor = remPct >= 20 ? "green" : remPct >= 15 ? "amber" : "red"
  const durColor: DotColor = efficiency >= 90 ? "green" : efficiency >= 80 ? "amber" : "red"
  const recColor: DotColor = hrv >= 40 ? "green" : hrv >= 25 ? "amber" : "red"

  return [
    { label: "Deep sleep", color: deepColor, tooltip: `Deep sleep at ${deepPct.toFixed(0)}%` },
    { label: "REM", color: remColor, tooltip: `REM sleep at ${remPct.toFixed(0)}%` },
    { label: "Duration", color: durColor, tooltip: `Sleep efficiency at ${efficiency.toFixed(0)}%` },
    { label: "Recovery", color: recColor, tooltip: `HRV at ${hrv.toFixed(0)} ms` },
    { label: "Consistency", color: "gray", tooltip: "Coming soon — bedtime tracking updating" },
  ]
}

// ─── Indicator Dot Grid ─────────────────────────────────────────────────────

function IndicatorGrid({ indicators }: { indicators: Indicator[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <div style={{ marginTop: 16, marginBottom: 16, position: "relative" }}>
      {indicators.map((ind, i) => (
        <div
          key={i}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            height: 22, position: "relative", cursor: "default",
          }}
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <span style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: DOT_COLORS[ind.color],
          }} />
          <span style={{
            fontFamily: sans, fontSize: 11, color: DS.ink,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {ind.label}
          </span>
          {hoveredIdx === i && (
            <div style={{
              position: "absolute", bottom: "100%", left: 0,
              marginBottom: 4, zIndex: 10,
              background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
              borderRadius: 6, padding: "6px 10px",
              fontFamily: sans, fontSize: 11, color: DS.ink,
              maxWidth: 220, whiteSpace: "normal", lineHeight: 1.4,
              boxShadow: "0 2px 8px rgba(20,20,16,0.1)",
            }}>
              {ind.tooltip}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton Loaders ───────────────────────────────────────────────────────

// ─── Panel Visual Icons ─────────────────────────────────────────────────────

type PanelStatus = "Active" | "Review" | "Connect"

function OralIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ filter: `drop-shadow(0 0 8px rgba(45,106,79,0.3))` }}>
      <circle cx="12" cy="14" r="3.5" fill={DS.oral} />
      <circle cx="26" cy="11" r="3.5" fill={DS.oralLight} />
      <circle cx="19" cy="22" r="3.5" fill={DS.oral} />
      <circle cx="30" cy="24" r="3.5" fill={DS.oralLight} />
      <circle cx="10" cy="28" r="3.5" fill={DS.gold} />
    </svg>
  )
}

function SleepIcon({ sleepData }: { sleepData?: { hrv: number; [k: string]: unknown } }) {
  const label = sleepData ? `${sleepData.hrv?.toFixed(0) ?? "—"} ms HRV` : ""
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width="48" height="24" viewBox="0 0 48 24">
        {[0.4, 0.65, 1.0].map((op, i) => (
          <path
            key={i}
            d={`M 0 ${18 - i * 6} Q 12 ${12 - i * 6} 24 ${18 - i * 6} T 48 ${18 - i * 6}`}
            fill="none" stroke={DS.sleep} strokeWidth={1.5} opacity={op}
          />
        ))}
      </svg>
      {label && (
        <span style={{ fontFamily: sans, fontSize: 10, color: DS.inkMuted }}>{label}</span>
      )}
    </div>
  )
}

function BloodIcon({ bloodData }: { bloodData?: { hsCRP: number; ldl: number; hba1c: number } }) {
  if (!bloodData) return null
  const markers = [
    { label: "LDL", ok: bloodData.ldl < 130 },
    { label: "hs-CRP", ok: bloodData.hsCRP > 0 && bloodData.hsCRP < 2 },
    { label: "HbA1c", ok: bloodData.hba1c < 5.7 },
  ]
  const optimal = markers.filter(m => m.ok).length
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, width: 48 }}>
      {markers.map(m => (
        <div key={m.label} style={{
          height: 4, borderRadius: 2, width: "100%",
          background: m.ok ? DS.oral : DS.gold, opacity: 0.7,
        }} />
      ))}
      <span style={{ fontFamily: sans, fontSize: 10, color: DS.inkMuted, textAlign: "center", marginTop: 2 }}>
        {optimal}/{markers.length} optimal
      </span>
    </div>
  )
}

function ConnectIcon() {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: "50%",
      border: `2px dashed ${DS.inkMuted}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" stroke={DS.inkMuted} strokeWidth={1.5} fill="none">
        <line x1="7" y1="2" x2="7" y2="12" />
        <line x1="2" y1="7" x2="12" y2="7" />
      </svg>
    </div>
  )
}

// ─── Panel Node Card ────────────────────────────────────────────────────────

function PanelNode({ name, status, href, icon, label, indicators, bgImage }: {
  name: string; status: PanelStatus; href: string
  icon: React.ReactNode; label: string; indicators: Indicator[]
  bgImage?: string
}) {
  const statusColor = status === "Active" ? DS.oral : status === "Review" ? DS.gold : DS.inkMuted
  return (
    <Link href={href} className="panel-card" style={{
      background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
      borderRadius: 12, padding: "28px 24px", textDecoration: "none",
      display: "flex", flexDirection: "column", alignItems: "center",
      flex: "1 1 0", minWidth: 0, minHeight: 140,
      boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
      transition: "transform 150ms ease, box-shadow 150ms ease",
      position: "relative", zIndex: 1, overflow: "hidden",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(20,20,16,0.08)" }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 3px rgba(20,20,16,0.06)" }}
    >
      {bgImage && (
        <img src={bgImage} alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.6, pointerEvents: "none",
        }} />
      )}
      <span className="panel-card-name" style={{
        fontFamily: sans, fontSize: 10, letterSpacing: "0.14em",
        textTransform: "uppercase", color: DS.inkMuted, position: "relative",
      }}>
        {name}
      </span>
      <div style={{ marginTop: 12 }}>{icon}</div>
      <div className="indicator-grid"><IndicatorGrid indicators={indicators} /></div>
      <span style={{
        fontFamily: sans, fontSize: 10, fontWeight: 500,
        letterSpacing: "0.06em", textTransform: "uppercase",
        padding: "3px 10px", borderRadius: 20,
        ...(status === "Review"
          ? { background: "#FAEEDA", color: DS.goldDark }
          : { background: `${statusColor}14`, color: statusColor, border: `0.5px solid ${statusColor}40` }
        ),
      }}>
        {status}
      </span>
    </Link>
  )
}

// ─── Connection Lines SVG + Travelling Dots ─────────────────────────────────

function ConnectionLines({ statuses }: { statuses: [PanelStatus, PanelStatus, PanelStatus] }) {
  const allActive = statuses.every(s => s !== "Connect")
  const line1Active = statuses[0] !== "Connect" && statuses[1] !== "Connect"
  const line2Active = statuses[1] !== "Connect" && statuses[2] !== "Connect"

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <svg
        style={{
          position: "absolute", top: "50%", left: 0, width: "100%", height: 20,
          transform: "translateY(-50%)", pointerEvents: "none", overflow: "visible",
        }}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="glow">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={DS.gold} floodOpacity="0.4" />
          </filter>
        </defs>
        {/* Line 1: card 1 → card 2 */}
        <line
          x1="33%" y1="10" x2="66%" y2="10"
          stroke={line1Active ? DS.gold : DS.cardBorder}
          strokeWidth={1.5}
          opacity={line1Active ? 0.5 : 0.6}
          filter={line1Active && allActive ? "url(#glow)" : undefined}
          style={line1Active && allActive ? { animation: "glowPulse 3s ease-in-out infinite" } : undefined}
        />
        {/* Line 2: card 2 → card 3 */}
        <line
          x1="66%" y1="10" x2="100%" y2="10"
          stroke={line2Active ? DS.gold : DS.cardBorder}
          strokeWidth={1.5}
          opacity={line2Active ? 0.5 : 0.6}
          filter={line2Active && allActive ? "url(#glow)" : undefined}
          style={line2Active && allActive ? { animation: "glowPulse 3s ease-in-out infinite" } : undefined}
        />
      </svg>
      {/* Travelling dots as CSS-animated spans in the gaps */}
      {line1Active && allActive && (
        <span style={{
          position: "absolute", top: "50%", left: "calc(33.33% - 3px)",
          width: 6, height: 6, borderRadius: "50%",
          background: DS.gold, opacity: 0.7,
          transform: "translateY(-50%)",
          animation: "travelDot 2s linear infinite",
        }} />
      )}
      {line2Active && allActive && (
        <span style={{
          position: "absolute", top: "50%", left: "calc(66.66% - 3px)",
          width: 6, height: 6, borderRadius: "50%",
          background: DS.gold, opacity: 0.7,
          transform: "translateY(-50%)",
          animation: "travelDot 2s linear infinite",
          animationDelay: "1s",
        }} />
      )}
    </div>
  )
}

// ─── Band Chip ──────────────────────────────────────────────────────────────

function BandChip({ band, onGold = false }: { band: string; onGold?: boolean }) {
  const upper = band.toUpperCase()
  const isGood = upper === "EXCEPTIONAL" || upper === "OPTIMIZED"
  const isMid = upper === "ON PACE"
  const bg = isGood ? "#E1F5EE" : isMid ? "#FAEEDA" : "#FCEBEB"
  const color = isGood ? DS.greenDark : isMid ? DS.goldDark : DS.redDark
  const borderColor = onGold ? `${color}80` : color

  return (
    <span style={{
      display: "inline-block", fontFamily: sans, fontSize: 11,
      textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500,
      padding: "4px 14px", borderRadius: 20,
      background: bg, color, border: `1px solid ${borderColor}`,
    }}>
      {band}
    </span>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function DashboardClient(props: ScoreWheelProps & {
  labHistory?: LabHistoryPoint[];
  wearableNeedsReconnect?: boolean;
  firstName?: string;
  latestSleepDate?: string | null;
  trendDeltas?: { sleep: number | null; blood: number | null; oral: number | null };
  peaqAgeBreakdown?: Record<string, unknown> | null;
  cachedInsight?: { headline: string; body: string };
  cachedGuidance?: Array<{ title: string; timing: string }>;
  articles?: Array<{ slug: string; title: string; readTime: number }>;
}) {
  const { wearableNeedsReconnect = false, firstName, peaqAgeBreakdown, cachedInsight, cachedGuidance } = props
  const articles = props.articles && props.articles.length > 0 ? props.articles : null

  // ── Sync logic ────────────────────────────────────────────────────────────
  const [syncingNow, setSyncingNow] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const handleSyncNow = async () => {
    setSyncingNow(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/sync/now", { method: "POST" })
      if (res.status === 429) setSyncResult("Rate limited — try again in an hour")
      else if (res.ok) {
        const data = await res.json() as { records?: number }
        setSyncResult(`Synced ${data.records ?? 0} nights`)
        setTimeout(() => window.location.reload(), 1500)
      } else setSyncResult("Sync failed — try again later")
    } catch { setSyncResult("Sync failed — try again later") }
    finally { setSyncingNow(false) }
  }

  // ── Sleep toggle ──────────────────────────────────────────────────────────
  const [sleepHidden, setSleepHidden] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("peaq-sleep-panel-hidden") === "true"
  })


  const hasSleep = !sleepHidden && props.sleepConnected && props.breakdown.sleepSub > 0
  const hasBlood = !!props.bloodData
  const hasOral  = props.oralActive

  const panelCount = [hasSleep, hasBlood, hasOral].filter(Boolean).length

  // ── Panel statuses ────────────────────────────────────────────────────────
  const sleepStatus: PanelStatus = hasSleep ? "Active" : "Connect"
  const bloodStatus: PanelStatus = hasBlood
    ? (peaqAgeBreakdown && peaqAgeBreakdown.phenoAge == null && peaqAgeBreakdown.hasBW ? "Review" : "Active")
    : "Connect"
  const oralStatus: PanelStatus = hasOral
    ? (typeof peaqAgeBreakdown?.omaPct === "number" && (peaqAgeBreakdown.omaPct as number) < 40 ? "Review" : "Active")
    : "Connect"

  // ── Panel summary sentences ───────────────────────────────────────────────
  function panelSummary(panel: "sleep" | "blood" | "oral"): string {
    if (panel === "sleep") {
      if (!hasSleep) return "Not connected yet"
      if (props.sleepData) {
        const parts: string[] = []
        if (props.sleepData.deepPct >= 15) parts.push("Deep sleep strong")
        else parts.push("Deep sleep could improve")
        if (props.sleepData.hrv >= 30) parts.push("HRV in healthy range")
        else parts.push("HRV trending low")
        return parts.join(", ")
      }
      return "Sleep data processing"
    }
    if (panel === "blood") {
      if (!hasBlood) return "Not connected yet"
      if (props.bloodData) {
        if (bloodStatus === "Review") return "One or more markers need attention"
        const ldl = props.bloodData.ldl
        const hsCrp = props.bloodData.hsCRP
        if (ldl > 130 || (hsCrp > 0 && hsCrp > 3)) return "Some markers outside optimal range"
        return "Blood panel active, markers in range"
      }
      return "Processing lab results"
    }
    if (panel === "oral") {
      if (!hasOral) return "Not connected yet"
      if (props.oralData) {
        if (oralStatus === "Review") return "Microbiome needs attention"
        if (props.oralData.shannonDiversity >= 3.5) return "Diverse microbiome, protective species strong"
        return "Microbiome active, protective species present"
      }
      return "Awaiting oral results"
    }
    return ""
  }

  // ── Panel card labels ─────────────────────────────────────────────────────
  function oralLabel(): string {
    if (!hasOral) return "Connect"
    if (oralStatus === "Review") return "Needs attention"
    return "Microbiome active"
  }
  function sleepLabel(): string {
    if (!hasSleep) return "Connect"
    if (!props.sleepData) return "Processing"
    return `${props.sleepData.hrv?.toFixed(0) ?? "—"} ms HRV`
  }
  function bloodLabel(): string {
    if (!hasBlood) return "Connect"
    if (!props.bloodData) return "Processing"
    if (bloodStatus === "Review") return "Review needed"
    const markers = [
      props.bloodData.ldl < 130,
      props.bloodData.hsCRP > 0 && props.bloodData.hsCRP < 2,
      props.bloodData.hba1c < 5.7,
    ]
    const optimal = markers.filter(Boolean).length
    return `${optimal}/${markers.length} markers optimal`
  }

  // ── Action plan items ─────────────────────────────────────────────────────
  function getActionItems(): { label: string; timing: string }[] {
    if (!peaqAgeBreakdown) return []
    const b = peaqAgeBreakdown
    const mwType = props.lifestyleData?.mouthwashType
    const usesAntiseptic = mwType === "antiseptic" || mwType === "alcohol"
    const noHsCrp = !(b.hasBW && (b.missingPhenoMarkers as string[] ?? []).length === 0)
    const omaQcFail = typeof b.omaPct === "number" && (b.omaPct as number) < 40

    const actions: { label: string; timing: string }[] = []
    if (usesAntiseptic) actions.push({ label: "Switch from antiseptic mouthwash", timing: "Today" })
    if (omaQcFail) actions.push({ label: "More leafy greens and beetroot", timing: "Week 1" })
    if (noHsCrp) actions.push({ label: "Add hs-CRP to next blood draw", timing: "Next draw" })
    if (typeof b.rhrDelta === "number" && (b.rhrDelta as number) > 1) actions.push({ label: "Increase aerobic exercise", timing: "This month" })
    if (!hasSleep) actions.push({ label: "Connect a wearable for sleep data", timing: "Today" })
    if (!hasOral) actions.push({ label: "Order oral microbiome kit", timing: "This week" })
    return actions.slice(0, 3)
  }

  // ── Build indicators ──────────────────────────────────────────────────────
  const oralIndicators = buildOralIndicators(hasOral ? props.oralData : undefined)
  const bloodIndicators = buildBloodIndicators(hasBlood ? props.bloodData : undefined)
  const sleepIndicators = buildSleepIndicators(hasSleep ? props.sleepData : undefined, hasSleep)

  // ── V5 Dashboard (Peaq Age breakdown exists) ──────────────────────────────
  if (peaqAgeBreakdown && typeof peaqAgeBreakdown.peaqAge === "number") {
    const peaqAge = peaqAgeBreakdown.peaqAge as number
    const delta = peaqAgeBreakdown.delta as number
    const band = (peaqAgeBreakdown.band as string) ?? "ON PACE"
    const hasDob = peaqAgeBreakdown.hasDob as boolean | undefined
    const actionItems = getActionItems()
    // Reorder: Oral · Sleep · Blood
    const statuses: [PanelStatus, PanelStatus, PanelStatus] = [oralStatus, sleepStatus, bloodStatus]
    const anyMissing = !hasSleep || !hasBlood || !hasOral

    const targetLow = Math.max(18, peaqAge - 2).toFixed(0)
    const speciesCount = props.oralData?.species?.["Species richness"] as number | undefined
    const targetHigh = Math.max(18, peaqAge - 0.5).toFixed(0)

    return (
      <div className="min-h-svh" style={{ background: DS.pageBg }}>
        <Nav />
        <PushNotificationPrompt />

        <main className="dashboard-main" style={{ maxWidth: 1060, margin: "0 auto", padding: "40px 40px 80px" }}>

          {/* Reconnect banner */}
          {wearableNeedsReconnect && (
            <div style={{
              background: "rgba(184,134,11,0.08)", border: `0.5px solid rgba(184,134,11,0.25)`,
              borderRadius: 8, padding: "14px 18px", marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <p style={{ fontFamily: sans, fontSize: 13, color: DS.gold, margin: 0, lineHeight: 1.5 }}>
                Your {({ whoop: "WHOOP", oura: "Oura Ring", garmin: "Garmin", fitbit: "Fitbit" } as Record<string,string>)[props.wearableProvider ?? ""] ?? "wearable"} connection expired.
              </p>
              <Link href="/settings" style={{
                fontFamily: sans, fontSize: 12, fontWeight: 500,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: DS.gold, textDecoration: "none", whiteSpace: "nowrap",
              }}>
                Reconnect →
              </Link>
            </div>
          )}

          {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────── */}
          <div className="dashboard-two-col" style={{
            display: "flex", gap: 32, alignItems: "flex-start",
          }}>

            {/* ── LEFT COLUMN (main) ─────────────────────────────────────── */}
            <div className="dashboard-left" style={{ flex: "1 1 0", minWidth: 0, maxWidth: 700 }}>

              {/* 1. GREETING — italic gold name */}
              <div style={{ marginBottom: 36 }}>
                <h1 className="dashboard-greeting" style={{
                  fontFamily: serif, fontSize: 42, fontWeight: 300,
                  color: DS.ink, margin: 0, lineHeight: 1.2,
                }}>
                  {(() => {
                    const h = new Date().getHours()
                    const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
                    const name = firstName ?? ""
                    return name ? (
                      <>{greeting}, <em style={{ fontStyle: "italic", color: DS.gold }}>{name}.</em></>
                    ) : `${greeting}.`
                  })()}
                </h1>
                <p style={{
                  fontFamily: sans, fontSize: 11, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: DS.inkMuted,
                  margin: "8px 0 0", fontVariantNumeric: "tabular-nums",
                }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>

                {props.sleepConnected && !wearableNeedsReconnect && (
                  <button
                    onClick={handleSyncNow}
                    disabled={syncingNow}
                    style={{
                      fontFamily: sans, fontSize: 11, color: DS.inkMuted,
                      background: "none", border: "none", cursor: syncingNow ? "default" : "pointer",
                      padding: "4px 0", marginTop: 8,
                      display: "inline-flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <RefreshCw
                      size={12} strokeWidth={1.5}
                      style={{ animation: syncingNow ? "syncSpin 800ms linear infinite" : "none" }}
                    />
                    <span>{syncResult ?? "Sync wearable"}</span>
                  </button>
                )}
              </div>

              {/* 2. THREE PANEL NODES — Oral · Sleep · Blood */}
              <div className="panel-cards-row-wrapper" style={{ position: "relative", marginBottom: 36 }}>
                <ConnectionLines statuses={statuses} />
                <div className="panel-cards-row" style={{ display: "flex", gap: 16, position: "relative" }}>
                  <PanelNode
                    name="Oral" status={oralStatus} href="/dashboard/oral"
                    icon={hasOral ? <OralIcon /> : <ConnectIcon />}
                    label={oralLabel()}
                    indicators={oralIndicators}
                  />
                  <PanelNode
                    name="Sleep" status={sleepStatus} href="/dashboard/sleep"
                    icon={hasSleep ? <SleepIcon sleepData={props.sleepData} /> : <ConnectIcon />}
                    label={sleepLabel()}
                    indicators={sleepIndicators}
                    bgImage={"/peaq_mask.png"}
                  />
                  <PanelNode
                    name="Blood" status={bloodStatus} href="/dashboard/blood"
                    icon={hasBlood ? <BloodIcon bloodData={props.bloodData} /> : <ConnectIcon />}
                    label={bloodLabel()}
                    indicators={bloodIndicators}
                  />
                </div>
              </div>

              {/* 3. BACTERIA COUNT + PEAQ+ AGE — side by side */}
              <div className="score-row" style={{ display: "flex", gap: 16, marginBottom: 36 }}>

                {/* BACTERIA COUNT CARD */}
                <Link href="/dashboard/oral" style={{
                  flex: "0 0 200px", borderRadius: 16, overflow: "hidden",
                  position: "relative", textDecoration: "none", display: "flex",
                  flexDirection: "column", alignItems: "center", justifyContent: "center",
                  minHeight: 240,
                  boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                  border: `0.5px solid ${DS.cardBorder}`,
                }}>
                  <video src="/bac_moving.mp4" autoPlay loop muted playsInline style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%",
                    objectFit: "cover", filter: "blur(2px) brightness(0.35)",
                  }} />
                  <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: 24 }}>
                    <span style={{
                      fontFamily: sans, fontSize: 9, letterSpacing: "0.14em",
                      textTransform: "uppercase", color: "rgba(255,255,255,0.6)",
                      display: "block", marginBottom: 12,
                    }}>
                      SPECIES FOUND
                    </span>
                    {/* Green ring counter */}
                    <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 12px" }}>
                      <svg viewBox="0 0 96 96" style={{ width: 96, height: 96, transform: "rotate(-90deg)" }}>
                        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                        <circle cx="48" cy="48" r="40" fill="none" stroke={DS.oral} strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(1, (speciesCount ?? 0) / 200))}`}
                          style={{ filter: `drop-shadow(0 0 6px ${DS.oral})`, transition: "stroke-dashoffset 1s ease" }}
                        />
                      </svg>
                      <span style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: serif, fontSize: 36, fontWeight: 300, color: "#FFFFFF",
                        letterSpacing: -1,
                      }}>
                        {speciesCount ?? "—"}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.5)",
                    }}>
                      {speciesCount ? "unique bacteria detected" : "Order kit to discover"}
                    </span>
                  </div>
                </Link>

                {/* PEAQ+ AGE CARD — shrunk */}
                <div className="peaq-age-card" style={{
                  flex: 1, background: "#FAF7EE", border: `0.5px solid rgba(184,134,11,0.2)`,
                  borderRadius: 16, padding: "32px 28px", textAlign: "center",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                  position: "relative", overflow: "hidden",
                }}>
                  <img src="/images/snowcapped.jpg" alt="" style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%",
                    objectFit: "cover", opacity: 0.18, pointerEvents: "none",
                  }} />
                  <span style={{
                    fontFamily: sans, fontSize: 10, letterSpacing: "0.16em",
                    textTransform: "uppercase", color: DS.goldDark, position: "relative",
                  }}>
                    PEAQ+ AGE
                  </span>

                  <div className="peaq-age-number" style={{
                    fontFamily: serif, fontSize: 72, fontWeight: 300,
                    color: DS.ink, letterSpacing: -2, lineHeight: 1,
                    margin: "8px 0 8px", position: "relative",
                  }}>
                    {peaqAge.toFixed(1)}
                  </div>

                  <p className="peaq-age-delta" style={{
                    fontFamily: serif, fontSize: 18, fontStyle: "italic",
                    color: delta < 0 ? DS.greenDark : delta > 0 ? DS.redDark : DS.inkMuted,
                    margin: "0 0 12px",
                  }}>
                    {delta < 0
                      ? `${Math.abs(delta).toFixed(1)} yrs younger`
                      : delta > 0
                      ? `${delta.toFixed(1)} yrs older`
                      : "Right at your calendar age"
                    }
                  </p>

                  <BandChip band={band} onGold />

                  <p style={{
                    fontFamily: sans, fontSize: 11, color: DS.goldDark,
                    margin: "12px 0 0",
                  }}>
                    6-mo target: {targetLow}–{targetHigh}
                  </p>

                  {hasDob === false && (
                    <p style={{
                      fontFamily: sans, fontSize: 10, color: DS.goldDark,
                      margin: "6px 0 0", opacity: 0.7,
                    }}>
                      <Link href="/settings" style={{ color: DS.gold, textDecoration: "underline" }}>
                        Add DOB
                      </Link>{" "}for exact age
                    </p>
                  )}

                  <Link href="/science" style={{
                    fontFamily: sans, fontSize: 11, color: DS.gold,
                    textDecoration: "none", display: "inline-block",
                    marginTop: 8,
                  }}>
                    How is this calculated? →
                  </Link>
                </div>
              </div>

              {/* 4. AI INSIGHT CARD — cached from snapshot, no spinner */}
              <div className="insight-card" style={{
                background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                borderLeft: cachedInsight ? `3px solid ${DS.gold}` : `3px solid ${DS.cardBorder}`,
                borderRadius: 12, padding: "24px 28px", marginBottom: 36,
                boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: DS.inkMuted,
                }}>
                  PEAQ INSIGHT
                </span>
                <h2 style={{
                  fontFamily: serif, fontSize: 22, fontStyle: "italic",
                  fontWeight: 400, color: DS.ink, margin: "10px 0 8px",
                  lineHeight: 1.3,
                }}>
                  {cachedInsight?.headline ?? "Your health picture is coming together."}
                </h2>
                <p style={{
                  fontFamily: sans, fontSize: 15, fontWeight: 300,
                  color: DS.inkMuted, lineHeight: 1.6, margin: "0 0 12px",
                }}>
                  {cachedInsight ? truncateInsightBody(cachedInsight.body) : "Check back after your next sync for personalized insights."}
                </p>
                {cachedInsight && (
                  <Link href="/dashboard/insights" style={{
                    fontFamily: sans, fontSize: 12, color: DS.gold,
                    textDecoration: "none",
                  }}>
                    Read why →
                  </Link>
                )}
              </div>

              {/* 5. PANEL SUMMARY — THREE ROWS */}
              <div style={{
                background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                borderRadius: 12, marginBottom: 36, overflow: "hidden",
                boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
              }}>
                {(["sleep", "blood", "oral"] as const).map((panel, i) => {
                  const color = ({ sleep: DS.sleep, blood: DS.blood, oral: DS.oral })[panel]
                  const status = ({ sleep: sleepStatus, blood: bloodStatus, oral: oralStatus })[panel]
                  const href = `/dashboard/${panel}`
                  const summary = panelSummary(panel)
                  const showBadge = status !== "Active" || panel !== "sleep" || !hasSleep

                  return (
                    <Link key={panel} href={href} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "16px 20px",
                        borderBottom: i < 2 ? `0.5px solid ${DS.cardBorder}` : "none",
                        transition: "background 150ms ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = DS.sectionBg }}
                      onMouseLeave={e => { e.currentTarget.style.background = "" }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{
                          fontFamily: sans, fontSize: 13, color: DS.ink,
                          fontWeight: 500, width: 48, flexShrink: 0,
                          textTransform: "capitalize",
                        }}>
                          {panel}
                        </span>
                        <span style={{
                          fontFamily: sans, fontSize: 13, color: DS.inkMuted,
                          flex: 1, minWidth: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {summary}
                        </span>
                        {showBadge && (
                          <span style={{
                            fontFamily: sans, fontSize: 10, fontWeight: 500,
                            letterSpacing: "0.06em", textTransform: "uppercase",
                            padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                            ...(status === "Review"
                              ? { background: "#FAEEDA", color: DS.goldDark }
                              : status === "Active"
                              ? { background: `${DS.oral}14`, color: DS.oral, border: `0.5px solid ${DS.oral}40` }
                              : { background: `${DS.inkMuted}14`, color: DS.inkMuted, border: `0.5px solid ${DS.inkMuted}40` }
                            ),
                          }}>
                            {status}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* 6. CROSS-PANEL SIGNALS — template-based, no API call */}
              {(() => {
                const b = peaqAgeBreakdown
                const signals: { title: string; body: string; tag: string | null; color: string; positive: boolean }[] = []
                if (b && b.i1 === -0.3)
                  signals.push({ title: "Your oral health is supporting your heart", body: "Protective bacteria are strong and inflammation is low — a favorable signal connecting your mouth and cardiovascular system.", tag: "Oral × Blood", color: DS.oral, positive: true })
                if (b && b.i2 === -0.2)
                  signals.push({ title: "Oral health and recovery are aligned", body: "Strong protective species combined with a healthy resting heart rate suggest your nitric oxide pathway is working well.", tag: "Oral × Fitness", color: DS.sleep, positive: true })
                if (b && b.i3 === -0.2)
                  signals.push({ title: "Low inflammation with great sleep", body: "Consistent sleep timing and low hs-CRP together are one of the strongest combinations in the formula.", tag: "Blood × Sleep", color: DS.gold, positive: true })
                if (signals.length === 0 && panelCount >= 1)
                  signals.push({ title: "Cross-panel signals unlock as you connect panels", body: "When your oral, blood, and sleep data combine, Peaq surfaces connections no single test can see.", tag: null, color: DS.inkMuted, positive: false })
                if (signals.length === 0) return null

                return (
                  <div style={{
                    background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                    borderLeft: signals[0].positive ? `3px solid ${signals[0].color}` : `3px solid ${DS.cardBorder}`,
                    borderRadius: 12, padding: 24, marginBottom: 36,
                    boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                  }} className="cross-panel-card">
                    <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: DS.inkMuted, display: "block", marginBottom: 12 }}>
                      Cross-Panel Signals
                    </span>
                    {signals.map((s, i) => (
                      <div key={i} style={{ padding: "12px 0", borderBottom: i < signals.length - 1 ? `0.5px solid ${DS.cardBorder}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                          {s.tag && <span style={{ fontFamily: sans, fontSize: 8, letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600, color: s.color, background: `${s.color}14`, border: `0.5px solid ${s.color}30`, borderRadius: 20, padding: "2px 8px" }}>{s.tag}</span>}
                        </div>
                        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: DS.ink, marginBottom: 4 }}>{s.title}</div>
                        <div style={{ fontFamily: sans, fontSize: 11, color: DS.inkMuted, lineHeight: 1.5 }}>{s.body}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

            </div>

            {/* ── RIGHT RAIL ──────────────────────────────────────────────── */}
            <div className="dashboard-rail" style={{
              width: 280, flexShrink: 0,
              display: "flex", flexDirection: "column", gap: 28,
            }}>

              {/* ZONE 1 — YOUR PLAN */}
              <div style={{
                background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                borderRadius: 12, padding: 20,
                boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: DS.inkMuted,
                  display: "block", marginBottom: 14,
                }}>
                  YOUR PLAN
                </span>
                {(() => {
                  const items = cachedGuidance ?? actionItems
                  if (items.length === 0)
                    return <p style={{ fontFamily: sans, fontSize: 13, color: DS.inkMuted, margin: 0 }}>All markers in range. Keep going.</p>
                  return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {items.map((a, i) => (
                        <div key={i} style={{
                          padding: "10px 0",
                          borderBottom: i < items.length - 1 ? `0.5px solid ${DS.cardBorder}` : "none",
                        }}>
                          <p style={{ fontFamily: sans, fontSize: 14, color: DS.ink, margin: 0, lineHeight: 1.4 }}>
                            {"title" in a ? a.title : (a as unknown as { label: string }).label}
                          </p>
                          <p style={{ fontFamily: sans, fontSize: 12, color: DS.inkMuted, margin: "2px 0 0" }}>
                            {a.timing}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                })()}
                <Link href="/dashboard/guidance" style={{
                  fontFamily: sans, fontSize: 12, color: DS.gold,
                  textDecoration: "none", display: "block", marginTop: 14,
                }}>
                  View full plan →
                </Link>
              </div>

              {/* ZONE 2 — FROM PEAQ (dynamic from articles table) */}
              <div style={{
                background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                borderRadius: 12, padding: 20,
                boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: DS.inkMuted,
                  display: "block", marginBottom: 14,
                }}>
                  FROM PEAQ
                </span>
                {(articles ?? [
                  { slug: "", title: "How your oral health affects your heart", readTime: 5 },
                  { slug: "", title: "Why sleep timing matters more than duration", readTime: 4 },
                ]).map((post, i, arr) => (
                  <Link key={post.slug || i} href={post.slug ? `/learn/${post.slug}` : "/science"} className="from-peaq-row" style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 8, padding: "14px 0", textDecoration: "none",
                    borderBottom: i < arr.length - 1 ? `0.5px solid ${DS.cardBorder}` : "none",
                  }}>
                    <div>
                      <p style={{ fontFamily: sans, fontSize: 13, color: DS.ink, margin: 0, lineHeight: 1.4 }}>
                        {post.title}
                      </p>
                      <p style={{ fontFamily: sans, fontSize: 11, color: DS.inkMuted, margin: "2px 0 0" }}>
                        {post.readTime} min read
                      </p>
                    </div>
                    <span className="from-peaq-arrow" style={{
                      color: DS.inkMuted, fontSize: 14, flexShrink: 0,
                      transition: "transform 150ms ease",
                    }}>→</span>
                  </Link>
                ))}
              </div>

              {/* ZONE 3 — FIND A DENTIST */}
              <div style={{
                borderRadius: 12, overflow: "hidden",
                boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                border: `0.5px solid ${DS.cardBorder}`,
                position: "relative", minHeight: 180,
                display: "flex", flexDirection: "column", justifyContent: "flex-end",
              }}>
                <img
                  src="/peaqdentist1.png"
                  alt="Peaq Dentist"
                  style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%",
                    objectFit: "cover", objectPosition: "top center",
                  }}
                />
                <div style={{
                  position: "relative", zIndex: 1,
                  background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)",
                  padding: "40px 20px 20px",
                }}>
                  <span style={{
                    fontFamily: sans, fontSize: 9, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: "rgba(255,255,255,0.6)",
                    display: "block", marginBottom: 6,
                  }}>
                    FIND A DENTIST
                  </span>
                  <p style={{
                    fontFamily: serif, fontSize: 18, fontWeight: 400,
                    color: "#FFFFFF", margin: "0 0 4px", lineHeight: 1.3,
                  }}>
                    Peaq Dentists
                  </p>
                  <p style={{
                    fontFamily: sans, fontSize: 12, color: DS.gold,
                    margin: 0, fontWeight: 500,
                  }}>
                    Coming soon
                  </p>
                </div>
              </div>

              {/* ZONE 3 — GET MORE FROM PEAQ (only if panels missing) */}
              {anyMissing && (
                <div style={{
                  background: DS.cardBg, border: `0.5px solid ${DS.cardBorder}`,
                  borderRadius: 12, padding: 20,
                  boxShadow: "0 1px 3px rgba(20,20,16,0.06)",
                }}>
                  <span style={{
                    fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: DS.inkMuted,
                    display: "block", marginBottom: 14,
                  }}>
                    GET MORE FROM PEAQ
                  </span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {!hasSleep && (
                      <Link href="/settings#wearables" style={{
                        padding: "10px 0", textDecoration: "none",
                        borderBottom: (!hasBlood || !hasOral) ? `0.5px solid ${DS.cardBorder}` : "none",
                      }}>
                        <p style={{ fontFamily: sans, fontSize: 13, color: DS.ink, margin: 0 }}>
                          Unlock sleep &amp; HRV data
                        </p>
                        <p style={{ fontFamily: sans, fontSize: 12, color: DS.gold, margin: "2px 0 0" }}>
                          Connect wearable →
                        </p>
                      </Link>
                    )}
                    {!hasBlood && (
                      <Link href="/settings/labs" style={{
                        padding: "10px 0", textDecoration: "none",
                        borderBottom: !hasOral ? `0.5px solid ${DS.cardBorder}` : "none",
                      }}>
                        <p style={{ fontFamily: sans, fontSize: 13, color: DS.ink, margin: 0 }}>
                          Complete your health picture
                        </p>
                        <p style={{ fontFamily: sans, fontSize: 12, color: DS.gold, margin: "2px 0 0" }}>
                          Upload blood panel →
                        </p>
                      </Link>
                    )}
                    {!hasOral && (
                      <Link href="/shop" style={{ padding: "10px 0", textDecoration: "none" }}>
                        <p style={{ fontFamily: sans, fontSize: 13, color: DS.ink, margin: 0 }}>
                          Discover your oral microbiome
                        </p>
                        <p style={{ fontFamily: sans, fontSize: 12, color: DS.gold, margin: "2px 0 0" }}>
                          Order kit →
                        </p>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <IOSInstallBanner />

        <style>{`
          @keyframes glowPulse {
            0%, 100% { opacity: 0.35; }
            50%      { opacity: 0.55; }
          }
          @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50%      { opacity: 1; }
          }
          @keyframes syncSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes seeWhyPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.4; transform: scale(0.8); }
          }
          @keyframes seeWhyFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes travelDot {
            0%   { left: calc(33.33% - 3px); opacity: 0; }
            10%  { opacity: 0.7; }
            90%  { opacity: 0.7; }
            100% { left: calc(66.66% - 3px); opacity: 0; }
          }
          .from-peaq-row:hover .from-peaq-arrow {
            transform: translateX(3px);
          }
          @media (max-width: 768px) {
            .dashboard-main {
              padding: 20px 16px 60px !important;
            }
            .dashboard-two-col {
              flex-direction: column !important;
              gap: 24px !important;
            }
            .dashboard-left {
              max-width: 100% !important;
            }
            .dashboard-rail {
              width: 100% !important;
            }
            .dashboard-greeting {
              font-size: 32px !important;
            }
            .panel-cards-row {
              flex-direction: row !important;
              gap: 10px !important;
            }
            .panel-card {
              padding: 16px 12px !important;
              min-height: 120px !important;
            }
            .panel-card-name {
              font-size: 9px !important;
            }
            .panel-card-label {
              font-size: 11px !important;
            }
            .indicator-grid {
              display: none !important;
            }
            .connection-lines-wrapper {
              display: none !important;
            }
            .score-row {
              flex-direction: column !important;
              gap: 12px !important;
            }
            .score-row a {
              flex: 1 1 auto !important;
              min-height: 180px !important;
            }
            .peaq-age-card {
              padding: 24px 20px !important;
              border-radius: 12px !important;
            }
            .peaq-age-number {
              font-size: 72px !important;
              letter-spacing: -2px !important;
            }
            .peaq-age-delta {
              font-size: 18px !important;
            }
            .insight-card {
              padding: 20px !important;
            }
            .cross-panel-card {
              padding: 20px !important;
            }
          }
        `}</style>
      </div>
    )
  }

  // ── LEGACY DASHBOARD (no Peaq Age breakdown — pre-V5) ───────────────────
  return (
    <div className="min-h-svh" style={{ background: "#F6F4EF" }}>
      <Nav />
      <main className="mx-auto" style={{ maxWidth: 760, padding: "28px 24px 60px" }}>
        {wearableNeedsReconnect && (
          <div style={{
            background: "rgba(154,114,0,0.08)", border: "0.5px solid rgba(154,114,0,0.25)",
            borderRadius: 8, padding: "14px 18px", marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <p style={{ fontFamily: sans, fontSize: 13, color: "#9A7200", margin: 0, lineHeight: 1.5 }}>
              Your {({ whoop: "WHOOP", oura: "Oura Ring", garmin: "Garmin", fitbit: "Fitbit" } as Record<string,string>)[props.wearableProvider ?? ""] ?? "wearable"} connection expired.
            </p>
            <Link href="/settings" style={{
              fontFamily: sans, fontSize: 12, fontWeight: 500,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "#9A7200", textDecoration: "none", whiteSpace: "nowrap",
            }}>
              Reconnect →
            </Link>
          </div>
        )}
        <PushNotificationPrompt />
        <div style={{ marginBottom: 12 }}>
          <PanelConvergence
            score={sleepHidden ? props.score - props.breakdown.sleepSub : props.score}
            breakdown={props.breakdown}
            sleepConnected={props.sleepConnected}
            oralActive={props.oralActive}
            hasBlood={hasBlood}
            wearableProvider={props.wearableProvider}
            bloodLabName={props.bloodData?.labName}
            oralKitStatus={props.oralKitStatus}
            sleepHidden={sleepHidden}
            trendDeltas={props.trendDeltas}
          />
        </div>
      </main>
      <IOSInstallBanner />
    </div>
  )
}

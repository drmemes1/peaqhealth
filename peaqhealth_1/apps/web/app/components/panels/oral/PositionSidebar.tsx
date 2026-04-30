"use client"

import Link from "next/link"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

type Status = "strong" | "watch" | "attention"

const STATUS_COLORS: Record<Status, string> = { strong: "#4A7A4A", watch: "#8A6B22", attention: "#8C3A3A" }
const STATUS_LABELS: Record<Status, Record<string, string>> = {
  strong: { shannon: "Resilient", ph: "Buffered", ratio: "Strong", breath: "Fresh", biofilm: "Immature", translocation: "Low", inflammatory: "Not present" },
  watch: { shannon: "Watch", ph: "Watch", ratio: "Moderate", breath: "Moderate", biofilm: "Developing", translocation: "Moderate", inflammatory: "Subtle" },
  attention: { shannon: "Low", ph: "Acidic", ratio: "Weak", breath: "Elevated VSC", biofilm: "Advanced", translocation: "Elevated", inflammatory: "Marked" },
}

interface CardProps {
  eyebrow: string; value: string; unit: string; status: Status; scoreKey: string
  svgId: string; userPos: number; rangeMin: string; rangeMax: string
  composite?: boolean; href?: string; statusOverrideLabel?: string
}

function SideCardInner({ eyebrow, value, unit, status, scoreKey, svgId, userPos, rangeMin, rangeMax, composite, statusOverrideLabel }: CardProps) {
  const color = STATUS_COLORS[status]
  const label = statusOverrideLabel ?? STATUS_LABELS[status][scoreKey] ?? status
  const bg = composite ? "var(--paper-warm, #F1ECDD)" : "var(--paper)"

  return (
    <div style={{
      background: bg, border: "1px solid var(--line)", borderRadius: 14,
      padding: "18px 20px 16px", position: "relative", overflow: "hidden",
      cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "#B8935A"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(44,42,36,0.06)" }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "none" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: color }} />
      <div style={{
        fontFamily: sans, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--muted)", fontWeight: 600, marginBottom: 8,
        fontStyle: composite ? "italic" : "normal",
      }}>
        {eyebrow}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div>
          <span style={{ fontFamily: serif, fontSize: 32, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1 }}>{value}</span>
          <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>{unit}</span>
        </div>
        <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, color }}>{label}</span>
      </div>
      {/* Mini distribution */}
      <div style={{ height: 28, position: "relative" }}>
        <svg viewBox="0 0 220 28" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
          <defs>
            <linearGradient id={svgId} x1="0" x2="1">
              <stop offset="0%" stopColor={status === "strong" ? "#4A7A4A" : "#9B3838"} stopOpacity={0.14} />
              <stop offset="50%" stopColor={status === "watch" ? "#C4992E" : "#4A7A4A"} stopOpacity={0.16} />
              <stop offset="100%" stopColor="#4A7A4A" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <path d="M 0 26 Q 50 16, 100 6 Q 150 4, 220 26 L 220 28 L 0 28 Z" fill={`url(#${svgId})`} />
          <path d="M 0 26 Q 50 16, 100 6 Q 150 4, 220 26" fill="none" stroke="#8C897F" strokeWidth={0.6} opacity={0.4} />
          <line x1={userPos} y1={0} x2={userPos} y2={28} stroke={color} strokeWidth={1.5} />
          <circle cx={userPos} cy={7} r={2.5} fill={color} />
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "var(--muted)", fontFamily: serif, fontStyle: "italic" }}>
        <span>{rangeMin}</span>
        <span style={{ color: "var(--ink)", fontStyle: "normal", fontFamily: sans, fontWeight: 600, fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase" }}>You · {value}</span>
        <span>{rangeMax}</span>
      </div>
    </div>
  )
}

function SideCard(props: CardProps) {
  if (props.href) {
    return (
      <Link href={props.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <SideCardInner {...props} />
      </Link>
    )
  }
  return <SideCardInner {...props} />
}

function DeeperIndicesDivider() {
  return (
    <div style={{ margin: "6px 2px 2px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ borderTop: "0.5px solid var(--line)", margin: "10px 0 8px" }} />
      <div style={{
        fontFamily: sans, fontSize: 9, letterSpacing: "0.22em",
        textTransform: "uppercase", color: "#B8935A", fontWeight: 700,
      }}>
        Deeper indices
      </div>
      <div style={{
        fontFamily: serif, fontStyle: "italic", fontSize: 12,
        color: "var(--muted)",
      }}>
        interpretive composites
      </div>
    </div>
  )
}

export interface CompositeCardData {
  value: number | null
  status: Status
  statusLabel: string
}

export function PositionSidebar({ shannon, ph, ratio, breath, biofilm, translocation, inflammatory }: {
  shannon: { value: number; status: Status }
  ph: { value: number; status: Status }
  ratio: { value: number | null; status: Status }
  breath: { value: number | null; status: Status }
  biofilm?: CompositeCardData
  translocation?: CompositeCardData
  inflammatory?: CompositeCardData
}) {
  const showComposites = !!(biofilm || translocation || inflammatory)

  return (
    <div className="oral-sidebar" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SideCard eyebrow="Bacterial diversity" value={shannon.value.toFixed(2)} unit="Shannon" status={shannon.status} scoreKey="shannon" svgId="sh-mini" userPos={Math.max(20, Math.min(200, ((shannon.value - 2.5) / 3.0) * 200))} rangeMin="2.5" rangeMax="5.5" />
      <SideCard eyebrow="pH buffering" value={ph.value.toFixed(2)} unit="ratio" status={ph.status} scoreKey="ph" svgId="ph-mini" userPos={Math.max(20, Math.min(200, (ph.value / 0.4) * 200))} rangeMin="0.05" rangeMax="0.40" />
      <SideCard eyebrow="Protective ratio" value={ratio.value != null ? ratio.value.toFixed(1) : "—"} unit="×" status={ratio.status} scoreKey="ratio" svgId="pr-mini" userPos={ratio.value != null ? Math.max(20, Math.min(200, (ratio.value / 12) * 200)) : 110} rangeMin="1×" rangeMax="12×" />
      <SideCard eyebrow="Breath freshness" value={breath.value != null ? String(Math.round(breath.value)) : "—"} unit="/100" status={breath.status} scoreKey="breath" svgId="bf-mini" userPos={breath.value != null ? Math.max(20, Math.min(200, ((breath.value - 20) / 80) * 200)) : 110} rangeMin="20" rangeMax="100" />

      {showComposites && <DeeperIndicesDivider />}

      {biofilm && (
        <SideCard
          eyebrow="Biofilm maturity"
          value={biofilm.value != null ? biofilm.value.toFixed(2) : "—"}
          unit="ratio"
          status={biofilm.status}
          scoreKey="biofilm"
          svgId="bm-mini"
          userPos={biofilm.value != null ? Math.max(20, Math.min(200, (biofilm.value / 0.40) * 200)) : 110}
          rangeMin="0"
          rangeMax="0.40+"
          composite
          href="/panels/oral/index/biofilm-maturity"
          statusOverrideLabel={biofilm.statusLabel}
        />
      )}
      {translocation && (
        <SideCard
          eyebrow="Translocation indicator"
          value={translocation.value != null ? translocation.value.toFixed(1) : "—"}
          unit="score"
          status={translocation.status}
          scoreKey="translocation"
          svgId="tr-mini"
          userPos={translocation.value != null ? Math.max(20, Math.min(200, (translocation.value / 5.0) * 200)) : 110}
          rangeMin="0"
          rangeMax="5+"
          composite
          href="/panels/oral/index/translocation-risk"
          statusOverrideLabel={translocation.statusLabel}
        />
      )}
      {inflammatory && (
        <SideCard
          eyebrow="Inflammatory pattern"
          value={inflammatory.value != null ? inflammatory.value.toFixed(2) : "—"}
          unit="signal"
          status={inflammatory.status}
          scoreKey="inflammatory"
          svgId="ip-mini"
          userPos={inflammatory.value != null ? Math.max(20, Math.min(200, (inflammatory.value / 2.0) * 200)) : 110}
          rangeMin="0"
          rangeMax="2.0+"
          composite
          href="/panels/oral/index/inflammatory-pattern"
          statusOverrideLabel={inflammatory.statusLabel}
        />
      )}
    </div>
  )
}

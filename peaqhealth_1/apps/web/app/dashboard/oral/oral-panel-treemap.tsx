"use client"

import Link from "next/link"
import type { UserPanelContext } from "../../../lib/user-context"
import { OralTreemap } from "../../components/panels/oral/Treemap"
import { PositionSidebar } from "../../components/panels/oral/PositionSidebar"
import { CrossPanelConnection } from "../../components/panels/oral/CrossPanelConnection"
import { InterpretationCards } from "../../components/panels/oral/InterpretationCards"
import { TrajectorySection } from "../../components/panels/oral/TrajectorySection"
import { DeepDiveDoors } from "../../components/panels/oral/DeepDiveDoors"
import { getBreathScore } from "../../../lib/oral/halitosisScore"
import { computeModifiers } from "../../../lib/oral/halitosisModifiers"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

type Status = "strong" | "watch" | "attention"

export function OralPanelTreemap({ ctx, genusCounts }: { ctx: UserPanelContext; genusCounts: Record<string, number> }) {
  const o = ctx.oralKit
  if (!o) {
    return (
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "56px 40px 120px", background: "#EDEAE1" }}>
        <Link href="/dashboard" style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8935A", fontWeight: 600, textDecoration: "none" }}>← Dashboard</Link>
        <h1 style={{ fontFamily: serif, fontSize: 64, fontWeight: 500, letterSpacing: "-0.025em", margin: "32px 0 16px" }}>Oral <em style={{ fontStyle: "italic", color: "#6B6860" }}>Microbiome</em></h1>
        <p style={{ fontFamily: sans, fontSize: 14, color: "#8C897F" }}>No oral results on file. Take your sample to see your community.</p>
      </div>
    )
  }

  const shannon = o.shannonIndex ?? 0
  const shannonStatus: Status = shannon >= 4.0 ? "strong" : shannon >= 3.0 ? "watch" : "attention"
  const phVal = o.phBalanceApi ?? 0.5
  const phStatus: Status = phVal <= 0.25 ? "strong" : phVal <= 0.45 ? "watch" : "attention"
  const ratioVal = o.protectiveRatio
  const ratioStatus: Status = (ratioVal ?? 0) >= 5 ? "strong" : (ratioVal ?? 0) >= 2 ? "watch" : "attention"
  const q = ctx.questionnaire
  const qr = ctx.questionnaire as Record<string, unknown> | null
  const mbConfirmed = q?.mouthBreathing === "confirmed" || q?.mouthBreathing === "often"
  const modResult = computeModifiers({
    mouthBreathingConfirmed: mbConfirmed,
    dryMouthSeverity: null,
    osaPattern: false,
    gerdSymptoms: q?.gerdNocturnal === true,
    xerogenicMedications: false,
    tongueScraping: qr?.tongue_scraping_freq as string | null,
    stressHigh: q?.stressLevel === "high",
    sleepQualityLow: q?.sleepQualSelf === "poor" || q?.sleepQualSelf === "very_poor",
    badBreathSelf: null,
  })
  const breath = getBreathScore({ fusobacteriumPeriodonticumPct: null, porphyromonasPct: o.porphyromonasPct, solobacteriumPct: null, prevotellaMelaninogenicaPct: null, peptostreptococcusPct: null }, modResult)
  const breathStatus: Status = breath.status === "no_data" ? "watch" : breath.status

  // Count statuses for summary
  const statuses = [shannonStatus, phStatus, ratioStatus, breathStatus]
  const attCount = statuses.filter(s => s === "attention").length
  const watchCount = statuses.filter(s => s === "watch").length
  const strongCount = statuses.filter(s => s === "strong").length

  const summaryLine = attCount === 0 && watchCount === 0
    ? "A varied, resilient ecosystem across all markers."
    : attCount === 0
    ? `A varied, mostly-resilient ecosystem with ${watchCount} pattern${watchCount > 1 ? "s" : ""} worth your attention.`
    : `A varied ecosystem with ${attCount} pattern${attCount > 1 ? "s" : ""} needing attention and ${watchCount} worth noticing.`

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "56px 40px 120px", background: "#EDEAE1", position: "relative" }}>
      {/* Breadcrumb */}
      <Link href="/dashboard" style={{ fontFamily: sans, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8935A", fontWeight: 600, textDecoration: "none", display: "inline-block", marginBottom: 32 }}>← Dashboard</Link>

      {/* Header */}
      <div style={{ marginBottom: 48, paddingBottom: 32, borderBottom: "1px solid #D6D3C8", display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "end" }}>
        <div>
          <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8C897F", fontWeight: 500, marginBottom: 14 }}>Your oral panel</div>
          <h1 style={{ fontFamily: serif, fontSize: 64, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, marginBottom: 16 }}>
            Oral <em style={{ fontStyle: "italic", color: "#6B6860" }}>Microbiome</em>
          </h1>
          <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 20, color: "#6B6860", letterSpacing: "0.005em", maxWidth: 680, lineHeight: 1.45 }}>
            {summaryLine}
          </div>
        </div>
        <div style={{ textAlign: "right", fontFamily: sans, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8C897F", fontWeight: 500, lineHeight: 2 }}>
          <div>Sample · <strong style={{ color: "#2C2A24", fontWeight: 600 }}>{o.collectionDate ?? "Unknown"}</strong></div>
          <div><strong style={{ color: "#2C2A24", fontWeight: 600 }}>{o.namedSpecies ?? "—"}</strong> species · <strong style={{ color: "#2C2A24", fontWeight: 600 }}>{o.genera ?? "—"}</strong> genera</div>
          <div style={{ display: "flex", gap: 28, justifyContent: "flex-end", marginTop: 8 }}>
            {attCount > 0 && <span style={{ color: "#8C3A3A" }}><strong style={{ fontFamily: serif, fontSize: 16, letterSpacing: 0, textTransform: "none", fontWeight: 700, marginRight: 4 }}>{attCount}</strong>need attention</span>}
            {watchCount > 0 && <span style={{ color: "#B8923C" }}><strong style={{ fontFamily: serif, fontSize: 16, letterSpacing: 0, textTransform: "none", fontWeight: 700, marginRight: 4 }}>{watchCount}</strong>worth noticing</span>}
            {strongCount > 0 && <span style={{ color: "#4A7A4A" }}><strong style={{ fontFamily: serif, fontSize: 16, letterSpacing: 0, textTransform: "none", fontWeight: 700, marginRight: 4 }}>{strongCount}</strong>strong</span>}
          </div>
        </div>
      </div>

      {/* Hero: Treemap + Sidebar */}
      <div className="oral-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "stretch", marginBottom: 80 }}>
        <OralTreemap
          genusCounts={genusCounts}
          speciesCount={o.namedSpecies ?? 0}
          generaCount={o.genera ?? 0}
          shannonDiversity={shannon}
          sMutans={o.sMutansPct ?? 0}
          breathFreshness={breath.score}
        />
        <PositionSidebar
          shannon={{ value: shannon, status: shannonStatus }}
          ph={{ value: phVal, status: phStatus }}
          ratio={{ value: ratioVal, status: ratioStatus }}
          breath={{ value: breath.score, status: breathStatus }}
        />
      </div>

      {/* Section 02 — Cross-panel */}
      <div style={{ marginBottom: 80 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid #E5E2D8" }}>
          <div>
            <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#B8935A", marginRight: 14 }}>02</span>
            <span style={{ fontFamily: serif, fontSize: 32, fontWeight: 500, letterSpacing: "-0.012em" }}>How this <em style={{ fontStyle: "italic", color: "#6B6860" }}>connects</em> to your other panels</span>
          </div>
          <span style={{ fontFamily: sans, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C897F", fontWeight: 500 }}>The closed-loop view</span>
        </div>
        <CrossPanelConnection ctx={ctx} />
      </div>

      {/* Section 03 — Interpretation cards */}
      <div style={{ marginBottom: 80 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid #E5E2D8" }}>
          <div>
            <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#B8935A", marginRight: 14 }}>03</span>
            <span style={{ fontFamily: serif, fontSize: 32, fontWeight: 500 }}>What&rsquo;s happening, <em style={{ fontStyle: "italic", color: "#6B6860" }}>card by card</em></span>
          </div>
          <span style={{ fontFamily: sans, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C897F", fontWeight: 500 }}>Sort: Status · Filter: All</span>
        </div>
        <InterpretationCards ctx={ctx} />
      </div>

      {/* Section 04 — Trajectory */}
      <div style={{ marginBottom: 80 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid #E5E2D8" }}>
          <div>
            <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#B8935A", marginRight: 14 }}>04</span>
            <span style={{ fontFamily: serif, fontSize: 32, fontWeight: 500 }}>Your trajectory <em style={{ fontStyle: "italic", color: "#6B6860" }}>over time</em></span>
          </div>
          <span style={{ fontFamily: sans, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C897F", fontWeight: 500 }}>First sample · retest in 8 weeks</span>
        </div>
        <TrajectorySection sampleDate={o.collectionDate} />
      </div>

      {/* Section 05 — Deep dive doors */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28, paddingBottom: 16, borderBottom: "1px solid #E5E2D8" }}>
          <div>
            <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#B8935A", marginRight: 14 }}>05</span>
            <span style={{ fontFamily: serif, fontSize: 32, fontWeight: 500 }}>Want to <em style={{ fontStyle: "italic", color: "#6B6860" }}>go deeper</em>?</span>
          </div>
          <span style={{ fontFamily: sans, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C897F", fontWeight: 500 }}>Explore · Methodology · Science</span>
        </div>
        <DeepDiveDoors speciesCount={o.namedSpecies ?? 0} />
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .oral-hero-grid { grid-template-columns: 1fr !important; }
          .oral-sidebar { flex-direction: row !important; overflow-x: auto; gap: 12px !important; }
        }
      `}</style>
    </div>
  )
}

"use client"
import React, { useEffect, useState } from "react"
import { useCountUp } from "./use-count-up"
import { ScoreRingComponent } from "./ring"
import { RingLegend } from "./ring-legend"
import { HeroTitle } from "./hero-title"
import { PendingBanner } from "./pending-banners"
import { PanelGrid } from "./panel-grid"
import { MarkerRow, type Flag } from "./marker-row"
import { Insights } from "./insights"
import { NextSteps } from "./next-steps"
import { CTABlocks } from "./cta-blocks"

// Re-export the props type so dashboard-client can import it
export interface ScoreWheelProps {
  score: number
  lastSyncAt?: string | null
  lastSyncRequestedAt?: string | null
  breakdown: {
    sleepSub: number
    bloodSub: number
    oralSub: number
    lifestyleSub: number
  }
  sleepConnected: boolean
  labFreshness: "fresh" | "aging" | "stale" | "expired" | "none"
  oralActive: boolean
  sleepData?: {
    deepPct: number
    hrv: number
    spo2Dips: number
    remPct: number
    efficiency: number
    nightsAvg: number
    device: string
    lastSync: string
  }
  bloodData?: {
    hsCRP: number
    vitaminD: number
    apoB: number
    ldlHdlRatio: number
    hba1c: number
    lpa: number
    triglycerides: number
    ldl: number
    hdl: number
    glucose: number
    egfr: number
    hemoglobin: number
    collectionDate: string
    labName: string
    monthsOld: number
    bloodInsight?: string
  }
  oralData?: {
    shannonDiversity: number
    nitrateReducersPct: number
    periodontPathPct: number
    osaTaxaPct: number
    reportDate: string
    species?: Record<string, number>  // key species % reads (0-100 scale)
  }
  lifestyleData?: {
    exerciseLevel: string
    brushingFreq: string
    flossingFreq: string
    lastDentalVisit: string
    smokingStatus: string
    stressLevel?: string
    alcoholPerWeek?: number
    vegServings?: number
    processedFood?: number
    ageRange?: string
    biologicalSex?: string
    updatedAt: string
  }
  interactionsFired?: string[]
  peaqPercent?:        number
  peaqPercentLabel?:   string
  lpaFlag?:            "elevated" | "very_elevated" | null
  hsCRPRetestFlag?:    boolean
  additionalMarkers?:  Array<{ name: string; value: number; unit: string }>
  labLockExpiresAt?:      string | null  // ISO — null/undefined means locked or no labs
  oralOrdered?:           boolean        // true if any kit order exists (incl. processing)
  sleepNightsAvailable?:  number         // nights of wearable data available (<7 = building baseline)
  oralKitStatus?:         "none" | "ordered" | "complete"  // derived from oral_kit_orders
}

function relTimeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function flag(good: boolean, watch?: boolean): Flag {
  if (good) return "good"
  if (watch) return "watch"
  return "attention"
}

function formatValue(value: number): string {
  if (value === Math.floor(value)) return value.toString()
  return (Math.round(value * 100) / 100).toString()
}

// Status dot colors
const STATUS_COLORS: Record<Flag, string> = {
  good: "#2D6A4F", watch: "#B8860B", attention: "#C0392B", pending: "rgba(20,20,16,0.15)", not_tested: "rgba(20,20,16,0.15)",
}

// Spectrum bar marker row — positioned dot on track with optional optimal zone
function SpectrumRow({ name, value, unit, f, min, max, optMin, optMax }: {
  name: string; value: number | undefined; unit: string; f: Flag
  min: number; max: number; optMin: number; optMax: number
}) {
  if (!value || value === 0) return null
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const pct = clamp(((value - min) / (max - min)) * 100)
  const optMinPct = clamp(((optMin - min) / (max - min)) * 100)
  const optMaxPct = clamp(((optMax - min) / (max - min)) * 100)
  const dotColor = f === "good" ? "#2D6A4F" : f === "watch" ? "#B8860B" : f === "attention" ? "#C0392B" : "rgba(20,20,16,0.3)"
  const badgeBg   = f === "good" ? "#EAF3DE" : f === "watch" ? "#FEF3C7" : f === "attention" ? "#FEE2E2" : "#F7F5F0"
  const badgeText = f === "good" ? "#2D6A4F" : f === "watch" ? "#92400E" : f === "attention" ? "#991B1B" : "rgba(20,20,16,0.6)"
  const badgeLabel = f === "good" ? "Optimal" : f === "watch" ? "Watch" : f === "attention" ? "Attention" : "—"

  return (
    <div style={{ padding: "10px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)" }}>{name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)" }}>
            {formatValue(value)} <span style={{ fontSize: 10, color: "var(--ink-30)" }}>{unit}</span>
          </span>
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 3, background: badgeBg, color: badgeText }}>{badgeLabel}</span>
        </div>
      </div>
      {/* Track */}
      <div style={{ position: "relative", height: 4, borderRadius: 2, background: "rgba(20,20,16,0.07)", margin: "0 0 2px" }}>
        {/* Optimal zone */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${optMinPct}%`, width: `${optMaxPct - optMinPct}%`, background: "rgba(45,106,79,0.15)", borderRadius: 2 }} />
        {/* Dot */}
        <div style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%, -50%)", width: 8, height: 8, borderRadius: "50%", background: dotColor, border: "1.5px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", zIndex: 1 }} />
      </div>
    </div>
  )
}

function StatusDots({ flags }: { flags: Flag[] }) {
  const top4 = flags.slice(0, 4)
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {top4.map((f, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: f === "good" ? STATUS_COLORS.good : (f === "not_tested" || f === "pending") ? "transparent" : STATUS_COLORS[f],
          border: f === "good" ? "none" : `1px solid ${STATUS_COLORS[f]}`,
        }} />
      ))}
    </div>
  )
}

const INSIGHT_COPY: Record<string, { title: string; body: string; panels: string[] }> = {
  sleepInflammation:      { title: "Sleep × Inflammation", body: "Poor sleep elevates CRP. Elevated CRP fragments sleep. The cycle is self-reinforcing.", panels: ["Sleep", "Blood"] },
  spo2Lipid:              { title: "SpO2 × Lipids", body: "Nocturnal hypoxia activates the sympathetic nervous system and promotes LDL oxidation.", panels: ["Sleep", "Blood"] },
  dualInflammatory:       { title: "Dual Inflammatory", body: "Concurrent hsCRP and ESR elevation indicates systemic, multi-pathway inflammation.", panels: ["Blood"] },
  hrvHomocysteine:        { title: "HRV × Homocysteine", body: "Autonomic dysfunction compounded by endothelial injury — a high-risk cardiovascular phenotype.", panels: ["Sleep", "Blood"] },
  periodontCRP:           { title: "Periodontal × CRP", body: "Periodontal pathogen burden directly elevates systemic CRP via bacteraemia.", panels: ["Oral", "Blood"] },
  osaTaxaSpO2:            { title: "OSA Taxa × SpO2", body: "The microbiome flags OSA risk; the wearable detects its physiological consequence.", panels: ["Oral", "Sleep"] },
  lowNitrateCRP:          { title: "Low Nitrate × CRP", body: "Depleted oral NO pathway plus elevated inflammation — dual hit on vascular health.", panels: ["Oral", "Blood"] },
  lowDiversitySleep:      { title: "Low Diversity × Sleep", body: "The bidirectional relationship between oral microbiome diversity and sleep quality.", panels: ["Oral", "Sleep"] },
  poorSleepOralQ:         { title: "Poor Sleep × Oral Hygiene", body: "Poor sleep efficiency combined with suboptimal oral care creates compounding systemic risk.", panels: ["Sleep", "Oral"] },
  poorExerciseSmoking:    { title: "Sedentary × Smoking", body: "Sedentary lifestyle and current smoking are the two most modifiable cardiovascular risk factors.", panels: ["Lifestyle"] },
  hsCRPLDL:               { title: "hsCRP × LDL", body: "The 2025 ACC guidelines identify hsCRP >2.0 + LDL >130 as requiring clinical attention regardless of either value alone.", panels: ["Blood"] },
  lowActivityInflammation: { title: "Low Activity × Inflammation", body: "Low physical activity compounds elevated hsCRP — a primary driver of chronic low-grade inflammation.", panels: ["Lifestyle", "Blood"] },
  familyCVDApoB:          { title: "Family CVD × ApoB", body: "Family history of CVD makes ApoB monitoring especially important as a primary prevention target.", panels: ["Blood", "Lifestyle"] },
  highStressCRP:          { title: "High Stress × CRP", body: "Elevated cortisol from chronic stress directly increases hsCRP and inflammatory burden.", panels: ["Lifestyle", "Blood"] },
  poorNutritionTrig:      { title: "Nutrition × Triglycerides", body: "Frequent processed food consumption is a primary driver of elevated triglycerides.", panels: ["Lifestyle", "Blood"] },
  highHRPoorSleep:        { title: "Resting HR × Sleep", body: "High resting heart rate paired with poor sleep reflects inadequate cardiovascular recovery.", panels: ["Lifestyle", "Sleep"] },
  alcoholPoorSleep:       { title: "Alcohol × Sleep", body: "Alcohol intake above 14 drinks/week directly fragments sleep architecture.", panels: ["Lifestyle", "Sleep"] },
}

const PANEL_COLORS: Record<string, string> = {
  "Oral":      "#2D6A4F",
  "Blood":     "#C0392B",
  "Sleep":     "#4A7FB5",
  "Lifestyle": "#B8860B",
}

type ComputedInteraction = {
  key: string
  title: string
  body: string
  panels: string[]
  severity: "high" | "medium"
  learnMore: {
    science: string
    meaning: string
    actions: string[]
    citation: string
  }
}

function InteractionCard({ interaction }: { interaction: ComputedInteraction }) {
  const [learnOpen, setLearnOpen] = useState(false)
  const [hoverLearn, setHoverLearn] = useState(false)
  const { learnMore: lm } = interaction
  const font = "var(--font-body, 'Instrument Sans', sans-serif)"
  return (
    <div style={{
      background: interaction.severity === "high" ? "rgba(192,57,43,0.03)" : "rgba(184,134,11,0.04)",
      borderLeft: `3px solid ${interaction.severity === "high" ? "#C0392B" : "#B8860B"}`,
      borderRadius: "0 4px 4px 0", padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>
          {interaction.title}
        </span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{
            fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.08em",
            padding: "2px 6px", borderRadius: 3,
            background: interaction.severity === "high" ? "#FEE2E2" : "rgba(184,134,11,0.12)",
            color: interaction.severity === "high" ? "#991B1B" : "#92400E",
          }}>
            {interaction.severity}
          </span>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {interaction.panels.map(p => (
              <span key={p} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: PANEL_COLORS[p] ?? "#B8860B", display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontFamily: font, fontSize: 10, color: PANEL_COLORS[p] ?? "#B8860B" }}>{p}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <p style={{ fontFamily: font, fontSize: 13, color: "rgba(20,20,16,0.6)", margin: "0 0 10px", lineHeight: 1.5 }}>
        {interaction.body}
      </p>
      <button
        onClick={e => { e.stopPropagation(); setLearnOpen(o => !o) }}
        onMouseEnter={() => setHoverLearn(true)}
        onMouseLeave={() => setHoverLearn(false)}
        style={{
          fontFamily: font, fontSize: 11,
          color: hoverLearn ? "rgba(20,20,16,0.7)" : "rgba(20,20,16,0.4)",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", gap: 5,
          transition: "color 0.15s ease",
        }}
      >
        <span style={{
          width: 14, height: 14, borderRadius: "50%",
          border: `0.5px solid ${hoverLearn ? "rgba(20,20,16,0.35)" : "rgba(20,20,16,0.2)"}`,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 12, lineHeight: 1,
          flexShrink: 0, transition: "border-color 0.15s ease",
        }}>
          {learnOpen ? "−" : "+"}
        </span>
        Learn more
      </button>
      <div style={{
        maxHeight: learnOpen ? 900 : 0, overflow: "hidden",
        transition: "max-height 0.35s ease, opacity 0.35s ease", opacity: learnOpen ? 1 : 0,
      }}>
        <div style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "rgba(20,20,16,0.35)", margin: "0 0 4px", fontWeight: 600 }}>
              The science
            </p>
            <p style={{ fontFamily: font, fontSize: 12, color: "rgba(20,20,16,0.6)", margin: 0, lineHeight: 1.6 }}>
              {lm.science}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "rgba(20,20,16,0.35)", margin: "0 0 4px", fontWeight: 600 }}>
              What this means for you
            </p>
            <p style={{ fontFamily: font, fontSize: 12, color: "rgba(20,20,16,0.6)", margin: 0, lineHeight: 1.6 }}>
              {lm.meaning}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "rgba(20,20,16,0.35)", margin: "0 0 6px", fontWeight: 600 }}>
              What you can do
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {lm.actions.map((action, i) => (
                <li key={i} style={{ fontFamily: font, fontSize: 12, color: "rgba(20,20,16,0.6)", lineHeight: 1.5 }}>
                  {action}
                </li>
              ))}
            </ol>
          </div>
          <p style={{ fontFamily: font, fontSize: 11, fontStyle: "italic", color: "rgba(20,20,16,0.35)", margin: 0, lineHeight: 1.4 }}>
            {lm.citation}
          </p>
        </div>
      </div>
    </div>
  )
}

function CrossPanelInteractions({
  oralKitStatus = "none",
  interactionsFired = [],
  oralActive = false,
  oralData,
  bloodData,
  sleepData,
  fadeUpFn,
}: {
  oralKitStatus?: "none" | "ordered" | "complete"
  interactionsFired?: string[]
  oralActive?: boolean
  oralData?: ScoreWheelProps["oralData"]
  bloodData?: ScoreWheelProps["bloodData"]
  sleepData?: ScoreWheelProps["sleepData"]
  fadeUpFn: (d: string) => React.CSSProperties
}) {
  const [open, setOpen] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [hoverToggle, setHoverToggle] = useState(false)

  // Compute interactions client-side from actual data values
  // oralData pct values are already *100 (13% stored as 0.13 in DB → 13 here)
  // sleepData deepPct/remPct/efficiency are 0–100 scale
  const computed: ComputedInteraction[] = []
  if (oralActive && oralData) {
    // 5 first so it appears at top if all three panels fire
    if (bloodData && sleepData &&
        oralData.periodontPathPct > 2 && bloodData.hsCRP > 1.0 && sleepData.deepPct < 20) {
      computed.push({
        key: "tripleSignal",
        title: "Triple signal — systemic dysbiosis",
        body: "You have concurrent signals across all three biological systems — oral pathogens, systemic inflammation, and disrupted deep sleep. This triple pattern is associated with accelerated biological aging.",
        panels: ["Oral", "Blood", "Sleep"],
        severity: "high",
        learnMore: {
          science: "Concurrent oral dysbiosis, elevated systemic inflammation, and disrupted sleep architecture represents a convergent biological aging pattern. The ORIGINS study (JAHA 2019, n=300) found this triple combination predicted 10-year cardiovascular events better than any single marker alone.",
          meaning: `You have active signals in all three biological systems simultaneously — oral pathogens at ${oralData.periodontPathPct.toFixed(1)}%, hsCRP at ${bloodData.hsCRP.toFixed(1)} mg/L, and deep sleep at ${sleepData.deepPct.toFixed(1)}%. Addressing one will likely improve the others — start with oral health as it has the fastest modifiable timeline.`,
          actions: [
            "Treat oral dysbiosis first — it's the most modifiable and has downstream effects on both inflammation and sleep",
            "Schedule a full cardiovascular risk assessment with your physician",
            "Track all three panels monthly to watch for convergence improvement",
          ],
          citation: "Huang et al., Journal of the American Heart Association, 2019. n=300, ORIGINS cohort.",
        },
      })
    }
    if (bloodData &&
        oralData.periodontPathPct > 2 &&
        (bloodData.hsCRP > 1.0 || bloodData.ldl > 100 || bloodData.apoB > 80)) {
      computed.push({
        key: "periodontCV",
        title: "Periodontal pathogens & cardiovascular risk",
        body: "Elevated periodontal pathogens combined with your cardiovascular markers suggest systemic inflammation may be originating in your mouth. P. gingivalis has been found in coronary plaques.",
        panels: ["Oral", "Blood"],
        severity: "high",
        learnMore: {
          science: "P. gingivalis and T. denticola have been identified in coronary artery plaques in multiple autopsy studies. A 2023 meta-analysis in Frontiers in Immunology (n=1,791) found periodontal pathogen burden independently predicted MACE events after adjusting for traditional cardiovascular risk factors.",
          meaning: `Your periodontal pathogen load is ${oralData.periodontPathPct.toFixed(1)}% — above the 0.5% caution threshold. Combined with your cardiovascular markers, this warrants attention.`,
          actions: [
            "Schedule a comprehensive periodontal evaluation — not just a cleaning",
            "Ask your dentist specifically about P. gingivalis burden and consider salivary PCR testing",
            "Floss daily — mechanical disruption of biofilm reduces pathogen load within 2 weeks",
          ],
          citation: "Hussain et al., Frontiers in Immunology, 2023. n=1,791 participants.",
        },
      })
    }
    if (sleepData &&
        oralData.osaTaxaPct > 5 &&
        (sleepData.deepPct < 20 || sleepData.remPct < 20)) {
      computed.push({
        key: "osaSleep",
        title: "OSA-associated bacteria & sleep quality",
        body: "Your oral microbiome shows elevated OSA-associated taxa alongside suboptimal deep or REM sleep. Oral dysbiosis is independently associated with obstructive sleep apnea risk.",
        panels: ["Oral", "Sleep"],
        severity: "high",
        learnMore: {
          science: "Prevotella and Fusobacterium species in the oral microbiome are enriched in patients with obstructive sleep apnea. A 2022 study by Chen et al. found oral microbiome composition predicted OSA with 91.9% AUC — outperforming many clinical screening tools.",
          meaning: `Your OSA-associated taxa are at ${oralData.osaTaxaPct.toFixed(1)}% — above the 1% threshold — alongside deep sleep of ${sleepData.deepPct.toFixed(1)}% and REM of ${sleepData.remPct.toFixed(1)}%.`,
          actions: [
            "Get a home sleep study (WatchPAT or similar) to rule out subclinical OSA",
            "Avoid antiseptic mouthwash — it kills nitrate-reducing bacteria and disrupts sleep-related oral microbiome balance",
            "Consider a tongue-position evaluation with a dentist trained in airway health",
          ],
          citation: "Chen et al., Journal of Clinical Sleep Medicine, 2022. AUC 91.9%, n=87.",
        },
      })
    }
    if (oralData.nitrateReducersPct < 5) {
      computed.push({
        key: "lowNitrateCV",
        title: "Nitrate pathway & blood pressure resilience",
        body: "Low nitrate-reducing bacteria reduce your body's ability to produce nitric oxide — a key vasodilator. This may silently affect cardiovascular resilience even when lipid panels look normal.",
        panels: ["Oral", "Blood"],
        severity: "medium",
        learnMore: {
          science: "Nitrate-reducing oral bacteria (Neisseria, Rothia, Veillonella) convert dietary nitrate to nitrite, which is then reduced to nitric oxide — a potent vasodilator. Disruption of this pathway by antiseptic mouthwash raises systolic blood pressure by 2–3.5 mmHg within days.",
          meaning: `Your nitrate-reducing bacteria are at ${oralData.nitrateReducersPct.toFixed(1)}% — below the 5% optimal threshold. This may be silently limiting your cardiovascular resilience.`,
          actions: [
            "Stop using antiseptic mouthwash (Listerine, chlorhexidine) — switch to salt water or xylitol-based rinses",
            "Increase dietary nitrates: beetroot, arugula, spinach, celery",
            "Retest oral microbiome in 60 days after dietary changes",
          ],
          citation: "Velmurugan et al., Free Radical Biology and Medicine, 2016. n=19, crossover RCT.",
        },
      })
    }
    if (bloodData && sleepData &&
        bloodData.hsCRP > 1.0 &&
        (sleepData.efficiency < 85 || sleepData.deepPct < 20)) {
      computed.push({
        key: "inflammSleep",
        title: "Inflammation & sleep fragmentation",
        body: "Elevated hsCRP alongside fragmented sleep creates a bidirectional cycle — inflammation disrupts sleep architecture, and poor sleep elevates inflammatory markers.",
        panels: ["Blood", "Sleep"],
        severity: "medium",
        learnMore: {
          science: "hsCRP above 1.0 mg/L is associated with fragmented sleep architecture in prospective cohort studies. The relationship is bidirectional — inflammation disrupts slow-wave sleep, and sleep deprivation activates NF-κB inflammatory pathways within 24 hours.",
          meaning: `Your hsCRP of ${bloodData.hsCRP.toFixed(1)} mg/L combined with ${sleepData.efficiency < 85 ? `sleep efficiency of ${sleepData.efficiency.toFixed(0)}%` : `deep sleep of ${sleepData.deepPct.toFixed(1)}%`} suggests an active inflammation-sleep disruption cycle.`,
          actions: [
            "Prioritize 7–9 hours with consistent sleep/wake times — circadian anchoring reduces inflammatory markers",
            "Consider an anti-inflammatory diet: omega-3s, polyphenols, reduce ultra-processed foods",
            "Recheck hsCRP in 90 days after sleep optimization",
          ],
          citation: "Irwin et al., Biological Psychiatry, 2016. Meta-analysis, n=72 studies.",
        },
      })
    }
  }

  const hasComputed = oralActive && computed.length > 0
  const fired = interactionsFired.filter(k => INSIGHT_COPY[k])

  const collapsedSummary =
    oralActive && computed.length > 0
      ? `⚡ ${computed.length} pattern${computed.length !== 1 ? "s" : ""} — ${computed[0].title}`
      : oralActive
      ? "✓ No patterns detected"
      : oralKitStatus === "none"
      ? "🔒 Unlock with oral kit  →  Order now"
      : "⏳ Kit processing — insights unlocking soon"

  return (
    <div style={fadeUpFn("0.10s")}>
      <style>{`@keyframes cpPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      <div style={{
        background: "rgba(184,134,11,0.06)",
        border: "0.5px solid rgba(184,134,11,0.3)",
        borderRadius: 8,
        padding: open ? "20px 24px" : "14px 20px",
        marginBottom: 24,
        transition: "padding 0.2s ease",
      }}>
        {/* Header */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: open ? 16 : 0 }}
        >
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, fontVariant: "small-caps", letterSpacing: "0.1em", color: "#B8860B", fontWeight: 600 }}>
            Cross-Panel Interactions
          </span>
          {!open && (
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "#B8860B", flex: 1, marginLeft: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {collapsedSummary}
            </span>
          )}
          <div
            onMouseEnter={() => setHoverToggle(true)}
            onMouseLeave={() => setHoverToggle(false)}
            style={{
              width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              border: `0.5px solid ${hoverToggle ? "#B8860B" : "rgba(184,134,11,0.4)"}`,
              color: hoverToggle ? "#B8860B" : "rgba(184,134,11,0.6)",
              fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, lineHeight: 1,
              transition: "border-color 0.2s ease, color 0.2s ease", flexShrink: 0, marginLeft: 8,
            }}
          >
            {open ? "−" : "+"}
          </div>
        </div>

        {/* Body */}
        <div style={{ maxHeight: open ? 6000 : 0, opacity: open ? 1 : 0, overflow: "hidden", transition: "max-height 0.3s ease, opacity 0.3s ease" }}>

          {/* Oral active — show computed interactions */}
          {oralActive && (
            hasComputed ? (
              <div>
                <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B8860B", margin: "0 0 10px" }}>
                  Patterns detected:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {computed.slice(0, showAll ? undefined : 3).map(interaction => (
                    <InteractionCard key={interaction.key} interaction={interaction} />
                  ))}
                </div>
                {!showAll && computed.length > 3 && (
                  <button
                    onClick={e => { e.stopPropagation(); setShowAll(true) }}
                    style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "#B8860B", background: "none", border: "none", cursor: "pointer", marginTop: 10, padding: 0 }}
                  >
                    View all {computed.length} patterns →
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 18, color: "rgba(20,20,16,0.45)", margin: "0 0 6px", lineHeight: 1.3 }}>
                  No patterns detected — your panels look balanced.
                </p>
                <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "rgba(20,20,16,0.4)", margin: 0, lineHeight: 1.5 }}>
                  We continuously monitor your data for cross-panel signals. Check back as your data updates.
                </p>
              </div>
            )
          )}

          {/* No oral data — kit not ordered */}
          {!oralActive && oralKitStatus === "none" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="#B8860B" strokeWidth="1.2"/>
                  <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="#B8860B" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <div>
                  <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 18, color: "#141410", margin: "0 0 4px", lineHeight: 1.3 }}>
                    Your cross-panel intelligence is waiting.
                  </p>
                  <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "rgba(20,20,16,0.5)", margin: 0, lineHeight: 1.5 }}>
                    The oral microbiome is the missing piece. Spit, send, and wait for your full Peaqture.
                  </p>
                </div>
              </div>
              <a
                href="/shop"
                style={{
                  fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, fontVariant: "small-caps", letterSpacing: "0.06em",
                  border: "1px solid #B8860B", color: "#B8860B", background: "transparent",
                  padding: "8px 16px", borderRadius: 4, textDecoration: "none", whiteSpace: "nowrap", display: "inline-block",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "#B8860B"; (e.currentTarget as HTMLAnchorElement).style.color = "#FAFAF8" }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = "#B8860B" }}
              >
                Order oral kit
              </a>
            </div>
          )}

          {/* No oral data — kit processing */}
          {!oralActive && oralKitStatus === "ordered" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#B8860B", flexShrink: 0, animation: "cpPulse 2s infinite", display: "inline-block" }} />
              <div>
                <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 18, color: "#141410", margin: "0 0 4px", lineHeight: 1.3 }}>
                  Your sample is on its way.
                </p>
                <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "rgba(20,20,16,0.5)", margin: 0, lineHeight: 1.5 }}>
                  Results arrive in 10–14 days. Cross-panel insights unlock then.
                </p>
              </div>
            </div>
          )}

          {/* Legacy server-fired interactions (fallback) */}
          {!oralActive && fired.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {fired.map(key => {
                const insight = INSIGHT_COPY[key]!
                return (
                  <div key={key} style={{ background: "rgba(184,134,11,0.04)", borderLeft: "3px solid #B8860B", borderRadius: "0 4px 4px 0", padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, fontWeight: 600, color: "#B8860B" }}>⚡ {insight.title}</span>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {insight.panels.map(p => (
                          <span key={p} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: PANEL_COLORS[p] ?? "#B8860B", display: "inline-block" }} />
                            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, color: PANEL_COLORS[p] ?? "#B8860B" }}>{p}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "rgba(20,20,16,0.6)", margin: 0, lineHeight: 1.5 }}>{insight.body}</p>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function CollapsiblePanel({
  title, score, maxScore, subtitle, statusDots, defaultOpen, delay, fadeUpFn, headerExtra, children,
}: {
  title: string; score?: number; maxScore?: number; subtitle?: string
  statusDots?: Flag[]; defaultOpen: boolean; delay: string
  fadeUpFn: (d: string) => React.CSSProperties; headerExtra?: React.ReactNode; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [hoverToggle, setHoverToggle] = useState(false)
  return (
    <div style={fadeUpFn(delay)}>
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: open ? 12 : 0, cursor: "pointer",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>{title}</h3>
          {score !== undefined && maxScore !== undefined && (
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-30)" }}>
              {score}/{maxScore} pts
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {subtitle && (
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-60)" }}>{subtitle}</span>
          )}
          {headerExtra}
          {!open && statusDots && <StatusDots flags={statusDots} />}
          <div
            onMouseEnter={() => setHoverToggle(true)}
            onMouseLeave={() => setHoverToggle(false)}
            style={{
              width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              border: `0.5px solid ${hoverToggle ? "var(--gold)" : "rgba(20,20,16,0.2)"}`,
              color: hoverToggle ? "var(--gold)" : "rgba(20,20,16,0.5)",
              fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, lineHeight: 1,
              transition: "border-color 0.2s ease, color 0.2s ease", flexShrink: 0,
            }}
          >
            {open ? "−" : "+"}
          </div>
        </div>
      </div>
      <div style={{
        maxHeight: open ? 2000 : 0, opacity: open ? 1 : 0, overflow: "hidden",
        transition: "max-height 0.3s ease, opacity 0.3s ease",
      }}>
        {children}
      </div>
    </div>
  )
}

function OralSpeciesRow({ name, role, val, target, note, isPathogen, flagFn, learnWhat, learnWhy, learnCitation }: {
  name: string
  role: string
  val: number        // 0–100 scale; 0 = not detected
  target: string     // display string e.g. ">2% reads"
  note: string       // one-line clinical note
  isPathogen: boolean
  flagFn: (v: number) => Flag
  learnWhat: string
  learnWhy: string
  learnCitation: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const font = "var(--font-body, 'Instrument Sans', sans-serif)"
  const notDetected = val === 0
  const effectiveFlag: Flag = notDetected ? (isPathogen ? "good" : "not_tested") : flagFn(val)
  const BADGE: Record<Flag, { bg: string; text: string; label: string }> = {
    good:       { bg: "#EAF3DE", text: "#2D6A4F",              label: "Optimal"      },
    watch:      { bg: "#FEF3C7", text: "#92400E",              label: "Watch"        },
    attention:  { bg: "#FEE2E2", text: "#991B1B",              label: "Attention"    },
    not_tested: { bg: "#F7F5F0", text: "rgba(20,20,16,0.4)",   label: "Not detected" },
    pending:    { bg: "#F7F5F0", text: "rgba(20,20,16,0.5)",   label: "—"            },
  }
  const bs = BADGE[effectiveFlag]
  const leftBorder = effectiveFlag === "attention" ? "#C0392B" : effectiveFlag === "watch" ? "#B8860B" : effectiveFlag === "good" ? "#2D6A4F" : "transparent"
  const valueColor = effectiveFlag === "attention" ? "#991B1B" : effectiveFlag === "watch" ? "#92400E" : "var(--ink)"
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderLeft: `2px solid ${leftBorder}`,
        paddingLeft: 10, paddingTop: 9, paddingBottom: 9,
        borderBottom: "0.5px solid var(--ink-06)",
        opacity: (notDetected && !isPathogen) ? 0.55 : 1,
        background: hovered ? "rgba(45,106,79,0.02)" : "transparent",
        transition: "background 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13, fontStyle: "italic", color: notDetected ? "rgba(20,20,16,0.35)" : "var(--ink)", lineHeight: 1.3 }}>
            {name}
          </p>
          <p style={{ margin: "2px 0 0", fontFamily: font, fontSize: 11, color: "var(--ink-60)", lineHeight: 1.3 }}>
            {role}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {notDetected ? (
            <p style={{ margin: 0, fontFamily: font, fontSize: 11, fontStyle: "italic", color: "rgba(20,20,16,0.35)" }}>Not detected</p>
          ) : (
            <p style={{ margin: 0, fontFamily: font, fontSize: 13, color: valueColor }}>
              {val < 0.01 ? "<0.01" : val.toFixed(2)}%
            </p>
          )}
          <p style={{ margin: "1px 0 0", fontFamily: font, fontSize: 10, color: "rgba(20,20,16,0.3)" }}>{target}</p>
        </div>
        <span style={{
          fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.05em",
          padding: "3px 7px", borderRadius: 3, background: bs.bg, color: bs.text,
          flexShrink: 0, alignSelf: "flex-start", whiteSpace: "nowrap" as const,
        }}>
          {bs.label}
        </span>
      </div>
      {note && !notDetected && (
        <p style={{ margin: "5px 0 6px", fontFamily: font, fontSize: 11, color: "rgba(20,20,16,0.45)", fontStyle: "italic", lineHeight: 1.4 }}>
          {note}
        </p>
      )}
      <button
        onClick={e => { e.stopPropagation(); setExpanded(o => !o) }}
        style={{
          marginTop: 4, fontFamily: font, fontSize: 10, color: "rgba(20,20,16,0.35)",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <span style={{
          width: 12, height: 12, borderRadius: "50%", border: "0.5px solid rgba(20,20,16,0.2)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 10, lineHeight: 1, flexShrink: 0,
        }}>
          {expanded ? "−" : "+"}
        </span>
        Learn more
      </button>
      <div style={{ maxHeight: expanded ? 350 : 0, overflow: "hidden", transition: "max-height 0.3s ease, opacity 0.3s ease", opacity: expanded ? 1 : 0 }}>
        <div style={{ paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "rgba(20,20,16,0.3)", margin: "0 0 3px", fontWeight: 600 }}>What it does</p>
            <p style={{ fontFamily: font, fontSize: 12, color: "rgba(20,20,16,0.6)", margin: 0, lineHeight: 1.5 }}>{learnWhat}</p>
          </div>
          <div>
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "rgba(20,20,16,0.3)", margin: "0 0 3px", fontWeight: 600 }}>Why it matters</p>
            <p style={{ fontFamily: font, fontSize: 12, color: "rgba(20,20,16,0.6)", margin: 0, lineHeight: 1.5 }}>{learnWhy}</p>
          </div>
          <p style={{ fontFamily: font, fontSize: 11, fontStyle: "italic", color: "rgba(20,20,16,0.3)", margin: 0, lineHeight: 1.4 }}>{learnCitation}</p>
        </div>
      </div>
    </div>
  )
}

function OralSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [hov, setHov] = useState(false)
  const font = "var(--font-body, 'Instrument Sans', sans-serif)"
  return (
    <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", cursor: "pointer" }}
      >
        <span style={{ fontFamily: font, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#2D6A4F", fontWeight: 600 }}>
          {title}
        </span>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            border: `0.5px solid ${hov ? "#2D6A4F" : "rgba(45,106,79,0.35)"}`,
            color: hov ? "#2D6A4F" : "rgba(45,106,79,0.5)",
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13, lineHeight: 1,
            transition: "border-color 0.2s ease, color 0.2s ease", flexShrink: 0,
          }}
        >
          {open ? "−" : "+"}
        </div>
      </div>
      <div style={{ maxHeight: open ? 4000 : 0, overflow: "hidden", transition: "max-height 0.4s ease, opacity 0.3s ease", opacity: open ? 1 : 0 }}>
        {children}
      </div>
    </div>
  )
}

function CompleteMicrobiomePanel({ species, shannonDiversity }: {
  species: Record<string, number>
  shannonDiversity: number
}) {
  const [open, setOpen] = useState(false)
  const [hov, setHov] = useState(false)
  const font = "var(--font-body, 'Instrument Sans', sans-serif)"
  const sp = (key: string) => species[key] ?? 0

  return (
    <div style={{ borderTop: "0.5px solid var(--ink-12)", marginTop: 4 }}>
      {/* Panel header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", cursor: "pointer" }}
      >
        <div>
          <span style={{ fontFamily: font, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "#2D6A4F", fontWeight: 600 }}>
            Complete Microbiome Panel
          </span>
          {!open && (
            <p style={{ margin: "2px 0 0", fontFamily: font, fontSize: 11, color: "rgba(20,20,16,0.4)" }}>
              8 sections · species-level detail
            </p>
          )}
        </div>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            border: `0.5px solid ${hov ? "#2D6A4F" : "rgba(45,106,79,0.4)"}`,
            color: hov ? "#2D6A4F" : "rgba(45,106,79,0.6)",
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, lineHeight: 1,
            transition: "border-color 0.2s ease, color 0.2s ease", flexShrink: 0,
          }}
        >
          {open ? "−" : "+"}
        </div>
      </div>

      <div style={{ maxHeight: open ? 20000 : 0, overflow: "hidden", transition: "max-height 0.5s ease, opacity 0.4s ease", opacity: open ? 1 : 0 }}>

        {/* SECTION 1: NITRATE & CARDIOVASCULAR */}
        <OralSection title="Nitrate & Cardiovascular">
          <OralSpeciesRow name="Neisseria subflava" role="Primary nitrate reducer — NO pathway" val={sp("Neisseria subflava")} target=">2% reads" isPathogen={false} note="Converts dietary nitrate to vasodilating nitric oxide; depleted by antiseptic mouthwash within days" flagFn={v => flag(v >= 2, v >= 0.5)} learnWhat="Reduces nitrate from food (beetroot, spinach) to nitrite, which is further converted to nitric oxide in the gut and bloodstream." learnWhy="Nitric oxide is a potent vasodilator. Low Neisseria subflava abundance is associated with impaired endothelial function and elevated blood pressure." learnCitation="Velmurugan et al., Free Radical Biology and Medicine, 2016. n=19, crossover RCT." />
          <OralSpeciesRow name="Rothia mucilaginosa" role="Nitrate reducer + anti-inflammatory commensal" val={sp("Rothia mucilaginosa")} target=">1% reads" isPathogen={false} note="Dual role: nitrate reduction and mucosal immune modulation" flagFn={v => flag(v >= 1, v >= 0.3)} learnWhat="A highly abundant commensal that participates in nitrate reduction and produces enzymes that neutralize reactive oxygen species." learnWhy="Consistently found at higher abundance in healthy individuals. Its loss correlates with oral inflammation and cardiovascular risk markers." learnCitation="Rosenbaum et al., Cell Host & Microbe, 2021. Oral microbiome-cardiovascular cohort." />
          <OralSpeciesRow name="Veillonella parvula" role="Lactate metaboliser — nitrate pathway co-contributor" val={sp("Veillonella parvula")} target=">1% reads" isPathogen={false} note="Consumes lactic acid from other bacteria, reducing cariogenic potential while supporting NO pathway" flagFn={v => flag(v >= 1, v >= 0.3)} learnWhat="Converts lactic acid (produced by Streptococci) to propionate and acetate, and also participates in nitrate reduction cooperatively with Neisseria." learnWhy="A key cross-feeder in oral biofilm ecology. Its presence moderates acidity and supports cardiovascular-protective pathways." learnCitation="Mashima & Nakazawa, Frontiers in Microbiology, 2015. Oral microbiome metabolic interactions." />
          <OralSpeciesRow name="Neisseria flavescens" role="Secondary nitrate reducer — cardiovascular support" val={sp("Neisseria flavescens")} target=">0.5% reads" isPathogen={false} note="Related to N. subflava; contributes to the aggregate nitrate-reducing capacity" flagFn={v => flag(v >= 0.5, v >= 0.1)} learnWhat="A commensal Neisseria species with moderate nitrate-reducing activity, supporting the oral-systemic NO pathway alongside N. subflava." learnWhy="Part of the protective Neisseria community. Loss of this species contributes to reduced aggregate nitrate-reducing capacity." learnCitation="Hyde et al., mBio, 2014. Oral microbiome and nitrate metabolism." />
        </OralSection>

        {/* SECTION 2: PERIODONTAL PATHOGENS */}
        <OralSection title="Periodontal Pathogens">
          <OralSpeciesRow name="Porphyromonas gingivalis" role="Keystone periodontal pathogen — systemic risk" val={sp("Porphyromonas gingivalis")} target="<0.1% reads" isPathogen={true} note="Found in coronary artery plaques in autopsy studies; manipulates host immune response" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="A low-abundance keystone pathogen that dysregulates the host immune response out of proportion to its numbers, enabling growth of the broader pathogenic community." learnWhy="Identified in coronary artery plaques and Alzheimer's brain tissue. Associated with MACE events independent of traditional cardiovascular risk factors." learnCitation="Hussain et al., Frontiers in Immunology, 2023. n=1,791. Cardiovascular meta-analysis." />
          <OralSpeciesRow name="Treponema denticola" role="Red complex pathogen — periodontal + neurological risk" val={sp("Treponema denticola")} target="<0.1% reads" isPathogen={true} note="Alzheimer's: found in brain tissue in post-mortem studies (Riviere et al., 2002)" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="Part of the 'red complex' — the most pathogenic bacterial consortium in periodontal disease. Produces enzymes that destroy connective tissue and evade immune defenses." learnWhy="Found in post-mortem brain tissue from Alzheimer's patients. The gingipain proteases from these bacteria can enter circulation and cross the blood-brain barrier." learnCitation="Riviere et al., Brain Research, 2002. Treponema denticola in Alzheimer's brain tissue." />
          <OralSpeciesRow name="Tannerella forsythia" role="Red complex pathogen — bone resorption" val={sp("Tannerella forsythia")} target="<0.1% reads" isPathogen={true} note="Synergizes with P. gingivalis and T. denticola to accelerate periodontal bone loss" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="The third member of the red complex. Produces surface proteins that inhibit apoptosis of infected cells, allowing persistent infection and tissue destruction." learnWhy="A reliable diagnostic marker for severe chronic periodontitis. Its abundance correlates with probing depth and clinical attachment loss." learnCitation="Socransky et al., Journal of Clinical Periodontology, 1998. Original red complex classification." />
          <OralSpeciesRow name="Prevotella intermedia" role="Hormone-responsive periodontopathogen" val={sp("Prevotella intermedia")} target="<0.5% reads" isPathogen={true} note="Uses progesterone and estrogen as growth factors — elevated in pregnancy gingivitis" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="A gram-negative anaerobe that can substitute sex hormones (progesterone, estradiol) for vitamin K as growth factors, making it highly active during hormonal fluctuations." learnWhy="Elevated during pregnancy, puberty, and oral contraceptive use. Associated with systemic inflammation and adverse pregnancy outcomes including preterm birth." learnCitation="Kornman & Loesche, Journal of Periodontal Research, 1980. Hormonal effects on oral microbiome." />
          <OralSpeciesRow name="Fusobacterium nucleatum" role="Colorectal cancer link — systemic infection bridge" val={sp("Fusobacterium nucleatum")} target="<0.5% reads" isPathogen={true} note="Kostic et al., Nature 2012: enriched in colorectal adenocarcinoma tissue vs. healthy colon" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="An opportunistic pathogen that bridges the oral cavity to other body sites. Invades vascular endothelium and can translocate from the mouth to the gut, liver, and placenta." learnWhy="Dramatically enriched in colorectal cancer tissue. Also associated with adverse pregnancy outcomes and has been found in pancreatic cancer samples." learnCitation="Kostic et al., Genome Research, 2012. Fusobacterium in colorectal carcinoma, n=95." />
        </OralSection>

        {/* SECTION 3: CARIES & DENTAL HEALTH */}
        <OralSection title="Caries & Dental Health">
          <OralSpeciesRow name="Streptococcus mutans" role="Primary cavity-causing bacterium" val={sp("Streptococcus mutans")} target="<1% reads" isPathogen={true} note="Ferments dietary sugars to lactic acid, dissolving tooth enamel at pH below 5.5" flagFn={v => flag(v < 1, v < 3)} learnWhat="Produces lactic acid by fermenting sucrose and synthesizes sticky glucans that anchor biofilm to tooth surfaces, creating highly acidic local environments." learnWhy="The most extensively studied cariogenic pathogen. High abundance predicts future caries development and is heritable — mothers with high S. mutans transmit it to infants." learnCitation="Loesche, Microbiological Reviews, 1986. S. mutans as the principal cause of dental caries." />
          <OralSpeciesRow name="Streptococcus sobrinus" role="Works with S. mutans — amplifies caries risk" val={sp("Streptococcus sobrinus")} target="<0.5% reads" isPathogen={true} note="More acidogenic than S. mutans; co-infection dramatically increases caries severity" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Similar cariogenic mechanism to S. mutans but more acid-tolerant and more efficient at fermentation at lower pH, meaning it remains active even as the environment acidifies." learnWhy="When present alongside S. mutans, caries risk is significantly amplified. Some studies show S. sobrinus may be a stronger predictor of caries activity than S. mutans alone." learnCitation="van Houte et al., Journal of Dental Research, 1991. Role of S. sobrinus in human caries." />
          <OralSpeciesRow name="Lactobacillus spp." role="Acid producers — secondary caries colonizers" val={sp("Lactobacillus spp.")} target="<2% reads" isPathogen={true} note="Not primary initiators, but thrive in acidic lesions created by Streptococci and deepen cavities" flagFn={v => flag(v < 2, v < 5)} learnWhat="Obligate acid producers that colonize early carious lesions once the pH drops sufficiently for their growth. Produce lactic acid efficiently, accelerating dentinal decay." learnWhy="High Lactobacillus counts in saliva correlate with active caries progression. They indicate established acidogenic niches in the mouth." learnCitation="Caufield et al., Caries Research, 2015. Lactobacillus ecology in caries progression." />
          <OralSpeciesRow name="Streptococcus salivarius" role="Protective commensal — natural probiotic" val={sp("Streptococcus salivarius")} target=">2% reads" isPathogen={false} note="Produces bacteriocins (salivaricins) that inhibit S. mutans and S. pyogenes growth" flagFn={v => flag(v >= 2, v >= 0.5)} learnWhat="One of the first and most abundant colonizers of the oral cavity. Produces bacteriocin-like inhibitory substances (BLIS) that suppress pathogenic streptococci and help maintain microbiome balance." learnWhy="Commercial probiotic strains are based on S. salivarius K12. Low abundance correlates with increased pathogen colonization and recurrent streptococcal throat infections." learnCitation="Wescombe et al., Probiotics and Antimicrobial Proteins, 2012. S. salivarius K12 clinical trials." />
          <OralSpeciesRow name="Streptococcus sanguinis" role="Inhibits S. mutans — caries protective" val={sp("Streptococcus sanguinis")} target=">1% reads" isPathogen={false} note="Produces hydrogen peroxide that is directly bactericidal to S. mutans; inverse relationship" flagFn={v => flag(v >= 1, v >= 0.3)} learnWhat="An early colonizer of clean tooth surfaces that produces hydrogen peroxide to maintain an oxidative environment hostile to strict anaerobes like S. mutans." learnWhy="Inverse relationship with S. mutans: high S. sanguinis = low S. mutans. Its abundance is a reliable marker of caries-free status in population studies." learnCitation="Kreth et al., Journal of Bacteriology, 2005. H₂O₂-mediated competition between S. sanguinis and S. mutans." />
          <OralSpeciesRow name="Actinomyces spp." role="Biofilm scaffold — root surface protection" val={sp("Actinomyces spp.")} target="1–5% reads" isPathogen={false} note="Forms the structural backbone of supragingival plaque; low abundance may indicate shallow biofilm" flagFn={v => flag(v >= 1 && v <= 5, v >= 0.3 && v <= 8)} learnWhat="Gram-positive rods that form the architectural scaffold of dental biofilm. Co-aggregate with other species and contribute to biofilm maturation." learnWhy="Moderate abundance maintains biofilm homeostasis. Very low levels may indicate disrupted biofilm ecology; very high levels may contribute to root caries." learnCitation="Kolenbrander et al., Microbiology, 2010. Oral biofilm architecture and Actinomyces." />
        </OralSection>

        {/* SECTION 4: PROTECTIVE & BENEFICIAL */}
        <OralSection title="Protective & Beneficial">
          <OralSpeciesRow name="Streptococcus salivarius" role="Oral probiotic — bacteriocin producer" val={sp("Streptococcus salivarius")} target=">2% reads" isPathogen={false} note="Produces salivaricins A2 and B — natural antibiotics against S. pyogenes and S. mutans" flagFn={v => flag(v >= 2, v >= 0.5)} learnWhat="One of the first colonizers of the neonatal oral cavity and a lifelong dominant commensal. Produces bacteriocin-like substances that competitively exclude pathogens." learnWhy="The most well-studied oral probiotic bacterium. Its commercial derivatives (BLIS K12) are used to prevent throat infections and maintain oral microbiome balance." learnCitation="Wescombe et al., Probiotics and Antimicrobial Proteins, 2012. S. salivarius clinical evidence." />
          <OralSpeciesRow name="Streptococcus sanguinis" role="Caries defense — H₂O₂ producer" val={sp("Streptococcus sanguinis")} target=">1% reads" isPathogen={false} note="Inverse relationship with S. mutans: competes for the same tooth-surface niches" flagFn={v => flag(v >= 1, v >= 0.3)} learnWhat="Produces hydrogen peroxide as a metabolic byproduct that kills strict anaerobes and creates an aerobic microenvironment hostile to cariogenic bacteria." learnWhy="Population studies consistently show high S. sanguinis in caries-free individuals. Its abundance is one of the strongest predictors of caries resistance." learnCitation="Kreth et al., Journal of Bacteriology, 2005. Competitive exclusion of S. mutans." />
          <OralSpeciesRow name="Rothia dentocariosa" role="Anti-inflammatory commensal — biofilm stabilizer" val={sp("Rothia dentocariosa")} target=">0.5% reads" isPathogen={false} note="Produces urease that neutralizes organic acids, preventing pH drops that promote caries" flagFn={v => flag(v >= 0.5, v >= 0.1)} learnWhat="An alkalinogenic bacterium that hydrolyzes urea and produces ammonia, raising plaque pH and counteracting acidogenic species. Also has anti-inflammatory properties." learnWhy="Low Rothia dentocariosa is found in dysbiotic oral microbiomes. Its urease activity is a key pH-buffering mechanism in healthy dental biofilm." learnCitation="Nascimento et al., Journal of Dental Research, 2009. Alkalinogenic bacteria and caries resistance." />
          <OralSpeciesRow name="Haemophilus parainfluenzae" role="Commensal — early biofilm colonizer" val={sp("Haemophilus parainfluenzae")} target="1–3% reads" isPathogen={false} note="Provides growth factors for other commensals; its abundance indicates a mature, diverse microbiome" flagFn={v => flag(v >= 1 && v <= 3, v >= 0.3 && v <= 5)} learnWhat="An early and abundant colonizer of the oral and upper respiratory mucosa. Provides hemin and NAD growth factors to fastidious commensals that cannot synthesize them." learnWhy="Consistently found at high abundance in healthy individuals. Loss may destabilize the commensal community and create openings for pathogens." learnCitation="Bik et al., PLOS Biology, 2010. Core oral microbiome across 120 individuals." />
        </OralSection>

        {/* SECTION 5: SYSTEMIC DISEASE MARKERS */}
        <OralSection title="Systemic Disease Markers">
          <OralSpeciesRow name="Fusobacterium nucleatum" role="Colorectal cancer bridge organism" val={sp("Fusobacterium nucleatum")} target="<0.5% reads" isPathogen={true} note="Kostic et al., Nature 2012: consistently enriched in colorectal adenocarcinoma vs. normal tissue" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Invades vascular endothelium and can translocate from the oral cavity to distal body sites including the gut, placenta, and liver. Activates oncogenic signaling pathways (Wnt/β-catenin)." learnWhy="Found in the majority of colorectal cancer tissue samples but absent or low in adjacent normal tissue. Also associated with preterm birth and adverse pregnancy outcomes." learnCitation="Kostic et al., Genome Research, 2012. Fusobacterium nucleatum in colorectal carcinoma." />
          <OralSpeciesRow name="Treponema denticola" role="Alzheimer's-associated pathogen" val={sp("Treponema denticola")} target="<0.1% reads" isPathogen={true} note="Riviere et al., Brain Research 2002: found in post-mortem brain tissue from Alzheimer's patients" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="Produces gingipain proteases that degrade host proteins and can enter the bloodstream. Demonstrated ability to cross the blood-brain barrier in animal models." learnWhy="Post-mortem studies have identified T. denticola DNA in Alzheimer's brain tissue. The causal relationship is under active investigation, but the association is robust." learnCitation="Riviere et al., Brain Research, 2002. Oral treponemes in brain tissue of Alzheimer's patients." />
          <OralSpeciesRow name="Porphyromonas gingivalis" role="Cardiovascular risk pathogen" val={sp("Porphyromonas gingivalis")} target="<0.1% reads" isPathogen={true} note="Hussain et al., Frontiers Immunology 2023 (n=1,791): independently predicts MACE after adjusting for traditional risk factors" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="Produces gingipain proteases that cleave complement factors and evade immune destruction. Induces chronic systemic inflammation at levels disproportionate to its oral abundance." learnWhy="Found in coronary artery plaques. A 2023 meta-analysis of 1,791 patients found P. gingivalis burden independently predicted major adverse cardiovascular events." learnCitation="Hussain et al., Frontiers in Immunology, 2023. n=1,791 meta-analysis, MACE prediction." />
          <OralSpeciesRow name="Prevotella intermedia" role="Hormonal inflammation — pregnancy risk" val={sp("Prevotella intermedia")} target="<0.5% reads" isPathogen={true} note="Uses estrogen and progesterone as growth substrates — disproportionately elevated during hormonal fluctuations" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Uniquely able to substitute sex hormones for vitamin K as essential growth factors, giving it a selective advantage during hormonal changes (pregnancy, menstrual cycle, contraceptive use)." learnWhy="Associated with adverse pregnancy outcomes including preterm birth and low birth weight. Also linked to cardiovascular risk through chronic gingival inflammation." learnCitation="Offenbacher et al., Journal of Periodontology, 1996. Periodontal infection and adverse pregnancy outcomes." />
        </OralSection>

        {/* SECTION 6: OSA & SLEEP-ASSOCIATED */}
        <OralSection title="OSA & Sleep-Associated">
          <OralSpeciesRow name="Prevotella melaninogenica" role="OSA-enriched — airway inflammation" val={sp("Prevotella melaninogenica")} target="<1% reads" isPathogen={true} note="Consistently elevated in OSA patients across multiple cohort studies" flagFn={v => flag(v < 1, v < 2)} learnWhat="An anaerobe enriched in the upper airway microbiome of OSA patients. Produces lipopolysaccharide that promotes upper airway inflammation and may contribute to airway tissue remodeling." learnWhy="Chen et al. (2022) found oral microbiome composition including P. melaninogenica predicted OSA with 91.9% AUC. Its abundance correlates with AHI severity." learnCitation="Chen et al., Journal of Clinical Sleep Medicine, 2022. OSA prediction from oral microbiome, n=87." />
          <OralSpeciesRow name="Fusobacterium nucleatum" role="OSA-associated systemic bridge organism" val={sp("Fusobacterium nucleatum")} target="<0.5% reads" isPathogen={true} note="Elevated in OSA cohorts alongside P. melaninogenica; contributes to upper airway dysbiosis" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Found at elevated levels in both the oral and pharyngeal microbiome of OSA patients. Its invasive properties may allow penetration of upper airway epithelium." learnWhy="Contributes to the oral microbiome-OSA association. Its concurrent elevation with other OSA-associated taxa strengthens the predictive model for sleep-disordered breathing." learnCitation="Chen et al., Journal of Clinical Sleep Medicine, 2022. OSA microbiome prediction study." />
          <OralSpeciesRow name="Fusobacterium periodonticum" role="Periodontal + sleep pathway — bridging species" val={sp("Fusobacterium periodonticum")} target="<0.5% reads" isPathogen={true} note="Closely related to F. nucleatum; shares OSA-enrichment and periodontal risk associations" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="A Fusobacterium species closely related to F. nucleatum with similar invasive and co-aggregating properties. Bridges periodontal and systemic compartments." learnWhy="Elevated in OSA-associated dysbiosis profiles. Its co-occurrence with F. nucleatum amplifies periodontal-systemic risk." learnCitation="Almeida-Santos et al., mBio, 2021. Fusobacterium species in oral-systemic disease." />
          <OralSpeciesRow name="Peptostreptococcus spp." role="Anaerobic commensal — sleep microbiome marker" val={sp("Peptostreptococcus spp.")} target="<1% reads" isPathogen={true} note="Part of the OSA-enriched microbial community; contributes to anaerobic dysbiosis in the upper airway" flagFn={v => flag(v < 1, v < 3)} learnWhat="Strictly anaerobic gram-positive cocci that thrive in oxygen-depleted environments. Their abundance in the upper airway increases under hypoxic conditions associated with sleep apnea." learnWhy="Part of the core dysbiotic community found in OSA. High abundance indicates an anaerobic-shifted microbiome consistent with nocturnal oxygen desaturation." learnCitation="Chen et al., Journal of Clinical Sleep Medicine, 2022. Oral microbiome OSA prediction." />
        </OralSection>

        {/* SECTION 7: BREATH & METABOLIC */}
        <OralSection title="Breath & Metabolic">
          <OralSpeciesRow name="Solobacterium moorei" role="Primary halitosis organism — VSC producer" val={sp("Solobacterium moorei")} target="<0.5% reads" isPathogen={true} note="Produces volatile sulfur compounds (H₂S, CH₃SH) that are the primary chemical cause of chronic halitosis" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Produces volatile sulfur compounds (VSCs) — hydrogen sulfide and methyl mercaptan — the chemical signature of breath malodor. Thrives on protein substrates and tongue dorsum biofilm." learnWhy="The dominant organism in tongue biofilm of patients with refractory halitosis. VSC production correlates directly with organoleptic scores of breath odor severity." learnCitation="Haraszthy et al., Journal of Periodontology, 2007. Solobacterium moorei and halitosis." />
          <OralSpeciesRow name="Prevotella spp." role="Aggregate Prevotella — VSC + inflammation" val={sp("Prevotella spp.")} target="<3% reads" isPathogen={true} note="Total Prevotella genus abundance; includes all species — pathogenic and commensal" flagFn={v => flag(v < 3, v < 6)} learnWhat="The Prevotella genus includes species across a virulence spectrum — from key pathogens (P. intermedia, P. melaninogenica) to moderate commensals. Produces proteolytic enzymes and VSCs." learnWhy="High total Prevotella burden is associated with periodontal disease, OSA, and halitosis. Elevated aggregate Prevotella is a consistent finding in oral dysbiosis." learnCitation="Hajishengallis & Lamont, Trends in Immunology, 2012. Oral dysbiosis and the Prevotella genus." />
          <OralSpeciesRow name="Fusobacterium spp." role="Aggregate Fusobacterium — cancer + inflammation" val={sp("Fusobacterium spp.")} target="<1% reads" isPathogen={true} note="Total Fusobacterium genus; includes F. nucleatum, F. periodonticum, and other species" flagFn={v => flag(v < 1, v < 3)} learnWhat="The Fusobacterium genus contains multiple species with invasive and pro-inflammatory properties. They produce butyrate and other metabolites that can modulate host immunity." learnWhy="Elevated total Fusobacterium abundance is associated with periodontal disease, OSA, colorectal cancer risk, and adverse pregnancy outcomes." learnCitation="Kostic et al., Cell Host & Microbe, 2013. Fusobacterium and human disease." />
          <OralSpeciesRow name="Peptostreptococcus spp." role="Anaerobic VSC producer — breath marker" val={sp("Peptostreptococcus spp.")} target="<1% reads" isPathogen={true} note="Proteolytic anaerobes that produce sulfur compounds from amino acid metabolism" flagFn={v => flag(v < 1, v < 3)} learnWhat="Strictly anaerobic proteolytic bacteria that metabolize cysteine and methionine to produce volatile sulfur compounds. Dominant in deep periodontal pockets and tongue dorsum biofilm." learnWhy="High abundance correlates with clinical malodor scores and is found in both halitosis and periodontal disease patient profiles." learnCitation="Persson et al., Journal of Clinical Periodontology, 2011. Peptostreptococcus in oral malodor." />
        </OralSection>

        {/* SECTION 8: DIVERSITY METRICS */}
        <OralSection title="Diversity Metrics">
          <div style={{ padding: "12px 0" }}>
            {/* Shannon diversity */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
              <div>
                <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13, fontStyle: "italic", color: "var(--ink)" }}>Shannon Diversity Index</p>
                <p style={{ margin: "2px 0 0", fontFamily: font, fontSize: 11, color: "var(--ink-60)" }}>Species richness and evenness — target ≥3.0</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontFamily: font, fontSize: 16, color: shannonDiversity >= 3 ? "#2D6A4F" : shannonDiversity >= 2 ? "#92400E" : "#991B1B" }}>
                  {shannonDiversity.toFixed(2)}
                </p>
                <span style={{
                  fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.05em",
                  padding: "2px 6px", borderRadius: 3,
                  background: shannonDiversity >= 3 ? "#EAF3DE" : shannonDiversity >= 2 ? "#FEF3C7" : "#FEE2E2",
                  color: shannonDiversity >= 3 ? "#2D6A4F" : shannonDiversity >= 2 ? "#92400E" : "#991B1B",
                }}>
                  {shannonDiversity >= 3 ? "Optimal" : shannonDiversity >= 2 ? "Watch" : "Attention"}
                </span>
              </div>
            </div>
            {/* Species richness */}
            {sp("Species richness") > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
                <div>
                  <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13, fontStyle: "italic", color: "var(--ink)" }}>Species Richness</p>
                  <p style={{ margin: "2px 0 0", fontFamily: font, fontSize: 11, color: "var(--ink-60)" }}>Total OTUs detected — target &gt;150</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontFamily: font, fontSize: 16, color: sp("Species richness") > 150 ? "#2D6A4F" : sp("Species richness") > 80 ? "#92400E" : "#991B1B" }}>
                    {Math.round(sp("Species richness"))}
                  </p>
                  <span style={{
                    fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.05em",
                    padding: "2px 6px", borderRadius: 3,
                    background: sp("Species richness") > 150 ? "#EAF3DE" : sp("Species richness") > 80 ? "#FEF3C7" : "#FEE2E2",
                    color: sp("Species richness") > 150 ? "#2D6A4F" : sp("Species richness") > 80 ? "#92400E" : "#991B1B",
                  }}>
                    {sp("Species richness") > 150 ? "Optimal" : sp("Species richness") > 80 ? "Watch" : "Attention"}
                  </span>
                </div>
              </div>
            )}
            {/* Diversity context note */}
            <p style={{ margin: "10px 0 0", fontFamily: font, fontSize: 12, color: "rgba(20,20,16,0.5)", lineHeight: 1.6 }}>
              Higher diversity generally indicates a more resilient oral microbiome with better resistance to pathogen colonization. A Shannon index below 2.0 is associated with dysbiosis-related systemic risk.
            </p>
          </div>
        </OralSection>

      </div>
    </div>
  )
}

function BacteriaGroup({ title, rows, mounted }: {
  title: string
  rows: Array<{ name: string; sub: string; val: number; flag: Flag }>
  mounted: boolean
}) {
  const [open, setOpen] = useState(false)
  const [hov, setHov] = useState(false)
  const pct = (n: number, max: number) => Math.min((n / max) * 100, 100)
  return (
    <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-60)" }}>
          {title}
        </span>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            border: `0.5px solid ${hov ? "var(--gold)" : "rgba(20,20,16,0.2)"}`,
            color: hov ? "var(--gold)" : "rgba(20,20,16,0.5)",
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13, lineHeight: 1,
            transition: "border-color 0.2s ease, color 0.2s ease", flexShrink: 0,
          }}
        >
          {open ? "−" : "+"}
        </div>
      </div>
      <div style={{ maxHeight: open ? 400 : 0, opacity: open ? 1 : 0, overflow: "hidden", transition: "max-height 0.25s ease, opacity 0.25s ease" }}>
        {rows.map(row => (
          <MarkerRow
            key={row.name}
            name={row.name}
            sub={row.sub}
            value={row.val === 0 ? "Not detected" : formatValue(row.val)}
            unit="% reads"
            flag={row.flag}
            barPct={pct(row.val, 20)}
            color="var(--oral-c)"
            trackColor="var(--oral-bg)"
            hoverBg="rgba(45,106,79,0.04)"
            mounted={mounted}
          />
        ))}
      </div>
    </div>
  )
}

export function ScoreWheel({
  score, breakdown, sleepConnected, labFreshness, oralActive,
  sleepData, bloodData, oralData, lifestyleData, interactionsFired,
  lastSyncAt, lastSyncRequestedAt,
  peaqPercent, peaqPercentLabel, lpaFlag, hsCRPRetestFlag, additionalMarkers,
  labLockExpiresAt, oralOrdered, sleepNightsAvailable, oralKitStatus,
}: ScoreWheelProps) {
  const [mounted, setMounted] = useState(false)
  const [hoveredRing, setHoveredRing] = useState<string | null>(null)
  const [scorePulse, setScorePulse] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [displaySleep, setDisplaySleep] = useState(0)
  const [displayBlood, setDisplayBlood] = useState(0)
  const [displayOral, setDisplayOral] = useState(0)
  const [displayLifestyle, setDisplayLifestyle] = useState(0)

  useCountUp(score, 1400, 200, setDisplayScore)
  useCountUp(breakdown.sleepSub, 900, 350, setDisplaySleep)
  useCountUp(breakdown.bloodSub, 900, 450, setDisplayBlood)
  useCountUp(breakdown.oralSub, 900, 550, setDisplayOral)
  useCountUp(breakdown.lifestyleSub, 800, 650, setDisplayLifestyle)

  useEffect(() => {
    setMounted(true)
    // Score pulse after count-up finishes
    const t = setTimeout(() => {
      setScorePulse(true)
      setTimeout(() => setScorePulse(false), 400)
    }, 1800)
    return () => clearTimeout(t)
  }, [])

  const hasBlood = labFreshness !== "none" && labFreshness !== "expired"
  const bloodLocked = !hasBlood

  const RINGS = [
    { r: 96, circumference: 603.2,  color: "var(--sleep-c)", trackColor: "var(--sleep-bg)", fillPct: breakdown.sleepSub / 27, pending: !sleepConnected, animDelay: 300, ringKey: "sleep", glowColor: "rgba(74,127,181,0.5)" },
    { r: 84, circumference: 527.8,  color: "var(--blood-c)", trackColor: "var(--blood-bg)", fillPct: breakdown.bloodSub / 33, pending: bloodLocked,      animDelay: 450, ringKey: "blood", glowColor: "rgba(192,57,43,0.45)" },
    { r: 72, circumference: 452.4,  color: "var(--oral-c)",  trackColor: "var(--oral-bg)",  fillPct: breakdown.oralSub / 27, pending: !oralActive,       animDelay: 600, ringKey: "oral",  glowColor: "rgba(45,106,79,0.45)" },
    { r: 60, circumference: 376.99, color: "var(--gold)",    trackColor: "var(--gold-dim)", fillPct: breakdown.lifestyleSub / 13, pending: !lifestyleData,  animDelay: 750, ringKey: "lifestyle",  glowColor: "rgba(184,134,11,0.5)" },
  ]

  const LEGEND = [
    { label: "Sleep",        color: "var(--sleep-c)", active: sleepConnected },
    { label: "Blood",        color: "var(--blood-c)", active: hasBlood },
    { label: `Oral${!oralActive ? " (pending)" : ""}`, color: "var(--oral-c)", active: oralActive },
    { label: "Lifestyle",    color: "var(--gold)",    active: !!lifestyleData },
  ]

  const subline = ""

  // Stale badge
  const staleBadge = labFreshness === "stale" && bloodData ? `⚠ ${bloodData.monthsOld} mo old` : labFreshness === "aging" && bloodData ? `${bloodData.monthsOld} mo old` : undefined

  // Panel descriptions — derived from real data only, no hardcoded copy
  const sleepDesc = sleepConnected && sleepData?.lastSync
    ? `Synced ${relTimeSince(sleepData.lastSync)} via ${sleepData.device}`
    : ""

  // Blood: first sentence of AI insight, or empty
  const bloodDesc = bloodData?.bloodInsight
    ? bloodData.bloodInsight.split(".")[0] + "."
    : ""

  const oralDesc = (!oralActive && oralOrdered) ? "Kit processing" : ""

  // Sleep marker flags
  const sf = sleepData ? {
    deep:       flag(sleepData.deepPct >= 17, sleepData.deepPct >= 13),
    hrv:        flag(sleepData.hrv >= 50, sleepData.hrv >= 35),
    spo2Dips:   flag(sleepData.spo2Dips <= 2, sleepData.spo2Dips <= 5),
    rem:        flag(sleepData.remPct >= 18, sleepData.remPct >= 14),
    efficiency: flag(sleepData.efficiency >= 85, sleepData.efficiency >= 78),
  } : null

  // Flag helper: 0 means not tested
  const bflag = (val: number, good: boolean, watch?: boolean): Flag =>
    val === 0 ? "not_tested" : flag(good, watch)

  const bf = bloodData ? {
    hsCRP:     bflag(bloodData.hsCRP, bloodData.hsCRP < 0.5, bloodData.hsCRP < 2.0),
    vitaminD:  bflag(bloodData.vitaminD, bloodData.vitaminD >= 30 && bloodData.vitaminD <= 60, bloodData.vitaminD >= 20),
    apoB:      bflag(bloodData.apoB, bloodData.apoB < 90, bloodData.apoB < 120),
    ldlHdl:    bflag(bloodData.ldlHdlRatio, bloodData.ldlHdlRatio < 2.0, bloodData.ldlHdlRatio < 3.0),
    hba1c:     bflag(bloodData.hba1c, bloodData.hba1c < 5.4, bloodData.hba1c < 5.7),
    lpa:       bflag(bloodData.lpa, bloodData.lpa < 30, bloodData.lpa < 50),
    tg:        bflag(bloodData.triglycerides, bloodData.triglycerides < 150, bloodData.triglycerides < 200),
    ldl:       bflag(bloodData.ldl, bloodData.ldl < 100, bloodData.ldl < 130),
    hdl:       bflag(bloodData.hdl, bloodData.hdl >= 60, bloodData.hdl >= 40),
    glucose:   bflag(bloodData.glucose, bloodData.glucose >= 70 && bloodData.glucose < 100, bloodData.glucose < 126),
    egfr:      bflag(bloodData.egfr, bloodData.egfr >= 90, bloodData.egfr >= 60),
    hemoglobin: bflag(bloodData.hemoglobin, bloodData.hemoglobin >= 12 && bloodData.hemoglobin <= 17.5, bloodData.hemoglobin >= 10),
  } : null

  const of_ = oralData ? {
    shannon:   flag(oralData.shannonDiversity >= 3.0, oralData.shannonDiversity >= 2.0),
    nitrate:   flag(oralData.nitrateReducersPct >= 5, oralData.nitrateReducersPct >= 2),
    periodont: flag(oralData.periodontPathPct < 0.5, oralData.periodontPathPct < 1.5),
    osa:       flag(oralData.osaTaxaPct < 1.0, oralData.osaTaxaPct < 2.0),
  } : null

  const fa = (n: number, max: number) => Math.min((n / max) * 100, 100)

  const fadeUp = (delay: string): React.CSSProperties => ({
    animation: "fadeUp 0.7s ease both",
    animationDelay: delay,
  })

  const exerciseLabel: Record<string, string> = { active: "Active (4+ days/wk)", moderate: "Moderate (2–3 days/wk)", light: "Light (1 day/wk)", sedentary: "Sedentary" }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 0 64px", display: "flex", flexDirection: "column", gap: 40 }}>

      {/* RING */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, ...fadeUp("0s") }}>
        <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--ink-30)", margin: 0 }}>
          YOUR PEAQ SCORE · {new Date().toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
        </p>
        <ScoreRingComponent
          rings={RINGS}
          score={score}
          displayScore={displayScore}
          onRingHover={setHoveredRing}
          hoveredRing={hoveredRing}
          scorePulse={scorePulse}
        />
        <RingLegend items={LEGEND} />
        {peaqPercent !== undefined && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--ink-30)", margin: 0 }}>
              Data Completeness · {peaqPercentLabel}
            </p>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { label: "Sleep",     pct: breakdown.sleepSub / 27,          color: "var(--sleep-c)" },
                { label: "Blood",     pct: breakdown.bloodSub / 33,          color: "var(--blood-c)" },
                { label: "Oral",      pct: breakdown.oralSub / 27,           color: "var(--oral-c)"  },
                { label: "Lifestyle", pct: breakdown.lifestyleSub / 13,      color: "var(--gold)"    },
              ].map(bar => (
                <div key={bar.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--ink-06)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, bar.pct * 100)}%`, height: "100%", background: bar.color, borderRadius: 2, transition: "width 0.8s ease" }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 8, color: "var(--ink-30)", textTransform: "uppercase" }}>{bar.label}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--ink-60)", margin: 0 }}>
              {peaqPercent}% complete
            </p>
          </div>
        )}
      </div>

      {/* HERO */}
      <div style={fadeUp("0s")}>
        <HeroTitle sleepConnected={sleepConnected} hasBlood={hasBlood} oralActive={oralActive} subline={subline} />
      </div>

      {/* PENDING BANNERS */}
      {(!sleepConnected || !oralActive || labFreshness === "none" || labFreshness === "expired" || labFreshness === "stale") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, ...fadeUp("0.04s") }}>
          {!sleepConnected && <PendingBanner type="sleep" />}
          {labFreshness === "none" && <PendingBanner type="blood" />}
          {labFreshness === "expired" && <PendingBanner type="blood-expired" />}
          {labFreshness === "stale" && bloodData && <PendingBanner type="blood-stale" monthsOld={bloodData.monthsOld} />}
          {!oralActive && <PendingBanner type="oral" />}
        </div>
      )}

      {/* PANEL GRID */}
      <div style={fadeUp("0.08s")}>
        <PanelGrid
          displaySleep={displaySleep} displayBlood={displayBlood} displayOral={displayOral} displayLifestyle={displayLifestyle}
          sleepConnected={sleepConnected} labFreshness={labFreshness} oralActive={oralActive} lifestyleActive={!!lifestyleData}
          lifestyleSub={breakdown.lifestyleSub}
          sleepDesc={sleepDesc} bloodDesc={bloodDesc} oralDesc={oralDesc}
          staleBadge={staleBadge} mounted={mounted} hoveredRing={hoveredRing}
          interactionsFired={interactionsFired}
        />
      </div>

      {/* CROSS-PANEL INTERACTIONS */}
      <CrossPanelInteractions
        oralKitStatus={oralKitStatus}
        interactionsFired={interactionsFired}
        oralActive={oralActive}
        oralData={oralData}
        bloodData={bloodData}
        sleepData={sleepData}
        fadeUpFn={fadeUp}
      />

      {/* CTA BLOCKS */}
      <CTABlocks sleepConnected={sleepConnected} labFreshness={labFreshness} oralActive={oralActive} />

      {/* SLEEP MARKERS */}
      <CollapsiblePanel
        title="Sleep"
        score={Math.round(breakdown.sleepSub * 10) / 10}
        maxScore={27}
        subtitle={sleepData ? `${sleepData.nightsAvg}-NIGHT AVG · ${sleepData.device.toUpperCase()}` : "NO DATA"}
        statusDots={sf ? [sf.deep, sf.hrv, sf.spo2Dips, sf.rem] : undefined}
        defaultOpen={sleepConnected}
        delay="0.14s"
        fadeUpFn={fadeUp}
      >
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>

          {sleepData && (
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-30)", padding: "8px 0 0", margin: 0 }}>
              Via {sleepData.device} · Last sync {sleepData.lastSync ? new Date(sleepData.lastSync).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            </p>
          )}
          {[
            { name: "Deep sleep",       sub: "Slow-wave · target ≥17%",    val: sleepData?.deepPct,   unit: "% of TST",  flagKey: "deep",       max: 30 },
            { name: "HRV",              sub: "RMSSD · target ≥50 ms",      val: sleepData?.hrv,       unit: "ms RMSSD",  flagKey: "hrv",        max: 100 },
            { name: "SpO2 dips",        sub: "Events <90% · target ≤2",    val: sleepData?.spo2Dips,  unit: "per night", flagKey: "spo2Dips",   max: 10 },
            { name: "REM",              sub: "Target ≥18%",                 val: sleepData?.remPct,    unit: "% of TST",  flagKey: "rem",        max: 30 },
            { name: "Sleep efficiency", sub: "Target ≥85%",                 val: sleepData?.efficiency,unit: "% in bed",  flagKey: "efficiency", max: 100 },
          ].map(row => (
            <MarkerRow key={row.name} name={row.name} sub={row.sub}
              value={row.val ?? null} unit={row.unit}
              flag={sf ? (sf[row.flagKey as keyof typeof sf] as Flag) : "pending"}
              barPct={row.val !== undefined ? fa(row.val, row.max) : 0}
              color="var(--sleep-c)" trackColor="var(--sleep-bg)"
              hoverBg="rgba(74,127,181,0.04)" mounted={mounted}
            />
          ))}
        </div>
      </CollapsiblePanel>

      {/* BLOOD MARKERS */}
      <CollapsiblePanel
        title="Blood"
        score={breakdown.bloodSub}
        maxScore={33}
        subtitle={bloodData ? `${bloodData.labName.toUpperCase()} · ${new Date(bloodData.collectionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}` : "NO DATA"}
        statusDots={bf ? [bf.hsCRP, bf.apoB, bf.lpa, bf.tg] : undefined}
        defaultOpen={hasBlood}
        delay="0.20s"
        fadeUpFn={fadeUp}
        headerExtra={hasBlood ? (
          <a
            href="/settings/labs"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 11,
              fontVariant: "small-caps",
              letterSpacing: "0.04em",
              color: "rgba(20,20,16,0.4)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#B8860B" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(20,20,16,0.4)" }}
          >
            ↑ re-upload labs
          </a>
        ) : undefined}
      >
        {/* Lock countdown removed — locking still happens in background */}
        {(labFreshness === "stale") && bloodData && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, borderRadius: 4, background: "var(--amber-bg)" }}>
            <span style={{ color: "var(--amber)" }}>⚠</span>
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--amber)" }}>
              These results are {bloodData.monthsOld} months old. Retest recommended.
            </span>
          </div>
        )}
        {hsCRPRetestFlag && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 8, borderRadius: 4, background: "rgba(220,38,38,0.06)", border: "0.5px solid rgba(220,38,38,0.2)" }}>
            <span style={{ color: "#dc2626" }}>↑</span>
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "#991b1b" }}>
              hsCRP &gt;10 mg/L may indicate acute inflammation. Retest in 2–4 weeks once resolved.
            </span>
          </div>
        )}

        {bloodData?.bloodInsight && (
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 16, color: "rgba(20,20,16,0.7)", lineHeight: 1.55, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {bloodData.bloodInsight}
          </p>
        )}
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "hsCRP",         sub: "High-sensitivity · target <0.5",  val: bloodData?.hsCRP,         unit: "mg/L",  flagKey: "hsCRP",    max: 5    },
            { name: "Vitamin D",     sub: "25-OH · target 30–60 ng/mL",      val: bloodData?.vitaminD,       unit: "ng/mL", flagKey: "vitaminD", max: 80   },
            { name: "ApoB",          sub: "Particles · target <90",           val: bloodData?.apoB,           unit: "mg/dL", flagKey: "apoB",     max: 150  },
            { name: "LDL : HDL",     sub: "Ratio · target <2.0",             val: bloodData?.ldlHdlRatio,    unit: "ratio", flagKey: "ldlHdl",   max: 5    },
            { name: "HbA1c",         sub: "Glycaemia · target <5.4%",        val: bloodData?.hba1c,          unit: "%",     flagKey: "hba1c",    max: 8    },
            { name: "Lp(a)",         sub: "Lipoprotein(a) · target <30",     val: bloodData?.lpa,            unit: "mg/dL", flagKey: "lpa",      max: 80   },
            { name: "Triglycerides", sub: "Target <150 mg/dL",               val: bloodData?.triglycerides,  unit: "mg/dL", flagKey: "tg",       max: 300  },
          ].map(row => {
            const notTested = row.val === undefined || row.val === 0
            return (
              <MarkerRow key={row.name} name={row.name} sub={row.sub}
                value={notTested ? null : formatValue(row.val!)} unit={row.unit}
                flag={notTested ? "not_tested" : bf ? (bf[row.flagKey as keyof typeof bf] as Flag) : "pending"}
                barPct={notTested ? 0 : fa(row.val!, row.max)}
                color="var(--blood-c)" trackColor="var(--blood-bg)"
                hoverBg="rgba(192,57,43,0.04)" mounted={mounted}
              />
            )
          })}
        </div>
        {bloodData && (() => {
          const useApoB = bloodData.apoB > 0
          const useLDL  = !useApoB && bloodData.ldl > 0
          const useHbA1c = bloodData.hba1c > 0 && bloodData.glucose === 0
          return (
            <div style={{ marginTop: 4 }}>
              {useApoB && (
                <SpectrumRow name="ApoB" value={bloodData.apoB} unit="mg/dL"
                  f={bf!.apoB} min={40} max={160} optMin={40} optMax={90} />
              )}
              {useLDL && (
                <SpectrumRow name="LDL" value={bloodData.ldl} unit="mg/dL"
                  f={bf!.ldl} min={40} max={220} optMin={40} optMax={100} />
              )}
              {bloodData.hdl > 0 && (
                <SpectrumRow name="HDL" value={bloodData.hdl} unit="mg/dL"
                  f={bf!.hdl} min={20} max={100} optMin={60} optMax={100} />
              )}
              {bloodData.glucose > 0 && (
                <SpectrumRow name="Glucose" value={bloodData.glucose} unit="mg/dL"
                  f={bf!.glucose} min={60} max={180} optMin={70} optMax={99} />
              )}
              {useHbA1c && (
                <SpectrumRow name="HbA1c" value={bloodData.hba1c} unit="%"
                  f={bf!.hba1c} min={4} max={10} optMin={4} optMax={5.4} />
              )}
              {bloodData.egfr > 0 && (
                <SpectrumRow name="eGFR" value={bloodData.egfr} unit="mL/min"
                  f={bf!.egfr} min={0} max={130} optMin={90} optMax={130} />
              )}
              {bloodData.hemoglobin > 0 && (
                <SpectrumRow name="Hemoglobin" value={bloodData.hemoglobin} unit="g/dL"
                  f={bf!.hemoglobin} min={8} max={20} optMin={12} optMax={17.5} />
              )}
            </div>
          )
        })()}
        {bloodData && (() => {
          const missing: Array<{ label: string; pts: number }> = []
          if (!bloodData.hsCRP)   missing.push({ label: "hs-CRP",   pts: 3 })
          if (!bloodData.hba1c)   missing.push({ label: "HbA1c",    pts: 3 })
          if (!bloodData.vitaminD) missing.push({ label: "Vitamin D", pts: 2 })
          if (missing.length === 0) return null
          return (
            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 6, background: "rgba(184,134,11,0.05)", border: "0.5px solid rgba(184,134,11,0.2)" }}>
              <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(20,20,16,0.45)", margin: "0 0 8px" }}>
                These markers would strengthen your score
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {missing.map(m => (
                  <a key={m.label} href="/settings/labs" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 4, background: "white", border: "0.5px solid rgba(184,134,11,0.3)", textDecoration: "none", cursor: "pointer" }}>
                    <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--ink)" }}>{m.label}</span>
                    <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "#B8860B" }}>+{m.pts} pts</span>
                  </a>
                ))}
              </div>
            </div>
          )
        })()}
        {hasBlood && (
          <a href="/dashboard/blood" style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--gold)", display: "block", marginTop: 12 }}>
            View full blood panel →
          </a>
        )}
      </CollapsiblePanel>

      {/* ADDITIONAL MARKERS (collapsible) */}
      {additionalMarkers && additionalMarkers.length > 0 && (
        <CollapsiblePanel
          title="Additional Markers"
          subtitle={`${additionalMarkers.length} markers · not scored`}
          defaultOpen={false}
          delay="0.23s"
          fadeUpFn={fadeUp}
        >
          {additionalMarkers.map((m) => (
            <div
              key={m.name}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 0", borderBottom: "0.5px solid var(--ink-06)",
              }}
            >
              <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink-60)" }}>{m.name}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)" }}>{formatValue(m.value)}</span>
                <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, color: "var(--ink-30)" }}>{m.unit}</span>
              </div>
            </div>
          ))}
        </CollapsiblePanel>
      )}

      {/* ORAL MARKERS */}
      <CollapsiblePanel
        title="Oral Microbiome"
        score={breakdown.oralSub}
        maxScore={27}
        subtitle={oralData ? `ZYMO RESEARCH · ${new Date(oralData.reportDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}` : (oralOrdered ? "PROCESSING" : "")}
        statusDots={of_ ? [of_.shannon, of_.nitrate, of_.periodont, of_.osa] : undefined}
        defaultOpen={oralActive}
        delay="0.26s"
        fadeUpFn={fadeUp}
      >
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "Shannon diversity",   sub: "16S species richness · target ≥3.0",         val: oralData?.shannonDiversity,   unit: "index",   flagKey: "shannon",  max: 5  },
            { name: "Nitrate-reducing",    sub: "Neisseria · Rothia · Veillonella · ≥5%",     val: oralData?.nitrateReducersPct, unit: "% reads", flagKey: "nitrate",  max: 20 },
            { name: "Periodontal path.",   sub: "P. gingivalis · T. denticola · target <0.5%", val: oralData?.periodontPathPct,   unit: "% reads", flagKey: "periodont",max: 3  },
            { name: "OSA-associated taxa", sub: "Prevotella · Fusobacterium · target <1%",     val: oralData?.osaTaxaPct,         unit: "% reads", flagKey: "osa",      max: 5  },
          ].map(row => (
            <MarkerRow key={row.name} name={row.name} sub={row.sub}
              value={row.val ?? null} unit={row.unit}
              flag={of_ ? (of_[row.flagKey as keyof typeof of_] as Flag) : "pending"}
              barPct={row.val !== undefined ? fa(row.val, row.max) : 0}
              color="var(--oral-c)" trackColor="var(--oral-bg)"
              hoverBg="rgba(45,106,79,0.04)" mounted={mounted}
            />
          ))}
          {oralActive && (
            <a href="/dashboard/oral" style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "#2D6A4F", display: "block", marginTop: 12 }}>
              View full oral panel →
            </a>
          )}
        </div>
      </CollapsiblePanel>

      {/* LIFESTYLE */}
      <CollapsiblePanel
        title="Lifestyle"
        score={Math.round(breakdown.lifestyleSub * 10) / 10}
        maxScore={13}
        subtitle={lifestyleData ? `QUESTIONNAIRE · ${new Date(lifestyleData.updatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}` : "QUESTIONNAIRE"}
        defaultOpen={!!lifestyleData}
        delay="0.30s"
        fadeUpFn={fadeUp}
      >
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {(() => {
            const exLabels: Record<string, string> = { active: "Active — 5+×/wk", moderate: "Moderate — 3–4×/wk", light: "Light — 1–2×/wk", sedentary: "Sedentary" }
            const brushLabels: Record<string, string> = { once: "Once per day", twice: "Twice per day", more: "3+ times/day" }
            const flossLabels: Record<string, string> = { never: "Never", sometimes: "Sometimes", daily: "Daily" }
            const dentalLabels: Record<string, string> = { "6mo": "< 6 months", "1yr": "6–12 months", "2yr": "1–2 years", more: "2+ years" }
            const smokeLabels: Record<string, string> = { never: "Never smoked", former: "Former smoker", current: "Current smoker" }
            const stressLabels: Record<string, string> = { low: "Low", moderate: "Moderate", high: "High" }
            const ageLabels: Record<string, string> = { "18_29": "Under 30", "30_39": "30–39", "40_49": "40–49", "50_59": "50–59", "60_69": "60–69", "70_plus": "70 or older" }
            const sexLabels: Record<string, string> = { male: "Male", female: "Female", non_binary: "Non-binary", prefer_not_to_say: "Prefer not to answer" }

            type LRow = { name: string; val: string | null; flag: Flag }
            const rows: LRow[] = []

            if (lifestyleData) {
              rows.push({ name: "Age range", val: lifestyleData.ageRange ? (ageLabels[lifestyleData.ageRange] ?? lifestyleData.ageRange) : "Not set", flag: (lifestyleData.ageRange ? "good" : "watch") as Flag })
              rows.push({ name: "Biological sex", val: lifestyleData.biologicalSex ? (sexLabels[lifestyleData.biologicalSex] ?? lifestyleData.biologicalSex) : "Not set", flag: (lifestyleData.biologicalSex ? "good" : "watch") as Flag })
              rows.push({ name: "Exercise", val: exLabels[lifestyleData.exerciseLevel] ?? lifestyleData.exerciseLevel, flag: (lifestyleData.exerciseLevel === "sedentary" ? "attention" : lifestyleData.exerciseLevel === "light" ? "watch" : "good") as Flag })
              rows.push({ name: "Brushing", val: brushLabels[lifestyleData.brushingFreq] ?? lifestyleData.brushingFreq, flag: (lifestyleData.brushingFreq === "once" ? "watch" : "good") as Flag })
              rows.push({ name: "Flossing", val: flossLabels[lifestyleData.flossingFreq] ?? lifestyleData.flossingFreq, flag: (lifestyleData.flossingFreq === "never" ? "attention" : lifestyleData.flossingFreq === "sometimes" ? "watch" : "good") as Flag })
              rows.push({ name: "Dental visits", val: dentalLabels[lifestyleData.lastDentalVisit] ?? lifestyleData.lastDentalVisit, flag: (lifestyleData.lastDentalVisit === "6mo" || lifestyleData.lastDentalVisit === "1yr" ? "good" : lifestyleData.lastDentalVisit === "2yr" ? "watch" : "attention") as Flag })
              rows.push({ name: "Smoking", val: smokeLabels[lifestyleData.smokingStatus] ?? lifestyleData.smokingStatus, flag: (lifestyleData.smokingStatus === "current" ? "attention" : lifestyleData.smokingStatus === "former" ? "watch" : "good") as Flag })
              if (lifestyleData.stressLevel) rows.push({ name: "Stress", val: stressLabels[lifestyleData.stressLevel] ?? lifestyleData.stressLevel, flag: (lifestyleData.stressLevel === "high" ? "attention" : lifestyleData.stressLevel === "moderate" ? "watch" : "good") as Flag })
              if (lifestyleData.alcoholPerWeek !== undefined) rows.push({ name: "Alcohol", val: lifestyleData.alcoholPerWeek === 0 ? "None" : `${lifestyleData.alcoholPerWeek} drinks/wk`, flag: (lifestyleData.alcoholPerWeek > 14 ? "attention" : lifestyleData.alcoholPerWeek > 7 ? "watch" : "good") as Flag })
              if (lifestyleData.vegServings !== undefined) rows.push({ name: "Vegetables", val: lifestyleData.vegServings === 0 ? "None" : `${lifestyleData.vegServings} servings/day`, flag: (lifestyleData.vegServings >= 3 ? "good" : lifestyleData.vegServings >= 1 ? "watch" : "attention") as Flag })
            } else {
              rows.push({ name: "Age range", val: null, flag: "pending" })
              rows.push({ name: "Biological sex", val: null, flag: "pending" })
              rows.push({ name: "Exercise", val: null, flag: "pending" })
              rows.push({ name: "Oral hygiene", val: null, flag: "pending" })
              rows.push({ name: "Dental visits", val: null, flag: "pending" })
              rows.push({ name: "Smoking", val: null, flag: "pending" })
            }

            const dotColor = (f: Flag) => f === "good" ? "#2D6A4F" : f === "watch" ? "#B8860B" : f === "attention" ? "#C0392B" : "var(--ink-30)"

            return rows.map((row, i) => (
              <div key={row.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < rows.length - 1 ? "0.5px solid var(--ink-06)" : "none" }}>
                <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink-60)" }}>{row.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink)" }}>{row.val ?? "—"}</span>
                  <span style={{ fontSize: 8, color: dotColor(row.flag), lineHeight: 1 }}>●</span>
                </div>
              </div>
            ))
          })()}
        </div>
        <a href="/settings/lifestyle" style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--gold)", display: "block", marginTop: 14 }}>
          Update lifestyle markers →
        </a>
      </CollapsiblePanel>

      {/* INSIGHTS */}
      <div style={fadeUp("0.32s")}>
        <Insights
          sleepConnected={sleepConnected} hasBlood={hasBlood} oralActive={oralActive} lifestyleActive={!!lifestyleData}
          sleepHrv={sleepData?.hrv} sleepDeepPct={sleepData?.deepPct}
          sleepEfficiency={sleepData?.efficiency}
          bloodHsCrp={bloodData?.hsCRP} bloodApoB={bloodData?.apoB}
          bloodLdl={bloodData?.ldl} bloodVitaminD={bloodData?.vitaminD}
          bloodHba1c={bloodData?.hba1c} bloodGlucose={bloodData?.glucose}
          oralPeriodont={oralData?.periodontPathPct}
          exerciseLevel={lifestyleData?.exerciseLevel}
          smokingStatus={lifestyleData?.smokingStatus}
          stressLevel={lifestyleData?.stressLevel}
          alcoholDrinksPerWeek={lifestyleData?.alcoholPerWeek}
          vegServings={lifestyleData?.vegServings}
          processedFood={lifestyleData?.processedFood}
        />
      </div>

      {/* NEXT STEPS */}
      <div style={fadeUp("0.38s")}>
        <NextSteps
          sleepConnected={sleepConnected} hasBlood={hasBlood} oralActive={oralActive}
          bloodLdl={bloodData?.ldl}
          bloodHsCrp={bloodData?.hsCRP}
          bloodVitaminD={bloodData?.vitaminD}
          bloodGlucose={bloodData?.glucose}
          bloodHba1c={bloodData?.hba1c}
        />
      </div>

      {/* FOOTER */}
      <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, textAlign: "center", color: "var(--ink-30)", maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
        For informational purposes only. Peaq does not provide medical advice. Always consult a licensed healthcare provider regarding your results.
      </p>
    </div>
  )
}

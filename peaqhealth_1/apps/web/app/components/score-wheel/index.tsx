"use client"
import React, { useEffect, useImperativeHandle, useRef, useState } from "react"
import { useCountUp } from "./use-count-up"
import { PeaksVisualization } from "./peaks"
import { HeroTitle } from "./hero-title"
import { PendingBanner } from "./pending-banners"
import { PanelGrid } from "./panel-grid"
import { MarkerRow, type Flag } from "./marker-row"
import { Insights } from "./insights"
import { NextSteps } from "./next-steps"
import { CTABlocks } from "./cta-blocks"
import { PanelChip, type Panel } from "../ui/PanelChip"

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
  isSyncing?: boolean
  wearableProvider?: string
  labFreshness: "fresh" | "aging" | "stale" | "expired" | "none"
  oralActive: boolean
  sleepData?: {
    deepPct: number
    hrv: number
    spo2Avg: number
    remPct: number
    efficiency: number
    nightsAvg: number
    device: string
    lastSync: string
    providerSlug?: string
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
    mouthwashType?: string
    fermentedFoods?: string
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
  whoopData?: {
    connected:    boolean
    lastSynced:   string | null
    recentNights: Array<{ date: string; totalSleepHours: number; hrv: number }>
  }
  modifiers_applied?: Array<{
    id: string
    panels: string[]
    direction: 'penalty' | 'bonus'
    points: number
    label: string
    rationale: string
  }>
  modifier_total?: number
}

function ageAtLeast(ageRange: string | undefined, minAge: number): boolean {
  const MIN: Record<string, number> = { "18_29": 18, "30_39": 30, "40_49": 40, "50_59": 50, "60_69": 60, "70_plus": 70 }
  return (MIN[ageRange ?? ""] ?? 0) >= minAge
}

type MissingMarker = { label: string; pts: number; reason: string; science: string }

function computeRelevantMissing(
  blood: ScoreWheelProps["bloodData"],
  lifestyle: ScoreWheelProps["lifestyleData"],
  oral: ScoreWheelProps["oralData"],
): MissingMarker[] {
  if (!blood) return []
  const ageRange = lifestyle?.ageRange
  const stress = lifestyle?.stressLevel
  const results: MissingMarker[] = []

  // HbA1c: only if glucose ≥ 95 or age 40+
  if (!blood.hba1c) {
    const science = "Reflects average blood glucose over 3 months. Below 5.7% is optimal. Above 5.7% indicates prediabetes risk."
    if (blood.glucose >= 95) {
      results.push({ label: "HbA1c", pts: 3, reason: `Your fasting glucose is ${blood.glucose} mg/dL — just above optimal. HbA1c would confirm whether this is a trend or a one-time reading.`, science })
    } else if (ageAtLeast(ageRange, 40)) {
      results.push({ label: "HbA1c", pts: 3, reason: `Routine HbA1c screening is recommended after 40, even with normal fasting glucose, to catch early glycemic drift.`, science })
    }
  }

  // hs-CRP: only if LDL elevated, oral pathogens elevated, or high stress
  if (!blood.hsCRP) {
    const science = "Below 1.0 mg/L is low risk. 1.0–3.0 is moderate. Above 3.0 suggests active systemic inflammation."
    const ldlHigh = blood.ldl > 130
    const periodontHigh = (oral?.periodontPathPct ?? 0) > 10
    if (periodontHigh) {
      results.push({ label: "hs-CRP", pts: 3, reason: `Elevated P. gingivalis in your oral panel suggests active periodontal inflammation. hs-CRP measures whether that inflammation is systemic.`, science })
    } else if (ldlHigh) {
      results.push({ label: "hs-CRP", pts: 3, reason: `Your LDL is ${blood.ldl} mg/dL. hs-CRP would quantify the inflammatory component of your cardiovascular risk.`, science })
    } else if (stress === "high") {
      results.push({ label: "hs-CRP", pts: 3, reason: `Chronic stress elevates CRP directly. With high self-reported stress, knowing your hs-CRP baseline is clinically actionable.`, science })
    }
  }

  // ApoB: only if LDL or triglycerides elevated
  if (!blood.apoB) {
    const science = "Optimal is below 90 mg/dL. Each ApoB particle can deposit in arterial walls regardless of LDL size."
    if (blood.ldl > 120) {
      results.push({ label: "ApoB", pts: 2, reason: `Your LDL is ${blood.ldl} mg/dL. ApoB counts every atherogenic particle — a more precise cardiovascular risk signal than LDL alone.`, science })
    } else if (blood.triglycerides > 100) {
      results.push({ label: "ApoB", pts: 2, reason: `Your triglycerides of ${blood.triglycerides} mg/dL suggest metabolic dysregulation — ApoB would quantify the atherogenic particle burden.`, science })
    }
  }

  // Lp(a): always recommend once as genetic screen
  if (!blood.lpa) {
    results.push({ label: "Lp(a)", pts: 1, reason: `Lp(a) is genetically determined and only needs to be tested once. At your LDL level it would complete your cardiovascular risk picture.`, science: "Above 125 nmol/L doubles cardiovascular risk. Cannot be lowered by diet or statins — important for family risk planning." })
  }

  // Vitamin D: only if age 40+
  if (!blood.vitaminD && ageAtLeast(ageRange, 40)) {
    results.push({ label: "Vitamin D", pts: 2, reason: `Vitamin D absorption declines with age. Deficiency is common after 40 and directly affects bone density, immune function, and mood.`, science: "Below 30 ng/mL is deficient. 40–60 ng/mL is optimal. Supplementation typically corrects deficiency within 3 months." })
  }

  return results
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
  good: "#2D6A4F", watch: "#B8860B", attention: "#C2510A", elevated: "#C0392B", pending: "var(--ink-12)", not_tested: "var(--ink-12)",
}


const BLOOD_ZONES: Record<string, {
  zones: { label: string; color: string; min: number; max: number }[]
  unit: string
  markerColor: string
}> = {
  hsCRP: {
    unit: 'mg/L',
    markerColor: '#C0392B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,   max: 0.5  },
      { label: 'Good',    color: '#FFF3CD', min: 0.5, max: 1.0  },
      { label: 'Watch',   color: '#FFE0B2', min: 1.0, max: 3.0  },
      { label: 'High',    color: '#FFCDD2', min: 3.0, max: 10.0 },
    ]
  },
  LDL: {
    unit: 'mg/dL',
    markerColor: '#C0392B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,   max: 70  },
      { label: 'Good',    color: '#FFF3CD', min: 70,  max: 100 },
      { label: 'Watch',   color: '#FFE0B2', min: 100, max: 130 },
      { label: 'High',    color: '#FFCDD2', min: 130, max: 200 },
    ]
  },
  HDL: {
    unit: 'mg/dL',
    markerColor: '#C0392B',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,  max: 40  },
      { label: 'Watch',   color: '#FFE0B2', min: 40, max: 50  },
      { label: 'Good',    color: '#FFF3CD', min: 50, max: 60  },
      { label: 'Optimal', color: '#D4EDDA', min: 60, max: 100 },
    ]
  },
  glucose: {
    unit: 'mg/dL',
    markerColor: '#C0392B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 70,  max: 85  },
      { label: 'Good',    color: '#FFF3CD', min: 85,  max: 99  },
      { label: 'Watch',   color: '#FFE0B2', min: 99,  max: 125 },
      { label: 'High',    color: '#FFCDD2', min: 125, max: 200 },
    ]
  },
  lpA: {
    unit: 'nmol/L',
    markerColor: '#C0392B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,   max: 75  },
      { label: 'Watch',   color: '#FFE0B2', min: 75,  max: 125 },
      { label: 'High',    color: '#FFCDD2', min: 125, max: 250 },
    ]
  },
  triglycerides: {
    unit: 'mg/dL',
    markerColor: '#C0392B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,   max: 100 },
      { label: 'Good',    color: '#FFF3CD', min: 100, max: 150 },
      { label: 'Watch',   color: '#FFE0B2', min: 150, max: 200 },
      { label: 'High',    color: '#FFCDD2', min: 200, max: 500 },
    ]
  },
  eGFR: {
    unit: 'mL/min',
    markerColor: '#C0392B',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,   max: 60  },
      { label: 'Watch',   color: '#FFE0B2', min: 60,  max: 90  },
      { label: 'Good',    color: '#FFF3CD', min: 90,  max: 105 },
      { label: 'Optimal', color: '#D4EDDA', min: 105, max: 150 },
    ]
  },
  hemoglobin: {
    unit: 'g/dL',
    markerColor: '#C0392B',
    zones: [
      { label: 'Low',     color: '#FFCDD2', min: 0,    max: 12.0 },
      { label: 'Watch',   color: '#FFE0B2', min: 12.0, max: 13.5 },
      { label: 'Good',    color: '#FFF3CD', min: 13.5, max: 14.5 },
      { label: 'Optimal', color: '#D4EDDA', min: 14.5, max: 18.0 },
    ]
  },
  ldlHdlRatio: {
    unit: 'ratio',
    markerColor: '#C0392B',
    zones: [
      { label: 'Optimal', color: '#D4EDDA', min: 0,   max: 1.5 },
      { label: 'Good',    color: '#FFF3CD', min: 1.5, max: 2.0 },
      { label: 'Watch',   color: '#FFE0B2', min: 2.0, max: 3.0 },
      { label: 'High',    color: '#FFCDD2', min: 3.0, max: 5.0 },
    ]
  },
}

function RangeBar({ value, markerKey }: { value: number | null; markerKey: string }) {
  const config = BLOOD_ZONES[markerKey]
  if (!config || value === null || value === 0) return (
    <div style={{ height: '8px', background: 'var(--ink-08)', borderRadius: '4px', flex: 1 }} />
  )

  const zones = config.zones
  const totalMin = zones[0].min
  const totalMax = zones[zones.length - 1].max
  const totalRange = totalMax - totalMin
  const clampedValue = Math.max(totalMin, Math.min(totalMax, value))
  const markerPct = ((clampedValue - totalMin) / totalRange) * 100

  return (
    <div style={{ flex: 1 }}>
      <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '8px', display: 'flex', borderRadius: '4px', overflow: 'hidden', gap: '1px' }}>
          {zones.map((zone, i) => {
            const zonePct = ((zone.max - zone.min) / totalRange) * 100
            return (
              <div
                key={i}
                style={{
                  flex: `0 0 ${zonePct}%`,
                  background: zone.color,
                  borderRadius: i === 0 ? '4px 0 0 4px' : i === zones.length - 1 ? '0 4px 4px 0' : '0',
                }}
              />
            )
          })}
        </div>
        <div style={{
          position: 'absolute', top: '50%', left: `${markerPct}%`,
          transform: 'translate(-50%, -50%)',
          width: '12px', height: '12px', borderRadius: '50%',
          background: config.markerColor,
          border: '2px solid white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          zIndex: 2,
          pointerEvents: 'none',
        }} />
      </div>
      <div style={{ display: 'flex', marginTop: '2px', gap: '1px' }}>
        {zones.map((zone, i) => {
          const zonePct = ((zone.max - zone.min) / totalRange) * 100
          return (
            <div key={i} style={{
              flex: `0 0 ${zonePct}%`,
              fontSize: '9px', color: 'var(--ink-30)', textAlign: 'center' as const,
              letterSpacing: '0.04em', textTransform: 'uppercase' as const,
              overflow: 'hidden', whiteSpace: 'nowrap' as const,
              userSelect: 'none' as const,
            }}>
              {zone.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BloodMarkerRow({
  name, sub, value, unit, flag: f, zoneKey, mounted,
  infoKey, expandedKey, onInfoToggle, infoContent,
}: {
  name: string
  sub: string
  value: number | null
  unit: string
  flag: Flag
  zoneKey: string | null
  mounted: boolean
  infoKey?: string
  expandedKey?: string | null
  onInfoToggle?: (key: string) => void
  infoContent?: { explanation: string; source: string }
}) {
  const font = "var(--font-body, 'Instrument Sans', sans-serif)"
  const isNotTested = value === null || value === 0
  const effectiveFlag = isNotTested && f !== "pending" ? "not_tested" : f
  const fs = {
    good:       { bg: "#EAF3DE", text: "#2D6A4F",          label: "Good" },
    watch:      { bg: "#FEF3C7", text: "#92400E",          label: "Watch" },
    attention:  { bg: "#FEF0E6", text: "#C2510A",          label: "Attention" },
    elevated:   { bg: "#FEECEC", text: "#C0392B",          label: "Elevated" },
    pending:    { bg: "var(--warm-50)", text: "var(--ink-60)",  label: "Pending" },
    not_tested: { bg: "var(--warm-50)", text: "var(--ink-30)", label: "—" },
  }[effectiveFlag]
  const isExpanded = infoKey != null && expandedKey === infoKey

  return (
    <div>
      <div style={{ padding: "10px 0", borderBottom: isExpanded ? "none" : "0.5px solid var(--ink-06)", opacity: isNotTested ? 0.5 : 1 }}>
        {/* Top row: name + value + badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: zoneKey && !isNotTested ? 8 : 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <p style={{ fontFamily: font, fontSize: 13, color: "var(--ink)", margin: 0 }}>{name}</p>
              {infoContent && infoKey && (
                <button
                  onClick={(e) => { e.stopPropagation(); onInfoToggle?.(infoKey) }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: isExpanded ? "var(--ink-60)" : "var(--ink-20)",
                    fontSize: 13, padding: "0 2px", lineHeight: 1, flexShrink: 0,
                    transition: "color 0.15s ease",
                  }}
                >
                  ⓘ
                </button>
              )}
            </div>
            <p style={{ fontFamily: font, fontSize: 11, color: "var(--ink-60)", margin: "1px 0 0" }}>{sub}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isNotTested ? (
              <span style={{ fontFamily: font, fontSize: 11, color: "var(--ink-30)" }}>Not tested</span>
            ) : (
              <span style={{ fontFamily: font, fontSize: 13, color: "var(--ink)" }}>
                {value != null ? (Math.round((value as number) * 10) / 10) : "—"}{" "}
                <span style={{ fontSize: 10, color: "var(--ink-30)" }}>{unit}</span>
              </span>
            )}
            <span style={{
              fontFamily: font, fontSize: 9, textTransform: "uppercase" as const,
              letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 3,
              background: fs!.bg, color: fs!.text,
            }}>
              {fs!.label}
            </span>
          </div>
        </div>
        {/* Range bar — only when zone exists and has a value */}
        {zoneKey && !isNotTested && (
          <RangeBar value={value} markerKey={zoneKey} />
        )}
        {/* Simple grey bar for tested markers without a zone */}
        {!zoneKey && !isNotTested && mounted && (
          <div style={{ height: '3px', background: 'var(--blood-bg)', borderRadius: 2, marginTop: 4 }}>
            <div style={{ height: '100%', width: '100%', background: 'var(--blood-c)', borderRadius: 2, opacity: 0.4 }} />
          </div>
        )}
      </div>
      {isExpanded && infoContent && (
        <div style={{
          padding: "12px 14px",
          background: "var(--ink-04)",
          borderRadius: 8,
          borderLeft: "3px solid var(--blood-c)",
          borderBottom: "0.5px solid var(--ink-06)",
          marginBottom: 2,
        }}>
          <p style={{ fontFamily: font, fontSize: 13, color: "var(--ink-60)", lineHeight: 1.65, margin: "0 0 8px" }}>
            {infoContent.explanation}
          </p>
          <p style={{ fontFamily: font, fontSize: 11, color: "var(--ink-30)", fontStyle: "italic", margin: 0 }}>
            Source: {infoContent.source}
          </p>
        </div>
      )}
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
  sleepLifestyle:         { title: "Sleep + lifestyle combined effect", body: "Small improvements across sleep and lifestyle together reduce cardiovascular risk more efficiently than improving either alone.", panels: ["Sleep", "Lifestyle"] },
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
  const [learnOpen, setLearnOpen]     = useState(false)
  const [hoverLearn, setHoverLearn]   = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
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
      <p style={{ fontFamily: font, fontSize: 13, color: "var(--ink-60)", margin: "0 0 10px", lineHeight: 1.5 }}>
        {interaction.body}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={e => { e.stopPropagation(); setLearnOpen(o => !o) }}
          onMouseEnter={() => setHoverLearn(true)}
          onMouseLeave={() => setHoverLearn(false)}
          style={{
            fontFamily: font, fontSize: 11,
            color: hoverLearn ? "var(--ink-80)" : "var(--ink-40)",
            background: "none", border: "none", cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", gap: 5,
            transition: "color 0.15s ease",
          }}
        >
          <span style={{
            width: 14, height: 14, borderRadius: "50%",
            border: `0.5px solid ${hoverLearn ? "var(--ink-30)" : "var(--ink-20)"}`,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 12, lineHeight: 1,
            flexShrink: 0, transition: "border-color 0.15s ease",
          }}>
            {learnOpen ? "−" : "+"}
          </span>
          Learn more
        </button>
        {lm.citation && (
          <button
            onClick={e => { e.stopPropagation(); setSourcesOpen(o => !o) }}
            style={{
              fontFamily: font, fontSize: 11, color: "var(--ink-30)",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            Sources {sourcesOpen ? "↑" : "↓"}
          </button>
        )}
      </div>
      {lm.citation && (
        <div style={{
          maxHeight: sourcesOpen ? 100 : 0, overflow: "hidden",
          transition: "max-height 0.3s ease, opacity 0.3s ease",
          opacity: sourcesOpen ? 1 : 0,
        }}>
          <p style={{
            fontFamily: font, fontSize: 11, fontStyle: "italic",
            color: "var(--ink-30)", margin: "8px 0 0", lineHeight: 1.4,
          }}>
            {lm.citation}
          </p>
        </div>
      )}
      <div style={{
        maxHeight: learnOpen ? 900 : 0, overflow: "hidden",
        transition: "max-height 0.35s ease, opacity 0.35s ease", opacity: learnOpen ? 1 : 0,
      }}>
        <div style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--ink-30)", margin: "0 0 4px", fontWeight: 600 }}>
              The science
            </p>
            <p style={{ fontFamily: font, fontSize: 12, color: "var(--ink-60)", margin: 0, lineHeight: 1.6 }}>
              {lm.science}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--ink-30)", margin: "0 0 4px", fontWeight: 600 }}>
              What this means for you
            </p>
            <p style={{ fontFamily: font, fontSize: 12, color: "var(--ink-60)", margin: 0, lineHeight: 1.6 }}>
              {lm.meaning}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--ink-30)", margin: "0 0 6px", fontWeight: 600 }}>
              What you can do
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {lm.actions.map((action, i) => (
                <li key={i} style={{ fontFamily: font, fontSize: 12, color: "var(--ink-60)", lineHeight: 1.5 }}>
                  {action}
                </li>
              ))}
            </ol>
          </div>
          <p style={{ fontFamily: font, fontSize: 11, fontStyle: "italic", color: "var(--ink-30)", margin: 0, lineHeight: 1.4 }}>
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
  lifestyleActive = false,
  oralData,
  bloodData,
  sleepData,
  lifestyleData,
  fadeUpFn,
  modifiers_applied,
  modifier_total,
}: {
  oralKitStatus?: "none" | "ordered" | "complete"
  interactionsFired?: string[]
  oralActive?: boolean
  lifestyleActive?: boolean
  oralData?: ScoreWheelProps["oralData"]
  bloodData?: ScoreWheelProps["bloodData"]
  sleepData?: ScoreWheelProps["sleepData"]
  lifestyleData?: ScoreWheelProps["lifestyleData"]
  fadeUpFn: (d: string) => React.CSSProperties
  modifiers_applied?: ScoreWheelProps["modifiers_applied"]
  modifier_total?: number
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
        body: "Elevated periodontal bacteria alongside elevated cardiovascular markers is a signal worth watching — research suggests these pathways are connected.",
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

  // ── Sleep + Blood interactions (don't require oral data) ─────────────────
  if (!oralActive && bloodData && sleepData) {
    if (bloodData.hsCRP > 1.0 &&
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

  // Oral + Lifestyle fermented foods interactions
  const lowFermented = !lifestyleData?.fermentedFoods || lifestyleData.fermentedFoods === "rarely"
  if (oralActive && oralData && lifestyleActive && lifestyleData) {
    // oral-lifestyle-fermented: low D4 protective bacteria + low fermented food intake
    if (oralData.osaTaxaPct < 3 && lowFermented) {
      computed.push({
        key: "oralLifestyleFermented",
        title: "Low protective bacteria — diet may help",
        body: "Your protective oral bacteria are depleted. Lactobacillus, S. salivarius, and Bifidobacterium — the bacteria that support oral health — are directly enriched by fermented food consumption. Adding yogurt, kefir, or kimchi 3–5 times per week may improve this score at your next test.",
        panels: ["Oral", "Lifestyle"],
        severity: "medium",
        learnMore: {
          science: "A 17-week randomized trial found that high-fermented food diets increased microbiome diversity and reduced 19 inflammatory proteins including IL-6 and IL-12p70. The effect was dose-dependent and detectable within 4 weeks (Wastyk et al., Cell 2021, n=36).",
          meaning: `Your D4 protective bacteria score is ${oralData.osaTaxaPct.toFixed(1)}% — below the 3% threshold. Low protective bacteria abundance is associated with reduced oral immune defence and higher pathogen colonisation risk.`,
          actions: [
            "Add 1–2 servings of fermented foods daily: yogurt, kefir, kimchi, sauerkraut, miso, or kombucha",
            "Avoid antiseptic mouthwash — it kills beneficial bacteria alongside pathogens",
            "Retest oral microbiome in 90 days after dietary changes",
          ],
          citation: "Wastyk et al., Cell 2021. n=36, 17-week randomised trial. High-fermented food diet vs. high-fibre diet.",
        },
      })
    }
    // oral-lifestyle-mouthwash-fermented: low D2 nitrate reducers + antiseptic mouthwash + low fermented foods
    const usesAntiseptic = lifestyleData.mouthwashType === "alcohol" || lifestyleData.mouthwashType === "antiseptic"
    if (oralData.nitrateReducersPct < 2 && usesAntiseptic && lowFermented) {
      computed.push({
        key: "oralLifestyleMouthwashFermented",
        title: "Three factors depleting your oral microbiome",
        body: "Antiseptic mouthwash, low fermented food intake, and depleted nitrate-reducing bacteria are compounding. Switching to fluoride mouthwash and adding fermented foods addresses two of these simultaneously — and both changes are visible at your next microbiome test in 90 days.",
        panels: ["Oral", "Lifestyle"],
        severity: "high",
        learnMore: {
          science: "Antiseptic mouthwash eliminates nitrate-reducing bacteria within days, raising systolic blood pressure by 2–3.5 mmHg (SOALS 2020). Fermented food consumption rebuilds commensal populations and increases microbiome diversity independently of antibiotic exposure (Wastyk et al., Cell 2021).",
          meaning: `Your nitrate-reducing bacteria are at ${oralData.nitrateReducersPct.toFixed(1)}% — well below the 2% minimum. Combined with antiseptic mouthwash use and low fermented food intake, your oral microbiome is facing three simultaneous depletion pressures.`,
          actions: [
            "Switch from antiseptic to fluoride or natural mouthwash immediately — the effect on bacteria is reversible within 2–4 weeks",
            "Add fermented foods 3–5× per week: yogurt, kefir, kimchi, sauerkraut, or kombucha",
            "Increase dietary nitrates: beetroot, arugula, spinach, celery to support NO pathway recovery",
            "Retest oral microbiome in 90 days",
          ],
          citation: "Tribble et al., SOALS 2020 (mouthwash & BP); Wastyk et al., Cell 2021 (fermented foods & microbiome diversity).",
        },
      })
    }
  }

  const hasComputed = computed.length > 0
  const fired = interactionsFired.filter(k => INSIGHT_COPY[k])

  const hasPanelData = oralActive || (bloodData && sleepData)
  const hasModifiers = modifiers_applied && modifiers_applied.length > 0

  const VALID_PANELS = new Set(["sleep", "blood", "oral"])

  return (
    <div style={fadeUpFn("0.10s")}>
      <style>{`@keyframes cpPulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>

      {/* ── Modifier signals card (from score engine) ─────────────────────── */}
      {hasModifiers && (
        <div style={{
          background: "var(--ink-04, rgba(20,20,16,0.04))",
          border: "0.5px solid var(--ink-08, rgba(20,20,16,0.08))",
          borderRadius: 10,
          padding: "24px 28px",
          marginBottom: 24,
        }}>
          <p style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 10, fontWeight: 500,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--ink-30, rgba(20,20,16,0.30))",
            margin: "0 0 20px",
          }}>
            Cross-Panel Signals
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {modifiers_applied.map((m, i) => {
              const accentColor = m.direction === "bonus"
                ? "#2D6A4F"
                : (m.panels?.includes("blood") ? "#C0392B" : m.panels?.includes("oral") ? "#2D6A4F" : "#4A7FB5")
              const pointColor = m.direction === "bonus" ? "#2D6A4F" : "#C0392B"
              return (
                <div key={m.id}>
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    padding: "16px 0",
                    borderLeft: `3px solid ${accentColor}`,
                    paddingLeft: 20,
                  }}>
                    <span style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 20, fontWeight: 400, lineHeight: 1,
                      color: pointColor,
                      minWidth: 32,
                      flexShrink: 0,
                    }}>
                      {m.direction === "bonus" ? "+" : "−"}{m.points}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: 17, fontWeight: 400, lineHeight: 1.35,
                        color: "var(--ink, #141410)",
                        margin: "0 0 4px",
                      }}>
                        {m.label}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                        fontSize: 12, lineHeight: 1.5,
                        color: "var(--ink-40, rgba(20,20,16,0.40))",
                        margin: 0,
                      }}>
                        {m.rationale}
                      </p>
                      {m.panels && m.panels.length > 0 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          {m.panels.map(p => (
                            VALID_PANELS.has(p)
                              ? <PanelChip key={p} panel={p as Panel} />
                              : <span key={p} style={{
                                  fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                                  fontSize: 10, fontWeight: 500,
                                  textTransform: "uppercase", letterSpacing: "0.06em",
                                  color: "var(--ink-40)",
                                  background: "var(--ink-04)",
                                  padding: "2px 7px", borderRadius: 3,
                                }}>
                                  {p}
                                </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {i < modifiers_applied.length - 1 && (
                    <div style={{
                      height: 0.5,
                      background: "var(--ink-08, rgba(20,20,16,0.08))",
                      marginLeft: 23,
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Net total */}
          <div style={{
            marginTop: 16, paddingTop: 12,
            borderTop: "0.5px solid var(--ink-08, rgba(20,20,16,0.08))",
          }}>
            <p style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 11, color: "var(--ink-30, rgba(20,20,16,0.30))",
              letterSpacing: "0.04em", margin: 0,
            }}>
              Net effect: <span style={{
                color: (modifier_total ?? 0) < 0 ? "#C0392B" : "#2D6A4F",
                fontWeight: 500,
              }}>
                {(modifier_total ?? 0) > 0 ? "+" : ""}{modifier_total} pts
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── No modifiers — clean fallback ─────────────────────────────────── */}
      {!hasModifiers && hasPanelData && (
        <div style={{
          background: "var(--ink-04, rgba(20,20,16,0.04))",
          border: "0.5px solid var(--ink-08, rgba(20,20,16,0.08))",
          borderRadius: 10,
          padding: "20px 24px",
          marginBottom: 24,
        }}>
          <p style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 10, fontWeight: 500,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--ink-30, rgba(20,20,16,0.30))",
            margin: "0 0 10px",
          }}>
            Cross-Panel Signals
          </p>
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic", fontSize: 17, lineHeight: 1.4,
            color: "var(--ink-40, rgba(20,20,16,0.40))",
            margin: 0,
          }}>
            Your panels show no compounding risk signals. Check back as your data updates.
          </p>
        </div>
      )}

      {/* ── Computed interactions (detailed client-side analysis) ────────── */}
      {hasComputed && (
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
              Detailed Patterns
            </span>
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
        </div>
      )}

      {/* Kit status cards (no oral data yet) */}
      {!hasModifiers && !hasPanelData && oralKitStatus === "none" && (
        <div style={{
          background: "var(--ink-04, rgba(20,20,16,0.04))",
          border: "0.5px solid var(--ink-08, rgba(20,20,16,0.08))",
          borderRadius: 10, padding: "20px 24px", marginBottom: 24,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 17, color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.3 }}>
              Your cross-panel intelligence is waiting.
            </p>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink-60)", margin: 0, lineHeight: 1.5 }}>
              The oral microbiome is the missing piece.
            </p>
          </div>
          <a href="/shop" style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.06em", textTransform: "uppercase",
            border: "1px solid var(--ink-20)", color: "var(--ink-60)", background: "transparent",
            padding: "8px 16px", borderRadius: 4, textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Order oral kit
          </a>
        </div>
      )}
      {!hasModifiers && !hasPanelData && oralKitStatus === "ordered" && (
        <div style={{
          background: "var(--ink-04, rgba(20,20,16,0.04))",
          border: "0.5px solid var(--ink-08, rgba(20,20,16,0.08))",
          borderRadius: 10, padding: "20px 24px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#9A7200", flexShrink: 0, animation: "cpPulse 2s infinite", display: "inline-block" }} />
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 17, color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.3 }}>
              Your sample is on its way.
            </p>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink-60)", margin: 0, lineHeight: 1.5 }}>
              Results arrive in 10–14 days. Cross-panel insights unlock then.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export interface CollapsiblePanelHandle {
  scrollAndOpen: () => void
}

const CollapsiblePanel = React.forwardRef<CollapsiblePanelHandle, {
  title: string; score?: number; maxScore?: number; subtitle?: string
  statusDots?: Flag[]; defaultOpen: boolean; delay: string
  fadeUpFn: (d: string) => React.CSSProperties; headerExtra?: React.ReactNode; children: React.ReactNode
}>(function CollapsiblePanel(
  { title, score, maxScore, subtitle, statusDots, defaultOpen, delay, fadeUpFn, headerExtra, children },
  ref
) {
  const [open, setOpen] = useState(defaultOpen)
  const [hoverToggle, setHoverToggle] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    scrollAndOpen() {
      setOpen(true)
      setTimeout(() => {
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 50)
    },
  }))

  return (
    <div ref={rootRef} style={fadeUpFn(delay)}>
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
              border: `0.5px solid ${hoverToggle ? "var(--gold)" : "var(--ink-20)"}`,
              color: hoverToggle ? "var(--gold)" : "var(--ink-60)",
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
})

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
    attention:  { bg: "#FEF0E6", text: "#C2510A",              label: "Attention"    },
    elevated:   { bg: "#FEECEC", text: "#C0392B",              label: "Elevated"     },
    not_tested: { bg: "var(--warm-50)", text: "var(--ink-40)",   label: "Not detected" },
    pending:    { bg: "var(--warm-50)", text: "var(--ink-60)",   label: "—"            },
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
          <p style={{ margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13, fontStyle: "italic", color: notDetected ? "var(--ink-30)" : "var(--ink)", lineHeight: 1.3 }}>
            {name}
          </p>
          <p style={{ margin: "2px 0 0", fontFamily: font, fontSize: 11, color: "var(--ink-60)", lineHeight: 1.3 }}>
            {role}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {notDetected ? (
            <p style={{ margin: 0, fontFamily: font, fontSize: 11, fontStyle: "italic", color: "var(--ink-30)" }}>Not detected</p>
          ) : (
            <p style={{ margin: 0, fontFamily: font, fontSize: 13, color: valueColor }}>
              {val < 0.01 ? "<0.01" : val.toFixed(2)}%
            </p>
          )}
          <p style={{ margin: "1px 0 0", fontFamily: font, fontSize: 10, color: "var(--ink-30)" }}>{target}</p>
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
        <p style={{ margin: "5px 0 6px", fontFamily: font, fontSize: 11, color: "var(--ink-40)", fontStyle: "italic", lineHeight: 1.4 }}>
          {note}
        </p>
      )}
      <button
        onClick={e => { e.stopPropagation(); setExpanded(o => !o) }}
        style={{
          marginTop: 4, fontFamily: font, fontSize: 10, color: "var(--ink-30)",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <span style={{
          width: 12, height: 12, borderRadius: "50%", border: "0.5px solid var(--ink-20)",
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
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--ink-30)", margin: "0 0 3px", fontWeight: 600 }}>What it does</p>
            <p style={{ fontFamily: font, fontSize: 12, color: "var(--ink-60)", margin: 0, lineHeight: 1.5 }}>{learnWhat}</p>
          </div>
          <div>
            <p style={{ fontFamily: font, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--ink-30)", margin: "0 0 3px", fontWeight: 600 }}>Why it matters</p>
            <p style={{ fontFamily: font, fontSize: 12, color: "var(--ink-60)", margin: 0, lineHeight: 1.5 }}>{learnWhy}</p>
          </div>
          <p style={{ fontFamily: font, fontSize: 11, fontStyle: "italic", color: "var(--ink-30)", margin: 0, lineHeight: 1.4 }}>{learnCitation}</p>
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
            <p style={{ margin: "2px 0 0", fontFamily: font, fontSize: 11, color: "var(--ink-40)" }}>
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
          <OralSpeciesRow name="Porphyromonas gingivalis" role="Keystone periodontal pathogen — systemic inflammation" val={sp("Porphyromonas gingivalis")} target="<0.1% reads" isPathogen={true} note="Found in coronary artery plaques in autopsy studies; manipulates host immune response" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="A low-abundance keystone pathogen that dysregulates the host immune response out of proportion to its numbers, enabling growth of the broader pathogenic community." learnWhy="Identified in coronary artery plaques in autopsy studies. Associated with elevated hsCRP and cardiovascular events independent of traditional risk factors." learnCitation="Hussain et al., Frontiers in Immunology, 2023. n=1,791. Cardiovascular meta-analysis." />
          <OralSpeciesRow name="Treponema denticola" role="Red complex pathogen — periodontal disease and systemic inflammation" val={sp("Treponema denticola")} target="<0.1% reads" isPathogen={true} note="Part of the red complex; produces proteases that can enter circulation" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="Part of the 'red complex' — the most pathogenic bacterial consortium in periodontal disease. Produces enzymes that destroy connective tissue and evade immune defenses." learnWhy="Associated with elevated systemic inflammation and periodontal disease severity. Gingipain proteases from this organism can enter the bloodstream through inflamed gum tissue." learnCitation="Socransky et al., Journal of Clinical Periodontology, 1998. Red complex classification." />
          <OralSpeciesRow name="Tannerella forsythia" role="Red complex pathogen — bone resorption" val={sp("Tannerella forsythia")} target="<0.1% reads" isPathogen={true} note="Synergizes with P. gingivalis and T. denticola to accelerate periodontal bone loss" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="The third member of the red complex. Produces surface proteins that inhibit apoptosis of infected cells, allowing persistent infection and tissue destruction." learnWhy="A reliable diagnostic marker for severe chronic periodontitis. Its abundance correlates with probing depth and clinical attachment loss." learnCitation="Socransky et al., Journal of Clinical Periodontology, 1998. Original red complex classification." />
          <OralSpeciesRow name="Prevotella intermedia" role="Hormone-responsive periodontopathogen — gingival inflammation" val={sp("Prevotella intermedia")} target="<0.5% reads" isPathogen={true} note="Uses progesterone and estrogen as growth factors — elevated during hormonal fluctuations" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="A gram-negative anaerobe that can substitute sex hormones (progesterone, estradiol) for vitamin K as growth factors, making it highly active during hormonal fluctuations." learnWhy="Elevated during pregnancy, puberty, and oral contraceptive use. Associated with systemic inflammation and elevated periodontal disease severity." learnCitation="Kornman & Loesche, Journal of Periodontal Research, 1980. Hormonal effects on oral microbiome." />
          <OralSpeciesRow name="Fusobacterium nucleatum" role="Periodontal disease and systemic inflammation bridge organism" val={sp("Fusobacterium nucleatum")} target="<0.5% reads" isPathogen={true} note="Bridges the oral cavity to other body sites; associated with periodontal disease and elevated systemic inflammation when elevated" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="An opportunistic pathogen that invades vascular endothelium and can translocate from the oral cavity to other body compartments. A consistent marker of oral dysbiosis." learnWhy="Associated with periodontal disease and elevated systemic inflammation. Its abundance is a reliable indicator of oral microbiome imbalance." learnCitation="Hajishengallis G. Nature Reviews Immunology. 2015. Oral dysbiosis and systemic disease." />
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

        {/* SECTION 5: SYSTEMIC INFLAMMATION MARKERS */}
        <OralSection title="Systemic Inflammation Markers">
          <OralSpeciesRow name="Fusobacterium nucleatum" role="Periodontal disease and systemic inflammation bridge organism" val={sp("Fusobacterium nucleatum")} target="<0.5% reads" isPathogen={true} note="Bridges the oral cavity to other body sites; a reliable marker of oral-systemic inflammation" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="An opportunistic pathogen that invades vascular endothelium and can translocate from the oral cavity to other body compartments." learnWhy="Associated with periodontal disease and elevated systemic inflammation. Its abundance is a reliable indicator of oral microbiome imbalance when elevated." learnCitation="Hajishengallis G. Nature Reviews Immunology. 2015. Oral dysbiosis and systemic disease." />
          <OralSpeciesRow name="Treponema denticola" role="Red complex pathogen — periodontal disease and systemic inflammation" val={sp("Treponema denticola")} target="<0.1% reads" isPathogen={true} note="Part of the red complex; produces proteases associated with elevated systemic inflammation" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="Produces gingipain proteases that degrade host proteins and can enter the bloodstream. Part of the red complex — the most pathogenic periodontal bacterial consortium." learnWhy="Associated with elevated systemic inflammation and periodontal disease severity. Gingipain proteases from this organism can enter the bloodstream through inflamed gum tissue." learnCitation="Socransky et al., Journal of Clinical Periodontology, 1998. Red complex classification." />
          <OralSpeciesRow name="Porphyromonas gingivalis" role="Inflammatory periodontal pathogen associated with poor gum health and systemic inflammation" val={sp("Porphyromonas gingivalis")} target="<0.1% reads" isPathogen={true} note="Found in coronary artery plaques in autopsy studies; independently predicts elevated hsCRP" flagFn={v => flag(v < 0.1, v < 0.5)} learnWhat="Produces gingipain proteases that cleave complement factors and evade immune destruction. Induces chronic systemic inflammation at levels disproportionate to its oral abundance." learnWhy="Found in coronary artery plaques in autopsy studies. A 2023 meta-analysis of 1,791 patients found P. gingivalis burden independently predicted major adverse cardiovascular events." learnCitation="Hussain et al., Frontiers in Immunology, 2023. n=1,791 meta-analysis, MACE prediction." />
          <OralSpeciesRow name="Prevotella intermedia" role="Hormone-responsive periodontopathogen — gingival inflammation" val={sp("Prevotella intermedia")} target="<0.5% reads" isPathogen={true} note="Uses estrogen and progesterone as growth substrates — disproportionately elevated during hormonal fluctuations" flagFn={v => flag(v < 0.5, v < 1.5)} learnWhat="Uniquely able to substitute sex hormones for vitamin K as essential growth factors, giving it a selective advantage during hormonal changes." learnWhy="Associated with elevated periodontal disease severity and systemic inflammation. Elevated during pregnancy, puberty, and oral contraceptive use." learnCitation="Kornman & Loesche, Journal of Periodontal Research, 1980. Hormonal effects on oral microbiome." />
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
          <OralSpeciesRow name="Fusobacterium spp." role="Aggregate Fusobacterium — periodontal disease and systemic inflammation" val={sp("Fusobacterium spp.")} target="<1% reads" isPathogen={true} note="Total Fusobacterium genus; includes F. nucleatum, F. periodonticum, and other species" flagFn={v => flag(v < 1, v < 3)} learnWhat="The Fusobacterium genus contains multiple species with invasive and pro-inflammatory properties. They produce butyrate and other metabolites that can modulate host immunity." learnWhy="Elevated total Fusobacterium abundance is associated with periodontal disease, OSA, and elevated systemic inflammation. A reliable marker of oral dysbiosis." learnCitation="Hajishengallis G. Nature Reviews Immunology. 2015. Oral dysbiosis and systemic inflammation." />
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
            <p style={{ margin: "10px 0 0", fontFamily: font, fontSize: 12, color: "var(--ink-60)", lineHeight: 1.6 }}>
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
            border: `0.5px solid ${hov ? "var(--gold)" : "var(--ink-20)"}`,
            color: hov ? "var(--gold)" : "var(--ink-60)",
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
  score, breakdown, sleepConnected, isSyncing, wearableProvider, labFreshness, oralActive,
  sleepData, bloodData, oralData, lifestyleData, interactionsFired,
  lastSyncAt, lastSyncRequestedAt,
  peaqPercent, peaqPercentLabel, lpaFlag, hsCRPRetestFlag, additionalMarkers,
  labLockExpiresAt, oralOrdered, sleepNightsAvailable, oralKitStatus, whoopData,
  modifiers_applied, modifier_total,
}: ScoreWheelProps) {
  const [mounted, setMounted] = useState(false)
  const [hoveredRing, setHoveredRing] = useState<string | null>(null)
  const [scorePulse, setScorePulse] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [displaySleep, setDisplaySleep] = useState(0)
  const [displayBlood, setDisplayBlood] = useState(0)
  const [displayOral, setDisplayOral] = useState(0)
  const [openMissingTooltip, setOpenMissingTooltip] = useState<string | null>(null)
  const [_showModifiers] = useState<string | null>(null) // reserved
  const [expandedSleepMetric, setExpandedSleepMetric] = useState<string | null>(null)
  const [showUntested, setShowUntested] = useState(false)
  const [expandedBloodMetric, setExpandedBloodMetric] = useState<string | null>(null)
  const [expandedOralMetric, setExpandedOralMetric] = useState<string | null>(null)
  const [sleepHidden, setSleepHidden] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const sleepPanelRef    = useRef<CollapsiblePanelHandle>(null)
  const bloodPanelRef    = useRef<CollapsiblePanelHandle>(null)
  const oralPanelRef     = useRef<CollapsiblePanelHandle>(null)
  const crossPanelRef    = useRef<HTMLDivElement>(null)

  function handlePeakClick(key: string) {
    if (key === "cross-panel") {
      crossPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    const map: Record<string, React.RefObject<CollapsiblePanelHandle | null>> = {
      sleep: sleepPanelRef, blood: bloodPanelRef, oral: oralPanelRef,
    }
    map[key]?.current?.scrollAndOpen()
  }

  const visualScore = sleepHidden ? Math.max(0, score - breakdown.sleepSub) : score
  useCountUp(visualScore, 1400, 200, setDisplayScore)
  useCountUp(breakdown.sleepSub, 900, 350, setDisplaySleep)
  useCountUp(breakdown.bloodSub, 900, 450, setDisplayBlood)
  useCountUp(breakdown.oralSub, 900, 550, setDisplayOral)

  useEffect(() => {
    setMounted(true)
    // Score pulse after count-up finishes
    const t = setTimeout(() => {
      setScorePulse(true)
      setTimeout(() => setScorePulse(false), 400)
    }, 1800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('peaq-sleep-panel-hidden')
    if (stored === 'true') setSleepHidden(true)
  }, [])

  const hasBlood = labFreshness !== "none" && labFreshness !== "expired"
  const bloodLocked = !hasBlood


  const subline = "Your score is entirely based on measured data."

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
    spo2Avg:    sleepData.spo2Avg === 0 ? "not_tested" as Flag
                  : sleepData.spo2Avg >= 96 ? "good" as Flag
                  : sleepData.spo2Avg >= 95 ? "watch" as Flag
                  : sleepData.spo2Avg >= 93 ? "attention" as Flag
                  : "elevated" as Flag,
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
    lpa:       bflag(bloodData.lpa, bloodData.lpa < 75, bloodData.lpa < 125),
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

  const SLEEP_INFO: Record<string, { explanation: string; source: string }> = {
    deep: {
      explanation: "Deep sleep (slow-wave sleep) is when your body does its most important physical repair — releasing growth hormone, consolidating memories, and clearing metabolic waste from the brain via the glymphatic system. Low deep sleep is associated with impaired immune function and cognitive decline over time.",
      source: "Walker, M. (2017). Why We Sleep. Xander Dumas et al., Nature Communications (2020) — glymphatic clearance during NREM sleep.",
    },
    hrv: {
      explanation: "Heart rate variability measures variation in time between heartbeats — a proxy for how well your autonomic nervous system is balancing stress and recovery. Higher HRV generally reflects better cardiovascular fitness, lower inflammation, and greater resilience. HRV declines naturally with age, so Peaq uses age-adjusted targets.",
      source: "Shaffer & Ginsberg (2017). Frontiers in Public Health — An Overview of Heart Rate Variability Metrics and Norms.",
    },
    spo2Avg: {
      explanation: "Blood oxygen saturation during sleep reflects how well your lungs and cardiovascular system deliver oxygen at rest. Repeated dips below 94% may indicate sleep-disordered breathing, which is associated with elevated blood pressure, cognitive impairment, and increased cardiovascular risk.",
      source: "American Academy of Sleep Medicine (AASM) — Clinical guidelines for sleep-related breathing disorders, 2023.",
    },
    rem: {
      explanation: "REM sleep is when your brain processes emotional experiences and consolidates procedural memory. Adequate REM supports emotional regulation, creativity, and resilience. REM is suppressed by alcohol, some medications, and sleep fragmentation.",
      source: "Stickgold, R. (2005). Sleep-dependent memory consolidation. Nature. Carskadon & Dement, Principles and Practice of Sleep Medicine.",
    },
    efficiency: {
      explanation: "Sleep efficiency is the percentage of time in bed that you are actually asleep. High efficiency (≥85%) means you fall asleep quickly and stay asleep. Low efficiency can reflect anxiety, pain, sleep apnea, or poor sleep hygiene — and is the primary target in cognitive behavioral therapy for insomnia (CBT-I).",
      source: "Buysse et al. (1989). Pittsburgh Sleep Quality Index. Morin et al. — CBT-I meta-analysis, Journal of Consulting and Clinical Psychology (2006).",
    },
  }

  const BLOOD_INFO: Record<string, { explanation: string; source: string }> = {
    hsCRP: {
      explanation: 'High-sensitivity C-reactive protein is produced by the liver in response to inflammation. Elevated hsCRP is one of the strongest independent predictors of cardiovascular events — more predictive than LDL cholesterol alone. Chronic low-grade inflammation, often driven by factors like periodontal disease, visceral fat, or poor sleep, can keep hsCRP persistently elevated.',
      source: 'Ridker PM (2003). Clinical application of C-reactive protein for cardiovascular disease detection and prevention. Circulation. Hansson GK (2005). Inflammation, atherosclerosis, and coronary artery disease. NEJM.'
    },
    LDL: {
      explanation: 'Low-density lipoprotein carries cholesterol to tissues and is the primary driver of atherosclerotic plaque formation. Lower is better — optimal is below 70 mg/dL for most adults. LDL alone is less predictive than ApoB or LDL particle number, but remains a key cardiovascular risk marker.',
      source: 'Grundy SM et al. (2018). AHA/ACC Guideline on Management of Blood Cholesterol. Journal of the American College of Cardiology.'
    },
    HDL: {
      explanation: 'High-density lipoprotein removes cholesterol from arterial walls and transports it to the liver for disposal — a process called reverse cholesterol transport. Higher HDL is generally protective, though very high levels (above 80 mg/dL) may paradoxically increase risk in some populations.',
      source: 'Barter P et al. (2007). HDL cholesterol, very low levels of LDL cholesterol, and cardiovascular events. NEJM.'
    },
    lpA: {
      explanation: "Lipoprotein(a) is a genetically determined lipoprotein that promotes both atherosclerosis and thrombosis. It is largely unaffected by diet or lifestyle — elevated Lp(a) is primarily inherited. Above 125 nmol/L significantly increases cardiovascular risk independent of LDL. It's one of the most underdiagnosed cardiovascular risk factors.",
      source: 'Tsimikas S (2017). A test in context: Lipoprotein(a). Journal of the American College of Cardiology. Kronenberg F (2022). Lipoprotein(a) — the strangest lipoprotein species. European Heart Journal.'
    },
    triglycerides: {
      explanation: 'Triglycerides are the main form of fat stored in the body. Elevated triglycerides often reflect excess carbohydrate intake, insulin resistance, or poor metabolic health. They are a key component of the metabolic syndrome picture alongside low HDL and elevated glucose.',
      source: 'Miller M et al. (2011). Triglycerides and cardiovascular disease: A scientific statement from the AHA. Circulation.'
    },
    glucose: {
      explanation: 'Fasting glucose reflects how well your body regulates blood sugar. Values above 100 mg/dL suggest early insulin resistance. Optimal fasting glucose (70–85 mg/dL) is associated with the lowest cardiovascular and metabolic risk. Glucose trends over time are more informative than a single reading.',
      source: 'American Diabetes Association (2023). Standards of Medical Care in Diabetes. Diabetes Care.'
    },
    apoB: {
      explanation: 'Apolipoprotein B is a protein found on every atherogenic lipoprotein particle — LDL, VLDL, and Lp(a). ApoB measures the total number of dangerous particles rather than just their cholesterol content, making it a more accurate predictor of cardiovascular risk than LDL-C alone.',
      source: 'Sniderman AD et al. (2019). ApoB versus non-HDL-C and LDL-C as indices of cardiovascular disease risk. Journal of the American Heart Association.'
    },
    eGFR: {
      explanation: 'Estimated glomerular filtration rate measures how well your kidneys are filtering blood. Values above 90 mL/min are normal. Declining eGFR can indicate early kidney disease, which is closely linked to hypertension, diabetes, and cardiovascular risk.',
      source: 'Levey AS et al. (2009). New equation to estimate GFR. Annals of Internal Medicine. KDIGO Clinical Practice Guideline for CKD.'
    },
    hemoglobin: {
      explanation: 'Hemoglobin carries oxygen in red blood cells. Low hemoglobin (anemia) reduces oxygen delivery to tissues and can cause fatigue, impaired cognitive function, and increased cardiovascular strain. Optimal hemoglobin supports athletic performance and metabolic health.',
      source: 'WHO (2011). Haemoglobin concentrations for the diagnosis of anaemia. Vitamin and Mineral Nutrition Information System.'
    },
    hbA1c: {
      explanation: 'HbA1c reflects average blood glucose over the past 2–3 months by measuring glycated hemoglobin. It is the gold standard for diagnosing and monitoring diabetes. Values below 5.4% indicate optimal glycemic control. Even values in the pre-diabetic range (5.7–6.4%) significantly increase cardiovascular and metabolic risk.',
      source: 'American Diabetes Association (2023). Standards of Medical Care in Diabetes. Nathan DM et al. (2009). Translating the A1C assay into estimated average glucose values. Diabetes Care.'
    },
    vitaminD: {
      explanation: 'Vitamin D functions as a hormone affecting immune regulation, cardiovascular health, bone density, and mood. Deficiency (below 20 ng/mL) is extremely common and linked to increased risk of autoimmune conditions, depression, and cardiovascular disease. Optimal levels (40–60 ng/mL) are associated with the best health outcomes.',
      source: 'Holick MF (2007). Vitamin D deficiency. NEJM. Pilz S et al. (2016). Vitamin D and cardiovascular disease prevention. Nature Reviews Cardiology.'
    },
  }

  const ORAL_INFO: Record<string, { explanation: string; source: string }> = {
    shannon: {
      explanation: 'Shannon diversity index measures both the number of bacterial species present and how evenly distributed they are. Higher diversity (above 3.0) generally indicates a resilient, balanced oral microbiome. Low diversity is associated with periodontal disease, systemic inflammation, and reduced nitric oxide production.',
      source: 'Hajishengallis G & Lamont RJ (2012). Beyond the red complex — the oral microbiota and dysbiosis. Molecular Oral Microbiology. Lloyd-Price J et al. (2017). Strains, functions and dynamics in the expanded Human Microbiome Project. Nature.'
    },
    nitrate: {
      explanation: 'Nitrate-reducing bacteria (Neisseria, Rothia, Veillonella) convert dietary nitrate from vegetables into nitrite, which is then converted to nitric oxide — a molecule critical for blood vessel dilation, blood pressure regulation, and cardiovascular health. Low nitrate reducers are associated with reduced NO bioavailability and elevated blood pressure.',
      source: 'Lundberg JO et al. (2008). The nitrate-nitrite-nitric oxide pathway in physiology and therapeutics. Nature Reviews Drug Discovery. Vanhatalo A et al. (2018). Nitrate-responsive oral microbiome modulates nitric oxide homeostasis. Free Radical Biology and Medicine.'
    },
    periodontal: {
      explanation: 'Periodontal burden measures the combined abundance of bacteria known to drive gum disease and systemic inflammation. P. gingivalis, T. denticola, and T. forsythia (the "red complex") are the most virulent — they produce enzymes that degrade tissue, evade immune responses, and enter the bloodstream where they contribute to arterial inflammation.',
      source: 'Socransky SS et al. (1998). Microbial complexes in subgingival plaque. Journal of Clinical Periodontology. Hajishengallis G (2015). Periodontitis: from microbial immune subversion to systemic inflammation. Nature Reviews Immunology.'
    },
  }

  const exerciseLabel: Record<string, string> = { active: "Active (4+ days/wk)", moderate: "Moderate (2–3 days/wk)", light: "Light (1 day/wk)", sedentary: "Sedentary" }

  const sleepToggle = sleepConnected ? (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--ink-30)' }}
      onClick={e => e.stopPropagation()}
    >
      <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)" }}>Sleep panel</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setSleepHidden(o => {
            const next = !o
            localStorage.setItem('peaq-sleep-panel-hidden', next ? 'true' : 'false')
            setToastVisible(true)
            setTimeout(() => setToastVisible(false), 3000)
            return next
          })
        }}
        style={{
          width: '32px', height: '18px', borderRadius: '9px',
          background: sleepHidden ? 'var(--ink-12)' : '#4A7FB5',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s ease', flexShrink: 0,
          padding: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: '2px',
          left: sleepHidden ? '2px' : '14px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: 'white', transition: 'left 0.2s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }} />
      </button>
    </div>
  ) : null

  type BloodMarkerDef = {
    name: string
    sub: string
    value: number
    unit: string
    flag: Flag
    zoneKey: string | null
    infoKey: string | null
  }
  const bloodMarkerDefs: BloodMarkerDef[] = bloodData ? [
    { name: "hs-CRP",        sub: "High-sensitivity · target <0.5",    value: bloodData.hsCRP,         unit: "mg/L",  flag: bflag(bloodData.hsCRP, bloodData.hsCRP < 0.5, bloodData.hsCRP < 2.0),                                          zoneKey: "hsCRP",        infoKey: "hsCRP" },
    { name: "Lp(a)",         sub: "Lipoprotein(a) · target <75",       value: bloodData.lpa,           unit: "nmol/L", flag: bflag(bloodData.lpa, bloodData.lpa < 75, bloodData.lpa < 125),                                                  zoneKey: "lpA",          infoKey: "lpA" },
    { name: "Triglycerides", sub: "Target <150 mg/dL",                 value: bloodData.triglycerides, unit: "mg/dL", flag: bflag(bloodData.triglycerides, bloodData.triglycerides < 150, bloodData.triglycerides < 200),                   zoneKey: "triglycerides", infoKey: "triglycerides" },
    bloodData.apoB > 0
      ? { name: "ApoB",   sub: "Particles · target <90",   value: bloodData.apoB,           unit: "mg/dL", flag: bflag(bloodData.apoB, bloodData.apoB < 90, bloodData.apoB < 120),                                                         zoneKey: null,    infoKey: "apoB" }
      : { name: "LDL",    sub: "LDL-C · target <100",      value: bloodData.ldl,            unit: "mg/dL", flag: bflag(bloodData.ldl, bloodData.ldl < 100, bloodData.ldl < 130),                                                           zoneKey: "LDL",   infoKey: "LDL" },
    { name: "HDL",          sub: "Target >60 mg/dL",                   value: bloodData.hdl,           unit: "mg/dL", flag: bflag(bloodData.hdl, bloodData.hdl >= 60, bloodData.hdl >= 40),                                                zoneKey: "HDL",          infoKey: "HDL" },
    { name: "Glucose",      sub: "Fasting · target 70–85",             value: bloodData.glucose,       unit: "mg/dL", flag: bflag(bloodData.glucose, bloodData.glucose >= 70 && bloodData.glucose < 85, bloodData.glucose < 99),            zoneKey: "glucose",      infoKey: "glucose" },
    { name: "HbA1c",        sub: "Glycaemia · target <5.4%",           value: bloodData.hba1c,         unit: "%",     flag: bflag(bloodData.hba1c, bloodData.hba1c < 5.4, bloodData.hba1c < 5.7),                                          zoneKey: null,           infoKey: "hbA1c" },
    { name: "Vitamin D",    sub: "25-OH · target 30–60 ng/mL",        value: bloodData.vitaminD,       unit: "ng/mL", flag: bflag(bloodData.vitaminD, bloodData.vitaminD >= 30 && bloodData.vitaminD <= 60, bloodData.vitaminD >= 20),      zoneKey: null,           infoKey: "vitaminD" },
    { name: "LDL : HDL",   sub: "Ratio · target <2.0",                value: bloodData.ldlHdlRatio,    unit: "ratio", flag: bflag(bloodData.ldlHdlRatio, bloodData.ldlHdlRatio < 2.0, bloodData.ldlHdlRatio < 3.0),                       zoneKey: "ldlHdlRatio",  infoKey: null },
    { name: "eGFR",         sub: "Kidney function · target >90",       value: bloodData.egfr,          unit: "mL/min",flag: bflag(bloodData.egfr, bloodData.egfr >= 90, bloodData.egfr >= 60),                                             zoneKey: "eGFR",         infoKey: "eGFR" },
    { name: "Hemoglobin",   sub: "Red blood cells",                    value: bloodData.hemoglobin,     unit: "g/dL",  flag: bflag(bloodData.hemoglobin, bloodData.hemoglobin >= 12 && bloodData.hemoglobin <= 17.5, bloodData.hemoglobin >= 10), zoneKey: "hemoglobin", infoKey: "hemoglobin" },
  ] : []
  const testedBloodMarkers   = bloodMarkerDefs.filter(m => m.value > 0)
  const untestedBloodMarkers = bloodMarkerDefs.filter(m => m.value === 0)

  return (
    <div style={{ maxWidth: "var(--layout-max-width, 760px)", margin: "0 auto", padding: "0 0 80px", display: "flex", flexDirection: "column", gap: "var(--spacing-section, 64px)" }}>

      {/* PEAKS */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 10, ...fadeUp("0s") }}>
        {/* Score number — centered over full SVG width */}
        <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          zIndex: 20,
        }}>
          <span
            className={scorePulse ? "score-pulse" : ""}
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 96, fontWeight: 300, lineHeight: 1,
              letterSpacing: "-0.025em",
              color: "#141410",
              display: "block",
            }}
          >
            {displayScore}
          </span>
          <p style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em",
            color: "rgba(20,20,16,0.50)", margin: "8px 0 0",
          }}>
            YOUR PEAQ SCORE · {new Date().toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
            {sleepHidden && (
              <span style={{ color: '#4A7FB5', marginLeft: '6px' }}>· OUT OF 70</span>
            )}
          </p>
        </div>

        {/* Mountain peaks chart with hero backdrop */}
        <div style={{ width: "100%", marginTop: 16, position: "relative" }}>
          {/* Hero image — snow-capped mountains behind the peaks */}
          <div style={{
            position: "absolute",
            top: "-20px",
            left: "-48px",
            right: "-48px",
            bottom: "-20px",
            zIndex: 0,
            overflow: "hidden",
            borderRadius: "8px",
          }}>
            <img
              src="/images/snowcapped.jpg"
              alt=""
              className="hero-mountain"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 30%",
                transform: "scale(1.05)",
              }}
            />
            {/* Fade edges to blend with background */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: `
                linear-gradient(to bottom,
                  var(--off-white) 0%,
                  transparent 25%,
                  transparent 55%,
                  var(--off-white) 100%
                ),
                linear-gradient(to right,
                  var(--off-white) 0%,
                  transparent 15%,
                  transparent 85%,
                  var(--off-white) 100%
                )
              `,
              pointerEvents: "none",
            }} />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <PeaksVisualization
              breakdown={breakdown}
              sleepConnected={sleepConnected}
              hasBlood={hasBlood}
              oralActive={oralActive}
              hasLifestyle={false}
              sleepGhosted={sleepHidden}
              onPeakHover={setHoveredRing}
              onPeakClick={handlePeakClick}
              netModifier={modifier_total ?? 0}
            />
          </div>
        </div>

      </div>

      {/* HERO */}
      <div style={fadeUp("0s")}>
        <HeroTitle score={score} sleepConnected={sleepConnected} hasBlood={hasBlood} oralActive={oralActive} subline={subline} />
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
          displaySleep={displaySleep} displayBlood={displayBlood} displayOral={displayOral} displayLifestyle={0}
          sleepConnected={sleepConnected} isSyncing={isSyncing} wearableProvider={wearableProvider}
          labFreshness={labFreshness} oralActive={oralActive} lifestyleActive={false}
          lifestyleSub={0}
          sleepDesc={sleepDesc} bloodDesc={bloodDesc} oralDesc={oralDesc}
          staleBadge={staleBadge} mounted={mounted} hoveredRing={hoveredRing}
          interactionsFired={interactionsFired}
          oralKitStatus={oralKitStatus}
        />
      </div>

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

      {/* CROSS-PANEL INTERACTIONS */}
      <div ref={crossPanelRef} />
      <CrossPanelInteractions
        oralKitStatus={oralKitStatus}
        interactionsFired={interactionsFired}
        oralActive={oralActive}
        lifestyleActive={!!lifestyleData}
        oralData={oralData}
        bloodData={bloodData}
        sleepData={sleepData}
        lifestyleData={lifestyleData}
        fadeUpFn={fadeUp}
        modifiers_applied={modifiers_applied}
        modifier_total={modifier_total}
      />

      {/* CTA BLOCKS */}
      <CTABlocks sleepConnected={sleepConnected} labFreshness={labFreshness} oralActive={oralActive} />

      {/* SLEEP MARKERS */}
      <CollapsiblePanel
        ref={sleepPanelRef}
        title="Sleep"
        score={Math.round(breakdown.sleepSub)}
        maxScore={30}
        subtitle={sleepData ? (() => {
          const n = sleepData.nightsAvg
          const dev = sleepData.device.toUpperCase()
          if (n >= 14) return `30-DAY WEIGHTED AVG · ${dev}`
          if (n >= 7)  return `${n}-NIGHT AVG · ${dev}`
          if (n >= 3)  return `${n} NIGHTS · ACCURACY IMPROVES WITH MORE DATA`
          if (n >= 1)  return `${n} NIGHT · WEAR DEVICE FOR 7+ NIGHTS`
          return `NO DATA · CONNECT ${dev}`
        })() : "NO DATA"}
        statusDots={sf ? [sf.deep, sf.hrv, sf.spo2Avg, sf.rem] : undefined}
        defaultOpen={sleepConnected}
        delay="0.14s"
        fadeUpFn={fadeUp}
        headerExtra={sleepToggle}
      >
        {!sleepHidden ? (
          <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>

            {(sleepData || whoopData?.connected) && (
              <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-40)", padding: "8px 0 0", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block", flexShrink: 0 }} />
                {sleepData?.device || "Wearable"} connected
                {(() => {
                  const raw = sleepData?.lastSync || whoopData?.lastSynced
                  return raw ? ` · Last sync ${new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""
                })()}
              </p>
            )}
            {[
              { name: "Deep sleep",       sub: "Slow-wave · target ≥17%",       val: sleepData?.deepPct,    unit: "% of TST",  flagKey: "deep",       max: 30,  zoneKey: "deep"       },
              { name: "HRV",              sub: "RMSSD · age-adjusted target",   val: sleepData?.hrv,        unit: "ms RMSSD",  flagKey: "hrv",        max: 100, zoneKey: "hrv"        },
              { name: "SpO2",             sub: "Avg saturation · target ≥96%",  val: sleepData?.spo2Avg,    unit: "%",         flagKey: "spo2Avg",    max: 100, zoneKey: "spo2Avg"    },
              { name: "REM",              sub: "Target ≥18%",                   val: sleepData?.remPct,     unit: "% of TST",  flagKey: "rem",        max: 30,  zoneKey: "rem"        },
              { name: "Sleep efficiency", sub: "Target ≥85%",                   val: sleepData?.efficiency, unit: "% in bed",  flagKey: "efficiency", max: 100, zoneKey: "efficiency" },
            ].map(row => (
              <MarkerRow key={row.name} name={row.name} sub={row.sub}
                value={row.val ?? null} unit={row.unit}
                flag={sf ? (sf[row.flagKey as keyof typeof sf] as Flag) : "pending"}
                barPct={row.val !== undefined ? fa(row.val, row.max) : 0}
                color="var(--sleep-c)" trackColor="var(--sleep-bg)"
                hoverBg="rgba(74,127,181,0.04)" mounted={mounted}
                zoneKey={row.zoneKey}
                infoKey={row.flagKey}
                expandedKey={expandedSleepMetric}
                onInfoToggle={k => setExpandedSleepMetric(prev => prev === k ? null : k)}
                infoContent={SLEEP_INFO[row.flagKey]}
              />
            ))}

            {/* Wearable status */}
            {!sleepData && !whoopData?.connected && (
              <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "var(--ink-40)", marginTop: 12 }}>
                No wearable connected —{" "}
                <a href="/settings#wearables" style={{ color: "var(--sleep-c)", textDecoration: "none" }}>
                  Go to Settings →
                </a>
              </p>
            )}
          </div>
        ) : (
          <div style={{ padding: '12px 0', fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: '12px', color: 'var(--ink-30)', fontStyle: 'italic' }}>
            Sleep panel hidden — toggle above to re-enable.
          </div>
        )}
      </CollapsiblePanel>

      {/* BLOOD MARKERS */}
      <CollapsiblePanel
        ref={bloodPanelRef}
        title="Blood"
        score={Math.round(breakdown.bloodSub)}
        maxScore={40}
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
              color: "var(--ink-40)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#B8860B" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-40)" }}
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
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: "italic", fontSize: 16, color: "var(--ink-80)", lineHeight: 1.55, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {bloodData.bloodInsight}
          </p>
        )}
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {bloodData ? (
            <>
              {testedBloodMarkers.map(m => (
                <BloodMarkerRow
                  key={m.name}
                  name={m.name} sub={m.sub} value={m.value} unit={m.unit} flag={m.flag}
                  zoneKey={m.zoneKey} mounted={mounted}
                  infoKey={m.infoKey ?? undefined}
                  expandedKey={expandedBloodMetric}
                  onInfoToggle={k => setExpandedBloodMetric(prev => prev === k ? null : k)}
                  infoContent={m.infoKey ? BLOOD_INFO[m.infoKey] : undefined}
                />
              ))}
              {untestedBloodMarkers.length > 0 && (
                <button
                  onClick={() => setShowUntested(o => !o)}
                  style={{
                    marginTop: '12px',
                    fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                    fontSize: '12px',
                    color: 'var(--ink-30)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {showUntested ? '−' : '+'} {untestedBloodMarkers.length} marker{untestedBloodMarkers.length !== 1 ? 's' : ''} not tested
                </button>
              )}
              {showUntested && untestedBloodMarkers.map(m => (
                <BloodMarkerRow
                  key={m.name}
                  name={m.name} sub={m.sub} value={m.value} unit={m.unit} flag={m.flag}
                  zoneKey={null} mounted={mounted}
                  infoKey={m.infoKey ?? undefined}
                  expandedKey={expandedBloodMetric}
                  onInfoToggle={k => setExpandedBloodMetric(prev => prev === k ? null : k)}
                  infoContent={m.infoKey ? BLOOD_INFO[m.infoKey] : undefined}
                />
              ))}
            </>
          ) : (
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "var(--ink-40)", padding: "16px 0" }}>
              No blood data on file. Upload your lab results to see markers.
            </p>
          )}
        </div>
        {(() => {
          const missing = computeRelevantMissing(bloodData, lifestyleData, oralData)
          if (missing.length === 0) return null
          const font = "var(--font-body, 'Instrument Sans', sans-serif)"
          return (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontFamily: font, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-40)", margin: "0 0 8px" }}>
                Consider testing
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {missing.map(m => (
                  <div key={m.label} style={{ background: "var(--white)", border: "0.5px solid var(--ink-12)", borderRadius: 8, padding: "14px 16px" }}>
                    {/* Name row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{m.label}</span>
                        <span style={{ fontFamily: font, fontSize: 11, color: "#B8860B" }}>+{m.pts} pts</span>
                      </div>
                      <button
                        onClick={() => setOpenMissingTooltip(openMissingTooltip === m.label ? null : m.label)}
                        style={{
                          width: 18, height: 18, borderRadius: "50%",
                          border: "0.5px solid #B8860B", background: "transparent",
                          cursor: "pointer", fontSize: 10, color: "#B8860B",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1, flexShrink: 0, padding: 0, fontFamily: font,
                        }}
                        aria-label={`Why test ${m.label}`}
                      >
                        i
                      </button>
                    </div>
                    {/* Personalized reason — always visible */}
                    <p style={{ fontFamily: font, fontSize: 12, color: "var(--ink-60)", lineHeight: 1.6, margin: 0 }}>
                      {m.reason}
                    </p>
                    {/* Science context — expands on (i) */}
                    {openMissingTooltip === m.label && (
                      <p style={{ fontFamily: font, fontSize: 11, color: "var(--ink-60)", lineHeight: 1.6, margin: "8px 0 0", paddingTop: 8, borderTop: "0.5px solid var(--ink-12)" }}>
                        {m.science}
                      </p>
                    )}
                  </div>
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
        ref={oralPanelRef}
        title="Oral Microbiome"
        score={Math.round(breakdown.oralSub)}
        maxScore={30}
        subtitle={oralData ? `${new Date(oralData.reportDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()}` : (oralOrdered ? "PROCESSING" : "")}
        statusDots={of_ ? [of_.shannon, of_.nitrate, of_.periodont, of_.osa] : undefined}
        defaultOpen={oralActive}
        delay="0.26s"
        fadeUpFn={fadeUp}
      >
        <div style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          {[
            { name: "Shannon diversity",      sub: "16S species richness · target ≥3.0",         val: oralData?.shannonDiversity,   unit: "index",   flagKey: "shannon",  max: 5,  infoKey: "shannon",     zoneKey: "shannon"     },
            { name: "Nitrate-reducing",       sub: "Neisseria · Rothia · Veillonella · ≥5%",     val: oralData?.nitrateReducersPct, unit: "% reads", flagKey: "nitrate",  max: 20, infoKey: "nitrate",     zoneKey: "nitrate"     },
            { name: "Periodontal pathogens",  sub: "P. gingivalis · T. denticola · target <0.5%", val: oralData?.periodontPathPct,   unit: "% reads", flagKey: "periodont",max: 3,  infoKey: "periodontal", zoneKey: "periodontal" },
            { name: "OSA-associated taxa",    sub: "Prevotella · Fusobacterium · target <1%",     val: oralData?.osaTaxaPct,         unit: "% reads", flagKey: "osa",      max: 5,  infoKey: undefined,     zoneKey: "osa"         },
          ].map(row => (
            <MarkerRow key={row.name} name={row.name} sub={row.sub}
              value={row.val ?? null} unit={row.unit}
              flag={of_ ? (of_[row.flagKey as keyof typeof of_] as Flag) : "pending"}
              barPct={row.val !== undefined ? fa(row.val, row.max) : 0}
              color="var(--oral-c)" trackColor="var(--oral-bg)"
              hoverBg="rgba(45,106,79,0.04)" mounted={mounted}
              zoneKey={row.zoneKey}
              infoKey={row.infoKey}
              expandedKey={expandedOralMetric}
              onInfoToggle={k => setExpandedOralMetric(prev => prev === k ? null : k)}
              infoContent={row.infoKey ? ORAL_INFO[row.infoKey] : undefined}
            />
          ))}
          {oralActive && (
            <a href="/dashboard/oral" style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "#2D6A4F", display: "block", marginTop: 12 }}>
              View full oral panel →
            </a>
          )}
        </div>
      </CollapsiblePanel>

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

      {/* SLEEP TOGGLE TOAST */}
      {toastVisible && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--ink)', color: 'var(--white)',
          padding: '10px 20px', borderRadius: '20px',
          fontSize: '13px', fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
          zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'fadeInUp 0.2s ease',
          whiteSpace: 'nowrap',
        }}>
          {sleepHidden ? (
            <><span style={{ color: '#4A7FB5' }}>○</span> Sleep paused — score now out of 70</>
          ) : (
            <><span style={{ color: '#4A7FB5' }}>●</span> Sleep restored — score now out of 100</>
          )}
        </div>
      )}
    </div>
  )
}

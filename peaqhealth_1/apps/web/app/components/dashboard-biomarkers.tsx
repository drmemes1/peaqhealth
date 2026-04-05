"use client"

import { useState } from "react"
import { BiomarkerRow } from "./biomarker-row"
import type { ScoreWheelProps } from "./score-wheel"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "-apple-system, BlinkMacSystemFont, sans-serif"

/* ───────── Types ───────── */

interface DashboardBiomarkersProps {
  sleepData?: ScoreWheelProps["sleepData"]
  bloodData?: ScoreWheelProps["bloodData"]
  oralData?: ScoreWheelProps["oralData"]
  breakdown: { sleepSub: number; bloodSub: number; oralSub: number; lifestyleSub: number }
  sleepConnected: boolean
  oralActive: boolean
  labFreshness: "fresh" | "aging" | "stale" | "expired" | "none"
}

type Zone = { label: string; color: string; min: number; max: number }
type Flag = "good" | "watch" | "attention" | "elevated" | "pending" | "not_tested"

interface MarkerDef {
  name: string
  value: number | null | undefined
  unit: string
  zones: Zone[] | null
  optimal?: string
  info?: { measures: string; whyPeaq: string }
}

/* ───────── Helpers ───────── */

function fmtDate(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function flagFromZones(value: number | null | undefined, zones: Zone[] | null): Flag {
  if (value === null || value === undefined || value === 0) return "not_tested"
  if (!zones) return "good"
  for (const z of zones) {
    if (value >= z.min && value < z.max) {
      const l = z.label.toLowerCase()
      if (l === "optimal" || l === "good") return "good"
      if (l === "watch") return "watch"
      return "attention"
    }
  }
  // value beyond all zones — check last zone
  const last = zones[zones.length - 1]
  if (last) {
    if (value >= last.max) {
      const l = last.label.toLowerCase()
      if (l === "optimal" || l === "good") return "good"
      if (l === "watch") return "watch"
      return "attention"
    }
  }
  return "good"
}

/* ───────── Zone Definitions ───────── */

const SLEEP_ZONES = {
  deep: [
    { label: "Attention", color: "#FFCDD2", min: 0, max: 17 },
    { label: "Watch", color: "#FFE0B2", min: 17, max: 22 },
    { label: "Good", color: "#D4EDDA", min: 22, max: 50 },
  ],
  hrv: [
    { label: "Attention", color: "#FFCDD2", min: 0, max: 40 },
    { label: "Watch", color: "#FFE0B2", min: 40, max: 60 },
    { label: "Good", color: "#D4EDDA", min: 60, max: 200 },
  ],
  spo2Avg: [
    { label: "Attention", color: "#FFCDD2", min: 0, max: 94 },
    { label: "Watch", color: "#FFE0B2", min: 94, max: 96 },
    { label: "Good", color: "#D4EDDA", min: 96, max: 100 },
  ],
  rem: [
    { label: "Attention", color: "#FFCDD2", min: 0, max: 18 },
    { label: "Watch", color: "#FFE0B2", min: 18, max: 25 },
    { label: "Good", color: "#D4EDDA", min: 25, max: 50 },
  ],
  efficiency: [
    { label: "Attention", color: "#FFCDD2", min: 0, max: 78 },
    { label: "Watch", color: "#FFE0B2", min: 78, max: 85 },
    { label: "Good", color: "#D4EDDA", min: 85, max: 100 },
  ],
}

const BLOOD_ZONES = {
  hsCRP: [
    { label: "Optimal", color: "#D4EDDA", min: 0, max: 0.5 },
    { label: "Good", color: "#FFF3CD", min: 0.5, max: 1.0 },
    { label: "Watch", color: "#FFE0B2", min: 1.0, max: 3.0 },
    { label: "High", color: "#FFCDD2", min: 3.0, max: 10.0 },
  ],
  ldl: [
    { label: "Optimal", color: "#D4EDDA", min: 0, max: 70 },
    { label: "Good", color: "#FFF3CD", min: 70, max: 100 },
    { label: "Watch", color: "#FFE0B2", min: 100, max: 130 },
    { label: "High", color: "#FFCDD2", min: 130, max: 200 },
  ],
  hdl: [
    { label: "Low", color: "#FFCDD2", min: 0, max: 40 },
    { label: "Watch", color: "#FFE0B2", min: 40, max: 50 },
    { label: "Good", color: "#FFF3CD", min: 50, max: 60 },
    { label: "Optimal", color: "#D4EDDA", min: 60, max: 100 },
  ],
  glucose: [
    { label: "Optimal", color: "#D4EDDA", min: 70, max: 85 },
    { label: "Good", color: "#FFF3CD", min: 85, max: 99 },
    { label: "Watch", color: "#FFE0B2", min: 99, max: 125 },
    { label: "High", color: "#FFCDD2", min: 125, max: 200 },
  ],
  triglycerides: [
    { label: "Optimal", color: "#D4EDDA", min: 0, max: 100 },
    { label: "Good", color: "#FFF3CD", min: 100, max: 150 },
    { label: "Watch", color: "#FFE0B2", min: 150, max: 200 },
    { label: "High", color: "#FFCDD2", min: 200, max: 500 },
  ],
  lpa: [
    { label: "Optimal", color: "#D4EDDA", min: 0, max: 75 },
    { label: "Watch", color: "#FFE0B2", min: 75, max: 125 },
    { label: "High", color: "#FFCDD2", min: 125, max: 250 },
  ],
  ldlHdlRatio: [
    { label: "Optimal", color: "#D4EDDA", min: 0, max: 1.5 },
    { label: "Good", color: "#FFF3CD", min: 1.5, max: 2.0 },
    { label: "Watch", color: "#FFE0B2", min: 2.0, max: 3.0 },
    { label: "High", color: "#FFCDD2", min: 3.0, max: 5.0 },
  ],
  egfr: [
    { label: "Low", color: "#FFCDD2", min: 0, max: 60 },
    { label: "Watch", color: "#FFE0B2", min: 60, max: 90 },
    { label: "Good", color: "#FFF3CD", min: 90, max: 105 },
    { label: "Optimal", color: "#D4EDDA", min: 105, max: 150 },
  ],
  hemoglobin: [
    { label: "Low", color: "#FFCDD2", min: 0, max: 12 },
    { label: "Watch", color: "#FFE0B2", min: 12, max: 13.5 },
    { label: "Good", color: "#FFF3CD", min: 13.5, max: 14.5 },
    { label: "Optimal", color: "#D4EDDA", min: 14.5, max: 18 },
  ],
}

const ORAL_ZONES = {
  shannonDiversity: [
    { label: "Low", color: "#FFCDD2", min: 0, max: 2.0 },
    { label: "Watch", color: "#FFE0B2", min: 2.0, max: 2.5 },
    { label: "Good", color: "#FFF3CD", min: 2.5, max: 3.0 },
    { label: "Optimal", color: "#D4EDDA", min: 3.0, max: 4.5 },
  ],
  nitrateReducers: [
    { label: "Low", color: "#FFCDD2", min: 0, max: 5 },
    { label: "Watch", color: "#FFE0B2", min: 5, max: 10 },
    { label: "Good", color: "#FFF3CD", min: 10, max: 20 },
    { label: "Optimal", color: "#D4EDDA", min: 20, max: 40 },
  ],
  periodontPath: [
    { label: "Optimal", color: "#D4EDDA", min: 0, max: 0.5 },
    { label: "Good", color: "#FFF3CD", min: 0.5, max: 2.0 },
    { label: "Watch", color: "#FFE0B2", min: 2.0, max: 5.0 },
    { label: "Attention", color: "#FFCDD2", min: 5.0, max: 15.0 },
  ],
  osaTaxa: [
    { label: "Optimal", color: "#D4EDDA", min: 0, max: 1.0 },
    { label: "Watch", color: "#FFE0B2", min: 1.0, max: 5.0 },
    { label: "Attention", color: "#FFCDD2", min: 5.0, max: 15.0 },
  ],
}

/* ───────── Panel Section Component ───────── */

function PanelSection({
  panelName,
  panelColor,
  panelKey,
  source,
  date,
  score,
  maxScore,
  markers,
  baseDelay,
}: {
  panelName: string
  panelColor: string
  panelKey: string
  source: string
  date: string
  score: number
  maxScore: number
  markers: MarkerDef[]
  baseDelay: number
}) {
  const [showUntested, setShowUntested] = useState(false)

  const tested = markers.filter((m) => m.value !== null && m.value !== undefined && m.value !== 0)
  const untested = markers.filter((m) => m.value === null || m.value === undefined || m.value === 0)

  return (
    <div style={{ background: "#fff", marginBottom: 6 }}>
      {/* Sticky panel header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "#fff",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left: dot + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: panelColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: serif,
              fontSize: 16,
              color: panelColor,
            }}
          >
            {panelName}
          </span>
        </div>

        {/* Center: score info */}
        <span
          style={{
            fontSize: 10,
            color: "#bbb",
            fontFamily: sans,
          }}
        >
          {score}/{maxScore} · {source} · {date}
        </span>

        {/* Right: view all link */}
        <a
          href={`/panels/${panelKey}`}
          style={{
            fontSize: 10,
            color: "#C49A3C",
            fontFamily: sans,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          View all →
        </a>
      </div>

      {/* Tested biomarker rows */}
      {tested.map((m, i) => {
        const flag = flagFromZones(m.value, m.zones)
        const val = m.value ?? null
        return (
          <div
            key={m.name}
            style={{
              animation: `bmRowIn 300ms ease ${baseDelay + i * 40}ms both`,
            }}
          >
            <BiomarkerRow
              name={m.name}
              value={val === undefined ? null : (val as number | null)}
              unit={m.unit}
              flag={flag}
              zones={m.zones}
              panelColor={panelColor}
              optimal={m.optimal}
              info={
                m.info
                  ? {
                      measures: m.info.measures,
                      whyPeaq: m.info.whyPeaq,
                      optimalRange: m.optimal || "",
                      yourValue: val !== null && val !== undefined && val !== 0
                        ? `${Number.isInteger(val) ? val : (val as number).toFixed(1)} ${m.unit}`
                        : "—",
                    }
                  : undefined
              }
              animDelay={baseDelay + i * 40}
            />
          </div>
        )
      })}

      {/* Untested markers toggle */}
      {untested.length > 0 && (
        <>
          <div
            onClick={() => setShowUntested((p) => !p)}
            style={{
              padding: "10px 24px",
              fontSize: 9,
              color: "#C49A3C",
              fontFamily: sans,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            {showUntested
              ? "Hide untested markers"
              : `Show ${untested.length} untested marker${untested.length > 1 ? "s" : ""}`}
          </div>
          <div
            style={{
              maxHeight: showUntested ? untested.length * 60 : 0,
              opacity: showUntested ? 1 : 0,
              overflow: "hidden",
              transition: "max-height 200ms ease, opacity 200ms ease",
            }}
          >
            {untested.map((m) => (
              <BiomarkerRow
                key={m.name}
                name={m.name}
                value={null}
                unit={m.unit}
                flag="not_tested"
                zones={m.zones}
                panelColor={panelColor}
                optimal={m.optimal}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ───────── Main Component ───────── */

export function DashboardBiomarkers({
  sleepData,
  bloodData,
  oralData,
  breakdown,
  sleepConnected,
  oralActive,
  labFreshness,
}: DashboardBiomarkersProps) {
  const baseDelay = 400

  /* ── Sleep markers ── */
  const sleepMarkers: MarkerDef[] = sleepData
    ? [
        {
          name: "Deep Sleep %",
          value: sleepData.deepPct,
          unit: "%",
          zones: SLEEP_ZONES.deep,
          optimal: "22\u201335%",
          info: {
            measures:
              "Percentage of total sleep time spent in deep (slow-wave) sleep, the most restorative phase.",
            whyPeaq:
              "Deep sleep drives physical recovery, memory consolidation, and growth hormone release.",
          },
        },
        {
          name: "HRV",
          value: sleepData.hrv,
          unit: "ms",
          zones: SLEEP_ZONES.hrv,
          optimal: "60\u2013120 ms",
          info: {
            measures:
              "Heart rate variability during sleep \u2014 a measure of autonomic nervous system balance.",
            whyPeaq:
              "Higher HRV indicates better stress resilience and cardiovascular recovery.",
          },
        },
        {
          name: "SpO\u2082",
          value: sleepData.spo2Avg,
          unit: "%",
          zones: SLEEP_ZONES.spo2Avg,
          optimal: "96\u2013100%",
          info: {
            measures: "Average blood oxygen saturation during sleep.",
            whyPeaq:
              "Nocturnal hypoxia signals airway obstruction and cardiovascular stress.",
          },
        },
        {
          name: "REM Sleep %",
          value: sleepData.remPct,
          unit: "%",
          zones: SLEEP_ZONES.rem,
          optimal: "25\u201335%",
          info: {
            measures:
              "Percentage of sleep spent in REM \u2014 critical for cognitive function.",
            whyPeaq:
              "REM deprivation impairs emotional regulation and memory processing.",
          },
        },
        {
          name: "Sleep Efficiency",
          value: sleepData.efficiency,
          unit: "%",
          zones: SLEEP_ZONES.efficiency,
          optimal: "85\u2013100%",
          info: {
            measures: "Ratio of time asleep to time in bed.",
            whyPeaq:
              "Low efficiency indicates fragmented sleep or difficulty falling asleep.",
          },
        },
      ]
    : []

  /* ── Blood markers ── */
  const bloodMarkers: MarkerDef[] = bloodData
    ? [
        {
          name: "hs-CRP",
          value: bloodData.hsCRP,
          unit: "mg/L",
          zones: BLOOD_ZONES.hsCRP,
          optimal: "< 0.5 mg/L",
          info: {
            measures:
              "High-sensitivity C-reactive protein \u2014 a marker of systemic inflammation.",
            whyPeaq:
              "Elevated hsCRP predicts cardiovascular events independently of cholesterol.",
          },
        },
        {
          name: "LDL",
          value: bloodData.ldl,
          unit: "mg/dL",
          zones: BLOOD_ZONES.ldl,
          optimal: "< 70 mg/dL",
        },
        {
          name: "HDL",
          value: bloodData.hdl,
          unit: "mg/dL",
          zones: BLOOD_ZONES.hdl,
          optimal: "> 60 mg/dL",
        },
        {
          name: "Glucose",
          value: bloodData.glucose,
          unit: "mg/dL",
          zones: BLOOD_ZONES.glucose,
          optimal: "70\u201385 mg/dL",
        },
        {
          name: "Triglycerides",
          value: bloodData.triglycerides,
          unit: "mg/dL",
          zones: BLOOD_ZONES.triglycerides,
          optimal: "< 100 mg/dL",
        },
        {
          name: "Lp(a)",
          value: bloodData.lpa,
          unit: "nmol/L",
          zones: BLOOD_ZONES.lpa,
          optimal: "< 75 nmol/L",
        },
        {
          name: "ApoB",
          value: bloodData.apoB,
          unit: "mg/dL",
          zones: null,
        },
        {
          name: "Vitamin D",
          value: bloodData.vitaminD,
          unit: "ng/mL",
          zones: null,
        },
        {
          name: "LDL/HDL Ratio",
          value: bloodData.ldlHdlRatio,
          unit: "ratio",
          zones: BLOOD_ZONES.ldlHdlRatio,
        },
        {
          name: "eGFR",
          value: bloodData.egfr,
          unit: "mL/min",
          zones: BLOOD_ZONES.egfr,
        },
        {
          name: "Hemoglobin",
          value: bloodData.hemoglobin,
          unit: "g/dL",
          zones: BLOOD_ZONES.hemoglobin,
        },
        {
          name: "HbA1c",
          value: bloodData.hba1c,
          unit: "%",
          zones: null,
        },
      ]
    : []

  /* ── Oral markers ── */
  const oralMarkers: MarkerDef[] = oralData
    ? [
        {
          name: "Shannon Diversity",
          value: oralData.shannonDiversity,
          unit: "H'",
          zones: ORAL_ZONES.shannonDiversity,
          optimal: "3.0\u20134.5 H'",
          info: {
            measures:
              "Shannon diversity index \u2014 measures the richness and evenness of your oral microbial community.",
            whyPeaq:
              "Higher diversity is associated with oral and systemic health resilience.",
          },
        },
        {
          name: "Nitrate Reducers",
          value: oralData.nitrateReducersPct,
          unit: "%",
          zones: ORAL_ZONES.nitrateReducers,
          optimal: "20\u201340%",
        },
        {
          name: "Periodontal Pathogens",
          value: oralData.periodontPathPct,
          unit: "%",
          zones: ORAL_ZONES.periodontPath,
          optimal: "< 0.5%",
        },
        {
          name: "OSA-associated Taxa",
          value: oralData.osaTaxaPct,
          unit: "%",
          zones: ORAL_ZONES.osaTaxa,
          optimal: "< 1.0%",
        },
      ]
    : []

  /* ── Panel delay offsets ── */
  let runningDelay = baseDelay
  const sleepBaseDelay = runningDelay
  if (sleepData) runningDelay += sleepMarkers.length * 40 + 100
  const bloodBaseDelay = runningDelay
  if (bloodData) runningDelay += bloodMarkers.length * 40 + 100
  const oralBaseDelay = runningDelay

  return (
    <div style={{ background: "#F6F4EF" }}>
      <style>{`
        @keyframes bmRowIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {sleepData && (
        <PanelSection
          panelName="Sleep"
          panelColor="#185FA5"
          panelKey="sleep"
          source={sleepData.device || "Wearable"}
          date={fmtDate(sleepData.lastSync)}
          score={breakdown.sleepSub}
          maxScore={25}
          markers={sleepMarkers}
          baseDelay={sleepBaseDelay}
        />
      )}

      {bloodData && (
        <PanelSection
          panelName="Blood"
          panelColor="#A32D2D"
          panelKey="blood"
          source={bloodData.labName || "Lab"}
          date={fmtDate(bloodData.collectionDate)}
          score={breakdown.bloodSub}
          maxScore={25}
          markers={bloodMarkers}
          baseDelay={bloodBaseDelay}
        />
      )}

      {oralData && (
        <PanelSection
          panelName="Oral"
          panelColor="#3B6D11"
          panelKey="oral"
          source="Zymo Research"
          date={fmtDate(oralData.reportDate)}
          score={breakdown.oralSub}
          maxScore={25}
          markers={oralMarkers}
          baseDelay={oralBaseDelay}
        />
      )}
    </div>
  )
}

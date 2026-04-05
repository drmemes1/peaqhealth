"use client"

import { useState } from "react"
import { AuthLayout } from "../../components/auth-layout"
import { BiomarkerRow } from "../../components/biomarker-row"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "-apple-system, BlinkMacSystemFont, sans-serif"

/* ───────── Types ───────── */

interface PanelDetailClientProps {
  panel: "sleep" | "blood" | "oral"
  initials: string
  score: number
  maxScore: number
  source: string
  lastUpdated: string
  panelData: any
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

/* ───────── Panel Config ───────── */

const PANEL_CONFIG = {
  sleep: { name: "Sleep", color: "#185FA5" },
  blood: { name: "Blood", color: "#A32D2D" },
  oral: { name: "Oral Microbiome", color: "#3B6D11" },
}

/* ───────── Helpers ───────── */

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

function fmtDate(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/* ───────── Marker builders ───────── */

function buildSleepMarkers(data: any): MarkerDef[] {
  if (!data) return []
  return [
    {
      name: "Deep Sleep %",
      value: data.deepPct,
      unit: "%",
      zones: SLEEP_ZONES.deep,
      optimal: "22\u201335%",
      info: {
        measures: "Percentage of total sleep time spent in deep (slow-wave) sleep, the most restorative phase.",
        whyPeaq: "Deep sleep drives physical recovery, memory consolidation, and growth hormone release.",
      },
    },
    {
      name: "HRV",
      value: data.hrv,
      unit: "ms",
      zones: SLEEP_ZONES.hrv,
      optimal: "60\u2013120 ms",
      info: {
        measures: "Heart rate variability during sleep \u2014 a measure of autonomic nervous system balance.",
        whyPeaq: "Higher HRV indicates better stress resilience and cardiovascular recovery.",
      },
    },
    {
      name: "SpO\u2082",
      value: data.spo2Avg,
      unit: "%",
      zones: SLEEP_ZONES.spo2Avg,
      optimal: "96\u2013100%",
      info: {
        measures: "Average blood oxygen saturation during sleep.",
        whyPeaq: "Nocturnal hypoxia signals airway obstruction and cardiovascular stress.",
      },
    },
    {
      name: "REM Sleep %",
      value: data.remPct,
      unit: "%",
      zones: SLEEP_ZONES.rem,
      optimal: "25\u201335%",
      info: {
        measures: "Percentage of sleep spent in REM \u2014 critical for cognitive function.",
        whyPeaq: "REM deprivation impairs emotional regulation and memory processing.",
      },
    },
    {
      name: "Sleep Efficiency",
      value: data.efficiency,
      unit: "%",
      zones: SLEEP_ZONES.efficiency,
      optimal: "85\u2013100%",
      info: {
        measures: "Ratio of time asleep to time in bed.",
        whyPeaq: "Low efficiency indicates fragmented sleep or difficulty falling asleep.",
      },
    },
  ]
}

function buildBloodMarkers(data: any): MarkerDef[] {
  if (!data) return []
  return [
    {
      name: "hs-CRP",
      value: data.hsCRP,
      unit: "mg/L",
      zones: BLOOD_ZONES.hsCRP,
      optimal: "< 0.5 mg/L",
      info: {
        measures: "High-sensitivity C-reactive protein \u2014 a marker of systemic inflammation.",
        whyPeaq: "Elevated hsCRP predicts cardiovascular events independently of cholesterol.",
      },
    },
    {
      name: "LDL",
      value: data.ldl,
      unit: "mg/dL",
      zones: BLOOD_ZONES.ldl,
      optimal: "< 70 mg/dL",
      info: {
        measures: "Low-density lipoprotein cholesterol \u2014 the primary atherogenic particle.",
        whyPeaq: "Cumulative LDL exposure is the strongest modifiable risk factor for atherosclerosis.",
      },
    },
    {
      name: "HDL",
      value: data.hdl,
      unit: "mg/dL",
      zones: BLOOD_ZONES.hdl,
      optimal: "> 60 mg/dL",
      info: {
        measures: "High-density lipoprotein cholesterol \u2014 involved in reverse cholesterol transport.",
        whyPeaq: "Higher HDL is associated with reduced cardiovascular risk.",
      },
    },
    {
      name: "Glucose",
      value: data.glucose,
      unit: "mg/dL",
      zones: BLOOD_ZONES.glucose,
      optimal: "70\u201385 mg/dL",
      info: {
        measures: "Fasting blood glucose \u2014 a measure of metabolic health.",
        whyPeaq: "Chronically elevated glucose damages blood vessels and drives insulin resistance.",
      },
    },
    {
      name: "Triglycerides",
      value: data.triglycerides,
      unit: "mg/dL",
      zones: BLOOD_ZONES.triglycerides,
      optimal: "< 100 mg/dL",
      info: {
        measures: "Blood triglyceride level \u2014 a marker of lipid metabolism.",
        whyPeaq: "High triglycerides indicate metabolic dysfunction and increased CVD risk.",
      },
    },
    {
      name: "Lp(a)",
      value: data.lpa,
      unit: "nmol/L",
      zones: BLOOD_ZONES.lpa,
      optimal: "< 75 nmol/L",
      info: {
        measures: "Lipoprotein(a) \u2014 a genetically determined atherogenic particle.",
        whyPeaq: "Elevated Lp(a) is an independent, largely genetic risk factor for heart disease.",
      },
    },
    {
      name: "ApoB",
      value: data.apoB,
      unit: "mg/dL",
      zones: null,
      info: {
        measures: "Apolipoprotein B \u2014 one particle per atherogenic lipoprotein.",
        whyPeaq: "ApoB is a better predictor of cardiovascular risk than LDL alone.",
      },
    },
    {
      name: "Vitamin D",
      value: data.vitaminD,
      unit: "ng/mL",
      zones: null,
      info: {
        measures: "25-hydroxyvitamin D \u2014 the circulating form of vitamin D.",
        whyPeaq: "Deficiency is linked to immune dysfunction, bone loss, and cardiovascular risk.",
      },
    },
    {
      name: "LDL/HDL Ratio",
      value: data.ldlHdlRatio,
      unit: "ratio",
      zones: BLOOD_ZONES.ldlHdlRatio,
      info: {
        measures: "Ratio of LDL to HDL cholesterol.",
        whyPeaq: "A high ratio indicates atherogenic dominance in your lipid profile.",
      },
    },
    {
      name: "eGFR",
      value: data.egfr,
      unit: "mL/min",
      zones: BLOOD_ZONES.egfr,
      info: {
        measures: "Estimated glomerular filtration rate \u2014 a measure of kidney function.",
        whyPeaq: "Declining eGFR signals kidney damage, often before symptoms appear.",
      },
    },
    {
      name: "Hemoglobin",
      value: data.hemoglobin,
      unit: "g/dL",
      zones: BLOOD_ZONES.hemoglobin,
      info: {
        measures: "Hemoglobin concentration in blood \u2014 oxygen-carrying capacity.",
        whyPeaq: "Low hemoglobin indicates anemia; high values may signal dehydration or polycythemia.",
      },
    },
    {
      name: "HbA1c",
      value: data.hba1c,
      unit: "%",
      zones: null,
      info: {
        measures: "Glycated hemoglobin \u2014 average blood sugar over 2\u20133 months.",
        whyPeaq: "HbA1c reveals long-term glucose control that a single fasting glucose can miss.",
      },
    },
  ]
}

function buildOralMarkers(data: any): MarkerDef[] {
  if (!data) return []
  return [
    {
      name: "Shannon Diversity",
      value: data.shannonDiversity,
      unit: "H'",
      zones: ORAL_ZONES.shannonDiversity,
      optimal: "3.0\u20134.5 H'",
      info: {
        measures: "Shannon diversity index \u2014 measures the richness and evenness of your oral microbial community.",
        whyPeaq: "Higher diversity is associated with oral and systemic health resilience.",
      },
    },
    {
      name: "Nitrate Reducers",
      value: data.nitrateReducersPct,
      unit: "%",
      zones: ORAL_ZONES.nitrateReducers,
      optimal: "20\u201340%",
      info: {
        measures: "Percentage of oral bacteria capable of reducing dietary nitrate to nitrite.",
        whyPeaq: "Nitrate-reducing bacteria support nitric oxide production and cardiovascular health.",
      },
    },
    {
      name: "Periodontal Pathogens",
      value: data.periodontPathPct,
      unit: "%",
      zones: ORAL_ZONES.periodontPath,
      optimal: "< 0.5%",
      info: {
        measures: "Relative abundance of bacteria associated with periodontal disease.",
        whyPeaq: "Periodontal pathogens are linked to systemic inflammation and cardiovascular risk.",
      },
    },
    {
      name: "OSA-associated Taxa",
      value: data.osaTaxaPct,
      unit: "%",
      zones: ORAL_ZONES.osaTaxa,
      optimal: "< 1.0%",
      info: {
        measures: "Relative abundance of taxa associated with obstructive sleep apnea.",
        whyPeaq: "Elevated OSA-associated taxa may indicate airway inflammation patterns.",
      },
    },
  ]
}

/* ───────── Component ───────── */

export function PanelDetailClient({
  panel,
  initials,
  score,
  maxScore,
  source,
  lastUpdated,
  panelData,
}: PanelDetailClientProps) {
  const [showUntested, setShowUntested] = useState(false)
  const config = PANEL_CONFIG[panel]

  const markers: MarkerDef[] =
    panel === "sleep"
      ? buildSleepMarkers(panelData)
      : panel === "blood"
        ? buildBloodMarkers(panelData)
        : buildOralMarkers(panelData)

  const tested = markers.filter((m) => m.value !== null && m.value !== undefined && m.value !== 0)
  const untested = markers.filter((m) => m.value === null || m.value === undefined || m.value === 0)

  return (
    <AuthLayout pageId="panels" initials={initials}>
      <style>{`
        @keyframes bmRowIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* ── Header ── */}
        <div
          style={{
            borderTop: `3px solid ${config.color}`,
            background: "#fff",
            borderRadius: "0 0 10px 10px",
            padding: "28px 32px 24px",
            marginBottom: 24,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1
                style={{
                  fontFamily: serif,
                  fontSize: 32,
                  fontWeight: 300,
                  color: config.color,
                  margin: "0 0 12px",
                }}
              >
                {config.name}
              </h1>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span
                  style={{
                    fontFamily: serif,
                    fontSize: 64,
                    fontWeight: 300,
                    color: "#1a1a18",
                    lineHeight: 1,
                  }}
                >
                  {score}
                </span>
                <span
                  style={{
                    fontFamily: sans,
                    fontSize: 16,
                    color: "#bbb",
                  }}
                >
                  / {maxScore}
                </span>
              </div>
              {lastUpdated && (
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 10,
                    color: "#bbb",
                    marginTop: 8,
                  }}
                >
                  {source} · Last updated {fmtDate(lastUpdated)}
                </div>
              )}
            </div>
            <a
              href="#"
              style={{
                fontFamily: sans,
                fontSize: 11,
                color: "#C49A3C",
                textDecoration: "none",
                marginTop: 4,
              }}
            >
              View full report &rarr;
            </a>
          </div>
        </div>

        {/* ── Biomarker List ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          {/* Section header */}
          <div
            style={{
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderBottom: "0.5px solid rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: config.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: serif,
                fontSize: 16,
                color: config.color,
              }}
            >
              Biomarkers
            </span>
            <span
              style={{
                fontFamily: sans,
                fontSize: 10,
                color: "#bbb",
                marginLeft: "auto",
              }}
            >
              {tested.length} tested · {untested.length} pending
            </span>
          </div>

          {/* Tested rows */}
          {tested.map((m, i) => {
            const flag = flagFromZones(m.value, m.zones)
            const val = m.value ?? null
            return (
              <div
                key={m.name}
                style={{
                  animation: `bmRowIn 300ms ease ${200 + i * 40}ms both`,
                }}
              >
                <BiomarkerRow
                  name={m.name}
                  value={val === undefined ? null : (val as number | null)}
                  unit={m.unit}
                  flag={flag}
                  zones={m.zones}
                  panelColor={config.color}
                  optimal={m.optimal}
                  info={
                    m.info
                      ? {
                          measures: m.info.measures,
                          whyPeaq: m.info.whyPeaq,
                          optimalRange: m.optimal || "",
                          yourValue:
                            val !== null && val !== undefined && val !== 0
                              ? `${Number.isInteger(val) ? val : (val as number).toFixed(1)} ${m.unit}`
                              : "\u2014",
                        }
                      : undefined
                  }
                  animDelay={200 + i * 40}
                />
              </div>
            )
          })}

          {/* Untested toggle */}
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
                    panelColor={config.color}
                    optimal={m.optimal}
                  />
                ))}
              </div>
            </>
          )}

          {/* No data state */}
          {markers.length === 0 && (
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
                fontFamily: sans,
                fontSize: 13,
                color: "#bbb",
              }}
            >
              No data yet. Connect your {panel === "sleep" ? "wearable" : panel === "blood" ? "lab results" : "oral kit"} to see biomarkers.
            </div>
          )}
        </div>

        {/* ── Trend Chart Placeholder ── */}
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: "24px 32px",
          }}
        >
          <h2
            style={{
              fontFamily: serif,
              fontSize: 20,
              fontWeight: 300,
              color: "#1a1a18",
              margin: "0 0 8px",
            }}
          >
            Score trend (last 90 days)
          </h2>
          <p
            style={{
              fontFamily: sans,
              fontSize: 11,
              color: "#bbb",
              margin: 0,
            }}
          >
            Trend data coming soon
          </p>
        </div>
      </main>
    </AuthLayout>
  )
}

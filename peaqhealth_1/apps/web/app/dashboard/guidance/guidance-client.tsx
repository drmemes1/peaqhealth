"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Nav } from "../../components/nav"
import { GuidanceCard, GoodMetricCard, GuidanceCardSkeleton } from "../../components/dashboard/GuidanceCard"
import type { GuidanceResponse } from "../../../lib/guidanceService"
import type { GuidanceInput, PanelMetric } from "../../../lib/guidancePrompts"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

interface GuidanceClientProps {
  snapshot: Record<string, unknown> | null
  lab: Record<string, unknown> | null
  oral: Record<string, unknown> | null
  wearableProvider: string
  userAge: number
  userSex: "male" | "female" | "other"
  sleepAvg: {
    deepPct: number
    remPct: number
    efficiency: number
    hrv: number
    spo2: number
    nightsCount: number
  }
}

// ── Build metrics from raw data ────────────────────────────────────────────

function sleepStatus(key: string, val: number): PanelMetric["status"] {
  if (val === 0) return "not_tested"
  if (key === "deep") return val >= 22 ? "optimal" : val >= 17 ? "good" : val >= 13 ? "watch" : "attention"
  if (key === "rem") return val >= 24 ? "optimal" : val >= 18 ? "good" : val >= 13 ? "watch" : "attention"
  if (key === "efficiency") return val >= 90 ? "optimal" : val >= 85 ? "good" : val >= 75 ? "watch" : "attention"
  if (key === "hrv") return val >= 40 ? "optimal" : val >= 25 ? "good" : val >= 15 ? "watch" : "attention"
  if (key === "spo2") return val >= 95 ? "optimal" : val >= 92 ? "good" : "watch"
  return "not_tested"
}

function bloodStatus(key: string, val: number | null): PanelMetric["status"] {
  if (val == null || val === 0) return "not_tested"
  if (key === "hsCRP") return val < 0.5 ? "optimal" : val < 1.0 ? "good" : val < 3.0 ? "watch" : "attention"
  if (key === "ldl") return val < 100 ? "optimal" : val < 130 ? "good" : val < 160 ? "watch" : "attention"
  if (key === "hdl") return val >= 60 ? "optimal" : val >= 40 ? "good" : "watch"
  if (key === "trig") return val < 100 ? "optimal" : val < 150 ? "good" : val < 200 ? "watch" : "attention"
  if (key === "glucose") return val < 90 ? "optimal" : val < 100 ? "good" : val < 126 ? "watch" : "attention"
  if (key === "hba1c") return val < 5.4 ? "optimal" : val < 5.7 ? "good" : val < 6.5 ? "watch" : "attention"
  if (key === "vitD") return val >= 40 ? "optimal" : val >= 30 ? "good" : val >= 20 ? "watch" : "attention"
  return "not_tested"
}

function oralStatus(key: string, val: number): PanelMetric["status"] {
  if (key === "shannon") return val >= 4.0 ? "optimal" : val >= 3.0 ? "good" : val >= 2.0 ? "watch" : "attention"
  if (key === "nitrate") return val >= 10 ? "optimal" : val >= 5 ? "good" : val >= 2 ? "watch" : "attention"
  if (key === "perio") return val < 0.5 ? "optimal" : val < 1.0 ? "good" : val < 2.0 ? "watch" : "attention"
  if (key === "osa") return val < 0.5 ? "optimal" : val < 1.0 ? "good" : val < 2.0 ? "watch" : "attention"
  return "not_tested"
}

function buildInput(props: GuidanceClientProps): GuidanceInput | null {
  const { snapshot, lab, oral, sleepAvg } = props
  if (!snapshot) return null

  const sleepMetrics: PanelMetric[] = sleepAvg.nightsCount > 0 ? [
    { name: "deep_sleep", clinicalName: "Deep sleep", value: sleepAvg.deepPct.toFixed(1), unit: "%", status: sleepStatus("deep", sleepAvg.deepPct), target: "≥17%" },
    { name: "rem_sleep", clinicalName: "REM sleep", value: sleepAvg.remPct.toFixed(1), unit: "%", status: sleepStatus("rem", sleepAvg.remPct), target: "≥18%" },
    { name: "efficiency", clinicalName: "Sleep efficiency", value: sleepAvg.efficiency.toFixed(1), unit: "%", status: sleepStatus("efficiency", sleepAvg.efficiency), target: "≥85%" },
    { name: "hrv", clinicalName: "HRV (RMSSD)", value: sleepAvg.hrv.toFixed(0), unit: " ms", status: sleepStatus("hrv", sleepAvg.hrv), target: "Age-adjusted" },
    { name: "spo2", clinicalName: "SpO2", value: sleepAvg.spo2.toFixed(1), unit: "%", status: sleepStatus("spo2", sleepAvg.spo2), target: "≥95%" },
  ] : []

  const bloodMetrics: PanelMetric[] = lab ? [
    { name: "hsCRP", clinicalName: "hs-CRP", value: (lab.hs_crp_mgl as number) ?? 0, unit: " mg/L", status: bloodStatus("hsCRP", lab.hs_crp_mgl as number | null), target: "<0.5 mg/L" },
    { name: "ldl", clinicalName: "LDL cholesterol", value: (lab.ldl_mgdl as number) ?? 0, unit: " mg/dL", status: bloodStatus("ldl", lab.ldl_mgdl as number | null), target: "<100 mg/dL" },
    { name: "hdl", clinicalName: "HDL cholesterol", value: (lab.hdl_mgdl as number) ?? 0, unit: " mg/dL", status: bloodStatus("hdl", lab.hdl_mgdl as number | null), target: "≥60 mg/dL" },
    { name: "trig", clinicalName: "Triglycerides", value: (lab.triglycerides_mgdl as number) ?? 0, unit: " mg/dL", status: bloodStatus("trig", lab.triglycerides_mgdl as number | null), target: "<150 mg/dL" },
    { name: "glucose", clinicalName: "Fasting glucose", value: (lab.glucose_mgdl as number) ?? 0, unit: " mg/dL", status: bloodStatus("glucose", lab.glucose_mgdl as number | null), target: "<100 mg/dL" },
    { name: "hba1c", clinicalName: "HbA1c", value: (lab.hba1c_percent as number) ?? 0, unit: "%", status: bloodStatus("hba1c", lab.hba1c_percent as number | null), target: "<5.4%" },
    { name: "vitD", clinicalName: "Vitamin D", value: (lab.vitamin_d_ngml as number) ?? 0, unit: " ng/mL", status: bloodStatus("vitD", lab.vitamin_d_ngml as number | null), target: "30–60 ng/mL" },
  ].filter(m => m.status !== "not_tested") : []

  const oralMetrics: PanelMetric[] = oral ? [
    { name: "shannon", clinicalName: "Shannon diversity", value: ((oral.shannon_diversity as number) ?? 0).toFixed(1), unit: "", status: oralStatus("shannon", (oral.shannon_diversity as number) ?? 0), target: "≥3.0" },
    { name: "nitrate", clinicalName: "Nitrate-reducing bacteria", value: (((oral.nitrate_reducers_pct as number) ?? 0) * 100).toFixed(1), unit: "%", status: oralStatus("nitrate", ((oral.nitrate_reducers_pct as number) ?? 0) * 100), target: "≥5%" },
    { name: "perio", clinicalName: "Periodontal burden", value: (((oral.periodontopathogen_pct as number) ?? 0) * 100).toFixed(1), unit: "%", status: oralStatus("perio", ((oral.periodontopathogen_pct as number) ?? 0) * 100), target: "<0.5%" },
    { name: "osa", clinicalName: "OSA-associated taxa", value: (((oral.osa_taxa_pct as number) ?? 0) * 100).toFixed(1), unit: "%", status: oralStatus("osa", ((oral.osa_taxa_pct as number) ?? 0) * 100), target: "<1%" },
  ] : []

  const modifiers = (snapshot.modifiers_applied as Array<{ label: string; points: number; rationale: string; panels: string[] }>) ?? []
  const crossPanelSignals = modifiers.map(m => ({
    name: m.label,
    points: m.points,
    description: m.rationale,
    panels: m.panels ?? [],
  }))

  return {
    userAge: props.userAge,
    userSex: props.userSex,
    wearable: props.wearableProvider || "none",
    labSource: (lab?.lab_name as string) ?? "Unknown",
    labDate: (lab?.collected_at as string) ?? "Unknown",
    sleepScore: (snapshot.sleep_sub as number) ?? 0,
    sleepMax: 30,
    sleepMetrics,
    bloodScore: (snapshot.blood_sub as number) ?? 0,
    bloodMax: 40,
    bloodMetrics,
    oralScore: (snapshot.oral_sub as number) ?? 0,
    oralMax: 30,
    oralMetrics,
    crossPanelSignals,
  }
}

// ── Page Component ─────────────────────────────────────────────────────────

export function GuidanceClient(props: GuidanceClientProps) {
  const [guidance, setGuidance] = useState<GuidanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const input = buildInput(props)
    if (!input) { setLoading(false); return }

    fetch("/api/guidance/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed")
        return res.json()
      })
      .then(data => setGuidance(data as GuidanceResponse))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const attentionCards = guidance?.cards.filter(c => c.status === "attention") ?? []
  const watchCards = guidance?.cards.filter(c => c.status === "watch") ?? []

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "28px 24px 80px" }}>

        {/* Back link */}
        <Link href="/dashboard" style={{
          fontFamily: sans, fontSize: 12, color: "rgba(20,20,16,0.4)",
          textDecoration: "none", display: "inline-block", marginBottom: 24,
        }}>
          &larr; Dashboard
        </Link>

        <h1 style={{
          fontFamily: serif, fontSize: 28, fontWeight: 400,
          color: "#141410", lineHeight: 1.2, margin: "0 0 8px",
        }}>
          Your guidance
        </h1>
        <p style={{
          fontFamily: sans, fontSize: 13, color: "rgba(20,20,16,0.45)",
          lineHeight: 1.5, margin: "0 0 32px",
        }}>
          Based on your sleep, blood, and oral data — ordered by what matters most.
        </p>

        {/* Loading state */}
        {loading && (
          <>
            <GuidanceCardSkeleton />
            <GuidanceCardSkeleton />
            <GuidanceCardSkeleton />
          </>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            background: "#fff", borderRadius: 14,
            border: "0.5px solid rgba(0,0,0,0.06)",
            padding: "28px 24px", textAlign: "center",
          }}>
            <p style={{
              fontFamily: sans, fontSize: 13, color: "#888",
              lineHeight: 1.6, margin: 0,
            }}>
              We couldn&rsquo;t generate your guidance right now.<br />
              Try again in a moment.
            </p>
          </div>
        )}

        {/* Attention cards */}
        {!loading && !error && guidance && attentionCards.length > 0 && (
          <>
            <span style={{
              fontFamily: sans, fontSize: 10, letterSpacing: "2px",
              textTransform: "uppercase", color: "#791F1F",
              display: "block", marginBottom: 14,
            }}>
              Needs attention
            </span>
            {attentionCards.map((card, i) => (
              <GuidanceCard key={`attn-${i}`} card={card} />
            ))}
          </>
        )}

        {/* Watch cards */}
        {!loading && !error && guidance && watchCards.length > 0 && (
          <>
            <span style={{
              fontFamily: sans, fontSize: 10, letterSpacing: "2px",
              textTransform: "uppercase", color: "#633806",
              display: "block", marginBottom: 14, marginTop: attentionCards.length > 0 ? 24 : 0,
            }}>
              Worth watching
            </span>
            {watchCards.map((card, i) => (
              <GuidanceCard key={`watch-${i}`} card={card} />
            ))}
          </>
        )}

        {/* Good metrics */}
        {!loading && !error && guidance && guidance.goodMetrics.length > 0 && (
          <>
            <span style={{
              fontFamily: sans, fontSize: 10, letterSpacing: "2px",
              textTransform: "uppercase", color: "#085041",
              display: "block", marginBottom: 14, marginTop: 32,
            }}>
              Working well
            </span>
            {guidance.goodMetrics.map((m, i) => (
              <GoodMetricCard key={`good-${i}`} metric={m} />
            ))}
          </>
        )}

        {/* No data state */}
        {!loading && !error && !guidance && (
          <div style={{
            background: "#fff", borderRadius: 14,
            border: "0.5px solid rgba(0,0,0,0.06)",
            padding: "28px 24px", textAlign: "center",
          }}>
            <p style={{
              fontFamily: sans, fontSize: 13, color: "#888",
              lineHeight: 1.6, margin: 0,
            }}>
              Not enough panel data to generate guidance yet.<br />
              Connect a wearable, upload labs, or order an oral kit.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// PATTERN: Every marker section in this file uses evaluateConnection() + <ConnectionLineCard />.
// See docs/CONNECTION_LINE_PATTERN.md for the standard.
"use client"

import { useState } from "react"
import Link from "next/link"
import { Nav } from "../../components/nav"
import { evaluateConnection } from "@peaq/score-engine"
import { ConnectionLineCard } from "../../components/connection-line"

// ─── Marker definitions ─────────────────────────────────────────────────────

interface MarkerDef {
  key: string
  name: string
  unit: string
  target: string
  optimalRange: [number, number]
  normalRange: [number, number]
  displayMax: number
  inverted?: boolean // lower is better (e.g. hsCRP, LDL)
}

const CARDIOVASCULAR: MarkerDef[] = [
  { key: "ldl_mgdl",           name: "LDL Cholesterol",  unit: "mg/dL", target: "<100",     optimalRange: [0, 100],  normalRange: [0, 130],  displayMax: 300, inverted: true },
  { key: "hdl_mgdl",           name: "HDL Cholesterol",  unit: "mg/dL", target: ">50",      optimalRange: [50, 90],  normalRange: [40, 100], displayMax: 120 },
  { key: "triglycerides_mgdl", name: "Triglycerides",    unit: "mg/dL", target: "<150",     optimalRange: [0, 100],  normalRange: [0, 150],  displayMax: 400, inverted: true },
  { key: "apob_mgdl",          name: "ApoB",             unit: "mg/dL", target: "<90",      optimalRange: [0, 80],   normalRange: [0, 100],  displayMax: 200, inverted: true },
  { key: "lpa_mgdl",           name: "Lp(a)",            unit: "nmol/L", target: "<75",      optimalRange: [0, 75],   normalRange: [0, 125],   displayMax: 375, inverted: true },
  { key: "totalcholesterol_mgdl", name: "Total Cholesterol", unit: "mg/dL", target: "<200", optimalRange: [0, 200],  normalRange: [0, 240],  displayMax: 400, inverted: true },
]

const INFLAMMATION: MarkerDef[] = [
  { key: "hs_crp_mgl",  name: "hs-CRP",   unit: "mg/L",  target: "<0.5",  optimalRange: [0, 0.5],  normalRange: [0, 2.0],  displayMax: 10, inverted: true },
  { key: "wbc_kul",      name: "WBC",       unit: "K/uL",  target: "4-10",  optimalRange: [4, 10],   normalRange: [3.4, 10.8], displayMax: 20 },
  { key: "rdw_pct",      name: "RDW",       unit: "%",     target: "<14",   optimalRange: [11, 14],  normalRange: [11, 15],  displayMax: 20, inverted: true },
  { key: "albumin_gdl",  name: "Albumin",   unit: "g/dL",  target: ">4.0",  optimalRange: [4.0, 5.5], normalRange: [3.5, 5.5], displayMax: 6 },
]

const METABOLIC: MarkerDef[] = [
  { key: "glucose_mgdl",         name: "Glucose",          unit: "mg/dL", target: "<100",   optimalRange: [65, 99],   normalRange: [65, 110],  displayMax: 200, inverted: true },
  { key: "hba1c_pct",            name: "HbA1c",            unit: "%",     target: "<5.4",   optimalRange: [4, 5.4],   normalRange: [4, 5.7],   displayMax: 10, inverted: true },
  { key: "fastinginsulin_uiuml", name: "Fasting Insulin",  unit: "uIU/mL", target: "<8",   optimalRange: [2, 8],     normalRange: [2, 20],    displayMax: 30, inverted: true },
  { key: "uricacid_mgdl",        name: "Uric Acid",        unit: "mg/dL", target: "<6",     optimalRange: [3, 6],     normalRange: [2, 7],     displayMax: 12, inverted: true },
]

const ORGAN: MarkerDef[] = [
  { key: "egfr_mlmin",            name: "eGFR",         unit: "mL/min", target: ">90",    optimalRange: [90, 200],   normalRange: [60, 200],  displayMax: 150 },
  { key: "creatinine_mgdl",       name: "Creatinine",   unit: "mg/dL",  target: "0.7-1.3", optimalRange: [0.7, 1.3], normalRange: [0.6, 1.4], displayMax: 3 },
  { key: "bun_mgdl",              name: "BUN",          unit: "mg/dL",  target: "7-20",   optimalRange: [7, 20],     normalRange: [6, 24],    displayMax: 50 },
  { key: "alt_ul",                name: "ALT",          unit: "U/L",    target: "<33",    optimalRange: [5, 33],     normalRange: [5, 56],    displayMax: 100, inverted: true },
  { key: "ast_ul",                name: "AST",          unit: "U/L",    target: "<33",    optimalRange: [5, 33],     normalRange: [5, 40],    displayMax: 100, inverted: true },
  { key: "alkphos_ul",            name: "Alk Phos",     unit: "U/L",    target: "44-147", optimalRange: [44, 120],   normalRange: [44, 147],  displayMax: 200 },
  { key: "totalbilirubin_mgdl",   name: "Bilirubin",    unit: "mg/dL",  target: "<1.2",   optimalRange: [0.1, 1.0], normalRange: [0.1, 1.2], displayMax: 3, inverted: true },
  { key: "potassium_mmoll",       name: "Potassium",    unit: "mmol/L", target: "3.5-5",  optimalRange: [3.5, 5.0], normalRange: [3.5, 5.3], displayMax: 7 },
]

const MICRONUTRIENTS: MarkerDef[] = [
  { key: "vitamin_d_ngml",  name: "Vitamin D",   unit: "ng/mL", target: "30-60",   optimalRange: [30, 60],  normalRange: [20, 80],  displayMax: 100 },
  { key: "hemoglobin_gdl",  name: "Hemoglobin",  unit: "g/dL",  target: "13-17",   optimalRange: [13, 17],  normalRange: [12, 18],  displayMax: 20 },
  { key: "mcv_fl",           name: "MCV",         unit: "fL",    target: "80-100",  optimalRange: [80, 100], normalRange: [78, 102], displayMax: 120 },
  { key: "ferritin_ngml",   name: "Ferritin",    unit: "ng/mL", target: "30-150",  optimalRange: [30, 150], normalRange: [20, 300], displayMax: 400 },
]

const HORMONES: MarkerDef[] = [
  { key: "tsh_uiuml",         name: "TSH",              unit: "uIU/mL", target: "0.5-3",   optimalRange: [0.5, 3],   normalRange: [0.4, 4.0],  displayMax: 8 },
  { key: "testosterone_ngdl", name: "Testosterone",     unit: "ng/dL",  target: "400-900", optimalRange: [400, 900], normalRange: [264, 916],  displayMax: 1200 },
  { key: "freetesto_pgml",    name: "Free Testosterone", unit: "pg/mL", target: "8-21",    optimalRange: [8, 21],    normalRange: [6, 25],     displayMax: 35 },
  { key: "shbg_nmoll",        name: "SHBG",             unit: "nmol/L", target: "16-56",   optimalRange: [16, 56],   normalRange: [10, 80],    displayMax: 100 },
]

const ADDITIONAL_KEYS = [
  "hematocrit_pct", "platelets_kul", "rbc_mil", "mch_pg", "mchc_gdl",
  "neutrophils_pct", "lymphs_pct", "sodium_mmoll", "chloride_mmoll",
  "co2_mmoll", "calcium_mgdl", "totalprotein_gdl", "globulin_gdl", "vldl_mgdl",
]

const ADDITIONAL_NAMES: Record<string, { name: string; unit: string }> = {
  hematocrit_pct: { name: "Hematocrit", unit: "%" },
  platelets_kul: { name: "Platelets", unit: "K/uL" },
  rbc_mil: { name: "RBC", unit: "M/uL" },
  mch_pg: { name: "MCH", unit: "pg" },
  mchc_gdl: { name: "MCHC", unit: "g/dL" },
  neutrophils_pct: { name: "Neutrophils", unit: "%" },
  lymphs_pct: { name: "Lymphs", unit: "%" },
  sodium_mmoll: { name: "Sodium", unit: "mmol/L" },
  chloride_mmoll: { name: "Chloride", unit: "mmol/L" },
  co2_mmoll: { name: "CO2", unit: "mmol/L" },
  calcium_mgdl: { name: "Calcium", unit: "mg/dL" },
  totalprotein_gdl: { name: "Total Protein", unit: "g/dL" },
  globulin_gdl: { name: "Globulin", unit: "g/dL" },
  vldl_mgdl: { name: "VLDL", unit: "mg/dL" },
}

// ─── Clinical zone definitions ───────────────────────────────────────────────

const BLOOD_ZONES: Record<string, {
  zones: { label: string; color: string; min: number; max: number }[]
  markerColor: string
}> = {
  ldl_mgdl:             { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 70 }, { label: 'Good', color: '#FFF3CD', min: 70, max: 100 }, { label: 'Watch', color: '#FFE0B2', min: 100, max: 130 }, { label: 'High', color: '#FFCDD2', min: 130, max: 200 }] },
  hdl_mgdl:             { markerColor: '#A32D2D', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 40 }, { label: 'Watch', color: '#FFE0B2', min: 40, max: 50 }, { label: 'Good', color: '#FFF3CD', min: 50, max: 60 }, { label: 'Optimal', color: '#D4EDDA', min: 60, max: 100 }] },
  triglycerides_mgdl:   { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 100 }, { label: 'Good', color: '#FFF3CD', min: 100, max: 150 }, { label: 'Watch', color: '#FFE0B2', min: 150, max: 200 }, { label: 'High', color: '#FFCDD2', min: 200, max: 400 }] },
  apob_mgdl:            { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 80 }, { label: 'Good', color: '#FFF3CD', min: 80, max: 100 }, { label: 'Watch', color: '#FFE0B2', min: 100, max: 130 }, { label: 'High', color: '#FFCDD2', min: 130, max: 200 }] },
  lpa_mgdl:             { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 75 }, { label: 'Watch', color: '#FFE0B2', min: 75, max: 125 }, { label: 'High', color: '#FFCDD2', min: 125, max: 375 }] },
  totalcholesterol_mgdl:{ markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 200 }, { label: 'Good', color: '#FFF3CD', min: 200, max: 240 }, { label: 'High', color: '#FFCDD2', min: 240, max: 400 }] },
  hs_crp_mgl:           { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 0.5 }, { label: 'Good', color: '#FFF3CD', min: 0.5, max: 1.0 }, { label: 'Watch', color: '#FFE0B2', min: 1.0, max: 3.0 }, { label: 'High', color: '#FFCDD2', min: 3.0, max: 10.0 }] },
  wbc_kul:              { markerColor: '#A32D2D', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 4 }, { label: 'Optimal', color: '#D4EDDA', min: 4, max: 10 }, { label: 'Watch', color: '#FFE0B2', min: 10, max: 15 }, { label: 'High', color: '#FFCDD2', min: 15, max: 20 }] },
  albumin_gdl:          { markerColor: '#A32D2D', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 3.5 }, { label: 'Watch', color: '#FFE0B2', min: 3.5, max: 4.0 }, { label: 'Optimal', color: '#D4EDDA', min: 4.0, max: 5.5 }] },
  glucose_mgdl:         { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 65, max: 85 }, { label: 'Good', color: '#FFF3CD', min: 85, max: 99 }, { label: 'Watch', color: '#FFE0B2', min: 99, max: 125 }, { label: 'High', color: '#FFCDD2', min: 125, max: 200 }] },
  hba1c_pct:            { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 4, max: 5.4 }, { label: 'Good', color: '#FFF3CD', min: 5.4, max: 5.7 }, { label: 'Watch', color: '#FFE0B2', min: 5.7, max: 6.5 }, { label: 'High', color: '#FFCDD2', min: 6.5, max: 10 }] },
  fastinginsulin_uiuml: { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 2, max: 8 }, { label: 'Watch', color: '#FFE0B2', min: 8, max: 20 }, { label: 'High', color: '#FFCDD2', min: 20, max: 30 }] },
  uricacid_mgdl:        { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 3, max: 6 }, { label: 'Watch', color: '#FFE0B2', min: 6, max: 7 }, { label: 'High', color: '#FFCDD2', min: 7, max: 12 }] },
  egfr_mlmin:           { markerColor: '#A32D2D', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 60 }, { label: 'Watch', color: '#FFE0B2', min: 60, max: 90 }, { label: 'Good', color: '#FFF3CD', min: 90, max: 105 }, { label: 'Optimal', color: '#D4EDDA', min: 105, max: 150 }] },
  creatinine_mgdl:      { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0.7, max: 1.3 }, { label: 'Watch', color: '#FFE0B2', min: 1.3, max: 1.5 }, { label: 'High', color: '#FFCDD2', min: 1.5, max: 3.0 }] },
  bun_mgdl:             { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 7, max: 20 }, { label: 'Watch', color: '#FFE0B2', min: 20, max: 30 }, { label: 'High', color: '#FFCDD2', min: 30, max: 50 }] },
  alt_ul:               { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 5, max: 33 }, { label: 'Watch', color: '#FFE0B2', min: 33, max: 56 }, { label: 'High', color: '#FFCDD2', min: 56, max: 100 }] },
  ast_ul:               { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 5, max: 33 }, { label: 'Watch', color: '#FFE0B2', min: 33, max: 40 }, { label: 'High', color: '#FFCDD2', min: 40, max: 100 }] },
  vitamin_d_ngml:       { markerColor: '#A32D2D', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 20 }, { label: 'Watch', color: '#FFE0B2', min: 20, max: 30 }, { label: 'Good', color: '#FFF3CD', min: 30, max: 50 }, { label: 'Optimal', color: '#D4EDDA', min: 50, max: 100 }] },
  hemoglobin_gdl:       { markerColor: '#A32D2D', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 12.0 }, { label: 'Watch', color: '#FFE0B2', min: 12.0, max: 13.5 }, { label: 'Good', color: '#FFF3CD', min: 13.5, max: 14.5 }, { label: 'Optimal', color: '#D4EDDA', min: 14.5, max: 18.0 }] },
  tsh_uiuml:            { markerColor: '#A32D2D', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 0.5 }, { label: 'Optimal', color: '#D4EDDA', min: 0.5, max: 3.0 }, { label: 'Watch', color: '#FFE0B2', min: 3.0, max: 4.0 }, { label: 'High', color: '#FFCDD2', min: 4.0, max: 8.0 }] },
  testosterone_ngdl:    { markerColor: '#A32D2D', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 300 }, { label: 'Watch', color: '#FFE0B2', min: 300, max: 400 }, { label: 'Good', color: '#FFF3CD', min: 400, max: 700 }, { label: 'Optimal', color: '#D4EDDA', min: 700, max: 1200 }] },
  ferritin_ngml:        { markerColor: '#A32D2D', zones: [{ label: 'Low', color: '#FFCDD2', min: 0, max: 20 }, { label: 'Watch', color: '#FFE0B2', min: 20, max: 30 }, { label: 'Good', color: '#FFF3CD', min: 30, max: 100 }, { label: 'Optimal', color: '#D4EDDA', min: 100, max: 300 }] },
  ldl_hdl_ratio:        { markerColor: '#A32D2D', zones: [{ label: 'Optimal', color: '#D4EDDA', min: 0, max: 1.5 }, { label: 'Good', color: '#FFF3CD', min: 1.5, max: 2.0 }, { label: 'Watch', color: '#FFE0B2', min: 2.0, max: 3.0 }, { label: 'High', color: '#FFCDD2', min: 3.0, max: 5.0 }] },
}

function RangeBar({ value, markerKey }: { value: number | null; markerKey: string }) {
  const config = BLOOD_ZONES[markerKey]
  if (!config || value === null || value === 0) return null

  const zones = config.zones
  const totalMin = zones[0].min
  const totalMax = zones[zones.length - 1].max
  const totalRange = totalMax - totalMin
  const clampedValue = Math.max(totalMin, Math.min(totalMax, value))
  const markerPct = ((clampedValue - totalMin) / totalRange) * 100
  const zonePcts = zones.map(z => ((z.max - z.min) / totalRange) * 100)

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center', flex: 1 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '8px', display: 'flex', borderRadius: '4px', overflow: 'hidden', gap: '1px' }}>
          {zones.map((zone, i) => (
            <div key={i} style={{
              flex: zone.max - zone.min,
              background: zone.color,
            }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', left: `${markerPct}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px', height: '12px', borderRadius: '50%',
          background: config.markerColor,
          border: '2px solid white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          zIndex: 2,
          pointerEvents: 'none',
        }} />
      </div>
      <div style={{ display: 'flex', marginTop: '4px', gap: '1px' }}>
        {zones.map((zone, i) => (
          <div key={i} style={{
            flex: zone.max - zone.min,
            fontSize: '9px', color: 'var(--ink-30)', textAlign: 'center' as const,
            letterSpacing: '0.04em', textTransform: 'uppercase' as const,
            overflow: 'hidden', whiteSpace: 'nowrap' as const,
            userSelect: 'none' as const,
          }}>
            {zone.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Status helpers ─────────────────────────────────────────────────────────

type MarkerStatus = "optimal" | "good" | "watch" | "attention" | "retest" | "not_tested"

const STATUS_STYLES: Record<MarkerStatus, { bg: string; text: string; label: string; dot: string }> = {
  optimal:    { bg: "#EAF3DE", text: "#3B6D11", label: "Optimal",   dot: "#3B6D11" },
  good:       { bg: "#EBF2FA", text: "#185FA5", label: "Good",      dot: "#185FA5" },
  watch:      { bg: "#FEF3C7", text: "#92400E", label: "Watch",     dot: "#C49A3C" },
  attention:  { bg: "#FEE2E2", text: "#991B1B", label: "Attention", dot: "#A32D2D" },
  retest:     { bg: "#FEF3C7", text: "#92400E", label: "Retest",    dot: "#C49A3C" },
  not_tested: { bg: "#F7F5F0", text: "var(--ink-35)", label: "—", dot: "var(--ink-20)" },
}

function getStatus(val: number | null, def: MarkerDef, isHsCRP?: boolean): MarkerStatus {
  if (val === null || val === 0) return "not_tested"
  if (isHsCRP && val > 10) return "retest"
  const [optLo, optHi] = def.optimalRange
  const [normLo, normHi] = def.normalRange
  if (def.inverted) {
    if (val <= optHi) return "optimal"
    if (val <= normHi) return "good"
    if (val <= normHi * 1.2) return "watch"
    return "attention"
  }
  if (val >= optLo && val <= optHi) return "optimal"
  if (val >= normLo && val <= normHi) return "good"
  const margin = (normHi - normLo) * 0.2
  if (val >= normLo - margin && val <= normHi + margin) return "watch"
  return "attention"
}

function getVal(lab: Record<string, unknown> | null, key: string): number | null {
  if (!lab) return null
  const v = lab[key]
  if (typeof v === "number" && v > 0) {
    // Lp(a) stored as mg/dL in DB — convert to nmol/L for display
    if (key === "lpa_mgdl") return Math.round(v * 2.5 * 10) / 10
    return v
  }
  return null
}

// ─── Collapsible section ────────────────────────────────────────────────────

function Section({
  title, defaultOpen, children,
}: {
  title: string; defaultOpen: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 0 8px", border: "none", background: "transparent", cursor: "pointer",
          borderBottom: "0.5px solid var(--ink-12)",
        }}
      >
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)", fontWeight: 600 }}>{title}</span>
        <span style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 16, color: "var(--ink-30)", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "0.5px solid var(--ink-12)", borderRadius: "50%" }}>
          {open ? "−" : "+"}
        </span>
      </button>
      <div style={{ maxHeight: open ? 2000 : 0, opacity: open ? 1 : 0, overflow: "hidden", transition: "max-height 0.3s ease, opacity 0.3s ease" }}>
        {children}
      </div>
    </div>
  )
}

// ─── Marker row with spectrum bar ───────────────────────────────────────────

const DB_KEY_TO_MARKER_ID: Record<string, string> = {
  hs_crp_mgl: "hs_crp", ldl_mgdl: "ldl", vitamin_d_ngml: "vitamin_d",
  hba1c_pct: "hba1c", glucose_mgdl: "glucose", lpa_mgdl: "lpa",
  hdl_mgdl: "hdl", triglycerides_mgdl: "triglycerides",
  wbc_kul: "wbc", rdw_pct: "rdw", mpv_fl: "mpv",
}

function MarkerRow({ val, def, isHsCRP }: { val: number | null; def: MarkerDef; isHsCRP?: boolean }) {
  const status = getStatus(val, def, isHsCRP)
  const s = STATUS_STYLES[status]
  const notTested = status === "not_tested"
  const markerId = DB_KEY_TO_MARKER_ID[def.key]
  const Wrapper = markerId ? Link : "div" as unknown as typeof Link

  return (
    <Wrapper href={markerId ? `/dashboard/blood/${markerId}` : "#"} style={{ display: "block", textDecoration: "none", color: "inherit", cursor: markerId ? "pointer" : "default" }}>
    <div style={{ padding: "12px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {notTested ? (
            <span style={{ fontSize: 12, color: s.dot }}>—</span>
          ) : (
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
          )}
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: notTested ? "var(--ink-30)" : "var(--ink)", fontStyle: notTested ? "italic" : "normal" }}>
            {def.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: notTested ? "var(--ink-30)" : "var(--ink)" }}>
            {notTested ? "Not tested" : val}
          </span>
          {!notTested && <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-30)" }}>{def.unit}</span>}
          <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", borderRadius: 3, background: s.bg, color: s.text }}>
            {s.label}
          </span>
        </div>
      </div>
      {!notTested && (
        <>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", margin: "2px 0 0 18px" }}>
            Target {def.target}
          </p>
          <div style={{ margin: "0 0 0 18px" }}>
            {BLOOD_ZONES[def.key] ? (
              <RangeBar value={val} markerKey={def.key} />
            ) : (
              /* Fallback spectrum bar for markers without zone definitions */
              <div style={{ marginTop: 6, position: "relative", height: 12 }}>
                <div style={{ position: "absolute", top: 5, left: 0, right: 0, height: 1, background: "var(--ink-08)" }} />
                <div style={{
                  position: "absolute", top: 3, height: 5, borderRadius: 2,
                  left: `${(def.optimalRange[0] / def.displayMax) * 100}%`,
                  width: `${((def.optimalRange[1] - def.optimalRange[0]) / def.displayMax) * 100}%`,
                  background: "rgba(45,106,79,0.12)",
                }} />
                <div style={{
                  position: "absolute", top: 1, width: 8, height: 8, borderRadius: "50%",
                  background: s.dot,
                  left: `${Math.min((val! / def.displayMax) * 100, 100)}%`,
                  transform: "translateX(-50%)",
                }} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </Wrapper>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

interface Props {
  lab: Record<string, unknown> | null
  snapshot: Record<string, unknown> | null
  history: Array<Record<string, unknown>>
  ageRange?: string
  stressLevel?: string
  periodontPathPct?: number
  connectionInput?: import("@peaq/score-engine").ConnectionInput
}

function ageAtLeast(ageRange: string | undefined, minAge: number): boolean {
  const MIN: Record<string, number> = { "18_29": 18, "30_39": 30, "40_49": 40, "50_59": 50, "60_69": 60, "70_plus": 70 }
  return (MIN[ageRange ?? ""] ?? 0) >= minAge
}

type MissingMarker = { key: string; name: string; pts: number; reason: string }

export function BloodPanelClient({ lab, snapshot, history, ageRange, stressLevel, periodontPathPct, connectionInput }: Props) {
  const bloodScore = snapshot?.blood_sub as number | undefined
  const lpaFlag = snapshot?.lpa_flag as string | undefined
  const hsCRPRetestFlag = snapshot?.hscrp_retest_flag as boolean | undefined
  const bloodInsight = lab?.blood_insight as string | undefined
  const collectionDate = lab?.collection_date as string | undefined

  const hasData = !!lab
  const [openMissingTooltip, setOpenMissingTooltip] = useState<string | null>(null)

  function renderSection(title: string, defs: MarkerDef[], defaultOpen: boolean) {
    const hasAny = defs.some(d => getVal(lab, d.key) !== null)
    if (!hasData) return null
    return (
      <Section title={title} defaultOpen={hasAny && defaultOpen}>
        {defs.map(d => (
          <MarkerRow key={d.key} val={getVal(lab, d.key)} def={d} isHsCRP={d.key === "hs_crp_mgl"} />
        ))}
      </Section>
    )
  }

  // Additional markers
  const additionalFound = ADDITIONAL_KEYS
    .map(k => ({ key: k, val: getVal(lab, k), ...(ADDITIONAL_NAMES[k] ?? { name: k, unit: "" }) }))
    .filter(m => m.val !== null)

  // Missing scored markers — gated by relevance
  const missing: MissingMarker[] = []
  const glucose = getVal(lab, "glucose_mgdl") ?? 0
  const ldl     = getVal(lab, "ldl_mgdl") ?? 0
  const tg      = getVal(lab, "triglycerides_mgdl") ?? 0

  if (getVal(lab, "hba1c_pct") === null) {
    if (glucose >= 95) {
      missing.push({ key: "hba1c_pct", name: "HbA1c", pts: 3, reason: `Your fasting glucose of ${glucose} mg/dL is approaching the pre-diabetic threshold — HbA1c would confirm whether this reflects a sustained trend.` })
    } else if (ageAtLeast(ageRange, 40)) {
      missing.push({ key: "hba1c_pct", name: "HbA1c", pts: 3, reason: `Routine HbA1c screening is recommended after 40, even with normal fasting glucose, to catch early glycemic drift.` })
    }
  }
  if (getVal(lab, "hs_crp_mgl") === null) {
    if (ldl > 120) {
      missing.push({ key: "hs_crp_mgl", name: "hs-CRP", pts: 3, reason: `Your LDL is running higher than the typical range at ${ldl} mg/dL — hs-CRP would add inflammatory context worth discussing with your doctor.` })
    } else if ((periodontPathPct ?? 0) > 10) {
      missing.push({ key: "hs_crp_mgl", name: "hs-CRP", pts: 3, reason: `Elevated periodontal pathogens in your oral panel are linked to systemic inflammation — hs-CRP would confirm whether this is reaching your bloodstream.` })
    } else if (stressLevel === "high") {
      missing.push({ key: "hs_crp_mgl", name: "hs-CRP", pts: 3, reason: `Chronic stress elevates CRP directly. With high self-reported stress, knowing your hs-CRP baseline is clinically actionable.` })
    }
  }
  if (getVal(lab, "vitamin_d_ngml") === null && ageAtLeast(ageRange, 40)) {
    missing.push({ key: "vitamin_d_ngml", name: "Vitamin D", pts: 2, reason: `Vitamin D absorption declines with age. Deficiency is common after 40 and directly affects bone density, immune function, and mood.` })
  }
  if (getVal(lab, "apob_mgdl") === null) {
    if (ldl > 120) {
      missing.push({ key: "apob_mgdl", name: "ApoB", pts: 2, reason: `Your LDL of ${ldl} mg/dL is elevated — ApoB counts the actual particle number, which predicts cardiovascular risk more accurately than LDL alone.` })
    } else if (tg > 100) {
      missing.push({ key: "apob_mgdl", name: "ApoB", pts: 2, reason: `Your triglycerides of ${tg} mg/dL suggest metabolic dysregulation — ApoB would quantify the atherogenic particle burden.` })
    }
  }
  if (getVal(lab, "lpa_mgdl") === null) {
    missing.push({ key: "lpa_mgdl", name: "Lp(a)", pts: 1, reason: `Lp(a) is a genetic cardiovascular risk factor that cannot be modified by diet or exercise. A single test tells you whether it belongs in your prevention strategy.` })
  }

  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 36, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Blood</h1>
            {bloodScore !== undefined && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-30)" }}>PhenoAge panel</span>
            )}
          </div>
          <Link
            href="/settings/labs"
            style={{ fontFamily: "var(--font-body)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-30)", textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#C49A3C" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-30)" }}
          >
            ↑ Re-upload labs
          </Link>
        </div>

        {collectionDate && (
          <p style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)", margin: "0 0 24px" }}>
            LAB · {new Date(collectionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
          </p>
        )}

        {/* Flags */}
        {lpaFlag && (lpaFlag === "elevated" || lpaFlag === "very_elevated") && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, borderRadius: 4, background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)" }}>
            <span style={{ color: "#d97706" }}>⚑</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#92400e" }}>
              Lp(a) {lpaFlag === "very_elevated" ? "very elevated (>125 nmol/L)" : "elevated (75–125 nmol/L)"}. Genetic cardiovascular risk factor — discuss with your physician.
            </span>
          </div>
        )}

        {hsCRPRetestFlag && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, borderRadius: 4, background: "rgba(220,38,38,0.06)", border: "0.5px solid rgba(220,38,38,0.2)" }}>
            <span style={{ color: "#dc2626" }}>↑</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#991b1b" }}>
              hsCRP &gt;10 mg/L may indicate acute inflammation. Retest in 2–4 weeks once resolved.
            </span>
          </div>
        )}

        {/* AI Insight */}
        {bloodInsight && (
          <p style={{
            fontFamily: "var(--font-manrope), system-ui, sans-serif", fontStyle: "italic", fontSize: 17,
            color: "var(--ink-65)", lineHeight: 1.55, margin: "0 0 24px",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {bloodInsight}
          </p>
        )}

        {!hasData && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)" }}>No lab results uploaded yet.</p>
            <Link href="/settings/labs" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--gold)", display: "inline-block", marginTop: 12 }}>
              Upload your blood panel →
            </Link>
          </div>
        )}

        {/* Sub-panels with connection lines */}
        {renderSection("Cardiovascular Lipids", CARDIOVASCULAR, true)}
        {connectionInput && <ConnectionLineCard connection={evaluateConnection("cholesterol", connectionInput)} />}
        {renderSection("Inflammation & Resilience", INFLAMMATION, true)}
        {connectionInput && <ConnectionLineCard connection={evaluateConnection("inflammation", connectionInput)} />}
        {renderSection("Metabolic", METABOLIC, true)}
        {connectionInput && <ConnectionLineCard connection={evaluateConnection("blood_sugar", connectionInput)} />}
        {renderSection("Organ Function", ORGAN, true)}
        {renderSection("Micronutrients", MICRONUTRIENTS, true)}
        {connectionInput && <ConnectionLineCard connection={evaluateConnection("vitamin_levels", connectionInput)} />}
        {renderSection("Hormones", HORMONES, true)}

        {/* Additional markers */}
        {additionalFound.length > 0 && (
          <Section title="Additional Markers" defaultOpen={false}>
            {additionalFound.map(m => (
              <div key={m.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--ink-06)" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)" }}>{m.name}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink)" }}>{m.val}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-30)" }}>{m.unit}</span>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Missing markers CTA */}
        {missing.length > 0 && hasData && (
          <div style={{ marginTop: 32, marginBottom: 32 }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--ink-30)", marginBottom: 3 }}>
              Consider testing
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--ink-30)", marginBottom: 10, opacity: 0.7 }}>
              Based on your current results
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {missing.map(m => (
                <div key={m.key} style={{ position: "relative" }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", border: "0.5px solid var(--ink-12)", borderRadius: 3,
                  }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-60)" }}>
                      {m.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#C49A3C" }}>
                      +{m.pts} pts
                    </span>
                    <button
                      onClick={() => setOpenMissingTooltip(openMissingTooltip === m.key ? null : m.key)}
                      style={{
                        width: 15, height: 15, borderRadius: "50%",
                        border: "0.5px solid #C49A3C", background: "transparent",
                        cursor: "pointer", fontSize: 9, color: "#C49A3C",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1, flexShrink: 0, padding: 0, fontFamily: "var(--font-body)",
                      }}
                      aria-label={`Why test ${m.name}`}
                    >
                      i
                    </button>
                  </div>
                  {openMissingTooltip === m.key && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20,
                      padding: "10px 12px", background: "var(--white)",
                      border: "0.5px solid rgba(184,134,11,0.4)", borderRadius: 4,
                      fontSize: 12, fontFamily: "var(--font-body)", color: "var(--ink)",
                      lineHeight: 1.55, minWidth: 220, maxWidth: 320,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                    }}>
                      {m.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past results */}
        {history.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 20, fontWeight: 300, color: "var(--ink)", margin: "0 0 12px" }}>Past results</h3>
            <div style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", padding: "8px 16px", borderBottom: "0.5px solid var(--ink-12)" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)" }}>Date</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)", textAlign: "right" }}>Blood</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)", textAlign: "right" }}>Total</span>
              </div>
              {history.map((h, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", padding: "10px 16px", borderBottom: "0.5px solid var(--ink-06)" }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)" }}>
                    {h.collection_date ? new Date(h.collection_date as string).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                  </span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink)", textAlign: "right" }}>{String(h.blood_score ?? "—")}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink)", textAlign: "right" }}>{String(h.total_score ?? "—")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 16, marginBottom: 16 }}>
          <a href="/dashboard/converge" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#B8860B", textDecoration: "none", fontWeight: 500 }}>
            See how this connects to your other panels →
          </a>
        </div>
      </main>
    </div>
  )
}

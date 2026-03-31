import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import type { ReportData } from "./report-data"

// Letter = 612×792 pts. 0.75in margin = 54 pts.
const MARGIN = 54
const CONTENT_W = 612 - MARGIN * 2   // 504 pts

const INK     = "#141410"
const INK_60  = "#666660"
const INK_40  = "#888880"
const INK_20  = "#C8C8C4"
const INK_12  = "#E8E8E4"
const WARM    = "#F7F5F0"
const RED     = "#C0392B"
const BLUE    = "#4A7FB5"
const GREEN   = "#2D6A4F"
const GOLD    = "#B8860B"

const OPT_BG  = "#D4EDDA"; const OPT_FG  = "#2D6A4F"
const GOOD_BG = "#FFF3CD"; const GOOD_FG = "#856404"
const WTCH_BG = "#FFE0B2"; const WTCH_FG = "#664D03"
const ELEV_BG = "#FFCDD2"; const ELEV_FG = "#C0392B"
const NT_BG   = "#F0F0EE"; const NT_FG   = "#888880"

const s = StyleSheet.create({
  page:       { fontFamily: "Helvetica", fontSize: 10, color: INK, paddingTop: MARGIN, paddingBottom: MARGIN + 20, paddingLeft: MARGIN, paddingRight: MARGIN, lineHeight: 1.5 },
  hdr:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: INK_20, paddingBottom: 8, marginBottom: 18 },
  hdrL:       { fontSize: 8, color: INK_40, textTransform: "uppercase", letterSpacing: 1 },
  hdrR:       { fontSize: 8, color: INK_40 },
  secLabel:   { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.5, color: INK_40, marginBottom: 6 },
  body:       { fontSize: 10, color: INK, lineHeight: 1.6 },
  bodyS:      { fontSize: 9, color: INK_60, lineHeight: 1.6 },
  tblHdr:     { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: INK_20, paddingBottom: 4, marginBottom: 2 },
  tblHdrCell: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1, color: INK_40 },
  tblRow:     { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: INK_12 },
  tblCell:    { fontSize: 10, color: INK },
  ctx:        { backgroundColor: WARM, borderLeftWidth: 2, borderLeftColor: GOLD, padding: 10, marginBottom: 8 },
  ctxTitle:   { fontSize: 9, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 3 },
  ctxBody:    { fontSize: 9, color: INK_60, lineHeight: 1.6 },
  ctxSrc:     { fontSize: 8, color: INK_40, marginTop: 4 },
  hr:         { borderBottomWidth: 0.5, borderBottomColor: INK_12, marginVertical: 10 },
  footer:     { position: "absolute", bottom: MARGIN - 8, left: MARGIN, right: MARGIN, flexDirection: "row", justifyContent: "space-between" },
  ftTxt:      { fontSize: 8, color: INK_40 },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(v: number | null | undefined, dec = 1): string {
  if (v == null || isNaN(Number(v))) return "—"
  return Number(v).toFixed(dec)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) }
  catch { return iso }
}

const today = fmtDate(new Date().toISOString())

type Status = "OPTIMAL" | "GOOD" | "WATCH" | "ELEVATED" | "NOT TESTED"

function Badge({ st }: { st: Status }) {
  const [bg, fg] = {
    OPTIMAL: [OPT_BG, OPT_FG],
    GOOD: [GOOD_BG, GOOD_FG],
    WATCH: [WTCH_BG, WTCH_FG],
    ELEVATED: [ELEV_BG, ELEV_FG],
    "NOT TESTED": [NT_BG, NT_FG],
  }[st]
  return <Text style={{ fontSize: 8, paddingTop: 2, paddingBottom: 2, paddingLeft: 5, paddingRight: 5, backgroundColor: bg, color: fg }}>{st}</Text>
}

function PageHeader({ left, right }: { left: string; right?: string }) {
  return (
    <View style={s.hdr}>
      <Text style={s.hdrL}>{left}</Text>
      {right ? <Text style={s.hdrR}>{right}</Text> : null}
    </View>
  )
}

function PageFooter({ name }: { name: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.ftTxt}>Peaq Health · peaqhealth.me · {name}</Text>
      <Text style={s.ftTxt}>Generated {today}</Text>
    </View>
  )
}

function HR() { return <View style={s.hr} /> }

// ─── Blood status ─────────────────────────────────────────────────────────────

function bloodSt(key: string, v: number | null): Status {
  if (v == null) return "NOT TESTED"
  const r: Record<string, (x: number) => Status> = {
    ldl_mgdl:            x => x <= 70 ? "OPTIMAL" : x <= 100 ? "GOOD" : x <= 130 ? "WATCH" : "ELEVATED",
    hdl_mgdl:            x => x >= 60 ? "OPTIMAL" : x >= 50 ? "GOOD" : x >= 40 ? "WATCH" : "ELEVATED",
    triglycerides_mgdl:  x => x < 100 ? "OPTIMAL" : x < 150 ? "GOOD" : x < 200 ? "WATCH" : "ELEVATED",
    total_cholesterol_mgdl: x => x < 170 ? "OPTIMAL" : x < 200 ? "GOOD" : x < 240 ? "WATCH" : "ELEVATED",
    apob_mgdl:           x => x < 80 ? "OPTIMAL" : x < 90 ? "GOOD" : x < 110 ? "WATCH" : "ELEVATED",
    lpa_mgdl:            x => x < 15 ? "OPTIMAL" : x < 30 ? "GOOD" : x < 50 ? "WATCH" : "ELEVATED",
    hs_crp_mgl:          x => x < 1.0 ? "OPTIMAL" : x < 2.0 ? "GOOD" : x < 3.0 ? "WATCH" : "ELEVATED",
    glucose_mgdl:        x => x >= 70 && x <= 85 ? "OPTIMAL" : x <= 99 ? "GOOD" : x <= 125 ? "WATCH" : "ELEVATED",
    hba1c_pct:           x => x < 5.4 ? "OPTIMAL" : x < 5.7 ? "GOOD" : x < 6.4 ? "WATCH" : "ELEVATED",
    fasting_insulin_uiuml: x => x < 5 ? "OPTIMAL" : x < 10 ? "GOOD" : x < 15 ? "WATCH" : "ELEVATED",
    vitamin_d_ngml:      x => x >= 50 && x <= 80 ? "OPTIMAL" : x >= 30 ? "GOOD" : x >= 20 ? "WATCH" : "ELEVATED",
    egfr_mlmin:          x => x >= 90 ? "OPTIMAL" : x >= 60 ? "GOOD" : x >= 45 ? "WATCH" : "ELEVATED",
    alt_ul:              x => x < 25 ? "OPTIMAL" : x < 40 ? "GOOD" : x < 60 ? "WATCH" : "ELEVATED",
    ast_ul:              x => x < 25 ? "OPTIMAL" : x < 40 ? "GOOD" : x < 60 ? "WATCH" : "ELEVATED",
    tsh_uiuml:           x => x >= 0.5 && x <= 2.5 ? "OPTIMAL" : x <= 4.5 ? "GOOD" : x <= 6.0 ? "WATCH" : "ELEVATED",
  }
  return r[key]?.(v) ?? "GOOD"
}

const BLOOD_MARKERS: Array<{ key: string; label: string; unit: string; reference: string }> = [
  { key: "ldl_mgdl",              label: "LDL Cholesterol",    unit: "mg/dL",   reference: "<100 optimal" },
  { key: "hdl_mgdl",              label: "HDL Cholesterol",    unit: "mg/dL",   reference: ">60 optimal" },
  { key: "triglycerides_mgdl",    label: "Triglycerides",      unit: "mg/dL",   reference: "<150" },
  { key: "total_cholesterol_mgdl",label: "Total Cholesterol",  unit: "mg/dL",   reference: "<200" },
  { key: "apob_mgdl",             label: "ApoB",               unit: "mg/dL",   reference: "<80 optimal" },
  { key: "lpa_mgdl",              label: "Lp(a)",              unit: "mg/dL",   reference: "<30" },
  { key: "hs_crp_mgl",            label: "hs-CRP",             unit: "mg/L",    reference: "<1.0 optimal" },
  { key: "glucose_mgdl",          label: "Glucose (fasting)",  unit: "mg/dL",   reference: "70–85 optimal" },
  { key: "hba1c_pct",             label: "HbA1c",              unit: "%",       reference: "<5.4% optimal" },
  { key: "fasting_insulin_uiuml", label: "Insulin (fasting)",  unit: "µIU/mL",  reference: "<5 optimal" },
  { key: "uric_acid_mgdl",        label: "Uric Acid",          unit: "mg/dL",   reference: "3.4–7.0" },
  { key: "egfr_mlmin",            label: "eGFR",               unit: "mL/min",  reference: ">90" },
  { key: "creatinine_mgdl",       label: "Creatinine",         unit: "mg/dL",   reference: "0.6–1.2" },
  { key: "bun_mgdl",              label: "BUN",                unit: "mg/dL",   reference: "7–25" },
  { key: "alt_ul",                label: "ALT",                unit: "U/L",     reference: "<25 optimal" },
  { key: "ast_ul",                label: "AST",                unit: "U/L",     reference: "<25 optimal" },
  { key: "vitamin_d_ngml",        label: "Vitamin D",          unit: "ng/mL",   reference: "50–80 optimal" },
  { key: "hemoglobin_gdl",        label: "Hemoglobin",         unit: "g/dL",    reference: "13.5–17.5" },
  { key: "tsh_uiuml",             label: "TSH",                unit: "µIU/mL",  reference: "0.5–2.5 optimal" },
  { key: "testosterone_ngdl",     label: "Testosterone",       unit: "ng/dL",   reference: "300–1000 (men)" },
  { key: "ferritin_ngml",         label: "Ferritin",           unit: "ng/mL",   reference: "30–300" },
  { key: "albumin_gdl",           label: "Albumin",            unit: "g/dL",    reference: "3.5–5.0" },
  { key: "wbc_kul",               label: "WBC",                unit: "K/µL",    reference: "4.0–10.5" },
]

const BLOOD_CTX: Record<string, { body: string; src: string }> = {
  lpa_mgdl: {
    body: "Lp(a) is largely genetically determined and is an independent cardiovascular risk factor. Levels >30 mg/dL are associated with increased atherosclerotic risk even with otherwise favorable lipid profiles. Discuss with your cardiologist, particularly in the context of any elevated periodontal burden.",
    src: "Tsimikas S, JACC 2017; Nordestgaard BG, Eur Heart J 2010",
  },
  hs_crp_mgl: {
    body: "hs-CRP 1–3 mg/L represents intermediate cardiovascular risk. Elevated oral periodontal bacteria (P. gingivalis, F. nucleatum) can contribute to systemic inflammatory load via the oral-systemic axis.",
    src: "Ridker PM, Circulation 2003; Kebschull M, J Dent Res 2010",
  },
  hdl_mgdl: {
    body: "HDL below 60 mg/dL reduces reverse cholesterol transport capacity. Aerobic exercise is the most evidence-backed HDL-raising intervention.",
    src: "Gordon DJ, Circulation 1989",
  },
  vitamin_d_ngml: {
    body: "Vitamin D deficiency is associated with immune dysfunction, cardiovascular risk, and impaired sleep quality. Supplementation of 2,000–4,000 IU/day typically raises levels into the optimal range within 3 months.",
    src: "Holick MF, NEJM 2007",
  },
  glucose_mgdl: {
    body: "Fasting glucose above 99 mg/dL enters the pre-diabetic range. Time-restricted eating and reduced refined carbohydrate intake are the most effective dietary interventions.",
    src: "ADA Standards of Medical Care 2024",
  },
  hba1c_pct: {
    body: "HbA1c reflects average blood glucose over the prior 3 months. Values 5.7–6.4% indicate pre-diabetes. Paired with fasting glucose, this provides a more complete metabolic picture.",
    src: "ADA Standards of Medical Care 2024",
  },
}

// ─── Page 1: Cover ────────────────────────────────────────────────────────────

function CoverPage({ data, logo }: { data: ReportData; logo: string | null }) {
  return (
    <Page size="LETTER" style={s.page}>
      {/* Logo + title */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <View>
          {logo
            ? <Image src={`data:image/png;base64,${logo}`} style={{ width: 80, height: 28 }} />
            : <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: INK }}>Peaq Health</Text>
          }
          <Text style={{ fontSize: 8, color: INK_40, marginTop: 4 }}>peaqhealth.me</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 16, color: INK, marginBottom: 4 }}>Personal Health Report</Text>
          <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 2 }}>{data.fullName}</Text>
          <Text style={{ fontSize: 9, color: INK_40, marginBottom: 2 }}>{data.email}</Text>
          <Text style={{ fontSize: 9, color: INK_40 }}>Generated {today}</Text>
        </View>
      </View>

      <HR />

      {/* Score block */}
      <View style={{ backgroundColor: WARM, padding: 18, marginBottom: 18 }}>
        <View style={{ flexDirection: "row", gap: 28, marginBottom: data.modifiersApplied.length > 0 ? 14 : 0 }}>
          {/* Big score */}
          <View style={{ width: 80 }}>
            <Text style={s.secLabel}>Peaq Score</Text>
            <Text style={{ fontSize: 52, fontFamily: "Helvetica-Bold", color: INK, lineHeight: 1 }}>{data.score}</Text>
            <Text style={{ fontSize: 9, color: INK_40 }}>/ 100</Text>
          </View>
          {/* Breakdown */}
          <View style={{ flex: 1 }}>
            <Text style={[s.secLabel, { marginBottom: 8 }]}>Panel Breakdown</Text>
            {[
              ["Sleep",  data.sleepSub,  "/ 30 pts"],
              ["Blood",  data.bloodSub,  "/ 40 pts"],
              ["Oral",   data.oralSub,   "/ 30 pts"],
            ].map(([label, pts, suffix]) => (
              <View key={String(label)} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={s.body}>{label}</Text>
                <Text style={s.body}>{pts} {suffix}</Text>
              </View>
            ))}
            <HR />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: INK_40 }}>Base</Text>
              <Text style={{ fontSize: 9, color: INK_40 }}>{data.baseScore} / 100 pts</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: INK_40 }}>Cross-panel modifiers</Text>
              <Text style={{ fontSize: 9, color: data.modifierTotal < 0 ? RED : GREEN }}>
                {data.modifierTotal > 0 ? `+${data.modifierTotal}` : data.modifierTotal} pts
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: INK }}>Final score</Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: INK }}>{data.score} / 100 pts</Text>
            </View>
          </View>
        </View>

        {data.modifiersApplied.length > 0 && (
          <View style={{ borderTopWidth: 0.5, borderTopColor: INK_20, paddingTop: 10 }}>
            <Text style={[s.secLabel, { marginBottom: 6 }]}>Active Cross-Panel Signals</Text>
            {data.modifiersApplied.map((m, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: m.direction === "penalty" ? RED : GREEN, width: 30 }}>
                  {m.direction === "penalty" ? `\u2212${Math.abs(m.points)}` : `+${m.points}`}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: INK }}>{m.label}</Text>
                  <Text style={{ fontSize: 8, color: INK_60 }}>{m.rationale}</Text>
                  <Text style={{ fontSize: 8, color: INK_40 }}>{m.panels.join(" + ").toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Methodology */}
      <View style={{ borderWidth: 0.5, borderColor: INK_12, padding: 12 }}>
        <Text style={[s.secLabel, { marginBottom: 8 }]}>Scoring Methodology</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { label: "Blood · 40 pts", color: RED, body: "Cardiovascular and metabolic biomarkers (LabCorp/Quest)." },
            { label: "Sleep · 30 pts", color: BLUE, body: "Wearable-derived HRV, deep sleep, REM, efficiency, SpO\u2082 (WHOOP/Oura)." },
            { label: "Oral · 30 pts", color: GREEN, body: "16S rRNA microbiome sequencing via Zymo Research." },
          ].map(m => (
            <View key={m.label} style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: m.color, marginBottom: 3 }}>{m.label}</Text>
              <Text style={s.bodyS}>{m.body}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.bodyS, { marginTop: 8, color: INK_40 }]}>
          Modifiers (\u00b110 pts) apply when cross-panel signals compound risk. Engine v{data.engineVersion} \u00b7 {fmtDate(data.calculatedAt)}
        </Text>
      </View>

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 2: Blood ────────────────────────────────────────────────────────────

function BloodPage({ data }: { data: ReportData }) {
  const labs = data.labs ?? {}
  const val = (key: string): number | null => {
    const v = labs[key]
    return v != null && Number(v) !== 0 ? Number(v) : null
  }
  const CW = [CONTENT_W * 0.35, CONTENT_W * 0.14, CONTENT_W * 0.14, CONTENT_W * 0.24, CONTENT_W * 0.13]

  const ctxMarkers = BLOOD_MARKERS.filter(m => {
    const st = bloodSt(m.key, val(m.key))
    return (st === "WATCH" || st === "ELEVATED") && BLOOD_CTX[m.key]
  })

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader left="Blood Panel" right={`${data.labName ?? "Lab"} \u00b7 Collection date: ${fmtDate(data.collectionDate)}`} />

      {data.labs == null ? (
        <Text style={[s.body, { color: INK_40, fontStyle: "italic" }]}>No blood panel on file.</Text>
      ) : (
        <>
          <View style={s.tblHdr}>
            {["Marker", "Result", "Unit", "Reference", "Status"].map((h, i) => (
              <Text key={h} style={[s.tblHdrCell, { width: CW[i] }]}>{h}</Text>
            ))}
          </View>
          {BLOOD_MARKERS.map(m => {
            const v = val(m.key)
            const st = bloodSt(m.key, v)
            return (
              <View key={m.key} style={s.tblRow}>
                <Text style={[s.tblCell, { width: CW[0] }]}>{m.label}</Text>
                <Text style={[s.tblCell, { width: CW[1], fontFamily: "Helvetica-Bold" }]}>{v != null ? n(v) : "\u2014"}</Text>
                <Text style={[s.tblCell, { width: CW[2], color: INK_40 }]}>{m.unit}</Text>
                <Text style={[s.tblCell, { width: CW[3], fontSize: 8, color: INK_40 }]}>{m.reference}</Text>
                <View style={{ width: CW[4] }}><Badge st={st} /></View>
              </View>
            )
          })}

          {ctxMarkers.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[s.secLabel, { marginBottom: 10 }]}>Clinical Context</Text>
              {ctxMarkers.map(m => {
                const ctx = BLOOD_CTX[m.key]!
                return (
                  <View key={m.key} style={s.ctx}>
                    <Text style={s.ctxTitle}>{m.label} {val(m.key) != null ? n(val(m.key)) : "\u2014"} {m.unit} \u2014 {bloodSt(m.key, val(m.key))}</Text>
                    <Text style={s.ctxBody}>{ctx.body}</Text>
                    <Text style={s.ctxSrc}>[{ctx.src}]</Text>
                  </View>
                )
              })}
            </View>
          )}
        </>
      )}

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 3: Sleep ────────────────────────────────────────────────────────────

function sleepSt(key: "hrv" | "deep" | "rem" | "efficiency" | "spo2", v: number): Status {
  if (v === 0) return "NOT TESTED"
  const r: Record<string, (x: number) => Status> = {
    hrv:        x => x >= 60 ? "OPTIMAL" : x >= 40 ? "GOOD" : x >= 20 ? "WATCH" : "ELEVATED",
    deep:       x => x >= 22 ? "OPTIMAL" : x >= 17 ? "GOOD" : x >= 10 ? "WATCH" : "ELEVATED",
    rem:        x => x >= 25 ? "OPTIMAL" : x >= 18 ? "GOOD" : x >= 12 ? "WATCH" : "ELEVATED",
    efficiency: x => x >= 85 ? "OPTIMAL" : x >= 78 ? "GOOD" : x >= 70 ? "WATCH" : "ELEVATED",
    spo2:       x => x >= 96 ? "OPTIMAL" : x >= 94 ? "GOOD" : x >= 90 ? "WATCH" : "ELEVATED",
  }
  return r[key](v)
}

function SleepPage({ data }: { data: ReportData }) {
  const avg = data.sleepAverages
  const noSleep = avg.trackedNights === 0
  const CW = [CONTENT_W * 0.28, CONTENT_W * 0.13, CONTENT_W * 0.17, CONTENT_W * 0.18, CONTENT_W * 0.12, CONTENT_W * 0.12]

  const metrics: Array<{ label: string; value: number; unit: string; target: string; key: "hrv" | "deep" | "rem" | "efficiency" | "spo2" }> = [
    { label: "Deep sleep",       value: avg.avgDeepPct,    unit: "% of TST", target: "\u226517%",  key: "deep" },
    { label: "HRV (RMSSD)",      value: avg.avgHrv,        unit: "ms",       target: "age-adj.",  key: "hrv" },
    { label: "SpO\u2082 (avg)",  value: avg.avgSpo2,       unit: "%",        target: "\u226596%",  key: "spo2" },
    { label: "REM sleep",        value: avg.avgRemPct,     unit: "% of TST", target: "\u226518%",  key: "rem" },
    { label: "Sleep efficiency", value: avg.avgEfficiency, unit: "% in bed", target: "\u226585%",  key: "efficiency" },
  ]

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        left={`Sleep & Recovery \u00b7 ${avg.provider ? avg.provider.toUpperCase() : "Wearable"} \u00b7 30-day weighted avg`}
        right={avg.lastSyncDate ? `Last sync: ${fmtDate(avg.lastSyncDate)}` : undefined}
      />

      {noSleep ? (
        <Text style={[s.body, { color: INK_40, fontStyle: "italic" }]}>No wearable data on file. Connect a wearable device in Peaq Health.</Text>
      ) : (
        <>
          <View style={s.tblHdr}>
            {["Metric", "Value", "Unit", "Target", "Status"].map((h, i) => (
              <Text key={h} style={[s.tblHdrCell, { width: CW[i] }]}>{h}</Text>
            ))}
          </View>
          {metrics.map(m => {
            const st: Status = m.value === 0 ? "NOT TESTED" : sleepSt(m.key, m.value)
            return (
              <View key={m.label} style={s.tblRow}>
                <Text style={[s.tblCell, { width: CW[0] }]}>{m.label}</Text>
                <Text style={[s.tblCell, { width: CW[1], fontFamily: "Helvetica-Bold" }]}>{m.value === 0 ? "\u2014" : n(m.value)}</Text>
                <Text style={[s.tblCell, { width: CW[2], color: INK_40 }]}>{m.unit}</Text>
                <Text style={[s.tblCell, { width: CW[3], fontSize: 9, color: INK_40 }]}>{m.target}</Text>
                <View style={{ width: CW[4] }}><Badge st={st} /></View>
              </View>
            )
          })}

          {/* 30-night summary tiles */}
          <View style={{ backgroundColor: WARM, padding: 12, marginTop: 14, marginBottom: 14 }}>
            <Text style={[s.secLabel, { marginBottom: 8 }]}>30-Night Summary</Text>
            <View style={{ flexDirection: "row", gap: 24 }}>
              {[
                ["Nights tracked", String(avg.trackedNights)],
                ["Avg total sleep", `${n(avg.avgTotalHours)} hrs`],
                ["Provider", avg.provider.toUpperCase()],
                ["Last sync", fmtDate(avg.lastSyncDate)],
              ].map(([label, value]) => (
                <View key={label}>
                  <Text style={{ fontSize: 8, color: INK_40 }}>{label}</Text>
                  <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: INK }}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Clinical context for low HRV / low deep sleep */}
          {(avg.avgHrv > 0 && avg.avgHrv < 40) && (
            <View style={s.ctx}>
              <Text style={s.ctxTitle}>HRV {n(avg.avgHrv)} ms RMSSD \u2014 WATCH</Text>
              <Text style={s.ctxBody}>Below age-adjusted target. Low HRV reflects reduced autonomic resilience and is associated with cardiovascular risk. Consistent sleep timing (variance {"<"}30 min) shifts RMSSD 5\u20138 ms over 4 weeks. Oral nitrate-reducing bacteria modulate autonomic tone through the nitric oxide pathway.</Text>
              <Text style={s.ctxSrc}>[Shaffer & Ginsberg, Front. Public Health 2017; Dalton 2025 n=1,139]</Text>
            </View>
          )}
          {(avg.avgDeepPct > 0 && avg.avgDeepPct < 17) && (
            <View style={s.ctx}>
              <Text style={s.ctxTitle}>Deep sleep {n(avg.avgDeepPct)}% of TST \u2014 WATCH</Text>
              <Text style={s.ctxBody}>Below the 17% clinical target. N3 sleep is the primary window for growth hormone secretion, memory consolidation, and glymphatic clearance. Alcohol, late eating, and high sympathetic tone are common suppressors.</Text>
              <Text style={s.ctxSrc}>[Walker MP, Why We Sleep 2017; Xie L, Science 2013]</Text>
            </View>
          )}
        </>
      )}

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 4: Oral ─────────────────────────────────────────────────────────────

function oralSt(key: "shannon" | "nitrate" | "periodontal" | "osa", v: number | null): Status {
  if (v == null) return "NOT TESTED"
  const r: Record<string, (x: number) => Status> = {
    shannon:     x => x >= 3.0 ? "OPTIMAL" : x >= 2.0 ? "GOOD" : x >= 1.5 ? "WATCH" : "ELEVATED",
    nitrate:     x => x >= 20 ? "OPTIMAL" : x >= 15 ? "GOOD" : x >= 10 ? "WATCH" : "ELEVATED",
    periodontal: x => x < 0.5 ? "OPTIMAL" : x < 1.0 ? "GOOD" : x < 1.5 ? "WATCH" : "ELEVATED",
    osa:         x => x < 2.0 ? "OPTIMAL" : x < 5.0 ? "GOOD" : x < 8.0 ? "WATCH" : "ELEVATED",
  }
  return r[key](v)
}

function OralPage({ data }: { data: ReportData }) {
  const sp = (k: string) => data.rawOtu?.[k] ?? 0
  const gingivalis  = sp("Porphyromonas gingivalis")
  const denticola   = sp("Treponema denticola")
  const forsythia   = sp("Tannerella forsythia")
  const fusobact    = sp("Fusobacterium nucleatum")
  const prevotella  = sp("Prevotella melaninogenica")
  const neisseria   = sp("Neisseria subflava") + sp("Neisseria flavescens")
  const rothia      = sp("Rothia mucilaginosa")
  const salivarius  = sp("Streptococcus salivarius")

  const CW = [CONTENT_W * 0.34, CONTENT_W * 0.14, CONTENT_W * 0.14, CONTENT_W * 0.18, CONTENT_W * 0.20]

  const dims: Array<{ label: string; value: string; unit: string; target: string; st: Status }> = [
    { label: "D1  Shannon diversity",  value: data.shannonDiversity != null ? n(data.shannonDiversity, 2) : "\u2014", unit: "index",   target: "\u22653.0", st: oralSt("shannon", data.shannonDiversity) },
    { label: "D2  Nitrate reducers",   value: data.nitrateReducerPct != null ? n(data.nitrateReducerPct, 1) : "\u2014", unit: "% reads", target: "\u226520%", st: oralSt("nitrate", data.nitrateReducerPct) },
    { label: "D3  Periodontal burden", value: data.periodontopathogenPct != null ? n(data.periodontopathogenPct, 2) : "\u2014", unit: "%", target: "<0.5%", st: oralSt("periodontal", data.periodontopathogenPct) },
    { label: "D4  OSA-associated taxa", value: data.osaTaxaPct != null ? n(data.osaTaxaPct, 2) : "\u2014", unit: "%", target: "<2.0%", st: oralSt("osa", data.osaTaxaPct) },
    { label: "D5  Neurological balance", value: data.neuroSignalPct != null ? n(data.neuroSignalPct, 2) : "\u2014", unit: "%", target: "<0.1%", st: data.neuroSignalPct == null ? "NOT TESTED" : data.neuroSignalPct < 0.1 ? "OPTIMAL" : "WATCH" },
    { label: "D6  Metabolic balance",  value: data.metabolicSignalPct != null ? n(data.metabolicSignalPct, 2) : "\u2014", unit: "%", target: "target", st: data.metabolicSignalPct == null ? "NOT TESTED" : "GOOD" },
    { label: "D7  Cellular environment", value: data.proliferativeSignalPct != null ? n(data.proliferativeSignalPct, 2) : "\u2014", unit: "%", target: "target", st: data.proliferativeSignalPct == null ? "NOT TESTED" : "GOOD" },
  ]

  const speciesRows = ([
    { name: "P. gingivalis", val: gingivalis, st: (gingivalis > 1 ? "ELEVATED" : gingivalis > 0.5 ? "WATCH" : "GOOD") as Status, role: "Primary periodontal pathogen" },
    { name: "T. denticola",  val: denticola,  st: (denticola > 1 ? "ELEVATED" : denticola > 0.5 ? "WATCH" : "GOOD") as Status,   role: "Periodontal pathogen" },
    { name: "T. forsythia",  val: forsythia,  st: (forsythia > 1 ? "ELEVATED" : forsythia > 0.5 ? "WATCH" : "GOOD") as Status,   role: "Periodontal pathogen" },
    { name: "F. nucleatum",  val: fusobact,   st: (fusobact > 5 ? "ELEVATED" : fusobact > 2 ? "WATCH" : "GOOD") as Status,       role: "Systemic inflammation marker" },
    { name: "Prevotella spp.", val: prevotella, st: (prevotella > 5 ? "WATCH" : "GOOD") as Status,                              role: "Metabolic signal" },
    { name: "Neisseria spp.", val: neisseria, st: (neisseria >= 10 ? "OPTIMAL" : neisseria >= 5 ? "GOOD" : "WATCH") as Status,   role: "Nitrate reducer" },
    { name: "Rothia spp.",   val: rothia,    st: (rothia >= 5 ? "OPTIMAL" : rothia >= 2 ? "GOOD" : "WATCH") as Status,           role: "Nitrate reducer" },
    { name: "S. salivarius", val: salivarius, st: (salivarius >= 5 ? "OPTIMAL" : salivarius >= 2 ? "GOOD" : "WATCH") as Status, role: "Protective species" },
  ] as const).filter(r => r.val > 0)

  const SCW = [CONTENT_W * 0.36, CONTENT_W * 0.14, CONTENT_W * 0.16, CONTENT_W * 0.34]

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader left={`Oral Microbiome \u00b7 Zymo Research 16S rRNA${data.reportDate ? ` \u00b7 ${fmtDate(data.reportDate)}` : ""}`} />

      {data.shannonDiversity == null ? (
        <Text style={[s.body, { color: INK_40, fontStyle: "italic" }]}>No oral microbiome results on file. Order a Peaq oral kit to include microbiome data.</Text>
      ) : (
        <>
          {/* Dimensions */}
          <View style={s.tblHdr}>
            {["Dimension", "Value", "Unit", "Target", "Status"].map((h, i) => (
              <Text key={h} style={[s.tblHdrCell, { width: CW[i] }]}>{h}</Text>
            ))}
          </View>
          {dims.map(d => (
            <View key={d.label} style={s.tblRow}>
              <Text style={[s.tblCell, { width: CW[0] }]}>{d.label}</Text>
              <Text style={[s.tblCell, { width: CW[1], fontFamily: "Helvetica-Bold" }]}>{d.value}</Text>
              <Text style={[s.tblCell, { width: CW[2], color: INK_40 }]}>{d.unit}</Text>
              <Text style={[s.tblCell, { width: CW[3], fontSize: 9, color: INK_40 }]}>{d.target}</Text>
              <View style={{ width: CW[4] }}><Badge st={d.st} /></View>
            </View>
          ))}

          {/* Key species */}
          {speciesRows.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={[s.secLabel, { marginBottom: 6 }]}>Key Species Detected</Text>
              <View style={s.tblHdr}>
                {["Species", "% Reads", "Status", "Role"].map((h, i) => (
                  <Text key={h} style={[s.tblHdrCell, { width: SCW[i] }]}>{h}</Text>
                ))}
              </View>
              {speciesRows.map(r => (
                <View key={r.name} style={s.tblRow}>
                  <Text style={[s.tblCell, { width: SCW[0], fontStyle: "italic" }]}>{r.name}</Text>
                  <Text style={[s.tblCell, { width: SCW[1], fontFamily: "Helvetica-Bold" }]}>{n(r.val, 2)}%</Text>
                  <View style={{ width: SCW[2] }}><Badge st={r.st} /></View>
                  <Text style={[s.tblCell, { width: SCW[3], fontSize: 8, color: INK_40 }]}>{r.role}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Clinical context */}
          <View style={{ marginTop: 14 }}>
            <Text style={[s.secLabel, { marginBottom: 8 }]}>Clinical Context</Text>
            {gingivalis > 1 && (
              <View style={s.ctx}>
                <Text style={s.ctxTitle}>P. gingivalis {n(gingivalis, 2)}% \u2014 ELEVATED</Text>
                <Text style={s.ctxBody}>Detected inside human coronary artery plaques in epidemiological studies. Associated with cardiovascular risk through LPS-mediated inflammation and TLR4 activation.</Text>
                <Text style={s.ctxSrc}>[Hussain M et al., JACC 2023, n=1,791; Hajishengallis G, Nat Rev Immunol 2015]</Text>
              </View>
            )}
            {data.nitrateReducerPct != null && data.nitrateReducerPct < 15 && (
              <View style={s.ctx}>
                <Text style={s.ctxTitle}>Low nitrate reducers {n(data.nitrateReducerPct, 1)}% \u2014 below 20% functional threshold</Text>
                <Text style={s.ctxBody}>Oral nitrate-reducing bacteria (Neisseria, Rothia, Veillonella) are the primary route for dietary nitrate-to-nitric oxide conversion, supporting vascular tone and autonomic balance. Low levels may contribute to reduced HRV.</Text>
                <Text style={s.ctxSrc}>[Lundberg JO et al., Nat Rev Drug Discov 2008; Bryan NS, Free Radic Biol Med 2012]</Text>
              </View>
            )}
            {data.shannonDiversity != null && data.shannonDiversity < 2.5 && (
              <View style={s.ctx}>
                <Text style={s.ctxTitle}>Shannon diversity {n(data.shannonDiversity, 2)} \u2014 below optimal (\u22653.0)</Text>
                <Text style={s.ctxBody}>Low oral microbiome diversity is associated with periodontal disease and systemic inflammatory burden. Antiseptic mouthwash and antibiotics are common suppressors.</Text>
                <Text style={s.ctxSrc}>[Zaura E, J Dent Res 2009; Sharma N, PLoS ONE 2018]</Text>
              </View>
            )}
          </View>
        </>
      )}

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 5: Cross-Panel Signals ─────────────────────────────────────────────

function CrossPanelPage({ data }: { data: ReportData }) {
  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader left="Cross-Panel Signals" />

      <Text style={[s.secLabel, { marginBottom: 12 }]}>Active Modifiers</Text>

      {data.modifiersApplied.length === 0 ? (
        <Text style={[s.body, { color: INK_40, fontStyle: "italic" }]}>No active modifiers. Modifiers appear when signals across two or more panels compound risk.</Text>
      ) : (
        <>
          {data.modifiersApplied.map((m, i) => (
            <View key={i} style={{ flexDirection: "row", borderWidth: 0.5, borderColor: INK_12, padding: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: m.direction === "penalty" ? RED : GREEN, width: 36 }}>
                {m.direction === "penalty" ? `\u2212${Math.abs(m.points)}` : `+${m.points}`}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 3 }}>{m.label}</Text>
                <Text style={{ fontSize: 9, color: INK_60, lineHeight: 1.5 }}>{m.rationale}</Text>
                <Text style={{ fontSize: 8, color: INK_40, marginTop: 3 }}>{m.panels.join(" \u00b7 ").toUpperCase()}</Text>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4 }}>
            <Text style={{ fontSize: 10, color: INK_40 }}>Total modifier impact: </Text>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: data.modifierTotal < 0 ? RED : GREEN }}>
              {data.modifierTotal > 0 ? `+${data.modifierTotal}` : data.modifierTotal} pts
            </Text>
          </View>
        </>
      )}

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Page 6: Lifestyle + Disclaimer ──────────────────────────────────────────

function LifestylePage({ data }: { data: ReportData }) {
  const fmt = (map: Record<string, string>, v: string | null) => (v ? (map[v] ?? v) : "\u2014")

  const AGE   = { "18_29": "18\u201329", "30_39": "30\u201339", "40_49": "40\u201349", "50_59": "50\u201359", "60_69": "60\u201369", "70_plus": "70+" }
  const EXER  = { none: "None", low: "Low", moderate: "Moderate", high: "High" }
  const SMOKE = { never: "Never", former: "Former smoker", current: "Current smoker" }
  const BRUSH = { once_daily: "Once daily", twice_daily: "Twice daily", less_than_daily: "Less than daily" }
  const FLOSS = { never: "Never / rarely", occasional: "Occasional", daily: "Daily" }
  const MWASH = { none: "None", fluoride: "Fluoride", antiseptic: "Antiseptic (Listerine / CHX)", natural: "Natural / alcohol-free" }
  const DENT  = { within_6_months: "Within 6 months", within_one_year: "Within 1 year", over_one_year: "Over 1 year ago", never: "Never" }

  const rows: Array<[string, string]> = [
    ["Age range",          fmt(AGE,   data.ageRange)],
    ["Exercise level",     fmt(EXER,  data.exerciseLevel)],
    ["Smoking status",     fmt(SMOKE, data.smokingStatus)],
    ["Brushing frequency", fmt(BRUSH, data.brushingFreq)],
    ["Flossing frequency", fmt(FLOSS, data.flossingFreq)],
    ["Mouthwash type",     fmt(MWASH, data.mouthwashType)],
    ["Last dental visit",  fmt(DENT,  data.lastDentalVisit)],
    ["Known hypertension", data.knownHypertension == null ? "\u2014" : data.knownHypertension ? "Yes" : "No"],
    ["Known diabetes",     data.knownDiabetes == null ? "\u2014" : data.knownDiabetes ? "Yes" : "No"],
  ]

  const labs = data.labs ?? {}
  const missing: Array<[string, string, string]> = []
  if (!labs.hba1c_pct)      missing.push(["HbA1c",     "Metabolic health marker",    "\u223c3 pts"])
  if (!labs.apob_mgdl)      missing.push(["ApoB",      "Atherogenic particle count", "\u223c3 pts"])
  if (!labs.vitamin_d_ngml) missing.push(["Vitamin D", "Immune and cardiovascular",  "\u223c2 pts"])

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader left="Lifestyle Context & Disclaimer" />

      <Text style={[s.secLabel, { marginBottom: 8 }]}>Lifestyle Context (Self-Reported)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {rows.map(([label, value]) => (
          <View key={label} style={{ width: "50%", flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: INK_12, paddingRight: 10 }}>
            <Text style={{ fontSize: 9, color: INK_40 }}>{label}</Text>
            <Text style={{ fontSize: 9, color: INK, fontFamily: "Helvetica-Bold" }}>{value}</Text>
          </View>
        ))}
      </View>

      {missing.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <Text style={[s.secLabel, { marginBottom: 8 }]}>What to Add Next</Text>
          {missing.map(([marker, desc, pts]) => (
            <View key={marker} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: INK_12 }}>
              <View>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: INK }}>{marker}</Text>
                <Text style={{ fontSize: 9, color: INK_40 }}>{desc}</Text>
              </View>
              <Text style={{ fontSize: 10, color: GOLD }}>{pts}</Text>
            </View>
          ))}
        </View>
      )}

      <HR />

      <View style={{ marginTop: 12, borderTopWidth: 0.5, borderTopColor: INK_20, paddingTop: 14 }}>
        <Text style={[s.secLabel, { marginBottom: 6 }]}>Disclaimer</Text>
        <Text style={{ fontSize: 9, color: INK_40, lineHeight: 1.7 }}>
          This report is generated by Peaq Health for informational purposes only and is intended to support conversations with your healthcare provider. It is not a medical diagnosis, treatment recommendation, or clinical document. All findings should be reviewed in the context of the patient{"\u2019"}s complete medical history by a qualified physician or dentist.{"\n\n"}Scoring methodology, scientific citations, and full platform documentation available at peaqhealth.me/science
        </Text>
      </View>

      <View style={{ marginTop: 20, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 8, color: INK_40 }}>Peaq Health \u00b7 peaqhealth.me</Text>
        <Text style={{ fontSize: 8, color: INK_40 }}>Generated {today}</Text>
      </View>

      <PageFooter name={data.fullName} />
    </Page>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function buildReportDocument(data: ReportData, logoBase64: string | null) {
  return (
    <Document title={`Peaq Health Report \u2014 ${data.fullName}`} author="Peaq Health" creator="peaqhealth.me">
      <CoverPage data={data} logo={logoBase64} />
      <BloodPage data={data} />
      <SleepPage data={data} />
      <OralPage data={data} />
      <CrossPanelPage data={data} />
      <LifestylePage data={data} />
    </Document>
  )
}

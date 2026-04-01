import PDFDocument from "pdfkit"
import type { ReportData } from "./report-data"

// Letter = 612x792 pts. 0.75in margin = 54 pts.
const MARGIN = 54
const CONTENT_W = 612 - MARGIN * 2 // 504 pts
const PAGE_W = 612
const PAGE_H = 792

const INK = "#141410"
const INK_60 = "#666660"
const INK_40 = "#888880"
const INK_20 = "#C8C8C4"
const INK_12 = "#E8E8E4"
const WARM = "#F7F5F0"
const RED = "#C0392B"
const BLUE = "#4A7FB5"
const GREEN = "#2D6A4F"
const GOLD = "#B8860B"

const OPT_BG = "#D4EDDA"; const OPT_FG = "#2D6A4F"
const GOOD_BG = "#FFF3CD"; const GOOD_FG = "#856404"
const WTCH_BG = "#FFE0B2"; const WTCH_FG = "#664D03"
const ELEV_BG = "#FFCDD2"; const ELEV_FG = "#C0392B"
const NT_BG = "#F0F0EE"; const NT_FG = "#888880"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function num(v: number | null | undefined, dec = 1): string {
  if (v == null || isNaN(Number(v))) return "\u2014"
  return Number(v).toFixed(dec)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014"
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

function today() {
  return fmtDate(new Date().toISOString())
}

type Status = "OPTIMAL" | "GOOD" | "WATCH" | "ELEVATED" | "NOT TESTED"

function statusColors(st: Status): [string, string] {
  return {
    OPTIMAL: [OPT_BG, OPT_FG],
    GOOD: [GOOD_BG, GOOD_FG],
    WATCH: [WTCH_BG, WTCH_FG],
    ELEVATED: [ELEV_BG, ELEV_FG],
    "NOT TESTED": [NT_BG, NT_FG],
  }[st] as [string, string]
}

function drawBadge(doc: InstanceType<typeof PDFDocument>, st: Status, x: number, y: number) {
  const [bg, fg] = statusColors(st)
  const textW = doc.font("Helvetica").fontSize(8).widthOfString(st)
  const padX = 5
  const padY = 2
  const h = 12
  doc.save()
  doc.rect(x, y, textW + padX * 2, h).fill(bg)
  doc.font("Helvetica").fontSize(8).fillColor(fg).text(st, x + padX, y + padY, { lineBreak: false })
  doc.restore()
  doc.fillColor(INK) // reset
}

function drawPageHeader(doc: InstanceType<typeof PDFDocument>, left: string, right?: string) {
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  doc.text(left.toUpperCase(), MARGIN, MARGIN, { width: CONTENT_W * 0.7, lineBreak: false, characterSpacing: 1 })
  if (right) {
    doc.text(right, MARGIN, MARGIN, { width: CONTENT_W, align: "right", lineBreak: false })
  }
  doc.moveTo(MARGIN, MARGIN + 14).lineTo(MARGIN + CONTENT_W, MARGIN + 14).lineWidth(0.5).stroke(INK_20)
  doc.y = MARGIN + 26
  doc.fillColor(INK)
}

function drawPageFooter(doc: InstanceType<typeof PDFDocument>, name: string) {
  const footerY = PAGE_H - MARGIN + 8
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  doc.text(`Peaq Health \u00b7 peaqhealth.me \u00b7 ${name}`, MARGIN, footerY, { lineBreak: false })
  doc.text(`Generated ${today()}`, MARGIN, footerY, { width: CONTENT_W, align: "right", lineBreak: false })
  doc.fillColor(INK)
}

function drawHR(doc: InstanceType<typeof PDFDocument>, y?: number) {
  const lineY = y ?? doc.y
  doc.moveTo(MARGIN, lineY).lineTo(MARGIN + CONTENT_W, lineY).lineWidth(0.5).stroke(INK_12)
  doc.y = lineY + 10
}

function drawSectionLabel(doc: InstanceType<typeof PDFDocument>, text: string, y?: number) {
  const startY = y ?? doc.y
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  doc.text(text.toUpperCase(), MARGIN, startY, { characterSpacing: 1.5 })
  doc.y = startY + 14
  doc.fillColor(INK)
}

function drawCtxBox(doc: InstanceType<typeof PDFDocument>, title: string, body: string, src: string) {
  const startY = doc.y
  const boxX = MARGIN
  const boxW = CONTENT_W
  const padL = 12 // left padding for border
  const padR = 10
  const padT = 10
  const padB = 10
  const borderW = 2

  // Measure text height
  doc.font("Helvetica-Bold").fontSize(9)
  const titleH = doc.heightOfString(title, { width: boxW - padL - padR })
  doc.font("Helvetica").fontSize(9)
  const bodyH = doc.heightOfString(body, { width: boxW - padL - padR, lineGap: 4 })
  doc.font("Helvetica").fontSize(8)
  const srcH = doc.heightOfString(`[${src}]`, { width: boxW - padL - padR })

  const totalH = padT + titleH + 3 + bodyH + 4 + srcH + padB

  // Background
  doc.save()
  doc.rect(boxX, startY, boxW, totalH).fill(WARM)
  // Left border
  doc.rect(boxX, startY, borderW, totalH).fill(GOLD)
  doc.restore()

  let curY = startY + padT
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK)
  doc.text(title, boxX + padL, curY, { width: boxW - padL - padR })
  curY += titleH + 3
  doc.font("Helvetica").fontSize(9).fillColor(INK_60)
  doc.text(body, boxX + padL, curY, { width: boxW - padL - padR, lineGap: 4 })
  curY += bodyH + 4
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  doc.text(`[${src}]`, boxX + padL, curY, { width: boxW - padL - padR })

  doc.y = startY + totalH + 8
  doc.fillColor(INK)
}

// ─── Blood status ─────────────────────────────────────────────────────────────

function bloodSt(key: string, v: number | null): Status {
  if (v == null) return "NOT TESTED"
  const r: Record<string, (x: number) => Status> = {
    ldl_mgdl: x => x <= 70 ? "OPTIMAL" : x <= 100 ? "GOOD" : x <= 130 ? "WATCH" : "ELEVATED",
    hdl_mgdl: x => x >= 60 ? "OPTIMAL" : x >= 50 ? "GOOD" : x >= 40 ? "WATCH" : "ELEVATED",
    triglycerides_mgdl: x => x < 100 ? "OPTIMAL" : x < 150 ? "GOOD" : x < 200 ? "WATCH" : "ELEVATED",
    total_cholesterol_mgdl: x => x < 170 ? "OPTIMAL" : x < 200 ? "GOOD" : x < 240 ? "WATCH" : "ELEVATED",
    apob_mgdl: x => x < 80 ? "OPTIMAL" : x < 90 ? "GOOD" : x < 110 ? "WATCH" : "ELEVATED",
    lpa_mgdl: x => x < 38 ? "OPTIMAL" : x < 75 ? "GOOD" : x < 125 ? "WATCH" : "ELEVATED",
    hs_crp_mgl: x => x < 1.0 ? "OPTIMAL" : x < 2.0 ? "GOOD" : x < 3.0 ? "WATCH" : "ELEVATED",
    glucose_mgdl: x => x >= 70 && x <= 85 ? "OPTIMAL" : x <= 99 ? "GOOD" : x <= 125 ? "WATCH" : "ELEVATED",
    hba1c_pct: x => x < 5.4 ? "OPTIMAL" : x < 5.7 ? "GOOD" : x < 6.4 ? "WATCH" : "ELEVATED",
    fasting_insulin_uiuml: x => x < 5 ? "OPTIMAL" : x < 10 ? "GOOD" : x < 15 ? "WATCH" : "ELEVATED",
    vitamin_d_ngml: x => x >= 50 && x <= 80 ? "OPTIMAL" : x >= 30 ? "GOOD" : x >= 20 ? "WATCH" : "ELEVATED",
    egfr_mlmin: x => x >= 90 ? "OPTIMAL" : x >= 60 ? "GOOD" : x >= 45 ? "WATCH" : "ELEVATED",
    alt_ul: x => x < 25 ? "OPTIMAL" : x < 40 ? "GOOD" : x < 60 ? "WATCH" : "ELEVATED",
    ast_ul: x => x < 25 ? "OPTIMAL" : x < 40 ? "GOOD" : x < 60 ? "WATCH" : "ELEVATED",
    tsh_uiuml: x => x >= 0.5 && x <= 2.5 ? "OPTIMAL" : x <= 4.5 ? "GOOD" : x <= 6.0 ? "WATCH" : "ELEVATED",
  }
  return r[key]?.(v) ?? "GOOD"
}

const BLOOD_MARKERS: Array<{ key: string; label: string; unit: string; reference: string }> = [
  { key: "ldl_mgdl", label: "LDL Cholesterol", unit: "mg/dL", reference: "<100 optimal" },
  { key: "hdl_mgdl", label: "HDL Cholesterol", unit: "mg/dL", reference: ">60 optimal" },
  { key: "triglycerides_mgdl", label: "Triglycerides", unit: "mg/dL", reference: "<150" },
  { key: "total_cholesterol_mgdl", label: "Total Cholesterol", unit: "mg/dL", reference: "<200" },
  { key: "apob_mgdl", label: "ApoB", unit: "mg/dL", reference: "<80 optimal" },
  { key: "lpa_mgdl", label: "Lp(a)", unit: "nmol/L", reference: "<75" },
  { key: "hs_crp_mgl", label: "hs-CRP", unit: "mg/L", reference: "<1.0 optimal" },
  { key: "glucose_mgdl", label: "Glucose (fasting)", unit: "mg/dL", reference: "70\u201385 optimal" },
  { key: "hba1c_pct", label: "HbA1c", unit: "%", reference: "<5.4% optimal" },
  { key: "fasting_insulin_uiuml", label: "Insulin (fasting)", unit: "\u00b5IU/mL", reference: "<5 optimal" },
  { key: "uric_acid_mgdl", label: "Uric Acid", unit: "mg/dL", reference: "3.4\u20137.0" },
  { key: "egfr_mlmin", label: "eGFR", unit: "mL/min", reference: ">90" },
  { key: "creatinine_mgdl", label: "Creatinine", unit: "mg/dL", reference: "0.6\u20131.2" },
  { key: "bun_mgdl", label: "BUN", unit: "mg/dL", reference: "7\u201325" },
  { key: "alt_ul", label: "ALT", unit: "U/L", reference: "<25 optimal" },
  { key: "ast_ul", label: "AST", unit: "U/L", reference: "<25 optimal" },
  { key: "vitamin_d_ngml", label: "Vitamin D", unit: "ng/mL", reference: "50\u201380 optimal" },
  { key: "hemoglobin_gdl", label: "Hemoglobin", unit: "g/dL", reference: "13.5\u201317.5" },
  { key: "tsh_uiuml", label: "TSH", unit: "\u00b5IU/mL", reference: "0.5\u20132.5 optimal" },
  { key: "testosterone_ngdl", label: "Testosterone", unit: "ng/dL", reference: "300\u20131000 (men)" },
  { key: "ferritin_ngml", label: "Ferritin", unit: "ng/mL", reference: "30\u2013300" },
  { key: "albumin_gdl", label: "Albumin", unit: "g/dL", reference: "3.5\u20135.0" },
  { key: "wbc_kul", label: "WBC", unit: "K/\u00b5L", reference: "4.0\u201310.5" },
]

const BLOOD_CTX: Record<string, { body: string; src: string }> = {
  lpa_mgdl: {
    body: "Lp(a) is largely genetically determined and is an independent cardiovascular risk factor. Levels >75 nmol/L are associated with increased atherosclerotic risk even with otherwise favorable lipid profiles. Discuss with your cardiologist, particularly in the context of any elevated periodontal burden.",
    src: "Tsimikas S, JACC 2017; Nordestgaard BG, Eur Heart J 2010",
  },
  hs_crp_mgl: {
    body: "hs-CRP 1\u20133 mg/L represents intermediate cardiovascular risk. Elevated oral periodontal bacteria (P. gingivalis, F. nucleatum) can contribute to systemic inflammatory load via the oral-systemic axis.",
    src: "Ridker PM, Circulation 2003; Kebschull M, J Dent Res 2010",
  },
  hdl_mgdl: {
    body: "HDL below 60 mg/dL reduces reverse cholesterol transport capacity. Aerobic exercise is the most evidence-backed HDL-raising intervention.",
    src: "Gordon DJ, Circulation 1989",
  },
  vitamin_d_ngml: {
    body: "Vitamin D deficiency is associated with immune dysfunction, cardiovascular risk, and impaired sleep quality. Supplementation of 2,000\u20134,000 IU/day typically raises levels into the optimal range within 3 months.",
    src: "Holick MF, NEJM 2007",
  },
  glucose_mgdl: {
    body: "Fasting glucose above 99 mg/dL enters the pre-diabetic range. Time-restricted eating and reduced refined carbohydrate intake are the most effective dietary interventions.",
    src: "ADA Standards of Medical Care 2024",
  },
  hba1c_pct: {
    body: "HbA1c reflects average blood glucose over the prior 3 months. Values 5.7\u20136.4% indicate pre-diabetes. Paired with fasting glucose, this provides a more complete metabolic picture.",
    src: "ADA Standards of Medical Care 2024",
  },
}

// ─── Sleep status ─────────────────────────────────────────────────────────────

function sleepSt(key: "hrv" | "deep" | "rem" | "efficiency" | "spo2", v: number): Status {
  if (v === 0) return "NOT TESTED"
  const r: Record<string, (x: number) => Status> = {
    hrv: x => x >= 60 ? "OPTIMAL" : x >= 40 ? "GOOD" : x >= 20 ? "WATCH" : "ELEVATED",
    deep: x => x >= 22 ? "OPTIMAL" : x >= 17 ? "GOOD" : x >= 10 ? "WATCH" : "ELEVATED",
    rem: x => x >= 25 ? "OPTIMAL" : x >= 18 ? "GOOD" : x >= 12 ? "WATCH" : "ELEVATED",
    efficiency: x => x >= 85 ? "OPTIMAL" : x >= 78 ? "GOOD" : x >= 70 ? "WATCH" : "ELEVATED",
    spo2: x => x >= 96 ? "OPTIMAL" : x >= 94 ? "GOOD" : x >= 90 ? "WATCH" : "ELEVATED",
  }
  return r[key](v)
}

// ─── Oral status ──────────────────────────────────────────────────────────────

function oralSt(key: "shannon" | "nitrate" | "periodontal" | "osa", v: number | null): Status {
  if (v == null) return "NOT TESTED"
  const r: Record<string, (x: number) => Status> = {
    shannon: x => x >= 3.0 ? "OPTIMAL" : x >= 2.0 ? "GOOD" : x >= 1.5 ? "WATCH" : "ELEVATED",
    nitrate: x => x >= 20 ? "OPTIMAL" : x >= 15 ? "GOOD" : x >= 10 ? "WATCH" : "ELEVATED",
    periodontal: x => x < 0.5 ? "OPTIMAL" : x < 1.0 ? "GOOD" : x < 1.5 ? "WATCH" : "ELEVATED",
    osa: x => x < 2.0 ? "OPTIMAL" : x < 5.0 ? "GOOD" : x < 8.0 ? "WATCH" : "ELEVATED",
  }
  return r[key](v)
}

// ─── Table helper ─────────────────────────────────────────────────────────────

function drawTableHeader(doc: InstanceType<typeof PDFDocument>, headers: string[], colWidths: number[]) {
  const y = doc.y
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  headers.forEach((h, i) => {
    let x = MARGIN
    for (let j = 0; j < i; j++) x += colWidths[j]
    doc.text(h.toUpperCase(), x, y, { width: colWidths[i], lineBreak: false, characterSpacing: 1 })
  })
  doc.moveTo(MARGIN, y + 12).lineTo(MARGIN + CONTENT_W, y + 12).lineWidth(0.5).stroke(INK_20)
  doc.y = y + 16
  doc.fillColor(INK)
}

function drawTableRow(
  doc: InstanceType<typeof PDFDocument>,
  cells: Array<{ text: string; bold?: boolean; color?: string; italic?: boolean; fontSize?: number }>,
  colWidths: number[],
  badge?: { st: Status; colIndex: number },
) {
  const y = doc.y
  cells.forEach((cell, i) => {
    if (badge && i === badge.colIndex) return // skip badge column for text
    let x = MARGIN
    for (let j = 0; j < i; j++) x += colWidths[j]
    doc.font(cell.bold ? "Helvetica-Bold" : cell.italic ? "Helvetica-Oblique" : "Helvetica")
      .fontSize(cell.fontSize ?? 10)
      .fillColor(cell.color ?? INK)
    doc.text(cell.text, x, y, { width: colWidths[i], lineBreak: false })
  })
  if (badge) {
    let badgeX = MARGIN
    for (let j = 0; j < badge.colIndex; j++) badgeX += colWidths[j]
    drawBadge(doc, badge.st, badgeX, y)
  }
  doc.moveTo(MARGIN, y + 16).lineTo(MARGIN + CONTENT_W, y + 16).lineWidth(0.5).stroke(INK_12)
  doc.y = y + 20
  doc.fillColor(INK)
}

// ─── Page 1: Cover ────────────────────────────────────────────────────────────

function drawCoverPage(doc: InstanceType<typeof PDFDocument>, data: ReportData, logoBase64: string | null) {
  // Logo + title
  if (logoBase64) {
    try {
      const logoBuffer = Buffer.from(logoBase64, "base64")
      doc.image(logoBuffer, MARGIN, MARGIN, { width: 80, height: 28 })
    } catch {
      doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text("Peaq Health", MARGIN, MARGIN)
    }
  } else {
    doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text("Peaq Health", MARGIN, MARGIN)
  }
  doc.font("Helvetica").fontSize(8).fillColor(INK_40).text("peaqhealth.me", MARGIN, MARGIN + 32)

  // Right side
  doc.font("Helvetica").fontSize(16).fillColor(INK).text("Personal Health Report", MARGIN, MARGIN, { width: CONTENT_W, align: "right" })
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(data.fullName, MARGIN, MARGIN + 22, { width: CONTENT_W, align: "right" })
  doc.font("Helvetica").fontSize(9).fillColor(INK_40).text(data.email, MARGIN, MARGIN + 38, { width: CONTENT_W, align: "right" })
  doc.font("Helvetica").fontSize(9).fillColor(INK_40).text(`Generated ${today()}`, MARGIN, MARGIN + 50, { width: CONTENT_W, align: "right" })

  // HR
  const hrY = MARGIN + 68
  doc.moveTo(MARGIN, hrY).lineTo(MARGIN + CONTENT_W, hrY).lineWidth(0.5).stroke(INK_12)

  // Score block background
  const scoreBlockY = hrY + 14
  const scoreBlockH = data.modifiersApplied.length > 0 ? 220 : 150
  doc.save()
  doc.rect(MARGIN, scoreBlockY, CONTENT_W, scoreBlockH).fill(WARM)
  doc.restore()

  const pad = 18
  let curY = scoreBlockY + pad

  // Peaq Score label
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  doc.text("PEAQ SCORE", MARGIN + pad, curY, { characterSpacing: 1.5 })
  curY += 14
  // Big score number
  doc.font("Helvetica-Bold").fontSize(52).fillColor(INK)
  doc.text(String(data.score), MARGIN + pad, curY, { lineBreak: false })
  curY += 52
  doc.font("Helvetica").fontSize(9).fillColor(INK_40)
  doc.text("/ 100", MARGIN + pad, curY)

  // Panel breakdown (right column)
  const rightX = MARGIN + 120
  let rY = scoreBlockY + pad
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  doc.text("PANEL BREAKDOWN", rightX, rY, { characterSpacing: 1.5 })
  rY += 16

  const panels: Array<[string, number, string]> = [
    ["Sleep", data.sleepSub, "/ 30 pts"],
    ["Blood", data.bloodSub, "/ 40 pts"],
    ["Oral", data.oralSub, "/ 30 pts"],
  ]
  for (const [label, pts, suffix] of panels) {
    doc.font("Helvetica").fontSize(10).fillColor(INK)
    doc.text(label, rightX, rY, { lineBreak: false })
    doc.text(`${pts} ${suffix}`, rightX, rY, { width: CONTENT_W - 120 + pad, align: "right" })
    rY += 16
  }

  // HR inside score block
  doc.moveTo(rightX, rY).lineTo(MARGIN + CONTENT_W - pad, rY).lineWidth(0.5).stroke(INK_12)
  rY += 8

  // Base / Modifiers / Final
  doc.font("Helvetica").fontSize(9).fillColor(INK_40)
  doc.text("Base", rightX, rY, { lineBreak: false })
  doc.text(`${data.baseScore} / 100 pts`, rightX, rY, { width: CONTENT_W - 120 + pad, align: "right" })
  rY += 14
  doc.text("Cross-panel modifiers", rightX, rY, { lineBreak: false })
  doc.fillColor(data.modifierTotal < 0 ? RED : GREEN)
  doc.text(`${data.modifierTotal > 0 ? "+" + data.modifierTotal : data.modifierTotal} pts`, rightX, rY, { width: CONTENT_W - 120 + pad, align: "right" })
  rY += 14
  doc.font("Helvetica-Bold").fontSize(10).fillColor(INK)
  doc.text("Final score", rightX, rY, { lineBreak: false })
  doc.text(`${data.score} / 100 pts`, rightX, rY, { width: CONTENT_W - 120 + pad, align: "right" })
  rY += 18

  // Active modifiers inside score block
  if (data.modifiersApplied.length > 0) {
    doc.moveTo(MARGIN + pad, rY).lineTo(MARGIN + CONTENT_W - pad, rY).lineWidth(0.5).stroke(INK_20)
    rY += 10
    doc.font("Helvetica").fontSize(8).fillColor(INK_40)
    doc.text("ACTIVE CROSS-PANEL SIGNALS", MARGIN + pad, rY, { characterSpacing: 1.5 })
    rY += 14

    for (const m of data.modifiersApplied) {
      doc.font("Helvetica").fontSize(9).fillColor(m.direction === "penalty" ? RED : GREEN)
      doc.text(m.direction === "penalty" ? `\u2212${Math.abs(m.points)}` : `+${m.points}`, MARGIN + pad, rY, { lineBreak: false })
      doc.font("Helvetica-Bold").fontSize(9).fillColor(INK)
      doc.text(m.label, MARGIN + pad + 30, rY)
      rY += 12
      doc.font("Helvetica").fontSize(8).fillColor(INK_60)
      doc.text(m.rationale, MARGIN + pad + 30, rY, { width: CONTENT_W - pad * 2 - 30 })
      rY += doc.heightOfString(m.rationale, { width: CONTENT_W - pad * 2 - 30 }) + 2
      doc.font("Helvetica").fontSize(8).fillColor(INK_40)
      doc.text(m.panels.join(" + ").toUpperCase(), MARGIN + pad + 30, rY)
      rY += 14
    }
  }

  // Methodology box
  const methY = scoreBlockY + scoreBlockH + 16
  doc.save()
  doc.rect(MARGIN, methY, CONTENT_W, 100).lineWidth(0.5).stroke(INK_12)
  doc.restore()

  let mY = methY + 12
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  doc.text("SCORING METHODOLOGY", MARGIN + 12, mY, { characterSpacing: 1.5 })
  mY += 16

  const methCols = [
    { label: "Blood \u00b7 40 pts", color: RED, body: "Cardiovascular and metabolic biomarkers (LabCorp/Quest)." },
    { label: "Sleep \u00b7 30 pts", color: BLUE, body: "Wearable-derived HRV, deep sleep, REM, efficiency, SpO\u2082 (WHOOP/Oura)." },
    { label: "Oral \u00b7 30 pts", color: GREEN, body: "16S rRNA microbiome sequencing via Zymo Research." },
  ]

  const colW = (CONTENT_W - 24 - 24) / 3
  methCols.forEach((m, i) => {
    const cx = MARGIN + 12 + i * (colW + 12)
    doc.font("Helvetica-Bold").fontSize(9).fillColor(m.color)
    doc.text(m.label, cx, mY, { width: colW })
    doc.font("Helvetica").fontSize(9).fillColor(INK_60)
    doc.text(m.body, cx, mY + 14, { width: colW, lineGap: 4 })
  })

  mY += 54
  doc.font("Helvetica").fontSize(9).fillColor(INK_40)
  doc.text(
    `Modifiers (\u00b110 pts) apply when cross-panel signals compound risk. Engine v${data.engineVersion} \u00b7 ${fmtDate(data.calculatedAt)}`,
    MARGIN + 12, mY, { width: CONTENT_W - 24 }
  )

  drawPageFooter(doc, data.fullName)
}

// ─── Page 2: Blood ────────────────────────────────────────────────────────────

function drawBloodPage(doc: InstanceType<typeof PDFDocument>, data: ReportData) {
  drawPageHeader(doc, "Blood Panel", `${data.labName ?? "Lab"} \u00b7 Collection date: ${fmtDate(data.collectionDate)}`)

  if (data.labs == null) {
    doc.font("Helvetica").fontSize(10).fillColor(INK_40)
    doc.text("No blood panel on file.", MARGIN, doc.y, { oblique: true })
    drawPageFooter(doc, data.fullName)
    return
  }

  const labs = data.labs
  const val = (key: string): number | null => {
    const v = labs[key]
    if (v == null || Number(v) === 0) return null
    // Lp(a) stored as mg/dL — convert to nmol/L for display
    if (key === "lpa_mgdl") return Math.round(Number(v) * 2.5 * 10) / 10
    return Number(v)
  }

  const CW = [CONTENT_W * 0.35, CONTENT_W * 0.14, CONTENT_W * 0.14, CONTENT_W * 0.24, CONTENT_W * 0.13]
  drawTableHeader(doc, ["Marker", "Result", "Unit", "Reference", "Status"], CW)

  for (const m of BLOOD_MARKERS) {
    const v = val(m.key)
    const st = bloodSt(m.key, v)
    drawTableRow(doc, [
      { text: m.label },
      { text: v != null ? num(v) : "\u2014", bold: true },
      { text: m.unit, color: INK_40 },
      { text: m.reference, fontSize: 8, color: INK_40 },
      { text: "" }, // badge column placeholder
    ], CW, { st, colIndex: 4 })
  }

  // Clinical context for WATCH/ELEVATED markers
  const ctxMarkers = BLOOD_MARKERS.filter(m => {
    const st = bloodSt(m.key, val(m.key))
    return (st === "WATCH" || st === "ELEVATED") && BLOOD_CTX[m.key]
  })

  if (ctxMarkers.length > 0) {
    doc.y += 6
    drawSectionLabel(doc, "Clinical Context")
    for (const m of ctxMarkers) {
      const ctx = BLOOD_CTX[m.key]!
      const v = val(m.key)
      drawCtxBox(
        doc,
        `${m.label} ${v != null ? num(v) : "\u2014"} ${m.unit} \u2014 ${bloodSt(m.key, v)}`,
        ctx.body,
        ctx.src
      )
    }
  }

  drawPageFooter(doc, data.fullName)
}

// ─── Page 3: Sleep ────────────────────────────────────────────────────────────

function drawSleepPage(doc: InstanceType<typeof PDFDocument>, data: ReportData) {
  const avg = data.sleepAverages
  const noSleep = avg.trackedNights === 0

  drawPageHeader(
    doc,
    `Sleep & Recovery \u00b7 ${avg.provider ? avg.provider.toUpperCase() : "Wearable"} \u00b7 30-day weighted avg`,
    avg.lastSyncDate ? `Last sync: ${fmtDate(avg.lastSyncDate)}` : undefined
  )

  if (noSleep) {
    doc.font("Helvetica").fontSize(10).fillColor(INK_40)
    doc.text("No wearable data on file. Connect a wearable device in Peaq Health.", MARGIN, doc.y, { oblique: true })
    drawPageFooter(doc, data.fullName)
    return
  }

  const metrics: Array<{ label: string; value: number; unit: string; target: string; key: "hrv" | "deep" | "rem" | "efficiency" | "spo2" }> = [
    { label: "Deep sleep", value: avg.avgDeepPct, unit: "% of TST", target: "\u226517%", key: "deep" },
    { label: "HRV (RMSSD)", value: avg.avgHrv, unit: "ms", target: "age-adj.", key: "hrv" },
    { label: "SpO\u2082 (avg)", value: avg.avgSpo2, unit: "%", target: "\u226596%", key: "spo2" },
    { label: "REM sleep", value: avg.avgRemPct, unit: "% of TST", target: "\u226518%", key: "rem" },
    { label: "Sleep efficiency", value: avg.avgEfficiency, unit: "% in bed", target: "\u226585%", key: "efficiency" },
  ]

  const CW = [CONTENT_W * 0.28, CONTENT_W * 0.13, CONTENT_W * 0.17, CONTENT_W * 0.18, CONTENT_W * 0.12]
  drawTableHeader(doc, ["Metric", "Value", "Unit", "Target", "Status"], CW)

  for (const m of metrics) {
    const st: Status = m.value === 0 ? "NOT TESTED" : sleepSt(m.key, m.value)
    drawTableRow(doc, [
      { text: m.label },
      { text: m.value === 0 ? "\u2014" : num(m.value), bold: true },
      { text: m.unit, color: INK_40 },
      { text: m.target, fontSize: 9, color: INK_40 },
      { text: "" },
    ], CW, { st, colIndex: 4 })
  }

  // 30-night summary
  doc.y += 4
  const summaryY = doc.y
  const summaryH = 60
  doc.save()
  doc.rect(MARGIN, summaryY, CONTENT_W, summaryH).fill(WARM)
  doc.restore()

  let sY = summaryY + 10
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  doc.text("30-NIGHT SUMMARY", MARGIN + 12, sY, { characterSpacing: 1.5 })
  sY += 16

  const tiles = [
    ["Nights tracked", String(avg.trackedNights)],
    ["Avg total sleep", `${num(avg.avgTotalHours)} hrs`],
    ["Provider", avg.provider.toUpperCase()],
    ["Last sync", fmtDate(avg.lastSyncDate)],
  ]
  const tileW = (CONTENT_W - 24) / 4
  tiles.forEach(([label, value], i) => {
    const tx = MARGIN + 12 + i * tileW
    doc.font("Helvetica").fontSize(8).fillColor(INK_40)
    doc.text(label, tx, sY, { width: tileW })
    doc.font("Helvetica-Bold").fontSize(13).fillColor(INK)
    doc.text(value, tx, sY + 12, { width: tileW })
  })

  doc.y = summaryY + summaryH + 14

  // Clinical context for low HRV / low deep sleep
  if (avg.avgHrv > 0 && avg.avgHrv < 40) {
    drawCtxBox(
      doc,
      `HRV ${num(avg.avgHrv)} ms RMSSD \u2014 WATCH`,
      "Below age-adjusted target. Low HRV reflects reduced autonomic resilience and is associated with cardiovascular risk. Consistent sleep timing (variance <30 min) shifts RMSSD 5\u20138 ms over 4 weeks. Oral nitrate-reducing bacteria modulate autonomic tone through the nitric oxide pathway.",
      "Shaffer & Ginsberg, Front. Public Health 2017; Dalton 2025 n=1,139"
    )
  }
  if (avg.avgDeepPct > 0 && avg.avgDeepPct < 17) {
    drawCtxBox(
      doc,
      `Deep sleep ${num(avg.avgDeepPct)}% of TST \u2014 WATCH`,
      "Below the 17% clinical target. N3 sleep is the primary window for growth hormone secretion, memory consolidation, and glymphatic clearance. Alcohol, late eating, and high sympathetic tone are common suppressors.",
      "Walker MP, Why We Sleep 2017; Xie L, Science 2013"
    )
  }

  drawPageFooter(doc, data.fullName)
}

// ─── Page 4: Oral ─────────────────────────────────────────────────────────────

function drawOralPage(doc: InstanceType<typeof PDFDocument>, data: ReportData) {
  drawPageHeader(doc, `Oral Microbiome \u00b7 Zymo Research 16S rRNA${data.reportDate ? ` \u00b7 ${fmtDate(data.reportDate)}` : ""}`)

  if (data.shannonDiversity == null) {
    doc.font("Helvetica").fontSize(10).fillColor(INK_40)
    doc.text("No oral microbiome results on file. Order a Peaq oral kit to include microbiome data.", MARGIN, doc.y, { oblique: true })
    drawPageFooter(doc, data.fullName)
    return
  }

  const sp = (k: string) => data.rawOtu?.[k] ?? 0
  const gingivalis = sp("Porphyromonas gingivalis")
  const denticola = sp("Treponema denticola")
  const forsythia = sp("Tannerella forsythia")
  const fusobact = sp("Fusobacterium nucleatum")
  const prevotella = sp("Prevotella melaninogenica")
  const neisseria = sp("Neisseria subflava") + sp("Neisseria flavescens")
  const rothia = sp("Rothia mucilaginosa")
  const salivarius = sp("Streptococcus salivarius")

  // Dimensions table
  const CW = [CONTENT_W * 0.34, CONTENT_W * 0.14, CONTENT_W * 0.14, CONTENT_W * 0.18, CONTENT_W * 0.20]
  const dims: Array<{ label: string; value: string; unit: string; target: string; st: Status }> = [
    { label: "D1  Shannon diversity", value: data.shannonDiversity != null ? num(data.shannonDiversity, 2) : "\u2014", unit: "index", target: "\u22653.0", st: oralSt("shannon", data.shannonDiversity) },
    { label: "D2  Nitrate reducers", value: data.nitrateReducerPct != null ? num(data.nitrateReducerPct, 1) : "\u2014", unit: "% reads", target: "\u226520%", st: oralSt("nitrate", data.nitrateReducerPct) },
    { label: "D3  Periodontal burden", value: data.periodontopathogenPct != null ? num(data.periodontopathogenPct, 2) : "\u2014", unit: "%", target: "<0.5%", st: oralSt("periodontal", data.periodontopathogenPct) },
    { label: "D4  OSA-associated taxa", value: data.osaTaxaPct != null ? num(data.osaTaxaPct, 2) : "\u2014", unit: "%", target: "<2.0%", st: oralSt("osa", data.osaTaxaPct) },
    { label: "D5  Neurological balance", value: data.neuroSignalPct != null ? num(data.neuroSignalPct, 2) : "\u2014", unit: "%", target: "<0.1%", st: data.neuroSignalPct == null ? "NOT TESTED" : data.neuroSignalPct < 0.1 ? "OPTIMAL" : "WATCH" },
    { label: "D6  Metabolic balance", value: data.metabolicSignalPct != null ? num(data.metabolicSignalPct, 2) : "\u2014", unit: "%", target: "target", st: data.metabolicSignalPct == null ? "NOT TESTED" : "GOOD" },
    { label: "D7  Cellular environment", value: data.proliferativeSignalPct != null ? num(data.proliferativeSignalPct, 2) : "\u2014", unit: "%", target: "target", st: data.proliferativeSignalPct == null ? "NOT TESTED" : "GOOD" },
  ]

  drawTableHeader(doc, ["Dimension", "Value", "Unit", "Target", "Status"], CW)
  for (const d of dims) {
    drawTableRow(doc, [
      { text: d.label },
      { text: d.value, bold: true },
      { text: d.unit, color: INK_40 },
      { text: d.target, fontSize: 9, color: INK_40 },
      { text: "" },
    ], CW, { st: d.st, colIndex: 4 })
  }

  // Key species
  const speciesRows = ([
    { name: "P. gingivalis", val: gingivalis, st: (gingivalis > 1 ? "ELEVATED" : gingivalis > 0.5 ? "WATCH" : "GOOD") as Status, role: "Primary periodontal pathogen" },
    { name: "T. denticola", val: denticola, st: (denticola > 1 ? "ELEVATED" : denticola > 0.5 ? "WATCH" : "GOOD") as Status, role: "Periodontal pathogen" },
    { name: "T. forsythia", val: forsythia, st: (forsythia > 1 ? "ELEVATED" : forsythia > 0.5 ? "WATCH" : "GOOD") as Status, role: "Periodontal pathogen" },
    { name: "F. nucleatum", val: fusobact, st: (fusobact > 5 ? "ELEVATED" : fusobact > 2 ? "WATCH" : "GOOD") as Status, role: "Systemic inflammation marker" },
    { name: "Prevotella spp.", val: prevotella, st: (prevotella > 5 ? "WATCH" : "GOOD") as Status, role: "Metabolic signal" },
    { name: "Neisseria spp.", val: neisseria, st: (neisseria >= 10 ? "OPTIMAL" : neisseria >= 5 ? "GOOD" : "WATCH") as Status, role: "Nitrate reducer" },
    { name: "Rothia spp.", val: rothia, st: (rothia >= 5 ? "OPTIMAL" : rothia >= 2 ? "GOOD" : "WATCH") as Status, role: "Nitrate reducer" },
    { name: "S. salivarius", val: salivarius, st: (salivarius >= 5 ? "OPTIMAL" : salivarius >= 2 ? "GOOD" : "WATCH") as Status, role: "Protective species" },
  ] as const).filter(r => r.val > 0)

  if (speciesRows.length > 0) {
    doc.y += 4
    drawSectionLabel(doc, "Key Species Detected")
    const SCW = [CONTENT_W * 0.36, CONTENT_W * 0.14, CONTENT_W * 0.16, CONTENT_W * 0.34]
    drawTableHeader(doc, ["Species", "% Reads", "Status", "Role"], SCW)
    for (const r of speciesRows) {
      drawTableRow(doc, [
        { text: r.name, italic: true },
        { text: `${num(r.val, 2)}%`, bold: true },
        { text: "" },
        { text: r.role, fontSize: 8, color: INK_40 },
      ], SCW, { st: r.st, colIndex: 2 })
    }
  }

  // Clinical context
  doc.y += 4
  drawSectionLabel(doc, "Clinical Context")

  if (gingivalis > 1) {
    drawCtxBox(
      doc,
      `P. gingivalis ${num(gingivalis, 2)}% \u2014 ELEVATED`,
      "Detected inside human coronary artery plaques in epidemiological studies. Associated with cardiovascular risk through LPS-mediated inflammation and TLR4 activation.",
      "Hussain M et al., JACC 2023, n=1,791; Hajishengallis G, Nat Rev Immunol 2015"
    )
  }
  if (data.nitrateReducerPct != null && data.nitrateReducerPct < 15) {
    drawCtxBox(
      doc,
      `Low nitrate reducers ${num(data.nitrateReducerPct, 1)}% \u2014 below 20% functional threshold`,
      "Oral nitrate-reducing bacteria (Neisseria, Rothia, Veillonella) are the primary route for dietary nitrate-to-nitric oxide conversion, supporting vascular tone and autonomic balance. Low levels may contribute to reduced HRV.",
      "Lundberg JO et al., Nat Rev Drug Discov 2008; Bryan NS, Free Radic Biol Med 2012"
    )
  }
  if (data.shannonDiversity != null && data.shannonDiversity < 2.5) {
    drawCtxBox(
      doc,
      `Shannon diversity ${num(data.shannonDiversity, 2)} \u2014 below optimal (\u22653.0)`,
      "Low oral microbiome diversity is associated with periodontal disease and systemic inflammatory burden. Antiseptic mouthwash and antibiotics are common suppressors.",
      "Zaura E, J Dent Res 2009; Sharma N, PLoS ONE 2018"
    )
  }

  drawPageFooter(doc, data.fullName)
}

// ─── Page 5: Cross-Panel Signals ─────────────────────────────────────────────

function drawCrossPanelPage(doc: InstanceType<typeof PDFDocument>, data: ReportData) {
  drawPageHeader(doc, "Cross-Panel Signals")

  drawSectionLabel(doc, "Active Modifiers")

  if (data.modifiersApplied.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(INK_40)
    doc.text("No active modifiers. Modifiers appear when signals across two or more panels compound risk.", MARGIN, doc.y, { oblique: true })
    drawPageFooter(doc, data.fullName)
    return
  }

  for (const m of data.modifiersApplied) {
    const cardY = doc.y
    doc.save()
    doc.rect(MARGIN, cardY, CONTENT_W, 60).lineWidth(0.5).stroke(INK_12)
    doc.restore()

    // Points
    doc.font("Helvetica-Bold").fontSize(14).fillColor(m.direction === "penalty" ? RED : GREEN)
    doc.text(
      m.direction === "penalty" ? `\u2212${Math.abs(m.points)}` : `+${m.points}`,
      MARGIN + 10, cardY + 10, { lineBreak: false }
    )

    // Label + rationale
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK)
    doc.text(m.label, MARGIN + 46, cardY + 10, { width: CONTENT_W - 56 })
    doc.font("Helvetica").fontSize(9).fillColor(INK_60)
    doc.text(m.rationale, MARGIN + 46, cardY + 24, { width: CONTENT_W - 56, lineGap: 3 })
    doc.font("Helvetica").fontSize(8).fillColor(INK_40)
    doc.text(m.panels.join(" \u00b7 ").toUpperCase(), MARGIN + 46, cardY + 44)

    doc.y = cardY + 68
  }

  // Total modifier impact
  doc.font("Helvetica").fontSize(10).fillColor(INK_40)
  doc.text("Total modifier impact: ", MARGIN, doc.y, { width: CONTENT_W - 60, align: "right", lineBreak: false, continued: true })
  doc.font("Helvetica-Bold").fillColor(data.modifierTotal < 0 ? RED : GREEN)
  doc.text(`${data.modifierTotal > 0 ? "+" + data.modifierTotal : data.modifierTotal} pts`, { lineBreak: false })

  drawPageFooter(doc, data.fullName)
}

// ─── Page 6: Lifestyle + Disclaimer ──────────────────────────────────────────

function drawLifestylePage(doc: InstanceType<typeof PDFDocument>, data: ReportData) {
  drawPageHeader(doc, "Lifestyle Context & Disclaimer")

  const fmt = (map: Record<string, string>, v: string | null) => (v ? (map[v] ?? v) : "\u2014")

  const AGE: Record<string, string> = { "18_29": "18\u201329", "30_39": "30\u201339", "40_49": "40\u201349", "50_59": "50\u201359", "60_69": "60\u201369", "70_plus": "70+" }
  const EXER: Record<string, string> = { none: "None", low: "Low", moderate: "Moderate", high: "High" }
  const SMOKE: Record<string, string> = { never: "Never", former: "Former smoker", current: "Current smoker" }
  const BRUSH: Record<string, string> = { once_daily: "Once daily", twice_daily: "Twice daily", less_than_daily: "Less than daily" }
  const FLOSS: Record<string, string> = { never: "Never / rarely", occasional: "Occasional", daily: "Daily" }
  const MWASH: Record<string, string> = { none: "None", fluoride: "Fluoride", antiseptic: "Antiseptic (Listerine / CHX)", natural: "Natural / alcohol-free" }
  const DENT: Record<string, string> = { within_6_months: "Within 6 months", within_one_year: "Within 1 year", over_one_year: "Over 1 year ago", never: "Never" }

  const rows: Array<[string, string]> = [
    ["Age range", fmt(AGE, data.ageRange)],
    ["Exercise level", fmt(EXER, data.exerciseLevel)],
    ["Smoking status", fmt(SMOKE, data.smokingStatus)],
    ["Brushing frequency", fmt(BRUSH, data.brushingFreq)],
    ["Flossing frequency", fmt(FLOSS, data.flossingFreq)],
    ["Mouthwash type", fmt(MWASH, data.mouthwashType)],
    ["Last dental visit", fmt(DENT, data.lastDentalVisit)],
    ["Known hypertension", data.knownHypertension == null ? "\u2014" : data.knownHypertension ? "Yes" : "No"],
    ["Known diabetes", data.knownDiabetes == null ? "\u2014" : data.knownDiabetes ? "Yes" : "No"],
  ]

  drawSectionLabel(doc, "Lifestyle Context (Self-Reported)")

  // Two-column grid
  const halfW = CONTENT_W / 2
  for (let i = 0; i < rows.length; i += 2) {
    const y = doc.y
    for (let col = 0; col < 2 && i + col < rows.length; col++) {
      const [label, value] = rows[i + col]
      const x = MARGIN + col * halfW
      doc.font("Helvetica").fontSize(9).fillColor(INK_40)
      doc.text(label, x, y, { lineBreak: false })
      doc.font("Helvetica-Bold").fontSize(9).fillColor(INK)
      doc.text(value, x, y, { width: halfW - 10, align: "right", lineBreak: false })
    }
    doc.moveTo(MARGIN, y + 14).lineTo(MARGIN + CONTENT_W, y + 14).lineWidth(0.5).stroke(INK_12)
    doc.y = y + 18
  }

  // What to add next
  const labs = data.labs ?? {}
  const missing: Array<[string, string, string]> = []
  if (!labs.hba1c_pct) missing.push(["HbA1c", "Metabolic health marker", "\u223c3 pts"])
  if (!labs.apob_mgdl) missing.push(["ApoB", "Atherogenic particle count", "\u223c3 pts"])
  if (!labs.vitamin_d_ngml) missing.push(["Vitamin D", "Immune and cardiovascular", "\u223c2 pts"])

  if (missing.length > 0) {
    doc.y += 8
    drawSectionLabel(doc, "What to Add Next")
    for (const [marker, desc, pts] of missing) {
      const y = doc.y
      doc.font("Helvetica-Bold").fontSize(10).fillColor(INK)
      doc.text(marker, MARGIN, y)
      doc.font("Helvetica").fontSize(9).fillColor(INK_40)
      doc.text(desc, MARGIN, y + 12)
      doc.font("Helvetica").fontSize(10).fillColor(GOLD)
      doc.text(pts, MARGIN, y, { width: CONTENT_W, align: "right", lineBreak: false })
      doc.moveTo(MARGIN, y + 24).lineTo(MARGIN + CONTENT_W, y + 24).lineWidth(0.5).stroke(INK_12)
      doc.y = y + 28
    }
  }

  // HR
  drawHR(doc, doc.y + 4)

  // Disclaimer
  doc.y += 4
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y).lineWidth(0.5).stroke(INK_20)
  doc.y += 14

  drawSectionLabel(doc, "Disclaimer")
  doc.font("Helvetica").fontSize(9).fillColor(INK_40)
  doc.text(
    "This report is generated by Peaq Health for informational purposes only and is intended to support conversations with your healthcare provider. It is not a medical diagnosis, treatment recommendation, or clinical document. All findings should be reviewed in the context of the patient\u2019s complete medical history by a qualified physician or dentist.\n\nScoring methodology, scientific citations, and full platform documentation available at peaqhealth.me/science",
    MARGIN, doc.y, { width: CONTENT_W, lineGap: 5 }
  )

  doc.y += 20
  doc.font("Helvetica").fontSize(8).fillColor(INK_40)
  doc.text("Peaq Health \u00b7 peaqhealth.me", MARGIN, doc.y, { lineBreak: false })
  doc.text(`Generated ${today()}`, MARGIN, doc.y, { width: CONTENT_W, align: "right", lineBreak: false })

  drawPageFooter(doc, data.fullName)
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export async function buildReportDocument(data: ReportData, logoBase64: string | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: MARGIN,
      info: {
        Title: `Peaq Health Report \u2014 ${data.fullName}`,
        Author: "Peaq Health",
        Creator: "peaqhealth.me",
      },
      bufferPages: true,
    })

    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    drawCoverPage(doc, data, logoBase64)
    doc.addPage()
    drawBloodPage(doc, data)
    doc.addPage()
    drawSleepPage(doc, data)
    doc.addPage()
    drawOralPage(doc, data)
    doc.addPage()
    drawCrossPanelPage(doc, data)
    doc.addPage()
    drawLifestylePage(doc, data)

    doc.end()
  })
}

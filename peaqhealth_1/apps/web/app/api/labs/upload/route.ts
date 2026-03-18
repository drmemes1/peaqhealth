import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

// ─── Marker name → canonical key mapping ────────────────────────────────────

const MARKERS: Record<string, string> = {
  // LDL
  "ldl chol calc (nih)": "ldl_mgdL",
  "ldl cholesterol calc": "ldl_mgdL",
  "ldl cholesterol": "ldl_mgdL",
  "ldl-c": "ldl_mgdL",
  "ldl": "ldl_mgdL",
  // HDL
  "hdl cholesterol": "hdl_mgdL",
  "hdl-c": "hdl_mgdL",
  "hdl": "hdl_mgdL",
  // Triglycerides
  "triglycerides": "triglycerides_mgdL",
  // hsCRP — Quest + LabCorp formats
  "c-reactive protein, cardiac": "hsCRP_mgL",
  "c-reactive protein (high sensitivity)": "hsCRP_mgL",
  "crp, cardiac": "hsCRP_mgL",
  "cardiac crp": "hsCRP_mgL",
  "c-reactive protein": "hsCRP_mgL",
  "high sensitivity crp": "hsCRP_mgL",
  "hs-crp": "hsCRP_mgL",
  "hscrp": "hsCRP_mgL",
  // HbA1c
  "hemoglobin a1c": "hba1c_pct",
  "glycated hemoglobin": "hba1c_pct",
  "hba1c": "hba1c_pct",
  "a1c": "hba1c_pct",
  // Glucose
  "fasting glucose": "glucose_mgdL",
  "glucose": "glucose_mgdL",
  // Vitamin D
  "vitamin d, 25-oh": "vitaminD_ngmL",
  "25-oh vitamin d": "vitaminD_ngmL",
  "vitamin d": "vitaminD_ngmL",
  "vit d": "vitaminD_ngmL",
  // ApoB
  "apolipoprotein b": "apoB_mgdL",
  "apob": "apoB_mgdL",
  "apo b": "apoB_mgdL",
  // Lp(a) — Quest uses mg/dL, LabCorp uses nmol/L
  "lipoprotein (a)": "lpa_raw",
  "lipoprotein(a)": "lpa_raw",
  "lp(a)": "lpa_raw",
  // Creatinine
  "creatinine": "creatinine_mgdL",
  // eGFR
  "estimated gfr": "egfr_mLmin",
  "egfr": "egfr_mLmin",
  // ALT
  "alanine aminotransferase": "alt_UL",
  "alt (sgpt)": "alt_UL",
  "sgpt": "alt_UL",
  "alt": "alt_UL",
  // AST
  "aspartate aminotransferase": "ast_UL",
  "ast (sgot)": "ast_UL",
  "ast/sgot": "ast_UL",
  "sgot": "ast_UL",
  "ast": "ast_UL",
  // WBC
  "white blood cells": "wbc_kul",
  "white blood cell": "wbc_kul",
  "wbc": "wbc_kul",
  // Hemoglobin
  "hemoglobin": "hemoglobin_gdL",
  "hgb": "hemoglobin_gdL",
  // RDW
  "red cell distribution width": "rdw_pct",
  "rdw-cv": "rdw_pct",
  "rdw": "rdw_pct",
  // MCV
  "mean corpuscular volume": "mcv_fL",
  "mcv": "mcv_fL",
  // Albumin
  "albumin": "albumin_gdL",
  // BUN
  "blood urea nitrogen": "bun_mgdL",
  "urea nitrogen": "bun_mgdL",
  "bun": "bun_mgdL",
  // Alkaline phosphatase
  "alkaline phosphatase": "alkPhos_UL",
  "alk phos": "alkPhos_UL",
  "alp": "alkPhos_UL",
  // Bilirubin
  "bilirubin, total": "totalBilirubin_mgdL",
  "bilirubin total": "totalBilirubin_mgdL",
  "total bilirubin": "totalBilirubin_mgdL",
  // Electrolytes
  "sodium": "sodium_mmolL",
  "potassium": "potassium_mmolL",
  "chloride": "chloride_mmolL",
  "carbon dioxide, total": "co2_mmolL",
  "carbon dioxide": "co2_mmolL",
  "co2": "co2_mmolL",
  "calcium": "calcium_mgdL",
  // Cholesterol
  "cholesterol, total": "totalCholesterol_mgdL",
  "total cholesterol": "totalCholesterol_mgdL",
  "non hdl cholesterol": "nonHDL_mgdL",
  "non-hdl": "nonHDL_mgdL",
  "vldl cholesterol cal": "vldl_mgdL",
  // Protein
  "protein, total": "totalProtein_gdL",
  "total protein": "totalProtein_gdL",
  "globulin, total": "globulin_gdL",
  "globulin": "globulin_gdL",
  "a/g ratio": "agRatio",
  // Other blood
  "uric acid": "uricAcid_mgdL",
  "ferritin": "ferritin_ngmL",
  "homocysteine": "homocysteine_umolL",
  "esr": "esr_mmhr",
  "erythrocyte sedimentation": "esr_mmhr",
  "sed rate": "esr_mmhr",
  // CBC
  "platelet count": "platelets_kul",
  "platelets": "platelets_kul",
  "platelet": "platelets_kul",
  "red blood cell": "rbc_mil",
  "rbc": "rbc_mil",
  "hematocrit": "hematocrit_pct",
  "mch": "mch_pg",
  "mchc": "mchc_gdl",
  "mpv": "mpv_fl",
  "neutrophils": "neutrophils_pct",
  "lymphs": "lymphs_pct",
  // Thyroid
  "thyroid stimulating hormone": "tsh_uIUmL",
  "tsh": "tsh_uIUmL",
  // Hormones
  "testosterone, total": "testosterone_ngdL",
  "testosterone": "testosterone_ngdL",
  "free testosterone(direct)": "freeTesto_pgmL",
  "free testosterone (direct)": "freeTesto_pgmL",
  "free testosterone": "freeTesto_pgmL",
  "sex horm binding glob, serum": "shbg_nmolL",
  "dhea sulfate": "dhea_s_ugdL",
  "dhea-s": "dhea_s_ugdL",
  "insulin-like growth factor": "igf1_ngmL",
  "igf-1": "igf1_ngmL",
  "fasting insulin": "fastingInsulin_uIUmL",
  "cortisol": "cortisol_ugdL",
  // Other
  "omega-3 index": "omega3Index_pct",
}

// Sort by name length descending for matching (longer first to avoid partial matches)
const SORTED_MARKERS = Object.entries(MARKERS).sort((a, b) => b[0].length - a[0].length)

// ─── Azure Document Intelligence helpers ────────────────────────────────────

interface FileInput {
  base64: string
  filename: string
  type?: string
}

interface FileResult {
  filename: string
  markers: Record<string, number>
  markersFound: number
  labName?: string
  collectionDate?: string
  notes?: Record<string, string>
  error?: string
}

async function analyzeWithAzure(buffer: Buffer): Promise<{ lines: string[]; tables: string[] }> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY

  if (!endpoint || !apiKey) throw new Error("Azure Document Intelligence not configured")

  const analyzeUrl = `${endpoint}documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30`

  const submitRes = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": "application/pdf",
    },
    body: new Uint8Array(buffer),
  })

  if (!submitRes.ok) {
    throw new Error(`Azure submit failed: ${submitRes.status}`)
  }

  const operationUrl = submitRes.headers.get("Operation-Location")
  if (!operationUrl) throw new Error("Azure: no Operation-Location header")

  // Poll for completion (max 30s, every 2s)
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000))

    const pollRes = await fetch(operationUrl, {
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
    })

    if (!pollRes.ok) continue

    const data = await pollRes.json() as Record<string, unknown>
    const status = data.status as string

    if (status === "succeeded") {
      const result = data.analyzeResult as Record<string, unknown> | undefined
      const pages = (result?.pages ?? []) as Array<{ lines?: Array<{ content: string }> }>
      const tables = (result?.tables ?? []) as Array<{ cells?: Array<{ content: string }> }>

      const lines: string[] = []
      for (const page of pages) {
        for (const line of page.lines ?? []) {
          lines.push(line.content)
        }
      }

      const tableCells: string[] = []
      for (const table of tables) {
        for (const cell of table.cells ?? []) {
          tableCells.push(cell.content)
        }
      }

      return { lines, tables: tableCells }
    }

    if (status === "failed") {
      throw new Error("Azure analysis failed")
    }
  }

  throw new Error("Azure analysis timed out")
}

// Plausible physiological ranges — values outside these are likely reference ranges or noise
const PLAUSIBLE_RANGES: Record<string, [number, number]> = {
  ldl_mgdL: [20, 400], hdl_mgdL: [10, 150], triglycerides_mgdL: [20, 2000],
  glucose_mgdL: [40, 600], hsCRP_mgL: [0.01, 100], vitaminD_ngmL: [4, 150],
  hba1c_pct: [3, 15], creatinine_mgdL: [0.3, 15], egfr_mLmin: [5, 200],
  alt_UL: [5, 500], ast_UL: [5, 500], wbc_kul: [1, 30], hemoglobin_gdL: [5, 20],
  rdw_pct: [8, 25], albumin_gdL: [1, 6], bun_mgdL: [2, 100],
  sodium_mmolL: [100, 170], potassium_mmolL: [2, 8], apoB_mgdL: [20, 300],
  lpa_raw: [0.5, 500], ferritin_ngmL: [1, 2000], totalCholesterol_mgdL: [50, 500],
  homocysteine_umolL: [2, 50], tsh_uIUmL: [0.1, 20], calcium_mgdL: [5, 15],
  hematocrit_pct: [20, 65], rbc_mil: [2, 8], platelets_kul: [50, 600],
  testosterone_ngdL: [10, 1500], freeTesto_pgmL: [1, 50], shbg_nmolL: [5, 200],
  alkPhos_UL: [10, 500], totalBilirubin_mgdL: [0.1, 15], co2_mmolL: [10, 40],
  chloride_mmolL: [85, 115], totalProtein_gdL: [4, 10], globulin_gdL: [1, 5],
  neutrophils_pct: [20, 90], lymphs_pct: [5, 60], vldl_mgdL: [2, 100],
  mcv_fL: [50, 120], mch_pg: [20, 40], cortisol_ugdL: [1, 50],
}

// Keywords that precede reference range values, not actual results
const RANGE_KEYWORDS = /(?:normal|reference|range|target|limit|standard)\s*(?:value)?[:\s]*$/i

// LabCorp line pattern: "TestName [A,] B, 01 VALUE [High/Low] units range"
// Anchors on the "B, 01" lab code which ALWAYS separates name from value
const LABCORP_LINE = /^(.+?)\s+(?:[A-Z],\s*)*B,?\s*\d+\s+([\d.]+)/

// ─── Format detection ─────────────────────────────────────────────────────────

type LabFormat = "labcorp" | "quest_mychart" | "unknown"

function detectLabFormat(lines: string[]): LabFormat {
  const text = lines.join(" ").toLowerCase()
  if (/\bb,\s*0?1\b/.test(text) || text.includes("labcorp")) return "labcorp"
  if (text.includes("normal range:") || text.includes("normal value:")) return "quest_mychart"
  return "unknown"
}

// ─── Quest MyChart line-by-line parser ───────────────────────────────────────
//
// Format per marker:
//   MarkerName                       ← line we detect
//   Normal range: LOW - HIGH unit    ← skip
//   LOW HIGH                         ← skip (two-number reference range)
//   ACTUAL_VALUE [High/Low]          ← take this
//
// OR:
//   MarkerName
//   Normal value: > OR = X unit      ← skip
//   Value                            ← skip (literal label)
//   ACTUAL_VALUE [High/Low]          ← take this

// Lines to always skip when scanning for result value
const QUEST_SKIP_PATTERNS = [
  /normal\s+(?:range|value)\s*:/i,
  /fasting\s+reference/i,
  /reference\s+interval/i,
  />\s*or\s*=/i,
  /<\s*or\s*=/i,
  /^value$/i,
  /http/i,
  // Dates: MM/DD/YYYY or "Month DD, YYYY"
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s*\d{4}$/i,
]

// Two numbers separated by whitespace only = reference range repeat (e.g. "65 99", "3.8 10.8")
const TWO_NUMBER_LINE = /^\d+\.?\d*\s+\d+\.?\d*$/

// Result line: a number, optionally followed by a High/Low flag
const RESULT_LINE = /^([\d.]+)\s*(?:High|Low|H|L)?\s*$/i

function extractMarkersQuestMyChart(lines: string[]): Record<string, number> {
  const found: Record<string, number> = {}

  for (let i = 0; i < lines.length; i++) {
    const lineTrimmed = lines[i].trim()
    const lineLower   = lineTrimmed.toLowerCase()

    // Find the longest marker name that exactly matches this line
    let canonicalKey: string | undefined
    for (const [markerName, key] of SORTED_MARKERS) {
      if (lineLower === markerName) { canonicalKey = key; break }
    }
    if (!canonicalKey || found[canonicalKey]) continue

    const range = PLAUSIBLE_RANGES[canonicalKey]

    // Scan the next up to 6 lines for the actual result
    for (let j = i + 1; j <= Math.min(i + 6, lines.length - 1); j++) {
      const next = lines[j].trim()
      if (!next) continue

      // Skip reference range / metadata lines
      if (QUEST_SKIP_PATTERNS.some((p) => p.test(next))) continue
      if (TWO_NUMBER_LINE.test(next)) continue

      // Try to extract the numeric result (strip High/Low flag if present)
      const m = RESULT_LINE.exec(next)
      if (!m) continue

      const val = parseFloat(m[1])
      if (isNaN(val) || val <= 0) continue
      if (range && (val < range[0] || val > range[1])) continue

      found[canonicalKey] = val
      break
    }
  }

  return found
}

// ─── General full-text parser (fallback) ─────────────────────────────────────

function extractMarkersGeneralText(lines: string[], alreadyFound: Record<string, number>): Record<string, number> {
  const found = { ...alreadyFound }
  const fullText = lines.join("\n").toLowerCase()

  for (const [markerName, canonicalKey] of SORTED_MARKERS) {
    if (found[canonicalKey]) continue

    const idx = fullText.indexOf(markerName.toLowerCase())
    if (idx === -1) continue

    const surrounding = fullText.slice(idx, idx + 300)
    const numPattern  = /\b(\d{1,4}\.?\d{0,3})\b/g
    let match: RegExpExecArray | null
    const range = PLAUSIBLE_RANGES[canonicalKey]

    while ((match = numPattern.exec(surrounding)) !== null) {
      const val = parseFloat(match[1])
      if (val <= 0 || val > 9999) continue

      // Check ~10 chars before number for comparison operators (handles ≥40, < 150, or =)
      const charsBefore = surrounding.slice(Math.max(0, match.index - 10), match.index)
      if (/[<>≥≤]\s*$/.test(charsBefore)) continue
      if (/\bor\s*=\s*$/.test(charsBefore)) continue

      // Check chars after for range patterns (65-99 or 65 99)
      const charsAfter = surrounding.slice(match.index + match[0].length, match.index + match[0].length + 15)
      if (/^\s*[-–]\s*\d/.test(charsAfter)) continue
      if (/^\s+\d{2,4}\b/.test(charsAfter) && val < 500) continue

      const textBefore = surrounding.slice(0, match.index)
      if (RANGE_KEYWORDS.test(textBefore)) continue

      if (range && (val < range[0] || val > range[1])) continue

      found[canonicalKey] = val
      break
    }
  }

  return found
}

// ─── LabCorp structured-line parser ──────────────────────────────────────────

function extractMarkersLabCorp(lines: string[], alreadyFound: Record<string, number>): Record<string, number> {
  const found = { ...alreadyFound }

  for (const line of lines) {
    const m = LABCORP_LINE.exec(line)
    if (!m) continue

    const testName = m[1].trim().toLowerCase()
    const val      = parseFloat(m[2])
    if (isNaN(val) || val <= 0) continue

    for (const [markerName, canonicalKey] of SORTED_MARKERS) {
      if (found[canonicalKey]) continue
      if (!testName.includes(markerName)) continue
      const range = PLAUSIBLE_RANGES[canonicalKey]
      if (range && (val < range[0] || val > range[1])) continue
      found[canonicalKey] = val
      break
    }
  }

  return found
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

function extractMarkersFromLines(lines: string[]): Record<string, number> {
  const format = detectLabFormat(lines)
  console.log("[parser] detected format:", format)

  if (format === "quest_mychart") {
    // Quest MyChart: line-by-line parser first, general text as fallback
    const primary = extractMarkersQuestMyChart(lines)
    return extractMarkersGeneralText(lines, primary)
  }

  if (format === "labcorp") {
    // LabCorp: structured B,01 parser first, general text as fallback
    const primary = extractMarkersLabCorp(lines, {})
    return extractMarkersGeneralText(lines, primary)
  }

  // Unknown format: general text only
  return extractMarkersGeneralText(lines, {})
}

// ─── Lp(a) unit detection + conversion ──────────────────────────────────────

function convertLpaUnits(
  rawVal: number,
  lines: string[]
): { lpa_mgdL: number; wasNmol: boolean } {
  const fullText = lines.join(" ").toLowerCase()

  // Search near "lipoprotein" for unit strings within 50 chars
  const lpaIdx = fullText.indexOf("lipoprotein")
  if (lpaIdx !== -1) {
    const nearby = fullText.slice(lpaIdx, lpaIdx + 80)
    if (nearby.includes("nmol/l") || nearby.includes("nmol")) {
      // LabCorp reports nmol/L — convert: nmol/L ÷ 2.5 ≈ mg/dL
      return { lpa_mgdL: Math.round((rawVal / 2.5) * 10) / 10, wasNmol: true }
    }
  }

  // Default: assume mg/dL (Quest format)
  return { lpa_mgdL: rawVal, wasNmol: false }
}

// ─── Post-processing: derived markers + unit conversions ────────────────────

interface PostProcessResult {
  markers: Record<string, number>
  notes: Record<string, string>  // e.g. "lpa_mgdL": "112.2 nmol/L → 44.9 mg/dL"
}

function postProcessMarkers(
  markers: Record<string, number>,
  lines: string[]
): PostProcessResult {
  const result = { ...markers }
  const notes: Record<string, string> = {}

  // Convert Lp(a) from raw to mg/dL
  if (result.lpa_raw) {
    const rawVal = result.lpa_raw
    const { lpa_mgdL, wasNmol } = convertLpaUnits(rawVal, lines)
    result.lpa_mgdL = lpa_mgdL
    if (wasNmol) {
      notes.lpa_mgdL = `${rawVal} nmol/L → ${lpa_mgdL} mg/dL`
    }
    delete result.lpa_raw
  }

  // Calculate LDL:HDL ratio from actual values (never extract from text)
  if (result.ldl_mgdL && result.hdl_mgdL) {
    result.ldlHdlRatio = Math.round((result.ldl_mgdL / result.hdl_mgdL) * 100) / 100
  }

  return { markers: result, notes }
}

// ─── Lab name + date extraction ─────────────────────────────────────────────

function extractLabName(lines: string[]): string | undefined {
  const text = lines.join(" ").toLowerCase()
  if (text.includes("quest diagnostics")) return "Quest Diagnostics"
  if (text.includes("labcorp")) return "LabCorp"
  if (text.includes("bioreference")) return "BioReference"
  if (text.includes("everlywell")) return "Everlywell"
  if (text.includes("insidetracker")) return "InsideTracker"
  return undefined
}

function extractCollectionDate(lines: string[]): string | undefined {
  const text = lines.join(" ")

  const datePatterns = [
    /collection date[:\s]+(\w+ \d{1,2},?\s*\d{4})/i,
    /collected[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /collection date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /date collected[:\s]+(\w+ \d{1,2},?\s*\d{4})/i,
    /specimen collected[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /drawn[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /(\d{4}-\d{2}-\d{2})/,
    /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s*\d{4})\b/i,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (!match) continue
    try {
      const d = new Date(match[1])
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    } catch { /* ignore */ }
  }

  return undefined
}

// ─── File processing ────────────────────────────────────────────────────────

async function processFile(file: FileInput, index: number): Promise<FileResult> {
  try {
    const buffer = Buffer.from(file.base64, "base64")
    console.log("[azure] file", index + 1, "submitted, analyzing...")

    const { lines, tables } = await analyzeWithAzure(buffer)
    console.log("[azure] file", index + 1, "analysis complete, lines:", lines.length, "table cells:", tables.length)

    const allLines = [...lines, ...tables]

    // Temporary debug: log lines containing key marker names
    const debugMarkers = [
      "albumin", "wbc", "testosterone", "apolipoprotein",
      "c-reactive", "creatinine", "shbg", "sex horm",
      "lipoprotein"
    ]
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i].toLowerCase()
      if (debugMarkers.some(m => line.includes(m))) {
        console.log(`[debug] line ${i}: "${allLines[i]}"`)
        console.log(`[debug] line ${i+1}: "${allLines[i+1] || ''}"`)
        console.log(`[debug] line ${i+2}: "${allLines[i+2] || ''}"`)
        console.log(`[debug] line ${i+3}: "${allLines[i+3] || ''}"`)
      }
    }

    const rawMarkers = extractMarkersFromLines(allLines)
    const { markers, notes } = postProcessMarkers(rawMarkers, allLines)
    const labName = extractLabName(lines)
    const collectionDate = extractCollectionDate(lines)

    console.log("[azure] file", index + 1, "markers found:", Object.keys(markers).length)

    return {
      filename: file.filename,
      markers,
      markersFound: Object.keys(markers).length,
      labName,
      collectionDate,
      notes,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[azure] file", index + 1, "failed:", msg)
    return {
      filename: file.filename,
      markers: {},
      markersFound: 0,
      error: msg,
    }
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || !process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY) {
    return NextResponse.json({ error: "Lab parser not configured" }, { status: 500 })
  }

  let files: FileInput[]
  try {
    const body = await request.json() as Record<string, unknown>
    if (Array.isArray(body.files)) {
      files = body.files as FileInput[]
    } else if (typeof body.pdfBase64 === "string") {
      files = [{ base64: body.pdfBase64, filename: "lab_report.pdf", type: "application/pdf" }]
    } else if (typeof body.file === "string") {
      files = [{ base64: body.file, filename: (body.filename as string) ?? "lab_report.pdf", type: "application/pdf" }]
    } else {
      return NextResponse.json({ error: "Missing files" }, { status: 422 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 422 })
  }

  console.log("[azure] submitting", files.length, "files")

  const results = await Promise.all(files.map((f, i) => processFile(f, i)))

  const succeeded = results.filter((r) => !r.error)
  if (succeeded.length === 0) {
    return NextResponse.json({
      error: "Could not read your lab reports. Try uploading clearer scans or enter your values manually.",
      perFile: results.map((r) => ({ filename: r.filename, error: r.error })),
    }, { status: 422 })
  }

  // Merge markers — most recent collectionDate takes precedence
  const merged: Record<string, number> = {}
  const markerSource: Record<string, string> = {}
  const mergedNotes: Record<string, string> = {}

  const sorted = [...succeeded].sort((a, b) => {
    if (!a.collectionDate && !b.collectionDate) return 0
    if (!a.collectionDate) return 1
    if (!b.collectionDate) return -1
    return b.collectionDate.localeCompare(a.collectionDate)
  })

  for (const result of sorted) {
    for (const [key, val] of Object.entries(result.markers)) {
      if (!(key in merged)) {
        merged[key] = val
        markerSource[key] = result.filename
        if (result.notes?.[key]) mergedNotes[key] = result.notes[key]
      }
    }
  }

  const dates = results.map((r) => r.collectionDate).filter(Boolean) as string[]
  const collectionDate = dates.length > 0 ? dates.sort()[0] : new Date().toISOString().slice(0, 10)
  const labName = results.find((r) => r.labName)?.labName

  console.log("[azure] merged total markers:", Object.keys(merged).length)

  const perFile = results.map((r) => ({
    filename: r.filename,
    markersFound: r.markersFound,
    error: r.error,
  }))

  const failedFiles = results.filter((r) => r.error)
  const warnings = failedFiles.map((f) => `Could not read ${f.filename}`)

  return NextResponse.json({
    status: "complete",
    markers: merged,
    markerSource,
    markerNotes: Object.keys(mergedNotes).length > 0 ? mergedNotes : undefined,
    labName,
    collectionDate,
    markersFound: Object.keys(merged).length,
    parserUsed: "azure",
    filesProcessed: succeeded.length,
    perFile,
    warnings: warnings.length > 0 ? warnings : undefined,
  })
}

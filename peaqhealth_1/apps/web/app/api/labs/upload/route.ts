import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

// ─── Marker name → canonical key mapping ────────────────────────────────────

const MARKERS: Record<string, string> = {
  "ldl": "ldl_mgdL",
  "ldl cholesterol": "ldl_mgdL",
  "ldl-c": "ldl_mgdL",
  "ldl cholesterol calc": "ldl_mgdL",
  "hdl": "hdl_mgdL",
  "hdl cholesterol": "hdl_mgdL",
  "hdl-c": "hdl_mgdL",
  "triglycerides": "triglycerides_mgdL",
  "hs-crp": "hsCRP_mgL",
  "hscrp": "hsCRP_mgL",
  "c-reactive protein": "hsCRP_mgL",
  "high sensitivity crp": "hsCRP_mgL",
  "hba1c": "hba1c_pct",
  "hemoglobin a1c": "hba1c_pct",
  "a1c": "hba1c_pct",
  "glycated hemoglobin": "hba1c_pct",
  "glucose": "glucose_mgdL",
  "fasting glucose": "glucose_mgdL",
  "vitamin d": "vitaminD_ngmL",
  "25-oh vitamin d": "vitaminD_ngmL",
  "vit d": "vitaminD_ngmL",
  "vitamin d, 25-oh": "vitaminD_ngmL",
  "apolipoprotein b": "apoB_mgdL",
  "apob": "apoB_mgdL",
  "apo b": "apoB_mgdL",
  "lipoprotein(a)": "lpa_mgdL",
  "lp(a)": "lpa_mgdL",
  "creatinine": "creatinine_mgdL",
  "egfr": "egfr_mLmin",
  "estimated gfr": "egfr_mLmin",
  "alt": "alt_UL",
  "alt (sgpt)": "alt_UL",
  "alanine aminotransferase": "alt_UL",
  "sgpt": "alt_UL",
  "ast": "ast_UL",
  "ast/sgot": "ast_UL",
  "aspartate aminotransferase": "ast_UL",
  "sgot": "ast_UL",
  "wbc": "wbc_kul",
  "white blood cell": "wbc_kul",
  "white blood cells": "wbc_kul",
  "hemoglobin": "hemoglobin_gdL",
  "hgb": "hemoglobin_gdL",
  "rdw": "rdw_pct",
  "red cell distribution width": "rdw_pct",
  "rdw-cv": "rdw_pct",
  "mcv": "mcv_fL",
  "mean corpuscular volume": "mcv_fL",
  "albumin": "albumin_gdL",
  "bun": "bun_mgdL",
  "blood urea nitrogen": "bun_mgdL",
  "urea nitrogen": "bun_mgdL",
  "alkaline phosphatase": "alkPhos_UL",
  "alk phos": "alkPhos_UL",
  "alp": "alkPhos_UL",
  "total bilirubin": "totalBilirubin_mgdL",
  "bilirubin, total": "totalBilirubin_mgdL",
  "bilirubin total": "totalBilirubin_mgdL",
  "sodium": "sodium_mmolL",
  "potassium": "potassium_mmolL",
  "total cholesterol": "totalCholesterol_mgdL",
  "cholesterol, total": "totalCholesterol_mgdL",
  "non-hdl": "nonHDL_mgdL",
  "non hdl cholesterol": "nonHDL_mgdL",
  "uric acid": "uricAcid_mgdL",
  "ferritin": "ferritin_ngmL",
  "tsh": "tsh_uIUmL",
  "thyroid stimulating hormone": "tsh_uIUmL",
  "testosterone": "testosterone_ngdL",
  "testosterone, total": "testosterone_ngdL",
  "free testosterone": "freeTesto_pgmL",
  "dhea-s": "dhea_s_ugdL",
  "dhea sulfate": "dhea_s_ugdL",
  "igf-1": "igf1_ngmL",
  "insulin-like growth factor": "igf1_ngmL",
  "fasting insulin": "fastingInsulin_uIUmL",
  "homocysteine": "homocysteine_umolL",
  "omega-3 index": "omega3Index_pct",
  "cortisol": "cortisol_ugdL",
  "platelet": "platelets_kul",
  "platelet count": "platelets_kul",
  "rbc": "rbc_mil",
  "red blood cell": "rbc_mil",
  "hematocrit": "hematocrit_pct",
  "mch": "mch_pg",
  "mchc": "mchc_gdl",
  "mpv": "mpv_fl",
  "calcium": "calcium_mgdL",
  "carbon dioxide": "co2_mmolL",
  "co2": "co2_mmolL",
  "chloride": "chloride_mmolL",
  "protein, total": "totalProtein_gdL",
  "total protein": "totalProtein_gdL",
  "globulin": "globulin_gdL",
  "a/g ratio": "agRatio",
  "esr": "esr_mmhr",
  "erythrocyte sedimentation": "esr_mmhr",
  "sed rate": "esr_mmhr",
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
  glucose_mgdL: [40, 600], hsCRP_mgL: [0.1, 200], vitaminD_ngmL: [4, 150],
  hba1c_pct: [3, 15], creatinine_mgdL: [0.3, 15], egfr_mLmin: [5, 200],
  alt_UL: [5, 500], ast_UL: [5, 500], wbc_kul: [1, 30], hemoglobin_gdL: [5, 20],
  rdw_pct: [8, 25], albumin_gdL: [1, 6], bun_mgdL: [2, 100],
  sodium_mmolL: [100, 170], potassium_mmolL: [2, 8], apoB_mgdL: [20, 300],
  lpa_mgdL: [0.5, 300], ferritin_ngmL: [1, 2000], totalCholesterol_mgdL: [50, 500],
  homocysteine_umolL: [2, 50], tsh_uIUmL: [0.1, 20], calcium_mgdL: [5, 15],
  hematocrit_pct: [20, 65], rbc_mil: [2, 8], platelets_kul: [50, 600],
}

// Keywords that precede reference range values, not actual results
const RANGE_KEYWORDS = /(?:normal|reference|range|target|limit|standard|or\s*=)\s*(?:value)?[:\s]*$/i

function extractMarkersFromLines(lines: string[]): Record<string, number> {
  const found: Record<string, number> = {}
  const fullText = lines.join("\n").toLowerCase()

  for (const [markerName, canonicalKey] of SORTED_MARKERS) {
    if (found[canonicalKey]) continue

    const idx = fullText.indexOf(markerName.toLowerCase())
    if (idx === -1) continue

    const surrounding = fullText.slice(idx, idx + 300)
    // Match numbers, but skip those preceded by < > or part of ranges (e.g. "65 - 99")
    const numPattern = /(?<![<>])\b(\d{1,4}\.?\d{0,3})\b(?!\s*[-–]\s*\d)/g
    let match: RegExpExecArray | null
    const range = PLAUSIBLE_RANGES[canonicalKey]

    while ((match = numPattern.exec(surrounding)) !== null) {
      const val = parseFloat(match[1])
      if (val <= 0 || val > 9999) continue

      // Check if this number is preceded by reference range keywords
      const textBefore = surrounding.slice(0, match.index)
      if (RANGE_KEYWORDS.test(textBefore)) continue

      // Sanity check against plausible physiological range
      if (range && (val < range[0] || val > range[1])) continue

      found[canonicalKey] = val
      break
    }
  }

  return found
}

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
    // "Collection date: Dec 11, 2025" or "Collection date: Dec 11, 2025 10:05 AM"
    /collection date[:\s]+(\w+ \d{1,2},?\s*\d{4})/i,
    // "Collected: 12/11/2025"
    /collected[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    // "Collection Date: 12/11/2025"
    /collection date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    // "Date collected: Dec 11, 2025"
    /date collected[:\s]+(\w+ \d{1,2},?\s*\d{4})/i,
    // "Specimen collected: 12/11/25"
    /specimen collected[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    // "Drawn: 12/11/2025"
    /drawn[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    // ISO format: "2025-12-11"
    /(\d{4}-\d{2}-\d{2})/,
    // Standalone: "Dec 11, 2025"
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

async function processFile(file: FileInput, index: number): Promise<FileResult> {
  try {
    const buffer = Buffer.from(file.base64, "base64")
    console.log("[azure] file", index + 1, "submitted, analyzing...")

    const { lines, tables } = await analyzeWithAzure(buffer)
    console.log("[azure] file", index + 1, "analysis complete, lines:", lines.length, "table cells:", tables.length)

    const allLines = [...lines, ...tables]
    const markers = extractMarkersFromLines(allLines)
    const labName = extractLabName(lines)
    const collectionDate = extractCollectionDate(lines)

    console.log("[azure] file", index + 1, "markers found:", Object.keys(markers).length)

    return {
      filename: file.filename,
      markers,
      markersFound: Object.keys(markers).length,
      labName,
      collectionDate,
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

  // Parse request — support both multi-file and single-file (backwards compat)
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

  // Process all files in parallel
  const results = await Promise.all(files.map((f, i) => processFile(f, i)))

  // Check if all failed
  const succeeded = results.filter((r) => !r.error)
  if (succeeded.length === 0) {
    return NextResponse.json({
      error: "Could not read your lab reports. Try uploading clearer scans or enter your values manually.",
      perFile: results.map((r) => ({ filename: r.filename, error: r.error })),
    }, { status: 422 })
  }

  // Merge markers across all files
  // If same marker in multiple files, prefer the one with most recent collectionDate
  const merged: Record<string, number> = {}
  const markerSource: Record<string, string> = {}

  // Sort by collectionDate descending so most recent file's markers take precedence
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
      }
    }
  }

  // Use earliest collectionDate (usually same blood draw split across reports)
  const dates = results.map((r) => r.collectionDate).filter(Boolean) as string[]
  const collectionDate = dates.length > 0 ? dates.sort()[0] : new Date().toISOString().slice(0, 10)

  // Use first lab name found
  const labName = results.find((r) => r.labName)?.labName

  console.log("[azure] merged total markers:", Object.keys(merged).length)

  // Build per-file summary
  const perFile = results.map((r) => ({
    filename: r.filename,
    markersFound: r.markersFound,
    error: r.error,
  }))

  // Note which files failed
  const failedFiles = results.filter((r) => r.error)
  const warnings = failedFiles.map((f) => `Could not read ${f.filename}`)

  return NextResponse.json({
    status: "complete",
    markers: merged,
    markerSource,
    labName,
    collectionDate,
    markersFound: Object.keys(merged).length,
    parserUsed: "azure",
    filesProcessed: succeeded.length,
    perFile,
    warnings: warnings.length > 0 ? warnings : undefined,
  })
}

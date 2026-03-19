import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { AzureOpenAI } from "openai"

// ─── Types ──────────────────────────────────────────────────────────────────

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
  parserUsed: "azure-hybrid" | "failed"
  error?: string
}

// ─── Azure text extraction ───────────────────────────────────────────────────

async function extractTextWithAzure(buffer: Buffer): Promise<string | null> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
  if (!endpoint || !apiKey) return null

  try {
    const analyzeUrl = `${endpoint}documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30`

    const submitRes = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/pdf",
      },
      body: new Uint8Array(buffer),
    })

    if (!submitRes.ok) return null

    const operationUrl = submitRes.headers.get("Operation-Location")
    if (!operationUrl) return null

    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000))

      const pollRes = await fetch(operationUrl, {
        headers: { "Ocp-Apim-Subscription-Key": apiKey },
      })

      if (!pollRes.ok) continue

      const data = await pollRes.json() as Record<string, unknown>
      if (data.status === "succeeded") {
        const result = data.analyzeResult as Record<string, unknown> | undefined
        const pages = (result?.pages ?? []) as Array<{ lines?: Array<{ content: string }> }>
        const tables = (result?.tables ?? []) as Array<{ cells?: Array<{ content: string }> }>

        const allContent = [
          ...pages.flatMap(p => p.lines ?? []).map(l => l.content),
          ...tables.flatMap(t => t.cells ?? []).map(c => c.content).filter(Boolean),
        ].join("\n")

        return allContent
      }

      if (data.status === "failed") return null
    }
  } catch {
    // fall through
  }

  return null
}

// ─── Regex fallback parser ────────────────────────────────────────────────────
// Used when Azure OpenAI fails or times out. Matches known marker names against
// extracted text lines. Handles LabCorp (value on next line) and Quest (value
// after reference range line).

function parseWithRegexFallback(text: string): Record<string, unknown> {
  const markers: Record<string, unknown> = {}
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  // Each entry: [output key, ...search strings (case-insensitive)]
  const DEFS: [string, ...string[]][] = [
    ["ldl_mgdL",            "ldl cholesterol", "ldl-c", "ldl chol"],
    ["hdl_mgdL",            "hdl cholesterol", "hdl-c", "hdl chol"],
    ["triglycerides_mgdL",  "triglycerides", "triglyceride"],
    ["hsCRP_mgL",           "hs-crp", "hscrp", "c-reactive protein, hs", "high-sensitivity crp"],
    ["hba1c_pct",           "hemoglobin a1c", "hba1c", "a1c"],
    ["glucose_mgdL",        "glucose, serum", "glucose, plasma", "glucose"],
    ["vitaminD_ngmL",       "25-oh vitamin d", "25-hydroxyvitamin", "vitamin d, 25-oh"],
    ["apoB_mgdL",           "apolipoprotein b", "apob"],
    ["lpa_mgdL",            "lipoprotein(a)", "lipoprotein (a)", "lp(a)"],
    ["creatinine_mgdL",     "creatinine, serum", "creatinine"],
    ["egfr_mLmin",          "egfr", "glomerular filtration"],
    ["alt_UL",              "alt (sgpt)", "alanine aminotransferase", "alt"],
    ["ast_UL",              "ast (sgot)", "aspartate aminotransferase", "ast"],
    ["wbc_kul",             "wbc", "white blood cell", "leukocytes"],
    ["hemoglobin_gdL",      "hemoglobin", "hgb"],
    ["rdw_pct",             "rdw", "red cell distribution"],
    ["mcv_fL",              "mcv", "mean corpuscular volume"],
    ["albumin_gdL",         "albumin, serum", "albumin"],
    ["bun_mgdL",            "bun", "urea nitrogen"],
    ["alkPhos_UL",          "alkaline phosphatase", "alk phos"],
    ["totalBilirubin_mgdL", "bilirubin, total", "total bilirubin"],
    ["sodium_mmolL",        "sodium, serum", "sodium"],
    ["potassium_mmolL",     "potassium, serum", "potassium"],
    ["totalCholesterol_mgdL","total cholesterol", "cholesterol, total"],
    ["nonHDL_mgdL",         "non-hdl cholesterol", "non hdl"],
    ["testosterone_ngdL",   "testosterone, serum", "testosterone, total"],
    ["freeTesto_pgmL",      "free testosterone", "testosterone, free"],
    ["shbg_nmolL",          "shbg", "sex hormone binding"],
    ["ferritin_ngmL",       "ferritin, serum", "ferritin"],
    ["tsh_uIUmL",           "tsh", "thyroid stimulating"],
  ]

  const numOnLine = (s: string): number | null => {
    // standalone number, possibly with decimal
    const m = s.match(/^\s*(\d+\.?\d*)\s*$/)
    return m ? parseFloat(m[1]) : null
  }

  for (const [key, ...patterns] of DEFS) {
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase()
      if (!patterns.some(p => lower.includes(p))) continue

      // Check current line for "Label: 1.23" or "Label 1.23 unit"
      const inline = lines[i].match(/[\s:]+(\d+\.?\d+)\s*(?:mg|g|mmol|nmol|ng|pg|iu|ul|fl|%|ratio|k\/ul|x10)?\/?\S*\s*$/i)
      if (inline) { markers[key] = parseFloat(inline[1]); break }

      // Check next 3 lines for a standalone number (LabCorp / Quest pattern)
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const n = numOnLine(lines[j])
        if (n !== null && n > 0) { markers[key] = n; break }
        // Skip lines that look like reference ranges
        if (lines[j].match(/\d+\s*[-–]\s*\d+/)) continue
        // Stop if next line is a different marker name (long text)
        if (lines[j].length > 30 && !/^\d/.test(lines[j])) break
      }
      if (markers[key]) break
    }
  }

  // labName heuristic
  const allText = text.toLowerCase()
  if (allText.includes("labcorp")) markers.labName = "LabCorp"
  else if (allText.includes("quest")) markers.labName = "Quest Diagnostics"

  // collection date
  const dateMatch = text.match(/(?:collected|collection date|date collected)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i)
  if (dateMatch) {
    const raw = dateMatch[1]
    const parts = raw.split(/[-\/]/)
    if (parts.length === 3) {
      // Normalize to YYYY-MM-DD
      const [a, b, c] = parts.map(Number)
      markers.collectionDate = a > 31
        ? `${a}-${String(b).padStart(2,"0")}-${String(c).padStart(2,"0")}`
        : `${c > 99 ? c : 2000 + c}-${String(a).padStart(2,"0")}-${String(b).padStart(2,"0")}`
    }
  }

  return markers
}

// ─── Azure OpenAI parser (primary) ───────────────────────────────────────────

async function parseWithAzureOpenAI(fullText: string): Promise<Record<string, unknown> | null> {
  const azureOpenAIKey = process.env.AZURE_OPENAI_KEY
  if (!azureOpenAIKey) return null

  console.log("[azure-openai] calling endpoint:", process.env.AZURE_OPENAI_ENDPOINT)
  console.log("[azure-openai] deployment:", process.env.AZURE_OPENAI_DEPLOYMENT)
  console.log("[azure-openai] key present:", !!azureOpenAIKey)

  const openai = new AzureOpenAI({
    apiKey: azureOpenAIKey,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: "2024-08-01-preview",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      max_tokens: 2000,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You are a medical lab report parser.
Extract ALL test results and return ONLY valid JSON.
No markdown, no backticks, no explanation.`,
        },
        {
          role: "user",
          content: `Parse this lab report and return JSON.

LABCORP FORMAT RULES:
- Lines end with lab code: "TestName B, 01"
- Value is ALWAYS the next line after the lab code
- "Apolipoprotein B B, 01" next line = ApoB value
- Lp(a) in nmol/L → divide by 2.5 for mg/dL
- Skip "Ordered Items:" header line with semicolons
- Never use reference range values

QUEST MYCHART FORMAT RULES:
- Format: MarkerName → Normal range line →
  reference numbers line → RESULT [High/Low]
- Result is the standalone number after
  the reference range
- Never use the "Normal range:" numbers

UNIVERSAL RULES:
- Only extract markers with real result values
- Never use 0 as a value — omit if not found
- collectionDate in YYYY-MM-DD format
- labName: "LabCorp" or "Quest Diagnostics"

Return JSON with these exact keys where found:
{
  "ldl_mgdL": number,
  "hdl_mgdL": number,
  "triglycerides_mgdL": number,
  "hsCRP_mgL": number,
  "hba1c_pct": number,
  "glucose_mgdL": number,
  "vitaminD_ngmL": number,
  "apoB_mgdL": number,
  "lpa_mgdL": number,
  "creatinine_mgdL": number,
  "egfr_mLmin": number,
  "alt_UL": number,
  "ast_UL": number,
  "wbc_kul": number,
  "hemoglobin_gdL": number,
  "rdw_pct": number,
  "mcv_fL": number,
  "albumin_gdL": number,
  "bun_mgdL": number,
  "alkPhos_UL": number,
  "totalBilirubin_mgdL": number,
  "sodium_mmolL": number,
  "potassium_mmolL": number,
  "totalCholesterol_mgdL": number,
  "nonHDL_mgdL": number,
  "testosterone_ngdL": number,
  "freeTesto_pgmL": number,
  "shbg_nmolL": number,
  "vldl_mgdL": number,
  "uricAcid_mgdL": number,
  "ferritin_ngmL": number,
  "tsh_uIUmL": number,
  "hematocrit_pct": number,
  "platelets_kul": number,
  "rbc_mil": number,
  "mch_pg": number,
  "mchc_gdl": number,
  "neutrophils_pct": number,
  "lymphs_pct": number,
  "globulin_gdL": number,
  "totalProtein_gdL": number,
  "calcium_mgdL": number,
  "chloride_mmolL": number,
  "co2_mmolL": number,
  "collectionDate": "YYYY-MM-DD",
  "labName": "string"
}

LAB REPORT TEXT:
${fullText}`,
        },
      ],
    }, { signal: controller.signal })

    const raw = response.choices[0]?.message?.content
    if (!raw) return null

    console.log("[azure-gpt4o-raw]", raw.slice(0, 400))

    const clean = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    return JSON.parse(clean) as Record<string, unknown>
  } catch (err) {
    const e = err as { message?: string; status?: number; code?: string }
    console.error("[azure-openai] error:", e.message, "status:", e.status, "code:", e.code)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── Extract markers from parsed JSON ───────────────────────────────────────

function extractFromParsedJson(
  parsed: Record<string, unknown>
): { markers: Record<string, number>; labName?: string; collectionDate?: string } {
  const markers: Record<string, number> = {}
  let labName: string | undefined
  let collectionDate: string | undefined

  for (const [key, val] of Object.entries(parsed)) {
    if (key === "labName" && typeof val === "string") {
      labName = val
      continue
    }
    if (key === "collectionDate" && typeof val === "string") {
      collectionDate = val
      continue
    }
    if (typeof val === "number" && val > 0) {
      markers[key] = val
    } else if (typeof val === "string") {
      const num = parseFloat(val)
      if (!isNaN(num) && num > 0) markers[key] = num
    }
  }

  // Calculate LDL:HDL ratio if both present
  if (markers.ldl_mgdL && markers.hdl_mgdL) {
    markers.ldlHdlRatio = Math.round((markers.ldl_mgdL / markers.hdl_mgdL) * 100) / 100
  }

  return { markers, labName, collectionDate }
}

// ─── File processing ────────────────────────────────────────────────────────

async function processFile(file: FileInput, index: number): Promise<FileResult> {
  console.log("[parser] file", index + 1, "starting...")

  const buffer = Buffer.from(file.base64, "base64")
  const fullText = await extractTextWithAzure(buffer)

  if (fullText) {
    console.log("[parser] Azure extracted text length:", fullText.length)

    // Try Azure OpenAI first
    const openaiResult = await parseWithAzureOpenAI(fullText)
    if (openaiResult) {
      const { markers, labName, collectionDate } = extractFromParsedJson(openaiResult)
      if (Object.keys(markers).length > 0) {
        console.log("[parser] used: azure-hybrid — markers:", Object.keys(markers).length)
        return { filename: file.filename, markers, markersFound: Object.keys(markers).length, labName, collectionDate, parserUsed: "azure-hybrid" }
      }
    }

    // Fallback: regex parser
    console.log("[parser] falling back to regex parser")
    const regexResult = parseWithRegexFallback(fullText)
    const { markers, labName, collectionDate } = extractFromParsedJson(regexResult)
    if (Object.keys(markers).length > 0) {
      console.log("[parser] used: regex-fallback — markers:", Object.keys(markers).length)
      return { filename: file.filename, markers, markersFound: Object.keys(markers).length, labName, collectionDate, parserUsed: "azure-hybrid" }
    }
  }

  console.log("[parser] used: failed — no markers extracted")
  return {
    filename: file.filename,
    markers: {},
    markersFound: 0,
    parserUsed: "failed",
    error: "Could not extract markers from this file",
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.AZURE_OPENAI_KEY || !process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
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
  const parsersUsed = [...new Set(succeeded.map((r) => r.parserUsed))]

  console.log("[parser] merged total markers:", Object.keys(merged).length, "parsers:", parsersUsed.join(", "))

  const perFile = results.map((r) => ({
    filename: r.filename,
    markersFound: r.markersFound,
    parserUsed: r.parserUsed,
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
    parserUsed: parsersUsed.join(", "),
    filesProcessed: succeeded.length,
    perFile,
    warnings: warnings.length > 0 ? warnings : undefined,
  })
}

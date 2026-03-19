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

// ─── Azure Document Intelligence + Azure OpenAI parser (primary) ─────────────

async function parseWithAzureHybrid(fileBase64: string): Promise<Record<string, unknown> | null> {
  const azureOpenAIKey = process.env.AZURE_OPENAI_KEY
  if (!azureOpenAIKey) return null

  const buffer = Buffer.from(fileBase64, "base64")
  const fullText = await extractTextWithAzure(buffer)
  if (!fullText) return null

  console.log("[parser] Azure extracted text length:", fullText.length)

  const openai = new AzureOpenAI({
    apiKey: azureOpenAIKey,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: "2024-08-01-preview",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  })

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

CRITICAL - APOLIPOPROTEIN B (ApoB):
In LabCorp reports, ApoB appears on its own separate page with this exact structure:
  'Apolipoprotein B'
  'Test  Current Result and Flag  ...'
  'Apolipoprotein B B, 01  [VALUE]  mg/dL  <90'
  'Desirable < 90'
  'Borderline High 90 - 99'
  etc.

The VALUE is a number between 40-200.
It appears BEFORE the 'Desirable' reference table.
NEVER return null for ApoB if you see 'Apolipoprotein B' followed by a number.
Example: 'Apolipoprotein B B, 01  70  mg/dL'
→ apoB_mgdL: 70

QUEST MYCHART FORMAT RULES:
- Format: MarkerName → Normal range line →
  reference numbers line → RESULT [High/Low]
- Result is the standalone number after
  the reference range
- Never use the "Normal range:" numbers

UNIVERSAL RULES:
- Only extract markers with real result values
- Never use 0 as a value — omit if not found
- Omit keys entirely when not found — do NOT return null values
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
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) return null

    console.log("[azure-gpt4o-raw]", raw.slice(0, 400))

    const clean = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    return JSON.parse(clean) as Record<string, unknown>
  } catch (err) {
    console.error("[azure-openai] failed:", err instanceof Error ? err.message : "unknown error")
    return null
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

  const hybridResult = await parseWithAzureHybrid(file.base64)
  if (hybridResult) {
    const { markers, labName, collectionDate } = extractFromParsedJson(hybridResult)
    if (Object.keys(markers).length > 0) {
      console.log("[parser] used: azure-hybrid — markers:", Object.keys(markers).length)
      return {
        filename: file.filename,
        markers,
        markersFound: Object.keys(markers).length,
        labName,
        collectionDate,
        parserUsed: "azure-hybrid",
      }
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

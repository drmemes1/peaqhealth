import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import OpenAI from "openai"

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
  parserUsed: "openai" | "azure-hybrid" | "failed"
  error?: string
}

// ─── OpenAI prompt ──────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a medical lab report parser. Extract ALL lab test results from this document.
Return ONLY a valid JSON object with no other text, no markdown fences, no explanation.

Use these exact key names where applicable:
ldl_mgdL, hdl_mgdL, triglycerides_mgdL, hsCRP_mgL, hba1c_pct, glucose_mgdL,
vitaminD_ngmL, apoB_mgdL, lpa_mgdL, creatinine_mgdL, egfr_mLmin, alt_UL, ast_UL,
wbc_kul, hemoglobin_gdL, rdw_pct, mcv_fL, albumin_gdL, bun_mgdL, alkPhos_UL,
totalBilirubin_mgdL, sodium_mmolL, potassium_mmolL, totalCholesterol_mgdL,
nonHDL_mgdL, testosterone_ngdL, freeTesto_pgmL, shbg_nmolL, vldl_mgdL,
uricAcid_mgdL, ferritin_ngmL, tsh_uIUmL, homocysteine_umolL, omega3Index_pct,
cortisol_ugdL, dhea_s_ugdL, igf1_ngmL, fastingInsulin_uIUmL, hematocrit_pct,
platelets_kul, rbc_mil, mch_pg, mchc_gdl, neutrophils_pct, lymphs_pct,
globulin_gdL, totalProtein_gdL, calcium_mgdL, chloride_mmolL, co2_mmolL,
esr_mmhr, mpv_fl, agRatio,
collectionDate, labName

Rules:
- Only include markers actually present in the report
- Use the RESULT value, NOT reference ranges
- For Lp(a) in nmol/L, convert to mg/dL by dividing by 2.5
- All numeric values should be numbers, not strings
- collectionDate should be the specimen collection date in YYYY-MM-DD format
- labName should be the laboratory name (Quest Diagnostics, LabCorp, etc)
- Omit any marker not found — do not include null values`

// ─── OpenAI Vision parser (primary) ─────────────────────────────────────────

async function parseWithOpenAIVision(fileBase64: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const openai = new OpenAI({ apiKey })

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: EXTRACTION_PROMPT },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${fileBase64}`,
              detail: "high",
            },
          },
        ],
      }],
    })

    const text = response.choices[0]?.message?.content?.trim() ?? ""
    // Strip markdown fences if present
    const jsonStr = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim()
    return JSON.parse(jsonStr) as Record<string, unknown>
  } catch (err) {
    console.log("[parser] OpenAI vision failed:", err instanceof Error ? err.message : "unknown error")
    return null
  }
}

// ─── Azure text extraction + OpenAI text parser (hybrid fallback) ────────────

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

        const allText: string[] = []
        for (const page of pages) {
          for (const line of page.lines ?? []) allText.push(line.content)
        }
        for (const table of tables) {
          for (const cell of table.cells ?? []) allText.push(cell.content)
        }

        return allText.join("\n")
      }

      if (data.status === "failed") return null
    }
  } catch {
    // fall through
  }

  return null
}

async function parseWithAzureHybrid(fileBase64: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const buffer = Buffer.from(fileBase64, "base64")
  const azureText = await extractTextWithAzure(buffer)
  if (!azureText) return null

  console.log("[parser] Azure extracted text length:", azureText.length)

  const openai = new OpenAI({ apiKey })

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nLab report text:\n\n${azureText}`,
      }],
    })

    const text = response.choices[0]?.message?.content?.trim() ?? ""
    const jsonStr = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim()
    return JSON.parse(jsonStr) as Record<string, unknown>
  } catch (err) {
    console.log("[parser] Azure hybrid GPT parse failed:", err instanceof Error ? err.message : "unknown error")
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

  // Strategy 1: OpenAI Vision (primary)
  const visionResult = await parseWithOpenAIVision(file.base64)
  if (visionResult) {
    const { markers, labName, collectionDate } = extractFromParsedJson(visionResult)
    if (Object.keys(markers).length > 0) {
      console.log("[parser] used: openai — markers:", Object.keys(markers).length)
      return {
        filename: file.filename,
        markers,
        markersFound: Object.keys(markers).length,
        labName,
        collectionDate,
        parserUsed: "openai",
      }
    }
  }

  // Strategy 2: Azure text extraction + OpenAI text parsing (hybrid)
  console.log("[parser] OpenAI vision returned 0 markers, trying Azure hybrid...")
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

  // Both failed
  console.log("[parser] used: failed — no markers from either parser")
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

  if (!process.env.OPENAI_API_KEY && !process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
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

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

async function extractTextWithAzure(buffer: Buffer, model = "prebuilt-layout"): Promise<string | null> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
  if (!endpoint || !apiKey) return null

  try {
    const analyzeUrl = `${endpoint}documentintelligence/documentModels/${model}:analyze?api-version=2024-11-30`

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
    const messages = [
        {
          role: "system" as const,
          content: `You are a medical lab report parser. Extract EVERY lab value present in the text regardless of lab format, section header, or abbreviation used. Ignore all vendor notes, reference ranges, ratio tables, and classification guidelines — only extract the patient's actual numeric result next to the test name. Map common synonyms: GLUCOSE=glucose_mgdL, HGB/HEMOGLOBIN=hemoglobin_gdL, HCT/HEMATOCRIT=hematocrit_pct, GLYCOHEMOGLOBIN/HbA1c=hba1c_pct, ALBUMIN=albumin_gdL, ALT/ALT SGPT=alt_UL, AST/AST SGOT=ast_UL, WBC/WBC AUTOMATED=wbc_kul, RDW=rdw_pct, MCV=mcv_fL, VITAMIN D/VITAMIN D,25-HYDROXY=vitaminD_ngmL, VITAMIN B12=vitaminB12_pgmL, FOLATE=folate_ngmL, GFR ESTIMATION/eGFR=egfr_mLmin, BUN=bun_mgdL, CREATININE=creatinine_mgdL, PLT/PLATELETS=platelets_kul, RBC=rbc_mil, NEUTROPHILS %=neutrophils_pct, LYMPHOCYTES %/LYMPHS=lymphs_pct. Return null for fields not found. Return ONLY valid JSON. Start your response with { and end with }.`,
        },
        {
          role: "user" as const,
          content: `Parse this lab report and return JSON.

EXTRACTION RULES:
- Extract the PATIENT RESULT value only — never use reference range numbers
- Never use 0 as a value — use null if not found
- If Lp(a) is reported in nmol/L, convert to mg/dL by dividing by 2.5
- collectionDate in YYYY-MM-DD format
- labName: the lab company name found in the report (e.g. "LabCorp", "Quest Diagnostics")
- For Apolipoprotein B: the result is the number immediately following the test name, before any reference table

COMMON SYNONYMS (map these to the field shown):
- CRP High Sensitivity / hs-CRP / C-Reactive Protein = hsCRP_mgL
- Glycohemoglobin / Hemoglobin A1c / GLYCOHEMOGLOBIN / HbA1c = hba1c_pct
- GLUCOSE / Glucose, Fasting / Glucose, Serum = glucose_mgdL
- HGB / Hgb / HEMOGLOBIN = hemoglobin_gdL
- HCT / HEMATOCRIT = hematocrit_pct
- ALBUMIN = albumin_gdL
- ALT / ALT SGPT / Alanine Aminotransferase = alt_UL
- AST / AST SGOT / Aspartate Aminotransferase = ast_UL
- WBC / WBC AUTOMATED / White Blood Cell Count = wbc_kul
- RDW = rdw_pct
- MCV = mcv_fL
- BUN / Blood Urea Nitrogen = bun_mgdL
- CREATININE / Creatinine, Serum = creatinine_mgdL
- 25-Hydroxyvitamin D / Vitamin D 25-OH / VITAMIN D / VITAMIN D,25-HYDROXY / 25-OH Vit D = vitaminD_ngmL
- VITAMIN B12 / Cobalamin = vitaminB12_pgmL
- FOLATE / Folic Acid = folate_ngmL
- GFR ESTIMATION / eGFR Non-African / Glomerular Filtration Rate = egfr_mLmin
- Lipoprotein (a) / Lp(a) = lpa_mgdL
- Alkaline Phosphatase / Alk Phos = alkPhos_UL
- Thyroid Stimulating Hormone = tsh_uIUmL
- Thyroxine Free / T4 Free / FT4 = free_t4_ngdL
- Triiodothyronine Free / T3 Free / FT3 = free_t3_pgmL
- DHEA Sulfate / DHEA-S = dhea_s_ugdL
- Insulin-Like Growth Factor / IGF-1 = igf1_ngmL
- Anti-Thyroid Peroxidase / TPO Antibodies = tpoAntibodies_iuML
- Prostate Specific Antigen / PSA = psa_ngmL
- Carcinoembryonic Antigen / CEA = cea_ngmL
- CA 19-9 / Carbohydrate Antigen 19-9 = ca199_UmL

Return JSON with EVERY field below — use null for fields not found, never omit:
{
  "ldl_mgdL": "LDL Cholesterol in mg/dL",
  "hdl_mgdL": "HDL Cholesterol in mg/dL",
  "triglycerides_mgdL": "Triglycerides in mg/dL",
  "totalCholesterol_mgdL": "Total Cholesterol in mg/dL",
  "nonHDL_mgdL": "Non-HDL Cholesterol in mg/dL",
  "vldl_mgdL": "VLDL Cholesterol in mg/dL",
  "hsCRP_mgL": "hs-CRP or C-Reactive Protein value in mg/L",
  "hba1c_pct": "HbA1c or Hemoglobin A1c as percentage",
  "glucose_mgdL": "Glucose or Fasting Glucose in mg/dL",
  "fastingInsulin_uIUmL": "Insulin Fasting in uIU/mL",
  "vitaminD_ngmL": "Vitamin D 25-OH or 25-Hydroxyvitamin D in ng/mL",
  "apoB_mgdL": "ApoB or Apolipoprotein B in mg/dL",
  "lpa_mgdL": "Lp(a) or Lipoprotein(a) in mg/dL",
  "homocysteine_umolL": "Homocysteine in umol/L",
  "uricAcid_mgdL": "Uric Acid in mg/dL",
  "creatinine_mgdL": "Creatinine in mg/dL",
  "egfr_mLmin": "eGFR Non-African American in mL/min/1.73m2",
  "bun_mgdL": "BUN or Blood Urea Nitrogen in mg/dL",
  "alt_UL": "ALT or Alanine Aminotransferase in U/L",
  "ast_UL": "AST or Aspartate Aminotransferase in U/L",
  "alkPhos_UL": "Alk Phos or Alkaline Phosphatase in U/L",
  "totalBilirubin_mgdL": "Total Bilirubin in mg/dL",
  "albumin_gdL": "Albumin in g/dL",
  "globulin_gdL": "Globulin in g/dL",
  "totalProtein_gdL": "Total Protein in g/dL",
  "sodium_mmolL": "Sodium in mmol/L or mEq/L",
  "potassium_mmolL": "Potassium in mmol/L or mEq/L",
  "calcium_mgdL": "Calcium in mg/dL",
  "chloride_mmolL": "Chloride in mmol/L or mEq/L",
  "co2_mmolL": "CO2 or Bicarbonate in mmol/L",
  "wbc_kul": "WBC or White Blood Cell count in K/uL",
  "hemoglobin_gdL": "Hemoglobin in g/dL",
  "hematocrit_pct": "Hematocrit as %",
  "rdw_pct": "RDW or Red Cell Distribution Width as %",
  "mcv_fL": "MCV or Mean Corpuscular Volume in fL",
  "mch_pg": "MCH in pg",
  "mchc_gdl": "MCHC in g/dL",
  "platelets_kul": "Platelets in K/uL",
  "rbc_mil": "RBC in million/uL",
  "neutrophils_pct": "Neutrophils %",
  "lymphs_pct": "Lymphocytes %",
  "ferritin_ngmL": "Ferritin in ng/mL",
  "testosterone_ngdL": "Testosterone Total in ng/dL",
  "freeTesto_pgmL": "Testosterone Free in pg/mL",
  "shbg_nmolL": "SHBG or Sex Hormone Binding Globulin in nmol/L",
  "tsh_uIUmL": "TSH or Thyroid Stimulating Hormone in uIU/mL",
  "free_t4_ngdL": "Free T4 or Thyroxine Free in ng/dL",
  "free_t3_pgmL": "Free T3 or Triiodothyronine Free in pg/mL",
  "dhea_s_ugdL": "DHEA-S or DHEA Sulfate in ug/dL",
  "igf1_ngmL": "IGF-1 in ng/mL",
  "cortisol_ugdL": "Cortisol in ug/dL",
  "vitaminB12_pgmL": "Vitamin B12 or Cobalamin in pg/mL",
  "folate_ngmL": "Folate or Folic Acid in ng/mL",
  "psa_ngmL": "PSA or Prostate Specific Antigen in ng/mL",
  "cea_ngmL": "CEA or Carcinoembryonic Antigen in ng/mL",
  "ca199_UmL": "CA 19-9 or Carbohydrate Antigen 19-9 in U/mL",
  "thyroglobulin_ngmL": "Thyroglobulin in ng/mL",
  "tpoAntibodies_iuML": "TPO Antibodies or Anti-Thyroid Peroxidase in IU/mL",
  "collectionDate": "YYYY-MM-DD",
  "labName": "lab company name from the report"
}

LAB REPORT TEXT:
${fullText}`,
        },
    ]
    console.log("[azure-system-prompt-first100]", messages.find(m => m.role === "system")?.content?.substring(0, 100))
    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      max_tokens: 4096,
      temperature: 0,
      messages,
    }, { signal: controller.signal })

    const raw = response.choices[0]?.message?.content
    const finishReason = response.choices[0]?.finish_reason
    console.log("[azure-openai] finish_reason:", finishReason)
    console.log("[azure-openai] response length:", raw?.length)
    if (finishReason === "length") {
      console.warn("[azure-openai] TRUNCATED — increase max_tokens")
    }
    if (!raw) return null

    console.log("[azure-gpt4o-raw]", raw.slice(0, 400))

    const clean = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    const parsed = JSON.parse(clean) as Record<string, unknown>
    console.log("[azure-gpt4o-full]", JSON.stringify(parsed, null, 0))
    console.log("[azure-gpt4o-glucose]", parsed?.glucose_mgdL)
    console.log("[azure-gpt4o-hba1c]", parsed?.hba1c_pct)
    return parsed
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
  let fullText = await extractTextWithAzure(buffer)

  if (fullText && fullText.length < 3000) {
    console.warn("[parser] low text yield — possible scanned PDF")
    const ocrText = await extractTextWithAzure(buffer, "prebuilt-read")
    if (ocrText && ocrText.length > (fullText?.length ?? 0)) {
      console.log("[parser] OCR retry improved yield:", ocrText.length)
      fullText = ocrText
    }
    if (!fullText || fullText.length < 1000) {
      return {
        filename: file.filename,
        markers: {},
        markersFound: 0,
        parserUsed: "failed",
        error: "We couldn't extract text from this PDF. If it's a scanned document, try downloading a fresh copy from your LabCorp patient portal (labcorplink.com) — portal PDFs are text-based and parse correctly.",
      }
    }
  }

  if (fullText) {
    console.log("[parser] total extracted text:", fullText.length, "chars")

    // Split into 12,000-char chunks so long reports don't get truncated
    const CHUNK_SIZE = 12000
    const chunks: string[] = []
    for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
      chunks.push(fullText.slice(i, i + CHUNK_SIZE))
    }
    console.log("[parser] text sent to GPT-4o:", Math.min(fullText.length, CHUNK_SIZE * chunks.length), "chars across", chunks.length, "chunk(s)")

    // Call GPT-4o per chunk and merge — later non-null values override earlier nulls
    let mergedOpenAIResult: Record<string, unknown> | null = null
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunkResult = await parseWithAzureOpenAI(chunks[ci])
      if (!chunkResult) continue
      if (!mergedOpenAIResult) {
        mergedOpenAIResult = { ...chunkResult }
      } else {
        // Later chunks override nulls; collectionDate and labName from first chunk only
        for (const [k, v] of Object.entries(chunkResult)) {
          if (k === "collectionDate" || k === "labName") continue
          if (v !== null && v !== undefined && mergedOpenAIResult[k] == null) {
            mergedOpenAIResult[k] = v
          }
        }
      }
    }

    if (mergedOpenAIResult) {
      const { markers, labName, collectionDate } = extractFromParsedJson(mergedOpenAIResult)
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

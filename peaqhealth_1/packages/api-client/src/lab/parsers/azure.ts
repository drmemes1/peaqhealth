import type { LabParser, LabParserResult, ParsedMarker } from '@peaq/types/lab-parser'
import { lookupMarker } from '../marker-map'

// ─── Reverse map: canonicalKey → display name ─────────────────────────────────

const CANONICAL_NAMES: Record<string, string> = {
  ldl_mgdL:              "LDL Cholesterol",
  hdl_mgdL:              "HDL Cholesterol",
  triglycerides_mgdL:    "Triglycerides",
  hsCRP_mgL:             "hs-CRP",
  hba1c_pct:             "HbA1c",
  glucose_mgdL:          "Glucose",
  vitaminD_ngmL:         "Vitamin D",
  apoB_mgdL:             "ApoB",
  lpa_mgdL:              "Lp(a)",
  creatinine_mgdL:       "Creatinine",
  egfr_mLmin:            "eGFR",
  alt_UL:                "ALT",
  ast_UL:                "AST",
  wbc_kul:               "WBC",
  hemoglobin_gdL:        "Hemoglobin",
  rdw_pct:               "RDW",
  mcv_fL:                "MCV",
  albumin_gdL:           "Albumin",
  bun_mgdL:              "BUN",
  alkPhos_UL:            "Alkaline Phosphatase",
  totalBilirubin_mgdL:   "Total Bilirubin",
  sodium_mmolL:          "Sodium",
  potassium_mmolL:       "Potassium",
  totalCholesterol_mgdL: "Total Cholesterol",
  nonHDL_mgdL:           "Non-HDL Cholesterol",
  uricAcid_mgdL:         "Uric Acid",
  ferritin_ngmL:         "Ferritin",
  tsh_uIUmL:             "TSH",
  testosterone_ngdL:     "Testosterone",
  freeTesto_pgmL:        "Free Testosterone",
  dhea_s_ugdL:           "DHEA-S",
  igf1_ngmL:             "IGF-1",
  fastingInsulin_uIUmL:  "Fasting Insulin",
  omega3Index_pct:       "Omega-3 Index",
  homocysteine_umolL:    "Homocysteine",
  cortisol_ugdL:         "Cortisol",
  esr_mmhr:              "ESR",
}

// ─── Azure Document Intelligence lab parser ───────────────────────────────────

export class AzureLabParser implements LabParser {
  private endpoint: string
  private apiKey: string

  constructor() {
    this.endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!
    this.apiKey   = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY!
  }

  async parse(
    fileBase64: string,
    fileType: string,
    _userId: string
  ): Promise<LabParserResult> {
    const buffer = Buffer.from(fileBase64, 'base64')

    // Submit for analysis using prebuilt-layout model
    const analyzeUrl =
      `${this.endpoint}documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30`

    const contentType =
      fileType === 'application/pdf' ? 'application/pdf' : 'image/jpeg'

    const submitRes = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': contentType,
      },
      body: buffer,
    })

    if (!submitRes.ok) {
      throw new Error(`Azure submit failed: ${submitRes.status}`)
    }

    const operationUrl = submitRes.headers.get('Operation-Location')
    if (!operationUrl) {
      throw new Error('Azure did not return Operation-Location header')
    }

    // Poll for completion (max 30s, 15 × 2s)
    let result: AzureAnalyzeResult | null = null
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000))

      const pollRes = await fetch(operationUrl, {
        headers: { 'Ocp-Apim-Subscription-Key': this.apiKey },
      })
      const data = await pollRes.json() as AzureAnalyzeResult

      if (data.status === 'succeeded') { result = data; break }
      if (data.status === 'failed')    { throw new Error('Azure analysis failed') }
    }

    if (!result) throw new Error('Azure analysis timed out after 30s')

    const markers        = extractMarkers(result)
    const labName        = extractLabName(result)
    const collectionDate = extractCollectionDate(result)

    return {
      markers,
      labName,
      collectionDate,
      parserUsed:      'azure',
      parseConfidence: markers.length > 0 ? 0.85 : 0.3,
      markersFound:    markers.length,
    }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface AzureLine  { content: string }
interface AzurePage  { lines?: AzureLine[] }
interface AzureCell  { content: string }
interface AzureTable { cells?: AzureCell[] }

interface AzureAnalyzeResult {
  status: 'running' | 'succeeded' | 'failed'
  analyzeResult?: {
    pages?:  AzurePage[]
    tables?: AzureTable[]
  }
}

function allLines(result: AzureAnalyzeResult): string[] {
  const lines: string[] = []
  for (const page of result.analyzeResult?.pages ?? []) {
    for (const line of page.lines ?? []) lines.push(line.content)
  }
  for (const table of result.analyzeResult?.tables ?? []) {
    for (const cell of table.cells ?? []) lines.push(cell.content)
  }
  return lines
}

const UNIT_RE = /mg\/dl|mg\/l|g\/dl|%|u\/l|iu\/ml|ng\/ml|mmol\/l|pg\/ml|fl|k\/ul|µiu\/ml|uiu\/ml|mm\/hr/i

function extractMarkers(result: AzureAnalyzeResult): ParsedMarker[] {
  const markers: ParsedMarker[] = []
  const seen    = new Set<string>()
  const lines   = allLines(result)

  for (let i = 0; i < lines.length; i++) {
    const line         = lines[i].trim()
    const canonicalKey = lookupMarker(line)
    if (!canonicalKey || seen.has(canonicalKey)) continue

    // Try same-line pattern: "LDL Cholesterol  169  mg/dL"
    const sameLineMatch = line.match(/[\d.]+\s*(?:mg\/dl|mg\/l|g\/dl|%|u\/l|iu\/ml|ng\/ml|mmol\/l|pg\/ml|fl|k\/ul|µiu\/ml|uiu\/ml|mm\/hr)/i)

    let value:   number | null = null
    let unit                   = ''
    let rawText                = line

    if (sameLineMatch) {
      const numStr = sameLineMatch[0].match(/[\d.]+/)
      if (numStr) {
        value   = parseFloat(numStr[0])
        const u = sameLineMatch[0].match(UNIT_RE)
        unit    = u ? u[0] : ''
      }
    } else {
      // Look ahead up to 3 lines for value + unit
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const next = lines[j].trim()
        if (/^[\d.]+$/.test(next)) {
          value   = parseFloat(next)
          rawText = `${line} ${next}`
          // unit on next line?
          const unitLine = lines[j + 1]?.trim() ?? ''
          if (UNIT_RE.test(unitLine)) {
            unit    = unitLine
            rawText = `${rawText} ${unitLine}`
          }
          break
        }
        // value+unit on same next line: "169 mg/dL"
        const valUnit = next.match(/^([\d.]+)\s*(?:mg\/dl|mg\/l|g\/dl|%|u\/l|iu\/ml|ng\/ml|mmol\/l|pg\/ml|fl|k\/ul|µiu\/ml|uiu\/ml|mm\/hr)/i)
        if (valUnit) {
          value   = parseFloat(valUnit[1])
          const u = next.match(UNIT_RE)
          unit    = u ? u[0] : ''
          rawText = `${line} ${next}`
          break
        }
      }
    }

    if (value === null || isNaN(value)) continue

    seen.add(canonicalKey)
    markers.push({
      canonicalKey,
      canonicalName:  CANONICAL_NAMES[canonicalKey] ?? line,
      aliases:        [],
      value,
      unit,
      normalizedUnit: unit.toLowerCase().replace(/\s/g, ''),
      interpretation: 'unknown',
      confidence:     0.8,
      rawText,
    })
  }

  return markers
}

function extractLabName(result: AzureAnalyzeResult): string | undefined {
  const text = (result.analyzeResult?.pages?.[0]?.lines ?? [])
    .map((l) => l.content)
    .join(' ')
    .toLowerCase()

  if (text.includes('quest'))   return 'Quest Diagnostics'
  if (text.includes('labcorp')) return 'LabCorp'
  if (text.includes('mayo'))    return 'Mayo Clinic Labs'
  return undefined
}

function extractCollectionDate(result: AzureAnalyzeResult): string | undefined {
  const fullText = (result.analyzeResult?.pages ?? [])
    .flatMap((p) => (p.lines ?? []).map((l) => l.content))
    .join('\n')

  const match = fullText.match(
    /collection\s*date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},?\s*\d{4})/i
  )
  return match?.[1]
}

/**
 * Single-source-of-truth blood-marker parser.
 *
 * Takes a PDF buffer, renders it to PNG pages via unpdf, sends them to
 * OpenAI's GPT-4o vision model with the marker registry as the target
 * list, and returns a validated `ParseResult` keyed by registry id.
 *
 * This file replaces the per-format / per-lab branching parser at
 * apps/web/app/api/labs/upload/route.ts (Quest pattern, LabCorp
 * pattern, Junction-specific path, regex fallback). With the registry
 * driving the prompt, the model handles all formats from a single
 * configuration.
 *
 * Design contract:
 *   - One OpenAI call per upload.
 *   - The registry is the only marker definition source — IDs,
 *     synonyms, expected units, valid ranges all flow from it.
 *   - Output keys match registry IDs exactly. The save layer can spread
 *     `parseResult.markers` directly into a blood_results row.
 *   - Each extracted value is validated against the registry's
 *     `validRange`; out-of-range values are rejected (set to null,
 *     warning emitted) — this catches the LDL=14 / glucose=14000
 *     class of parsing artifacts.
 *   - Uniform-value guard: if ≥ 60 % of extracted markers share an
 *     identical value, the parser THROWS rather than persists. That
 *     was the Function Health 14-bug failure mode.
 *   - Derived markers (TC/HDL ratio, BUN/Cr, Iron Saturation, etc.)
 *     are computed from operands when not extracted; the rawExtractedText
 *     is set to `[computed from <operands>]` and was_computed=true on
 *     the confidence row so it's auditable downstream.
 */

import OpenAI from "openai"
import { BLOOD_MARKER_REGISTRY, getMarkerById } from "./markerRegistry"
import {
  sanitizeRawMarkers,
  validateAndComputeFromRaw,
  type ParseResult,
  type ParsedMarker,
  type RawParseOutput,
} from "./validate"

export type { ParseResult, ParsedMarker } from "./validate"

// ── Production parser — PDF → PNG → OpenAI vision → validate ───────────────

export async function parseBloodPDF(pdfBuffer: Buffer): Promise<ParseResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured")

  // Step 1 — render PDF pages to PNG. GPT-4o vision accepts images, not
  //          PDFs directly. unpdf renders pages at scale 2 for OCR fidelity.
  const { renderPageAsImage, getDocumentProxy } = await import("unpdf")
  const doc = await getDocumentProxy(new Uint8Array(pdfBuffer))
  const pageCount = doc.numPages
  const maxPages = Math.min(pageCount, 12)

  const imageContent: Array<{
    type: "image_url"
    image_url: { url: string; detail: "high" }
  }> = []
  for (let p = 1; p <= maxPages; p++) {
    const result = await renderPageAsImage(doc, p, { scale: 2 })
    const imageData =
      result instanceof ArrayBuffer
        ? result
        : (result as { image: ArrayBuffer }).image ?? result
    const pngBase64 = Buffer.from(imageData as ArrayBuffer).toString("base64")
    imageContent.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${pngBase64}`, detail: "high" },
    })
  }

  // Step 2 — build the marker target list for the prompt
  const markerTargets = BLOOD_MARKER_REGISTRY.map(m => ({
    id: m.id,
    displayName: m.displayName,
    expectedUnit: m.unit,
    synonyms: m.synonyms,
  }))

  const systemPrompt = `You are a lab-report extraction system for oravi, a longevity health platform. You will be given a blood lab report (rendered PDF pages) and a list of markers oravi tracks. Extract values for these specific markers — nothing else.

CRITICAL RULES:
1. Only extract markers from the target list. Ignore everything else in the PDF.
2. For each target marker, look for it by its name or any of its synonyms. Labs use varying nomenclature.
3. If a marker is not present in the PDF, return null for that marker. Do NOT guess.
4. CRITICAL: If you find yourself extracting the same numeric value for multiple markers, STOP. Identical values across different markers are almost always layout artifacts — page numbers, section counts, days-since-test annotations, summary badges — not real results. When in doubt, return null for that marker rather than guessing. It's better to extract fewer markers correctly than many markers incorrectly.
5. Return values in the unit the lab printed. Note the unit separately. Do not perform unit conversion — that happens later.
6. For each extracted value, provide a confidence score 0–1 based on how clearly the value was associated with the marker name.
7. Capture the source lab name (top of report, footer, letterhead) and the collection date in YYYY-MM-DD format.

Return JSON in EXACTLY this shape:
{
  "sourceLab": "string | null",
  "collectedAt": "YYYY-MM-DD | null",
  "overallConfidence": <number 0-1>,
  "markers": {
    "<marker_id>": { "value": <number>, "unitFound": "<string>", "confidence": <number>, "rawExtractedText": "<string>" } | null
  }
}`

  const userText = `Target markers (${markerTargets.length} total):
${JSON.stringify(markerTargets, null, 2)}

Extract these markers from the attached PDF pages.`

  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 16384,
    store: false, // ZDR
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [{ type: "text", text: userText }, ...imageContent],
      },
    ],
  })

  const rawContent = response.choices[0]?.message?.content
  if (!rawContent) throw new Error("OpenAI returned empty response")

  let raw: RawParseOutput
  try {
    raw = JSON.parse(rawContent) as RawParseOutput
  } catch {
    throw new Error(`OpenAI returned non-JSON response: ${rawContent.slice(0, 200)}`)
  }

  if (!raw.markers || typeof raw.markers !== "object") {
    throw new Error("OpenAI response missing markers object")
  }

  // Backfill defaults so the model is forgiving
  raw.sourceLab = typeof raw.sourceLab === "string" ? raw.sourceLab : null
  raw.collectedAt = typeof raw.collectedAt === "string" ? raw.collectedAt : null
  raw.overallConfidence =
    typeof raw.overallConfidence === "number" ? raw.overallConfidence : 0

  // Defensive: drop any keys the model returned that aren't in the registry.
  raw.markers = sanitizeRawMarkers(raw.markers)

  return validateAndComputeFromRaw(raw)
}

// Re-export so consumers can introspect the registry-driven contract
export { BLOOD_MARKER_REGISTRY, getMarkerById, validateAndComputeFromRaw, sanitizeRawMarkers }

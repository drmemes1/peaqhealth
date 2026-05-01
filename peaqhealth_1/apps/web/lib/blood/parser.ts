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

// ── Production parser — PDF → text via unpdf → OpenAI → validate ──────────
//
// Text extraction (not image rendering) is the primary path. unpdf's
// `extractText` works in Node without a canvas implementation; the
// `renderPageAsImage` route requires `@napi-rs/canvas` which isn't
// bundled. Most lab PDFs (LabCorp, Quest, Function Health portal exports)
// are text-based and extract cleanly. Scanned-only PDFs would benefit
// from vision OCR — that fallback is a future addition once a canvas
// dependency is wired in.

export async function parseBloodPDF(pdfBuffer: Buffer): Promise<ParseResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured")

  // Step 1 — extract text from the PDF. unpdf's extractText is pure JS,
  //          no canvas dependency.
  const { extractText, getDocumentProxy } = await import("unpdf")
  const doc = await getDocumentProxy(new Uint8Array(pdfBuffer))
  const { text } = await extractText(doc, { mergePages: true })
  if (!text || text.length < 100) {
    throw new Error(
      "Could not extract readable text from this PDF. If it's a scanned image (no embedded text layer), download a fresh PDF from your lab portal — portal exports parse most reliably.",
    )
  }

  // Step 2 — build the marker target list for the prompt
  const markerTargets = BLOOD_MARKER_REGISTRY.map(m => ({
    id: m.id,
    displayName: m.displayName,
    expectedUnit: m.unit,
    synonyms: m.synonyms,
  }))

  const systemPrompt = `You are a lab-report extraction system for oravi, a longevity health platform. You will be given the extracted text of a blood lab report and a list of markers oravi tracks. Extract values for EVERY marker in the target list that appears in the text — nothing else.

EXTRACTION DISCIPLINE:
1. Be EXHAUSTIVE. Comprehensive panels (Function Health, Quest, LabCorp, Marek, Lifeforce) routinely contain 70–100+ markers. Walk the text from top to bottom and check every numeric line against the target list. Missing a marker that IS present in the text is the most common failure mode — guard against it.
2. For each target marker, match by display name OR any synonym. The synonyms list is exhaustive — Lp(a) may appear as "Lipoprotein(a)", "Lipoprotein (a)", "Lp (a)", "LP(a)" with various spacings; Vitamin B12 may appear as "Vitamin B12", "B12", "Cobalamin"; Folate may appear as "Folic Acid"; Apo B may appear as "Apolipoprotein B" or "ApoB". Match liberally on synonyms.
3. COMMONLY-MISSED MARKERS — pay extra attention to: Lp(a) / Lipoprotein(a), Vitamin B12, Folate, Homocysteine, ApoB, hs-CRP, Vitamin D 25-OH, MMA, Omega-3 / Omega-6 series, LDL particle subclasses (LDL-P, small LDL, medium LDL, peak size), DHEA-S, Free Testosterone, SHBG, Estradiol, GGT. These often appear in less-prominent positions in reports.
4. Only extract markers from the target list. Ignore everything else in the text.
5. If a marker is genuinely not present, return null. Do NOT guess.
6. UNIFORM-VALUE GUARD: If you find yourself extracting the SAME numeric value for many different markers, STOP. Identical values across distinct markers are almost always layout artifacts — page numbers, section counts, days-since-test annotations, summary badges — not real results. Return null for those markers rather than guessing.
7. Return values in the unit the lab printed. Note the unit separately. Do not perform unit conversion — that happens later.
8. For each extracted value, provide a confidence score 0–1 based on how clearly the value was associated with the marker name.
9. Capture the source lab name (top of report, footer, letterhead) and the collection date in YYYY-MM-DD format.
10. MULTI-LINE FORMAT: Test name often appears on one line, the patient's numeric result on the very next line, and the reference range on the line after that. Treat the number on the line immediately after a test name as the patient's result. Ignore footnote markers (single digits 1, 2, 3 attached to a test name).

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

LAB REPORT TEXT:
${text}`

  const openai = new OpenAI({ apiKey })
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 16384,
    store: false, // ZDR
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
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

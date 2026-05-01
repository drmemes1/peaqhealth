/**
 * Pure validation + derived-marker computation for parsed blood markers.
 *
 * Split from `parser.ts` so unit tests can exercise the registry-driven
 * validation, computation, and uniform-value guard without dragging in
 * the OpenAI SDK at module-load time.
 *
 * `parser.ts` calls into this module after rendering the PDF and getting
 * the model's JSON response back.
 */

import { BLOOD_MARKER_REGISTRY } from "./markerRegistry"

export interface ParsedMarker {
  /** Numeric value in the unit the lab printed. No unit conversion is performed; that's a future concern. */
  value: number
  /** Whatever unit string the lab printed (may differ from registry.unit). */
  unitFound: string
  /** 0–1, model-reported per-marker confidence (or 0.95 for computed values). */
  confidence: number
  /** Raw text the model extracted around this marker — for forensic debugging. Set to `[computed from <operands>]` when wasComputed. */
  rawExtractedText: string
  /** True when the marker was computed from other markers (derived ratios) rather than extracted. */
  wasComputed: boolean
}

export interface ParseResult {
  sourceLab: string | null
  collectedAt: string | null
  parserUsed: "openai-vision-v1"
  /** Model-reported overall confidence 0–1. */
  overallConfidence: number
  /** One entry per registry id; null when not present in the PDF or rejected by validation. */
  markers: { [markerId: string]: ParsedMarker | null }
  /** Unit conversions performed, computed fallbacks, validation rejections, etc. */
  warnings: string[]
}

export interface RawExtractedMarker {
  value: number
  unitFound: string
  confidence: number
  rawExtractedText: string
}

export interface RawParseOutput {
  sourceLab: string | null
  collectedAt: string | null
  overallConfidence: number
  markers: { [markerId: string]: RawExtractedMarker | null }
}

const UNIFORM_VALUE_THRESHOLD = 0.6
const UNIFORM_VALUE_MIN_MARKERS = 5

/**
 * Validates raw model output, computes derived markers, runs the
 * uniform-value guard. Throws if the guard trips (≥ 60 % of extracted
 * markers share one value — almost always a layout-artifact extraction).
 */
export function validateAndComputeFromRaw(raw: RawParseOutput): ParseResult {
  const warnings: string[] = []
  const validatedMarkers: ParseResult["markers"] = {}

  // Initialize every registry id to null
  for (const m of BLOOD_MARKER_REGISTRY) {
    validatedMarkers[m.id] = null
  }

  // Validate each extracted marker against validRange
  for (const m of BLOOD_MARKER_REGISTRY) {
    const extracted = raw.markers[m.id]
    if (!extracted) continue

    const { min, max } = m.validRange
    if (
      typeof extracted.value !== "number" ||
      !Number.isFinite(extracted.value) ||
      extracted.value < min ||
      extracted.value > max
    ) {
      warnings.push(
        `${m.id} value ${extracted.value} outside valid range [${min}, ${max}]; rejected as likely parsing artifact`,
      )
      continue
    }

    validatedMarkers[m.id] = {
      value: extracted.value,
      unitFound: extracted.unitFound,
      confidence: typeof extracted.confidence === "number" ? extracted.confidence : 0,
      rawExtractedText: extracted.rawExtractedText ?? "",
      wasComputed: false,
    }
  }

  // Compute derived markers when their operands are present and the derived
  // value wasn't extracted directly.
  for (const m of BLOOD_MARKER_REGISTRY) {
    if (!m.derivedFrom) continue
    if (validatedMarkers[m.id]) continue

    const operandValues = m.derivedFrom.operands.map(opId =>
      validatedMarkers[opId]?.value,
    )
    if (operandValues.some(v => v == null || !Number.isFinite(v) || v === 0)) continue

    let computed: number
    switch (m.derivedFrom.formula) {
      case "divide":
        computed = (operandValues[0] as number) / (operandValues[1] as number)
        break
      case "percentage":
        computed = ((operandValues[0] as number) / (operandValues[1] as number)) * 100
        break
      case "ratio":
        computed = (operandValues[0] as number) / (operandValues[1] as number)
        break
    }

    if (computed < m.validRange.min || computed > m.validRange.max) {
      warnings.push(
        `${m.id} computed value ${computed.toFixed(3)} outside valid range [${m.validRange.min}, ${m.validRange.max}]; not stored`,
      )
      continue
    }

    validatedMarkers[m.id] = {
      value: parseFloat(computed.toFixed(4)),
      unitFound: m.unit,
      confidence: 0.95,
      rawExtractedText: `[computed from ${m.derivedFrom.operands.join(", ")}]`,
      wasComputed: true,
    }
    warnings.push(`${m.id} computed from ${m.derivedFrom.operands.join(", ")}`)
  }

  // Uniform-value guard. See docs/incidents/2026-05-01-function-health-14-bug.md.
  // Excludes computed markers — derived ratios can legitimately collide
  // (e.g. two near-equal ratios). Counts only directly-extracted values.
  const numericValues: number[] = Object.values(validatedMarkers)
    .filter((m): m is ParsedMarker => m !== null && !m.wasComputed)
    .map(m => m.value)

  if (numericValues.length >= UNIFORM_VALUE_MIN_MARKERS) {
    const counts = new Map<number, number>()
    for (const v of numericValues) counts.set(v, (counts.get(v) ?? 0) + 1)
    let topCount = 0
    let topValue = 0
    for (const [v, n] of counts) {
      if (n > topCount) { topValue = v; topCount = n }
    }
    if (topCount / numericValues.length >= UNIFORM_VALUE_THRESHOLD) {
      throw new Error(
        `Parser produced suspicious output: ${topCount} of ${numericValues.length} markers ` +
        `have identical value ${topValue}. Likely layout-artifact extraction; refusing to persist.`,
      )
    }
  }

  return {
    sourceLab: raw.sourceLab,
    collectedAt: raw.collectedAt,
    parserUsed: "openai-vision-v1",
    overallConfidence:
      typeof raw.overallConfidence === "number" ? raw.overallConfidence : 0,
    markers: validatedMarkers,
    warnings,
  }
}

/**
 * Drop any model-returned keys that aren't in the registry. Used by the
 * parser to defend against the model hallucinating extra fields.
 */
export function sanitizeRawMarkers(
  modelMarkers: { [markerId: string]: RawExtractedMarker | null },
): { [markerId: string]: RawExtractedMarker | null } {
  const sanitized: { [markerId: string]: RawExtractedMarker | null } = {}
  for (const m of BLOOD_MARKER_REGISTRY) {
    sanitized[m.id] = modelMarkers[m.id] ?? null
  }
  return sanitized
}

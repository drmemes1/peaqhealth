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
 * Per-marker unit conversion table. When the lab reports a marker in a unit
 * other than the registry's canonical unit, we convert before validation +
 * persistence. The canonical unit is what the database column represents
 * (e.g. lipoprotein_a_mgdl is stored in mg/dL).
 *
 * Function Health and several premium labs report Lp(a) in nmol/L by default
 * — that's the user-reported case this table was added for. Conversion factor
 * 1 mg/dL ≈ 2.5 nmol/L is the consensus for population studies; technically
 * varies by Lp(a) isoform but 2.5 is the accepted default.
 *
 * If a unit appears that isn't in this table, the value is accepted as-is
 * with a warning so the canonical-unit invariant can be reviewed.
 */
const UNIT_CONVERSIONS: Record<string, Record<string, (v: number) => number>> = {
  // Lp(a): nmol/L → mg/dL. Divide by 2.5.
  lipoprotein_a_mgdl: {
    "nmol/l":  v => v / 2.5,
    "nmol/L":  v => v / 2.5,
    "nmol":    v => v / 2.5,
  },
  // Vitamin D: nmol/L → ng/mL. Divide by 2.496 (≈ 2.5).
  vitamin_d_ngml: {
    "nmol/l":  v => v / 2.496,
    "nmol/L":  v => v / 2.496,
  },
  // Glucose: mmol/L → mg/dL. Multiply by 18.0182.
  glucose_mgdl: {
    "mmol/l":  v => v * 18.0182,
    "mmol/L":  v => v * 18.0182,
  },
  // Total cholesterol / LDL / HDL: mmol/L → mg/dL. Multiply by 38.67.
  ldl_mgdl: {
    "mmol/l":  v => v * 38.67,
    "mmol/L":  v => v * 38.67,
  },
  hdl_mgdl: {
    "mmol/l":  v => v * 38.67,
    "mmol/L":  v => v * 38.67,
  },
  total_cholesterol_mgdl: {
    "mmol/l":  v => v * 38.67,
    "mmol/L":  v => v * 38.67,
  },
  // Triglycerides: mmol/L → mg/dL. Multiply by 88.57.
  triglycerides_mgdl: {
    "mmol/l":  v => v * 88.57,
    "mmol/L":  v => v * 88.57,
  },
  // ApoB: g/L → mg/dL. Multiply by 100.
  apob_mgdl: {
    "g/l":     v => v * 100,
    "g/L":     v => v * 100,
  },
  // B12: pmol/L → pg/mL. Multiply by 1.355.
  vitamin_b12_pgml: {
    "pmol/l":  v => v * 1.355,
    "pmol/L":  v => v * 1.355,
  },
  // Folate: nmol/L → ng/mL. Multiply by 0.4416.
  folate_ngml: {
    "nmol/l":  v => v * 0.4416,
    "nmol/L":  v => v * 0.4416,
  },
  // Testosterone total: nmol/L → ng/dL. Multiply by 28.84.
  testosterone_total_ngdl: {
    "nmol/l":  v => v * 28.84,
    "nmol/L":  v => v * 28.84,
  },
  // Iron: µmol/L → µg/dL. Multiply by 5.587.
  iron_ugdl: {
    "umol/l":  v => v * 5.587,
    "umol/L":  v => v * 5.587,
    "µmol/l":  v => v * 5.587,
    "µmol/L":  v => v * 5.587,
  },
  // Mercury: nmol/L → µg/L. Divide by 4.99.
  mercury_ugl: {
    "nmol/l":  v => v / 4.99,
    "nmol/L":  v => v / 4.99,
  },
}

/**
 * Normalize an extracted value to the marker's canonical unit. Returns
 * { converted, didConvert, fromUnit }. If no conversion is needed (units
 * already match) didConvert is false. If the unit isn't in the table the
 * value is returned as-is with didConvert = false.
 */
export function convertToCanonicalUnit(
  markerId: string,
  value: number,
  unitFound: string | undefined,
  expectedUnit: string,
): { converted: number; didConvert: boolean; fromUnit: string | null } {
  if (!unitFound) return { converted: value, didConvert: false, fromUnit: null }
  const normFound = unitFound.trim()
  const normExpected = expectedUnit.trim()
  if (normFound === normExpected) return { converted: value, didConvert: false, fromUnit: null }
  // Tolerate case-only differences (e.g. mg/dL vs mg/dl)
  if (normFound.toLowerCase() === normExpected.toLowerCase()) {
    return { converted: value, didConvert: false, fromUnit: null }
  }
  const table = UNIT_CONVERSIONS[markerId]
  if (!table) return { converted: value, didConvert: false, fromUnit: normFound }
  const fn = table[normFound] ?? table[normFound.toLowerCase()]
  if (!fn) return { converted: value, didConvert: false, fromUnit: normFound }
  return { converted: fn(value), didConvert: true, fromUnit: normFound }
}

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

  // Validate each extracted marker against validRange. If the lab reported
  // the value in a different unit than the registry's canonical unit, convert
  // before validation (per UNIT_CONVERSIONS table above).
  for (const m of BLOOD_MARKER_REGISTRY) {
    const extracted = raw.markers[m.id]
    if (!extracted) continue

    if (typeof extracted.value !== "number" || !Number.isFinite(extracted.value)) {
      warnings.push(
        `${m.id} value ${extracted.value} is not a finite number; rejected`,
      )
      continue
    }

    const conversion = convertToCanonicalUnit(m.id, extracted.value, extracted.unitFound, m.unit)
    const finalValue = conversion.converted
    if (conversion.didConvert) {
      warnings.push(
        `${m.id} converted ${extracted.value} ${conversion.fromUnit} → ${finalValue.toFixed(2)} ${m.unit}`,
      )
    }

    const { min, max } = m.validRange
    if (finalValue < min || finalValue > max) {
      warnings.push(
        `${m.id} value ${finalValue} outside valid range [${min}, ${max}]; rejected as likely parsing artifact`,
      )
      continue
    }

    validatedMarkers[m.id] = {
      value: finalValue,
      unitFound: conversion.didConvert ? `${m.unit} (converted from ${conversion.fromUnit})` : (extracted.unitFound ?? m.unit),
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

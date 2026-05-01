/**
 * Sanity guard for parsed blood-marker payloads.
 *
 * Detects the failure mode where a PDF parser (LLM or regex fallback)
 * extracts the SAME numeric value for many distinct markers — almost
 * always a layout artifact (page count, days-since-test badge, section
 * number) that the parser mistook for the patient result. Real human
 * lab reports never have identical LDL + HDL + glucose + HbA1c.
 *
 * Threshold: when ≥ 60 % of populated numeric markers share one value
 * (and at least 5 markers are populated, to avoid spurious trips on
 * tiny payloads), we flag the payload as suspect. The save route
 * refuses to persist it.
 *
 * See docs/incidents/2026-05-01-function-health-14-bug.md for the
 * incident this guard was built to catch.
 */

const MIN_MARKERS_TO_APPLY = 5
const UNIFORM_VALUE_THRESHOLD = 0.6

export interface UniformValueArtifact {
  value: number
  count: number
  total: number
  ratio: number
}

export function detectUniformValueArtifact(
  markers: Record<string, unknown>,
): UniformValueArtifact | null {
  const numericValues: number[] = []
  for (const v of Object.values(markers)) {
    if (typeof v === "number" && Number.isFinite(v)) numericValues.push(v)
  }

  if (numericValues.length < MIN_MARKERS_TO_APPLY) return null

  const counts = new Map<number, number>()
  for (const v of numericValues) counts.set(v, (counts.get(v) ?? 0) + 1)

  let topValue = 0
  let topCount = 0
  for (const [v, n] of counts) {
    if (n > topCount) { topValue = v; topCount = n }
  }

  const ratio = topCount / numericValues.length
  if (ratio < UNIFORM_VALUE_THRESHOLD) return null

  return { value: topValue, count: topCount, total: numericValues.length, ratio }
}

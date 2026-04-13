/**
 * OMA — Oral Microbiome Assessment
 *
 * Composite percentile score combining three NHANES-anchored dimensions:
 *   protective (45%), pathogen-inverted (35%), Shannon diversity (20%)
 *
 * omaDelta maps the composite to a biological-age delta:
 *   above median → younger (negative), below median → older (positive)
 *   Capped ±8 years.
 *
 * Reference: NHANES 2009-2012 oral microbiome (n=9,660) until internal
 * cohort reaches n ≥ 200.
 */

export interface OMAInputs {
  protective_pct: number       // 0-100 percentile vs NHANES
  pathogen_inv_pct: number     // 0-100 percentile (inverted: higher = fewer pathogens)
  shannon_pct: number          // 0-100 percentile vs NHANES
  neisseria_pct: number        // raw % of Neisseria + Rothia + H.parainfluenzae combined
}

export interface OMAResult {
  omaPct: number
  omaDelta: number
}

export function calcOMA(inputs: OMAInputs): OMAResult {
  const omaPct =
    0.45 * inputs.protective_pct +
    0.35 * inputs.pathogen_inv_pct +
    0.20 * inputs.shannon_pct

  const omaDelta = Math.max(-8, Math.min(8, -(omaPct - 50) * 0.10)) || 0

  return { omaPct, omaDelta }
}

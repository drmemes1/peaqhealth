/**
 * NR v1 pipeline runner
 * =====================
 *
 * Glues a persisted oral_kit_orders row + lifestyle_records row to the pure
 * algorithm at lib/oral/nr-v1.ts. Two responsibilities:
 *
 *   1. Build NRSpeciesAbundances and NRLifestyleConfounders from raw DB rows.
 *      Field mapping is documented inline.
 *   2. Translate the NRV1Result into the column update object the route /
 *      backfill persists to oral_kit_orders.
 *
 * Soft-fail by design: if calculateNRV1 throws, runNRV1 logs and returns null
 * so the kit-processing flow can continue. NR is additive — a kit without NR
 * outputs still has caries v3 (and v2) results.
 *
 * No I/O in this module. The caller fetches rows and writes the update.
 *
 * Approximation contract — see ADR-0019 § Known gaps and ADR-0021:
 *
 *   The upload pipeline does not parse species-level Neisseria, species-level
 *   Actinomyces beyond `a_naeslundii_pct`, or H. parainfluenzae specifically.
 *   This runner therefore approximates:
 *
 *     - neisseria_mucosa  ← full neisseria_pct genus total (conservative
 *       upper-bound: treat all Neisseria as Tier 1)
 *     - neisseria_flavescens / subflava / other  ← 0
 *     - rothia_mucilaginosa ← rothia_pct (the parser stores "Rothia minus
 *       dentocariosa minus aeria" in this column post-PR-α; the residual is
 *       dominantly mucilaginosa per Zymo's typical distribution)
 *     - actinomyces_odontolyticus  ← 0 (no species column)
 *     - actinomyces_other  ← actinomyces_pct directly (parser already
 *       excludes a_naeslundii_pct from the genus column)
 *     - h_parainfluenzae  ← haemophilus_pct (genus-level proxy)
 *     - prevotella_total  ← prevotella_intermedia_pct +
 *                           prevotella_commensal_pct +
 *                           p_denticola_pct
 *     - rothia_total  ← rothia_pct + rothia_dentocariosa_pct + rothia_aeria_pct
 *
 *   Long-term fix is parser extension. Until then these approximations are
 *   the runner's contract.
 */

import {
  calculateNRV1,
  ZERO_NR_LIFESTYLE,
  ZERO_NR_SPECIES,
  type NRLifestyleConfounders,
  type NRSpeciesAbundances,
  type NRV1Result,
} from "./nr-v1"

// Coerce raw column values (numeric or null) to a usable percentage.
const num = (v: unknown): number => {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Build NRSpeciesAbundances from an oral_kit_orders row. Defaults every field
 * to 0 (via ZERO_NR_SPECIES spread) so partial rows produce well-defined NR
 * outputs. See the approximation contract in the file header.
 */
export function speciesFromKitRow(row: Record<string, unknown>): NRSpeciesAbundances {
  const rothiaPctResidual = num(row.rothia_pct) // post-PR-α: excludes dentocariosa + aeria
  const rothiaDentocariosa = num(row.rothia_dentocariosa_pct)
  const rothiaAeria = num(row.rothia_aeria_pct)
  const rothiaTotal = rothiaPctResidual + rothiaDentocariosa + rothiaAeria

  const neisseriaTotal = num(row.neisseria_pct) // no species-level Neisseria columns exist

  // prevotella_pct does not exist as a single column; the parser splits
  // Prevotella into three buckets per ADR-0015 (PR-α): intermedia, commensal,
  // and denticola.
  const prevotellaTotal =
    num(row.prevotella_intermedia_pct) +
    num(row.prevotella_commensal_pct) +
    num(row.p_denticola_pct)

  return {
    ...ZERO_NR_SPECIES,
    // ── Tier 1 — primary nitrite producers ────────────────────────────────
    // Conservative upper-bound: allocate the full Neisseria genus to mucosa
    // since species-level columns aren't parsed. Documented in ADR-0019.
    neisseria_mucosa: neisseriaTotal,
    // flavescens / subflava stay at 0 (covered by mucosa allocation).
    rothia_mucilaginosa: rothiaPctResidual,
    rothia_dentocariosa: rothiaDentocariosa,
    rothia_aeria: rothiaAeria,
    // actinomyces_odontolyticus stays at 0 (no species column; not parsed).

    // ── Tier 2 — secondary NR ─────────────────────────────────────────────
    h_parainfluenzae: num(row.haemophilus_pct), // genus-proxy
    // neisseria_other stays at 0 — covered by mucosa allocation above.
    a_naeslundii: num(row.a_naeslundii_pct),

    // ── Tier 3 — NR-capable, lower per-cell efficiency ────────────────────
    veillonella_total: num(row.veillonella_pct),
    // The parser already excludes a_naeslundii from actinomyces_pct, so this
    // column IS the "other Actinomyces" bucket.
    actinomyces_other: num(row.actinomyces_pct),

    // ── Vanhatalo signature (genus totals) ────────────────────────────────
    rothia_total: rothiaTotal,
    neisseria_total: neisseriaTotal,
    prevotella_total: prevotellaTotal,
  }
}

/**
 * Build NRLifestyleConfounders from a lifestyle_records row.
 *
 * Per ADR-0019 (post-consolidation), NR-α reads the existing v2 questionnaire
 * columns directly: `dietary_nitrate_frequency` and `tongue_scraping_freq`.
 * No new lifestyle columns ship from the NR-α slice; the binning to confounder
 * triggers happens via `isLowDietaryNitrate` / `isFrequentTongueScraping`
 * helpers inside the algorithm.
 */
export function lifestyleFromRow(row: Record<string, unknown> | null): NRLifestyleConfounders | null {
  if (!row) return null

  const mouthwash = row.mouthwash_type
  const chx = row.chlorhexidine_use
  const smoking = row.smoking_status
  const ppi = row.medication_ppi
  const dietary = row.dietary_nitrate_frequency
  const tongue = row.tongue_scraping_freq
  const ageRange = row.age_range

  const mouthwashValid: NRLifestyleConfounders["mouthwash_type"] =
    mouthwash === "none" || mouthwash === "fluoride" ||
    mouthwash === "antiseptic" || mouthwash === "unknown"
      ? mouthwash : null

  const chxValid: NRLifestyleConfounders["chlorhexidine_use"] =
    chx === "never" || chx === "past_8wks" || chx === "currently_using"
      ? chx : null

  const smokingValid: NRLifestyleConfounders["smoking_status"] =
    smoking === "never" || smoking === "former" || smoking === "current"
      ? smoking : null

  const dietaryValid: NRLifestyleConfounders["dietary_nitrate_frequency"] =
    dietary === "rarely" || dietary === "few_times_month" ||
    dietary === "several_weekly" || dietary === "daily" ||
    dietary === "multiple_daily"
      ? dietary : null

  const tongueValid: NRLifestyleConfounders["tongue_scraping_freq"] =
    tongue === "never" || tongue === "occasionally" ||
    tongue === "most_days" || tongue === "every_morning"
      ? tongue : null

  return {
    ...ZERO_NR_LIFESTYLE,
    mouthwash_type: mouthwashValid,
    chlorhexidine_use: chxValid,
    smoking_status: smokingValid,
    medication_ppi: typeof ppi === "boolean" ? ppi : false,
    dietary_nitrate_frequency: dietaryValid,
    tongue_scraping_freq: tongueValid,
    age_range: typeof ageRange === "string" ? ageRange : null,
  }
}

/**
 * The DB update payload mapping NRV1Result → oral_kit_orders columns.
 * Caller spreads this into a single .update() call.
 */
export interface NRV1Update {
  nr_capacity_index: number
  nr_capacity_category: string
  no_signature: number
  no_signature_category: string
  nr_risk_category: string
  nr_paradox_flag: boolean
  nr_v1_confidence: string
  nr_v1_reliability_flags: string[] | null
  nr_v1_confounder_adjustments: Record<string, string>
  nr_v1_breakdown: NRV1Result["breakdown"]
  nr_v1_computed_at: string
}

export function v1UpdateFromResult(result: NRV1Result): NRV1Update {
  return {
    nr_capacity_index: parseFloat(result.nrCapacityIndex.toFixed(4)),
    nr_capacity_category: result.nrCapacityCategory,
    no_signature: parseFloat(result.noSignature.toFixed(4)),
    no_signature_category: result.noSignatureCategory,
    nr_risk_category: result.nrRiskCategory,
    nr_paradox_flag: result.nrParadoxFlag,
    nr_v1_confidence: result.confidence,
    nr_v1_reliability_flags: result.reliabilityFlags.length > 0 ? result.reliabilityFlags : null,
    nr_v1_confounder_adjustments: result.confounderAdjustments,
    nr_v1_breakdown: result.breakdown,
    nr_v1_computed_at: new Date().toISOString(),
  }
}

/**
 * Run the full NR-α pipeline against a persisted kit row + optional lifestyle
 * row. Returns the column update payload, or null on failure (logged).
 *
 * Caller is responsible for the actual DB write.
 */
export function runNRV1(
  kitRow: Record<string, unknown>,
  lifestyleRow: Record<string, unknown> | null,
): { update: NRV1Update; result: NRV1Result } | null {
  try {
    const species = speciesFromKitRow(kitRow)
    const lifestyle = lifestyleFromRow(lifestyleRow)
    const result = calculateNRV1(species, lifestyle)
    return { update: v1UpdateFromResult(result), result }
  } catch (err) {
    console.error("[nr-v1] runner failed:", err)
    return null
  }
}

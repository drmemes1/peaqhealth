/**
 * Periodontal Burden v1 pipeline runner
 * =====================================
 *
 * Glues a persisted oral_kit_orders row + lifestyle_records row to the pure
 * algorithm at lib/oral/perio-burden-v1.ts. Three responsibilities:
 *
 *   1. Build PerioBurdenSpeciesAbundances from raw_otu_table.__meta.entries
 *      (authoritative source). Falls back to direct kit columns where
 *      species-level columns aren't populated yet (kits parsed before
 *      PR-Δ-α-parser).
 *   2. Build PerioBurdenLifestyleConfounders from a lifestyle_records row.
 *   3. Translate the PerioBurdenV1Result into the column update object the
 *      route / backfill persists to oral_kit_orders.
 *
 * Soft-fail by design: if calculatePerioBurdenV1 throws, runPerioBurdenV1
 * logs and returns null so the kit-processing flow continues. Perio is
 * additive — a kit without perio outputs still has caries v3 + NR-α.
 *
 * No I/O in this module. The caller fetches rows and writes the update.
 */

import {
  calculatePerioBurdenV1,
  EMPTY_PERIO_SPECIES,
  type PerioBurdenLifestyleConfounders,
  type PerioBurdenSpeciesAbundances,
  type PerioBurdenV1Result,
} from "./perio-burden-v1"
import { parseSpeciesFromKitRow } from "./species-parser"

/** Coerce raw column values to a usable percentage. */
const num = (v: unknown): number => {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** A single parsed entry from raw_otu_table.__meta.entries. */
interface ParsedEntry {
  genus?: string
  species?: string | null
  pct?: number
}

/**
 * Sum entries where (genus, species) match the predicate. Returns 0 if
 * no entries match.
 */
function sumEntries(
  entries: ParsedEntry[],
  predicate: (genusLower: string, speciesLower: string) => boolean,
): number {
  let total = 0
  for (const e of entries) {
    const genus = (e.genus ?? "").toLowerCase()
    const species = (e.species ?? "").toLowerCase()
    if (!genus) continue
    if (predicate(genus, species)) total += num(e.pct)
  }
  return total
}

/** Returns true when species (clean OR hyphenated) contains `target`. */
function speciesMatches(species: string, target: string): boolean {
  return species.split("-").some(p => p === target) || species === target
}

/**
 * Build PerioBurdenSpeciesAbundances from a kit row. Reads
 * raw_otu_table.__meta.entries via the shared species-parser. No more
 * hybrid column-fallback dance — entries are the single source of truth.
 *
 * Defaults every field to 0 (via EMPTY_PERIO_SPECIES spread) so partial
 * rows produce well-defined outputs.
 */
export function speciesFromKitRow(row: Record<string, unknown>): PerioBurdenSpeciesAbundances {
  const sp = parseSpeciesFromKitRow(row)

  return {
    ...EMPTY_PERIO_SPECIES,
    p_gingivalis: sp.p_gingivalis_pct,
    t_forsythia: sp.t_forsythia_pct,
    treponema_total: sp.treponema_total_pct,
    f_alocis: sp.f_alocis_pct,
    f_nucleatum: sp.f_nucleatum_pct,
    p_intermedia: sp.prevotella_intermedia_pct,
    s_constellatus: sp.s_constellatus_pct,
    p_micra: sp.parvimonas_micra_pct,
    m_faucium: sp.m_faucium_pct,
    fretibacterium: sp.fretibacterium_total_pct,
    treponema_hmt_237: sp.treponema_hmt_237_pct,
    c_matruchotii: sp.c_matruchotii_pct,
    s_mitis_group: sp.s_mitis_group_pct,
    s_sanguinis: sp.s_sanguinis_pct,
    s_gordonii: sp.s_gordonii_pct,
    rothia_total: sp.rothia_total_pct,
    neisseria_total: sp.neisseria_pct,
    // Genus-proxy when species-level absent — same fallback as NR runner.
    h_parainfluenzae:
      sp.h_parainfluenzae_pct > 0 ? sp.h_parainfluenzae_pct : sp.haemophilus_total_pct,
    a_naeslundii: sp.a_naeslundii_pct,
    lautropia: sp.lautropia_total_pct,
  }
}

/**
 * Build PerioBurdenLifestyleConfounders from a lifestyle_records row.
 * Mirrors the validation pattern in nr-v1-runner / caries-v3-runner.
 */
export function lifestyleFromRow(
  row: Record<string, unknown> | null,
): PerioBurdenLifestyleConfounders | null {
  if (!row) return null

  const smoking = row.smoking_status
  const mouthwash = row.mouthwash_type
  const chx = row.chlorhexidine_use
  const ageRange = row.age_range

  const smokingValid: PerioBurdenLifestyleConfounders["smoking_status"] =
    smoking === "never" || smoking === "former" || smoking === "current" ? smoking : null

  const mouthwashValid: PerioBurdenLifestyleConfounders["mouthwash_type"] =
    mouthwash === "none" || mouthwash === "fluoride" ||
    mouthwash === "antiseptic" || mouthwash === "unknown"
      ? mouthwash : null

  const chxValid: PerioBurdenLifestyleConfounders["chlorhexidine_use"] =
    chx === "never" || chx === "past_8wks" || chx === "currently_using" ? chx : null

  return {
    smoking_status: smokingValid,
    mouthwash_type: mouthwashValid,
    chlorhexidine_use: chxValid,
    age_range: typeof ageRange === "string" ? ageRange : null,
  }
}

/** DB update payload mapping PerioBurdenV1Result → oral_kit_orders columns. */
export interface PerioBurdenV1Update {
  perio_burden_index: number
  perio_burden_index_adjusted: number
  perio_burden_category: string
  perio_defense_index: number
  perio_defense_category: string
  total_subp_pct: number
  commensal_depletion_factor: number
  cdm_amplification_pct: number
  perio_risk_category: string
  diagnostic_uncertainty_zone: boolean
  red_complex_status: PerioBurdenV1Result["red_complex_status"]
  cross_panel_hooks: PerioBurdenV1Result["cross_panel_hooks"]
  perio_v1_confidence: string
  perio_v1_reliability_flags: string[] | null
  perio_v1_confounder_adjustments: Record<string, string>
  perio_v1_narrative_augmentations: string[] | null
  perio_v1_breakdown: PerioBurdenV1Result["breakdown"]
  perio_v1_computed_at: string
}

export function v1UpdateFromResult(result: PerioBurdenV1Result): PerioBurdenV1Update {
  return {
    perio_burden_index: parseFloat(result.perio_burden_index.toFixed(4)),
    perio_burden_index_adjusted: parseFloat(result.perio_burden_index_adjusted.toFixed(4)),
    perio_burden_category: result.perio_burden_category,
    perio_defense_index: parseFloat(result.perio_defense_index.toFixed(4)),
    perio_defense_category: result.perio_defense_category,
    total_subp_pct: parseFloat(result.total_subp_pct.toFixed(4)),
    commensal_depletion_factor: parseFloat(result.commensal_depletion_factor.toFixed(4)),
    cdm_amplification_pct: parseFloat(result.cdm_amplification_pct.toFixed(4)),
    perio_risk_category: result.perio_risk_category,
    diagnostic_uncertainty_zone: result.diagnostic_uncertainty_zone,
    red_complex_status: result.red_complex_status,
    cross_panel_hooks: result.cross_panel_hooks,
    perio_v1_confidence: result.confidence,
    perio_v1_reliability_flags: result.reliability_flags.length > 0 ? result.reliability_flags : null,
    perio_v1_confounder_adjustments: result.confounder_adjustments,
    perio_v1_narrative_augmentations: result.narrative_augmentations.length > 0 ? result.narrative_augmentations : null,
    perio_v1_breakdown: result.breakdown,
    perio_v1_computed_at: new Date().toISOString(),
  }
}

/**
 * Run the full perio-burden-v1 pipeline against a persisted kit row + optional
 * lifestyle row. Returns the column update payload, or null on failure (logged).
 *
 * Caller is responsible for the actual DB write.
 */
export function runPerioBurdenV1(
  kitRow: Record<string, unknown>,
  lifestyleRow: Record<string, unknown> | null,
): { update: PerioBurdenV1Update; result: PerioBurdenV1Result } | null {
  try {
    const species = speciesFromKitRow(kitRow)
    const lifestyle = lifestyleFromRow(lifestyleRow)
    const result = calculatePerioBurdenV1(species, lifestyle)
    return { update: v1UpdateFromResult(result), result }
  } catch (err) {
    console.error("[perio-burden-v1] runner failed:", err)
    return null
  }
}

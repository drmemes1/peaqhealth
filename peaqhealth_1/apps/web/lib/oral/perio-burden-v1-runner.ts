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

/**
 * S. mitis group identifiers (per ADR-0023). V3-V4 cannot reliably
 * distinguish S. mitis / S. oralis / S. pneumoniae; all three function
 * as protective oral commensals (Mark Welch 2016 PNAS).
 *
 * Mirrors the rule the parser will eventually export from PR-Δ-α-parser
 * (#256). Defined inline here so this PR can land independently — when
 * the parser PR merges, this constant becomes a re-export.
 */
const S_MITIS_GROUP_IDENTIFIERS = ["mitis", "oralis", "pneumoniae"] as const

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
 * raw_otu_table.__meta.entries as the authoritative source and falls
 * back to direct columns (post-PR-Δ-α-parser) when entries are absent.
 *
 * Defaults every field to 0 (via EMPTY_PERIO_SPECIES spread) so partial
 * rows produce well-defined outputs.
 */
export function speciesFromKitRow(row: Record<string, unknown>): PerioBurdenSpeciesAbundances {
  const otu = (row.raw_otu_table ?? {}) as Record<string, unknown>
  const meta = (otu.__meta ?? {}) as Record<string, unknown>
  const entries = (meta.entries ?? []) as ParsedEntry[]

  // ── If post-PR-Δ-α-parser columns are populated, prefer them directly ──
  // Otherwise compute from entries. This makes the runner correct on both
  // legacy kits and newly-parsed ones.
  const fromCol = (col: string, fallback: number): number => {
    const v = num(row[col])
    return v > 0 ? v : fallback
  }

  // Tier 1 pathogens
  const pGingivalis = fromCol(
    "p_gingivalis_pct",
    sumEntries(entries, (g, s) => g === "porphyromonas" && speciesMatches(s, "gingivalis")),
  )
  const tForsythia = fromCol(
    "t_forsythia_pct",
    sumEntries(entries, (g, s) => g === "tannerella" && speciesMatches(s, "forsythia")),
  )
  const treponemaTotal = num(row.treponema_pct) // genus-level by design (V3-V4 limit)
  const fAlocis = fromCol(
    "f_alocis_pct",
    sumEntries(entries, (g, s) => g === "filifactor" && speciesMatches(s, "alocis")),
  )

  // Tier 2 pathogens — F. nucleatum at species level (genus column covers
  // related species like periodonticum which we don't want in perio burden).
  const fNucleatum = fromCol(
    "f_nucleatum_pct",
    sumEntries(entries, (g, s) => g === "fusobacterium" && speciesMatches(s, "nucleatum")),
  )
  const pIntermedia = fromCol(
    "p_intermedia_pct",
    num(row.prevotella_intermedia_pct),
  )
  const sConstellatus = fromCol(
    "s_constellatus_pct",
    sumEntries(entries, (g, s) => g === "streptococcus" && speciesMatches(s, "constellatus")),
  )
  const pMicra = fromCol(
    "p_micra_pct",
    // Genus-level fallback: parvimonas_pct is dominantly micra anyway.
    num(row.parvimonas_pct),
  )

  // Tier 3 emerging — typically 0 with V3-V4. Sum from entries when
  // present; no dedicated columns yet.
  const mFaucium = sumEntries(entries, (g, s) => g === "mycoplasma" && speciesMatches(s, "faucium"))
  const fretibacterium = sumEntries(entries, g => g === "fretibacterium")
  const treponemaHmt237 = sumEntries(entries, (g, s) => g === "treponema" && speciesMatches(s, "hmt-237"))

  // Defense Tier 1
  const cMatruchotii = fromCol(
    "c_matruchotii_pct",
    sumEntries(entries, (g, s) => g === "corynebacterium" && speciesMatches(s, "matruchotii")),
  )
  const sMitisGroup = fromCol(
    "s_mitis_group_pct",
    // Replicate the parser's accumulator rule for legacy kits.
    sumEntries(entries, (g, s) =>
      g === "streptococcus" && S_MITIS_GROUP_IDENTIFIERS.some(id => s.includes(id)),
    ),
  )
  const sSanguinis = num(row.s_sanguinis_pct)
  const sGordonii = num(row.s_gordonii_pct)

  // Defense Tier 2
  const rothiaTotal =
    num(row.rothia_pct) + num(row.rothia_dentocariosa_pct) + num(row.rothia_aeria_pct)
  const neisseriaTotal = num(row.neisseria_pct)
  const hParainfluenzae = num(row.haemophilus_pct) // genus-proxy (matches NR runner)
  const aNaeslundii = num(row.a_naeslundii_pct)
  const lautropia = sumEntries(entries, g => g === "lautropia")

  return {
    ...EMPTY_PERIO_SPECIES,
    p_gingivalis: pGingivalis,
    t_forsythia: tForsythia,
    treponema_total: treponemaTotal,
    f_alocis: fAlocis,
    f_nucleatum: fNucleatum,
    p_intermedia: pIntermedia,
    s_constellatus: sConstellatus,
    p_micra: pMicra,
    m_faucium: mFaucium,
    fretibacterium: fretibacterium,
    treponema_hmt_237: treponemaHmt237,
    c_matruchotii: cMatruchotii,
    s_mitis_group: sMitisGroup,
    s_sanguinis: sSanguinis,
    s_gordonii: sGordonii,
    rothia_total: rothiaTotal,
    neisseria_total: neisseriaTotal,
    h_parainfluenzae: hParainfluenzae,
    a_naeslundii: aNaeslundii,
    lautropia: lautropia,
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

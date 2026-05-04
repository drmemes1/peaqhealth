/**
 * Authoritative species reader.
 *
 * Reads abundance data from `raw_otu_table.__meta.entries` (the
 * upload-parser's structured output) rather than the denormalized
 * per-species columns on `oral_kit_orders`. Use this for any algorithm
 * runner that consumes species data.
 *
 * Why entries-first:
 *   - Per-species columns lag the parser. Kits processed before a
 *     parser update (e.g. PR-Δ-α-parser added 6 species columns) have
 *     null values that misrepresent the actual sample. Entries are
 *     populated for every kit ever parsed.
 *   - The parser already does hyphenation handling (mitis/oralis/
 *     pneumoniae aggregation, etc.) and column writes — entries
 *     capture that resolved data without the column-write side effect.
 *   - Adding a new species to an algorithm becomes a single change in
 *     this module rather than a cascade of column adds + parser
 *     updates + back-population scripts.
 *
 * Algorithm runners must NOT read species data directly from kit row
 * columns. Enforced via ESLint `no-restricted-syntax` rule scoped to
 * halitosis-v2-runner.ts and upper-airway-v1-runner.ts.
 */

export interface ParsedEntryShape {
  genus?: string
  species?: string | null
  pct?: number
}

/**
 * Comprehensive species profile consumed by halitosis-v2 + upper-
 * airway-v1 + (eventually) other runners. Every field is a non-null
 * number (defaults to 0 if not detected). Hyphenation handling is
 * baked in for known multi-species ambiguities.
 *
 * Shape choice: a flat profile rather than nested per-pathway makes
 * tests + runner code cleaner. The trade-off is a wider interface;
 * worth it because the alternative (nested) would still have to be
 * flattened at every callsite.
 */
export interface SpeciesProfile {
  // ── Halitosis H2S drivers ───────────────────────────────────────
  f_nucleatum_pct: number
  s_moorei_pct: number
  veillonella_total_pct: number
  leptotrichia_wadei_pct: number
  atopobium_parvulum_pct: number
  selenomonas_total_pct: number
  eubacterium_sulci_pct: number
  dialister_invisus_pct: number

  // ── Halitosis CH3SH drivers ─────────────────────────────────────
  p_gingivalis_pct: number
  prevotella_intermedia_pct: number
  prevotella_nigrescens_pct: number
  prevotella_denticola_pct: number
  prevotella_melaninogenica_pct: number
  treponema_total_pct: number   // genus-level (V3-V4 limit on T. denticola)
  t_forsythia_pct: number
  eikenella_corrodens_pct: number

  // ── Halitosis protective community ──────────────────────────────
  s_salivarius_pct: number
  rothia_total_pct: number
  haemophilus_total_pct: number

  // ── Cross-module signal (caries v3 lactate substrate) ───────────
  s_mutans_pct: number
  caries_compensated_dysbiosis: boolean

  // ── Upper airway features ───────────────────────────────────────
  actinomyces_total_pct: number
  neisseria_pct: number
  prevotella_alloprevotella_combined_pct: number
  shannon_diversity: number | null

  // ── Lifestyle peroxide flags read straight off the kit row, since
  //    they aren't species data and don't violate the species-parser
  //    contract. Surfaced here for callsite convenience.
  env_peroxide_flag: boolean
  whitening_tray_last_48h: boolean
  whitening_strips_last_48h: boolean
  professional_whitening_last_7d: boolean
  whitening_toothpaste_daily: boolean
  peroxide_mouthwash_daily: boolean

  // ── Raw entries for any unforeseen lookups by future runners ────
  entries: ParsedEntryShape[]
}

// ── Helpers ──────────────────────────────────────────────────────

const num = (v: unknown): number => {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const numOrNull = (v: unknown): number | null => {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const bool = (v: unknown): boolean => v === true

function entriesFromKitRow(kitRow: Record<string, unknown>): ParsedEntryShape[] {
  const otu = (kitRow.raw_otu_table ?? {}) as Record<string, unknown>
  const meta = (otu.__meta ?? {}) as Record<string, unknown>
  const entries = meta.entries
  return Array.isArray(entries) ? (entries as ParsedEntryShape[]) : []
}

/** Sum entries where the predicate matches. Genus comparison is case-insensitive. */
function sumEntries(
  entries: ParsedEntryShape[],
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

/** Match clean species OR hyphenated calls containing the target. */
function speciesMatches(species: string, target: string): boolean {
  if (species === target) return true
  return species.split("-").some(p => p === target)
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Build a SpeciesProfile from a kit row. The single read of the kit
 * row happens here; algorithm runners consume the returned profile.
 *
 * Reads ONLY: `raw_otu_table.__meta.entries` for species data; +
 * peroxide booleans + caries cross-module flag. Never reads
 * `*_pct` columns directly.
 */
export function parseSpeciesFromKitRow(kitRow: Record<string, unknown>): SpeciesProfile {
  const entries = entriesFromKitRow(kitRow)

  // ── Convenience matchers ──
  const speciesExact = (genus: string, target: string) =>
    sumEntries(entries, (g, s) => g === genus && speciesMatches(s, target))

  const genusTotal = (genus: string) =>
    sumEntries(entries, g => g === genus)

  const streptococcusContaining = (...identifiers: string[]) =>
    sumEntries(entries, (g, s) =>
      g === "streptococcus" && s.length > 0 && identifiers.some(id => s.includes(id)),
    )

  // ── Halitosis H2S drivers ──
  const f_nucleatum_pct = speciesExact("fusobacterium", "nucleatum")
  const s_moorei_pct = speciesExact("solobacterium", "moorei")
  const veillonella_total_pct = genusTotal("veillonella")
  const leptotrichia_wadei_pct = speciesExact("leptotrichia", "wadei")
  const atopobium_parvulum_pct = speciesExact("atopobium", "parvulum")
  const selenomonas_total_pct = genusTotal("selenomonas")
  const eubacterium_sulci_pct = speciesExact("eubacterium", "sulci")
  const dialister_invisus_pct = speciesExact("dialister", "invisus")

  // ── Halitosis CH3SH drivers ──
  const p_gingivalis_pct = speciesExact("porphyromonas", "gingivalis")
  const prevotella_intermedia_pct = speciesExact("prevotella", "intermedia")
  const prevotella_nigrescens_pct = speciesExact("prevotella", "nigrescens")
  const prevotella_denticola_pct = speciesExact("prevotella", "denticola")
  const prevotella_melaninogenica_pct = speciesExact("prevotella", "melaninogenica")
  const treponema_total_pct = genusTotal("treponema")
  const t_forsythia_pct = speciesExact("tannerella", "forsythia")
  const eikenella_corrodens_pct = speciesExact("eikenella", "corrodens")

  // ── Halitosis protective ──
  // S. salivarius group: includes salivarius + vestibularis (clean +
  // hyphenated). Mirrors the parser's special accumulator.
  const s_salivarius_pct = streptococcusContaining("salivarius", "vestibularis")
  const rothia_total_pct = genusTotal("rothia")
  const haemophilus_total_pct = genusTotal("haemophilus")

  // ── Cross-module ──
  const s_mutans_pct = speciesExact("streptococcus", "mutans")
  // compensated_dysbiosis is a derived caries v3 output, not species data —
  // read from the kit row column. Single computed boolean, not a per-species
  // lookup, so this stays as a column read.
  const caries_compensated_dysbiosis = bool(kitRow.compensated_dysbiosis_flag)

  // ── Upper airway features ──
  const actinomyces_total_pct = genusTotal("actinomyces")
  const neisseria_pct = genusTotal("neisseria")
  const prevotella_alloprevotella_combined_pct =
    genusTotal("prevotella") + genusTotal("alloprevotella")
  const shannon_diversity = numOrNull(kitRow.shannon_diversity)

  return {
    f_nucleatum_pct,
    s_moorei_pct,
    veillonella_total_pct,
    leptotrichia_wadei_pct,
    atopobium_parvulum_pct,
    selenomonas_total_pct,
    eubacterium_sulci_pct,
    dialister_invisus_pct,
    p_gingivalis_pct,
    prevotella_intermedia_pct,
    prevotella_nigrescens_pct,
    prevotella_denticola_pct,
    prevotella_melaninogenica_pct,
    treponema_total_pct,
    t_forsythia_pct,
    eikenella_corrodens_pct,
    s_salivarius_pct,
    rothia_total_pct,
    haemophilus_total_pct,
    s_mutans_pct,
    caries_compensated_dysbiosis,
    actinomyces_total_pct,
    neisseria_pct,
    prevotella_alloprevotella_combined_pct,
    shannon_diversity,
    env_peroxide_flag: bool(kitRow.env_peroxide_flag),
    whitening_tray_last_48h: bool(kitRow.whitening_tray_last_48h),
    whitening_strips_last_48h: bool(kitRow.whitening_strips_last_48h),
    professional_whitening_last_7d: bool(kitRow.professional_whitening_last_7d),
    whitening_toothpaste_daily: bool(kitRow.whitening_toothpaste_daily),
    peroxide_mouthwash_daily: bool(kitRow.peroxide_mouthwash_daily),
    entries,
  }
}

/** Empty profile for tests + edge-case fallbacks. */
export const EMPTY_SPECIES_PROFILE: SpeciesProfile = {
  f_nucleatum_pct: 0,
  s_moorei_pct: 0,
  veillonella_total_pct: 0,
  leptotrichia_wadei_pct: 0,
  atopobium_parvulum_pct: 0,
  selenomonas_total_pct: 0,
  eubacterium_sulci_pct: 0,
  dialister_invisus_pct: 0,
  p_gingivalis_pct: 0,
  prevotella_intermedia_pct: 0,
  prevotella_nigrescens_pct: 0,
  prevotella_denticola_pct: 0,
  prevotella_melaninogenica_pct: 0,
  treponema_total_pct: 0,
  t_forsythia_pct: 0,
  eikenella_corrodens_pct: 0,
  s_salivarius_pct: 0,
  rothia_total_pct: 0,
  haemophilus_total_pct: 0,
  s_mutans_pct: 0,
  caries_compensated_dysbiosis: false,
  actinomyces_total_pct: 0,
  neisseria_pct: 0,
  prevotella_alloprevotella_combined_pct: 0,
  shannon_diversity: null,
  env_peroxide_flag: false,
  whitening_tray_last_48h: false,
  whitening_strips_last_48h: false,
  professional_whitening_last_7d: false,
  whitening_toothpaste_daily: false,
  peroxide_mouthwash_daily: false,
  entries: [],
}

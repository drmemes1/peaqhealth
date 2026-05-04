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

  // ── Caries v3 cariogenic species ────────────────────────────────
  s_sobrinus_pct: number
  scardovia_wiggsiae_pct: number
  lactobacillus_total_pct: number
  b_dentium_pct: number
  s_sputigena_pct: number
  p_acidifaciens_pct: number
  leptotrichia_shahii_pct: number

  // ── Caries v3 / perio defense — Streptococcus protective scaffold ──
  s_sanguinis_pct: number
  s_gordonii_pct: number
  s_cristatus_pct: number
  s_parasanguinis_pct: number
  s_australis_pct: number
  s_mitis_group_pct: number
  c_matruchotii_pct: number

  // ── Actinomyces species (caries + NR + perio) ───────────────────
  a_naeslundii_pct: number
  a_odontolyticus_pct: number
  actinomyces_other_pct: number   // genus minus naeslundii minus odontolyticus

  // ── NR-α species-level lookups ──────────────────────────────────
  neisseria_mucosa_pct: number
  neisseria_flavescens_pct: number
  neisseria_subflava_pct: number
  rothia_mucilaginosa_pct: number
  rothia_dentocariosa_pct: number
  rothia_aeria_pct: number
  h_parainfluenzae_pct: number    // species-level when available; falls back to genus
  prevotella_total_pct: number    // includes intermedia + commensal + denticola + nigrescens + melaninogenica

  // ── Perio v1 species ────────────────────────────────────────────
  f_alocis_pct: number
  s_constellatus_pct: number
  parvimonas_micra_pct: number
  m_faucium_pct: number
  fretibacterium_total_pct: number
  treponema_hmt_237_pct: number
  lautropia_total_pct: number

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
  const prevotella_total_pct = genusTotal("prevotella")
  const prevotella_alloprevotella_combined_pct =
    prevotella_total_pct + genusTotal("alloprevotella")
  const shannon_diversity = numOrNull(kitRow.shannon_diversity)

  // ── Caries v3 cariogenic species ──
  const s_sobrinus_pct = speciesExact("streptococcus", "sobrinus")
  const scardovia_wiggsiae_pct = speciesExact("scardovia", "wiggsiae")
  const lactobacillus_total_pct = genusTotal("lactobacillus")
  const b_dentium_pct = speciesExact("bifidobacterium", "dentium")
  const s_sputigena_pct = speciesExact("selenomonas", "sputigena")
  const p_acidifaciens_pct = speciesExact("propionibacterium", "acidifaciens")
  const leptotrichia_shahii_pct = speciesExact("leptotrichia", "shahii")

  // ── Streptococcus protective scaffold ──
  const s_sanguinis_pct = speciesExact("streptococcus", "sanguinis")
  const s_gordonii_pct = speciesExact("streptococcus", "gordonii")
  const s_cristatus_pct = speciesExact("streptococcus", "cristatus")
  const s_parasanguinis_pct = speciesExact("streptococcus", "parasanguinis")
  const s_australis_pct = speciesExact("streptococcus", "australis")
  // S. mitis group: clean s_mitis + clean s_oralis + any hyphenated call
  // containing mitis/oralis/pneumoniae identifiers (Mark Welch 2016).
  const s_mitis_group_pct = streptococcusContaining("mitis", "oralis", "pneumoniae")
  const c_matruchotii_pct = speciesExact("corynebacterium", "matruchotii")

  // ── Actinomyces species + residual genus ──
  const a_naeslundii_pct = speciesExact("actinomyces", "naeslundii")
  const a_odontolyticus_pct = speciesExact("actinomyces", "odontolyticus")
  const actinomyces_other_pct = Math.max(
    0,
    actinomyces_total_pct - a_naeslundii_pct - a_odontolyticus_pct,
  )

  // ── NR-α species-level lookups ──
  const neisseria_mucosa_pct = speciesExact("neisseria", "mucosa")
  const neisseria_flavescens_pct = speciesExact("neisseria", "flavescens")
  const neisseria_subflava_pct = speciesExact("neisseria", "subflava")
  const rothia_mucilaginosa_pct = speciesExact("rothia", "mucilaginosa")
  const rothia_dentocariosa_pct = speciesExact("rothia", "dentocariosa")
  const rothia_aeria_pct = speciesExact("rothia", "aeria")
  const h_parainfluenzae_pct = speciesExact("haemophilus", "parainfluenzae")

  // ── Perio v1 species ──
  const f_alocis_pct = speciesExact("filifactor", "alocis")
  const s_constellatus_pct = speciesExact("streptococcus", "constellatus")
  const parvimonas_micra_pct = speciesExact("parvimonas", "micra")
  const m_faucium_pct = speciesExact("mycoplasma", "faucium")
  const fretibacterium_total_pct = genusTotal("fretibacterium")
  const treponema_hmt_237_pct = speciesExact("treponema", "hmt-237")
  const lautropia_total_pct = genusTotal("lautropia")

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
    s_sobrinus_pct,
    scardovia_wiggsiae_pct,
    lactobacillus_total_pct,
    b_dentium_pct,
    s_sputigena_pct,
    p_acidifaciens_pct,
    leptotrichia_shahii_pct,
    s_sanguinis_pct,
    s_gordonii_pct,
    s_cristatus_pct,
    s_parasanguinis_pct,
    s_australis_pct,
    s_mitis_group_pct,
    c_matruchotii_pct,
    a_naeslundii_pct,
    a_odontolyticus_pct,
    actinomyces_other_pct,
    neisseria_mucosa_pct,
    neisseria_flavescens_pct,
    neisseria_subflava_pct,
    rothia_mucilaginosa_pct,
    rothia_dentocariosa_pct,
    rothia_aeria_pct,
    h_parainfluenzae_pct,
    prevotella_total_pct,
    f_alocis_pct,
    s_constellatus_pct,
    parvimonas_micra_pct,
    m_faucium_pct,
    fretibacterium_total_pct,
    treponema_hmt_237_pct,
    lautropia_total_pct,
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
  s_sobrinus_pct: 0,
  scardovia_wiggsiae_pct: 0,
  lactobacillus_total_pct: 0,
  b_dentium_pct: 0,
  s_sputigena_pct: 0,
  p_acidifaciens_pct: 0,
  leptotrichia_shahii_pct: 0,
  s_sanguinis_pct: 0,
  s_gordonii_pct: 0,
  s_cristatus_pct: 0,
  s_parasanguinis_pct: 0,
  s_australis_pct: 0,
  s_mitis_group_pct: 0,
  c_matruchotii_pct: 0,
  a_naeslundii_pct: 0,
  a_odontolyticus_pct: 0,
  actinomyces_other_pct: 0,
  neisseria_mucosa_pct: 0,
  neisseria_flavescens_pct: 0,
  neisseria_subflava_pct: 0,
  rothia_mucilaginosa_pct: 0,
  rothia_dentocariosa_pct: 0,
  rothia_aeria_pct: 0,
  h_parainfluenzae_pct: 0,
  prevotella_total_pct: 0,
  f_alocis_pct: 0,
  s_constellatus_pct: 0,
  parvimonas_micra_pct: 0,
  m_faucium_pct: 0,
  fretibacterium_total_pct: 0,
  treponema_hmt_237_pct: 0,
  lautropia_total_pct: 0,
  env_peroxide_flag: false,
  whitening_tray_last_48h: false,
  whitening_strips_last_48h: false,
  professional_whitening_last_7d: false,
  whitening_toothpaste_daily: false,
  peroxide_mouthwash_daily: false,
  entries: [],
}

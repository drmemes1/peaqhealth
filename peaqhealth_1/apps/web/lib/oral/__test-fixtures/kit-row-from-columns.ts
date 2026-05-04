/**
 * Test helper — wraps column-shape input into a kit row with the
 * raw_otu_table.__meta.entries structure the species-parser reads.
 *
 * Algorithm runner tests originally constructed kit rows like:
 *   { s_mutans_pct: 0.5, veillonella_pct: 4.0, ... }
 *
 * After the species-parser refactor (PR-261 + this PR), runners read
 * exclusively from raw_otu_table.__meta.entries. This helper translates
 * the column-shape test inputs into entries so tests don't have to be
 * rewritten with full taxonomy.
 *
 * Mapping rules:
 *   - <genus>_pct                → { genus: <Genus>, species: null }   (placeholder for genus sum)
 *   - <genus>_<species>_pct      → { genus: <Genus>, species: "<species>" }
 *   - Special cases (s_mutans → Streptococcus mutans, p_denticola →
 *     Prevotella denticola, etc.) handled in COLUMN_TO_TAXON below.
 *
 * Non-pct columns (env_peroxide_flag, shannon_diversity, lifestyle joins)
 * are passed through to the kit row unchanged.
 */
import type { ParsedEntryShape } from "../species-parser"

interface Taxon { genus: string; species: string | null }

const COLUMN_TO_TAXON: Record<string, Taxon> = {
  // Streptococcus species
  s_mutans_pct: { genus: "Streptococcus", species: "mutans" },
  s_sobrinus_pct: { genus: "Streptococcus", species: "sobrinus" },
  s_sanguinis_pct: { genus: "Streptococcus", species: "sanguinis" },
  s_gordonii_pct: { genus: "Streptococcus", species: "gordonii" },
  s_cristatus_pct: { genus: "Streptococcus", species: "cristatus" },
  s_parasanguinis_pct: { genus: "Streptococcus", species: "parasanguinis" },
  s_australis_pct: { genus: "Streptococcus", species: "australis" },
  s_mitis_pct: { genus: "Streptococcus", species: "mitis" },
  s_mitis_group_pct: { genus: "Streptococcus", species: "mitis-oralis" },
  s_salivarius_pct: { genus: "Streptococcus", species: "salivarius" },
  s_constellatus_pct: { genus: "Streptococcus", species: "constellatus" },

  // Other species-level
  scardovia_pct: { genus: "Scardovia", species: "wiggsiae" },
  b_dentium_pct: { genus: "Bifidobacterium", species: "dentium" },
  s_sputigena_pct: { genus: "Selenomonas", species: "sputigena" },
  p_acidifaciens_pct: { genus: "Propionibacterium", species: "acidifaciens" },
  leptotrichia_wadei_pct: { genus: "Leptotrichia", species: "wadei" },
  leptotrichia_shahii_pct: { genus: "Leptotrichia", species: "shahii" },
  p_denticola_pct: { genus: "Prevotella", species: "denticola" },
  prevotella_intermedia_pct: { genus: "Prevotella", species: "intermedia" },
  prevotella_nigrescens_pct: { genus: "Prevotella", species: "nigrescens" },
  prevotella_melaninogenica_pct: { genus: "Prevotella", species: "melaninogenica" },
  a_naeslundii_pct: { genus: "Actinomyces", species: "naeslundii" },
  rothia_dentocariosa_pct: { genus: "Rothia", species: "dentocariosa" },
  rothia_aeria_pct: { genus: "Rothia", species: "aeria" },
  p_gingivalis_pct: { genus: "Porphyromonas", species: "gingivalis" },
  t_forsythia_pct: { genus: "Tannerella", species: "forsythia" },
  tannerella_pct: { genus: "Tannerella", species: "forsythia" },
  f_alocis_pct: { genus: "Filifactor", species: "alocis" },
  f_nucleatum_pct: { genus: "Fusobacterium", species: "nucleatum" },
  s_moorei_pct: { genus: "Solobacterium", species: "moorei" },
  atopobium_parvulum_pct: { genus: "Atopobium", species: "parvulum" },
  eikenella_corrodens_pct: { genus: "Eikenella", species: "corrodens" },
  dialister_invisus_pct: { genus: "Dialister", species: "invisus" },
  eubacterium_sulci_pct: { genus: "Eubacterium", species: "sulci" },
  c_matruchotii_pct: { genus: "Corynebacterium", species: "matruchotii" },
  p_micra_pct: { genus: "Parvimonas", species: "micra" },

  // Genus-level columns → use a placeholder species so the entry sums
  // into the genus total via species-parser's genusTotal() pathway.
  // Species name is intentionally null so it matches the "Genus only"
  // semantics. species-parser sums all entries by genus regardless.
  rothia_pct: { genus: "Rothia", species: null },
  neisseria_pct: { genus: "Neisseria", species: null },
  haemophilus_pct: { genus: "Haemophilus", species: null },
  veillonella_pct: { genus: "Veillonella", species: null },
  actinomyces_pct: { genus: "Actinomyces", species: null },
  porphyromonas_pct: { genus: "Porphyromonas", species: null },
  treponema_pct: { genus: "Treponema", species: null },
  fusobacterium_pct: { genus: "Fusobacterium", species: null },
  parvimonas_pct: { genus: "Parvimonas", species: null },
  prevotella_commensal_pct: { genus: "Prevotella", species: null },
  selenomonas_total_pct: { genus: "Selenomonas", species: null },
  alloprevotella_total_pct: { genus: "Alloprevotella", species: null },
  lactobacillus_pct: { genus: "Lactobacillus", species: null },
}

/**
 * Build a kit row from column-shape test input. Synthesizes
 * raw_otu_table.__meta.entries; passes other fields through unchanged.
 */
export function kitRowFromColumns(
  cols: Record<string, unknown>,
): Record<string, unknown> {
  const entries: ParsedEntryShape[] = []
  const passthrough: Record<string, unknown> = {}

  for (const [col, value] of Object.entries(cols)) {
    if (col === "raw_otu_table") continue // already provided; skip
    const taxon = COLUMN_TO_TAXON[col]
    if (taxon && typeof value === "number" && value > 0) {
      entries.push({ genus: taxon.genus, species: taxon.species, pct: value })
    } else if (!col.endsWith("_pct") || !taxon) {
      // Pass through non-species fields (env_peroxide_flag, shannon_diversity,
      // hypertension_dx, ageRange, etc.) unchanged. Also pass through
      // unmapped _pct columns to the row; species-parser ignores them
      // since it reads from entries, but downstream consumers may need them.
      passthrough[col] = value
    }
  }

  return {
    ...passthrough,
    raw_otu_table: cols.raw_otu_table ?? {
      __meta: { entries },
    },
  }
}

/**
 * Oral kit upload parser
 * ======================
 *
 * Pure parsing layer extracted from app/api/admin/oral-upload/route.ts so it
 * can be unit-tested in isolation. The route imports `parseL7Input`,
 * `extractTaxonomy`, and the column mapping tables from this module.
 *
 * Caries v3 (PR-α): the SPECIES_COLUMNS table has been extended with 13 new
 * species needed by lib/oral/caries-v3.ts. Hyphenated species calls — Zymo's
 * V3-V4 region cannot always resolve closely related species (e.g.
 * "mitis-pneumoniae") — are now assigned to the first listed name that
 * matches a target column, with the original unresolved string captured in
 * `parserUnresolvedSpecies` for audit and future narrative use. See
 * ADR-0015 for the full mapping table and rationale.
 *
 * UNIT CONVENTION
 * ---------------
 * Internal abundances are percentages (e.g. 1.25 means 1.25 %). The parser
 * detects fractional vs percentage input via row-sum heuristic and converts
 * once. `oral_kit_orders.*_pct` columns are written in this percentage scale,
 * matching every existing consumer in the codebase.
 */

// ── Column mapping tables ───────────────────────────────────────────────────

export const GENUS_COLUMNS: Record<string, string> = {
  neisseria: "neisseria_pct",
  haemophilus: "haemophilus_pct",
  rothia: "rothia_pct",
  actinomyces: "actinomyces_pct",
  veillonella: "veillonella_pct",
  porphyromonas: "porphyromonas_pct",
  treponema: "treponema_pct",
  fusobacterium: "fusobacterium_pct",
  aggregatibacter: "aggregatibacter_pct",
  campylobacter: "campylobacter_pct",
  lactobacillus: "lactobacillus_pct",
  peptostreptococcus: "peptostreptococcus_pct",
  parvimonas: "parvimonas_pct",
  granulicatella: "granulicatella_pct",
}

export const SPECIES_COLUMNS: Record<string, string> = {
  // Existing v2 mappings.
  "tannerella forsythia": "tannerella_pct",
  "prevotella intermedia": "prevotella_intermedia_pct",
  "streptococcus mutans": "s_mutans_pct",
  "streptococcus sobrinus": "s_sobrinus_pct",
  "streptococcus sanguinis": "s_sanguinis_pct",
  "streptococcus gordonii": "s_gordonii_pct",
  "scardovia wiggsiae": "scardovia_pct",

  // ── Caries v3 additions (ADR-0015). ──
  "streptococcus cristatus": "s_cristatus_pct",
  "streptococcus parasanguinis": "s_parasanguinis_pct",
  "streptococcus australis": "s_australis_pct",
  "actinomyces naeslundii": "a_naeslundii_pct",
  "streptococcus mitis": "s_mitis_pct",
  "rothia dentocariosa": "rothia_dentocariosa_pct",
  "rothia aeria": "rothia_aeria_pct",
  "bifidobacterium dentium": "b_dentium_pct",
  "selenomonas sputigena": "s_sputigena_pct",
  "propionibacterium acidifaciens": "p_acidifaciens_pct",
  "leptotrichia wadei": "leptotrichia_wadei_pct",
  "leptotrichia shahii": "leptotrichia_shahii_pct",
  "prevotella denticola": "p_denticola_pct",
}

export const S_SALIVARIUS_SPECIES = ["streptococcus salivarius", "streptococcus vestibularis"]

// ── Types ───────────────────────────────────────────────────────────────────

export interface ParsedEntry {
  taxonomy_full: string
  kingdom: string
  phylum: string
  class_: string
  order: string
  family: string
  genus: string
  species: string | null
  is_named: boolean
  is_placeholder: boolean
  pct: number
  mapped_column: string | null
  mapping_type: "genus_sum" | "species_exact" | "species_hyphen_resolved" | "special" | "unmatched" | "placeholder"
}

export interface CommunitySummary {
  total_entries_present: number
  named_species_count: number
  unnamed_placeholder_count: number
  distinct_genera: number
  distinct_phyla: number
  total_abundance_captured: number
}

export interface ParseResult {
  entries: ParsedEntry[]
  communitySummary: CommunitySummary
  columnValues: Record<string, number>
  shannonDiversity: number | null
  shannonSource: "zymo_rarefaction" | "computed_l7" | null
  speciesCount: number
  totalTracked: number
  totalUntracked: number
  rawOtu: Record<string, unknown>
  /**
   * Hyphenated calls that the parser resolved by assigning the abundance to
   * the first listed species name that matched a target column.
   * Format: "<genus_lower>;<species_with_hyphen> -> <genus_lower> <resolved_part>"
   */
  parserUnresolvedSpecies: string[]
}

export interface TaxonomyParsed {
  taxonomy_full: string
  kingdom: string
  phylum: string
  class_: string
  order: string
  family: string
  genus: string
  species: string | null
  is_named: boolean
  is_placeholder: boolean
  fullSpecies: string
}

// ── Parsing helpers ─────────────────────────────────────────────────────────

export function extractTaxonomy(taxon: string): TaxonomyParsed {
  const levels = taxon.split(";").map(l => l.trim())
  const extract = (prefix: string) => {
    const match = levels.find(l => l.startsWith(prefix))
    return match ? match.slice(prefix.length).replace(/_/g, " ").trim() : ""
  }

  const kingdom = extract("k__")
  const phylum = extract("p__")
  const class_ = extract("c__")
  const order = extract("o__")
  const family = extract("f__")
  const genus = extract("g__")
  let species = extract("s__") || null

  if (!genus && !species) {
    const cleaned = taxon.replace(/[dkpcofgs]__/g, "").replace(/;/g, " ").replace(/_/g, " ").trim()
    const parts = cleaned.split(/\s+/)
    return {
      taxonomy_full: taxon, kingdom, phylum, class_, order, family,
      genus: parts[0] || "", species: parts[1] || null,
      is_named: true, is_placeholder: false, fullSpecies: parts.slice(0, 2).join(" "),
    }
  }

  if (!species || species === "" || species.toLowerCase() === "na") {
    return { taxonomy_full: taxon, kingdom, phylum, class_, order, family, genus, species: null, is_named: false, is_placeholder: true, fullSpecies: genus }
  }

  const firstPart = species.split("-")[0].replace(/ /g, "")
  const isPureSpNumber = /^sp\d+$/i.test(firstPart)

  return {
    taxonomy_full: taxon, kingdom, phylum, class_, order, family, genus, species,
    is_named: !isPureSpNumber,
    is_placeholder: isPureSpNumber,
    fullSpecies: `${genus} ${species}`,
  }
}

/**
 * Resolves a species call to a target column with hyphenated-call fallback.
 *
 * Strategy: if `<genus> <species>` doesn't match exactly, split the species
 * name on '-' and try each part. The first part that matches a tracked
 * column wins; the original unresolved string is returned so the caller can
 * write it to `parser_unresolved_species` for audit.
 */
export function resolveSpeciesColumn(
  genusLower: string,
  speciesLower: string,
): { column: string | null; unresolved: string | null } {
  const exactKey = `${genusLower} ${speciesLower}`
  if (SPECIES_COLUMNS[exactKey]) {
    return { column: SPECIES_COLUMNS[exactKey], unresolved: null }
  }
  if (speciesLower.includes("-")) {
    const parts = speciesLower.split("-")
    for (const part of parts) {
      const partKey = `${genusLower} ${part}`
      if (SPECIES_COLUMNS[partKey]) {
        return { column: SPECIES_COLUMNS[partKey], unresolved: `${genusLower};${speciesLower} -> ${partKey}` }
      }
    }
  }
  return { column: null, unresolved: null }
}

// ── Main entrypoint ─────────────────────────────────────────────────────────

export function parseL7Input(raw: string): ParseResult {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"))

  const delimiter = lines[0]?.includes("\t") ? "\t" : ","
  const hasHeader = lines[0]?.toLowerCase().includes("otu") || lines[0]?.toLowerCase().includes("taxonomy")
  const dataLines = hasHeader ? lines.slice(1) : lines

  const rawRows: { taxo: TaxonomyParsed; val: number }[] = []
  let valSum = 0

  for (const line of dataLines) {
    const cols = line.split(delimiter).map(c => c.trim())
    if (cols.length < 2) continue
    const taxon = cols[0]
    const firstNumCol = cols.slice(1).find(c => { const v = parseFloat(c); return Number.isFinite(v) })
    const val = firstNumCol != null ? parseFloat(firstNumCol) : NaN
    if (!Number.isFinite(val) || val <= 0) continue
    valSum += val
    rawRows.push({ taxo: extractTaxonomy(taxon), val })
  }

  const isFractional = valSum > 0 && valSum <= 2
  const multiplier = isFractional ? 100 : 1

  const allEntries: ParsedEntry[] = []
  const genusSums: Record<string, number> = {}
  const speciesSums: Record<string, number> = {}
  const parserUnresolvedSpecies: string[] = []
  let sSalivariusTotal = 0
  let strepTotal = 0
  let prevotellaCommensalTotal = 0
  const generaSet = new Set<string>()
  const phylaSet = new Set<string>()
  let namedCount = 0
  let placeholderCount = 0
  let totalAbundance = 0

  for (const { taxo, val } of rawRows) {
    const pct = parseFloat((val * multiplier).toFixed(4))
    totalAbundance += pct

    const genusLower = taxo.genus.toLowerCase()
    if (taxo.genus) generaSet.add(taxo.genus)
    if (taxo.phylum) phylaSet.add(taxo.phylum)
    if (taxo.is_named) namedCount++
    if (taxo.is_placeholder) placeholderCount++

    let mapped_column: string | null = null
    let mapping_type: ParsedEntry["mapping_type"] = taxo.is_placeholder ? "placeholder" : "unmatched"

    if (taxo.is_named) {
      const speciesKeyLower = (taxo.species ?? "").toLowerCase()
      const exactKey = `${genusLower} ${speciesKeyLower}`
      const exactCol = SPECIES_COLUMNS[exactKey]

      if (exactCol) {
        mapped_column = exactCol
        mapping_type = "species_exact"
        speciesSums[mapped_column] = (speciesSums[mapped_column] ?? 0) + pct
      } else {
        const hyphenResolved = speciesKeyLower.includes("-")
          ? resolveSpeciesColumn(genusLower, speciesKeyLower)
          : { column: null, unresolved: null }

        if (hyphenResolved.column) {
          mapped_column = hyphenResolved.column
          mapping_type = "species_hyphen_resolved"
          speciesSums[mapped_column] = (speciesSums[mapped_column] ?? 0) + pct
          if (hyphenResolved.unresolved) parserUnresolvedSpecies.push(hyphenResolved.unresolved)
        } else if (
          genusLower === "streptococcus" &&
          taxo.species &&
          (taxo.species.toLowerCase().includes("salivarius") || taxo.species.toLowerCase().includes("vestibularis"))
        ) {
          mapped_column = "s_salivarius_pct"
          mapping_type = "special"
          sSalivariusTotal += pct
        } else if (genusLower === "prevotella") {
          if (taxo.species && taxo.species.toLowerCase().includes("intermedia")) {
            mapped_column = "prevotella_intermedia_pct"
            mapping_type = "species_exact"
            speciesSums[mapped_column] = (speciesSums[mapped_column] ?? 0) + pct
          } else {
            mapped_column = "prevotella_commensal_pct"
            mapping_type = "special"
            prevotellaCommensalTotal += pct
          }
        } else if (GENUS_COLUMNS[genusLower]) {
          mapped_column = GENUS_COLUMNS[genusLower]
          mapping_type = "genus_sum"
          genusSums[mapped_column] = (genusSums[mapped_column] ?? 0) + pct
        }
      }

      if (genusLower === "streptococcus") strepTotal += pct
    }

    allEntries.push({
      taxonomy_full: taxo.taxonomy_full,
      kingdom: taxo.kingdom, phylum: taxo.phylum, class_: taxo.class_,
      order: taxo.order, family: taxo.family,
      genus: taxo.genus, species: taxo.species,
      is_named: taxo.is_named, is_placeholder: taxo.is_placeholder,
      pct, mapped_column, mapping_type,
    })
  }

  const ALL_TRACKED_COLUMNS = [
    ...Object.values(GENUS_COLUMNS),
    ...Object.values(SPECIES_COLUMNS),
    "s_salivarius_pct", "streptococcus_total_pct", "prevotella_commensal_pct",
  ]
  const columnValues: Record<string, number> = {}
  for (const col of ALL_TRACKED_COLUMNS) columnValues[col] = 0
  for (const [col, val] of Object.entries(genusSums)) columnValues[col] = parseFloat(val.toFixed(4))
  for (const [col, val] of Object.entries(speciesSums)) columnValues[col] = parseFloat(val.toFixed(4))
  columnValues["s_salivarius_pct"] = parseFloat(sSalivariusTotal.toFixed(4))
  columnValues["streptococcus_total_pct"] = parseFloat(strepTotal.toFixed(4))
  columnValues["prevotella_commensal_pct"] = parseFloat(prevotellaCommensalTotal.toFixed(4))

  const pctVals = allEntries.map(e => e.pct).filter(v => v > 0)
  const pctTotal = pctVals.reduce((a, b) => a + b, 0)
  let shannonDiversity: number | null = null
  if (pctTotal > 0) {
    shannonDiversity = -pctVals.reduce((h, v) => {
      const p = v / pctTotal
      return p > 0 ? h + p * Math.log(p) : h
    }, 0)
    shannonDiversity = parseFloat(shannonDiversity.toFixed(3))
  }

  const communitySummary: CommunitySummary = {
    total_entries_present: allEntries.length,
    named_species_count: namedCount,
    unnamed_placeholder_count: placeholderCount,
    distinct_genera: generaSet.size,
    distinct_phyla: phylaSet.size,
    total_abundance_captured: parseFloat(totalAbundance.toFixed(2)),
  }

  const flatOtu: Record<string, unknown> = {}
  for (const entry of allEntries) {
    const key = entry.species ? `${entry.genus} ${entry.species}` : entry.genus
    flatOtu[key] = ((flatOtu[key] as number) ?? 0) + entry.pct / 100
  }
  flatOtu["__meta"] = {
    community_summary: communitySummary,
    entries: allEntries,
    parsed_at: new Date().toISOString(),
    parser_version: "v4-caries-v3",
  }

  const trackedCount = allEntries.filter(e => e.mapping_type !== "unmatched" && e.mapping_type !== "placeholder").length

  return {
    entries: allEntries.sort((a, b) => b.pct - a.pct),
    communitySummary,
    columnValues,
    shannonDiversity,
    shannonSource: shannonDiversity != null ? "computed_l7" : null,
    speciesCount: allEntries.length,
    totalTracked: trackedCount,
    totalUntracked: allEntries.length - trackedCount,
    rawOtu: flatOtu,
    parserUnresolvedSpecies,
  }
}

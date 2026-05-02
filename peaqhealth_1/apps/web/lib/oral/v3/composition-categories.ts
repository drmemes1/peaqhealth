/**
 * Composition-bar category mapping.
 *
 * Maps a parsed `raw_otu_table` key (e.g. "Streptococcus sanguinis" or a
 * blob like "Neisseria mucosa-perflava-subflava") to one of the five
 * composition-bar categories surfaced on the oral page.
 *
 * Categories grow as new scoring algorithms ship (gum, halitosis,
 * biofilm). Existing classifications stay stable.
 *
 * The keys here use the same "Genus species" space-delimited format the
 * upload-parser writes into `raw_otu_table`. Multi-species keys are
 * handled by splitting the species component on `-` and matching any
 * alternative.
 */

export type CompositionCategory =
  | "buffering"           // ADS commensals / pH defenders from caries v3
  | "nr_favorable"        // Tier 1 + Tier 2 nitrate reducers from NR-α
  | "cariogenic"          // CLI species from caries v3
  | "context_dependent"   // Veillonella, Prevotella — role depends on context
  | "unclassified"        // everything else parser detected

/** Species-level overrides. "Genus species" key matches raw_otu_table format. */
export const SPECIES_CATEGORIES: Record<string, CompositionCategory> = {
  // Buffering / pH defenders
  "Streptococcus sanguinis":     "buffering",
  "Streptococcus gordonii":      "buffering",
  "Streptococcus cristatus":     "buffering",
  "Streptococcus parasanguinis": "buffering",
  "Streptococcus australis":     "buffering",
  "Actinomyces naeslundii":      "buffering",

  // NR-favorable (Tier 1 + Tier 2)
  "Neisseria mucosa":            "nr_favorable",
  "Neisseria flavescens":        "nr_favorable",
  "Neisseria subflava":          "nr_favorable",
  "Rothia mucilaginosa":         "nr_favorable",
  "Rothia dentocariosa":         "nr_favorable",
  "Rothia aeria":                "nr_favorable",
  "Actinomyces odontolyticus":   "nr_favorable",
  "Haemophilus parainfluenzae":  "nr_favorable",

  // Cariogenic
  "Streptococcus mutans":           "cariogenic",
  "Streptococcus sobrinus":         "cariogenic",
  "Bifidobacterium dentium":        "cariogenic",
  "Selenomonas sputigena":          "cariogenic",
  "Propionibacterium acidifaciens": "cariogenic",
  "Leptotrichia wadei":             "cariogenic",
  "Leptotrichia shahii":            "cariogenic",
  "Prevotella denticola":           "cariogenic",
}

/** Genus-level fallbacks when no species match is found. */
export const GENUS_CATEGORIES: Record<string, CompositionCategory> = {
  Scardovia:     "cariogenic",
  Lactobacillus: "cariogenic",
  Veillonella:   "context_dependent",
  Prevotella:    "context_dependent",
  Neisseria:     "nr_favorable",
  Rothia:        "nr_favorable",
}

/**
 * Categorize a single parsed OTU key.
 *
 * Accepts the original key string ("Genus species" or just "Genus") OR
 * a pre-split (genus, species) pair. Multi-species keys are handled by
 * splitting the species component on `-` and trying each alternative.
 */
export function categorizeSpecies(genus: string, species: string | null): CompositionCategory {
  if (species) {
    const alternatives = species.includes("-") ? species.split("-") : [species]
    for (const alt of alternatives) {
      const key = `${genus} ${alt}`
      const hit = SPECIES_CATEGORIES[key]
      if (hit) return hit
    }
  }
  if (GENUS_CATEGORIES[genus]) return GENUS_CATEGORIES[genus]
  return "unclassified"
}

/** Convenience for raw `Genus species` keys (with possible "-" alternatives). */
export function categorizeKey(rawKey: string): CompositionCategory {
  const trimmed = rawKey.trim()
  if (!trimmed) return "unclassified"
  const firstSpace = trimmed.indexOf(" ")
  if (firstSpace < 0) return categorizeSpecies(trimmed, null)
  const genus = trimmed.slice(0, firstSpace)
  const species = trimmed.slice(firstSpace + 1).trim() || null
  return categorizeSpecies(genus, species)
}

/** Display labels and palette tokens for the bar legend. */
export const CATEGORY_META: Record<CompositionCategory, {
  label: string
  swatchVar: string
  blurb: string
}> = {
  buffering: {
    label: "pH buffering",
    swatchVar: "var(--c-commensal)",
    blurb: "ADS-active commensals that neutralize plaque acids",
  },
  nr_favorable: {
    label: "Heart-supporting (NO pathway)",
    swatchVar: "var(--c-heart)",
    blurb: "Tiered nitrate reducers — Neisseria, Rothia, Haemophilus, Actinomyces",
  },
  cariogenic: {
    label: "Caries-associated",
    swatchVar: "var(--c-cavity)",
    blurb: "Acid producers and aciduric species — pressure on enamel",
  },
  context_dependent: {
    label: "Context-dependent",
    swatchVar: "var(--c-context)",
    blurb: "Role depends on community state — Veillonella, Prevotella",
  },
  unclassified: {
    label: "Other detected",
    swatchVar: "rgba(20,20,16,0.18)",
    blurb: "Species not yet mapped to a current category",
  },
}

export const COMPOSITION_CATEGORIES_ORDERED: CompositionCategory[] = [
  "buffering",
  "nr_favorable",
  "cariogenic",
  "context_dependent",
  "unclassified",
]

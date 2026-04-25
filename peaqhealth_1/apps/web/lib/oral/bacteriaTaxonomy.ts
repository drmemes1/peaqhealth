export type BacteriaCategory = "heart_protective" | "remineralizer" | "commensal" | "context_dependent" | "cariogenic" | "orange_complex" | "red_complex" | "minor"

export interface BacteriaTaxonEntry {
  genus: string
  category: BacteriaCategory
  colorVar: string
  displayName: string
  scientificName: string
  citation: string
}

export const BACTERIA_TAXONOMY: BacteriaTaxonEntry[] = [
  // Heart-protective greens
  { genus: "Neisseria", category: "heart_protective", colorVar: "--tm-protect-neisseria", displayName: "Neisseria", scientificName: "Neisseria spp.", citation: "Vanhatalo2018" },
  { genus: "Rothia", category: "heart_protective", colorVar: "--tm-protect-rothia", displayName: "Rothia", scientificName: "Rothia mucilaginosa / dentocariosa", citation: "Vanhatalo2018" },
  { genus: "Haemophilus", category: "heart_protective", colorVar: "--tm-protect-haem", displayName: "Haemophilus", scientificName: "Haemophilus parainfluenzae", citation: "Hyde2014" },
  { genus: "Actinomyces", category: "heart_protective", colorVar: "--tm-protect-actino", displayName: "Actinomyces", scientificName: "Actinomyces spp.", citation: "Vanhatalo2018" },

  // Remineralizers — dusty jade
  { genus: "Streptococcus salivarius", category: "remineralizer", colorVar: "--tm-remin-saliv", displayName: "S. salivarius", scientificName: "Streptococcus salivarius", citation: "Burton2013" },
  { genus: "Streptococcus sanguinis", category: "remineralizer", colorVar: "--tm-remin-sang", displayName: "S. sanguinis", scientificName: "Streptococcus sanguinis", citation: "Kreth2005" },
  { genus: "Streptococcus gordonii", category: "remineralizer", colorVar: "--tm-remin-gord", displayName: "S. gordonii", scientificName: "Streptococcus gordonii", citation: "Kreth2005" },

  // Commensal parchment
  { genus: "Streptococcus", category: "commensal", colorVar: "--tm-neutral-strep", displayName: "Streptococcus", scientificName: "Streptococcus genus (non-specific)", citation: "Hyde2014" },
  { genus: "Prevotella", category: "commensal", colorVar: "--tm-neutral-prevo", displayName: "Prevotella", scientificName: "Prevotella spp. (commensal)", citation: "Hyde2014" },
  { genus: "Granulicatella", category: "commensal", colorVar: "--tm-neutral-other", displayName: "Granulicatella", scientificName: "Granulicatella spp.", citation: "NEEDS_EVIDENCE" },
  { genus: "Gemella", category: "commensal", colorVar: "--tm-neutral-other", displayName: "Gemella", scientificName: "Gemella spp.", citation: "NEEDS_EVIDENCE" },

  // Context-dependent — slate
  { genus: "Veillonella", category: "context_dependent", colorVar: "--tm-slate-1", displayName: "Veillonella", scientificName: "Veillonella spp.", citation: "Wei2024,Washio2014" },

  // Cariogenic — dusty coral
  { genus: "Streptococcus mutans", category: "cariogenic", colorVar: "--tm-cario-mutans", displayName: "S. mutans", scientificName: "Streptococcus mutans", citation: "Loesche1986" },
  { genus: "Streptococcus sobrinus", category: "cariogenic", colorVar: "--tm-cario-sobr", displayName: "S. sobrinus", scientificName: "Streptococcus sobrinus", citation: "Loesche1986" },
  { genus: "Lactobacillus", category: "cariogenic", colorVar: "--tm-cario-lacto", displayName: "Lactobacillus", scientificName: "Lactobacillus spp.", citation: "Loesche1986" },

  // Orange complex — burnt ochre
  { genus: "Fusobacterium", category: "orange_complex", colorVar: "--tm-orange-fuso", displayName: "Fusobacterium", scientificName: "Fusobacterium nucleatum", citation: "Socransky1998" },
  { genus: "Aggregatibacter", category: "orange_complex", colorVar: "--tm-orange-agg", displayName: "Aggregatibacter", scientificName: "Aggregatibacter actinomycetemcomitans", citation: "Socransky1998" },
  { genus: "Campylobacter", category: "orange_complex", colorVar: "--tm-orange-camp", displayName: "Campylobacter", scientificName: "Campylobacter rectus", citation: "Socransky1998" },

  // Red complex — oxblood
  { genus: "Porphyromonas", category: "red_complex", colorVar: "--tm-red-porph", displayName: "Porphyromonas", scientificName: "Porphyromonas gingivalis", citation: "Socransky1998" },
  { genus: "Tannerella", category: "red_complex", colorVar: "--tm-red-tann", displayName: "Tannerella", scientificName: "Tannerella forsythia", citation: "Socransky1998" },
  { genus: "Treponema", category: "red_complex", colorVar: "--tm-red-trep", displayName: "Treponema", scientificName: "Treponema denticola", citation: "Socransky1998" },
]

export const CATEGORY_LABELS: Record<BacteriaCategory, string> = {
  heart_protective: "Heart-protective",
  remineralizer: "Remineralizer",
  commensal: "Commensal",
  context_dependent: "Context-dependent",
  cariogenic: "Cavity-maker",
  orange_complex: "Orange complex",
  red_complex: "Red complex",
  minor: "Minor",
}

export const CATEGORY_COLORS: Record<BacteriaCategory, string> = {
  heart_protective: "#4A6E52",
  remineralizer: "#3D7A75",
  commensal: "#B5A688",
  context_dependent: "#4A5764",
  cariogenic: "#B58579",
  orange_complex: "#A87C3E",
  red_complex: "#6B3232",
  minor: "#E0DAC6",
}

export function lookupTaxon(genus: string): BacteriaTaxonEntry | null {
  // Try exact match first, then genus prefix
  const exact = BACTERIA_TAXONOMY.find(t => t.genus.toLowerCase() === genus.toLowerCase())
  if (exact) return exact
  const prefix = BACTERIA_TAXONOMY.find(t => genus.toLowerCase().startsWith(t.genus.toLowerCase()))
  return prefix ?? null
}

export interface BacterialEntry {
  name: string
  scientificName: string
  category: string
  plainDescription: string
  clinicalSignificance: string
  whatAffectsIt: string[]
  cnvrgThreshold: { strong: string; watch: string; attention: string }
}

export const BACTERIAL_KNOWLEDGE: BacterialEntry[] = [
  // ── Nitrate-reducers ──
  {
    name: "Neisseria",
    scientificName: "Neisseria subflava / flavescens",
    category: "Nitrate-reducer (cardiovascular support)",
    plainDescription: "The primary bacteria converting dietary nitrate from leafy greens into nitric oxide — the molecule that helps blood vessels relax.",
    clinicalSignificance: "Strong Neisseria levels are associated with lower blood pressure and better cardiovascular markers in population studies. Depleted Neisseria removes a natural cardiovascular offset.",
    whatAffectsIt: ["Antiseptic mouthwash (suppresses by 60-90%)", "Dietary nitrate intake (leafy greens, beets)", "Smoking (suppresses)", "Chlorhexidine rinse"],
    cnvrgThreshold: { strong: "≥10%", watch: "4-10%", attention: "<4%" },
  },
  {
    name: "Rothia",
    scientificName: "Rothia mucilaginosa / dentocariosa",
    category: "Nitrate-reducer (cardiovascular support)",
    plainDescription: "Secondary nitrate reducer that supports nitric oxide production alongside Neisseria. Also plays a role in maintaining oral pH balance.",
    clinicalSignificance: "Contributes to the nitrate-nitrite-NO pathway. Often enriched alongside dietary nitrate consumption.",
    whatAffectsIt: ["Dietary nitrate intake", "Oral pH environment", "Antiseptic mouthwash"],
    cnvrgThreshold: { strong: "≥3%", watch: "1-3%", attention: "<1%" },
  },
  {
    name: "Haemophilus",
    scientificName: "Haemophilus parainfluenzae",
    category: "Nitrate-reducer (metabolic support)",
    plainDescription: "Nitrate reducer with a distinct role from Neisseria — linked specifically to blood sugar regulation through the nitric oxide pathway.",
    clinicalSignificance: "Lower Haemophilus is associated with impaired glucose handling in population data. It responds to different inputs than Neisseria, so the composite can look strong while Haemophilus is individually low.",
    whatAffectsIt: ["Iron status (low ferritin may suppress)", "Recent antibiotics", "Dietary nitrate", "Individual variation"],
    cnvrgThreshold: { strong: "≥4%", watch: "2-4%", attention: "<2%" },
  },
  {
    name: "Actinomyces",
    scientificName: "Actinomyces spp.",
    category: "Nitrate-reducer / mild acid producer",
    plainDescription: "Dual-role bacterium — contributes to nitrate reduction but also produces mild acid. Part of the healthy oral community in moderate amounts.",
    clinicalSignificance: "Moderate levels are normal and contribute to the nitric oxide pathway. Very high levels can shift pH toward acidic.",
    whatAffectsIt: ["Oral hygiene routine", "Diet", "Salivary flow"],
    cnvrgThreshold: { strong: "3-10%", watch: "1-3%", attention: "<1%" },
  },
  {
    name: "Veillonella",
    scientificName: "Veillonella parvula",
    category: "Nitrate-reducer / acid buffer",
    plainDescription: "Consumes lactate (acid) produced by other bacteria, helping buffer your oral pH. Also participates in nitrate reduction.",
    clinicalSignificance: "Plays a protective role by consuming acid that would otherwise damage enamel. Part of the healthy buffering system.",
    whatAffectsIt: ["Sugar intake (produces more lactate for Veillonella to consume)", "Overall oral community composition"],
    cnvrgThreshold: { strong: "≥1%", watch: "0.3-1%", attention: "<0.3%" },
  },

  // ── Orange-complex (gum) ──
  {
    name: "Fusobacterium",
    scientificName: "Fusobacterium nucleatum",
    category: "Orange-complex (gum inflammation)",
    plainDescription: "Lives in gaps between teeth and gums. Acts as a bridge between early colonizers and the more aggressive red-complex bacteria.",
    clinicalSignificance: "Elevated Fusobacterium is one of the earliest signals of gum inflammation. It physically connects early and late-stage gum bacteria, enabling biofilm maturation.",
    whatAffectsIt: ["Flossing frequency (most direct lever)", "Professional cleaning", "Mouth breathing (dries gumline)", "Smoking"],
    cnvrgThreshold: { strong: "<0.5%", watch: "0.5-2%", attention: ">2%" },
  },
  {
    name: "Aggregatibacter",
    scientificName: "Aggregatibacter actinomycetemcomitans",
    category: "Orange-complex (gum inflammation)",
    plainDescription: "Gum bacteria associated with early-stage tissue changes. More common in younger adults.",
    clinicalSignificance: "Can trigger aggressive gum inflammation even in people with good oral hygiene. Professional evaluation is warranted when elevated.",
    whatAffectsIt: ["Professional cleaning", "Flossing", "Genetic susceptibility"],
    cnvrgThreshold: { strong: "<0.5%", watch: "0.5-1.5%", attention: ">1.5%" },
  },
  {
    name: "Campylobacter",
    scientificName: "Campylobacter rectus",
    category: "Orange-complex (gum inflammation)",
    plainDescription: "Anaerobic gum bacterium that thrives in deeper periodontal pockets where oxygen is scarce.",
    clinicalSignificance: "Associated with progressive pocket deepening. Often elevated alongside Fusobacterium.",
    whatAffectsIt: ["Pocket depth (deeper = more)", "Professional cleaning", "Smoking"],
    cnvrgThreshold: { strong: "<0.5%", watch: "0.5-1.5%", attention: ">1.5%" },
  },

  // ── Red-complex (severe gum) ──
  {
    name: "Porphyromonas",
    scientificName: "Porphyromonas gingivalis",
    category: "Red-complex (active gum disease)",
    plainDescription: "The most studied gum-linked species. Produces enzymes (gingipains) that break down gum tissue and have been found in cardiovascular plaque.",
    clinicalSignificance: "Strong association with systemic inflammation. Elevated Porphyromonas with elevated hs-CRP in blood is a two-source inflammatory signal.",
    whatAffectsIt: ["Professional periodontal treatment", "Flossing", "Smoking (major driver)", "Oral probiotics (L. reuteri)"],
    cnvrgThreshold: { strong: "<0.5%", watch: "0.5-2%", attention: ">2%" },
  },
  {
    name: "Tannerella",
    scientificName: "Tannerella forsythia",
    category: "Red-complex (active gum disease)",
    plainDescription: "Red-complex bacterium found alongside Porphyromonas in deeper pockets. Part of the late-stage gum inflammation triad.",
    clinicalSignificance: "Its presence alongside Porphyromonas and Treponema is the classic red-complex signature. Strongest cross-panel association with LDL in population data.",
    whatAffectsIt: ["Professional periodontal treatment", "Pocket depth"],
    cnvrgThreshold: { strong: "<0.5%", watch: "0.5-1%", attention: ">1%" },
  },
  {
    name: "Treponema",
    scientificName: "Treponema denticola",
    category: "Red-complex (active gum disease)",
    plainDescription: "Spiral-shaped bacteria that can penetrate gum tissue. The third member of the red-complex triad.",
    clinicalSignificance: "Marker of deep-pocket activity. Its spiral shape allows it to penetrate tissue that other bacteria cannot reach.",
    whatAffectsIt: ["Professional periodontal treatment", "Pocket depth"],
    cnvrgThreshold: { strong: "<0.5%", watch: "0.5-1%", attention: ">1%" },
  },

  // ── Cavity ──
  {
    name: "Streptococcus mutans",
    scientificName: "Streptococcus mutans",
    category: "Cariogenic (cavity-causing)",
    plainDescription: "The primary cavity-causing bacterium. Produces acid from sugar that dissolves tooth enamel.",
    clinicalSignificance: "Each sugar exposure triggers a 20-minute acid attack from S. mutans. Frequency of sugar intake matters more than total amount.",
    whatAffectsIt: ["Sugar frequency (most direct lever)", "Xylitol (starves S. mutans)", "Fluoride", "S. sanguinis (competes for same surface)"],
    cnvrgThreshold: { strong: "<0.5%", watch: "0.5-1.5%", attention: ">1.5%" },
  },
  {
    name: "Streptococcus sobrinus",
    scientificName: "Streptococcus sobrinus",
    category: "Cariogenic (cavity-causing)",
    plainDescription: "Works alongside S. mutans. Even more acid-producing in some studies.",
    clinicalSignificance: "Together with S. mutans, their combined level determines cavity risk. The environment (pH, protective ratio) determines whether they cause damage.",
    whatAffectsIt: ["Sugar frequency", "Xylitol", "Oral pH environment"],
    cnvrgThreshold: { strong: "<0.3%", watch: "0.3-1%", attention: ">1%" },
  },

  // ── Protective ──
  {
    name: "Streptococcus sanguinis",
    scientificName: "Streptococcus sanguinis",
    category: "Protective (cavity defense)",
    plainDescription: "Your lead defender against cavity bacteria. Produces hydrogen peroxide that is directly hostile to S. mutans — they compete for the same tooth-surface territory.",
    clinicalSignificance: "Higher is better. The ratio of S. sanguinis to S. mutans is one of the most informative cavity-risk indicators.",
    whatAffectsIt: ["Oral hygiene", "Diet composition", "Probiotic supplementation"],
    cnvrgThreshold: { strong: "≥1.5%", watch: "0.5-1.5%", attention: "<0.5%" },
  },
  {
    name: "Streptococcus gordonii",
    scientificName: "Streptococcus gordonii",
    category: "Protective (cavity defense)",
    plainDescription: "Produces alkali that raises local pH — the opposite of what cavity-makers do. Part of the protective defense team alongside S. sanguinis.",
    clinicalSignificance: "Contributes to the protective ratio. Works synergistically with S. sanguinis.",
    whatAffectsIt: ["Oral hygiene", "Probiotic strains (K12, M18)"],
    cnvrgThreshold: { strong: "≥0.3%", watch: "0.1-0.3%", attention: "<0.1%" },
  },
  {
    name: "Streptococcus salivarius",
    scientificName: "Streptococcus salivarius",
    category: "Protective (commensal)",
    plainDescription: "Harmless, helpful streptococcus. Produces bacteriocins — natural antimicrobial compounds that suppress pathogenic competitors.",
    clinicalSignificance: "High S. salivarius is a positive finding even when total Streptococcus genus percentage looks high. It's important to distinguish S. salivarius from S. mutans.",
    whatAffectsIt: ["Probiotic K12 strains", "Overall oral ecosystem diversity"],
    cnvrgThreshold: { strong: "≥5%", watch: "1-5%", attention: "<1%" },
  },

  // ── VSC / halitosis ──
  {
    name: "Solobacterium moorei",
    scientificName: "Solobacterium moorei",
    category: "VSC producer (breath-related)",
    plainDescription: "The primary halitosis organism. Produces volatile sulfur compounds (hydrogen sulfide and methyl mercaptan) that cause morning breath.",
    clinicalSignificance: "Lives primarily on the tongue dorsum. Tongue scraping is the most effective intervention — it outperforms any mouthwash for VSC reduction.",
    whatAffectsIt: ["Tongue scraping (most direct lever)", "Oral hygiene", "Hydration", "Mouth breathing (worsens via dry mouth)"],
    cnvrgThreshold: { strong: "<0.5%", watch: "0.5-1%", attention: ">1%" },
  },
]

export function getBacterialKnowledgePrompt(): string {
  const lines = BACTERIAL_KNOWLEDGE.map(b =>
    `${b.name} (${b.category}): ${b.plainDescription} Significance: ${b.clinicalSignificance} Thresholds: strong ${b.cnvrgThreshold.strong}, watch ${b.cnvrgThreshold.watch}, attention ${b.cnvrgThreshold.attention}. Affected by: ${b.whatAffectsIt.join("; ")}.`
  )
  return `BACTERIAL KNOWLEDGE REFERENCE:\n${lines.join("\n\n")}`
}

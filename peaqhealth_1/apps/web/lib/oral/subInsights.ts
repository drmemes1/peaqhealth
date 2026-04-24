export interface SubInsight {
  id: string
  parentCompositeId: string
  flaggedBacterium: string
  flaggedBacteriumDisplay: string
  calloutTitle: string
  calloutBody: string
  relatedInterventionIds: string[]
  crossPanelReferences: string[]
}

interface BacteriaData {
  neisseriaPct: number | null
  rothiaPct: number | null
  haemophilusPct: number | null
  actinomycesPct: number | null
  veillonellaPct: number | null
  nitricOxideTotal: number
  fusobacteriumPct: number | null
  porphyromonasPct: number | null
  gumHealthTotal: number
  sMutansPct: number | null
  sSobrinusPct: number | null
  cavityBacteriaTotal: number
  sSanguinisPct: number | null
  sGordoniiPct: number | null
  cavityProtectorsTotal: number
}

type RuleFn = (data: BacteriaData) => SubInsight | null

const rule_haemophilus_low: RuleFn = (data) => {
  if (data.nitricOxideTotal < 25) return null
  const h = data.haemophilusPct ?? 0
  if (h >= 4) return null
  return {
    id: "haemophilus_low_when_nr_strong",
    parentCompositeId: "nitrate_reducer_pathway",
    flaggedBacterium: "haemophilus",
    flaggedBacteriumDisplay: "Haemophilus",
    calloutTitle: "One to notice",
    calloutBody: `Your Haemophilus is quieter than we'd expect — ${h.toFixed(1)}% where 5–15% is typical. The composite looks strong because Neisseria and Rothia are doing the heavy lifting, but Haemophilus plays a distinct role and responds to different inputs.`,
    relatedInterventionIds: ["check_iron_status", "post-antibiotic-recovery"],
    crossPanelReferences: ["blood.ferritin", "questionnaire.antibioticsWindow"],
  }
}

const rule_protectors_low_despite_low_cavity: RuleFn = (data) => {
  if (data.cavityBacteriaTotal >= 0.5) return null
  if (data.cavityProtectorsTotal >= 2) return null
  return {
    id: "protectors_low_despite_low_cavity",
    parentCompositeId: "cavity_balance",
    flaggedBacterium: "s_sanguinis",
    flaggedBacteriumDisplay: "S. sanguinis",
    calloutTitle: "Room to grow",
    calloutBody: `Your cavity bacteria are low, but your protective species are also thin at ${data.cavityProtectorsTotal.toFixed(1)}%. S. sanguinis and S. gordonii are the bacteria that actively compete with cavity-makers — building them up adds a buffer for the future.`,
    relatedInterventionIds: ["start-oral-probiotic"],
    crossPanelReferences: [],
  }
}

const ALL_SUB_INSIGHTS: RuleFn[] = [
  rule_haemophilus_low,
  rule_protectors_low_despite_low_cavity,
]

export function getSubInsights(data: BacteriaData): SubInsight[] {
  const results: SubInsight[] = []
  for (const rule of ALL_SUB_INSIGHTS) {
    const r = rule(data)
    if (r) results.push(r)
  }
  return results
}

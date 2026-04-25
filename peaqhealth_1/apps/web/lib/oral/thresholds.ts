export type ThresholdStatus = "pilot_validation_pending" | "validated" | "literature_only"

export interface ThresholdEntry {
  typical_min?: number
  typical_max?: number
  flag_low?: number
  flag_high?: number
  citation: string
  status: ThresholdStatus
}

export const ORAL_THRESHOLDS: Record<string, ThresholdEntry & Record<string, unknown>> = {
  neisseria: { typical_min: 0.10, typical_max: 0.20, flag_low: 0.05, citation: "Vanhatalo2018", status: "literature_only" },
  rothia: { typical_min: 0.03, typical_max: 0.10, citation: "Vanhatalo2018", status: "literature_only" },
  haemophilus: { typical_min: 0.03, typical_max: 0.15, flag_low: 0.03, citation: "Hyde2014", status: "literature_only" },
  actinomyces: { typical_min: 0.03, typical_max: 0.10, citation: "Hyde2014", status: "literature_only" },
  veillonella: {
    typical_min: 0.05, typical_max: 0.15,
    citation: "Wei2024,Washio2014",
    status: "pilot_validation_pending",
    cariogenic_synergy: { veillonella_threshold: 0.10, s_mutans_threshold: 0.01, citation: "Wei2024" },
    halitosis_contribution: { veillonella_threshold: 0.06, breath_freshness_threshold: 70, citation: "Washio2014" },
    inflammatory_burden: { veillonella_threshold: 0.12, shannon_threshold: 3.5, citation: "Jung2026" },
  },
  s_mutans: { typical_max: 0.005, citation: "Loesche1986", status: "literature_only" },
  s_sobrinus: { typical_max: 0.003, citation: "Loesche1986", status: "literature_only" },
  fusobacterium: { typical_max: 0.005, flag_high: 0.015, citation: "Socransky1998", status: "literature_only" },
  aggregatibacter: { typical_max: 0.005, flag_high: 0.010, citation: "Socransky1998", status: "literature_only" },
  campylobacter: { typical_max: 0.005, citation: "Socransky1998", status: "literature_only" },
  porphyromonas: { typical_max: 0.005, flag_high: 0.005, citation: "Socransky1998", status: "literature_only" },
  tannerella: { typical_max: 0.005, citation: "Socransky1998", status: "literature_only" },
  treponema: { typical_max: 0.005, citation: "Socransky1998", status: "literature_only" },
  shannon: { typical_min: 3.5, typical_max: 5.5, flag_low: 3.0, citation: "Chaturvedi2025", status: "literature_only" },
}

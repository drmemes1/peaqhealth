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
  breath_freshness: {
    fresh_min: 90, mild_min: 75, moderate_min: 60, elevated_min: 40,
    citation: "Kikuchi2025,Popa2025", status: "pilot_validation_pending" as ThresholdStatus,
  },
  biofilm_maturity: {
    immature: { min: 0, max: 0.05 },
    developing: { min: 0.05, max: 0.15 },
    mature: { min: 0.15, max: 0.30 },
    advanced: { min: 0.30, max: 999 },
    citation: "Socransky1998,Lamont2018",
    status: "pilot_validation_pending" as ThresholdStatus,
  },
  translocation: {
    low: { min: 0, max: 1.5 },
    moderate: { min: 1.5, max: 3.5 },
    elevated: { min: 3.5, max: 999 },
    citation: "Atarashi2017,Konig2016,Schmidt2019",
    status: "pilot_validation_pending" as ThresholdStatus,
  },
  inflammatory_pattern: {
    not_present: { min: 0, max: 0.5 },
    subtle: { min: 0.5, max: 1.5 },
    marked: { min: 1.5, max: 999 },
    citation: "Wei2024,Jung2026",
    status: "pilot_validation_pending" as ThresholdStatus,
  },
}

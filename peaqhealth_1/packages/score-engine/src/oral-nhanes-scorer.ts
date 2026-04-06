/**
 * NHANES-anchored oral microbiome scorer.
 *
 * Compares a user's oral microbiome data against the NHANES 2009-2012
 * reference (n=9,660 US adults) and returns percentile-based scores.
 * Supports age/sex stratification when demographics are available.
 */

import nhanesRefRaw from "../data/nhanes_oral_reference.json"

interface NHANESReference {
  metadata: { n_participants: number; has_demographics: boolean }
  diversity: {
    overall: Record<string, PercentileTable>
    by_age_sex: Record<string, Record<string, PercentileTable>>
  }
  genera: Record<string, { percentiles: PercentileTable; role: string; median_abundance: number }>
  scoring_bands: {
    overall: Record<string, unknown>
    by_age_sex: Record<string, Record<string, unknown>>
  }
}

const nhanesRef = nhanesRefRaw as unknown as NHANESReference

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OralNHANESInput {
  age?: number
  sex?: "male" | "female"
  shannon?: number
  observed_asvs?: number
  simpson?: number
  veillonella_pct?: number
  rothia_pct?: number
  neisseria_pct?: number
  porphyromonas_pct?: number
  treponema_pct?: number
  fusobacterium_pct?: number
}

export interface MetricResult {
  value: number
  percentile: number
  score: number
  population_median: number
  population_p25?: number
  population_p75?: number
  interpretation: string
}

export interface OralNHANESScore {
  overall_score: number
  overall_percentile: number
  metrics: Record<string, MetricResult>
  n_reference: number
  age_sex_group: string
  stratified: boolean
  summary: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PERCENTILE_KEYS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
                         55, 60, 65, 70, 75, 80, 85, 90, 95]

type PercentileTable = Record<string, number>

function getAgeGroup(age: number): string {
  if (age <= 29) return "14_29"
  if (age <= 39) return "30_39"
  if (age <= 49) return "40_49"
  if (age <= 59) return "50_59"
  if (age <= 69) return "60_69"
  return "70_plus"
}

function getAgeGroupLabel(age: number): string {
  if (age <= 29) return "14-29"
  if (age <= 39) return "30-39"
  if (age <= 49) return "40-49"
  if (age <= 59) return "50-59"
  if (age <= 69) return "60-69"
  return "70+"
}

function getDiversityTable(metric: string, age?: number, sex?: string): PercentileTable | undefined {
  if (age !== undefined && sex) {
    const key = `${sex}_${getAgeGroup(age)}`
    const stratified = nhanesRef.diversity.by_age_sex?.[key]?.[metric]
    if (stratified) return stratified
  }
  return nhanesRef.diversity.overall[metric]
}

function isStratified(metric: string, age?: number, sex?: string): boolean {
  if (age === undefined || !sex) return false
  const key = `${sex}_${getAgeGroup(age)}`
  return !!nhanesRef.diversity.by_age_sex?.[key]?.[metric]
}

function interpolatePercentile(value: number, table: PercentileTable): number {
  const entries = PERCENTILE_KEYS.map(p => ({
    pct: p,
    val: table[`p${p}`],
  })).filter(e => e.val !== undefined)

  if (entries.length === 0) return 50

  if (value <= entries[0].val) {
    return Math.max(1, Math.round(entries[0].pct * (value / entries[0].val)))
  }

  if (value >= entries[entries.length - 1].val) {
    return Math.min(99, entries[entries.length - 1].pct +
      Math.round((100 - entries[entries.length - 1].pct) * 0.5))
  }

  for (let i = 0; i < entries.length - 1; i++) {
    if (value >= entries[i].val && value <= entries[i + 1].val) {
      const range = entries[i + 1].val - entries[i].val
      if (range === 0) return entries[i].pct
      const fraction = (value - entries[i].val) / range
      return Math.round(entries[i].pct + fraction * (entries[i + 1].pct - entries[i].pct))
    }
  }

  return 50
}

function interpret(metric: string, percentile: number, groupLabel: string): string {
  const position = percentile >= 75 ? "well above" :
                   percentile >= 50 ? "above" :
                   percentile >= 25 ? "below" : "well below"

  const labels: Record<string, string> = {
    shannon: "Shannon diversity",
    observed_asvs: "observed species richness",
    simpson: "Inverse Simpson diversity",
    protective: "protective bacteria",
    pathogen: "periodontal pathogen burden",
  }

  const label = labels[metric] ?? metric
  const groupSuffix = groupLabel !== "all adults" ? ` for ${groupLabel}` : ""
  return `Your ${label} is ${position} the median${groupSuffix} (${percentile}th percentile).`
}

// ── Main scoring function ─────────────────────────────────────────────────────

export function scoreOralAgainstNHANES(input: OralNHANESInput): OralNHANESScore {
  const { age, sex } = input
  const groupLabel = age !== undefined && sex
    ? `${sex} aged ${getAgeGroupLabel(age)}`
    : "all adults"
  const stratified = age !== undefined && sex
    ? isStratified("shannon", age, sex)
    : false

  const metrics: Record<string, MetricResult> = {}
  const scores: { score: number; weight: number }[] = []

  // ── Diversity metrics ───────────────────────────────────────────────────

  const diversityMetrics: { key: keyof OralNHANESInput; refKey: string; weight: number }[] = [
    { key: "shannon",       refKey: "shannon",       weight: 35 },
    { key: "observed_asvs", refKey: "observed_asvs", weight: 15 },
    { key: "simpson",       refKey: "simpson",       weight: 0 },
  ]

  for (const m of diversityMetrics) {
    const value = input[m.key] as number | undefined
    if (value === undefined || value === null) continue

    const table = getDiversityTable(m.refKey, age, sex)
    if (!table) continue

    const percentile = interpolatePercentile(value, table)
    const score = Math.round(percentile)

    metrics[m.refKey] = {
      value,
      percentile,
      score,
      population_median: table.p50,
      population_p25: table.p25,
      population_p75: table.p75,
      interpretation: interpret(m.refKey, percentile, groupLabel),
    }

    if (m.weight > 0) {
      scores.push({ score, weight: m.weight })
    }
  }

  // ── Protective bacteria composite ──────────────────────────────────────

  const protectiveInputs: { key: keyof OralNHANESInput; genus: string }[] = [
    { key: "veillonella_pct", genus: "Veillonella" },
    { key: "rothia_pct",      genus: "Rothia" },
    { key: "neisseria_pct",   genus: "Neisseria" },
  ]

  const protectiveScores: number[] = []
  for (const p of protectiveInputs) {
    const value = input[p.key] as number | undefined
    if (value === undefined || value === null) continue
    const genusRef = nhanesRef.genera[p.genus]
    if (!genusRef?.percentiles) continue
    const fraction = value / 100
    const percentile = interpolatePercentile(fraction, genusRef.percentiles)
    protectiveScores.push(percentile)

    metrics[`protective_${p.genus.toLowerCase()}`] = {
      value,
      percentile,
      score: Math.round(percentile),
      population_median: genusRef.median_abundance * 100,
      interpretation: interpret("protective", percentile, groupLabel),
    }
  }

  if (protectiveScores.length > 0) {
    const avg = protectiveScores.reduce((a, b) => a + b, 0) / protectiveScores.length
    scores.push({ score: Math.round(avg), weight: 25 })
  }

  // ── Periodontal pathogens (inverted — lower is better) ─────────────────

  const pathogenInputs: { key: keyof OralNHANESInput; genus: string }[] = [
    { key: "porphyromonas_pct", genus: "Porphyromonas" },
    { key: "treponema_pct",     genus: "Treponema" },
    { key: "fusobacterium_pct", genus: "Fusobacterium" },
  ]

  const pathogenScores: number[] = []
  for (const p of pathogenInputs) {
    const value = input[p.key] as number | undefined
    if (value === undefined || value === null) continue
    const genusRef = nhanesRef.genera[p.genus]
    if (!genusRef?.percentiles) continue
    const fraction = value / 100
    const percentile = interpolatePercentile(fraction, genusRef.percentiles)
    const invertedPercentile = 100 - percentile
    pathogenScores.push(invertedPercentile)

    metrics[`pathogen_${p.genus.toLowerCase()}`] = {
      value,
      percentile,
      score: Math.round(invertedPercentile),
      population_median: genusRef.median_abundance * 100,
      interpretation: interpret("pathogen", invertedPercentile, groupLabel),
    }
  }

  if (pathogenScores.length > 0) {
    const avg = pathogenScores.reduce((a, b) => a + b, 0) / pathogenScores.length
    scores.push({ score: Math.round(avg), weight: 25 })
  }

  // ── Composite score ────────────────────────────────────────────────────

  let overall_score = 50
  let overall_percentile = 50

  if (scores.length > 0) {
    const totalWeight = scores.reduce((a, s) => a + s.weight, 0)
    overall_score = Math.round(
      scores.reduce((a, s) => a + s.score * (s.weight / totalWeight), 0)
    )
    overall_percentile = overall_score
  }

  // ── Summary ────────────────────────────────────────────────────────────

  const groupSuffix = groupLabel !== "all adults" ? ` for ${groupLabel}` : ""
  let summary: string
  if (overall_percentile >= 75) {
    summary = `Your oral microbiome diversity is stronger than most Americans${groupSuffix}.`
  } else if (overall_percentile >= 50) {
    summary = `Your oral microbiome sits near the population average${groupSuffix}.`
  } else if (overall_percentile >= 25) {
    summary = `Your oral diversity has room to improve${groupSuffix}. This is one of the most actionable signals in your biology.`
  } else {
    summary = `Your oral diversity is in the ${overall_percentile}th percentile${groupSuffix}. Targeted interventions can shift this.`
  }

  return {
    overall_score,
    overall_percentile,
    metrics,
    n_reference: nhanesRef.metadata.n_participants,
    age_sex_group: groupLabel,
    stratified,
    summary,
  }
}

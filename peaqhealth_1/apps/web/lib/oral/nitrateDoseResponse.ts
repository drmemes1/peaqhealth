// Dose-response calculator for dietary nitrate → systolic BP reduction
// Source: docs/clinical-evidence-base.md (Norouzzadeh 2025, Willmott 2023)

const MMHG_PER_MMOL_LOW = 0.24
const MMHG_PER_MMOL_HIGH = 0.48
const MMHG_PER_MMOL_MID = 0.35

export const NITRATE_MMOL_PER_SERVING: Record<string, { label: string; mmol: number }> = {
  leafy_greens_cup: { label: "1 cup leafy greens (spinach, arugula, kale)", mmol: 4 },
  romaine_cup: { label: "1 cup romaine", mmol: 1.5 },
  beet_medium: { label: "1 medium beet", mmol: 2.5 },
  beetroot_juice_250ml: { label: "250ml beetroot juice", mmol: 6 },
  mixed_salad_cup: { label: "1 cup mixed salad", mmol: 2 },
}

const DIETARY_FREQ_TO_SERVINGS: Record<string, number> = {
  rarely: 0.07,
  few_times_month: 0.14,
  several_weekly: 0.5,
  daily: 1,
  multiple_daily: 2,
}

function getCapacityModifier(nrCompositePct: number): number {
  if (nrCompositePct >= 25) return 1.0
  if (nrCompositePct >= 10) return 0.7
  if (nrCompositePct >= 5) return 0.5
  return 0.3
}

function getBaselineBpModifier(systolicBp: number | null): number {
  if (systolicBp == null) return 1.0
  if (systolicBp >= 140) return 1.4
  if (systolicBp >= 130) return 1.25
  if (systolicBp >= 120) return 1.1
  return 1.0
}

function getNrDescription(nrCompositePct: number): string {
  if (nrCompositePct >= 25) return "strong"
  if (nrCompositePct >= 10) return "moderate"
  return "limited"
}

export interface DoseResponseInput {
  nrCompositePct: number
  dietaryNitrateFrequency?: string | null
  proposedAdditionalServingsPerDay?: number
  servingType?: string
  systolicBp?: number | null
}

export interface DoseResponseResult {
  predictedSbpDropLow: number
  predictedSbpDropHigh: number
  predictedSbpDropMidpoint: number
  assumedNitrateMmolPerDay: number
  capacityModifier: number
  baselineBpModifier: number
  narrativeText: string
  confidenceLevel: "high" | "moderate" | "low"
  nrDescription: string
  currentServingsPerDay: number
}

export function computeDoseResponse(input: DoseResponseInput): DoseResponseResult {
  const additionalServings = input.proposedAdditionalServingsPerDay ?? 1
  const servingType = input.servingType ?? "leafy_greens_cup"
  const mmolPerServing = NITRATE_MMOL_PER_SERVING[servingType]?.mmol ?? 4
  const currentServingsPerDay = DIETARY_FREQ_TO_SERVINGS[input.dietaryNitrateFrequency ?? "rarely"] ?? 0.07

  const additionalMmolPerDay = additionalServings * mmolPerServing
  const capacityModifier = getCapacityModifier(input.nrCompositePct)
  const baselineBpModifier = getBaselineBpModifier(input.systolicBp ?? null)

  const predictedSbpDropLow = parseFloat((additionalMmolPerDay * MMHG_PER_MMOL_LOW * capacityModifier * baselineBpModifier).toFixed(1))
  const predictedSbpDropHigh = parseFloat((additionalMmolPerDay * MMHG_PER_MMOL_HIGH * capacityModifier * baselineBpModifier).toFixed(1))
  const predictedSbpDropMidpoint = parseFloat((additionalMmolPerDay * MMHG_PER_MMOL_MID * capacityModifier * baselineBpModifier).toFixed(1))

  const nrDescription = getNrDescription(input.nrCompositePct)

  let confidenceLevel: "high" | "moderate" | "low" = "low"
  if (input.nrCompositePct >= 25 && (input.systolicBp ?? 0) >= 130) confidenceLevel = "high"
  else if (input.nrCompositePct >= 10 && (input.systolicBp ?? 0) >= 120) confidenceLevel = "moderate"

  const bpContext = input.systolicBp != null
    ? ` and current systolic BP of ${input.systolicBp} mmHg`
    : ""

  const narrativeText = `Based on your ${nrDescription} nitrate-reducing capacity (composite ${input.nrCompositePct.toFixed(0)}%)${bpContext}, adding ${additionalServings === 1 ? "one daily serving" : `${additionalServings} daily servings`} of leafy greens is associated with an approximate ${predictedSbpDropLow}–${predictedSbpDropHigh} mmHg reduction in systolic blood pressure over 6–8 weeks in published research.`

  return {
    predictedSbpDropLow,
    predictedSbpDropHigh,
    predictedSbpDropMidpoint,
    assumedNitrateMmolPerDay: additionalMmolPerDay,
    capacityModifier,
    baselineBpModifier,
    narrativeText,
    confidenceLevel,
    nrDescription,
    currentServingsPerDay,
  }
}

export function dietaryFreqToServings(freq: string | null | undefined): number {
  return DIETARY_FREQ_TO_SERVINGS[freq ?? "rarely"] ?? 0.07
}

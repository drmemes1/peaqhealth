// Three-metric caries panel computation
// Runs after species columns are written to oral_kit_orders

export interface CariesPanelResult {
  phBalanceApi: number
  phBalanceCategory: string
  phBalanceConfidence: string
  cariogenicLoadPct: number
  cariogenicLoadCategory: string
  protectiveRatio: number | null
  protectiveRatioCategory: string
}

interface KitData {
  s_mutans_pct: number | null
  s_sobrinus_pct: number | null
  scardovia_pct: number | null
  lactobacillus_pct: number | null
  veillonella_pct: number | null
  neisseria_pct: number | null
  campylobacter_pct: number | null
  actinomyces_pct: number | null
  s_sanguinis_pct: number | null
  s_gordonii_pct: number | null
}

export function computeCariesPanel(kit: KitData): CariesPanelResult {
  const n = (v: number | null) => v ?? 0

  // ── pH Balance API ──
  const acidSum =
    1.0 * n(kit.lactobacillus_pct) +
    1.0 * n(kit.scardovia_pct) +
    0.3 * n(kit.actinomyces_pct) +
    1.0 * n(kit.s_mutans_pct) +
    1.0 * n(kit.s_sobrinus_pct)

  const bufferSum =
    1.0 * n(kit.veillonella_pct) +
    1.0 * n(kit.neisseria_pct) +
    1.0 * n(kit.campylobacter_pct) +
    1.0 * n(kit.s_sanguinis_pct) +
    1.0 * n(kit.s_gordonii_pct)

  const api = parseFloat((acidSum / (acidSum + bufferSum + 0.001)).toFixed(3))

  const phBalanceCategory =
    api <= 0.25 ? "well_buffered" :
    api <= 0.45 ? "mildly_acidogenic" :
    api <= 0.65 ? "moderately_acidogenic" :
    "strongly_acidogenic"

  const totalPhRelevant = acidSum + bufferSum
  const phBalanceConfidence =
    n(kit.lactobacillus_pct) > 1 || n(kit.veillonella_pct) > 3 ? "higher" :
    totalPhRelevant < 5 ? "insufficient_data" :
    "moderate"

  // ── Cariogenic Load Index ──
  const cli = parseFloat((
    n(kit.s_mutans_pct) + n(kit.s_sobrinus_pct) + n(kit.scardovia_pct) + n(kit.lactobacillus_pct)
  ).toFixed(3))

  const cariogenicLoadCategory =
    cli < 0.2 ? "minimal" :
    cli < 0.5 ? "low" :
    cli < 1.5 ? "elevated" :
    "high"

  // ── Protective Ratio ──
  const cavityMakers = n(kit.s_mutans_pct) + n(kit.s_sobrinus_pct)
  const protectors = n(kit.s_sanguinis_pct) + n(kit.s_gordonii_pct)

  let protectiveRatio: number | null = null
  let protectiveRatioCategory: string

  if (cavityMakers < 0.05) {
    protectiveRatioCategory = "no_cavity_makers"
  } else {
    protectiveRatio = parseFloat((protectors / (cavityMakers + 0.001)).toFixed(2))
    protectiveRatioCategory =
      protectiveRatio < 2 ? "weak" :
      protectiveRatio < 5 ? "moderate" :
      protectiveRatio < 15 ? "strong" :
      "very_strong"
  }

  return {
    phBalanceApi: api,
    phBalanceCategory,
    phBalanceConfidence,
    cariogenicLoadPct: cli,
    cariogenicLoadCategory,
    protectiveRatio,
    protectiveRatioCategory,
  }
}

export const PH_LABELS: Record<string, string> = {
  well_buffered: "Well-buffered",
  mildly_acidogenic: "Mildly acidogenic",
  moderately_acidogenic: "Moderately acidogenic",
  strongly_acidogenic: "Strongly acidogenic",
}

export const CLI_LABELS: Record<string, string> = {
  minimal: "Minimal",
  low: "Low",
  elevated: "Elevated",
  high: "High",
}

export const PR_LABELS: Record<string, string> = {
  no_cavity_makers: "No cavity-makers detected",
  weak: "Weak defense",
  moderate: "Moderate defense",
  strong: "Strong defense",
  very_strong: "Very strong defense",
}

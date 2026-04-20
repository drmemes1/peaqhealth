export interface OralKitInput {
  neisseria_pct: number | null
  rothia_pct: number | null
  actinomyces_pct: number | null
  haemophilus_pct: number | null
  veillonella_pct: number | null
  porphyromonas_pct: number | null
  fusobacterium_pct: number | null
  treponema_pct: number | null
  peptostreptococcus_pct: number | null
  s_mutans_pct: number | null
  s_sobrinus_pct: number | null
  lactobacillus_pct: number | null
  s_sanguinis_pct: number | null
  s_gordonii_pct: number | null
  shannon_diversity: number | null
}

export type AcidityLabel = "base-dominant" | "balanced" | "acid-leaning" | "acid-dominant"
export type EnvironmentPattern = "mouth_breathing" | "osa_paradox" | "balanced" | "mixed"

export interface EnvironmentIndex {
  acidogenic: number
  alkaligenic: number
  acidityRatio: number | null
  acidityLabel: AcidityLabel
  aerobicShift: number
  anaerobicLoad: number
  aerobicAnaerobicRatio: number | null
  pattern: EnvironmentPattern
}

export function computeClientEnvironmentIndex(kit: OralKitInput): EnvironmentIndex {
  const acidogenic =
    (kit.s_mutans_pct ?? 0) +
    (kit.s_sobrinus_pct ?? 0) +
    (kit.lactobacillus_pct ?? 0) +
    (kit.veillonella_pct ?? 0)

  const alkaligenic =
    (kit.s_sanguinis_pct ?? 0) +
    (kit.s_gordonii_pct ?? 0) +
    (kit.actinomyces_pct ?? 0)

  const acidityRatio = alkaligenic > 0 ? acidogenic / alkaligenic : null

  const acidityLabel: AcidityLabel =
    acidityRatio == null ? "balanced" :
    acidityRatio < 0.3 ? "base-dominant" :
    acidityRatio <= 0.6 ? "balanced" :
    acidityRatio <= 1.0 ? "acid-leaning" : "acid-dominant"

  const aerobicShift =
    (kit.rothia_pct ?? 0) +
    (kit.neisseria_pct ?? 0) +
    (kit.actinomyces_pct ?? 0)

  const anaerobicLoad =
    (kit.porphyromonas_pct ?? 0) +
    (kit.fusobacterium_pct ?? 0) +
    (kit.treponema_pct ?? 0) +
    (kit.peptostreptococcus_pct ?? 0)

  const aerobicAnaerobicRatio = anaerobicLoad > 0.01
    ? aerobicShift / anaerobicLoad
    : null

  let pattern: EnvironmentPattern
  if (aerobicShift > 18 && anaerobicLoad > 5) {
    pattern = "mouth_breathing"
  } else if (aerobicShift > 18 && anaerobicLoad < 3 && (aerobicAnaerobicRatio ?? 0) > 4) {
    pattern = "osa_paradox"
  } else if (aerobicShift < 18 && anaerobicLoad < 3) {
    pattern = "balanced"
  } else {
    pattern = "mixed"
  }

  return {
    acidogenic, alkaligenic, acidityRatio, acidityLabel,
    aerobicShift, anaerobicLoad, aerobicAnaerobicRatio,
    pattern,
  }
}

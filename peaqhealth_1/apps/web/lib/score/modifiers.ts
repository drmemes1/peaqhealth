/**
 * Cross-panel modifier system — bonuses and penalties
 * applied on top of the base score (blood + sleep + oral).
 * Capped between -10 and +8.
 */

export interface PanelInputs {
  // Sleep
  hrv_ms: number | null
  sleep_efficiency_pct: number | null
  deep_sleep_pct: number | null
  nights_available: number

  // Blood
  hsCRP: number | null
  lpA: number | null
  ldl: number | null
  glucose: number | null
  apoB: number | null

  // Oral
  periodontal_burden: number | null
  nitrate_reducer_pct: number | null
  shannon_diversity: number | null
  neuro_pathogen_pct: number | null
  prevotella_pct: number | null
  fusobacterium_pct: number | null

  // Panel availability
  has_sleep: boolean
  has_blood: boolean
  has_oral: boolean
  lifestyle_score: number | null
}

export interface Modifier {
  id: string
  panels: string[]
  direction: "penalty" | "bonus"
  points: number
  label: string
  rationale: string
}

export function calculateModifiers(inputs: PanelInputs): {
  modifiers: Modifier[]
  total: number
} {
  const modifiers: Modifier[] = []

  // ── PENALTIES ──────────────────────────────────────────────────────────────

  // Triple cardiovascular stack — check first, prevents double-penalizing
  if (
    inputs.periodontal_burden !== null && inputs.periodontal_burden > 0.5 &&
    inputs.hrv_ms !== null && inputs.hrv_ms < 40 &&
    inputs.lpA !== null && inputs.lpA >= 40
  ) {
    modifiers.push({
      id: "triple_cardio_risk",
      panels: ["oral", "sleep", "blood"],
      direction: "penalty",
      points: 5,
      label: "Triple cardiovascular signal",
      rationale: "Elevated periodontal burden, low HRV, and elevated Lp(a) compound cardiovascular risk beyond the sum of individual scores",
    })
  } else {
    // Oral + Blood: periodontal + hsCRP
    if (
      inputs.periodontal_burden !== null && inputs.periodontal_burden > 0.5 &&
      inputs.hsCRP !== null && inputs.hsCRP > 1.0
    ) {
      modifiers.push({
        id: "oral_systemic_inflammation",
        panels: ["oral", "blood"],
        direction: "penalty",
        points: 4,
        label: "Oral-systemic inflammation signal",
        rationale: "Elevated periodontal burden alongside hsCRP >1.0 suggests the oral-systemic inflammation axis is active",
      })
    }

    // Oral + Blood: periodontal + Lp(a)
    if (
      inputs.periodontal_burden !== null && inputs.periodontal_burden > 0.5 &&
      inputs.lpA !== null && inputs.lpA >= 40 &&
      !modifiers.find(m => m.id === "oral_systemic_inflammation")
    ) {
      modifiers.push({
        id: "oral_blood_lpa",
        panels: ["oral", "blood"],
        direction: "penalty",
        points: 3,
        label: "Periodontal burden alongside elevated Lp(a)",
        rationale: "Periodontal pathogens and Lp(a) both affect vascular health through overlapping pathways",
      })
    }

    // Oral + Sleep: low nitrate reducers + low HRV
    if (
      inputs.nitrate_reducer_pct !== null && inputs.nitrate_reducer_pct < 10 &&
      inputs.hrv_ms !== null && inputs.hrv_ms < 40
    ) {
      modifiers.push({
        id: "no_pathway_depleted",
        panels: ["oral", "sleep"],
        direction: "penalty",
        points: 3,
        label: "Nitric oxide pathway under pressure",
        rationale: "Low oral nitrate reducers and low HRV both reflect reduced nitric oxide availability",
      })
    }

    // Sleep + Blood: low HRV + poor efficiency + elevated glucose
    if (
      inputs.hrv_ms !== null && inputs.hrv_ms < 35 &&
      inputs.sleep_efficiency_pct !== null && inputs.sleep_efficiency_pct < 80 &&
      inputs.glucose !== null && inputs.glucose > 99
    ) {
      modifiers.push({
        id: "metabolic_autonomic_loop",
        panels: ["sleep", "blood"],
        direction: "penalty",
        points: 3,
        label: "Metabolic-autonomic dysfunction signal",
        rationale: "Low HRV, poor sleep efficiency, and elevated glucose suggest a compounding metabolic loop",
      })
    }
  }

  // Oral + Blood: low Shannon + elevated hsCRP
  if (
    inputs.shannon_diversity !== null && inputs.shannon_diversity < 2.5 &&
    inputs.hsCRP !== null && inputs.hsCRP > 1.0
  ) {
    modifiers.push({
      id: "dysbiosis_inflammation",
      panels: ["oral", "blood"],
      direction: "penalty",
      points: 2,
      label: "Low oral diversity alongside elevated inflammation",
      rationale: "Reduced oral microbiome diversity is associated with higher systemic inflammatory burden",
    })
  }

  // ── BONUSES ────────────────────────────────────────────────────────────────

  // Oral + Sleep: strong nitrate reducers + good HRV
  if (
    inputs.nitrate_reducer_pct !== null && inputs.nitrate_reducer_pct >= 20 &&
    inputs.hrv_ms !== null && inputs.hrv_ms >= 40
  ) {
    modifiers.push({
      id: "no_pathway_intact",
      panels: ["oral", "sleep"],
      direction: "bonus",
      points: 3,
      label: "Nitric oxide pathway working well",
      rationale: "Strong nitrate reducers and good HRV suggest the oral-to-systemic nitric oxide pathway is functioning optimally",
    })
  }

  // Sleep + Blood: deep sleep + low hsCRP
  if (
    inputs.deep_sleep_pct !== null && inputs.deep_sleep_pct >= 20 &&
    inputs.hsCRP !== null && inputs.hsCRP < 1.0
  ) {
    modifiers.push({
      id: "sleep_antiinflammatory",
      panels: ["sleep", "blood"],
      direction: "bonus",
      points: 2,
      label: "Deep sleep and low inflammation aligned",
      rationale: "Strong deep sleep and low hsCRP suggest effective overnight anti-inflammatory recovery",
    })
  }

  // Oral + Blood: high Shannon + low hsCRP
  if (
    inputs.shannon_diversity !== null && inputs.shannon_diversity >= 3.0 &&
    inputs.hsCRP !== null && inputs.hsCRP < 1.0
  ) {
    modifiers.push({
      id: "oral_systemic_resilience",
      panels: ["oral", "blood"],
      direction: "bonus",
      points: 2,
      label: "Oral microbiome resilience reflected systemically",
      rationale: "High oral diversity and low hsCRP suggest the oral microbiome is supporting systemic health",
    })
  }

  // All panels active bonus
  if (
    inputs.has_sleep && inputs.has_blood && inputs.has_oral &&
    inputs.nights_available >= 7
  ) {
    modifiers.push({
      id: "complete_picture",
      panels: ["sleep", "blood", "oral"],
      direction: "bonus",
      points: 3,
      label: "Complete longevity picture",
      rationale: "All three objective panels active with sufficient data",
    })
  }

  // Cap between -10 and +8
  const rawTotal = modifiers.reduce(
    (sum, m) => sum + (m.direction === "bonus" ? m.points : -m.points),
    0,
  )
  const total = Math.max(-10, Math.min(8, rawTotal))

  return { modifiers, total }
}

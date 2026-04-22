export interface MarkerDefinition {
  id: string
  panel: "oral" | "blood" | "sleep"
  category: string
  label: string
  shortLabel?: string
  question: string
  unit?: string
  scale: {
    min: string
    target: string
    max: string
    targetNumeric?: { low?: number; high?: number }
  }
  thresholds: {
    good: { min?: number; max?: number }
    watch: { min?: number; max?: number }
    concern: { min?: number; max?: number }
  }
  priority: 1 | 2 | 3
  commonlyMissed: boolean
  crossPanelConnections: string[]
  tier: "standard" | "pro"
  ctxPath: string
}

export type Verdict = "good" | "watch" | "concern" | "recheck" | "pending"

export function computeVerdict(value: number | null, marker: MarkerDefinition): Verdict {
  if (value == null) return "pending"
  const { good, watch, concern } = marker.thresholds
  if (good.min != null && good.max != null && value >= good.min && value <= good.max) return "good"
  if (good.min != null && good.max == null && value >= good.min) return "good"
  if (good.min == null && good.max != null && value <= good.max) return "good"
  if (concern.min != null && value >= concern.min) return "concern"
  if (concern.max != null && value <= concern.max) return "concern"
  if (watch.min != null || watch.max != null) {
    const aboveMin = watch.min == null || value >= watch.min
    const belowMax = watch.max == null || value <= watch.max
    if (aboveMin && belowMax) return "watch"
  }
  return "good"
}

export function computeScalePosition(value: number | null, marker: MarkerDefinition): number | null {
  if (value == null) return null
  const t = marker.scale.targetNumeric
  if (!t) return 50
  const low = t.low ?? 0
  const high = t.high ?? low * 2
  const range = high - low
  if (range === 0) return 50
  const pos = ((value - low) / range) * 50 + 25
  return Math.max(0, Math.min(100, pos))
}

export function getValueFromCtx(ctx: Record<string, unknown>, path: string): number | null {
  const parts = path.split(".")
  let current: unknown = ctx
  for (const part of parts) {
    if (current == null || typeof current !== "object") return null
    current = (current as Record<string, unknown>)[part]
  }
  if (current == null) return null
  const num = Number(current)
  return Number.isFinite(num) ? num : null
}

function m(
  id: string, panel: "oral" | "blood" | "sleep", category: string,
  label: string, question: string,
  opts: Partial<Omit<MarkerDefinition, "id" | "panel" | "category" | "label" | "question">> & { ctxPath: string }
): MarkerDefinition {
  return {
    id, panel, category, label, question,
    unit: opts.unit,
    shortLabel: opts.shortLabel,
    scale: opts.scale ?? { min: "—", target: "—", max: "—" },
    thresholds: opts.thresholds ?? { good: {}, watch: {}, concern: {} },
    priority: opts.priority ?? 3,
    commonlyMissed: opts.commonlyMissed ?? false,
    crossPanelConnections: opts.crossPanelConnections ?? [],
    tier: opts.tier ?? "standard",
    ctxPath: opts.ctxPath,
  }
}

// ── BLOOD MARKERS ──────────────────────────────────────────────────────────

const BLOOD: MarkerDefinition[] = [
  m("ldl", "blood", "heart", "LDL cholesterol", "Carries cholesterol to tissues. Higher levels associate with plaque buildup in arteries.", {
    shortLabel: "LDL", unit: "mg/dL", priority: 1, ctxPath: "bloodPanel.ldl",
    scale: { min: "<70", target: "Optimal <100", max: ">160 high", targetNumeric: { low: 0, high: 100 } },
    thresholds: { good: { max: 100 }, watch: { min: 100, max: 130 }, concern: { min: 130 } },
    crossPanelConnections: ["neisseria_pct", "hrv_rmssd"],
  }),
  m("hdl", "blood", "heart", "HDL cholesterol", "Removes excess cholesterol from your bloodstream — the cleanup crew.", {
    shortLabel: "HDL", unit: "mg/dL", priority: 1, ctxPath: "bloodPanel.hdl",
    scale: { min: "<40 low", target: "≥50 protective", max: ">90", targetNumeric: { low: 50, high: 90 } },
    thresholds: { good: { min: 50 }, watch: { min: 40, max: 50 }, concern: { max: 40 } },
  }),
  m("triglycerides", "blood", "heart", "Triglycerides", "Fat particles in your blood. Rise with sugar, alcohol, and short sleep.", {
    shortLabel: "TG", unit: "mg/dL", priority: 1, ctxPath: "bloodPanel.triglycerides",
    scale: { min: "<50", target: "Optimal <100", max: ">200 high", targetNumeric: { low: 0, high: 100 } },
    thresholds: { good: { max: 100 }, watch: { min: 100, max: 150 }, concern: { min: 150 } },
    crossPanelConnections: ["neisseria_pct"],
  }),
  m("total_cholesterol", "blood", "heart", "Total cholesterol", "Sum of LDL, HDL, and other lipoproteins. Context from LDL/HDL ratio matters more than the total.", {
    shortLabel: "Total chol", unit: "mg/dL", priority: 3, ctxPath: "bloodPanel.totalCholesterol",
    scale: { min: "<150", target: "<200", max: ">240 high", targetNumeric: { low: 0, high: 200 } },
    thresholds: { good: { max: 200 }, watch: { min: 200, max: 240 }, concern: { min: 240 } },
  }),
  m("hs_crp", "blood", "inflammation", "hs-CRP", "The primary inflammation marker. Connects your oral bacteria to systemic inflammation.", {
    shortLabel: "hs-CRP", unit: "mg/L", priority: 1, commonlyMissed: true, ctxPath: "bloodPanel.hsCrp",
    scale: { min: "<0.5 ideal", target: "<1.0 optimal", max: ">3.0 elevated", targetNumeric: { low: 0, high: 1.0 } },
    thresholds: { good: { max: 1.0 }, watch: { min: 1.0, max: 3.0 }, concern: { min: 3.0 } },
    crossPanelConnections: ["gum_health_total", "porphyromonas_pct"],
  }),
  m("hba1c", "blood", "metabolic", "HbA1c", "Your 90-day blood sugar average. Reflects how well your body manages glucose over time.", {
    shortLabel: "HbA1c", unit: "%", priority: 1, ctxPath: "bloodPanel.hba1c",
    scale: { min: "<5.0", target: "<5.7 normal", max: "≥6.5 clinical", targetNumeric: { low: 4.0, high: 5.7 } },
    thresholds: { good: { max: 5.7 }, watch: { min: 5.7, max: 6.5 }, concern: { min: 6.5 } },
    crossPanelConnections: ["cavity_bacteria_total", "sleep_duration"],
  }),
  m("glucose", "blood", "metabolic", "Fasting glucose", "Your blood sugar at the moment of the draw. Affected by sleep, stress, and last meal timing.", {
    shortLabel: "Glucose", unit: "mg/dL", priority: 1, ctxPath: "bloodPanel.glucose",
    scale: { min: "60", target: "70–99 normal", max: "≥126 clinical", targetNumeric: { low: 70, high: 99 } },
    thresholds: { good: { max: 99 }, watch: { min: 100, max: 126 }, concern: { min: 126 } },
    crossPanelConnections: ["hba1c", "sleep_duration"],
  }),
  m("wbc", "blood", "immune", "White blood cells", "Your immune system's army. Elevated when fighting infection or chronic inflammation.", {
    shortLabel: "WBC", unit: "K/µL", priority: 3, ctxPath: "bloodPanel.wbc",
    scale: { min: "<3.5 low", target: "4.5–11.0", max: ">11.0 elevated", targetNumeric: { low: 4.5, high: 11.0 } },
    thresholds: { good: { min: 4.5, max: 11.0 }, watch: { min: 3.5, max: 4.5 }, concern: { max: 3.5 } },
  }),
  m("hemoglobin", "blood", "oxygen", "Hemoglobin", "Carries oxygen in red blood cells. Low levels mean less oxygen delivery to tissues.", {
    shortLabel: "Hgb", unit: "g/dL", priority: 2, ctxPath: "bloodPanel.hemoglobin",
    scale: { min: "<12 low", target: "12–17 normal", max: ">17 high", targetNumeric: { low: 12, high: 17 } },
    thresholds: { good: { min: 12, max: 17 }, watch: { min: 10, max: 12 }, concern: { max: 10 } },
  }),
  m("hematocrit", "blood", "oxygen", "Hematocrit", "Percentage of blood that's red blood cells. Tracks with hemoglobin.", {
    shortLabel: "HCT", unit: "%", priority: 3, ctxPath: "bloodPanel.hematocrit",
    scale: { min: "<36 low", target: "36–50 normal", max: ">50 high", targetNumeric: { low: 36, high: 50 } },
    thresholds: { good: { min: 36, max: 50 }, watch: { min: 33, max: 36 }, concern: { max: 33 } },
  }),
  m("tsh", "blood", "thyroid", "TSH", "Thyroid-stimulating hormone. Controls your metabolic rate, energy, and heart rate.", {
    shortLabel: "TSH", unit: "µIU/mL", priority: 2, ctxPath: "bloodPanel.tsh",
    scale: { min: "<0.45 suppressed", target: "0.45–4.5", max: ">4.5 elevated", targetNumeric: { low: 0.45, high: 4.5 } },
    thresholds: { good: { min: 0.45, max: 4.5 }, watch: { min: 0.1, max: 0.45 }, concern: { max: 0.1 } },
    crossPanelConnections: ["hrv_rmssd"],
  }),
  m("free_t4", "blood", "thyroid", "Free T4", "Active thyroid hormone. Works with TSH to set your metabolic pace.", {
    shortLabel: "FT4", unit: "ng/dL", priority: 3, ctxPath: "bloodPanel.freeT4",
    scale: { min: "<0.8 low", target: "0.8–1.8", max: ">1.8 elevated", targetNumeric: { low: 0.8, high: 1.8 } },
    thresholds: { good: { min: 0.8, max: 1.8 }, watch: { min: 1.8, max: 2.5 }, concern: { min: 2.5 } },
  }),
  m("egfr", "blood", "kidney", "eGFR", "Estimates how well your kidneys filter blood. Lower is worse.", {
    shortLabel: "eGFR", unit: "mL/min", priority: 2, ctxPath: "bloodPanel.egfr",
    scale: { min: "<60 reduced", target: "≥90 normal", max: ">120", targetNumeric: { low: 90, high: 120 } },
    thresholds: { good: { min: 90 }, watch: { min: 60, max: 90 }, concern: { max: 60 } },
  }),
  m("creatinine", "blood", "kidney", "Creatinine", "Waste product filtered by kidneys. High levels suggest reduced kidney function.", {
    shortLabel: "Creat", unit: "mg/dL", priority: 3, ctxPath: "bloodPanel.creatinine",
    scale: { min: "<0.6", target: "0.6–1.2", max: ">1.4 elevated", targetNumeric: { low: 0.6, high: 1.2 } },
    thresholds: { good: { max: 1.2 }, watch: { min: 1.2, max: 1.4 }, concern: { min: 1.4 } },
  }),
  m("bun", "blood", "kidney", "BUN", "Blood urea nitrogen. Another kidney function marker. Also rises with dehydration.", {
    shortLabel: "BUN", unit: "mg/dL", priority: 3, ctxPath: "bloodPanel.bun",
    scale: { min: "<7 low", target: "7–20", max: ">20 elevated", targetNumeric: { low: 7, high: 20 } },
    thresholds: { good: { min: 7, max: 20 }, watch: { min: 20, max: 25 }, concern: { min: 25 } },
  }),
  m("alt", "blood", "liver", "ALT", "Liver enzyme. Elevated when liver cells are stressed or damaged.", {
    shortLabel: "ALT", unit: "U/L", priority: 2, ctxPath: "bloodPanel.alt",
    scale: { min: "0", target: "<35", max: ">56 elevated", targetNumeric: { low: 0, high: 35 } },
    thresholds: { good: { max: 35 }, watch: { min: 35, max: 56 }, concern: { min: 56 } },
  }),
  m("ast", "blood", "liver", "AST", "Liver and muscle enzyme. Works with ALT to paint the liver picture.", {
    shortLabel: "AST", unit: "U/L", priority: 3, ctxPath: "bloodPanel.ast",
    scale: { min: "0", target: "<35", max: ">56 elevated", targetNumeric: { low: 0, high: 35 } },
    thresholds: { good: { max: 35 }, watch: { min: 35, max: 56 }, concern: { min: 56 } },
  }),
  m("albumin", "blood", "liver", "Albumin", "Protein made by your liver. Low levels can signal chronic inflammation or malnutrition.", {
    shortLabel: "Alb", unit: "g/dL", priority: 3, ctxPath: "bloodPanel.albumin",
    scale: { min: "<3.5 low", target: "3.5–5.0", max: ">5.5", targetNumeric: { low: 3.5, high: 5.0 } },
    thresholds: { good: { min: 3.5 }, watch: { min: 3.0, max: 3.5 }, concern: { max: 3.0 } },
  }),
  m("vitamin_d", "blood", "vitamins", "Vitamin D", "Affects bone health, immune function, and mood. Most people are below optimal.", {
    shortLabel: "Vit D", unit: "ng/mL", priority: 1, ctxPath: "bloodPanel.vitaminD",
    scale: { min: "<20 deficient", target: "40–80 optimal", max: ">100 excess", targetNumeric: { low: 40, high: 80 } },
    thresholds: { good: { min: 30 }, watch: { min: 20, max: 30 }, concern: { max: 20 } },
    crossPanelConnections: ["sleep_duration"],
  }),
  m("ferritin", "blood", "vitamins", "Ferritin", "Iron stored in your body. Low ferritin means low iron reserves even if hemoglobin is normal.", {
    shortLabel: "Ferritin", unit: "ng/mL", priority: 2, ctxPath: "bloodPanel.ferritin",
    scale: { min: "<20 low", target: "30–200", max: ">300 elevated", targetNumeric: { low: 30, high: 200 } },
    thresholds: { good: { min: 30, max: 200 }, watch: { min: 15, max: 30 }, concern: { max: 15 } },
  }),
  m("vitamin_b12", "blood", "vitamins", "Vitamin B12", "Essential for nerve function and red blood cell production.", {
    shortLabel: "B12", unit: "pg/mL", priority: 3, ctxPath: "bloodPanel.vitaminB12",
    scale: { min: "<200 low", target: "300–900", max: ">1000", targetNumeric: { low: 300, high: 900 } },
    thresholds: { good: { min: 300 }, watch: { min: 200, max: 300 }, concern: { max: 200 } },
  }),
  m("sodium", "blood", "electrolytes", "Sodium", "Regulates fluid balance and blood pressure.", {
    shortLabel: "Na", unit: "mmol/L", priority: 3, ctxPath: "bloodPanel.sodium",
    scale: { min: "<136 low", target: "136–145", max: ">145 high", targetNumeric: { low: 136, high: 145 } },
    thresholds: { good: { min: 136, max: 145 }, watch: { min: 133, max: 136 }, concern: { max: 133 } },
  }),
  m("potassium", "blood", "electrolytes", "Potassium", "Critical for heart rhythm and muscle function.", {
    shortLabel: "K", unit: "mmol/L", priority: 3, ctxPath: "bloodPanel.potassium",
    scale: { min: "<3.5 low", target: "3.5–5.0", max: ">5.5 high", targetNumeric: { low: 3.5, high: 5.0 } },
    thresholds: { good: { min: 3.5, max: 5.0 }, watch: { min: 5.0, max: 5.5 }, concern: { min: 5.5 } },
  }),
  m("platelets", "blood", "hematologic", "Platelets", "Cell fragments that help blood clot. Too few or too many can signal issues.", {
    shortLabel: "PLT", unit: "K/µL", priority: 3, ctxPath: "bloodPanel.platelets",
    scale: { min: "<150 low", target: "150–400", max: ">400 high", targetNumeric: { low: 150, high: 400 } },
    thresholds: { good: { min: 150, max: 400 }, watch: { min: 100, max: 150 }, concern: { max: 100 } },
  }),
  m("rdw", "blood", "hematologic", "RDW", "Red cell distribution width. High values suggest variation in red blood cell size.", {
    shortLabel: "RDW", unit: "%", priority: 3, ctxPath: "bloodPanel.rdw",
    scale: { min: "11", target: "11.5–14.5", max: ">15 elevated", targetNumeric: { low: 11.5, high: 14.5 } },
    thresholds: { good: { max: 14.5 }, watch: { min: 14.5, max: 16 }, concern: { min: 16 } },
  }),
]

// ── ORAL MARKERS ───────────────────────────────────────────────────────────

const ORAL: MarkerDefinition[] = [
  // NO pathway
  m("neisseria_pct", "oral", "nitric_oxide", "Neisseria", "Primary bacteria converting dietary nitrate into nitric oxide — the signal that helps blood vessels relax.", {
    shortLabel: "Neisseria", unit: "%", priority: 1, ctxPath: "oralKit.neisseriaPct",
    scale: { min: "<2%", target: "10–13%", max: ">20%", targetNumeric: { low: 10, high: 13 } },
    thresholds: { good: { min: 8 }, watch: { min: 4, max: 8 }, concern: { max: 4 } },
    crossPanelConnections: ["ldl", "hrv_rmssd"],
  }),
  m("rothia_pct", "oral", "nitric_oxide", "Rothia", "Secondary nitrate reducer. Supports nitric oxide production alongside Neisseria.", {
    shortLabel: "Rothia", unit: "%", priority: 2, ctxPath: "oralKit.rothiaPct",
    scale: { min: "<1%", target: "3–10%", max: ">15%", targetNumeric: { low: 3, high: 10 } },
    thresholds: { good: { min: 3 }, watch: { min: 1, max: 3 }, concern: { max: 1 } },
  }),
  m("haemophilus_pct", "oral", "nitric_oxide", "Haemophilus", "Nitrate reducer linked to blood sugar regulation.", {
    shortLabel: "Haemophilus", unit: "%", priority: 2, ctxPath: "oralKit.haemophilusPct",
    scale: { min: "<1%", target: "≥4%", max: ">15%", targetNumeric: { low: 4, high: 15 } },
    thresholds: { good: { min: 4 }, watch: { min: 2, max: 4 }, concern: { max: 2 } },
    crossPanelConnections: ["hba1c", "glucose"],
  }),
  m("actinomyces_pct", "oral", "nitric_oxide", "Actinomyces", "Mild acid producer that also contributes to nitrate reduction.", {
    shortLabel: "Actinomyces", unit: "%", priority: 3, ctxPath: "oralKit.actinomycesPct",
    scale: { min: "<1%", target: "3–10%", max: ">15%", targetNumeric: { low: 3, high: 10 } },
    thresholds: { good: { min: 3 }, watch: { min: 1, max: 3 }, concern: { max: 1 } },
  }),
  m("veillonella_pct", "oral", "nitric_oxide", "Veillonella", "Lactate consumer that buffers acid and supports the NO pathway.", {
    shortLabel: "Veillonella", unit: "%", priority: 3, ctxPath: "oralKit.veillonellaPct",
    scale: { min: "<0.5%", target: "1–5%", max: ">10%", targetNumeric: { low: 1, high: 5 } },
    thresholds: { good: { min: 1 }, watch: { min: 0.3, max: 1 }, concern: { max: 0.3 } },
  }),
  // Gum health
  m("fusobacterium_pct", "oral", "gum_health", "Fusobacterium", "Lives in gaps between teeth and gums. Bridges early and late-stage gum bacteria.", {
    shortLabel: "Fuso", unit: "%", priority: 2, ctxPath: "oralKit.fusobacteriumPct",
    scale: { min: "0", target: "<0.5%", max: ">3% elevated", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 2 }, concern: { min: 2 } },
    crossPanelConnections: ["hs_crp"],
  }),
  m("aggregatibacter_pct", "oral", "gum_health", "Aggregatibacter", "Gum bacteria associated with early-stage tissue changes.", {
    shortLabel: "Agg", unit: "%", priority: 2, ctxPath: "oralKit.aggregatibacterPct",
    scale: { min: "0", target: "<0.5%", max: ">2% elevated", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 1.5 }, concern: { min: 1.5 } },
  }),
  m("campylobacter_pct", "oral", "gum_health", "Campylobacter", "Anaerobic gum bacteria that thrives in deeper pockets.", {
    shortLabel: "Camp", unit: "%", priority: 3, ctxPath: "oralKit.campylobacterPct",
    scale: { min: "0", target: "<0.5%", max: ">2%", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 1.5 }, concern: { min: 1.5 } },
  }),
  m("porphyromonas_pct", "oral", "gum_health", "Porphyromonas", "Red complex bacteria. The most studied gum-linked species.", {
    shortLabel: "Porph", unit: "%", priority: 1, ctxPath: "oralKit.porphyromonasPct",
    scale: { min: "0", target: "<0.5%", max: ">2% elevated", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 2 }, concern: { min: 2 } },
    crossPanelConnections: ["hs_crp"],
  }),
  m("tannerella_pct", "oral", "gum_health", "Tannerella", "Red complex bacteria found alongside Porphyromonas in deeper pockets.", {
    shortLabel: "Tann", unit: "%", priority: 2, ctxPath: "oralKit.tannerellaPct",
    scale: { min: "0", target: "<0.5%", max: ">1%", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 1 }, concern: { min: 1 } },
    crossPanelConnections: ["ldl"],
  }),
  m("treponema_pct", "oral", "gum_health", "Treponema", "Spiral-shaped red complex bacteria. Marker of deep-pocket activity.", {
    shortLabel: "Trep", unit: "%", priority: 3, ctxPath: "oralKit.treponemaPct",
    scale: { min: "0", target: "<0.5%", max: ">1%", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 1 }, concern: { min: 1 } },
  }),
  m("p_intermedia_pct", "oral", "gum_health", "P. intermedia", "Orange complex species. One of the Prevotella species linked to gum changes.", {
    shortLabel: "P. int", unit: "%", priority: 3, ctxPath: "oralKit.pIntermediaPct",
    scale: { min: "0", target: "<0.5%", max: ">1%", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 1 }, concern: { min: 1 } },
  }),
  // Cavity
  m("s_mutans_pct", "oral", "cavity", "S. mutans", "The primary cavity-causing bacteria. Produces acid that wears down enamel.", {
    shortLabel: "S. mutans", unit: "%", priority: 1, ctxPath: "oralKit.sMutansPct",
    scale: { min: "0", target: "<0.5%", max: ">2% elevated", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 1.5 }, concern: { min: 1.5 } },
    crossPanelConnections: ["hba1c", "glucose"],
  }),
  m("s_sobrinus_pct", "oral", "cavity", "S. sobrinus", "Works alongside S. mutans. Even more acidogenic in some studies.", {
    shortLabel: "S. sobrinus", unit: "%", priority: 2, ctxPath: "oralKit.sSobrinusPct",
    scale: { min: "0", target: "<0.5%", max: ">1%", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 1 }, concern: { min: 1 } },
  }),
  m("lactobacillus_pct", "oral", "cavity", "Lactobacillus", "Acid-producing bacteria that thrive in already-acidic environments.", {
    shortLabel: "Lacto", unit: "%", priority: 2, ctxPath: "oralKit.lactobacillusPct",
    scale: { min: "0", target: "<0.1%", max: ">1%", targetNumeric: { low: 0, high: 0.1 } },
    thresholds: { good: { max: 0.1 }, watch: { min: 0.1, max: 0.5 }, concern: { min: 0.5 } },
  }),
  // Protective
  m("s_sanguinis_pct", "oral", "protective", "S. sanguinis", "Produces hydrogen peroxide that directly competes with cavity-causing bacteria.", {
    shortLabel: "S. sanguinis", unit: "%", priority: 1, ctxPath: "oralKit.sSanguinisPct",
    scale: { min: "<0.5%", target: "≥1.5%", max: ">5%", targetNumeric: { low: 1.5, high: 5 } },
    thresholds: { good: { min: 1.5 }, watch: { min: 0.5, max: 1.5 }, concern: { max: 0.5 } },
  }),
  m("s_gordonii_pct", "oral", "protective", "S. gordonii", "Alkali producer that raises local pH — the opposite of what cavity-makers do.", {
    shortLabel: "S. gordonii", unit: "%", priority: 2, ctxPath: "oralKit.sGordoniiPct",
    scale: { min: "0", target: "≥0.3%", max: ">2%", targetNumeric: { low: 0.3, high: 2 } },
    thresholds: { good: { min: 0.3 }, watch: { min: 0.1, max: 0.3 }, concern: { max: 0.1 } },
  }),
  m("s_salivarius_pct", "oral", "protective", "S. salivarius", "Harmless, helpful streptococcus. Produces bacteriocins that suppress bad bacteria.", {
    shortLabel: "S. salivarius", unit: "%", priority: 3, ctxPath: "oralKit.sSalivariusPct",
    scale: { min: "<1%", target: "5–20%", max: ">25%", targetNumeric: { low: 5, high: 20 } },
    thresholds: { good: { min: 3 }, watch: { min: 1, max: 3 }, concern: { max: 1 } },
  }),
  // Aggregates
  m("shannon_diversity", "oral", "diversity", "Shannon diversity index", "Measures how many bacterial species you have and how evenly they're distributed.", {
    shortLabel: "Shannon", priority: 1, ctxPath: "oralKit.shannonIndex",
    scale: { min: "<3.0 low", target: "4.0–5.5 healthy", max: ">6.5", targetNumeric: { low: 4.0, high: 5.5 } },
    thresholds: { good: { min: 4.0 }, watch: { min: 3.0, max: 4.0 }, concern: { max: 3.0 } },
  }),
  m("no_total", "oral", "nitric_oxide", "NO pathway total", "Combined nitrate-reducing bacteria — Neisseria, Rothia, Haemophilus, Actinomyces, Veillonella.", {
    shortLabel: "NO total", unit: "%", priority: 1, ctxPath: "oralKit.nitricOxideTotal",
    scale: { min: "<10%", target: "20–35%", max: ">40%", targetNumeric: { low: 20, high: 35 } },
    thresholds: { good: { min: 20 }, watch: { min: 10, max: 20 }, concern: { max: 10 } },
    crossPanelConnections: ["ldl", "triglycerides"],
  }),
  m("gum_health_total", "oral", "gum_health", "Gum bacteria total", "Combined gum-associated bacteria across red and orange complexes.", {
    shortLabel: "Gum total", unit: "%", priority: 1, ctxPath: "oralKit.gumHealthTotal",
    scale: { min: "0", target: "<2%", max: ">5% elevated", targetNumeric: { low: 0, high: 2 } },
    thresholds: { good: { max: 2 }, watch: { min: 2, max: 5 }, concern: { min: 5 } },
    crossPanelConnections: ["hs_crp"],
  }),
  m("cavity_bacteria_total", "oral", "cavity", "Cavity bacteria total", "S. mutans + S. sobrinus + Lactobacillus — the acid-producing species.", {
    shortLabel: "Cavity risk", unit: "%", priority: 1, ctxPath: "oralKit.cavityBacteriaTotal",
    scale: { min: "0", target: "<0.5%", max: ">2% elevated", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 1.5 }, concern: { min: 1.5 } },
    crossPanelConnections: ["hba1c", "glucose"],
  }),
  m("cavity_protectors_total", "oral", "protective", "Cavity protectors total", "S. sanguinis + S. gordonii — bacteria that compete with cavity-makers.", {
    shortLabel: "Protectors", unit: "%", priority: 2, ctxPath: "oralKit.cavityProtectorsTotal",
    scale: { min: "<0.5%", target: "≥2%", max: ">5%", targetNumeric: { low: 2, high: 5 } },
    thresholds: { good: { min: 2 }, watch: { min: 1, max: 2 }, concern: { max: 1 } },
  }),
  // Caries panel metrics
  m("ph_balance_api", "oral", "caries_panel", "pH balance", "The acid-base balance of your oral environment. Lower means more acid producers, higher means more buffers.", {
    shortLabel: "pH balance", priority: 1, ctxPath: "oralKit.phBalanceApi",
    scale: { min: "0 (all buffer)", target: "≤0.25 well-buffered", max: "1.0 (all acid)", targetNumeric: { low: 0, high: 0.25 } },
    thresholds: { good: { max: 0.25 }, watch: { min: 0.25, max: 0.65 }, concern: { min: 0.65 } },
  }),
  m("cariogenic_load", "oral", "caries_panel", "Cariogenic load", "Total cavity-causing bacteria including Scardovia. A broader measure than cavity bacteria alone.", {
    shortLabel: "Cariogenic", unit: "%", priority: 1, ctxPath: "oralKit.cariogenicLoadPct",
    scale: { min: "0", target: "<0.5% low", max: ">1.5% high", targetNumeric: { low: 0, high: 0.5 } },
    thresholds: { good: { max: 0.5 }, watch: { min: 0.5, max: 1.5 }, concern: { min: 1.5 } },
  }),
  m("protective_ratio", "oral", "caries_panel", "Protective ratio", "How well your protective bacteria outnumber cavity-makers. Higher is better.", {
    shortLabel: "Protection", unit: "×", priority: 1, ctxPath: "oralKit.protectiveRatio",
    scale: { min: "<2× weak", target: "5–15× strong", max: ">15× very strong", targetNumeric: { low: 5, high: 15 } },
    thresholds: { good: { min: 5 }, watch: { min: 2, max: 5 }, concern: { max: 2 } },
  }),
]

// ── SLEEP MARKERS ──────────────────────────────────────────────────────────

const SLEEP: MarkerDefinition[] = [
  m("sleep_duration", "sleep", "architecture", "Sleep duration", "Total time asleep per night. 7–9 hours is associated with the best health outcomes.", {
    shortLabel: "Duration", unit: "hrs", priority: 1, ctxPath: "sleepData.totalSleepMin",
    scale: { min: "<5 hrs", target: "7–9 hrs", max: ">10 hrs", targetNumeric: { low: 420, high: 540 } },
    thresholds: { good: { min: 420, max: 600 }, watch: { min: 360, max: 420 }, concern: { max: 360 } },
    crossPanelConnections: ["hba1c", "glucose"],
  }),
  m("deep_sleep", "sleep", "architecture", "Deep sleep", "Slow-wave sleep. When your body repairs tissue, consolidates memory, and restores HRV.", {
    shortLabel: "Deep", unit: "min", priority: 1, ctxPath: "sleepData.deepSleepMin",
    scale: { min: "<30 min", target: "60–110 min", max: ">120 min", targetNumeric: { low: 60, high: 110 } },
    thresholds: { good: { min: 45 }, watch: { min: 30, max: 45 }, concern: { max: 30 } },
  }),
  m("sleep_efficiency", "sleep", "quality", "Sleep efficiency", "Percentage of time in bed that you're actually asleep.", {
    shortLabel: "Efficiency", unit: "%", priority: 2, ctxPath: "sleepData.sleepEfficiency",
    scale: { min: "<75%", target: "85–95%", max: ">98%", targetNumeric: { low: 85, high: 95 } },
    thresholds: { good: { min: 85 }, watch: { min: 75, max: 85 }, concern: { max: 75 } },
  }),
  m("hrv_rmssd", "sleep", "recovery", "Heart rate variability", "Measures your nervous system's flexibility. Higher means better recovery capacity.", {
    shortLabel: "HRV", unit: "ms", priority: 1, ctxPath: "sleepData.hrvRmssd",
    scale: { min: "<20 ms low", target: "40–80 ms", max: ">100 ms high", targetNumeric: { low: 40, high: 80 } },
    thresholds: { good: { min: 30 }, watch: { min: 20, max: 30 }, concern: { max: 20 } },
    crossPanelConnections: ["ldl", "tsh", "neisseria_pct"],
  }),
  m("resting_hr", "sleep", "recovery", "Resting heart rate", "Your heart rate during sleep. Lower generally reflects better cardiovascular fitness.", {
    shortLabel: "RHR", unit: "bpm", priority: 2, ctxPath: "sleepData.restingHr",
    scale: { min: "<45 athletic", target: "50–65", max: ">80 elevated", targetNumeric: { low: 50, high: 65 } },
    thresholds: { good: { max: 65 }, watch: { min: 65, max: 80 }, concern: { min: 80 } },
  }),
  m("spo2_avg", "sleep", "breathing", "Blood oxygen (SpO₂)", "Average overnight blood oxygen. Dips below 94% can signal breathing disruption.", {
    shortLabel: "SpO₂", unit: "%", priority: 2, ctxPath: "sleepData.spo2Avg",
    scale: { min: "<90% low", target: "95–99%", max: "100%", targetNumeric: { low: 95, high: 99 } },
    thresholds: { good: { min: 95 }, watch: { min: 92, max: 95 }, concern: { max: 92 } },
  }),
  m("breathing_rate", "sleep", "breathing", "Breathing rate", "Breaths per minute during sleep. Elevated rates can reflect stress or airway issues.", {
    shortLabel: "RR", unit: "bpm", priority: 3, ctxPath: "sleepData.breathingRateAvg",
    scale: { min: "<10", target: "12–18", max: ">20 elevated", targetNumeric: { low: 12, high: 18 } },
    thresholds: { good: { min: 10, max: 18 }, watch: { min: 18, max: 22 }, concern: { min: 22 } },
  }),
  m("nights_tracked", "sleep", "coverage", "Nights tracked", "Number of nights with wearable data in the last 30 days.", {
    shortLabel: "Nights", priority: 3, ctxPath: "sleepData.nightsCount",
    scale: { min: "1", target: "14–30", max: "30", targetNumeric: { low: 14, high: 30 } },
    thresholds: { good: { min: 14 }, watch: { min: 7, max: 14 }, concern: { max: 7 } },
  }),
]

// ── EXPORT ──────────────────────────────────────────────────────────────────

const allMarkers = [...BLOOD, ...ORAL, ...SLEEP]

export const MARKERS: Record<string, MarkerDefinition> = Object.fromEntries(
  allMarkers.map(marker => [marker.id, marker])
)

export const MARKERS_BY_PANEL: Record<string, MarkerDefinition[]> = {
  blood: BLOOD,
  oral: ORAL,
  sleep: SLEEP,
}

export function getRelevantMarkers(ctx: Record<string, unknown>): string[] {
  return allMarkers
    .filter(marker => getValueFromCtx(ctx, marker.ctxPath) != null)
    .map(marker => marker.id)
}

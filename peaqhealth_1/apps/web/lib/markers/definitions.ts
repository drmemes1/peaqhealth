export interface MarkerThreshold {
  min?: number
  max?: number
  label: string
  color: 'green' | 'amber' | 'red'
}

export interface MarkerFood {
  name: string
  why: string
}

export interface MarkerSupplement {
  name: string
  why: string
  strength: 'strong' | 'moderate' | 'emerging'
}

export interface MarkerMissingState {
  headline: string
  body: string
  cta: string
  cta_sub?: string
  urgency: 'high' | 'medium' | 'low'
}

export interface MarkerDef {
  id: string
  label: string
  fullName: string
  unit: string
  panel: 'blood' | 'sleep' | 'oral'
  dot_id: string
  thresholds: MarkerThreshold[]
  db_column: string
  related_articles: string[]
  foods: MarkerFood[]
  supplements: MarkerSupplement[]
  why_it_matters: string
  missing_state: MarkerMissingState
  higher_is_better?: boolean
}

export const MARKER_DEFINITIONS: Record<string, MarkerDef> = {

  hs_crp: {
    id: 'hs_crp',
    label: 'hs-CRP',
    fullName: 'High-Sensitivity C-Reactive Protein',
    unit: 'mg/L',
    panel: 'blood',
    dot_id: 'inflammation',
    thresholds: [
      { max: 1.0, label: 'Optimal', color: 'green' },
      { max: 3.0, label: 'Moderate', color: 'amber' },
      { min: 3.0, label: 'High', color: 'red' },
    ],
    db_column: 'hs_crp_mgl',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Fatty fish (salmon, sardines, mackerel)', why: 'Omega-3 EPA/DHA directly suppresses the NF-kB inflammatory pathway that produces CRP' },
      { name: 'Extra virgin olive oil', why: 'Oleocanthal has a similar anti-inflammatory mechanism to ibuprofen at culinary doses' },
      { name: 'Leafy greens (spinach, arugula, kale)', why: 'Nitrate feeds the oral bacteria that produce nitric oxide — a natural anti-inflammatory' },
      { name: 'Turmeric with black pepper', why: 'Curcumin reduces CRP in multiple RCTs; black pepper increases bioavailability 2000%' },
      { name: 'Blueberries and mixed berries', why: 'Anthocyanins reduce CRP and IL-6 in controlled feeding studies' },
    ],
    supplements: [
      { name: 'Omega-3 (2g EPA/DHA daily)', why: 'Strongest evidence — multiple meta-analyses confirm CRP reduction. Take with food.', strength: 'strong' },
      { name: 'Curcumin (500mg, phospholipid form)', why: 'Standard curcumin has poor absorption. Theracurmin or Meriva forms have RCT evidence for CRP reduction.', strength: 'strong' },
      { name: 'Vitamin D (if deficient)', why: 'Correcting deficiency reduces CRP — but only beneficial if below 30 ng/mL. Check your vitamin D first.', strength: 'moderate' },
    ],
    why_it_matters: `hs-CRP is your body's real-time readout of systemic inflammation. Your liver produces it whenever your immune system is on alert — from an injury, an infection, or something more chronic like gum disease or disrupted sleep.\n\nThe high-sensitivity version detects levels as low as 0.1 mg/L. That precision matters because the range linked to cardiovascular disease and accelerated biological aging — 1 to 3 mg/L — is well below what a standard CRP test would even report.\n\nhs-CRP is one of the nine markers in the PhenoAge biological age formula. When elevated, it directly adds years to your Peaq Age. It is also one of the most responsive markers to lifestyle change — most people can move it meaningfully within 4 to 8 weeks.`,
    missing_state: {
      headline: 'hs-CRP is not on your current panel',
      body: 'Standard CRP misses the range that matters most for cardiovascular risk and biological age — it only catches large inflammatory events. hs-CRP measures 10x more precisely and captures the chronic low-grade inflammation that drives aging. Without it, your PhenoAge calculation is incomplete and three Peaq cross-panel connections cannot fire.',
      cta: 'Request hs-CRP at your next blood draw',
      cta_sub: '~$15 add-on at Quest Diagnostics or LabCorp. Ask specifically for "high-sensitivity CRP" — standard CRP cannot substitute.',
      urgency: 'high',
    },
  },

  ldl: {
    id: 'ldl',
    label: 'LDL Cholesterol',
    fullName: 'Low-Density Lipoprotein Cholesterol',
    unit: 'mg/dL',
    panel: 'blood',
    dot_id: 'cholesterol',
    thresholds: [
      { max: 100, label: 'Optimal', color: 'green' },
      { max: 130, label: 'Watch', color: 'amber' },
      { min: 130, label: 'Elevated', color: 'red' },
    ],
    db_column: 'ldl_mgdl',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Oats and barley', why: 'Beta-glucan fiber binds LDL in the gut and prevents reabsorption' },
      { name: 'Fatty fish (salmon, sardines)', why: 'Omega-3 lowers triglycerides and reduces LDL particle oxidation' },
      { name: 'Almonds and walnuts', why: 'Plant sterols and unsaturated fats both independently reduce LDL' },
      { name: 'Legumes (lentils, black beans)', why: 'Soluble fiber + plant protein combination reduces LDL meaningfully' },
      { name: 'Extra virgin olive oil (instead of butter)', why: 'Replacing saturated fat with monounsaturated fat reduces LDL without lowering HDL' },
    ],
    supplements: [
      { name: 'Omega-3 (2-4g EPA/DHA daily)', why: 'Reduces LDL particle oxidation and triglycerides', strength: 'strong' },
      { name: 'Psyllium husk (10g daily)', why: 'Soluble fiber with consistent evidence for modest LDL reduction', strength: 'strong' },
      { name: 'Berberine (500mg twice daily)', why: 'Activates AMPK pathway — LDL reduction comparable to low-dose statin in small RCTs', strength: 'moderate' },
    ],
    why_it_matters: `LDL carries cholesterol through your bloodstream. When elevated, LDL particles can penetrate artery walls and become oxidized — the first step in arterial plaque formation.\n\nThe number alone tells an incomplete story. Nitric oxide — produced partly by your oral bacteria — prevents LDL from penetrating and oxidizing inside artery walls. A statin manages how much LDL is in your blood. Your oral microbiome determines how much damage that LDL can do.\n\nThis is why Peaq looks at LDL alongside your oral bacteria, not just in isolation.`,
    missing_state: {
      headline: 'LDL not found on your panel',
      body: 'LDL is included in a standard lipid panel at any lab. If your most recent upload did not include it, it may be in a different document.',
      cta: 'Upload a panel that includes a lipid profile',
      urgency: 'medium',
    },
  },

  vitamin_d: {
    id: 'vitamin_d',
    label: 'Vitamin D',
    fullName: 'Vitamin D (25-hydroxyvitamin D)',
    unit: 'ng/mL',
    panel: 'blood',
    dot_id: 'vitamin_levels',
    higher_is_better: true,
    thresholds: [
      { max: 30, label: 'Deficient', color: 'red' },
      { max: 50, label: 'Insufficient', color: 'amber' },
      { min: 50, label: 'Optimal', color: 'green' },
    ],
    db_column: 'vitamin_d_ngml',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Fatty fish (salmon, mackerel, sardines)', why: 'Best dietary source — 3oz salmon provides ~450-600 IU' },
      { name: 'Egg yolks (pasture-raised)', why: 'Pasture-raised hens have measurably higher vitamin D than conventional' },
      { name: 'Mushrooms (UV-exposed)', why: 'UV-exposed mushrooms generate D2 — look for "UV-treated" on label' },
    ],
    supplements: [
      { name: 'Vitamin D3 (2000-5000 IU daily)', why: 'D3 raises serum levels more effectively than D2. Take with food containing fat.', strength: 'strong' },
      { name: 'Vitamin K2 (100mcg) alongside D3', why: 'K2 directs calcium to bones rather than arteries when D3 supplementation is used', strength: 'moderate' },
      { name: 'Magnesium (300mg glycinate)', why: 'Required cofactor for vitamin D activation — deficiency limits D3 effectiveness', strength: 'moderate' },
    ],
    why_it_matters: `Vitamin D is not just a bone mineral. Vitamin D receptors are present in nearly every tissue in your body — immune cells, oral tissues, brain, and heart.\n\nDeficiency is widespread — roughly 40% of US adults have insufficient levels despite sun exposure. Below 30 ng/mL, the oral immune defense against periodontal pathogens weakens, deep sleep architecture can deteriorate, and systemic inflammation tends to rise.\n\nThe optimal range for longevity is 50-80 ng/mL — higher than most labs mark as "normal."`,
    missing_state: {
      headline: 'Vitamin D not on your panel',
      body: 'Vitamin D deficiency affects roughly 40% of US adults and is one of the most underdiagnosed contributors to oral pathogen burden and poor sleep quality. It is inexpensive to test and straightforward to correct.',
      cta: 'Add vitamin D (25-OH) to your next blood draw',
      cta_sub: 'Standard add-on at any lab. Costs ~$30-50 if not covered by insurance.',
      urgency: 'medium',
    },
  },
}

export const MARKER_RULES_COUNT: Record<string, number> = {
  hs_crp: 9,
  ldl: 3,
  vitamin_d: 2,
}

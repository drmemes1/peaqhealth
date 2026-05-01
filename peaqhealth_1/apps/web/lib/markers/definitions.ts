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
    why_it_matters: `hs-CRP is your body's real-time readout of systemic inflammation. Your liver produces it whenever your immune system is on alert — from an injury, an infection, or something more chronic like gum disease or disrupted sleep.\n\nThe high-sensitivity version detects levels as low as 0.1 mg/L. That precision matters because the range linked to cardiovascular disease and accelerated cellular aging — 1 to 3 mg/L — is well below what a standard CRP test would even report.\n\nhs-CRP is one of the most responsive markers to lifestyle change — most people can move it meaningfully within 4 to 8 weeks.`,
    missing_state: {
      headline: 'hs-CRP is not on your current panel',
      body: 'Standard CRP misses the range that matters most for cardiovascular risk — it only catches large inflammatory events. hs-CRP measures 10x more precisely and captures the chronic low-grade inflammation that drives aging. Without it, several Oravi cross-panel connections cannot fire.',
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
    why_it_matters: `LDL carries cholesterol through your bloodstream. When elevated, LDL particles can penetrate artery walls and become oxidized — the first step in arterial plaque formation.\n\nThe number alone tells an incomplete story. Nitric oxide — produced partly by your oral bacteria — prevents LDL from penetrating and oxidizing inside artery walls. A statin manages how much LDL is in your blood. Your oral microbiome determines how much damage that LDL can do.\n\nThis is why Oravi looks at LDL alongside your oral bacteria, not just in isolation.`,
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

  hba1c: {
    id: 'hba1c',
    label: 'HbA1c',
    fullName: 'Hemoglobin A1c (3-Month Blood Sugar Average)',
    unit: '%',
    panel: 'blood',
    dot_id: 'blood_sugar',
    thresholds: [
      { max: 5.7, label: 'Optimal', color: 'green' },
      { max: 6.4, label: 'Watch', color: 'amber' },
      { min: 6.4, label: 'Elevated', color: 'red' },
    ],
    db_column: 'hba1c_percent',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Non-starchy vegetables', why: 'High fiber slows glucose absorption' },
      { name: 'Legumes', why: 'Low glycemic index' },
      { name: 'Fatty fish', why: 'Omega-3 improves how well your body handles sugar' },
      { name: 'Apple cider vinegar 1-2 tbsp before meals', why: 'Reduces post-meal glucose spikes by up to 20%' },
      { name: 'Cinnamon 1g daily', why: 'Improves how well your body handles sugar in multiple studies' },
    ],
    supplements: [
      { name: 'Berberine 500mg 2-3x daily', why: 'HbA1c reduction comparable to metformin', strength: 'strong' },
      { name: 'Magnesium glycinate 300-400mg', why: 'Deficiency impairs insulin signaling', strength: 'moderate' },
      { name: 'Alpha lipoic acid 600mg', why: 'Improves how well your body handles sugar', strength: 'moderate' },
    ],
    why_it_matters: `HbA1c measures your 3-month blood sugar average. Above 5.7% is where silent damage begins.\n\nInfluenced by sleep schedule, oral bacteria, and diet.`,
    missing_state: {
      headline: 'HbA1c not on your current panel',
      body: 'HbA1c measures your 3-month average blood sugar. Without it, early insulin resistance goes undetected.',
      cta: 'Request HbA1c at your next blood draw',
      urgency: 'medium',
    },
  },

  hdl: {
    id: 'hdl',
    label: 'HDL Cholesterol',
    fullName: 'High-Density Lipoprotein Cholesterol',
    unit: 'mg/dL',
    panel: 'blood',
    dot_id: 'cholesterol',
    higher_is_better: true,
    thresholds: [
      { max: 40, label: 'Low', color: 'red' },
      { max: 60, label: 'Watch', color: 'amber' },
      { min: 60, label: 'Optimal', color: 'green' },
    ],
    db_column: 'hdl_mgdl',
    related_articles: ['beetroot-juice-and-your-heart'],
    foods: [
      { name: 'Extra virgin olive oil', why: 'Raises HDL' },
      { name: 'Fatty fish', why: 'Raises HDL and reduces triglycerides' },
      { name: 'Avocado', why: 'Raises HDL without raising LDL' },
      { name: 'Whole eggs up to 1-2 daily', why: 'HDL increase proportionally larger' },
      { name: 'Purple vegetables and berries', why: 'Anthocyanins raise HDL' },
    ],
    supplements: [
      { name: 'Omega-3 2-4g', why: 'Raises HDL and reduces triglycerides', strength: 'strong' },
      { name: 'Niacin B3 (discuss with doctor)', why: 'Most potent HDL-raising supplement — requires medical supervision', strength: 'strong' },
    ],
    why_it_matters: `HDL is the cleanup crew — it collects cholesterol from arteries and returns it to the liver. Low HDL is an independent risk factor for cardiovascular disease.\n\nExercise is the primary lever for raising HDL.`,
    missing_state: {
      headline: 'HDL not found on your panel',
      body: 'HDL is included in a standard lipid panel. If your most recent upload did not include it, it may be in a different document.',
      cta: 'Upload a panel that includes a lipid profile',
      urgency: 'medium',
    },
  },

  triglycerides: {
    id: 'triglycerides',
    label: 'Triglycerides',
    fullName: 'Triglycerides (Blood Fats)',
    unit: 'mg/dL',
    panel: 'blood',
    dot_id: 'cholesterol',
    thresholds: [
      { max: 100, label: 'Optimal', color: 'green' },
      { max: 150, label: 'Watch', color: 'amber' },
      { min: 150, label: 'Elevated', color: 'red' },
    ],
    db_column: 'triglycerides_mgdl',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Reduce sugar and refined carbs', why: 'Most potent driver of elevated triglycerides' },
      { name: 'Fatty fish', why: 'Omega-3 reduces liver triglyceride production' },
      { name: 'Apple cider vinegar', why: 'Reduces post-meal triglyceride spikes' },
      { name: 'Garlic', why: 'Allicin reduces triglyceride synthesis' },
    ],
    supplements: [
      { name: 'Omega-3 3-4g', why: '30-50% triglyceride reduction in studies', strength: 'strong' },
      { name: 'Berberine 500mg 2-3x', why: 'Reduces triglyceride synthesis via AMPK activation', strength: 'moderate' },
    ],
    why_it_matters: `Triglycerides are the main form of fat in your bloodstream. Elevated levels mean your body is producing more fat than it needs, usually from carbohydrates rather than dietary fat.\n\nAbove 150 mg/dL, triglycerides make LDL particles smaller and denser — the form most likely to penetrate artery walls.`,
    missing_state: {
      headline: 'Triglycerides not found on your panel',
      body: 'Triglycerides are included in a standard lipid panel. If your most recent upload did not include it, it may be in a different document.',
      cta: 'Upload a panel that includes a lipid profile',
      urgency: 'low',
    },
  },

  lpa: {
    id: 'lpa',
    label: 'Lp(a)',
    fullName: 'Lipoprotein(a)',
    unit: 'mg/dL',
    panel: 'blood',
    dot_id: 'heart_health',
    thresholds: [
      { max: 30, label: 'Optimal', color: 'green' },
      { max: 50, label: 'Watch', color: 'amber' },
      { min: 50, label: 'Elevated', color: 'red' },
    ],
    db_column: 'lipoprotein_a_mgdl',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Reduce processed foods and trans fats', why: 'Raises Lp(a)' },
      { name: 'High-dose omega-3 4g+', why: 'Some evidence for modest Lp(a) reduction' },
    ],
    supplements: [
      { name: 'Niacin B3 high dose (discuss with doctor)', why: 'Only supplement with evidence for Lp(a) reduction', strength: 'moderate' },
    ],
    why_it_matters: `Lp(a) is an LDL particle with an extra sticky protein attached. It is largely genetic — about 20% of people have elevated levels without knowing.\n\nThis is not a sentence — it is information for smarter decisions.`,
    missing_state: {
      headline: 'Lp(a) is not on your current panel',
      body: 'Lp(a) is largely genetic and affects about 20% of the population. A single lifetime test is enough since levels rarely change.',
      cta: 'Request Lp(a) at your next blood draw',
      cta_sub: 'Ask specifically for lipoprotein little a',
      urgency: 'high',
    },
  },

  glucose: {
    id: 'glucose',
    label: 'Fasting Glucose',
    fullName: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    panel: 'blood',
    dot_id: 'blood_sugar',
    thresholds: [
      { max: 99, label: 'Optimal', color: 'green' },
      { max: 125, label: 'Watch', color: 'amber' },
      { min: 125, label: 'Elevated', color: 'red' },
    ],
    db_column: 'glucose_mgdl',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Apple cider vinegar before meals', why: 'Reduces glucose spikes by up to 20%' },
      { name: 'Non-starchy vegetables first in meals', why: 'Reduces glucose spikes by up to 75%' },
      { name: 'Whole grains instead of refined', why: 'Slower glucose release due to intact fiber' },
    ],
    supplements: [
      { name: 'Berberine 500mg 2-3x', why: 'Strong evidence for fasting glucose reduction', strength: 'strong' },
      { name: 'Magnesium glycinate 300mg', why: 'Deficiency impairs insulin signaling', strength: 'moderate' },
    ],
    why_it_matters: `Fasting glucose is a snapshot of your blood sugar after 8 hours without eating. Consistently elevated levels signal early insulin resistance.\n\nSleep timing has a direct effect on fasting glucose independent of diet.`,
    missing_state: {
      headline: 'Fasting glucose not on your panel',
      body: 'Fasting glucose is a basic metabolic marker included in most standard panels.',
      cta: 'Upload a panel that includes fasting glucose',
      urgency: 'medium',
    },
  },

  wbc: {
    id: 'wbc',
    label: 'WBC',
    fullName: 'White Blood Cell Count',
    unit: 'K/\u03BCL',
    panel: 'blood',
    dot_id: 'cellular_health',
    thresholds: [
      { max: 7.5, label: 'Optimal', color: 'green' },
      { max: 10.0, label: 'Watch', color: 'amber' },
      { min: 10.0, label: 'Elevated', color: 'red' },
    ],
    db_column: 'wbc_thousand_ul',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Leafy greens and cruciferous vegetables', why: 'Reduce immune overactivation' },
      { name: 'Berries', why: 'Anthocyanins reduce inflammatory signaling' },
      { name: 'Green tea', why: 'EGCG modulates immune response' },
    ],
    supplements: [
      { name: 'Omega-3 2g', why: 'Reduces chronic immune activation', strength: 'moderate' },
    ],
    why_it_matters: `WBC reflects how hard your immune system is working. Chronically elevated levels indicate a persistent low-grade alert state.\n\nConnection lines on this page show which panels may be driving it.`,
    missing_state: {
      headline: 'WBC not found on your panel',
      body: 'WBC is included in a standard CBC panel.',
      cta: 'Upload a panel that includes a CBC',
      urgency: 'medium',
    },
  },

  rdw: {
    id: 'rdw',
    label: 'RDW',
    fullName: 'Red Cell Distribution Width',
    unit: '%',
    panel: 'blood',
    dot_id: 'cellular_health',
    thresholds: [
      { max: 13.0, label: 'Optimal', color: 'green' },
      { max: 14.5, label: 'Watch', color: 'amber' },
      { min: 14.5, label: 'Elevated', color: 'red' },
    ],
    db_column: 'rdw_percent',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Iron-rich foods (lean red meat, spinach, lentils)', why: 'Iron deficiency is a common cause of elevated RDW' },
      { name: 'B12 sources (meat, fish, eggs)', why: 'B12 deficiency causes red blood cell size variation' },
      { name: 'Folate-rich foods (leafy greens, legumes)', why: 'Folate deficiency impairs red blood cell production' },
    ],
    supplements: [
      { name: 'Iron (if deficient)', why: 'Corrects the most common cause of elevated RDW', strength: 'strong' },
      { name: 'B12 methylcobalamin 1000mcg', why: 'Supports normal red blood cell production', strength: 'strong' },
      { name: 'Folate methylfolate 400-800mcg', why: 'Required for red blood cell maturation', strength: 'moderate' },
    ],
    why_it_matters: `RDW measures variation in red blood cell size. Elevated levels mean your bone marrow is under stress, producing cells of inconsistent size.\n\nRDW independently predicts all-cause mortality. Common causes include iron, B12, or folate deficiency and chronic inflammation.`,
    missing_state: {
      headline: 'RDW not found on your panel',
      body: 'RDW is included in a standard CBC panel.',
      cta: 'Upload a panel that includes a CBC',
      urgency: 'medium',
    },
  },

  mpv: {
    id: 'mpv',
    label: 'MPV',
    fullName: 'Mean Platelet Volume',
    unit: 'fL',
    panel: 'blood',
    dot_id: 'heart_health',
    thresholds: [
      { max: 10.0, label: 'Optimal', color: 'green' },
      { max: 11.5, label: 'Watch', color: 'amber' },
      { min: 11.5, label: 'Elevated', color: 'red' },
    ],
    db_column: 'mpv_fl',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Omega-3 rich foods', why: 'Reduces platelet size and reactivity' },
      { name: 'Garlic (raw)', why: 'Reduces platelet aggregation' },
    ],
    supplements: [
      { name: 'Omega-3 2g', why: 'Reduces platelet reactivity', strength: 'moderate' },
    ],
    why_it_matters: `MPV measures average platelet size. Larger platelets are more reactive and more likely to form clots.\n\nMPV is an independent predictor of heart attack and stroke.`,
    missing_state: {
      headline: 'MPV not found on your panel',
      body: 'MPV is included in a standard CBC panel.',
      cta: 'Upload a panel that includes a CBC',
      urgency: 'low',
    },
  },

  deep_sleep: {
    id: 'deep_sleep',
    label: 'Deep sleep',
    fullName: 'Deep Sleep (N3 Stage)',
    unit: 'min',
    panel: 'sleep',
    dot_id: 'deep_sleep',
    higher_is_better: true,
    thresholds: [
      { max: 60, label: 'Low', color: 'red' },
      { max: 90, label: 'Watch', color: 'amber' },
      { min: 90, label: 'Strong', color: 'green' },
    ],
    db_column: 'deep_sleep_min',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Kiwi 2 before bed', why: '13% increase in total sleep time in RCT' },
      { name: 'Tart cherry juice 240ml', why: 'Natural melatonin source' },
      { name: 'Magnesium-rich foods (pumpkin seeds, almonds)', why: 'Magnesium supports deep sleep architecture' },
    ],
    supplements: [
      { name: 'Magnesium glycinate 300-400mg', why: 'Supports deep sleep onset and duration', strength: 'strong' },
      { name: 'L-theanine 200mg', why: 'Promotes relaxation without sedation', strength: 'moderate' },
      { name: 'Ashwagandha 300mg KSM-66', why: 'Reduces cortisol which interferes with deep sleep', strength: 'moderate' },
    ],
    why_it_matters: `Deep sleep is your body's repair window. Growth hormone is released primarily during this stage.\n\nDeep sleep declines with age, but declines faster with alcohol, late eating, and blue light exposure. For men, deep sleep is the primary testosterone production window.`,
    missing_state: {
      headline: 'No wearable connected',
      body: 'requires a connected wearable',
      cta: 'Connect a wearable',
      urgency: 'high',
    },
  },

  rem: {
    id: 'rem',
    label: 'REM sleep',
    fullName: 'REM Sleep (Dream Stage)',
    unit: 'min',
    panel: 'sleep',
    dot_id: 'rem',
    higher_is_better: true,
    thresholds: [
      { max: 60, label: 'Low', color: 'red' },
      { max: 90, label: 'Watch', color: 'amber' },
      { min: 90, label: 'Strong', color: 'green' },
    ],
    db_column: 'rem_min',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Tart cherry juice', why: 'Increases REM sleep duration' },
      { name: 'Walnuts', why: 'Natural melatonin source' },
    ],
    supplements: [
      { name: 'Melatonin 0.5-1mg low dose', why: 'High doses suppress REM paradoxically — low dose is key', strength: 'moderate' },
      { name: 'L-theanine 200mg', why: 'Supports sleep architecture without suppressing REM', strength: 'moderate' },
    ],
    why_it_matters: `REM sleep is when your brain processes emotions and consolidates memories. Alcohol is the most common REM suppressor.\n\nNasal obstruction selectively reduces REM sleep.`,
    missing_state: {
      headline: 'No wearable connected',
      body: 'requires a connected wearable',
      cta: 'Connect a wearable',
      urgency: 'high',
    },
  },

  duration: {
    id: 'duration',
    label: 'Sleep duration',
    fullName: 'Total Sleep Duration',
    unit: 'hrs',
    panel: 'sleep',
    dot_id: 'duration',
    thresholds: [
      { max: 6.0, label: 'Too short', color: 'red' },
      { max: 7.0, label: 'Watch', color: 'amber' },
      { max: 8.5, label: 'Optimal', color: 'green' },
      { min: 8.5, label: 'Watch', color: 'amber' },
    ],
    db_column: 'duration_hrs',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [],
    supplements: [
      { name: 'Magnesium glycinate 300mg', why: 'Supports sleep onset and maintenance', strength: 'strong' },
      { name: 'Glycine 3g', why: 'Lowers core temperature to promote sleep', strength: 'moderate' },
    ],
    why_it_matters: `Sleep duration is the foundation. Less than 6 hours is associated with elevated WBC, increased inflammation, impaired glucose handling, and reduced testosterone.\n\nOptimal range is 7-8.5 hours. Duration without consistency loses much of its benefit.`,
    missing_state: {
      headline: 'No wearable connected',
      body: 'requires a connected wearable',
      cta: 'Connect a wearable',
      urgency: 'high',
    },
  },

  consistency: {
    id: 'consistency',
    label: 'Sleep consistency',
    fullName: 'Sleep Schedule Consistency (Bedtime Variation)',
    unit: 'min SD',
    panel: 'sleep',
    dot_id: 'consistency',
    thresholds: [
      { max: 20, label: 'Consistent', color: 'green' },
      { max: 45, label: 'Watch', color: 'amber' },
      { min: 45, label: 'Variable', color: 'red' },
    ],
    db_column: 'bedtime_sd_min',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [],
    supplements: [],
    why_it_matters: `Consistency measures bedtime variation. Your internal clock governs glucose, immune cells, and hormones. Irregularity throws all of these out of sync independently of how much sleep you get.\n\nThe fix is free: set a consistent bedtime alarm.`,
    missing_state: {
      headline: 'Bedtime data not yet available',
      body: 'requires a connected wearable',
      cta: 'Connect a wearable',
      urgency: 'medium',
    },
  },

  recovery_hrv: {
    id: 'recovery_hrv',
    label: 'Recovery (HRV)',
    fullName: 'Heart Rate Variability \u2014 Recovery Signal',
    unit: 'ms',
    panel: 'sleep',
    dot_id: 'recovery_hrv',
    higher_is_better: true,
    thresholds: [
      { max: 25, label: 'Low', color: 'red' },
      { max: 40, label: 'Watch', color: 'amber' },
      { min: 40, label: 'Strong', color: 'green' },
    ],
    db_column: 'hrv_rmssd_avg',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Beets and leafy greens', why: 'Nitrate supports nitric oxide production which promotes blood vessel relaxation' },
      { name: 'Dark chocolate 70%+', why: 'Flavanols improve vagal tone' },
      { name: 'Reduce alcohol', why: 'Even moderate alcohol suppresses HRV overnight' },
    ],
    supplements: [
      { name: 'Omega-3 2g', why: 'Improves vagal tone', strength: 'moderate' },
      { name: 'Magnesium glycinate 300mg', why: 'Supports recovery during sleep', strength: 'moderate' },
    ],
    why_it_matters: `HRV measures the variation in time between heartbeats during sleep. Higher HRV indicates a more flexible, resilient nervous system.\n\nHRV is the most sensitive early-warning signal available — it drops before you feel sick. It is a recovery signal, not a fitness score.`,
    missing_state: {
      headline: 'HRV data is building',
      body: 'requires a connected wearable with at least 20 nights of data',
      cta: 'Connect a wearable',
      urgency: 'low',
    },
  },

  good_bacteria: {
    id: 'good_bacteria',
    label: 'Good bacteria',
    fullName: 'Protective Species \u2014 Nitrate-Reducing Bacteria',
    unit: 'percentile',
    panel: 'oral',
    dot_id: 'good_bacteria',
    higher_is_better: true,
    thresholds: [
      { max: 40, label: 'Low', color: 'red' },
      { max: 60, label: 'Watch', color: 'amber' },
      { min: 60, label: 'Strong', color: 'green' },
    ],
    db_column: 'protective_pct',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Beetroot juice 70ml concentrated', why: 'Feeds nitric oxide-producing bacteria — measurable change in 10 days' },
      { name: 'Arugula, spinach, celery, radishes', why: 'Highest nitrate density among vegetables' },
      { name: 'Leafy greens with every meal', why: 'Sustains protective bacterial populations' },
    ],
    supplements: [
      { name: 'Stop antiseptic mouthwash', why: 'Free and fastest way to restore protective species', strength: 'strong' },
      { name: 'Oral probiotic L. salivarius', why: 'Supports protective species recolonization', strength: 'moderate' },
    ],
    why_it_matters: `These bacteria convert nitrate from vegetables into nitric oxide. When depleted, the nitric oxide pathway shuts down.\n\nNitric oxide affects blood vessels, heart rate, and cardiovascular function. Several connection lines trace back here.`,
    missing_state: {
      headline: 'No oral kit results yet',
      body: 'requires an Oral Microbiome Assessment',
      cta: 'Order your oral kit',
      urgency: 'high',
    },
  },

  harmful_bacteria: {
    id: 'harmful_bacteria',
    label: 'Harmful bacteria',
    fullName: 'Periodontal Pathogen Burden',
    unit: 'percentile',
    panel: 'oral',
    dot_id: 'harmful_bacteria',
    thresholds: [
      { max: 40, label: 'Well controlled', color: 'green' },
      { max: 60, label: 'Watch', color: 'amber' },
      { min: 60, label: 'Elevated', color: 'red' },
    ],
    db_column: 'pathogen_inv_pct',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Cranberry polyphenols', why: 'Prevent pathogen attachment to oral tissue' },
      { name: 'Green tea', why: 'EGCG inhibits periodontal pathogen growth' },
      { name: 'Leafy greens', why: 'Build protective competitor populations' },
    ],
    supplements: [
      { name: 'L. reuteri probiotic', why: 'Multiple RCTs show reduction in periodontal pathogens', strength: 'strong' },
      { name: 'CoQ10 100mg', why: 'Supports gum tissue health', strength: 'moderate' },
    ],
    why_it_matters: `These bacteria are associated with gum disease, inflammation, and systemic effects via the bloodstream. They create a persistent low-grade alert state.\n\nCRP reflects this. Dentists and doctors rarely see both sides. Oravi does.`,
    missing_state: {
      headline: 'No oral kit results yet',
      body: 'requires an Oral Microbiome Assessment',
      cta: 'Order your oral kit',
      urgency: 'high',
    },
  },

  cavity_risk: {
    id: 'cavity_risk',
    label: 'Cavity risk',
    fullName: 'Cavity-Associated Bacteria',
    unit: 'level',
    panel: 'oral',
    dot_id: 'cavity_risk',
    thresholds: [
      { max: 0.1, label: 'Low', color: 'green' },
      { max: 0.5, label: 'Watch', color: 'amber' },
      { min: 0.5, label: 'Elevated', color: 'red' },
    ],
    db_column: 'strep_mutans_pct',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Xylitol gum after meals', why: 'Specifically inhibits cavity-causing bacteria' },
      { name: 'Cheese after meals', why: 'Raises pH and casein buffers enamel' },
      { name: 'Water after acidic foods', why: 'Rinses acids before they damage enamel' },
    ],
    supplements: [
      { name: 'Xylitol 5-10g daily', why: 'Starves cavity-causing bacteria selectively', strength: 'strong' },
      { name: 'Hydroxyapatite toothpaste', why: 'Evidence comparable to fluoride for remineralization', strength: 'strong' },
    ],
    why_it_matters: `These bacteria produce acid that dissolves enamel. Elevated levels mean conditions are favorable for cavities, not that you have them yet.\n\nAntiseptic mouthwash can paradoxically worsen the situation by killing protective competitors.`,
    missing_state: {
      headline: 'No oral kit results yet',
      body: 'requires an Oral Microbiome Assessment',
      cta: 'Order your oral kit',
      urgency: 'high',
    },
  },

  breath_health: {
    id: 'breath_health',
    label: 'Breath health',
    fullName: 'Odor-Associated Bacteria',
    unit: 'level',
    panel: 'oral',
    dot_id: 'breath_health',
    thresholds: [
      { max: 1.0, label: 'Good', color: 'green' },
      { max: 3.0, label: 'Watch', color: 'amber' },
      { min: 3.0, label: 'Elevated', color: 'red' },
    ],
    db_column: 'fusobacterium_pct',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Parsley, mint, fresh herbs', why: 'Chlorophyll neutralizes sulfur compounds immediately' },
      { name: 'Green tea', why: 'Polyphenols reduce volatile sulfur compounds' },
      { name: 'Leafy greens', why: 'Feed protective competitor populations' },
    ],
    supplements: [
      { name: 'Tongue scraper daily', why: 'Most effective single intervention for breath health', strength: 'strong' },
      { name: 'Zinc lozenges or rinse', why: 'Temporary but effective VSC reduction', strength: 'moderate' },
    ],
    why_it_matters: `These anaerobic species share their niche with gum disease bacteria. Elevated alongside harmful bacteria means one problem expressed two ways.\n\nThe fix is not masking odor — it is changing the conditions that favor these species.`,
    missing_state: {
      headline: 'No oral kit results yet',
      body: 'requires an Oral Microbiome Assessment',
      cta: 'Order your oral kit',
      urgency: 'high',
    },
  },

  diversity: {
    id: 'diversity',
    label: 'Diversity',
    fullName: 'Oral Microbiome Diversity (Species Richness)',
    unit: 'percentile',
    panel: 'oral',
    dot_id: 'diversity',
    higher_is_better: true,
    thresholds: [
      { max: 40, label: 'Low', color: 'red' },
      { max: 60, label: 'Watch', color: 'amber' },
      { min: 60, label: 'Diverse', color: 'green' },
    ],
    db_column: 'shannon_pct',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Wide variety of plants — 30+ per week', why: 'Feeds microbial diversity' },
      { name: 'Fermented foods', why: 'Introduce diverse bacterial populations' },
      { name: 'Prebiotic foods (garlic, onion, leeks)', why: 'Feed existing bacterial populations' },
    ],
    supplements: [
      { name: 'Stop antiseptic mouthwash', why: 'Fastest way to restore microbial diversity', strength: 'strong' },
      { name: 'Oral probiotic multi-strain', why: 'Supports recolonization of diverse species', strength: 'moderate' },
    ],
    why_it_matters: `Diverse means resilient. Many species keep each other in balance. Low diversity means fewer competitors, allowing harmful species to expand.\n\nThe same principle as a monoculture versus a diverse forest.`,
    missing_state: {
      headline: 'No oral kit results yet',
      body: 'requires an Oral Microbiome Assessment',
      cta: 'Order your oral kit',
      urgency: 'high',
    },
  },

  inflammation_risk: {
    id: 'inflammation_risk',
    label: 'Inflammation risk',
    fullName: 'Oral Inflammation Signal',
    unit: 'level',
    panel: 'oral',
    dot_id: 'inflammation_risk',
    thresholds: [
      { max: 30, label: 'Low', color: 'green' },
      { max: 60, label: 'Watch', color: 'amber' },
      { min: 60, label: 'Elevated', color: 'red' },
    ],
    db_column: 'pathogen_inv_pct',
    related_articles: ['mouthwash-and-your-microbiome'],
    foods: [
      { name: 'Omega-3 foods', why: 'Reduces inflammatory signaling' },
      { name: 'Green tea', why: 'Direct anti-inflammatory effect on oral tissue' },
      { name: 'Vitamin C foods', why: 'Collagen synthesis for gum repair' },
    ],
    supplements: [
      { name: 'CoQ10 100mg', why: 'Depleted in inflamed gum tissue', strength: 'moderate' },
      { name: 'Vitamin C 500mg', why: 'Essential for gum tissue integrity', strength: 'moderate' },
    ],
    why_it_matters: `Derived from the balance of harmful versus protective bacteria. Inflammation does not stay in the mouth — bacteria enter the bloodstream via the gum lining, leading to CRP elevation.\n\nThis is the oral-systemic connection at its most direct.`,
    missing_state: {
      headline: 'No oral kit results yet',
      body: 'requires an Oral Microbiome Assessment',
      cta: 'Order your oral kit',
      urgency: 'high',
    },
  },
}

export const MARKER_RULES_COUNT: Record<string, number> = {
  hs_crp: 9, ldl: 3, vitamin_d: 2, hba1c: 4, hdl: 0, triglycerides: 0,
  lpa: 1, glucose: 1, wbc: 0, rdw: 0, mpv: 0,
  deep_sleep: 5, rem: 1, duration: 6, consistency: 3, recovery_hrv: 7,
  good_bacteria: 7, harmful_bacteria: 7, cavity_risk: 2, breath_health: 1,
  diversity: 3, inflammation_risk: 5,
}

export interface MarkerDef {
  key: string
  displayName: string
  unit: string
  category: string
  optimal?: { min?: number; max?: number }
  role: string
  context: (v: number | null) => string
  source?: string
}

function generic(name: string, unit: string, cat: string): MarkerDef {
  return { key: name.toLowerCase().replace(/\s/g, "_"), displayName: name, unit, category: cat, role: `Part of your panel. Reference ranges vary by lab. Discuss with your provider.`, context: v => v != null ? `Your value: ${v} ${unit}.` : "Not yet measured." }
}

export const MARKERS: Record<string, MarkerDef> = {
  // ── Heart ──
  ldl_mgdl: { key: "ldl_mgdl", displayName: "LDL", unit: "mg/dL", category: "heart", optimal: { max: 100 }, role: "Carries cholesterol to tissues. Higher levels associate with cardiovascular patterns in population research.", context: v => v == null ? "Not yet measured." : v < 100 ? `Your ${v} mg/dL is within the optimal range in population data.` : v < 130 ? `Your ${v} mg/dL is near-optimal — observational territory.` : v < 160 ? `Your ${v} mg/dL is running above the typical range. Worth discussing with your doctor.` : `Your ${v} mg/dL is above typical ranges. Research associates this level with other markers worth checking.`, source: "NHLBI ATP III" },
  hdl_mgdl: { key: "hdl_mgdl", displayName: "HDL", unit: "mg/dL", category: "heart", optimal: { min: 50 }, role: "Carries cholesterol away from arteries. Higher is generally better in population studies.", context: v => v == null ? "Not yet measured." : v >= 60 ? `Your ${v} mg/dL is strong — associated with cardiovascular protection.` : v >= 40 ? `Your ${v} mg/dL is in the acceptable range.` : `Your ${v} mg/dL is running below typical. Worth discussing.`, source: "AHA guidelines" },
  triglycerides_mgdl: { key: "triglycerides_mgdl", displayName: "Triglycerides", unit: "mg/dL", category: "heart", optimal: { max: 100 }, role: "Blood fats influenced by diet, exercise, and alcohol. Fasting levels give the clearest picture.", context: v => v == null ? "Not yet measured." : v < 100 ? `Your ${v} mg/dL is optimal.` : v < 150 ? `Your ${v} mg/dL is in the normal range.` : `Your ${v} mg/dL is above the typical range.` },
  total_cholesterol_mgdl: { key: "total_cholesterol_mgdl", displayName: "Total Cholesterol", unit: "mg/dL", category: "heart", optimal: { max: 200 }, role: "The sum of LDL, HDL, and other lipoproteins. Context from the breakdown matters more than the total.", context: v => v == null ? "Not yet measured." : v < 200 ? `Your ${v} mg/dL is within the desirable range.` : v < 240 ? `Your ${v} mg/dL is borderline. The LDL/HDL breakdown gives more context.` : `Your ${v} mg/dL is above typical. Worth reviewing the breakdown with your doctor.` },
  hs_crp_mgl: { key: "hs_crp_mgl", displayName: "hs-CRP", unit: "mg/L", category: "heart", optimal: { max: 1.0 }, role: "A sensitive marker of systemic inflammation. Research associates levels above 1.0 with cardiovascular and metabolic patterns.", context: v => v == null ? "Not yet measured. Worth adding to your next draw — it unlocks cross-panel connections." : v < 1 ? `Your ${v} mg/L is in the low-inflammation range.` : v < 3 ? `Your ${v} mg/L is in the intermediate range.` : `Your ${v} mg/L is above 3 — worth discussing with your doctor.`, source: "Ridker PM. NEJM 2002." },
  homocysteine_umoll: generic("Homocysteine", "µmol/L", "heart"),
  lipoprotein_a_mgdl: generic("Lp(a)", "mg/dL", "heart"),
  apob_mgdl: generic("ApoB", "mg/dL", "heart"),

  // ── Metabolic ──
  glucose_mgdl: { key: "glucose_mgdl", displayName: "Glucose", unit: "mg/dL", category: "metabolic", optimal: { min: 70, max: 99 }, role: "Fasting blood sugar. A single snapshot — HbA1c gives a 3-month average.", context: v => v == null ? "Not yet measured." : v < 100 ? `Your ${v} mg/dL is in the normal fasting range.` : v < 126 ? `Your ${v} mg/dL is above the fasting threshold. HbA1c would add 3-month context.` : `Your ${v} mg/dL is above the clinical threshold. Worth discussing with your doctor.` },
  hba1c_percent: { key: "hba1c_percent", displayName: "HbA1c", unit: "%", category: "metabolic", optimal: { max: 5.6 }, role: "A 3-month blood sugar average. More reliable than a single fasting glucose reading.", context: v => v == null ? "Not yet measured. Worth adding — it gives a 3-month picture of blood sugar handling." : v < 5.7 ? `Your ${v}% is in the optimal range.` : v < 6.5 ? `Your ${v}% is at the threshold researchers watch closely for metabolic patterns.` : `Your ${v}% is above the clinical threshold. Worth discussing with your doctor.` },
  insulin_uiuml: generic("Insulin", "µIU/mL", "metabolic"),
  uric_acid_mgdl: generic("Uric Acid", "mg/dL", "metabolic"),

  // ── Kidney ──
  egfr_mlmin: { key: "egfr_mlmin", displayName: "eGFR", unit: "mL/min", category: "kidney", optimal: { min: 90 }, role: "Estimated glomerular filtration rate — how well your kidneys are filtering.", context: v => v == null ? "Not yet measured." : v >= 90 ? `Your ${v} mL/min is in the normal range.` : v >= 60 ? `Your ${v} mL/min is mildly below typical. Worth monitoring over time.` : `Your ${v} mL/min is below the typical range. Worth discussing with your doctor.` },
  creatinine_mgdl: { key: "creatinine_mgdl", displayName: "Creatinine", unit: "mg/dL", category: "kidney", optimal: { min: 0.6, max: 1.2 }, role: "A waste product from muscle metabolism. Kidney function affects clearance.", context: v => v == null ? "Not yet measured." : v >= 0.6 && v <= 1.2 ? `Your ${v} mg/dL is in the normal range.` : `Your ${v} mg/dL is outside the typical range.` },
  bun_mgdl: { key: "bun_mgdl", displayName: "BUN", unit: "mg/dL", category: "kidney", optimal: { min: 7, max: 20 }, role: "Blood urea nitrogen — another kidney filtration marker.", context: v => v == null ? "Not yet measured." : v >= 7 && v <= 20 ? `Your ${v} mg/dL is in the normal range.` : `Your ${v} mg/dL is outside the typical range.` },
  sodium_mmoll: generic("Sodium", "mmol/L", "kidney"),
  potassium_mmoll: generic("Potassium", "mmol/L", "kidney"),

  // ── Liver ──
  alt_ul: { key: "alt_ul", displayName: "ALT", unit: "U/L", category: "liver", optimal: { max: 33 }, role: "A liver enzyme. Rises when liver cells are stressed or damaged.", context: v => v == null ? "Not yet measured." : v <= 33 ? `Your ${v} U/L is in the normal range.` : v <= 56 ? `Your ${v} U/L is mildly above typical.` : `Your ${v} U/L is above the typical range. Worth discussing.` },
  ast_ul: { key: "ast_ul", displayName: "AST", unit: "U/L", category: "liver", optimal: { max: 33 }, role: "Another liver enzyme. Can also rise from muscle damage or exercise.", context: v => v == null ? "Not yet measured." : v <= 33 ? `Your ${v} U/L is in the normal range.` : `Your ${v} U/L is above the typical range.` },
  albumin_gdl: generic("Albumin", "g/dL", "liver"),
  alp_ul: generic("ALP", "U/L", "liver"),
  total_bilirubin_mgdl: generic("Bilirubin", "mg/dL", "liver"),

  // ── CBC ──
  hemoglobin_gdl: { key: "hemoglobin_gdl", displayName: "Hemoglobin", unit: "g/dL", category: "cbc", optimal: { min: 12, max: 17 }, role: "The protein in red blood cells that carries oxygen. Low levels can cause fatigue.", context: v => v == null ? "Not yet measured." : v >= 12 && v <= 17 ? `Your ${v} g/dL is in the normal range.` : `Your ${v} g/dL is outside the typical range.` },
  hematocrit_percent: generic("Hematocrit", "%", "cbc"),
  wbc_thousand_ul: { key: "wbc_thousand_ul", displayName: "WBC", unit: "K/µL", category: "immune", optimal: { min: 4.5, max: 11 }, role: "White blood cell count — your immune system's army. Population research looks at both high and low ends.", context: v => v == null ? "Not yet measured." : v >= 4.5 && v <= 11 ? `Your ${v} K/µL is in the normal range.` : `Your ${v} K/µL is outside the typical range.` },
  platelets_thousand_ul: generic("Platelets", "K/µL", "cbc"),
  rdw_percent: generic("RDW", "%", "cbc"),
  mcv_fl: generic("MCV", "fL", "cbc"),

  // ── Nutrients ──
  vitamin_d_ngml: { key: "vitamin_d_ngml", displayName: "Vitamin D", unit: "ng/mL", category: "nutrients", optimal: { min: 40, max: 80 }, role: "Affects immune function, bone health, and sleep quality. Deficiency is very common.", context: v => v == null ? "Not yet measured. One of the most impactful markers to check." : v >= 40 ? `Your ${v} ng/mL is in the optimal range.` : v >= 30 ? `Your ${v} ng/mL is sufficient but below optimal.` : v >= 20 ? `Your ${v} ng/mL is insufficient. Supplementation often helps.` : `Your ${v} ng/mL is in the deficient range.` },
  ferritin_ngml: generic("Ferritin", "ng/mL", "nutrients"),
  vitamin_b12_pgml: generic("Vitamin B12", "pg/mL", "nutrients"),

  // ── Thyroid ──
  tsh_uiuml: { key: "tsh_uiuml", displayName: "TSH", unit: "µIU/mL", category: "thyroid", optimal: { min: 0.45, max: 4.5 }, role: "Thyroid-stimulating hormone. Controls metabolic rate, energy, and heart rate. Abnormal TSH is a priority finding that affects how we read HRV.", context: v => v == null ? "Not yet measured." : v >= 0.45 && v <= 4.5 ? `Your ${v} µIU/mL is in the normal range.` : v < 0.45 ? `Your ${v} µIU/mL is below normal — this can affect HRV and heart rate. Worth discussing with your doctor.` : `Your ${v} µIU/mL is above normal. Worth discussing.`, source: "ATA guidelines" },
  t4_free_ngdl: generic("Free T4", "ng/dL", "thyroid"),
}

// ── Auto-fill from registry ─────────────────────────────────────────────────
// Every BLOOD_MARKER_REGISTRY id needs a MARKERS entry so the dashboard
// can render its display name + unit. Anything not curated above falls
// through to a generic() entry derived from the registry. This is what
// makes adding a marker to the registry "automatically appear in the UI"
// per ADR-0020.

import { BLOOD_MARKER_REGISTRY } from "./markerRegistry"

for (const m of BLOOD_MARKER_REGISTRY) {
  if (MARKERS[m.id]) continue // curated entry takes precedence
  // Map registry's primary category → marker-content category vocabulary.
  // The marker-content `category` field is informational; BLOOD_CATEGORIES
  // (categories.ts) is what actually drives the page grouping.
  const primary = m.categories[0] ?? "other"
  const cat: string =
    primary === "lipids" || primary === "inflammation" ? "heart" :
    primary === "blood_count" ? "cbc" :
    primary === "advanced_lipids" ? "advanced_lipids" :
    primary === "advanced_nutrients" ? "advanced_nutrients" :
    primary === "advanced_thyroid" ? "advanced_thyroid" :
    primary
  MARKERS[m.id] = {
    key: m.id,
    displayName: m.displayName,
    unit: m.unit,
    category: cat,
    role: m.description ?? `Part of your panel. Reference ranges vary by lab. Discuss with your provider.`,
    context: v => v != null ? `Your value: ${v} ${m.unit}.` : "Not yet measured.",
  }
}

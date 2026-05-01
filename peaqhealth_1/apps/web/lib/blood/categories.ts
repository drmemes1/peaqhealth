import { MARKERS, type MarkerDef } from "./marker-content"

export interface BloodCategory {
  key: string
  name: string
  description: string
  markerKeys: string[]
  headlineMarker: string
  narrative: (data: Record<string, number | null>) => string
}

export const BLOOD_CATEGORIES: BloodCategory[] = [
  {
    key: "heart", name: "Heart", description: "Cholesterol, lipids, and inflammatory markers linked to cardiovascular health.",
    markerKeys: ["ldl_mgdl", "hdl_mgdl", "triglycerides_mgdl", "total_cholesterol_mgdl", "hs_crp_mgl", "homocysteine_umoll", "lipoprotein_a_mgdl", "apob_mgdl"],
    headlineMarker: "ldl_mgdl",
    narrative: d => {
      const ldl = d.ldl_mgdl; const hdl = d.hdl_mgdl; const tg = d.triglycerides_mgdl
      if (ldl == null && hdl == null) return "Your cardiovascular markers haven't been measured yet."
      const parts: string[] = []
      if (ldl != null) parts.push(`LDL at ${ldl} mg/dL${ldl > 130 ? " is running above the typical range" : " is within the typical range"}`)
      if (hdl != null) parts.push(`HDL at ${hdl} mg/dL${hdl >= 60 ? " is strong" : " is in the acceptable range"}`)
      if (tg != null) parts.push(`triglycerides at ${tg} mg/dL${tg < 100 ? " look clean" : " are worth watching"}`)
      return `Your lipid panel shows ${parts.join(", ")}. ${d.hs_crp_mgl == null ? "Adding hs-CRP to your next draw would add inflammatory context." : ""}`
    },
  },
  {
    key: "metabolic", name: "Metabolic", description: "Blood sugar, insulin, and metabolic markers.",
    markerKeys: ["hba1c_percent", "glucose_mgdl", "insulin_uiuml", "uric_acid_mgdl"],
    headlineMarker: "hba1c_percent",
    narrative: d => {
      if (d.glucose_mgdl == null && d.hba1c_percent == null) return "Your metabolic markers haven't been measured yet."
      const g = d.glucose_mgdl; const h = d.hba1c_pct
      return `${g != null ? `Fasting glucose at ${g} mg/dL${g >= 100 ? " is at the threshold researchers watch" : " is in the normal range"}.` : ""} ${h != null ? `HbA1c at ${h}% gives a 3-month average.` : "Adding HbA1c would give a 3-month blood sugar picture."}`
    },
  },
  {
    key: "kidney", name: "Kidney", description: "Filtration, waste clearance, and electrolyte balance.",
    markerKeys: ["egfr_mlmin", "creatinine_mgdl", "bun_mgdl", "sodium_mmoll", "potassium_mmoll"],
    headlineMarker: "egfr_mlmin",
    narrative: d => d.egfr_mlmin != null ? `Your eGFR at ${d.egfr_mlmin} mL/min${Number(d.egfr_mlmin) >= 90 ? " shows healthy filtration" : " is worth monitoring"}. Creatinine and BUN provide supporting context.` : "Your kidney markers haven't been measured yet.",
  },
  {
    key: "liver", name: "Liver", description: "Hepatic enzymes and proteins reflecting liver function.",
    markerKeys: ["alt_ul", "ast_ul", "albumin_gdl", "alp_ul", "total_bilirubin_mgdl"],
    headlineMarker: "alt_ul",
    narrative: d => d.alt_ul != null ? `ALT at ${d.alt_ul} U/L and AST at ${d.ast_ul ?? "—"} U/L${Number(d.alt_ul) <= 33 ? " are both in the normal range" : " — worth reviewing with your doctor"}.` : "Your liver markers haven't been measured yet.",
  },
  {
    key: "cbc", name: "Blood cells", description: "Red cells, hemoglobin, and platelet counts.",
    markerKeys: ["hemoglobin_gdl", "hematocrit_percent", "platelets_thousand_ul", "rdw_percent", "mcv_fl"],
    headlineMarker: "hemoglobin_gdl",
    narrative: d => d.hemoglobin_gdl != null ? `Hemoglobin at ${d.hemoglobin_gdl} g/dL. Red cell metrics give context on oxygen-carrying capacity and iron status.` : "Your CBC markers haven't been measured yet.",
  },
  {
    key: "immune", name: "Immune", description: "White blood cell counts and differential.",
    markerKeys: ["wbc_thousand_ul"],
    headlineMarker: "wbc_thousand_ul",
    narrative: d => d.wbc_thousand_ul != null ? `WBC at ${d.wbc_thousand_ul} K/µL${Number(d.wbc_thousand_ul) >= 4.5 && Number(d.wbc_thousand_ul) <= 11 ? " is in the normal range" : " is outside the typical range"}.` : "Your immune markers haven't been measured yet.",
  },
  {
    key: "nutrients", name: "Nutrients", description: "Vitamins, minerals, and iron studies.",
    markerKeys: ["vitamin_d_ngml", "ferritin_ngml", "vitamin_b12_pgml"],
    headlineMarker: "vitamin_d_ngml",
    narrative: d => d.vitamin_d_ngml != null ? `Vitamin D at ${d.vitamin_d_ngml} ng/mL${Number(d.vitamin_d_ngml) >= 40 ? " is in the optimal range" : " is worth supplementing"}.` : "Your nutritional markers haven't been measured yet. Vitamin D is one of the most impactful to check.",
  },
  {
    key: "thyroid", name: "Thyroid", description: "Metabolic regulation, energy, and heart rate.",
    markerKeys: ["tsh_uiuml", "t4_free_ngdl"],
    headlineMarker: "tsh_uiuml",
    narrative: d => d.tsh_uiuml != null ? `TSH at ${d.tsh_uiuml} µIU/mL${Number(d.tsh_uiuml) >= 0.45 && Number(d.tsh_uiuml) <= 4.5 ? " is in the normal range" : " is outside typical — this can affect HRV and how we read your sleep data"}.` : "Your thyroid markers haven't been measured yet.",
  },
]

export function getCategoryStatus(cat: BloodCategory, data: Record<string, unknown>): "good" | "watch" | "concern" | "pending" {
  const headline = data[cat.headlineMarker]
  if (headline == null) return "pending"
  const marker = MARKERS[cat.headlineMarker]
  if (!marker?.optimal) return "good"
  const v = Number(headline)
  const { min, max } = marker.optimal
  if (min != null && max != null) return v >= min && v <= max ? "good" : "watch"
  if (max != null) return v <= max ? "good" : v <= max * 1.5 ? "watch" : "concern"
  if (min != null) return v >= min ? "good" : v >= min * 0.7 ? "watch" : "concern"
  return "good"
}

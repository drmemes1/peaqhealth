/**
 * Canonical mapping from all known lab report name variations to internal keys.
 * Used by ALL parsers — not Azure-specific.
 * Keys are lowercase-trimmed; use lookupMarker() for lookups.
 */
export const MARKER_MAP: Record<string, string> = {
  // LDL
  "ldl":                        "ldl_mgdL",
  "ldl cholesterol":            "ldl_mgdL",
  "ldl-c":                      "ldl_mgdL",
  "ldl cholesterol calc":       "ldl_mgdL",
  "low density lipoprotein":    "ldl_mgdL",

  // HDL
  "hdl":                        "hdl_mgdL",
  "hdl cholesterol":            "hdl_mgdL",
  "hdl-c":                      "hdl_mgdL",
  "high density lipoprotein":   "hdl_mgdL",

  // Triglycerides
  "triglycerides":              "triglycerides_mgdL",
  "trig":                       "triglycerides_mgdL",
  "trigs":                      "triglycerides_mgdL",

  // hsCRP
  "hs-crp":                     "hsCRP_mgL",
  "hscrp":                      "hsCRP_mgL",
  "high sensitivity crp":       "hsCRP_mgL",
  "c-reactive protein":         "hsCRP_mgL",
  "crp":                        "hsCRP_mgL",

  // HbA1c
  "hba1c":                      "hba1c_pct",
  "hemoglobin a1c":             "hba1c_pct",
  "glycated hemoglobin":        "hba1c_pct",
  "a1c":                        "hba1c_pct",

  // Glucose
  "glucose":                    "glucose_mgdL",
  "fasting glucose":            "glucose_mgdL",
  "blood glucose":              "glucose_mgdL",

  // Vitamin D
  "vitamin d":                  "vitaminD_ngmL",
  "vit d":                      "vitaminD_ngmL",
  "25-oh vitamin d":            "vitaminD_ngmL",
  "25-hydroxyvitamin d":        "vitaminD_ngmL",
  "vitamin d, 25-oh":           "vitaminD_ngmL",

  // ApoB
  "apob":                       "apoB_mgdL",
  "apolipoprotein b":           "apoB_mgdL",
  "apo b":                      "apoB_mgdL",

  // Lp(a)
  "lp(a)":                      "lpa_mgdL",
  "lipoprotein a":              "lpa_mgdL",
  "lipoprotein(a)":             "lpa_mgdL",

  // Creatinine
  "creatinine":                 "creatinine_mgdL",
  "creat":                      "creatinine_mgdL",

  // eGFR
  "egfr":                       "egfr_mLmin",
  "estimated gfr":              "egfr_mLmin",
  "glomerular filtration":      "egfr_mLmin",

  // ALT
  "alt":                        "alt_UL",
  "alt (sgpt)":                 "alt_UL",
  "alanine aminotransferase":   "alt_UL",
  "sgpt":                       "alt_UL",

  // AST
  "ast":                        "ast_UL",
  "ast/sgot":                   "ast_UL",
  "aspartate aminotransferase": "ast_UL",
  "sgot":                       "ast_UL",

  // CBC
  "wbc":                        "wbc_kul",
  "white blood cell":           "wbc_kul",
  "white blood cells":          "wbc_kul",
  "leukocytes":                 "wbc_kul",

  "hemoglobin":                 "hemoglobin_gdL",
  "hgb":                        "hemoglobin_gdL",
  "hb":                         "hemoglobin_gdL",

  "rdw":                        "rdw_pct",
  "red cell distribution width":"rdw_pct",
  "rdw-cv":                     "rdw_pct",

  "mcv":                        "mcv_fL",
  "mean corpuscular volume":    "mcv_fL",

  // Metabolic panel
  "albumin":                    "albumin_gdL",

  "bun":                        "bun_mgdL",
  "blood urea nitrogen":        "bun_mgdL",
  "urea nitrogen":              "bun_mgdL",

  "alkaline phosphatase":       "alkPhos_UL",
  "alk phos":                   "alkPhos_UL",
  "alp":                        "alkPhos_UL",

  "total bilirubin":            "totalBilirubin_mgdL",
  "bilirubin total":            "totalBilirubin_mgdL",
  "bilirubin, total":           "totalBilirubin_mgdL",

  "sodium":                     "sodium_mmolL",
  "na":                         "sodium_mmolL",

  "potassium":                  "potassium_mmolL",
  "k":                          "potassium_mmolL",

  "total cholesterol":          "totalCholesterol_mgdL",
  "cholesterol, total":         "totalCholesterol_mgdL",
  "cholesterol total":          "totalCholesterol_mgdL",

  "non-hdl":                    "nonHDL_mgdL",
  "non hdl":                    "nonHDL_mgdL",
  "non-hdl cholesterol":        "nonHDL_mgdL",

  "uric acid":                  "uricAcid_mgdL",

  "ferritin":                   "ferritin_ngmL",

  "tsh":                        "tsh_uIUmL",
  "thyroid stimulating hormone":"tsh_uIUmL",

  "testosterone":               "testosterone_ngdL",
  "testosterone, total":        "testosterone_ngdL",

  "free testosterone":          "freeTesto_pgmL",

  "dhea-s":                     "dhea_s_ugdL",
  "dhea sulfate":               "dhea_s_ugdL",

  "igf-1":                      "igf1_ngmL",
  "insulin-like growth factor": "igf1_ngmL",

  "fasting insulin":            "fastingInsulin_uIUmL",
  "insulin":                    "fastingInsulin_uIUmL",

  "omega-3 index":              "omega3Index_pct",

  "homocysteine":               "homocysteine_umolL",

  "cortisol":                   "cortisol_ugdL",

  // ESR
  "esr":                        "esr_mmhr",
  "erythrocyte sedimentation":  "esr_mmhr",
  "sed rate":                   "esr_mmhr",
}

/** Case-insensitive lookup — trims whitespace before comparing. */
export function lookupMarker(rawName: string): string | null {
  const normalized = rawName.toLowerCase().trim()
  return MARKER_MAP[normalized] ?? null
}

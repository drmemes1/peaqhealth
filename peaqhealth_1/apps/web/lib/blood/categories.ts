import { MARKERS } from "./marker-content"
import { BLOOD_MARKER_REGISTRY, type MarkerCategory } from "./markerRegistry"

export interface BloodCategory {
  key: string
  name: string
  description: string
  markerKeys: string[]
  headlineMarker: string
  narrative: (data: Record<string, number | null>) => string
}

// ── Curated narratives for the categories users see most often ──────────────
// Each entry's `markerKeys` is automatically extended below to include every
// registry marker primary-categorized to that group. The narrative + headline
// + description stay hand-tuned for the high-traffic categories.

const CURATED: Record<string, Omit<BloodCategory, "markerKeys"> & { matchRegistry: MarkerCategory[] }> = {
  heart: {
    key: "heart",
    name: "Heart",
    description: "Cholesterol, lipids, and inflammatory markers linked to cardiovascular health.",
    matchRegistry: ["lipids", "inflammation"],
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
  metabolic: {
    key: "metabolic",
    name: "Metabolic",
    description: "Blood sugar, insulin, and metabolic markers.",
    matchRegistry: ["metabolic"],
    headlineMarker: "hba1c_percent",
    narrative: d => {
      if (d.glucose_mgdl == null && d.hba1c_percent == null) return "Your metabolic markers haven't been measured yet."
      const g = d.glucose_mgdl; const h = d.hba1c_percent
      return `${g != null ? `Fasting glucose at ${g} mg/dL${g >= 100 ? " is at the threshold researchers watch" : " is in the normal range"}.` : ""} ${h != null ? `HbA1c at ${h}% gives a 3-month average.` : "Adding HbA1c would give a 3-month blood sugar picture."}`
    },
  },
  kidney: {
    key: "kidney",
    name: "Kidney",
    description: "Filtration, waste clearance, and electrolyte balance.",
    matchRegistry: ["kidney"],
    headlineMarker: "egfr_mlmin",
    narrative: d => d.egfr_mlmin != null
      ? `Your eGFR at ${d.egfr_mlmin} mL/min${Number(d.egfr_mlmin) >= 90 ? " shows healthy filtration" : " is worth monitoring"}. Creatinine and BUN provide supporting context.`
      : "Your kidney markers haven't been measured yet.",
  },
  liver: {
    key: "liver",
    name: "Liver",
    description: "Hepatic enzymes and proteins reflecting liver function.",
    matchRegistry: ["liver"],
    headlineMarker: "alt_ul",
    narrative: d => d.alt_ul != null
      ? `ALT at ${d.alt_ul} U/L and AST at ${d.ast_ul ?? "—"} U/L${Number(d.alt_ul) <= 33 ? " are both in the normal range" : " — worth reviewing with your doctor"}.`
      : "Your liver markers haven't been measured yet.",
  },
  cbc: {
    key: "cbc",
    name: "Blood cells",
    description: "Red cells, hemoglobin, and platelet counts.",
    matchRegistry: ["blood_count"],
    headlineMarker: "hemoglobin_gdl",
    narrative: d => d.hemoglobin_gdl != null
      ? `Hemoglobin at ${d.hemoglobin_gdl} g/dL. Red cell metrics give context on oxygen-carrying capacity and iron status.`
      : "Your CBC markers haven't been measured yet.",
  },
  immune: {
    key: "immune",
    name: "Immune",
    description: "White blood cell counts and differential.",
    matchRegistry: ["immune"],
    headlineMarker: "wbc_thousand_ul",
    narrative: d => d.wbc_thousand_ul != null
      ? `WBC at ${d.wbc_thousand_ul} K/µL${Number(d.wbc_thousand_ul) >= 4.5 && Number(d.wbc_thousand_ul) <= 11 ? " is in the normal range" : " is outside the typical range"}.`
      : "Your immune markers haven't been measured yet.",
  },
  electrolytes: {
    key: "electrolytes",
    name: "Electrolytes",
    description: "Sodium, potassium, calcium, and acid–base balance.",
    matchRegistry: ["electrolytes"],
    headlineMarker: "sodium_mmoll",
    narrative: d => d.sodium_mmoll != null
      ? `Sodium ${d.sodium_mmoll} mmol/L, potassium ${d.potassium_mmoll ?? "—"}, calcium ${d.calcium_mgdl ?? "—"} mg/dL.`
      : "Your electrolyte markers haven't been measured yet.",
  },
  nutrients: {
    key: "nutrients",
    name: "Nutrients",
    description: "Vitamins, minerals, and iron studies.",
    matchRegistry: ["nutrients"],
    headlineMarker: "vitamin_d_ngml",
    narrative: d => d.vitamin_d_ngml != null
      ? `Vitamin D at ${d.vitamin_d_ngml} ng/mL${Number(d.vitamin_d_ngml) >= 40 ? " is in the optimal range" : " is worth supplementing"}.`
      : "Your nutritional markers haven't been measured yet. Vitamin D is one of the most impactful to check.",
  },
  hormones: {
    key: "hormones",
    name: "Hormones",
    description: "Sex hormones, binding proteins, and adrenal markers.",
    matchRegistry: ["hormones"],
    headlineMarker: "testosterone_total_ngdl",
    narrative: d => d.testosterone_total_ngdl != null
      ? `Total testosterone at ${d.testosterone_total_ngdl} ng/dL. SHBG, free testosterone, and DHEA-S provide context.`
      : "Your hormone panel hasn't been measured yet.",
  },
  thyroid: {
    key: "thyroid",
    name: "Thyroid",
    description: "Metabolic regulation, energy, and heart rate.",
    matchRegistry: ["thyroid"],
    headlineMarker: "tsh_uiuml",
    narrative: d => d.tsh_uiuml != null
      ? `TSH at ${d.tsh_uiuml} µIU/mL${Number(d.tsh_uiuml) >= 0.45 && Number(d.tsh_uiuml) <= 4.5 ? " is in the normal range" : " is outside typical — this can affect HRV and how we read your sleep data"}.`
      : "Your thyroid markers haven't been measured yet.",
  },
  stress_aging: {
    key: "stress_aging",
    name: "Stress & Aging",
    description: "Cortisol and longevity markers.",
    matchRegistry: ["stress_aging"],
    headlineMarker: "cortisol_ugdl",
    narrative: d => d.cortisol_ugdl != null
      ? `Cortisol at ${d.cortisol_ugdl} µg/dL. Pairs with HRV and sleep architecture for full stress-system context.`
      : "Your stress / aging markers haven't been measured yet.",
  },
  advanced_lipids: {
    key: "advanced_lipids",
    name: "Advanced Lipids (NMR)",
    description: "Particle subclasses, apolipoproteins, and advanced cardiovascular markers.",
    matchRegistry: ["advanced_lipids"],
    headlineMarker: "ldl_particle_number_nmoll",
    narrative: d => d.ldl_particle_number_nmoll != null
      ? `LDL particle number at ${d.ldl_particle_number_nmoll} nmol/L. Particle count adds resolution beyond LDL-C alone.`
      : "Advanced lipid testing (NMR LipoProfile, particle subclasses) hasn't been run yet.",
  },
  advanced_nutrients: {
    key: "advanced_nutrients",
    name: "Omega & Methylation",
    description: "Omega-3/6 fatty acids and methylation markers (MMA).",
    matchRegistry: ["advanced_nutrients"],
    headlineMarker: "omega3_total_percent",
    narrative: d => d.omega3_total_percent != null
      ? `Omega-3 total at ${d.omega3_total_percent}%. Higher EPA + DHA correlates with cardiovascular and cognitive outcomes.`
      : "Omega-3 / methylation markers haven't been measured yet.",
  },
  advanced_thyroid: {
    key: "advanced_thyroid",
    name: "Thyroid Antibodies",
    description: "Autoimmune thyroid markers (TPO, Tg antibodies).",
    matchRegistry: ["advanced_thyroid"],
    headlineMarker: "tpo_antibodies_iuml",
    narrative: d => d.tpo_antibodies_iuml != null
      ? `TPO antibodies at ${d.tpo_antibodies_iuml} IU/mL. Helps distinguish autoimmune from non-autoimmune thyroid patterns.`
      : "Thyroid antibodies haven't been measured yet.",
  },
  heavy_metals: {
    key: "heavy_metals",
    name: "Heavy Metals",
    description: "Mercury and lead exposure markers.",
    matchRegistry: ["heavy_metals"],
    headlineMarker: "mercury_ugl",
    narrative: d => d.mercury_ugl != null
      ? `Mercury at ${d.mercury_ugl} µg/L. Sources include large fish; reducing intake lowers levels over months.`
      : "Heavy metal markers haven't been measured yet.",
  },
  male_health: {
    key: "male_health",
    name: "Prostate / Male Health",
    description: "PSA panel and male reproductive markers.",
    matchRegistry: ["male_health"],
    headlineMarker: "psa_total_ngml",
    narrative: d => d.psa_total_ngml != null
      ? `Total PSA at ${d.psa_total_ngml} ng/mL. Free PSA % gives additional benign-vs-pathologic context.`
      : "Prostate markers haven't been measured yet.",
  },
  pancreas: {
    key: "pancreas",
    name: "Pancreas",
    description: "Pancreatic enzyme markers.",
    matchRegistry: ["pancreas"],
    headlineMarker: "lipase_ul",
    narrative: d => d.lipase_ul != null
      ? `Lipase at ${d.lipase_ul} U/L. Elevated levels can indicate pancreatic stress.`
      : "Pancreatic markers haven't been measured yet.",
  },
}

// Build the final BLOOD_CATEGORIES list. Each entry's markerKeys is the union
// of every registry marker whose primary category matches matchRegistry. This
// guarantees no registry marker is invisible to the panel UI.

function buildCategories(): BloodCategory[] {
  const result: BloodCategory[] = []
  const claimed = new Set<string>()
  for (const cur of Object.values(CURATED)) {
    const markerKeys = BLOOD_MARKER_REGISTRY
      .filter(m => cur.matchRegistry.includes(m.categories[0] as MarkerCategory))
      .map(m => m.id)
    for (const k of markerKeys) claimed.add(k)
    if (markerKeys.length === 0) continue
    result.push({
      key: cur.key,
      name: cur.name,
      description: cur.description,
      markerKeys,
      headlineMarker: cur.headlineMarker,
      narrative: cur.narrative,
    })
  }
  // Sweep up any registry markers not picked up by a curated category — show
  // them under "Other" rather than dropping them silently.
  const orphans = BLOOD_MARKER_REGISTRY.filter(m => !claimed.has(m.id))
  if (orphans.length > 0) {
    result.push({
      key: "other",
      name: "Other",
      description: "Additional markers from your panel.",
      markerKeys: orphans.map(m => m.id),
      headlineMarker: orphans[0].id,
      narrative: () => "Additional markers from your panel.",
    })
  }
  return result
}

export const BLOOD_CATEGORIES: BloodCategory[] = buildCategories()

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

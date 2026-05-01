/**
 * Blood marker registry — the single source of truth.
 *
 * Every blood-marker concern downstream (database column name, parser
 * extraction key, TypeScript field name, UI route validation, scoring
 * input lookup) reads from this list. Adding a new marker is one row
 * here plus a generated migration; nothing else needs to know.
 *
 * See ADR-0020 (docs/decisions/0020-blood-marker-registry-architecture.md)
 * for the architecture decision; see
 * docs/architecture/blood-markers-current-state.md for the audit that
 * motivated this rewrite.
 *
 * IDs in this list ARE the database column names. snake_case with a
 * unit suffix where the unit varies between labs (`ldl_mgdl`,
 * `hs_crp_mgl`, `egfr_mlmin`). The schema-sync test
 * (apps/web/lib/blood/__tests__/registry-schema-sync.test.ts) reads the
 * latest blood_results migration and asserts the column list matches
 * registry IDs exactly. The build fails if they diverge — that's the
 * "no drift possible" guarantee.
 */

// ── Categories ──────────────────────────────────────────────────────────────

export type MarkerCategory =
  | "blood_count"
  | "electrolytes"
  | "hormones"
  | "lipids"
  | "inflammation"
  | "immune"
  | "kidney"
  | "liver"
  | "metabolic"
  | "nutrients"
  | "stress_aging"
  | "thyroid"
  | "advanced_lipids"
  | "advanced_nutrients"
  | "advanced_thyroid"
  | "heavy_metals"
  | "male_health"
  | "pancreas"

export type MarkerTier = "standard" | "pro"

export type DerivedFormula = "divide" | "percentage" | "ratio"

export interface DerivedSpec {
  formula: DerivedFormula
  /** Operand marker IDs in formula order. */
  operands: string[]
}

// ── Marker-detail-page metadata (PART 1 of marker-detail rewrite) ──────────
//
// statusBands, favorableDirection, cluster, and descriptor are
// application-level metadata, not schema columns. They drive the
// /dashboard/blood/[marker] page only — no migration impact. The
// schema-sync test still passes because it scans column names, not
// type-level fields.

export type MarkerStatus = "target" | "above" | "below"

/** Voice-compliant range labels — never use "elevated/high/low/concerning". */
export type RangeLabel =
  | "Lower range"
  | "Mid range"
  | "Higher range"
  | "Highest range"
  | "Target range"
  | "Above target"
  | "Below target"

export interface StatusBand {
  /** Lower bound, inclusive. Use Number.NEGATIVE_INFINITY for the lowest band. */
  min: number
  /** Upper bound, exclusive. null = no upper bound (highest band). */
  max: number | null
  status: MarkerStatus
  label: RangeLabel
}

export type FavorableDirection = "lower" | "higher" | "mid"

export type MarkerCluster =
  | "lipid_panel"
  | "metabolic_panel"
  | "thyroid_panel"
  | "kidney_panel"
  | "liver_panel"
  | "cbc_panel"
  | "inflammation_panel"
  | null

export interface MarkerDescriptor {
  /**
   * Short prose for the data-reflection section (1–2 paragraphs).
   * `%VALUE%` is interpolated with the user's numeric value at render time.
   */
  reflection: string
  /** Drawer: "What this measurement reflects." */
  whatItIs: string
  /** Drawer: "What research associates with changes." */
  raisesAndLowers: { raises: string; lowers: string }
  /** Drawer: "What this number alone does not capture." */
  limitations?: string
  /** Drawer: "References." Semicolon-separated formatted citations. */
  references: string
}

export interface BloodMarker {
  /** Database column name. snake_case with unit suffix. */
  id: string
  /** Full human-readable name for UI. */
  displayName: string
  /** Compact form for crowded UI. Optional — falls back to displayName. */
  shortName?: string
  /** Canonical unit the registry expects. Lab PDFs may print other units; the parser stores what was found and surfaces a warning. */
  unit: string
  /** A marker may belong to multiple categories (e.g. calcium ∈ electrolytes ∩ nutrients). */
  categories: MarkerCategory[]
  tier: MarkerTier
  /** Every variant the parser might encounter on a lab report. Fed to the OpenAI prompt; case-insensitive matching. */
  synonyms: string[]
  /**
   * Sanity bounds — "is this a plausible human value or a parsing
   * artifact?" — NOT clinical reference ranges. Generous; we want to
   * catch things like LDL=14 from the Function Health 14-bug, not
   * reject any plausible value.
   */
  validRange: { min: number; max: number }
  /** Set when this marker is computed from other markers if not extracted. */
  derivedFrom?: DerivedSpec
  /** Optional clinical / contextual note (used for UI hovers / methodology). */
  description?: string
  /** True for markers only present in advanced panels (NMR LipoProfile, omega index, etc.). */
  requiresAdvancedTest?: boolean

  // ── Marker-detail-page metadata (optional; populated for high-priority markers in PART 3) ──
  /** Ordered low → high. First band's min should be ≤ validRange.min; last band's max may be null. */
  statusBands?: StatusBand[]
  /** Drives status-pill color logic on the detail page. */
  favorableDirection?: FavorableDirection
  /** Which panel-context cluster this marker belongs to. null = no cluster (renders alone). */
  cluster?: MarkerCluster
  /** Per-marker content for the detail page. Optional — markers without this render with placeholder copy. */
  descriptor?: MarkerDescriptor
}

// ── Registry ────────────────────────────────────────────────────────────────
//
// Ordered roughly by category for readability. Order does NOT matter for
// behavior — every consumer looks up by id.

export const BLOOD_MARKER_REGISTRY: BloodMarker[] = [
  // ─── BLOOD COUNT (CBC) ──────────────────────────────────────────────────
  {
    id: "hemoglobin_gdl",
    displayName: "Hemoglobin",
    shortName: "Hgb",
    unit: "g/dL",
    categories: ["blood_count"],
    tier: "standard",
    synonyms: ["Hemoglobin", "Hgb", "HGB", "HEMOGLOBIN"],
    validRange: { min: 4, max: 25 },
  },
  {
    id: "hematocrit_percent",
    displayName: "Hematocrit",
    shortName: "Hct",
    unit: "%",
    categories: ["blood_count"],
    tier: "standard",
    synonyms: ["Hematocrit", "Hct", "HCT", "HEMATOCRIT"],
    validRange: { min: 15, max: 70 },
  },
  {
    id: "rbc_million_ul",
    displayName: "Red Blood Cell Count",
    shortName: "RBC",
    unit: "million/µL",
    categories: ["blood_count"],
    tier: "standard",
    synonyms: ["RBC", "Red Blood Cell Count", "Erythrocytes"],
    validRange: { min: 1, max: 9 },
  },
  {
    id: "mcv_fl",
    displayName: "Mean Corpuscular Volume",
    shortName: "MCV",
    unit: "fL",
    categories: ["blood_count"],
    tier: "standard",
    synonyms: ["MCV", "Mean Corpuscular Volume"],
    validRange: { min: 50, max: 130 },
  },
  {
    id: "mch_pg",
    displayName: "Mean Corpuscular Hemoglobin",
    shortName: "MCH",
    unit: "pg",
    categories: ["blood_count"],
    tier: "standard",
    synonyms: ["MCH", "Mean Corpuscular Hemoglobin"],
    validRange: { min: 15, max: 45 },
  },
  {
    id: "mchc_gdl",
    displayName: "Mean Corpuscular Hemoglobin Concentration",
    shortName: "MCHC",
    unit: "g/dL",
    categories: ["blood_count"],
    tier: "standard",
    synonyms: ["MCHC", "Mean Corpuscular Hemoglobin Concentration"],
    validRange: { min: 25, max: 40 },
  },
  {
    id: "rdw_percent",
    displayName: "Red Cell Distribution Width",
    shortName: "RDW",
    unit: "%",
    categories: ["blood_count"],
    tier: "standard",
    synonyms: ["RDW", "Red Cell Distribution Width", "RDW-CV"],
    validRange: { min: 8, max: 30 },
  },
  {
    id: "mpv_fl",
    displayName: "Mean Platelet Volume",
    shortName: "MPV",
    unit: "fL",
    categories: ["blood_count"],
    tier: "standard",
    synonyms: ["MPV", "Mean Platelet Volume"],
    validRange: { min: 5, max: 15 },
  },
  {
    id: "platelets_thousand_ul",
    displayName: "Platelets",
    shortName: "PLT",
    unit: "K/µL",
    categories: ["blood_count"],
    tier: "standard",
    synonyms: ["Platelets", "PLT", "Platelet Count"],
    validRange: { min: 50, max: 1000 },
  },

  // ─── IMMUNE (white blood cells) ─────────────────────────────────────────
  {
    id: "wbc_thousand_ul",
    displayName: "White Blood Cell Count",
    shortName: "WBC",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["WBC", "WBC AUTOMATED", "White Blood Cell Count", "Leukocytes"],
    validRange: { min: 1, max: 50 },
  },
  {
    id: "neutrophils_percent",
    displayName: "Neutrophils %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Neutrophils %", "Neutrophil %", "Neut %", "NEUTROPHILS %"],
    validRange: { min: 0, max: 100 },
  },
  {
    id: "neutrophils_thousand_ul",
    displayName: "Neutrophils Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Neutrophils Absolute", "Neut Abs", "Absolute Neutrophils"],
    validRange: { min: 0, max: 30 },
  },
  {
    id: "lymphocytes_percent",
    displayName: "Lymphocytes %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Lymphocytes %", "Lymphs %", "Lymph %", "LYMPHOCYTES %"],
    validRange: { min: 0, max: 100 },
  },
  {
    id: "lymphocytes_thousand_ul",
    displayName: "Lymphocytes Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Lymphocytes Absolute", "Lymphs Abs", "Absolute Lymphocytes"],
    validRange: { min: 0, max: 20 },
  },
  {
    id: "monocytes_percent",
    displayName: "Monocytes %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Monocytes %", "Mono %", "MONOCYTES %"],
    validRange: { min: 0, max: 100 },
  },
  {
    id: "monocytes_thousand_ul",
    displayName: "Monocytes Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Monocytes Absolute", "Mono Abs", "Absolute Monocytes"],
    validRange: { min: 0, max: 10 },
  },
  {
    id: "eosinophils_percent",
    displayName: "Eosinophils %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Eosinophils %", "Eos %", "EOSINOPHILS %"],
    validRange: { min: 0, max: 100 },
  },
  {
    id: "eosinophils_thousand_ul",
    displayName: "Eosinophils Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Eosinophils Absolute", "Eos Abs", "Absolute Eosinophils"],
    validRange: { min: 0, max: 10 },
  },
  {
    id: "basophils_percent",
    displayName: "Basophils %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Basophils %", "Baso %", "BASOPHILS %"],
    validRange: { min: 0, max: 100 },
  },
  {
    id: "basophils_thousand_ul",
    displayName: "Basophils Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Basophils Absolute", "Baso Abs", "Absolute Basophils"],
    validRange: { min: 0, max: 10 },
  },

  // ─── ELECTROLYTES (some also in kidney / nutrients) ─────────────────────
  {
    id: "sodium_mmoll",
    displayName: "Sodium",
    shortName: "Na",
    unit: "mmol/L",
    categories: ["electrolytes", "kidney"],
    tier: "standard",
    synonyms: ["Sodium", "Sodium, Serum", "Na"],
    validRange: { min: 110, max: 170 },
  },
  {
    id: "potassium_mmoll",
    displayName: "Potassium",
    shortName: "K",
    unit: "mmol/L",
    categories: ["electrolytes", "kidney"],
    tier: "standard",
    synonyms: ["Potassium", "Potassium, Serum", "K"],
    validRange: { min: 1.5, max: 9 },
  },
  {
    id: "chloride_mmoll",
    displayName: "Chloride",
    shortName: "Cl",
    unit: "mmol/L",
    categories: ["electrolytes", "kidney"],
    tier: "standard",
    synonyms: ["Chloride", "Cl"],
    validRange: { min: 70, max: 130 },
  },
  {
    id: "carbon_dioxide_mmoll",
    displayName: "Carbon Dioxide",
    shortName: "CO2",
    unit: "mmol/L",
    categories: ["electrolytes"],
    tier: "standard",
    synonyms: ["Carbon Dioxide", "CO2", "Bicarbonate", "HCO3"],
    validRange: { min: 5, max: 50 },
  },
  {
    id: "calcium_mgdl",
    displayName: "Calcium",
    shortName: "Ca",
    unit: "mg/dL",
    categories: ["electrolytes", "nutrients", "kidney"],
    tier: "standard",
    synonyms: ["Calcium", "Ca"],
    validRange: { min: 5, max: 16 },
  },
  {
    id: "magnesium_mgdl",
    displayName: "Magnesium",
    shortName: "Mg",
    unit: "mg/dL",
    categories: ["electrolytes", "nutrients"],
    tier: "standard",
    synonyms: ["Magnesium", "Mg"],
    validRange: { min: 0.5, max: 5 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 1.7, status: "below", label: "Lower range" },
      { min: 1.7, max: 2.4,  status: "target", label: "Target range" },
      { min: 2.4, max: null, status: "above",  label: "Higher range" },
    ],
    favorableDirection: "mid",
    cluster: null,
    descriptor: {
      reflection: "Your magnesium reads %VALUE% mg/dL. Serum magnesium captures only a small fraction of total body magnesium — most of it lives inside cells and bone. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },

  // ─── HORMONES ───────────────────────────────────────────────────────────
  {
    id: "testosterone_total_ngdl",
    displayName: "Testosterone (Total)",
    shortName: "Testosterone",
    unit: "ng/dL",
    categories: ["hormones", "male_health"],
    tier: "standard",
    synonyms: ["Testosterone, Total", "Testosterone Total", "Testosterone, Serum", "Total Testosterone"],
    validRange: { min: 10, max: 2500 },
  },
  {
    id: "testosterone_free_pgml",
    displayName: "Testosterone (Free)",
    shortName: "Free T",
    unit: "pg/mL",
    categories: ["hormones", "male_health"],
    tier: "standard",
    synonyms: ["Testosterone, Free", "Free Testosterone", "Testosterone Free"],
    validRange: { min: 0.1, max: 500 },
  },
  {
    id: "shbg_nmoll",
    displayName: "Sex Hormone Binding Globulin",
    shortName: "SHBG",
    unit: "nmol/L",
    categories: ["hormones", "male_health"],
    tier: "standard",
    synonyms: ["SHBG", "Sex Hormone Binding Globulin"],
    validRange: { min: 1, max: 250 },
  },
  {
    id: "dhea_sulfate_ugdl",
    displayName: "DHEA Sulfate",
    shortName: "DHEA-S",
    unit: "µg/dL",
    categories: ["hormones", "stress_aging", "male_health"],
    tier: "standard",
    synonyms: ["DHEA Sulfate", "DHEA-S", "DHEA-Sulfate", "Dehydroepiandrosterone Sulfate"],
    validRange: { min: 5, max: 1000 },
  },
  {
    id: "estradiol_pgml",
    displayName: "Estradiol",
    shortName: "E2",
    unit: "pg/mL",
    categories: ["hormones", "male_health"],
    tier: "standard",
    synonyms: ["Estradiol", "E2", "Oestradiol"],
    validRange: { min: 0, max: 4000 },
  },
  {
    id: "lh_miuml",
    displayName: "Luteinizing Hormone",
    shortName: "LH",
    unit: "mIU/mL",
    categories: ["hormones", "male_health"],
    tier: "standard",
    synonyms: ["LH", "Luteinizing Hormone"],
    validRange: { min: 0, max: 100 },
  },
  {
    id: "fsh_miuml",
    displayName: "Follicle Stimulating Hormone",
    shortName: "FSH",
    unit: "mIU/mL",
    categories: ["hormones", "male_health"],
    tier: "standard",
    synonyms: ["FSH", "Follicle Stimulating Hormone"],
    validRange: { min: 0, max: 200 },
  },
  {
    id: "prolactin_ngml",
    displayName: "Prolactin",
    shortName: "PRL",
    unit: "ng/mL",
    categories: ["hormones", "male_health"],
    tier: "standard",
    synonyms: ["Prolactin", "PRL"],
    validRange: { min: 0, max: 500 },
  },

  // ─── LIPIDS / HEART ─────────────────────────────────────────────────────
  {
    id: "total_cholesterol_mgdl",
    displayName: "Total Cholesterol",
    shortName: "Total Chol",
    unit: "mg/dL",
    categories: ["lipids"],
    tier: "standard",
    synonyms: ["Total Cholesterol", "Cholesterol, Total", "Cholesterol"],
    validRange: { min: 50, max: 600 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 150, status: "target", label: "Lower range" },
      { min: 150, max: 200, status: "target", label: "Mid range" },
      { min: 200, max: 240, status: "above",  label: "Higher range" },
      { min: 240, max: null, status: "above", label: "Highest range" },
    ],
    favorableDirection: "lower",
    cluster: "lipid_panel",
    descriptor: {
      reflection: "Your total cholesterol reads %VALUE% mg/dL. The breakdown into LDL, HDL, and triglycerides shown in the lipid panel below carries more signal than the total alone. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "ldl_mgdl",
    displayName: "LDL Cholesterol",
    shortName: "LDL",
    unit: "mg/dL",
    categories: ["lipids"],
    tier: "standard",
    synonyms: ["LDL Cholesterol", "LDL", "LDL-C", "LDL Chol", "LDL, Calculated"],
    validRange: { min: 5, max: 500 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 70,  status: "target", label: "Lower range" },
      { min: 70,  max: 100, status: "target", label: "Mid range" },
      { min: 100, max: 160, status: "above",  label: "Higher range" },
      { min: 160, max: null, status: "above", label: "Highest range" },
    ],
    favorableDirection: "lower",
    cluster: "lipid_panel",
    descriptor: {
      reflection:
        "Your LDL cholesterol reads %VALUE% mg/dL. LDL is one of several particle counts oravi tracks alongside ApoB, Lp(a), and HDL — together these give a fuller picture of cardiovascular risk than any single number. The lipid panel context below shows your other lipid markers side-by-side.",
      whatItIs:
        "LDL cholesterol is the cholesterol carried by low-density lipoprotein particles in your bloodstream. Population research has associated higher LDL with cardiovascular events, though the strength of that association depends on particle size, ApoB count, and the presence of other risk factors.",
      raisesAndLowers: {
        raises:
          "Saturated fat intake, refined carbohydrate intake, low fiber intake, and sedentary behavior are associated with higher LDL in observational studies. Genetic variants (familial hypercholesterolemia) can also elevate LDL independently of diet. Some thyroid patterns are associated with LDL changes.",
        lowers:
          "Higher fiber intake, replacing saturated fat with unsaturated fat, regular aerobic exercise, and reaching a healthy body composition are associated with lower LDL in observational and intervention studies. Plant sterols and certain medications (statins) are associated with substantial LDL reduction in randomized trials.",
      },
      limitations:
        "LDL alone does not capture particle number (ApoB) or particle size. Two people with the same LDL can have very different cardiovascular risk profiles depending on these other factors. Lp(a) is a separate, genetically determined particle that LDL does not include.",
      references:
        "Ference BA et al. Eur Heart J 2017 (LDL & cardiovascular disease consensus); Sniderman AD et al. JAMA Cardiol 2019 (ApoB vs LDL-C comparison); Mach F et al. Eur Heart J 2020 (ESC/EAS Guidelines)",
    },
  },
  {
    id: "hdl_mgdl",
    displayName: "HDL Cholesterol",
    shortName: "HDL",
    unit: "mg/dL",
    categories: ["lipids"],
    tier: "standard",
    synonyms: ["HDL Cholesterol", "HDL", "HDL-C", "HDL Chol"],
    validRange: { min: 5, max: 200 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 40, status: "below", label: "Lower range" },
      { min: 40, max: 60,   status: "target", label: "Mid range" },
      { min: 60, max: null, status: "target", label: "Higher range" },
    ],
    favorableDirection: "higher",
    cluster: "lipid_panel",
    descriptor: {
      reflection:
        "Your HDL cholesterol reads %VALUE% mg/dL. HDL is part of the lipid panel and is read in context with LDL, ApoB, and Lp(a) below. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "triglycerides_mgdl",
    displayName: "Triglycerides",
    shortName: "Trig",
    unit: "mg/dL",
    categories: ["lipids"],
    tier: "standard",
    synonyms: ["Triglycerides", "Triglyceride", "TG"],
    validRange: { min: 10, max: 5000 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 100, status: "target", label: "Lower range" },
      { min: 100, max: 150, status: "target", label: "Mid range" },
      { min: 150, max: 200, status: "above",  label: "Higher range" },
      { min: 200, max: null, status: "above", label: "Highest range" },
    ],
    favorableDirection: "lower",
    cluster: "lipid_panel",
    descriptor: {
      reflection: "Your triglycerides read %VALUE% mg/dL. Triglycerides shift more day-to-day than other lipid markers and are sensitive to fasting state. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "total_chol_hdl_ratio",
    displayName: "Total Cholesterol / HDL Ratio",
    shortName: "TC/HDL",
    unit: "ratio",
    categories: ["lipids"],
    tier: "standard",
    synonyms: ["TC/HDL Ratio", "Total Cholesterol / HDL Ratio", "Chol/HDL Ratio", "Cholesterol/HDL Ratio"],
    validRange: { min: 0.5, max: 30 },
    derivedFrom: { formula: "divide", operands: ["total_cholesterol_mgdl", "hdl_mgdl"] },
  },
  {
    id: "lipoprotein_a_mgdl",
    displayName: "Lipoprotein(a)",
    shortName: "Lp(a)",
    unit: "mg/dL",
    categories: ["lipids"],
    tier: "standard",
    synonyms: [
      "Lipoprotein(a)",
      "Lipoprotein (a)",
      "Lipoprotein-a",
      "Lp(a)",
      "Lp (a)",
      "LP(a)",
      "LP (a)",
      "LPA",
      "Lp little a",
      "Lp-a",
      "Lipoprotein a Mass",
      "Lp(a) Mass",
    ],
    validRange: { min: 0, max: 500 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 30, status: "target", label: "Lower range" },
      { min: 30, max: 50,   status: "above",  label: "Mid range" },
      { min: 50, max: null, status: "above",  label: "Higher range" },
    ],
    favorableDirection: "lower",
    cluster: "lipid_panel",
    descriptor: {
      reflection: "Your Lp(a) reads %VALUE% mg/dL. Lp(a) is largely genetically determined and changes little with lifestyle. It carries cardiovascular risk independent of LDL. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "apob_mgdl",
    displayName: "Apolipoprotein B",
    shortName: "ApoB",
    unit: "mg/dL",
    categories: ["lipids"],
    tier: "standard",
    synonyms: ["Apolipoprotein B", "ApoB", "Apo B"],
    validRange: { min: 5, max: 300 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 60,  status: "target", label: "Lower range" },
      { min: 60,  max: 90,  status: "target", label: "Mid range" },
      { min: 90,  max: 120, status: "above",  label: "Higher range" },
      { min: 120, max: null, status: "above", label: "Highest range" },
    ],
    favorableDirection: "lower",
    cluster: "lipid_panel",
    descriptor: {
      reflection: "Your ApoB reads %VALUE% mg/dL. ApoB counts the number of atherogenic particles directly, where LDL is a calculated estimate of their cholesterol cargo. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "hs_crp_mgl",
    displayName: "High Sensitivity C-Reactive Protein",
    shortName: "hs-CRP",
    unit: "mg/L",
    categories: ["lipids", "inflammation"],
    tier: "standard",
    synonyms: ["hs-CRP", "hsCRP", "C-Reactive Protein, HS", "High-Sensitivity CRP", "CRP High Sensitivity"],
    validRange: { min: 0, max: 50 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 1, status: "target", label: "Lower range" },
      { min: 1, max: 3,   status: "above",  label: "Mid range" },
      { min: 3, max: null, status: "above", label: "Higher range" },
    ],
    favorableDirection: "lower",
    cluster: "inflammation_panel",
    descriptor: {
      reflection: "Your hs-CRP reads %VALUE% mg/L. hs-CRP is a sensitive marker of systemic inflammation. Acute illness or recent injury can transiently raise it; the long-run trend is more informative than any single reading. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "homocysteine_umoll",
    displayName: "Homocysteine",
    unit: "µmol/L",
    categories: ["lipids", "inflammation"],
    tier: "standard",
    synonyms: ["Homocysteine"],
    validRange: { min: 0, max: 200 },
  },

  // ─── KIDNEY ─────────────────────────────────────────────────────────────
  {
    id: "creatinine_mgdl",
    displayName: "Creatinine",
    shortName: "Cr",
    unit: "mg/dL",
    categories: ["kidney"],
    tier: "standard",
    synonyms: ["Creatinine", "Creatinine, Serum"],
    validRange: { min: 0.1, max: 20 },
  },
  {
    id: "egfr_mlmin",
    displayName: "Estimated GFR",
    shortName: "eGFR",
    unit: "mL/min/1.73m²",
    categories: ["kidney"],
    tier: "standard",
    synonyms: ["eGFR", "GFR Estimation", "Estimated GFR", "Glomerular Filtration Rate", "eGFR Non-African"],
    validRange: { min: 1, max: 200 },
  },
  {
    id: "bun_mgdl",
    displayName: "Blood Urea Nitrogen",
    shortName: "BUN",
    unit: "mg/dL",
    categories: ["kidney"],
    tier: "standard",
    synonyms: ["BUN", "Blood Urea Nitrogen", "Urea Nitrogen"],
    validRange: { min: 1, max: 200 },
  },
  {
    id: "bun_creatinine_ratio",
    displayName: "BUN / Creatinine Ratio",
    shortName: "BUN/Cr",
    unit: "ratio",
    categories: ["kidney"],
    tier: "standard",
    synonyms: ["BUN/Creatinine Ratio", "BUN/Cr Ratio", "Urea Nitrogen/Creatinine Ratio"],
    validRange: { min: 1, max: 100 },
    derivedFrom: { formula: "divide", operands: ["bun_mgdl", "creatinine_mgdl"] },
  },

  // ─── LIVER ──────────────────────────────────────────────────────────────
  {
    id: "alt_ul",
    displayName: "Alanine Aminotransferase",
    shortName: "ALT",
    unit: "U/L",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["ALT", "ALT (SGPT)", "Alanine Aminotransferase", "SGPT"],
    validRange: { min: 1, max: 2000 },
  },
  {
    id: "ast_ul",
    displayName: "Aspartate Aminotransferase",
    shortName: "AST",
    unit: "U/L",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["AST", "AST (SGOT)", "Aspartate Aminotransferase", "SGOT"],
    validRange: { min: 1, max: 2000 },
  },
  {
    id: "alp_ul",
    displayName: "Alkaline Phosphatase",
    shortName: "ALP",
    unit: "U/L",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["Alkaline Phosphatase", "ALP", "Alk Phos", "ALK PHOS"],
    validRange: { min: 5, max: 2000 },
  },
  {
    id: "ggt_ul",
    displayName: "Gamma-Glutamyl Transferase",
    shortName: "GGT",
    unit: "U/L",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["GGT", "Gamma-Glutamyl Transferase", "Gamma GT", "γ-GT"],
    validRange: { min: 1, max: 2000 },
  },
  {
    id: "total_bilirubin_mgdl",
    displayName: "Total Bilirubin",
    shortName: "T. Bili",
    unit: "mg/dL",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["Total Bilirubin", "Bilirubin, Total", "T. Bili"],
    validRange: { min: 0, max: 50 },
  },
  {
    id: "albumin_gdl",
    displayName: "Albumin",
    unit: "g/dL",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["Albumin", "Albumin, Serum"],
    validRange: { min: 1, max: 7 },
  },
  {
    id: "globulin_gdl",
    displayName: "Globulin",
    unit: "g/dL",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["Globulin"],
    validRange: { min: 0.5, max: 8 },
  },
  {
    id: "total_protein_gdl",
    displayName: "Total Protein",
    unit: "g/dL",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["Total Protein"],
    validRange: { min: 2, max: 12 },
  },
  {
    id: "albumin_globulin_ratio",
    displayName: "Albumin / Globulin Ratio",
    shortName: "A/G",
    unit: "ratio",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["A/G Ratio", "Albumin/Globulin Ratio", "Alb/Glob Ratio"],
    validRange: { min: 0.1, max: 10 },
    derivedFrom: { formula: "divide", operands: ["albumin_gdl", "globulin_gdl"] },
  },

  // ─── METABOLIC ──────────────────────────────────────────────────────────
  {
    id: "glucose_mgdl",
    displayName: "Glucose",
    unit: "mg/dL",
    categories: ["metabolic"],
    tier: "standard",
    synonyms: ["Glucose", "Glucose, Fasting", "Glucose, Serum", "Glucose, Plasma", "Fasting Glucose"],
    validRange: { min: 20, max: 1000 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 85, status: "target", label: "Lower range" },
      { min: 85, max: 100, status: "target", label: "Mid range" },
      { min: 100, max: 126, status: "above",  label: "Higher range" },
      { min: 126, max: null, status: "above", label: "Highest range" },
    ],
    favorableDirection: "lower",
    cluster: "metabolic_panel",
    descriptor: {
      reflection: "Your fasting glucose reads %VALUE% mg/dL. A single fasting reading is a snapshot — HbA1c gives a 3-month average and insulin gives the demand-side picture. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "hba1c_percent",
    displayName: "Hemoglobin A1c",
    shortName: "HbA1c",
    unit: "%",
    categories: ["metabolic"],
    tier: "standard",
    synonyms: ["HbA1c", "Hemoglobin A1c", "A1c", "Glycohemoglobin", "GLYCOHEMOGLOBIN", "Glycated Hemoglobin"],
    validRange: { min: 3, max: 20 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 5.4, status: "target", label: "Lower range" },
      { min: 5.4, max: 5.7,   status: "target", label: "Mid range" },
      { min: 5.7, max: 6.0,   status: "above",  label: "Higher range" },
      { min: 6.0, max: null,  status: "above",  label: "Highest range" },
    ],
    favorableDirection: "lower",
    cluster: "metabolic_panel",
    descriptor: {
      reflection: "Your HbA1c reads %VALUE%%. HbA1c reflects the average blood sugar your red blood cells have seen over the prior 90 days. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "insulin_uiuml",
    displayName: "Insulin",
    unit: "µIU/mL",
    categories: ["metabolic"],
    tier: "standard",
    synonyms: ["Insulin", "Insulin, Fasting", "Fasting Insulin"],
    validRange: { min: 0, max: 1000 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 3, status: "below", label: "Lower range" },
      { min: 3,  max: 7,   status: "target", label: "Mid range" },
      { min: 7,  max: 12,  status: "above",  label: "Higher range" },
      { min: 12, max: null, status: "above", label: "Highest range" },
    ],
    favorableDirection: "mid",
    cluster: "metabolic_panel",
    descriptor: {
      reflection: "Your fasting insulin reads %VALUE% µIU/mL. Insulin pairs with glucose to show how much demand your pancreas is meeting at rest. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "uric_acid_mgdl",
    displayName: "Uric Acid",
    unit: "mg/dL",
    categories: ["metabolic"],
    tier: "standard",
    synonyms: ["Uric Acid"],
    validRange: { min: 0.5, max: 20 },
  },

  // ─── NUTRIENTS ──────────────────────────────────────────────────────────
  {
    id: "vitamin_d_ngml",
    displayName: "Vitamin D (25-OH)",
    shortName: "Vit D",
    unit: "ng/mL",
    categories: ["nutrients"],
    tier: "standard",
    synonyms: ["Vitamin D", "Vitamin D, 25-Hydroxy", "VITAMIN D,25-HYDROXY", "25-Hydroxyvitamin D", "25-OH Vit D", "Vitamin D 25-OH"],
    validRange: { min: 1, max: 200 },
    statusBands: [
      { min: Number.NEGATIVE_INFINITY, max: 30, status: "below", label: "Lower range" },
      { min: 30, max: 50,  status: "target", label: "Mid range" },
      { min: 50, max: 80,  status: "target", label: "Higher range" },
      { min: 80, max: null, status: "above", label: "Highest range" },
    ],
    favorableDirection: "higher",
    cluster: null,
    descriptor: {
      reflection: "Your 25-OH vitamin D reads %VALUE% ng/mL. Levels track sunlight exposure, season, supplementation, and skin type — they shift over weeks, not days. [PLACEHOLDER — needs clinical review]",
      whatItIs: "[PLACEHOLDER — needs clinical review]",
      raisesAndLowers: { raises: "[PLACEHOLDER — needs clinical review]", lowers: "[PLACEHOLDER — needs clinical review]" },
      references: "[PLACEHOLDER — needs clinical review]",
    },
  },
  {
    id: "ferritin_ngml",
    displayName: "Ferritin",
    unit: "ng/mL",
    categories: ["nutrients"],
    tier: "standard",
    synonyms: ["Ferritin", "Ferritin, Serum"],
    validRange: { min: 1, max: 5000 },
  },
  {
    id: "iron_ugdl",
    displayName: "Iron",
    shortName: "Fe",
    unit: "µg/dL",
    categories: ["nutrients"],
    tier: "standard",
    synonyms: ["Iron", "Iron, Serum", "Fe"],
    validRange: { min: 5, max: 500 },
  },
  {
    id: "iron_binding_capacity_ugdl",
    displayName: "Total Iron Binding Capacity",
    shortName: "TIBC",
    unit: "µg/dL",
    categories: ["nutrients"],
    tier: "standard",
    synonyms: ["TIBC", "Total Iron Binding Capacity", "Iron Binding Capacity"],
    validRange: { min: 50, max: 800 },
  },
  {
    id: "iron_saturation_percent",
    displayName: "Iron Saturation",
    shortName: "Fe Sat",
    unit: "%",
    categories: ["nutrients"],
    tier: "standard",
    synonyms: ["Iron Saturation", "Transferrin Saturation", "% Saturation", "Iron % Sat"],
    validRange: { min: 0, max: 100 },
    derivedFrom: { formula: "percentage", operands: ["iron_ugdl", "iron_binding_capacity_ugdl"] },
  },
  {
    id: "zinc_ugdl",
    displayName: "Zinc",
    shortName: "Zn",
    unit: "µg/dL",
    categories: ["nutrients"],
    tier: "standard",
    synonyms: ["Zinc", "Zn"],
    validRange: { min: 10, max: 500 },
  },
  {
    id: "vitamin_b12_pgml",
    displayName: "Vitamin B12",
    shortName: "B12",
    unit: "pg/mL",
    categories: ["nutrients"],
    tier: "standard",
    synonyms: [
      "Vitamin B12",
      "Vitamin B-12",
      "B12",
      "B-12",
      "Cobalamin",
      "VITAMIN B12",
      "VITAMIN B-12",
      "Vitamin B12, Serum",
      "B12, Serum",
      "Methylcobalamin",
    ],
    validRange: { min: 50, max: 5000 },
  },
  {
    id: "folate_ngml",
    displayName: "Folate",
    unit: "ng/mL",
    categories: ["nutrients"],
    tier: "standard",
    synonyms: [
      "Folate",
      "Folic Acid",
      "FOLATE",
      "Folate, Serum",
      "Folate (Folic Acid), Serum",
      "Folate Serum",
      "Vitamin B9",
      "Vitamin B-9",
      "5-Methyltetrahydrofolate",
      "5-MTHF",
    ],
    validRange: { min: 0, max: 50 },
  },

  // ─── STRESS / AGING ─────────────────────────────────────────────────────
  {
    id: "cortisol_ugdl",
    displayName: "Cortisol",
    unit: "µg/dL",
    categories: ["stress_aging"],
    tier: "standard",
    synonyms: ["Cortisol", "Cortisol, Serum"],
    validRange: { min: 0, max: 100 },
  },

  // ─── THYROID ────────────────────────────────────────────────────────────
  {
    id: "tsh_uiuml",
    displayName: "Thyroid Stimulating Hormone",
    shortName: "TSH",
    unit: "µIU/mL",
    categories: ["thyroid"],
    tier: "standard",
    synonyms: ["TSH", "Thyroid Stimulating Hormone", "Thyrotropin"],
    validRange: { min: 0, max: 200 },
  },
  {
    id: "t4_free_ngdl",
    displayName: "Free T4",
    shortName: "fT4",
    unit: "ng/dL",
    categories: ["thyroid"],
    tier: "standard",
    synonyms: ["Free T4", "T4 Free", "Thyroxine Free", "FT4"],
    validRange: { min: 0, max: 10 },
  },
  {
    id: "t3_free_pgml",
    displayName: "Free T3",
    shortName: "fT3",
    unit: "pg/mL",
    categories: ["thyroid"],
    tier: "standard",
    synonyms: ["Free T3", "T3 Free", "Triiodothyronine Free", "FT3"],
    validRange: { min: 0, max: 30 },
  },

  // ─── PRO TIER — INFLAMMATION (ADVANCED) ─────────────────────────────────
  {
    id: "il6_pgml",
    displayName: "Interleukin 6",
    shortName: "IL-6",
    unit: "pg/mL",
    categories: ["inflammation"],
    tier: "pro",
    synonyms: ["IL-6", "Interleukin 6", "Interleukin-6"],
    validRange: { min: 0, max: 1000 },
    requiresAdvancedTest: true,
  },
  {
    id: "nt_probnp_pgml",
    displayName: "NT-proBNP",
    unit: "pg/mL",
    categories: ["inflammation", "advanced_lipids"],
    tier: "pro",
    synonyms: ["NT-proBNP", "NT proBNP", "N-terminal proBNP"],
    validRange: { min: 0, max: 50000 },
    requiresAdvancedTest: true,
  },

  // ─── PRO TIER — ADVANCED LIPIDS (NMR LipoProfile) ───────────────────────
  // ldl_pattern_ab is intentionally deferred — categorical, scope decision.
  {
    id: "ldl_particle_number_nmoll",
    displayName: "LDL Particle Number",
    shortName: "LDL-P",
    unit: "nmol/L",
    categories: ["advanced_lipids"],
    tier: "pro",
    synonyms: ["LDL Particle Number", "LDL-P", "LDL Particles"],
    validRange: { min: 100, max: 5000 },
    requiresAdvancedTest: true,
  },
  {
    id: "ldl_medium_nmoll",
    displayName: "LDL Medium",
    unit: "nmol/L",
    categories: ["advanced_lipids"],
    tier: "pro",
    synonyms: ["LDL Medium", "Medium LDL Particles"],
    validRange: { min: 0, max: 5000 },
    requiresAdvancedTest: true,
  },
  {
    id: "ldl_small_nmoll",
    displayName: "LDL Small",
    unit: "nmol/L",
    categories: ["advanced_lipids"],
    tier: "pro",
    synonyms: ["LDL Small", "Small LDL Particles", "Small Dense LDL"],
    validRange: { min: 0, max: 5000 },
    requiresAdvancedTest: true,
  },
  {
    id: "ldl_peak_size_angstroms",
    displayName: "LDL Peak Size",
    unit: "Å",
    categories: ["advanced_lipids"],
    tier: "pro",
    synonyms: ["LDL Peak Size", "LDL Particle Size", "LDL Size"],
    validRange: { min: 100, max: 350 },
    requiresAdvancedTest: true,
  },
  {
    id: "non_hdl_cholesterol_mgdl",
    displayName: "Non-HDL Cholesterol",
    unit: "mg/dL",
    categories: ["advanced_lipids", "lipids"],
    tier: "pro",
    synonyms: ["Non-HDL Cholesterol", "Non HDL Cholesterol", "Non-HDL"],
    validRange: { min: 5, max: 600 },
    requiresAdvancedTest: true,
  },
  {
    id: "hdl_large_umoll",
    displayName: "HDL Large",
    unit: "µmol/L",
    categories: ["advanced_lipids"],
    tier: "pro",
    synonyms: ["HDL Large", "Large HDL Particles"],
    validRange: { min: 0, max: 50 },
    requiresAdvancedTest: true,
  },

  // ─── PRO TIER — HEAVY METALS ────────────────────────────────────────────
  {
    id: "mercury_ugl",
    displayName: "Mercury",
    shortName: "Hg",
    unit: "µg/L",
    categories: ["heavy_metals"],
    tier: "pro",
    synonyms: [
      "Mercury",
      "Hg",
      "Mercury, Blood",
      "Mercury, Whole Blood",
      "Mercury Blood",
      "Mercury Whole Blood",
      "Mercury (Hg)",
      "Mercury Total",
      "Total Mercury",
      "Hg, Blood",
      "Heavy Metals - Mercury",
    ],
    validRange: { min: 0, max: 200 },
    requiresAdvancedTest: true,
  },
  {
    id: "lead_ugdl",
    displayName: "Lead",
    shortName: "Pb",
    unit: "µg/dL",
    categories: ["heavy_metals"],
    tier: "pro",
    synonyms: [
      "Lead",
      "Pb",
      "Lead, Blood",
      "Lead, Whole Blood",
      "Lead Blood",
      "Lead Whole Blood",
      "Lead (Pb)",
      "Pb, Blood",
      "Blood Lead Level",
      "BLL",
      "Heavy Metals - Lead",
    ],
    validRange: { min: 0, max: 200 },
    requiresAdvancedTest: true,
  },

  // ─── PRO TIER — MALE HEALTH (PSA panel) ─────────────────────────────────
  {
    id: "psa_total_ngml",
    displayName: "PSA (Total)",
    shortName: "PSA",
    unit: "ng/mL",
    categories: ["male_health"],
    tier: "pro",
    synonyms: ["PSA", "Prostate Specific Antigen", "PSA, Total", "Total PSA"],
    validRange: { min: 0, max: 1000 },
    requiresAdvancedTest: true,
  },
  {
    id: "psa_free_ngml",
    displayName: "PSA (Free)",
    unit: "ng/mL",
    categories: ["male_health"],
    tier: "pro",
    synonyms: ["PSA, Free", "Free PSA"],
    validRange: { min: 0, max: 100 },
    requiresAdvancedTest: true,
  },
  {
    id: "psa_free_percent",
    displayName: "PSA Free %",
    unit: "%",
    categories: ["male_health"],
    tier: "pro",
    synonyms: ["PSA Free %", "% Free PSA", "Free PSA %"],
    validRange: { min: 0, max: 100 },
    requiresAdvancedTest: true,
    derivedFrom: { formula: "percentage", operands: ["psa_free_ngml", "psa_total_ngml"] },
  },

  // ─── PRO TIER — PANCREAS ────────────────────────────────────────────────
  {
    id: "lipase_ul",
    displayName: "Lipase",
    unit: "U/L",
    categories: ["pancreas"],
    tier: "pro",
    synonyms: ["Lipase"],
    validRange: { min: 1, max: 5000 },
    requiresAdvancedTest: true,
  },
  {
    id: "amylase_ul",
    displayName: "Amylase",
    unit: "U/L",
    categories: ["pancreas"],
    tier: "pro",
    synonyms: ["Amylase"],
    validRange: { min: 1, max: 5000 },
    requiresAdvancedTest: true,
  },

  // ─── PRO TIER — ADVANCED NUTRIENTS (omega index, MMA) ───────────────────
  {
    id: "mma_nmoll",
    displayName: "Methylmalonic Acid",
    shortName: "MMA",
    unit: "nmol/L",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["MMA", "Methylmalonic Acid", "Methyl Malonic Acid"],
    validRange: { min: 10, max: 100000 },
    requiresAdvancedTest: true,
  },
  {
    id: "omega_check_percent",
    displayName: "OmegaCheck",
    unit: "%",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["OmegaCheck", "Omega Check", "Omega Index"],
    validRange: { min: 0, max: 20 },
    requiresAdvancedTest: true,
  },
  {
    id: "omega3_total_percent",
    displayName: "Omega-3 Total",
    unit: "%",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["Omega-3 Total", "Omega 3 Total", "Total Omega-3"],
    validRange: { min: 0, max: 20 },
    requiresAdvancedTest: true,
  },
  {
    id: "omega3_epa_percent",
    displayName: "Omega-3 EPA",
    unit: "%",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["EPA", "Omega-3 EPA", "Eicosapentaenoic Acid"],
    validRange: { min: 0, max: 15 },
    requiresAdvancedTest: true,
  },
  {
    id: "omega3_dha_percent",
    displayName: "Omega-3 DHA",
    unit: "%",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["DHA", "Omega-3 DHA", "Docosahexaenoic Acid"],
    validRange: { min: 0, max: 15 },
    requiresAdvancedTest: true,
  },
  {
    id: "omega3_dpa_percent",
    displayName: "Omega-3 DPA",
    unit: "%",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["DPA", "Omega-3 DPA", "Docosapentaenoic Acid"],
    validRange: { min: 0, max: 10 },
    requiresAdvancedTest: true,
  },
  {
    id: "omega6_total_percent",
    displayName: "Omega-6 Total",
    unit: "%",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["Omega-6 Total", "Omega 6 Total", "Total Omega-6"],
    validRange: { min: 0, max: 60 },
    requiresAdvancedTest: true,
  },
  {
    id: "omega6_linoleic_acid_percent",
    displayName: "Omega-6 Linoleic Acid",
    unit: "%",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["Linoleic Acid", "Omega-6 Linoleic Acid", "LA"],
    validRange: { min: 0, max: 50 },
    requiresAdvancedTest: true,
  },
  {
    id: "omega6_arachidonic_acid_percent",
    displayName: "Omega-6 Arachidonic Acid",
    unit: "%",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["Arachidonic Acid", "Omega-6 Arachidonic Acid", "AA"],
    validRange: { min: 0, max: 30 },
    requiresAdvancedTest: true,
  },
  {
    id: "omega_6_3_ratio",
    displayName: "Omega 6 / 3 Ratio",
    unit: "ratio",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["Omega 6:3 Ratio", "Omega-6/Omega-3 Ratio", "Omega 6/3"],
    validRange: { min: 0.1, max: 100 },
    requiresAdvancedTest: true,
    derivedFrom: { formula: "ratio", operands: ["omega6_total_percent", "omega3_total_percent"] },
  },
  {
    id: "arachidonic_epa_ratio",
    displayName: "AA / EPA Ratio",
    unit: "ratio",
    categories: ["advanced_nutrients"],
    tier: "pro",
    synonyms: ["AA/EPA Ratio", "Arachidonic Acid/EPA Ratio"],
    validRange: { min: 0.1, max: 100 },
    requiresAdvancedTest: true,
    derivedFrom: { formula: "ratio", operands: ["omega6_arachidonic_acid_percent", "omega3_epa_percent"] },
  },

  // ─── PRO TIER — ADVANCED THYROID (autoantibodies) ───────────────────────
  {
    id: "tg_antibodies_iuml",
    displayName: "Thyroglobulin Antibodies",
    shortName: "TgAb",
    unit: "IU/mL",
    categories: ["advanced_thyroid"],
    tier: "pro",
    synonyms: ["Thyroglobulin Antibodies", "TgAb", "Anti-Thyroglobulin"],
    validRange: { min: 0, max: 10000 },
    requiresAdvancedTest: true,
  },
  {
    id: "tpo_antibodies_iuml",
    displayName: "TPO Antibodies",
    shortName: "TPOAb",
    unit: "IU/mL",
    categories: ["advanced_thyroid"],
    tier: "pro",
    synonyms: ["TPO Antibodies", "Anti-TPO", "Thyroid Peroxidase Antibodies", "Anti-Thyroid Peroxidase"],
    validRange: { min: 0, max: 10000 },
    requiresAdvancedTest: true,
  },
]

// ── Generated TypeScript marker-data type ──────────────────────────────────
// One optional numeric field per registry id. Consumers that want strong
// typing on a row can use `BloodMarkerData[id]`; consumers that want all
// markers can spread.
export type BloodMarkerData = {
  [K in (typeof BLOOD_MARKER_REGISTRY)[number]["id"]]?: number | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const REGISTRY_BY_ID: Map<string, BloodMarker> = new Map(
  BLOOD_MARKER_REGISTRY.map(m => [m.id, m]),
)

export function getMarkerById(id: string): BloodMarker | undefined {
  return REGISTRY_BY_ID.get(id)
}

export function getMarkersByCategory(cat: MarkerCategory): BloodMarker[] {
  return BLOOD_MARKER_REGISTRY.filter(m => m.categories.includes(cat))
}

export function getMarkersByTier(tier: MarkerTier): BloodMarker[] {
  return BLOOD_MARKER_REGISTRY.filter(m => m.tier === tier)
}

export function getDerivedMarkers(): BloodMarker[] {
  return BLOOD_MARKER_REGISTRY.filter(m => !!m.derivedFrom)
}

/** Every database column id, in registry order. The migration column list must match this exactly. */
export function getAllMarkerIds(): string[] {
  return BLOOD_MARKER_REGISTRY.map(m => m.id)
}

/** True iff the given id is a known marker. UI dynamic routes use this for 404 gating. */
export function isKnownMarkerId(id: string): boolean {
  return REGISTRY_BY_ID.has(id)
}

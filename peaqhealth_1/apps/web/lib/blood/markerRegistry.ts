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
    descriptor: {
      reflection: "Your hemoglobin reads %VALUE% g/dL. Hemoglobin is the oxygen-carrying protein inside red cells, and the serum value is the single best read on oxygen-carrying capacity.",
      whatItIs: "Hemoglobin is the oxygen-carrying protein inside red blood cells. The serum value is the single best read on oxygen-carrying capacity. Sustained low values track with fatigue, exercise tolerance loss, and increased mortality risk; sustained high values track with smoking, sleep apnea, and dehydration.",
      raisesAndLowers: {
        raises: "Living at high altitude, smoking, untreated sleep apnea, chronic dehydration, and heavy red-meat intake combined with low iron losses are associated with higher hemoglobin in observational studies.",
        lowers: "Low dietary iron over time, heavy menstrual blood loss, chronic gut inflammation, very high training volume relative to iron intake, and persistent low-grade inflammation are associated with lower hemoglobin in cohort and intervention studies.",
      },
      limitations: "Hemoglobin is sensitive to plasma volume, so hydration and posture before the draw matter. Sex, age, altitude, and smoking shift the baseline. Pair with hematocrit, MCV, and ferritin for a real read.",
      references: "Billett HH. Hemoglobin and Hematocrit. Clinical Methods (NCBI Bookshelf); Patel KV. Semin Hematol 2008 (epidemiology of anemia in older adults)",
    },
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
    descriptor: {
      reflection: "Your hematocrit reads %VALUE% %. Hematocrit is the percentage of blood volume taken up by red cells; it tracks closely with hemoglobin but is more sensitive to hydration.",
      whatItIs: "Hematocrit is the percentage of blood volume taken up by red cells. It is closely tied to hemoglobin and gives a parallel read on oxygen-carrying capacity. It is particularly sensitive to hydration status, which is its main strength and weakness.",
      raisesAndLowers: {
        raises: "Living at high altitude, smoking, untreated sleep apnea, chronic dehydration, and sustained heavy training in heat without rehydration are associated with higher hematocrit.",
        lowers: "Iron, B12, or folate-poor diet, heavy menstrual losses, plasma-volume expansion from heavy endurance training, persistent inflammation, and heavy alcohol intake are associated with lower hematocrit.",
      },
      limitations: "Hematocrit moves with plasma volume; a thirsty draw and a well-hydrated draw can read very differently. Pair with hemoglobin, MCV, and ferritin to interpret real shifts.",
      references: "Billett HH. Hemoglobin and Hematocrit. Clinical Methods (NCBI Bookshelf); Sarma PR. Red Cell Indices. Clinical Methods (NCBI Bookshelf)",
    },
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
    descriptor: {
      reflection: "Your RBC count reads %VALUE% M/μL. RBC count tracks oxygen-delivery capacity; persistent shifts can flag altitude adaptation, hydration, smoking, or marrow stress.",
      whatItIs: "RBC count is the concentration of red cells per unit of blood. Red cells carry oxygen from lungs to tissues and remove carbon dioxide on the return trip, so the count tracks oxygen-delivery capacity.",
      raisesAndLowers: {
        raises: "Living at high altitude, chronic dehydration, smoking, sleep-disordered breathing such as untreated sleep apnea, and high-volume endurance training in some individuals are associated with higher RBC count.",
        lowers: "Low iron, B12, or folate intake over time, heavy menstrual or other recurring blood losses, plasma-volume expansion from very high training loads, persistent inflammation, and aggressive calorie restriction over months are associated with lower RBC count.",
      },
      limitations: "RBC alone cannot tell why a count is high or low; hemoglobin, hematocrit, MCV, RDW, and ferritin together paint the real picture. Hydration status at the moment of draw shifts the number meaningfully.",
      references: "Sarma PR. Red Cell Indices. Clinical Methods (NCBI Bookshelf); Billett HH. Hemoglobin and Hematocrit. Clinical Methods (NCBI Bookshelf)",
    },
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
    descriptor: {
      reflection: "Your MCV reads %VALUE% fL. MCV is the average size of red blood cells and the workhorse of anemia classification — small cells point toward iron limitation, large cells toward B12, folate, or alcohol effects.",
      whatItIs: "MCV is the average size of red blood cells. It is the workhorse of anemia classification: small cells point toward iron limitation, large cells toward B12, folate, or alcohol effects. For longevity tracking, MCV is a slow-moving but useful read on red-cell production health.",
      raisesAndLowers: {
        raises: "Heavy alcohol intake over months, long-running low intake of B12 or folate, slow thyroid patterns from extreme dieting, smoking, and diets very low in plants and varied protein sources are associated with higher MCV.",
        lowers: "Iron-poor diet over time, heavy menstrual losses, chronic gut inflammation, high endurance training without adequate iron intake, and persistent low-grade inflammation are associated with lower MCV.",
      },
      limitations: "MCV is calculated from RBC and hematocrit and can be skewed by sample handling. It responds slowly, so it lags recent dietary shifts. Pair with RDW, ferritin, and B12 to identify causes.",
      references: "Maner BS, Killeen RB, Moosavi L. Mean Corpuscular Volume. StatPearls; Sarma PR. Red Cell Indices. Clinical Methods (NCBI Bookshelf)",
    },
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
    descriptor: {
      reflection: "Your MCH reads %VALUE% pg. MCH reports the average mass of hemoglobin packed into a single red blood cell — it behaves in lockstep with MCV.",
      whatItIs: "MCH reports the average mass of hemoglobin packed into a single red blood cell. It is a calculated CBC index and behaves in lockstep with MCV, so it primarily helps classify the type of anemia (iron-poor, B12/folate-related, or chronic disease) rather than diagnose anything on its own.",
      raisesAndLowers: {
        raises: "Long-standing low intake of B12 or folate from a restrictive diet, heavy alcohol intake over time, hypothyroid patterns from very low energy intake or extreme dieting, smoking, and pregnancy-related shifts in folate and B12 demand are associated with higher MCH.",
        lowers: "Iron-poor diet over months or years, heavy menstrual losses without dietary iron replacement, chronic gut inflammation that limits iron absorption, very low overall calorie intake for extended periods, and endurance training volumes that outpace dietary iron are associated with lower MCH.",
      },
      limitations: "MCH is a calculated value; it cannot distinguish iron deficiency from B12 or folate issues without MCV, RDW, ferritin, and iron studies. It also moves slowly, so a single reading does not describe recent dietary changes.",
      references: "Sarma PR. Red Cell Indices. Clinical Methods (NCBI Bookshelf); Maner BS, Killeen RB, Moosavi L. Mean Corpuscular Volume. StatPearls",
    },
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
    descriptor: {
      reflection: "Your MCHC reads %VALUE% g/dL. MCHC reports how densely hemoglobin is packed within each red blood cell — most useful as part of a CBC pattern, not in isolation.",
      whatItIs: "MCHC reports how densely hemoglobin is packed within each red blood cell. Unlike MCH, which is mass per cell, MCHC normalizes that mass by cell volume. It is a quality-control index of red-cell production and is most useful as part of a CBC pattern rather than on its own.",
      raisesAndLowers: {
        raises: "Sample handling artifacts such as cold agglutinins or hemolysis, spherocytosis as a non-modifiable cause, and severe dehydration at the time of draw are associated with higher MCHC.",
        lowers: "Long-standing iron deficiency, chronic gut malabsorption, heavy menstrual losses, diets very low in iron-bearing foods, and endurance training volumes that outpace iron intake are associated with lower MCHC.",
      },
      limitations: "MCHC is sensitive to lab artifact more than most CBC indices. A single isolated value should rarely drive interpretation; pair with MCV, MCH, and ferritin.",
      references: "Sarma PR. Red Cell Indices. Clinical Methods (NCBI Bookshelf); Maner BS, Killeen RB, Moosavi L. Mean Corpuscular Volume. StatPearls",
    },
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
    descriptor: {
      reflection: "Your RDW reads %VALUE% %. RDW measures variation in red blood cell size and independently predicts all-cause mortality in cohort data.",
      whatItIs: "RDW measures variation in red blood cell size. Elevated values mean the bone marrow is producing cells of inconsistent size, which often reflects iron, B12, or folate deficiency, or chronic inflammation. RDW independently predicts all-cause mortality across multiple cohorts.",
      raisesAndLowers: {
        raises: "Iron, B12, or folate deficiency, chronic inflammation, recent blood loss with active red-cell regeneration, and some chronic kidney or liver patterns are associated with higher RDW.",
        lowers: "Stable iron, B12, and folate sufficiency from balanced diet, resolution of chronic inflammatory burden, and adequate red-cell production support keep RDW within range.",
      },
      limitations: "RDW is non-specific — many things can elevate it. Pair with MCV, ferritin, B12, and hs-CRP to find the cause. Trends matter more than any single value.",
      references: "Salvagno GL et al. Crit Rev Clin Lab Sci 2015 (RDW: review); Patel KV et al. Arch Intern Med 2009 (RDW and mortality)",
    },
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
    descriptor: {
      reflection: "Your MPV reads %VALUE% fL. MPV measures average platelet size — larger platelets are more reactive and have been linked to cardiovascular events in observational studies.",
      whatItIs: "MPV measures average platelet size. Larger platelets are more reactive and more likely to form clots, and MPV has been studied as an independent predictor of heart attack and stroke in observational cohorts. It is most useful alongside platelet count.",
      raisesAndLowers: {
        raises: "Active inflammation, smoking, excess visceral fat, persistent metabolic syndrome patterns, and recovery from acute platelet consumption are associated with higher MPV.",
        lowers: "Stable lifestyle patterns, regular aerobic exercise, reducing visceral fat, and resolving chronic inflammatory burdens are associated with lower MPV.",
      },
      limitations: "MPV is sensitive to sample-tube anticoagulant and time-to-analysis. A single value should be confirmed before drawing trends. It is most useful in the context of platelet count and other CBC indices.",
      references: "Chu SG et al. J Thromb Haemost 2010 (MPV and cardiovascular risk meta-analysis); Slavka G et al. Arterioscler Thromb Vasc Biol 2011 (MPV in mortality)",
    },
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
    descriptor: {
      reflection: "Your platelets reads %VALUE% K/μL. Platelet count gives a snapshot of clotting capacity and a rough read on bone-marrow output.",
      whatItIs: "Platelets are small cell fragments that initiate blood clotting at sites of injury. The count gives a snapshot of clotting capacity and a rough read on bone-marrow output. Very high or very low values can hint at chronic inflammation, iron status, or marrow stress.",
      raisesAndLowers: {
        raises: "Iron deficiency over months, active or chronic inflammatory conditions, heavy smoking, acute infections, and recovery from significant blood loss are associated with higher platelet counts.",
        lowers: "Heavy alcohol intake, severe vitamin B12 or folate insufficiency, recent viral illness, very intense recent endurance exercise, and chronic liver stress are associated with lower platelet counts.",
      },
      limitations: "A single platelet count cannot distinguish reactive elevations from primary marrow issues, and it can drift with hydration. Pairing it with WBC, hemoglobin, and hs-CRP usually clarifies the cause.",
      references: "Greenberg EM, Kaled ES. Crit Care Nurs Clin North Am 2013 (thrombocytopenia); Schafer AI. NEJM 2004 (thrombocytosis)",
    },
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
    descriptor: {
      reflection: "Your white blood cell count reads %VALUE% K/μL. WBC reflects how hard the immune system is working — chronically elevated levels track with low-grade inflammation and worse cardiometabolic outcomes.",
      whatItIs: "WBC is the total concentration of immune cells in circulation. It rises with infection, inflammation, and stress and falls with marrow stress, severe nutritional deficits, and some infections. As a longevity marker, persistently elevated WBC tracks with low-grade inflammation and worse cardiometabolic outcomes in cohort data.",
      raisesAndLowers: {
        raises: "Smoking, acute infection or recent intense exercise, high persistent psychological stress, excess visceral fat, and acute or chronic inflammatory conditions are associated with higher WBC.",
        lowers: "Quitting smoking, reducing visceral fat, stable sleep and stress patterns, resolving chronic inflammatory burdens, and avoidance of heavy alcohol intake are associated with lower WBC over time.",
      },
      limitations: "WBC moves with time of day, recent meals, and exercise. The differential (neutrophils, lymphocytes) tells more than the total. A single value should not drive interpretation.",
      references: "Ruggiero C et al. Age Ageing 2007 (InCHIANTI study); Madjid M et al. JACC 2004 (leukocyte count and CHD)",
    },
  },
  {
    id: "neutrophils_percent",
    displayName: "Neutrophils %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Neutrophils %", "Neutrophil %", "Neut %", "NEUTROPHILS %"],
    validRange: { min: 0, max: 100 },
    descriptor: {
      reflection: "Your neutrophils % reads %VALUE% %. Neutrophils % expresses the share of WBCs that are neutrophils — best read alongside the absolute neutrophil count.",
      whatItIs: "Neutrophils % expresses the share of WBCs that are neutrophils. It moves whenever any other subset shifts, so it is best read alongside the absolute neutrophil count rather than alone.",
      raisesAndLowers: {
        raises: "Acute infection, smoking, recent intense exercise, and high persistent psychological stress are associated with higher neutrophil percentages.",
        lowers: "Recovery and rest after illness and stable sleep and reduced stress are associated with lower neutrophil percentages.",
      },
      limitations: "Percentage values can swing with shifts in other WBC compartments even when neutrophils themselves are unchanged. Always pair with absolute counts.",
      references: "Boxer LA. ASH Education Book 2012 (approach to neutropenia)",
    },
  },
  {
    id: "neutrophils_thousand_ul",
    displayName: "Neutrophils Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Neutrophils Absolute", "Neut Abs", "Absolute Neutrophils"],
    validRange: { min: 0, max: 30 },
    descriptor: {
      reflection: "Your neutrophils (absolute) reads %VALUE% K/μL. Absolute neutrophil count is the most robust read on the body's first-responder immune compartment.",
      whatItIs: "Neutrophils are the largest WBC subset and the immune system's first responders to bacterial infection and tissue injury. The absolute neutrophil count is the most robust way to read this compartment because percentage values shift when other cell counts change.",
      raisesAndLowers: {
        raises: "Acute infection or recent intense exercise, smoking, sustained psychological stress, acute injury or recent surgery, and excess visceral fat with chronic inflammation are associated with higher neutrophils.",
        lowers: "Recovery and rest after illness, stable sleep and reduced stress, quitting smoking, and avoidance of heavy alcohol intake are associated with lower neutrophil counts.",
      },
      limitations: "Neutrophils swing acutely with infection, exercise, and stress. A single high value without context is rarely meaningful; trends matter.",
      references: "Boxer LA. ASH Education Book 2012 (approach to neutropenia)",
    },
  },
  {
    id: "lymphocytes_percent",
    displayName: "Lymphocytes %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Lymphocytes %", "Lymphs %", "Lymph %", "LYMPHOCYTES %"],
    validRange: { min: 0, max: 100 },
    descriptor: {
      reflection: "Your lymphocytes % reads %VALUE% %. Lymphocytes % expresses the adaptive immune share of total WBCs — derived from the differential and best read alongside absolute counts.",
      whatItIs: "Lymphocytes % expresses the adaptive immune share of total WBCs. It is informative alongside absolute counts; the neutrophil-to-lymphocyte ratio derived from percentages has gathered interest as a coarse inflammation marker.",
      raisesAndLowers: {
        raises: "Recent viral infection and stable rest and recovery patterns are associated with higher lymphocyte percentages.",
        lowers: "Acute infection or stress and sustained heavy training are associated with lower lymphocyte percentages.",
      },
      limitations: "Percentages are derivative and can be misleading when other WBC subsets shift. The neutrophil-to-lymphocyte ratio (NLR) is most useful as a trend, not a single value.",
      references: "Zahorec R. Bratisl Lek Listy 2021 (NLR as a clinically useful biomarker)",
    },
  },
  {
    id: "lymphocytes_thousand_ul",
    displayName: "Lymphocytes Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Lymphocytes Absolute", "Lymphs Abs", "Absolute Lymphocytes"],
    validRange: { min: 0, max: 20 },
    descriptor: {
      reflection: "Your lymphocytes (absolute) reads %VALUE% K/μL. Lymphocytes are the adaptive immune compartment; lower counts in older adults associate with higher mortality.",
      whatItIs: "Lymphocytes are the adaptive immune compartment: T cells, B cells, and NK cells. The absolute lymphocyte count tracks chronic immune state better than the percentage. It tends to drop slowly with age, and lower lymphocyte counts in older adults associate with higher mortality.",
      raisesAndLowers: {
        raises: "Recent viral infection, stable sleep and stress recovery, and smoking in some patterns are associated with higher lymphocyte counts.",
        lowers: "Sustained high stress, heavy chronic alcohol intake, severe and prolonged calorie restriction, recent acute infection or surgery, and aging biology are associated with lower lymphocyte counts.",
      },
      limitations: "Absolute lymphocyte count does not differentiate T, B, and NK cells; flow cytometry is needed for that. Persistent low values warrant follow-up rather than a single anomalous reading.",
      references: "Wenisch C et al. Mech Ageing Dev 2000 (effect of age on lymphocyte function)",
    },
  },
  {
    id: "monocytes_percent",
    displayName: "Monocytes %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Monocytes %", "Mono %", "MONOCYTES %"],
    validRange: { min: 0, max: 100 },
    descriptor: {
      reflection: "Your monocytes % reads %VALUE% %. Monocytes % expresses the monocyte share of total WBCs — most useful in tandem with the absolute count and clinical context.",
      whatItIs: "Monocytes % expresses the monocyte share of total WBCs. It is most useful in tandem with the absolute count and clinical context.",
      raisesAndLowers: {
        raises: "Chronic inflammation, smoking, and recovery from infection are associated with higher monocyte percentages.",
        lowers: "Stable lifestyle and reduced inflammatory burden are associated with lower monocyte percentages.",
      },
      limitations: "Percentages depend on other WBC compartments. Pair with absolute monocyte counts.",
      references: "Ghattas A et al. JACC 2013 (monocytes in coronary artery disease)",
    },
  },
  {
    id: "monocytes_thousand_ul",
    displayName: "Monocytes Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Monocytes Absolute", "Mono Abs", "Absolute Monocytes"],
    validRange: { min: 0, max: 10 },
    descriptor: {
      reflection: "Your monocytes (absolute) reads %VALUE% K/μL. Monocytes are circulating precursors to tissue macrophages; persistent elevations track with chronic inflammation and atherosclerotic activity.",
      whatItIs: "Monocytes are circulating precursors to tissue macrophages. They patrol the bloodstream and migrate into tissues to clear debris and pathogens. Persistent elevations track with chronic inflammation and atherosclerotic activity in cohort studies.",
      raisesAndLowers: {
        raises: "Chronic inflammatory conditions, smoking, recovery from infection, and excess visceral fat are associated with higher monocyte counts.",
        lowers: "Reducing chronic inflammatory burdens, stable lifestyle patterns over time, and quitting smoking are associated with lower monocyte counts.",
      },
      limitations: "Monocytes are heterogeneous (classical, intermediate, non-classical) and the simple count cannot show subset shifts that matter for atherosclerosis.",
      references: "Ghattas A et al. JACC 2013 (monocytes in coronary artery disease and atherosclerosis)",
    },
  },
  {
    id: "eosinophils_percent",
    displayName: "Eosinophils %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Eosinophils %", "Eos %", "EOSINOPHILS %"],
    validRange: { min: 0, max: 100 },
    descriptor: {
      reflection: "Your eosinophils % reads %VALUE% %. Eosinophils % expresses the eosinophil share of total WBCs — most useful in allergic and parasitic contexts.",
      whatItIs: "Eosinophils % expresses the eosinophil share of total WBCs. As with the absolute count, it is most useful in allergic and parasitic contexts.",
      raisesAndLowers: {
        raises: "Active allergic disease, parasitic infection, and recent allergen exposure are associated with higher eosinophil percentages.",
        lowers: "Stable low-allergen environment and reduced acute inflammatory burden are associated with lower eosinophil percentages.",
      },
      limitations: "Percentages are derivative. Read together with absolute eosinophil counts and clinical history.",
      references: "Khoury P et al. Allergy 2014 (eosinophilia)",
    },
  },
  {
    id: "eosinophils_thousand_ul",
    displayName: "Eosinophils Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Eosinophils Absolute", "Eos Abs", "Absolute Eosinophils"],
    validRange: { min: 0, max: 10 },
    descriptor: {
      reflection: "Your eosinophils (absolute) reads %VALUE% K/μL. Eosinophils handle parasitic infections and allergic inflammation; the absolute count is a coarse read on allergic and parasitic burden.",
      whatItIs: "Eosinophils handle parasitic infections and participate in allergic and asthmatic inflammation. The absolute count is a coarse read on allergic and parasitic burden.",
      raisesAndLowers: {
        raises: "Active allergic disease such as asthma or eczema, recent allergen exposure, parasitic infection, and drug-related hypersensitivity are associated with higher eosinophil counts.",
        lowers: "Stable, low-allergen environment and reduced acute inflammatory burden are associated with lower eosinophil counts.",
      },
      limitations: "A single eosinophil value does not distinguish allergic from parasitic causes. Context and clinical history are required.",
      references: "Khoury P et al. Allergy 2014 (eosinophilia: causes and approach to evaluation)",
    },
  },
  {
    id: "basophils_percent",
    displayName: "Basophils %",
    unit: "%",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Basophils %", "Baso %", "BASOPHILS %"],
    validRange: { min: 0, max: 100 },
    descriptor: {
      reflection: "Your basophils % reads %VALUE% %. Basophils % provides limited day-to-day longevity information — like the absolute basophil count.",
      whatItIs: "Basophils % expresses the basophil share of total WBCs. Like the absolute basophil count, it provides limited day-to-day longevity information.",
      raisesAndLowers: {
        raises: "Active allergic conditions and some chronic inflammatory states are associated with higher basophil percentages.",
        lowers: "Acute stress responses and recovery from acute illness can transiently lower basophil percentages.",
      },
      limitations: "Such low numbers make percentage shifts hard to distinguish from assay noise.",
      references: "Siracusa MC et al. Trends Immunol 2013 (new insights into basophil biology)",
    },
  },
  {
    id: "basophils_thousand_ul",
    displayName: "Basophils Absolute",
    unit: "K/µL",
    categories: ["immune"],
    tier: "standard",
    synonyms: ["Basophils Absolute", "Baso Abs", "Absolute Basophils"],
    validRange: { min: 0, max: 10 },
    descriptor: {
      reflection: "Your basophils (absolute) reads %VALUE% K/μL. Basophils are the rarest WBC subset and contribute to acute allergic responses; the absolute count provides limited day-to-day longevity information.",
      whatItIs: "Basophils are the rarest WBC subset and contribute to acute allergic responses. Outside specific contexts, the absolute count provides limited day-to-day longevity information.",
      raisesAndLowers: {
        raises: "Active allergic conditions and some chronic inflammatory states are associated with higher basophil counts.",
        lowers: "Acute stress responses and recovery from acute illness can transiently lower basophil counts.",
      },
      limitations: "Basophils are present in such low numbers that small absolute differences are within assay noise. Trends are rarely informative.",
      references: "Siracusa MC et al. Trends Immunol 2013 (new insights into basophil biology)",
    },
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
    descriptor: {
      reflection: "Your sodium reads %VALUE% mEq/L. Sodium governs extracellular fluid volume and blood pressure; the body defends serum sodium tightly, so out-of-range values usually flag water balance, hormones, or kidney handling.",
      whatItIs: "Sodium is the dominant ion governing extracellular fluid volume, blood pressure, and neural excitability. The body defends serum sodium tightly, so values outside the reference are usually a flag for a real shift in water balance, hormones, or kidney handling.",
      raisesAndLowers: {
        raises: "Persistent dehydration with low fluid intake, diets very high in salt without matched water, and endurance exercise in heat without rehydration are associated with higher sodium.",
        lowers: "Excess plain-water intake during long endurance events, heavy beer drinking with little food, severe diarrhea or vomiting, very low salt intake combined with heavy sweating, and aging with reduced thirst response are associated with lower sodium.",
      },
      limitations: "Sodium is tightly buffered, so out-of-range values almost always reflect water balance, not salt intake per se. Pair it with chloride, BUN, and creatinine.",
      references: "Adrogue HJ, Madias NE. NEJM 2000 (hyponatremia); Spasovski G et al. Eur J Endocrinol 2014 (clinical practice guideline on hyponatraemia)",
    },
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
    descriptor: {
      reflection: "Your potassium reads %VALUE% mEq/L. Potassium sets the resting voltage of cells, especially heart and muscle — even small shifts can affect cardiac rhythm.",
      whatItIs: "Potassium is the dominant intracellular cation and sets the resting voltage of cells, especially heart and muscle. Even small shifts can affect cardiac rhythm, so the body defends serum potassium tightly. It is one of the most important values on a basic metabolic panel.",
      raisesAndLowers: {
        raises: "Severe and prolonged dehydration, untreated chronic kidney function loss, sample hemolysis at draw, and heavy intake of potassium-rich foods combined with kidney impairment are associated with higher potassium.",
        lowers: "Persistent vomiting or diarrhea, diets very low in fruits and vegetables, heavy chronic alcohol intake, endurance exercise in heat without electrolyte replacement, and laxative misuse are associated with lower potassium.",
      },
      limitations: "Hemolyzed samples falsely raise potassium; a redraw is often needed before interpreting an unexpected high. Single readings cannot reflect total-body potassium.",
      references: "Mount DB. UpToDate / NCBI overview (disorders of potassium balance); Weiner ID, Wingo CS. JASN 1997 (hypokalemia)",
    },
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
    descriptor: {
      reflection: "Your chloride reads %VALUE% mEq/L. Chloride is the dominant negative-charge ion in extracellular fluid — rarely interpreted alone; most useful alongside sodium and CO₂.",
      whatItIs: "Chloride is the most abundant negative-charge ion in extracellular fluid and partners with sodium to manage fluid balance, blood pressure, and acid-base status. It is rarely interpreted alone; it is most useful in patterns with sodium and CO₂.",
      raisesAndLowers: {
        raises: "High dietary sodium intake from processed foods, persistent dehydration, severe and prolonged diarrhea, and diets very high in salty cured foods are associated with higher chloride.",
        lowers: "Frequent vomiting, aggressive endurance training in heat without electrolyte replacement, heavy fluid intake without electrolyte balance, and untreated chronic kidney function loss are associated with lower chloride.",
      },
      limitations: "Chloride almost never moves on its own. It is only useful in the context of sodium, CO₂, and clinical state. A single reading is rarely informative.",
      references: "Berend K et al. Eur J Intern Med 2012 (chloride: queen of electrolytes?)",
    },
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
    descriptor: {
      reflection: "Your CO₂ reads %VALUE% mEq/L. Serum CO₂ estimates the bicarbonate buffering reserve and tracks how kidneys and lungs coordinate to keep pH stable.",
      whatItIs: "Serum CO₂ estimates the bicarbonate buffering reserve of the blood. It tracks how the kidneys and lungs are coordinating to keep pH stable. Persistent shifts can flag respiratory patterns, kidney function, or rare metabolic states.",
      raisesAndLowers: {
        raises: "Frequent or persistent vomiting, heavy chronic alcohol intake, sleep-disordered breathing with chronic CO₂ retention, and severe and prolonged calorie restriction are associated with higher CO₂.",
        lowers: "Diet very high in animal protein with little fruit and vegetables, untreated chronic kidney function loss, severe diarrhea, hyperventilation patterns from anxiety, and aggressive endurance training in heat without recovery are associated with lower CO₂.",
      },
      limitations: "Serum CO₂ is a single time-point read on a system that adjusts minute by minute. It does not replace arterial blood gas analysis when acid-base balance is in question. Mild shifts often reflect tube handling rather than physiology.",
      references: "Berend K et al. NEJM 2014 (acid-base disturbances); Adrogue HJ, Madias NE. NEJM 1998 (acid-base disorders)",
    },
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
    descriptor: {
      reflection: "Your calcium reads %VALUE% mg/dL. Serum calcium is tightly controlled by parathyroid hormone, vitamin D, and the kidneys — most circulating calcium is bound to albumin, so corrected calcium is the more interpretable number.",
      whatItIs: "Serum calcium is tightly controlled by parathyroid hormone, vitamin D, and the kidneys. It governs nerve firing, muscle contraction, and bone remodeling. Most circulating calcium is bound to albumin, so corrected calcium is the more interpretable number.",
      raisesAndLowers: {
        raises: "Severe and prolonged dehydration, long bedrest or immobility, and heavy intake of calcium-fortified foods plus a vitamin D-rich diet are associated with higher serum calcium.",
        lowers: "Chronically low vitamin D intake from sun avoidance and low food sources, heavy chronic alcohol intake, diets very low in calcium-bearing foods, severe and prolonged calorie restriction, and persistent gut malabsorption are associated with lower serum calcium.",
      },
      limitations: "Serum calcium does not reflect bone calcium stores. Albumin level shifts the total but not the ionized fraction, so always interpret it alongside albumin. Hormonal context (PTH, vitamin D) is needed to understand persistent shifts.",
      references: "Goltzman D. UpToDate / NCBI overview (hypercalcemia); Schafer AL, Shoback DM. Endotext (NCBI Bookshelf) (hypocalcemia)",
    },
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
      reflection:
        "Your magnesium reads %VALUE% mg/dL. Serum magnesium captures only a small fraction of total body magnesium — most of it lives inside cells and bone. Trends matter more than single values, and pairing with calcium, potassium, and vitamin D gives better context.",
      whatItIs:
        "Magnesium is a cofactor for hundreds of enzymes, including those that handle ATP, DNA repair, and vascular tone. Serum magnesium is only the tip of the iceberg because most magnesium is intracellular, but persistent low serum levels still associate with worse cardiometabolic outcomes in cohort studies.",
      raisesAndLowers: {
        raises:
          "Diets rich in leafy greens, nuts, seeds, and whole grains are associated with higher serum magnesium. Hard tap water in some regions, and reduced gut transit time as in short-term constipation, are also associated with higher values.",
        lowers:
          "Diets low in plants and whole grains, heavy chronic alcohol intake, persistent diarrhea or gut inflammation, high caffeine intake combined with a poor diet, and sustained heavy sweating without dietary replacement are all associated with lower serum magnesium in observational studies.",
      },
      limitations:
        "Serum magnesium can read normal even when intracellular stores are low. A single value cannot describe total-body magnesium status — pair with calcium, potassium, and vitamin D, and watch the trend over time.",
      references:
        "Rosique-Esteban N et al. Nutrients 2018 (dietary magnesium and CVD review); Del Gobbo LC et al. Am J Clin Nutr 2013 (circulating and dietary magnesium meta-analysis); Costello RB et al. Adv Nutr 2016 (dietary supplements and magnesium intakes)",
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
    descriptor: {
      reflection: "Your total testosterone reads %VALUE% ng/dL. Total testosterone is the bulk circulating androgen — the standard first-line value for assessing androgen status in both sexes.",
      whatItIs: "Total testosterone is the bulk circulating androgen, summed across SHBG-bound, albumin-bound, and free fractions. It is the standard first-line value for assessing androgen status. In both sexes, total testosterone tracks with body composition, muscle preservation, libido, and cardiometabolic health.",
      raisesAndLowers: {
        raises: "Regular resistance training, adequate sleep duration, reducing excess body fat, sufficient dietary fat from whole foods, and limiting heavy alcohol intake are associated with higher total testosterone.",
        lowers: "Chronic sleep deprivation, persistent psychological stress, excess visceral adipose tissue, heavy chronic alcohol intake, and severe energy deficit during heavy training are associated with lower total testosterone.",
      },
      limitations: "Total testosterone has strong diurnal and day-to-day variability; a single draw can mislead. Always pair with at least one repeat morning draw, plus SHBG and free testosterone, before drawing conclusions.",
      references: "Bhasin S et al. JCEM 2018 (Endocrine Society guideline); Travison TG et al. JCEM 2017 (harmonized reference ranges); Yeap BB et al. Ann Intern Med 2024 (testosterone and mortality)",
    },
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
    descriptor: {
      reflection: "Your free testosterone reads %VALUE% pg/mL. Free testosterone is the small fraction available to tissues — a flagship longevity marker for body composition, mood, libido, and cardiometabolic health.",
      whatItIs: "Free testosterone is the small fraction not bound to SHBG or albumin and thought to be available to tissues. It can drift independently of total testosterone when SHBG is high or low, which is common with aging, body composition shifts, and metabolic state. It is a flagship longevity marker for body composition, mood, libido, and cardiometabolic health in both sexes.",
      raisesAndLowers: {
        raises: "Regular resistance training, adequate sleep duration and consistent schedule, reducing visceral fat, adequate dietary fat from whole-food sources, and sufficient protein intake to support training are associated with higher free testosterone.",
        lowers: "Chronic sleep deprivation, sustained psychological stress, excess visceral adipose tissue, heavy chronic alcohol intake, and severe energy deficit (especially with high training load) are associated with lower free testosterone.",
      },
      limitations: "Calculated free testosterone depends on the SHBG and albumin assumptions used; equilibrium dialysis is the gold standard. Diurnal variation is large in young men, so morning draws between 7 and 10 a.m. are needed for consistency.",
      references: "Bhasin S et al. JCEM 2018 (Endocrine Society guideline); Vermeulen A et al. JCEM 1999 (free testosterone estimation); Davis SR et al. JCEM 2019 (testosterone in women)",
    },
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
    descriptor: {
      reflection: "Your SHBG reads %VALUE% nmol/L. SHBG is a liver-made carrier that binds testosterone and estradiol — a sensitive read on metabolic and hormonal context.",
      whatItIs: "SHBG is a liver-made carrier that binds testosterone and estradiol in the blood, controlling how much is free to act on tissues. It moves with insulin, thyroid, and estrogen status, so it is also a sensitive read on metabolic and hormonal context.",
      raisesAndLowers: {
        raises: "Improved insulin sensitivity, lower visceral fat, higher dietary fiber and lower refined carbohydrate intake, stable thyroid function, and adequate sleep over time are associated with higher SHBG.",
        lowers: "Insulin resistance and excess visceral fat, high refined carbohydrate intake, heavy chronic alcohol intake, sustained low protein intake in some patterns, and chronic untreated hypothyroid patterns are associated with lower SHBG.",
      },
      limitations: "SHBG is shifted by metabolic and hormonal context, so a value out of range often points to something else (insulin, thyroid, estrogen) rather than SHBG itself. Always interpret alongside testosterone and estradiol.",
      references: "Ding EL et al. NEJM 2009 (SHBG and risk of type 2 diabetes); Hammond GL. J Endocrinol 2016 (plasma steroid-binding proteins)",
    },
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
    descriptor: {
      reflection: "Your DHEA-S reads %VALUE% μg/dL. DHEA-S is one of the most reliable hormonal age markers — the trajectory matters more than any single value.",
      whatItIs: "DHEA-S is an adrenal steroid that acts as a reservoir for downstream sex hormones, particularly testosterone and estradiol. It declines steadily from age 25 onward and is one of the most reliable hormonal age markers. For longevity tracking, the trajectory matters more than any single value.",
      raisesAndLowers: {
        raises: "Stable circadian sleep with consistent timing, regular resistance training and moderate aerobic activity, adequate protein and energy intake during training, reduced chronic psychological stress, and limited alcohol intake are associated with higher DHEA-S.",
        lowers: "Chronic sleep deprivation, sustained high cortisol from psychological stress, heavy alcohol intake over time, severe and prolonged calorie restriction, and sedentary patterns combined with high visceral fat are associated with lower DHEA-S.",
      },
      limitations: "DHEA-S falls naturally with age, so a value should be read against age-specific ranges rather than a single normal band. It does not predict tissue-level androgen or estrogen exposure on its own; downstream hormones are needed for that.",
      references: "Ohlsson C et al. JCEM 2010 (low serum DHEAS and mortality); Cappola AR et al. JCEM 2009 (DHEAS and mortality in older women); Labrie F. Prog Brain Res 2010 (DHEA as source of sex steroids)",
    },
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
    descriptor: {
      reflection: "Your estradiol reads %VALUE% pg/mL. Estradiol is the primary estrogen and a master signal for bone density, vascular tone, metabolic health, and cognitive aging in both sexes.",
      whatItIs: "Estradiol is the primary estrogen and a master signal for bone density, vascular tone, metabolic health, and cognitive aging in both sexes. In premenopausal women it cycles predictably; postmenopause it falls to low single digits. In men, estradiol is produced from testosterone and contributes to bone and brain health.",
      raisesAndLowers: {
        raises: "Excess body fat (which raises aromatization in both sexes), heavy chronic alcohol intake, premenopausal cycle phase variation, and pregnancy in women are associated with higher estradiol.",
        lowers: "Severe energy deficit and very low body fat, high training volume in women (RED-S patterns), chronic sleep deprivation, heavy chronic alcohol intake in some men, and persistent high stress affecting the hypothalamic-pituitary axis are associated with lower estradiol.",
      },
      limitations: "In premenopausal women, day of cycle dominates the value; without cycle context an isolated E2 is uninterpretable. In men and postmenopausal women, ultrasensitive assays are needed because levels are low and standard immunoassays read poorly at the bottom of the range.",
      references: "The Menopause Society 2022 hormone therapy position statement; Cauley JA et al. Curr Osteoporos Rep 2015 (estrogen and bone health in men); Manson JE et al. JAMA 2017 (HRT and mortality)",
    },
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
    descriptor: {
      reflection: "Your LH reads %VALUE% mIU/mL. LH is a pituitary signal that drives the gonads — its pattern against testosterone or estradiol shows where in the feedback loop a hormonal shift originates.",
      whatItIs: "LH is a pituitary signal that drives the gonads. In men it stimulates testosterone production by Leydig cells; in women it triggers ovulation and modulates estrogen and progesterone. The pattern of LH against testosterone or estradiol shows where in the feedback loop a hormonal shift originates.",
      raisesAndLowers: {
        raises: "Aging-related primary gonadal decline, heavy chronic alcohol intake affecting gonadal function, smoking, and severe weight loss in some women are associated with higher LH.",
        lowers: "Severe and prolonged calorie restriction, high training volume relative to energy intake (RED-S pattern), chronic sleep deprivation, high persistent psychological stress, and heavy alcohol intake over time are associated with lower LH.",
      },
      limitations: "LH is pulsatile, so a single draw is a snapshot of a noisy signal. In premenopausal women, day of cycle drives the value. Always interpret with FSH and the relevant sex hormone.",
      references: "Bhasin S et al. JCEM 2018 (testosterone therapy in men); Mountjoy M et al. Br J Sports Med 2018 (RED-S consensus)",
    },
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
    descriptor: {
      reflection: "Your FSH reads %VALUE% mIU/mL. FSH drives gamete production and is the most reliable single marker of menopausal transition in women.",
      whatItIs: "FSH is the pituitary signal that drives gamete production: sperm in men, follicles in women. In women it is also the most reliable single marker of menopausal transition. In men it tracks Sertoli cell function and is used to map fertility patterns.",
      raisesAndLowers: {
        raises: "Aging-related primary gonadal decline, the approach to and arrival at menopause, severe weight loss in some men, and heavy chronic alcohol intake are associated with higher FSH.",
        lowers: "Severe and prolonged calorie restriction, high training load relative to energy intake, chronic sleep deprivation, sustained high stress, and heavy alcohol intake over time are associated with lower FSH.",
      },
      limitations: "FSH is pulsatile and cycle-dependent in women. Without LH, estradiol or testosterone, and clinical context, an FSH alone tells little. Day of menstrual cycle dramatically shifts the value.",
      references: "Harlow SD et al. JCEM 2012 (Stages of Reproductive Aging Workshop); Bhasin S et al. JCEM 2018 (testosterone therapy guideline)",
    },
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
    descriptor: {
      reflection: "Your prolactin reads %VALUE% ng/mL. Prolactin is best known for lactation but has broad effects on reproduction, immune tone, and metabolism.",
      whatItIs: "Prolactin is a pituitary hormone best known for lactation but with broad effects on reproduction, immune tone, and metabolism. Outside pregnancy and breastfeeding, large elevations may signal pituitary issues, while small shifts often reflect stress or sleep state at the time of draw.",
      raisesAndLowers: {
        raises: "Recent stress or anxiety in the hour before draw, recent nipple stimulation or chest exercise, insufficient sleep the night before, and pregnancy and breastfeeding are associated with higher prolactin.",
        lowers: "Stable, sufficient sleep, stable circadian rhythm, and lower psychological stress over time are associated with lower prolactin.",
      },
      limitations: "Prolactin is acutely sensitive to stress; a difficult venipuncture itself can spike it. Best practice is a calm, mid-morning draw, repeated if borderline. Macroprolactin (a biologically inactive complex) can falsely elevate the assay and should be considered when persistently high.",
      references: "Melmed S et al. JCEM 2011 (Endocrine Society hyperprolactinemia guideline)",
    },
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
      reflection:
        "Your total cholesterol reads %VALUE% mg/dL. The breakdown into LDL, HDL, and triglycerides shown in the lipid panel below carries more signal than the total alone. A given total can come from very different mixes of HDL, LDL, and Lp(a).",
      whatItIs:
        "Total cholesterol sums the cholesterol carried across all lipoprotein particles. As a single value it is a coarse cardiovascular signal because it lumps protective HDL with atherogenic ApoB-bearing particles. It is most useful as part of a full lipid panel.",
      raisesAndLowers: {
        raises:
          "Diets high in saturated fat from processed sources, excess body fat (especially visceral), sedentary patterns, heavy chronic alcohol intake, and diets very low in fiber are associated with higher total cholesterol. Genetic patterns such as familial hypercholesterolemia can elevate it independently of diet.",
        lowers:
          "Diets high in soluble fiber from oats, legumes, fruit, and vegetables, replacing saturated fat with mono- and polyunsaturated fats, regular aerobic exercise, reducing visceral fat, and limiting heavy alcohol intake are associated with lower total cholesterol in observational and intervention studies.",
      },
      limitations:
        "Total cholesterol does not show particle composition. ApoB and LDL-C with HDL-C give the actionable picture; a low total cholesterol with adequate HDL is preferred over the same total achieved with high LDL.",
      references:
        "Grundy SM et al. Circulation 2019 (AHA/ACC Multisociety Cholesterol Guideline); Ference BA et al. Eur Heart J 2017 (LDL causes ASCVD: Mendelian randomization)",
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
        "Your HDL cholesterol reads %VALUE% mg/dL. HDL is part of the lipid panel and is read in context with LDL, ApoB, and Lp(a) below. Modern evidence is more nuanced than the old 'good cholesterol' framing — function matters more than mass.",
      whatItIs:
        "HDL-C is cholesterol carried by high-density lipoproteins, traditionally framed as the good cholesterol because higher HDL associates with lower cardiovascular risk in epidemiology. Modern research shows that HDL function — particularly cholesterol efflux capacity — matters more than total mass, and very high HDL is not protective.",
      raisesAndLowers: {
        raises:
          "Regular aerobic exercise, reducing visceral fat, replacing trans and saturated fats with mono- and polyunsaturated fats, quitting smoking, and moderate intake of nuts, olive oil, and fatty fish are associated with higher HDL in observational and intervention studies.",
        lowers:
          "Sedentary patterns, excess visceral fat, smoking, diets high in refined carbohydrates and trans fats, and severe and prolonged calorie restriction in some patterns are associated with lower HDL.",
      },
      limitations:
        "HDL-C does not measure HDL particle function or cholesterol efflux capacity. Genetic elevations of HDL-C do not protect against heart disease, and very high HDL is associated with worse outcomes in some cohorts.",
      references:
        "Madsen CM et al. Eur Heart J 2017 (extreme high HDL-C and mortality); Voight BF et al. Lancet 2012 (Mendelian randomization on HDL); Khera AV et al. NEJM 2014 (cholesterol efflux capacity); Rader DJ, Hovingh GK. Lancet 2014 (HDL and CV disease)",
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
      reflection:
        "Your triglycerides read %VALUE% mg/dL. Triglycerides shift more day-to-day than other lipid markers and are sensitive to fasting state. They are a strong, simple read on insulin sensitivity and metabolic flexibility.",
      whatItIs:
        "Triglycerides are the main fat-energy currency carried in VLDL particles. Fasting triglycerides are a strong, simple read on insulin sensitivity and metabolic flexibility. Persistent elevations track with the small-dense LDL pattern and with cardiovascular risk in cohort data.",
      raisesAndLowers: {
        raises:
          "Diets high in refined carbohydrates and added sugars, heavy chronic alcohol intake, excess visceral fat, sedentary patterns, and eating shortly before the draw are associated with higher triglycerides.",
        lowers:
          "Reducing refined carbohydrate intake, reducing visceral fat, regular aerobic exercise, replacing saturated fat with monounsaturated fat, limiting heavy alcohol intake, and higher intake of omega-3-rich foods such as fatty fish are associated with lower triglycerides in trials and cohort studies.",
      },
      limitations:
        "Triglycerides require a true 12-hour fast for clean interpretation. They have meaningful day-to-day variability, so a single reading should be confirmed before drawing a trend.",
      references:
        "Miller M et al. Circulation 2011 (AHA scientific statement); Nordestgaard BG, Varbo A. Lancet 2014 (triglycerides and CVD); Sarwar N et al. Circulation 2007 (collaborative analysis); Reiner Z. Nat Rev Cardiol 2017 (hypertriglyceridemia and CHD)",
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
    descriptor: {
      reflection: "Your Total Cholesterol / HDL Ratio reads %VALUE% ratio. This ratio summarizes the balance between atherogenic and protective cholesterol fractions in one number.",
      whatItIs: "This ratio summarizes the balance between atherogenic and protective cholesterol fractions in one number. It captures more risk information than total cholesterol alone because it weights HDL into the picture.",
      raisesAndLowers: {
        raises: "Excess visceral fat and insulin resistance, sedentary patterns, diets high in refined carbohydrates, heavy chronic alcohol intake, and smoking are associated with higher total cholesterol / HDL ratios.",
        lowers: "Regular aerobic and resistance exercise, replacing saturated fat with mono- and polyunsaturated fats, reducing visceral fat, diets high in fiber from whole foods, and quitting smoking are associated with lower ratios in observational and intervention studies.",
      },
      limitations: "The ratio still conflates particle types and does not measure ApoB or Lp(a). It is useful as a quick scan but should not replace particle-based markers.",
      references: "Grundy SM et al. Circulation 2019 (AHA/ACC Multisociety Cholesterol Guideline); Ridker PM et al. JAMA 2005 (lipid measures and CHD risk prediction)",
    },
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
      reflection:
        "Your Lp(a) reads %VALUE% mg/dL. Lp(a) is largely genetically determined and changes little with lifestyle. It carries cardiovascular risk independent of LDL, and a single lifetime test is usually sufficient because levels are stable across adulthood.",
      whatItIs:
        "Lp(a) is an LDL-like particle with an apolipoprotein(a) tail. It is genetically determined to a large degree and is independently causal for atherosclerotic and valvular heart disease at higher levels. Because it is largely fixed, Lp(a) is best thought of as a once-in-a-lifetime risk modifier that calibrates how aggressive other lifestyle and lipid targets should be.",
      raisesAndLowers: {
        raises:
          "Genetic patterns at the LPA locus are the dominant determinant. Postmenopausal hormonal shifts in some women and untreated hypothyroid patterns are also associated with higher Lp(a).",
        lowers:
          "Lp(a) is generally not modifiable through lifestyle. Regular aerobic exercise has at most a modest effect, and diet improvements have minimal effect on Lp(a) values.",
      },
      limitations:
        "Lp(a) is reported in mg/dL or nmol/L; the units are not interchangeable. Assays vary in their sensitivity to apolipoprotein(a) isoform size, so trend interpretation should use the same lab. A single test is usually sufficient because levels are stable across adulthood.",
      references:
        "Tsimikas S. JACC 2017 (test in context: Lp(a)); Kronenberg F et al. Eur Heart J 2022 (EAS consensus on Lp(a)); Clarke R et al. NEJM 2009 (Lp(a) genetic variants); Reyes-Soffer G et al. Arterioscler Thromb Vasc Biol 2022 (AHA scientific statement)",
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
      reflection:
        "Your ApoB reads %VALUE% mg/dL. ApoB counts the number of atherogenic particles directly, where LDL is a calculated estimate of their cholesterol cargo. Mendelian randomization shows ApoB is the dominant cholesterol-related driver of atherosclerotic risk.",
      whatItIs:
        "ApoB counts the atherogenic particles in circulation: each VLDL, IDL, LDL, and Lp(a) carries one ApoB molecule, so a single ApoB measurement gives a direct read on particle burden. Mendelian randomization shows ApoB is the dominant cholesterol-related driver of atherosclerotic risk, and it is the lever where every additional decrease produces lower lifetime cardiovascular events.",
      raisesAndLowers: {
        raises:
          "Diets high in saturated and trans fats, excess visceral fat and insulin resistance, sedentary patterns, heavy chronic alcohol intake, and genetic patterns such as familial hypercholesterolemia are associated with higher ApoB.",
        lowers:
          "Replacing saturated fat with mono- and polyunsaturated fats, diets high in soluble fiber from oats, legumes, and fruit, reducing visceral fat, regular aerobic and resistance exercise, and limiting heavy alcohol intake are associated with lower ApoB in observational and intervention studies.",
      },
      limitations:
        "ApoB does not localize plaque or quantify existing burden — coronary calcium scoring or CT angiography do that. ApoB is the rate of new particle exposure, not the accumulated damage from past decades.",
      references:
        "Sniderman AD et al. Circ Cardiovasc Qual Outcomes 2019 (ApoB vs non-HDL-C vs LDL-C); Marston NA et al. JAMA Cardiol 2022 (ApoB-containing lipoproteins and ASCVD); Ference BA et al. JAMA 2019 (Mendelian randomization of ApoB); Behbodikhah J et al. Metabolites 2021 (ApoB in CVD)",
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
      reflection:
        "Your hs-CRP reads %VALUE% mg/L. hs-CRP is a sensitive marker of systemic inflammation. Acute illness or recent injury can transiently raise it; the long-run trend is more informative than any single reading. Two readings two weeks apart, both away from illness, give the real chronic-inflammation read.",
      whatItIs:
        "hs-CRP is the most widely validated read on systemic low-grade inflammation. It rises in response to interleukin-6 and tracks with cardiovascular events, metabolic disease, and all-cause mortality across many cohorts. As a longevity marker, it summarizes the background inflammatory tone the body lives with day to day.",
      raisesAndLowers: {
        raises:
          "Excess visceral fat, recent acute infection or injury, smoking, diets high in ultra-processed foods, sustained sleep deprivation, and persistent gum disease or other chronic infections are associated with higher hs-CRP.",
        lowers:
          "Reducing visceral fat, Mediterranean-style eating patterns, regular aerobic exercise, stable and sufficient sleep, quitting smoking, and resolving chronic inflammatory burdens such as gum disease are associated with lower hs-CRP in trials and cohort studies.",
      },
      limitations:
        "hs-CRP swings sharply with any acute infection or injury, so a single high reading without context is uninterpretable. Two readings two weeks apart, both away from illness, give the real chronic-inflammation read.",
      references:
        "Ridker PM. JACC 2016 (test in context: hs-CRP); Ridker PM et al. NEJM 2000 (CRP and inflammation in CVD prediction); Emerging Risk Factors Collaboration. NEJM 2012 (CRP, fibrinogen, and CVD prediction); Pearson TA et al. Circulation 2003 (AHA/CDC scientific statement)",
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
    descriptor: {
      reflection: "Your homocysteine reads %VALUE% μmol/L. Homocysteine is a methylation marker linked to cardiovascular and cognitive aging; standard cutoffs (under 15) are too lenient — values under 8 are the longevity target.",
      whatItIs: "Homocysteine is an amino acid intermediate in methylation chemistry, recycled by B12, folate, and B6. Persistently elevated homocysteine associates with cardiovascular and cognitive aging, though much of the link is driven by underlying B-vitamin status and kidney function.",
      raisesAndLowers: {
        raises: "Low intake of folate, B12, or B6 from diet, heavy chronic alcohol intake, smoking, high coffee intake combined with low B-vitamin diet, reduced kidney function, and genetic MTHFR variants are associated with higher homocysteine.",
        lowers: "Diets rich in leafy greens, legumes, and whole grains for folate, adequate B12 sources or B12-fortified foods, limiting heavy alcohol intake, quitting smoking, and maintaining kidney function through hydration and stable blood pressure are associated with lower homocysteine.",
      },
      limitations: "Homocysteine reflects B-vitamin status, kidney function, and methylation chemistry together; it cannot identify which of these is driving an elevated value. Pair with B12, folate, creatinine, and eGFR.",
      references: "Smith AD, Refsum H. Annu Rev Nutr 2016 (homocysteine, B vitamins, and cognitive impairment); Humphrey LL et al. Mayo Clin Proc 2008 (homocysteine and CHD meta-analysis); Wald DS et al. BMJ 2002 (homocysteine and CV disease)",
    },
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
    descriptor: {
      reflection: "Your creatinine reads %VALUE% mg/dL. Creatinine is a steady byproduct of muscle metabolism cleared by the kidneys — the most widely used input to eGFR calculations.",
      whatItIs: "Creatinine is a steady byproduct of muscle metabolism, cleared by the kidneys. Its serum level is the most widely used input to eGFR calculations. Because muscle mass shapes the value, very muscular and very low-muscle individuals interpret creatinine differently.",
      raisesAndLowers: {
        raises: "Higher muscle mass, heavy red-meat intake just before the draw, persistent dehydration, reduced kidney filtration, and heavy unaccustomed exercise the day before are associated with higher creatinine.",
        lowers: "Lower muscle mass, severe and prolonged calorie restriction, pregnancy in women, and vegan or very-low-meat diet are associated with lower creatinine.",
      },
      limitations: "Creatinine is a function of muscle production and kidney clearance. A single value cannot tell which is shifting; eGFR adjusts for age and sex but not muscle mass. Cystatin C-based eGFR is more accurate when muscle mass is unusual.",
      references: "Hosten AO. BUN and Creatinine. Clinical Methods (NCBI Bookshelf); Inker LA et al. NEJM 2021 (new creatinine- and cystatin C-based equations)",
    },
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
    descriptor: {
      reflection: "Your eGFR reads %VALUE% mL/min. eGFR estimates how much blood the kidneys filter per minute — the single best read on kidney function over time.",
      whatItIs: "eGFR estimates how much blood the kidneys filter per minute, scaled to body surface area. It is the single best read on kidney function over time. Persistent declines below 60 are clinically important; subtle drift within the normal range can be an early longevity signal.",
      raisesAndLowers: {
        raises: "Recovery from dehydration, stable blood pressure and glycemic control, Mediterranean-style eating patterns, and adequate hydration are associated with higher eGFR.",
        lowers: "Persistent dehydration, long-running poorly controlled blood pressure, long-running poorly controlled blood sugar, smoking, heavy chronic alcohol intake, and diets very high in animal protein over decades are associated with lower eGFR.",
      },
      limitations: "eGFR is calculated from creatinine, age, and sex (and previously race in older equations). Muscle mass affects creatinine, so very muscular or very low-muscle individuals can have biased eGFR. Cystatin C-based eGFR is more accurate when this is an issue.",
      references: "Inker LA et al. NEJM 2021 (new GFR equations without race); Levey AS et al. Ann Intern Med 2009 (GFR estimation); KDIGO 2024 Clinical Practice Guideline for CKD",
    },
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
    descriptor: {
      reflection: "Your BUN reads %VALUE% mg/dL. BUN is the nitrogen carried by urea — the main waste product of protein metabolism — and tracks both protein turnover and kidney clearance.",
      whatItIs: "BUN is the nitrogen carried by urea, the main waste product of protein metabolism. The kidneys filter and excrete urea, so BUN tracks both protein turnover and kidney clearance. It is best interpreted alongside creatinine and eGFR.",
      raisesAndLowers: {
        raises: "Persistent dehydration, diet very high in protein with low fluid intake, reduced kidney filtration, heavy chronic alcohol intake, and recent gut bleeding (clinical context) are associated with higher BUN.",
        lowers: "Adequate hydration, diet very low in protein, severe and prolonged calorie restriction, and liver dysfunction reducing urea synthesis are associated with lower BUN.",
      },
      limitations: "BUN is sensitive to hydration and protein intake, not just kidney function. Pair with creatinine, eGFR, and the BUN/creatinine ratio.",
      references: "Hosten AO. BUN and Creatinine. Clinical Methods (NCBI Bookshelf)",
    },
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
    descriptor: {
      reflection: "Your BUN / Creatinine ratio reads %VALUE% ratio. The BUN/creatinine ratio helps tease apart hydration and protein effects from actual kidney filtration changes.",
      whatItIs: "The BUN-to-creatinine ratio helps tease apart hydration and protein effects from actual kidney filtration changes. A high ratio with normal creatinine often points to dehydration or high protein intake.",
      raisesAndLowers: {
        raises: "Persistent dehydration, diet very high in protein with low fluid intake, recent gut bleeding (clinical context), and heavy chronic alcohol intake are associated with higher BUN/creatinine ratios.",
        lowers: "Adequate hydration, diet very low in protein, and liver dysfunction reducing urea synthesis are associated with lower ratios.",
      },
      limitations: "The ratio is informative only with both numerators in context. It cannot distinguish all causes of high or low ratios on its own.",
      references: "Hosten AO. BUN and Creatinine. Clinical Methods (NCBI Bookshelf)",
    },
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
    descriptor: {
      reflection: "Your ALT reads %VALUE% U/L. ALT is the most liver-specific of the standard panel enzymes — persistent elevations track with metabolic-associated fatty liver, the most common chronic liver problem in adults.",
      whatItIs: "ALT is an enzyme concentrated in liver cells. It leaks into the bloodstream when liver cells are stressed or injured, so it is the most liver-specific of the standard panel enzymes. Persistent elevations track with metabolic-associated fatty liver, the most common chronic liver problem in adults.",
      raisesAndLowers: {
        raises: "Excess visceral fat and metabolic-associated fatty liver, heavy chronic alcohol intake, diets high in refined carbohydrates and added sugars, recent very intense or unaccustomed exercise, and persistent insulin resistance are associated with higher ALT.",
        lowers: "Reducing visceral fat, Mediterranean-style eating patterns, regular aerobic and resistance exercise, limiting heavy alcohol intake, and reducing refined carbohydrate and added-sugar intake are associated with lower ALT in trials.",
      },
      limitations: "ALT can rise temporarily after intense exercise or muscle injury. A single elevation without context warrants a repeat draw a week later. ALT does not indicate liver structure; imaging is needed to assess steatosis or fibrosis.",
      references: "Kwo PY et al. Am J Gastroenterol 2017 (ACG clinical guideline); Prati D et al. Ann Intern Med 2002 (updated healthy ALT ranges)",
    },
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
    descriptor: {
      reflection: "Your AST reads %VALUE% U/L. AST is found in liver, heart, and skeletal muscle — less liver-specific than ALT, so paired AST and ALT readings tell more than either alone.",
      whatItIs: "AST is found in liver, heart, and skeletal muscle. It is less liver-specific than ALT, so paired AST and ALT readings tell more than either alone. The AST/ALT ratio is a rough but useful pattern marker.",
      raisesAndLowers: {
        raises: "Heavy chronic alcohol intake (often AST higher than ALT), recent intense or unaccustomed exercise, excess visceral fat and metabolic-associated fatty liver, and heavy red-meat intake just before the draw are associated with higher AST.",
        lowers: "Reducing visceral fat, limiting heavy alcohol intake, stable training without recent very intense sessions, and Mediterranean-style eating patterns are associated with lower AST.",
      },
      limitations: "AST is not liver-specific; muscle injury and recent intense exercise raise it. A single high reading should be repeated and read against ALT.",
      references: "Kwo PY et al. Am J Gastroenterol 2017 (ACG clinical guideline)",
    },
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
    descriptor: {
      reflection: "Your ALP reads %VALUE% U/L. ALP is found in liver, bone, gut, and placenta — interpretation requires knowing which tissue is the source.",
      whatItIs: "ALP is an enzyme found in liver, bone, gut, and placenta. It rises with bile-duct stress or with active bone remodeling. Interpretation requires knowing which tissue is the source; isoenzyme testing is sometimes needed.",
      raisesAndLowers: {
        raises: "Pregnancy, active bone growth in adolescents, recent fracture healing, heavy alcohol intake over time, and persistent low vitamin D status are associated with higher ALP.",
        lowers: "Adequate vitamin D and calcium status from diet and sunlight, and stable, balanced eating patterns are associated with lower ALP.",
      },
      limitations: "ALP cannot tell whether a high value is from liver or bone without isoenzyme fractionation or paired markers like GGT (a high GGT-ALP pair points to liver).",
      references: "Kwo PY et al. Am J Gastroenterol 2017 (ACG clinical guideline)",
    },
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
    descriptor: {
      reflection: "Your GGT reads %VALUE% U/L. GGT is a liver enzyme sensitive to alcohol exposure, oxidative stress, and metabolic-associated fatty liver — useful for tracking lifestyle response because it moves quickly.",
      whatItIs: "GGT is a liver enzyme sensitive to alcohol exposure, oxidative stress, and metabolic-associated fatty liver. It is one of the more useful single markers for tracking liver lifestyle response because it moves quickly.",
      raisesAndLowers: {
        raises: "Heavy chronic alcohol intake (the most consistent driver), excess visceral fat and metabolic-associated fatty liver, diets high in ultra-processed foods, heavy chronic stress, and smoking are associated with higher GGT.",
        lowers: "Reducing or eliminating alcohol intake, reducing visceral fat, Mediterranean-style eating patterns, regular aerobic exercise, and quitting smoking are associated with lower GGT in trials.",
      },
      limitations: "GGT can rise from non-liver causes including some chronic conditions. A single value should be confirmed with a repeat draw, and persistent elevations warrant an ALT and imaging follow-up.",
      references: "Kunutsor SK et al. Atherosclerosis 2014 (GGT and mortality meta-analysis); Ruttmann E et al. Circulation 2005 (GGT as CV mortality risk factor)",
    },
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
    descriptor: {
      reflection: "Your total bilirubin reads %VALUE% mg/dL. Total bilirubin reflects the balance between red-cell turnover and liver clearance — mildly elevated values are often benign Gilbert's syndrome.",
      whatItIs: "Bilirubin is a breakdown product of red blood cells, processed by the liver and excreted in bile. Total bilirubin reflects the balance between red-cell turnover and liver clearance. Mildly elevated total bilirubin is often benign Gilbert's syndrome.",
      raisesAndLowers: {
        raises: "Fasting and skipping breakfast before draw (in Gilbert's pattern), recent intense exercise, heavy chronic alcohol intake, and recent illness or fever are associated with higher total bilirubin.",
        lowers: "Stable eating patterns and adequate calorie intake, and limiting heavy alcohol intake are associated with lower total bilirubin.",
      },
      limitations: "Direct (conjugated) and indirect (unconjugated) bilirubin must be interpreted separately for any persistent elevation. Total alone cannot distinguish hemolysis from Gilbert's syndrome from biliary obstruction.",
      references: "Strassburg CP. Best Pract Res Clin Gastroenterol 2010 (hyperbilirubinemia syndromes)",
    },
  },
  {
    id: "albumin_gdl",
    displayName: "Albumin",
    unit: "g/dL",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["Albumin", "Albumin, Serum"],
    validRange: { min: 1, max: 7 },
    descriptor: {
      reflection: "Your albumin reads %VALUE% g/dL. Albumin is the dominant blood protein — a long-running marker of nutritional status, inflammation, and liver synthetic function. In older adults, albumin is one of the more robust predictors of all-cause mortality.",
      whatItIs: "Albumin is the dominant blood protein, made by the liver. It is a long-running marker of nutritional status, inflammation, and liver synthetic function. In older adults, albumin is one of the more robust predictors of all-cause mortality, partly because low values mark chronic inflammation.",
      raisesAndLowers: {
        raises: "Persistent dehydration at draw and stable, adequate protein intake over time are associated with higher albumin.",
        lowers: "Severe and prolonged calorie or protein restriction, persistent gut inflammation, chronic inflammatory burdens, liver dysfunction, and aging biology are associated with lower albumin.",
      },
      limitations: "Albumin moves slowly and reflects weeks of physiology. It is sensitive to hydration at the moment of draw, which can mask real shifts in synthesis.",
      references: "Goldwasser P, Feldman J. J Clin Epidemiol 1997 (serum albumin and mortality risk); Corti MC et al. JAMA 1994 (albumin and physical disability in older persons)",
    },
  },
  {
    id: "globulin_gdl",
    displayName: "Globulin",
    unit: "g/dL",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["Globulin"],
    validRange: { min: 0.5, max: 8 },
    descriptor: {
      reflection: "Your globulin reads %VALUE% g/dL. Globulin is the non-albumin protein fraction — dominated by antibodies and transport proteins; tracks immune activity and chronic inflammatory burden.",
      whatItIs: "Globulin is the non-albumin protein fraction, dominated by antibodies and transport proteins. It tracks immune activity and chronic inflammatory burden.",
      raisesAndLowers: {
        raises: "Chronic inflammatory states, long-running infections, and some chronic gut conditions are associated with higher globulin.",
        lowers: "Severe and prolonged calorie restriction and some gut absorption issues are associated with lower globulin.",
      },
      limitations: "Globulin is calculated from total protein minus albumin and cannot identify which specific globulin fractions are elevated. Serum protein electrophoresis is needed for that.",
      references: "O'Connell TX et al. Am Fam Physician 2005 (interpreting serum protein electrophoresis)",
    },
  },
  {
    id: "total_protein_gdl",
    displayName: "Total Protein",
    unit: "g/dL",
    categories: ["liver"],
    tier: "standard",
    synonyms: ["Total Protein"],
    validRange: { min: 2, max: 12 },
    descriptor: {
      reflection: "Your total protein reads %VALUE% g/dL. Total protein reflects nutritional state, hydration, and immune-related globulin production — most useful as a scan; persistent shifts warrant looking at albumin and globulin separately.",
      whatItIs: "Total protein sums albumin and globulins. It reflects nutritional state, hydration, and immune-related globulin production. As a single number it is most useful as a scan: persistent shifts warrant looking at albumin and globulin separately.",
      raisesAndLowers: {
        raises: "Persistent dehydration and some chronic inflammatory states raising globulins are associated with higher total protein.",
        lowers: "Severe and prolonged calorie or protein restriction, persistent gut inflammation reducing absorption, and liver dysfunction reducing albumin synthesis are associated with lower total protein.",
      },
      limitations: "Total protein alone cannot tell which fraction is shifted. Pair with albumin and the albumin/globulin ratio.",
      references: "Kwo PY et al. Am J Gastroenterol 2017 (ACG clinical guideline)",
    },
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
    descriptor: {
      reflection: "Your Albumin / Globulin ratio reads %VALUE% ratio. The albumin-to-globulin ratio summarizes the balance between synthetic protein output and immune-related protein output.",
      whatItIs: "The albumin-to-globulin ratio summarizes the balance between synthetic protein output and immune-related protein output. A persistently low ratio can flag chronic inflammation or low albumin.",
      raisesAndLowers: {
        raises: "Stable nutritional status with normal globulins is associated with higher albumin/globulin ratios.",
        lowers: "Chronic inflammation raising globulins, and low albumin from gut, liver, or nutritional issues are associated with lower ratios.",
      },
      limitations: "The ratio is derivative; persistent shifts warrant looking at albumin and globulin separately.",
      references: "Suh B et al. Cancer Epidemiol Biomarkers Prev 2014 (low A/G ratio and cancer + CV mortality)",
    },
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
      reflection:
        "Your fasting glucose reads %VALUE% mg/dL. A single fasting reading is a snapshot — HbA1c gives a 3-month average and insulin gives the demand-side picture. Even small persistent shifts within the normal range track with cardiovascular and cognitive aging risk.",
      whatItIs:
        "Fasting glucose is a single time-point read on baseline blood sugar. It is paired with HbA1c and insulin to map metabolic state. Even small persistent elevations within the normal range track with cardiovascular and cognitive aging risk in cohort data.",
      raisesAndLowers: {
        raises:
          "Diets high in refined carbohydrates and added sugars, excess visceral fat, sedentary patterns, chronic sleep deprivation, sustained psychological stress, and a recent meal or beverage with calories before the draw are associated with higher fasting glucose.",
        lowers:
          "Reducing refined carbohydrate and added-sugar intake, reducing visceral fat, regular aerobic and resistance exercise, stable and sufficient sleep, and time-restricted eating patterns when sustainable are associated with lower fasting glucose in trials.",
      },
      limitations:
        "Fasting glucose requires a true 12-hour fast and is sensitive to recent stress, sleep, and acute illness. A single reading should be confirmed; HbA1c shows the longer view.",
      references:
        "Tabak AG et al. Lancet 2009 (trajectories of glycaemia and insulin); Selvin E et al. NEJM 2010 (glycated hemoglobin and CV risk); ADA. Diabetes Care 2024 (Standards of Care); Bjornholt JV et al. Diabetes Care 1999 (fasting glucose and CV risk)",
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
      reflection:
        "Your HbA1c reads %VALUE%%. HbA1c reflects the average blood sugar your red blood cells have seen over the prior 90 days. It is one of the most established longevity markers because chronically higher glucose exposure damages vasculature, kidneys, and brain over decades.",
      whatItIs:
        "HbA1c is the share of hemoglobin that has been glycated by glucose over the lifespan of a red blood cell. It summarizes average blood sugar over the past 8 to 12 weeks. It is one of the most established longevity markers because chronically higher glucose exposure damages vasculature, kidneys, and brain over decades.",
      raisesAndLowers: {
        raises:
          "Diets high in refined carbohydrates and added sugars, excess visceral fat and insulin resistance, sedentary patterns, chronic sleep deprivation, sustained psychological stress, and heavy alcohol intake are associated with higher HbA1c.",
        lowers:
          "Reducing refined carbohydrate and added-sugar intake, reducing visceral fat, regular aerobic and resistance exercise, stable and sufficient sleep, time-restricted eating patterns when sustainable, and Mediterranean-style eating are associated with lower HbA1c.",
      },
      limitations:
        "HbA1c is biased by red-cell turnover; conditions that shorten or lengthen red-cell life (iron deficiency, hemolysis, recent blood loss) shift the value independent of glucose. Continuous glucose monitoring shows variability that HbA1c cannot.",
      references:
        "Selvin E et al. NEJM 2010 (HbA1c, diabetes, and CV risk); Khaw KT et al. BMJ 2001 (EPIC-Norfolk); Di Angelantonio E et al. NEJM 2014 (meta-analysis); ADA. Diabetes Care 2024 (Standards of Care)",
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
      reflection:
        "Your fasting insulin reads %VALUE% µIU/mL. Insulin pairs with glucose to show how much demand your pancreas is meeting at rest. Fasting insulin rises before glucose does in the development of insulin resistance, so it is one of the earliest and most actionable longevity markers.",
      whatItIs:
        "Fasting insulin tracks how hard the pancreas is working to keep glucose stable. It rises before glucose does in the development of insulin resistance, so it is one of the earliest and most actionable longevity markers. HOMA-IR (calculated from fasting insulin and glucose) extends the read on insulin resistance.",
      raisesAndLowers: {
        raises:
          "Diets high in refined carbohydrates and added sugars, excess visceral fat, sedentary patterns, chronic sleep deprivation, sustained psychological stress, and heavy alcohol intake are associated with higher fasting insulin.",
        lowers:
          "Reducing refined carbohydrate and added-sugar intake, reducing visceral fat, regular aerobic and resistance exercise, stable and sufficient sleep, time-restricted eating when sustainable, and higher fiber from whole foods are associated with lower fasting insulin in trials.",
      },
      limitations:
        "Fasting insulin requires a true 12-hour fast for clean interpretation. Assays differ in sensitivity, so trend interpretation should use the same lab. A confirmatory repeat is wise before acting on a borderline reading.",
      references:
        "Crofts CAP et al. Diabesity 2015 (hyperinsulinemia as unifying theory); Reaven GM. Diabetes 1988 (Banting Lecture: insulin resistance); Janssen JAMJL. Int J Mol Sci 2021 (hyperinsulinemia in aging and disease); Matthews DR et al. Diabetologia 1985 (HOMA assessment)",
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
    descriptor: {
      reflection: "Your uric acid reads %VALUE% mg/dL. Uric acid links diet, fructose handling, kidney function, and cardiovascular risk — persistent elevations track with metabolic syndrome, hypertension, and cardiovascular events.",
      whatItIs: "Uric acid is the end product of purine metabolism. It is the longevity marker that links diet, fructose handling, kidney function, and cardiovascular risk. Persistent elevations track with metabolic syndrome, hypertension, and cardiovascular events; very low values are unusual and rarely modifiable through lifestyle.",
      raisesAndLowers: {
        raises: "Diets high in fructose (especially from sweetened drinks), heavy chronic alcohol intake (especially beer), diets high in organ meats and shellfish, excess visceral fat, sedentary patterns, and persistent dehydration are associated with higher uric acid.",
        lowers: "Reducing fructose intake from sweetened drinks, limiting heavy alcohol intake, reducing visceral fat, adequate hydration, diets rich in low-fat dairy and vegetables, and regular aerobic exercise are associated with lower uric acid.",
      },
      limitations: "Uric acid varies day to day with diet and hydration. A single value should be confirmed before acting. It does not localize where high uric acid is causing trouble (joints, vessels, kidneys); clinical context is needed.",
      references: "Borghi C et al. J Hypertens 2015 (uric acid and CV/renal disease); Feig DI et al. NEJM 2008 (uric acid and CV risk); Johnson RJ et al. Kidney Int 2013 (uric acid and CKD); Kanbay M et al. Eur J Intern Med 2016 (uric acid in metabolic syndrome)",
    },
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
      reflection:
        "Your 25-OH vitamin D reads %VALUE% ng/mL. Levels track sunlight exposure, season, supplementation, and skin type — they shift over weeks, not days. Vitamin D acts on hundreds of genes involved in bone, immune, and metabolic function.",
      whatItIs:
        "Serum 25-hydroxy vitamin D is the standard read on vitamin D status. It integrates intake, sun exposure, and body fat distribution. Vitamin D acts on hundreds of genes involved in bone, immune, and metabolic function, so persistent insufficiency is a broad longevity flag.",
      raisesAndLowers: {
        raises:
          "Regular safe sun exposure on uncovered skin, diets rich in fatty fish, egg yolks, and fortified foods, lower body fat percentage, and living at lower latitudes are associated with higher vitamin D.",
        lowers:
          "Sun avoidance and minimal outdoor time, living at high latitudes during winter, higher body fat percentage (sequestration), darker skin pigmentation with limited sun, and chronic gut malabsorption are associated with lower vitamin D.",
      },
      limitations:
        "25-hydroxy vitamin D is the storage form; it does not measure the active 1,25-dihydroxy form. It varies seasonally — the same person can read very different values in summer and winter. Repeat testing after each season is informative.",
      references:
        "Holick MF. NEJM 2007 (vitamin D deficiency); Bouillon R et al. Endocr Rev 2019 (skeletal and extraskeletal actions); Manson JE et al. NEJM 2019 (VITAL trial); Holick MF et al. JCEM 2011 (Endocrine Society guideline); Pilz S et al. Anticancer Res 2016 (vitamin D and mortality)",
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
    descriptor: {
      reflection: "Your ferritin reads %VALUE% ng/mL. Ferritin reflects iron stores when inflammation is absent — but it is also an acute-phase reactant; double-edged as a longevity marker.",
      whatItIs: "Ferritin is the body's main iron-storage protein. Serum ferritin reflects total iron stores when inflammation is absent, but it is also an acute-phase reactant that rises with inflammation, infection, and metabolic-associated fatty liver. As a longevity marker it is double-edged: too low marks deficiency; too high often marks inflammation or iron overload.",
      raisesAndLowers: {
        raises: "Heavy red-meat or iron-fortified diet, heavy chronic alcohol intake, excess visceral fat with metabolic-associated fatty liver, active or chronic inflammation, and genetic patterns such as hemochromatosis are associated with higher ferritin.",
        lowers: "Iron-poor diet over months, heavy menstrual blood losses, chronic gut inflammation, frequent blood donation, and high endurance training without dietary replacement are associated with lower ferritin.",
      },
      limitations: "Ferritin rises with inflammation regardless of iron status, so a normal-looking ferritin in the setting of chronic inflammation can mask real iron deficiency. Pair with hs-CRP and iron saturation.",
      references: "WHO. Serum ferritin concentrations for the assessment of iron status (2020); Camaschella C. NEJM 2015 (iron-deficiency anemia); Daru J et al. BJOG 2017 (ferritin thresholds)",
    },
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
    descriptor: {
      reflection: "Your serum iron reads %VALUE% μg/dL. Serum iron is the iron currently in transit between gut, marrow, and tissues — most useful in the company of ferritin, transferrin, and TIBC.",
      whatItIs: "Serum iron is the iron currently bound to transferrin in transit between gut, marrow, and tissues. It varies sharply over the day and with recent meals, so it is most useful in the company of ferritin, transferrin, and TIBC.",
      raisesAndLowers: {
        raises: "Recent iron-rich meal before draw, heavy red-meat diet, genetic patterns such as hemochromatosis, and heavy chronic alcohol intake in some patterns are associated with higher serum iron.",
        lowers: "Iron-poor diet over months, heavy menstrual blood losses, chronic gut inflammation reducing absorption, high endurance training without dietary replacement, and persistent inflammation reducing iron availability are associated with lower serum iron.",
      },
      limitations: "Serum iron has a strong diurnal rhythm and rises after meals; standardize draws to fasting morning. It does not measure iron stores; ferritin does that.",
      references: "Camaschella C. NEJM 2015 (iron-deficiency anemia)",
    },
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
    descriptor: {
      reflection: "Your TIBC reads %VALUE% μg/dL. TIBC reflects the amount of transferrin available to carry iron — completes the iron-status picture alongside ferritin and saturation.",
      whatItIs: "TIBC reflects the amount of transferrin available to carry iron. It rises when the body needs more iron and falls in chronic disease and inflammation. With ferritin and iron saturation, it completes the iron-status picture.",
      raisesAndLowers: {
        raises: "Iron-poor diet over months, heavy menstrual blood losses, and pregnancy are associated with higher TIBC.",
        lowers: "Active or chronic inflammation, persistent low protein intake, heavy chronic alcohol intake in some patterns, and iron overload are associated with lower TIBC.",
      },
      limitations: "TIBC alone is hard to interpret; it is most useful with ferritin and saturation.",
      references: "Camaschella C. NEJM 2015 (iron-deficiency anemia)",
    },
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
    descriptor: {
      reflection: "Your iron saturation reads %VALUE% %. Iron saturation is the fraction of transferrin currently carrying iron — one of the most useful single iron-status markers because it captures supply versus transport capacity.",
      whatItIs: "Iron saturation is the fraction of transferrin currently carrying iron. It is one of the most useful single iron-status markers because it captures the balance between iron supply and the body's transport capacity.",
      raisesAndLowers: {
        raises: "Recent iron-rich meal before draw, genetic patterns such as hemochromatosis, and heavy chronic alcohol intake in some patterns are associated with higher iron saturation.",
        lowers: "Iron-poor diet over months, heavy menstrual blood losses, chronic gut inflammation, and persistent inflammation are associated with lower iron saturation.",
      },
      limitations: "Saturation also has diurnal variability and is affected by recent meals. Pair with ferritin and TIBC for a real read.",
      references: "Camaschella C. NEJM 2015 (iron-deficiency anemia)",
    },
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
    descriptor: {
      reflection: "Your zinc reads %VALUE% μg/dL. Zinc is a structural and catalytic cofactor for hundreds of enzymes — serum zinc is a modest read on status because most zinc is intracellular, but persistently low values track with immune dysfunction.",
      whatItIs: "Zinc is a structural and catalytic cofactor for hundreds of enzymes, including those managing immune signaling, taste, wound healing, and DNA repair. Serum zinc is a modest read on status because most zinc is intracellular, but persistently low values track with immune dysfunction.",
      raisesAndLowers: {
        raises: "Diets rich in oysters, beef, pumpkin seeds, and whole grains, and stable, balanced eating patterns are associated with higher serum zinc.",
        lowers: "Diets very low in animal protein and zinc-rich plants, chronic gut malabsorption, heavy chronic alcohol intake, aging biology, and severe and prolonged calorie restriction are associated with lower serum zinc.",
      },
      limitations: "Serum zinc has limited sensitivity for total-body zinc status. Time of day and recent meals shift it; standardize draws to fasting morning. Persistent low values warrant dietary review.",
      references: "Wessells KR, Brown KH. PLoS One 2012 (global prevalence of zinc deficiency); Prasad AS. Mol Med 2008 (zinc and immune cells)",
    },
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
    descriptor: {
      reflection: "Your vitamin B12 reads %VALUE% pg/mL. B12 is required for red-cell production, neuronal myelin maintenance, and methylation chemistry — deficiency develops slowly and is common in older adults, vegans, and those on long-term acid-suppressing medications.",
      whatItIs: "Serum vitamin B12 (cobalamin) is the standard read on B12 status. B12 is essential for red-cell production, neuronal myelin maintenance, and the methylation chemistry that recycles homocysteine. Persistent insufficiency tracks with macrocytic anemia, peripheral neuropathy, and cognitive decline in older adults.",
      raisesAndLowers: {
        raises: "Diet rich in animal foods (fish, eggs, dairy, meat), B12-fortified plant foods or nutritional yeast, and B12 supplementation are associated with higher serum B12.",
        lowers: "Strict vegan diet without B12-fortified foods, reduced gastric acid production with aging, long-term proton pump inhibitor or H2 blocker use, metformin use over years, chronic gut malabsorption, and pernicious anemia (autoimmune intrinsic factor loss) are associated with lower serum B12.",
      },
      limitations: "Serum B12 is an imperfect measure of tissue B12 status; subclinical deficiency can exist with normal-range serum values. MMA (methylmalonic acid) and homocysteine are more sensitive — pair with these when B12 is low-normal and symptoms suggest deficiency.",
      references: "Stabler SP. NEJM 2013 (vitamin B12 deficiency); Allen LH. Am J Clin Nutr 2009 (B-12 deficiency prevalence); Green R et al. Nat Rev Dis Primers 2017 (vitamin B12 deficiency)",
    },
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
    descriptor: {
      reflection: "Your folate reads %VALUE% ng/mL. Folate is essential for DNA synthesis, red-cell maturation, and the methylation chemistry that recycles homocysteine — deficiency causes macrocytic anemia and elevates cardiovascular and cognitive aging risk.",
      whatItIs: "Serum folate reflects recent dietary folate intake. Folate is essential for DNA synthesis, red-cell maturation, and the methylation chemistry that recycles homocysteine into methionine. Persistent insufficiency causes macrocytic anemia and tracks with cardiovascular and cognitive aging risk through elevated homocysteine.",
      raisesAndLowers: {
        raises: "Diet rich in leafy greens, legumes, lentils, asparagus, and citrus, fortified grain products in regions with mandatory folate fortification, and folate supplementation (especially methylfolate for those with MTHFR variants) are associated with higher serum folate.",
        lowers: "Diet very low in plant foods, heavy chronic alcohol intake (which impairs folate absorption and metabolism), pregnancy without supplementation, long-term methotrexate or sulfasalazine use, and chronic gut malabsorption are associated with lower serum folate.",
      },
      limitations: "Serum folate reflects recent intake more than tissue stores; red blood cell folate is a better long-term marker but is less commonly ordered. In folate-fortified populations, serum folate is rarely low — but functional deficiency can still occur from MTHFR variants that limit conversion to active methylfolate. Pair with B12 and homocysteine.",
      references: "Bailey LB et al. Adv Nutr 2015 (biomarkers of nutrition for development: folate); Crider KS et al. Nutrients 2011 (folic acid food fortification); Smith AD, Refsum H. Annu Rev Nutr 2016 (homocysteine, B vitamins, and cognitive impairment)",
    },
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
    descriptor: {
      reflection: "Your cortisol (morning) reads %VALUE% μg/dL. Cortisol is the primary stress hormone with a strong morning peak and evening trough — chronic disruption of the diurnal pattern is a flagship longevity marker.",
      whatItIs: "Cortisol is the primary glucocorticoid stress hormone, with a strong morning peak and evening trough. It coordinates glucose mobilization, immune tone, and stress response. Chronic disruption of the diurnal pattern is a flagship longevity marker because it links sleep, stress, metabolism, and aging.",
      raisesAndLowers: {
        raises: "Sustained psychological stress, chronic sleep deprivation (especially short sleep before draw), heavy unaccustomed exercise just before draw, heavy alcohol intake the night before, and severe and prolonged calorie restriction are associated with higher morning cortisol.",
        lowers: "Stable, sufficient sleep on a regular schedule, reducing chronic psychological stress, daily morning outdoor light exposure, regular moderate exercise with adequate recovery, and mindfulness and consistent breathwork practices are associated with lower chronic cortisol.",
      },
      limitations: "A single morning cortisol is a slice of a sharply diurnal curve. Time of draw matters enormously; ideally between 7 and 9 a.m. fasting. A single value cannot describe the diurnal slope, which is the most informative pattern.",
      references: "Adam EK et al. Psychoneuroendocrinology 2017 (diurnal cortisol slopes meta-analysis); Kumari M et al. JCEM 2011 (Whitehall II); Sapolsky RM et al. Endocr Rev 2000 (glucocorticoids and stress)",
    },
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
    descriptor: {
      reflection: "Your TSH reads %VALUE% mIU/L. TSH is the most sensitive single screen for thyroid function — values above 2.0 already track with worse cardiometabolic outcomes in cohort data.",
      whatItIs: "TSH is the pituitary signal that drives the thyroid gland. Because the system uses negative feedback, TSH moves opposite to thyroid hormone production: low thyroid output raises TSH, high thyroid output suppresses TSH. It is the most sensitive single screen for thyroid function.",
      raisesAndLowers: {
        raises: "Sustained psychological stress, chronic sleep deprivation, severe and prolonged calorie restriction, heavy chronic alcohol intake, some autoimmune patterns, and aging biology are associated with higher TSH.",
        lowers: "Stable lifestyle with adequate energy intake, reducing chronic psychological stress, and adequate iodine and selenium status from diet are associated with lower TSH.",
      },
      limitations: "TSH has wide diurnal variation; values are highest in the early morning. It can drift into the abnormal range during acute illness without true thyroid dysfunction. Always interpret with free T4 and, when possible, free T3.",
      references: "Garber JR et al. Thyroid 2012 (AACE/ATA hypothyroidism guidelines); Asvold BO et al. Arch Intern Med 2008 (HUNT study); Surks MI et al. JAMA 2004 (subclinical thyroid disease)",
    },
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
    descriptor: {
      reflection: "Your free T4 reads %VALUE% ng/dL. Free T4 is the unbound, biologically available thyroxine — partners with TSH to map thyroid function.",
      whatItIs: "Free T4 is the unbound, biologically available thyroxine in circulation. T4 is the primary thyroid hormone output and is converted to the more active T3 in tissues. Free T4 partners with TSH to map thyroid function.",
      raisesAndLowers: {
        raises: "Some autoimmune patterns and iodine excess from supplements or extreme diet are associated with higher free T4.",
        lowers: "Severe and prolonged calorie restriction, chronic sleep deprivation, sustained psychological stress, and heavy chronic alcohol intake are associated with lower free T4. Adequate iodine and selenium status from diet support stable values.",
      },
      limitations: "Free T4 alone cannot determine tissue-level thyroid action; T3 (and reverse T3 in some contexts) tells more about the active hormone reaching tissues. Acute illness can shift the value without true thyroid dysfunction.",
      references: "Garber JR et al. Thyroid 2012 (AACE/ATA hypothyroidism guidelines)",
    },
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
    descriptor: {
      reflection: "Your free T3 reads %VALUE% pg/mL. Free T3 is the unbound active thyroid hormone driving metabolic rate — sensitive to energy state, illness, and stress.",
      whatItIs: "Free T3 is the unbound active thyroid hormone that drives metabolic rate at the tissue level. It is generated in part from peripheral conversion of T4. Free T3 is sensitive to energy state, illness, and stress, so it is one of the more useful longevity reads on thyroid function.",
      raisesAndLowers: {
        raises: "Stable adequate energy intake and stable lifestyle without heavy calorie restriction are associated with higher free T3.",
        lowers: "Severe and prolonged calorie restriction, acute or chronic illness, chronic sleep deprivation, heavy chronic alcohol intake, and heavy training volume relative to energy intake are associated with lower free T3.",
      },
      limitations: "Free T3 falls in non-thyroidal illness without indicating real thyroid dysfunction (the low-T3 syndrome pattern). It is most informative alongside TSH and free T4 in someone feeling well at the time of draw.",
      references: "Iervasi G et al. Circulation 2003 (low-T3 syndrome and mortality); Gussekloo J et al. JAMA 2004 (thyroid status and survival in old age); Pasqualetti G et al. JCEM 2018 (subclinical hypothyroidism and CV risk)",
    },
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
    descriptor: {
      reflection: "Your IL-6 reads %VALUE% pg/mL. Interleukin-6 is the upstream cytokine that drives much of the body's chronic, low-grade inflammatory tone — a flagship longevity marker.",
      whatItIs: "Interleukin-6 is the upstream cytokine that drives much of the body's chronic, low-grade inflammatory tone. It signals the liver to make C-reactive protein and shapes immune, metabolic, and vascular aging. Elevated IL-6 over time tracks with cardiovascular events, frailty, cognitive decline, and all-cause mortality across many cohorts.",
      raisesAndLowers: {
        raises: "Excess visceral fat (which secretes IL-6 directly), recent acute infection or injury, sustained psychological stress, chronic sleep deprivation or fragmented sleep, diets high in ultra-processed foods and added sugar, and persistent gum disease or other low-grade infections are associated with higher IL-6.",
        lowers: "Reducing visceral adipose tissue, regular aerobic exercise and moderate resistance training, Mediterranean-style eating patterns rich in plants and fish, stable and sufficient sleep on a consistent schedule, quitting smoking, and resolving sources of chronic inflammation such as oral disease are associated with lower IL-6.",
      },
      limitations: "IL-6 has a short half-life and rises sharply with any acute illness, recent vigorous exercise, or stress in the hours before draw. A single value should never be read in isolation. Pair with hs-CRP and a second draw at least two weeks later.",
      references: "Ridker PM et al. Lancet 2023 (inflammation, ASCVD, and cancer mortality); IL6R Mendelian Randomisation Consortium. Lancet 2012; Pradhan AD et al. Circulation 2018 (residual inflammatory risk on PCSK9 inhibition); Ferrucci L, Fabbri E. Nat Rev Cardiol 2018 (inflammageing)",
    },
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
    descriptor: {
      reflection: "Your NT-proBNP reads %VALUE% pg/mL. NT-proBNP is the most validated blood read on subclinical cardiac strain — rises long before heart failure symptoms appear.",
      whatItIs: "NT-proBNP is the inactive fragment released alongside BNP when cardiac muscle stretches from pressure or volume load. It is the most validated blood read on subclinical cardiac strain and rises long before symptoms of heart failure appear. Tracking NT-proBNP over years catches early cardiac changes from hypertension, atrial fibrillation, or valve disease.",
      raisesAndLowers: {
        raises: "Sustained high blood pressure, high dietary sodium intake over time, excess visceral fat with associated cardiac strain, heavy chronic alcohol intake, sedentary patterns combined with poor cardiovascular fitness, and aging itself (especially after age 60) are associated with higher NT-proBNP.",
        lowers: "Reducing dietary sodium toward 1500-2300 mg per day, regular aerobic exercise that improves cardiovascular efficiency, reaching and maintaining a healthy body composition, limiting heavy alcohol intake, stable sleep including treatment of sleep apnea, and maintaining blood pressure consistently in healthy ranges are associated with lower NT-proBNP.",
      },
      limitations: "NT-proBNP rises with age, kidney dysfunction, and even brief atrial fibrillation episodes, and falls with obesity for reasons that are not fully understood. A single value cannot separate cardiac from non-cardiac causes; pair with blood pressure trends, eGFR, and an echocardiogram when persistently elevated.",
      references: "Welsh P et al. Eur J Heart Fail 2022 (reference ranges for NT-proBNP); Wang TJ et al. NEJM 2004 (Framingham); Heidenreich PA et al. Circulation 2022 (AHA/ACC/HFSA Guideline); McKie PM, Burnett JC. JACC 2016 (NT-proBNP gold standard)",
    },
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
    descriptor: {
      reflection: "Your LDL Particle Number (LDL-P) reads %VALUE% nmol/L. LDL-P counts the actual atherogenic particles circulating regardless of cholesterol content — flagship longevity marker for atherosclerotic risk.",
      whatItIs: "LDL particle number counts the actual atherogenic particles circulating, regardless of how much cholesterol each carries. Because each LDL particle has one ApoB protein, LDL-P tracks closely with ApoB and is the most direct measure of how many LDL particles are available to enter the arterial wall.",
      raisesAndLowers: {
        raises: "Saturated-fat-heavy diet patterns in genetically susceptible individuals, diets high in refined carbohydrates that drive small-dense LDL, excess visceral fat, sedentary patterns, and heavy chronic alcohol intake are associated with higher LDL-P.",
        lowers: "Mediterranean-style eating with high fiber and monounsaturated fats, reducing visceral fat, regular aerobic and resistance training, higher intake of soluble fiber from oats, legumes, and fruit, and replacing saturated fats with nuts, olive oil, and fatty fish are associated with lower LDL-P.",
      },
      limitations: "LDL-P and LDL-C can disagree, especially in metabolic syndrome and insulin resistance where particle number can be high while cholesterol per particle is low. NMR assays carry vendor-specific reference ranges; trends within one lab matter more than cross-lab comparisons. Pair with ApoB for confirmation.",
      references: "Cromwell WC et al. J Clin Lipidol 2007 (LDL-P and CV disease in MESA); Mora S et al. Circulation 2009 (LDL particle subclasses in WHI); Otvos JD et al. J Clin Lipidol 2011 (discordance between LDL-C and LDL-P)",
    },
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
    descriptor: {
      reflection: "Your LDL Medium reads %VALUE% nmol/L. Medium LDL is the mid-size LDL subfraction — most useful as part of the full subfraction profile rather than read alone.",
      whatItIs: "LDL Medium is the mid-size LDL subfraction reported by NMR lipoprotein analysis. It sits between large, buoyant LDL and small-dense LDL on the size continuum and tracks with general LDL particle number more than with the small-dense atherogenic phenotype. It is most useful as part of the full subfraction profile rather than read alone.",
      raisesAndLowers: {
        raises: "Diet high in saturated fat in susceptible individuals, excess body weight (particularly visceral fat), sedentary patterns, and heavy chronic alcohol intake are associated with higher medium LDL.",
        lowers: "Mediterranean-style eating patterns, soluble fiber intake from oats, legumes, fruit, regular aerobic exercise, and reducing visceral fat are associated with lower medium LDL.",
      },
      limitations: "LDL Medium has weaker independent risk associations than LDL Small or LDL particle number, and assay reference ranges differ across vendors. Always read alongside total LDL-P, LDL Small, and LDL Peak Size.",
      references: "Otvos JD et al. Clin Lab 2002 (NMR-based lipoprotein subfraction analysis); Mora S et al. Circulation 2009 (LDL subclasses and CV events in WHI)",
    },
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
    descriptor: {
      reflection: "Your LDL Small reads %VALUE% nmol/L. Small-dense LDL particles are the most atherogenic LDL subspecies — they penetrate the arterial endothelium more readily, oxidize more easily, and persist longer.",
      whatItIs: "Small-dense LDL particles are the most atherogenic LDL subspecies. They penetrate the arterial endothelium more readily, oxidize more easily, and persist longer in circulation. Elevated LDL Small tracks with insulin resistance, metabolic syndrome, and cardiovascular risk independent of total LDL-C, making it a useful longevity marker.",
      raisesAndLowers: {
        raises: "Diet high in refined carbohydrates and added sugars, heavy chronic alcohol intake, excess visceral fat and insulin resistance, sedentary patterns, and high triglyceride levels are associated with higher LDL Small.",
        lowers: "Reducing refined carbohydrate intake, reducing visceral fat, regular aerobic and resistance training, Mediterranean-style eating with monounsaturated fats, and higher intake of omega-3-rich foods such as fatty fish are associated with lower LDL Small.",
      },
      limitations: "Small-dense LDL is one feature of the broader atherogenic dyslipidemia pattern that includes high triglycerides and low HDL. Reading it alone misses context. Vendor-specific reference ranges differ; trend within one lab is more reliable than cross-lab values.",
      references: "Krauss RM. Curr Opin Lipidol 2010 (lipoprotein subfractions and CV disease risk); St-Pierre AC et al. Arterioscler Thromb Vasc Biol 2005 (LDL subfractions and ischemic heart disease in men); Hoogeveen RC et al. Arterioscler Thromb Vasc Biol 2014 (small dense LDL-C in ARIC)",
    },
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
    descriptor: {
      reflection: "Your LDL Peak Size reads %VALUE% Å. LDL Peak Size is the average diameter of the most abundant LDL particles — a single-number summary of LDL particle quality.",
      whatItIs: "LDL Peak Size is the average diameter of the most abundant LDL particles in circulation, reported in nanometers or angstroms. Larger peak sizes track with Pattern A (buoyant LDL) and lower cardiovascular risk; smaller peak sizes track with Pattern B and atherogenic metabolic profiles. It is a single-number summary of LDL particle quality.",
      raisesAndLowers: {
        raises: "Mediterranean-style eating patterns, reducing refined carbohydrate intake, reducing visceral fat, regular aerobic and resistance training, and higher intake of omega-3-rich foods are associated with larger (favorable) LDL Peak Size.",
        lowers: "Diet high in refined carbohydrates and added sugars, excess visceral fat and insulin resistance, heavy chronic alcohol intake, sedentary patterns, and persistent high triglycerides are associated with smaller (less favorable) LDL Peak Size.",
      },
      limitations: "Peak size is an average and can be normal even when small-dense LDL is meaningfully elevated. Always read with LDL Small, LDL Medium, and total LDL particle number for the full picture. Vendor-specific cutoffs apply.",
      references: "Austin MA et al. JAMA 1988 (LDL subclass patterns and risk of MI); Otvos JD et al. Clin Lab 2002 (NMR-based subfraction analysis); Lamarche B et al. Circulation 1997 (small dense LDL particles)",
    },
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
    descriptor: {
      reflection: "Your Non-HDL Cholesterol reads %VALUE% mg/dL. Non-HDL cholesterol captures all atherogenic cholesterol in one number — a flagship longevity lipid marker that often outperforms LDL-C.",
      whatItIs: "Non-HDL cholesterol equals total cholesterol minus HDL-C, capturing all cholesterol carried by ApoB-bearing atherogenic particles (LDL, IDL, VLDL, and Lp(a)). It is a stronger predictor of cardiovascular events than LDL-C alone, particularly when triglycerides are elevated, and is calculated from a standard lipid panel without extra cost.",
      raisesAndLowers: {
        raises: "Saturated-fat-heavy diet patterns in susceptible individuals, diets high in refined carbohydrates and added sugars, excess visceral fat, sedentary patterns, and heavy chronic alcohol intake are associated with higher non-HDL cholesterol.",
        lowers: "Mediterranean-style eating patterns, higher soluble fiber intake from oats, legumes, fruit, replacing saturated fats with mono- and polyunsaturated fats, regular aerobic and resistance training, and reducing visceral fat are associated with lower non-HDL cholesterol.",
      },
      limitations: "Non-HDL captures cholesterol mass but not particle count; ApoB or LDL-P refines the read. It also rises after non-fasting meals because of triglyceride-rich remnants, so use a morning fasting draw for trending.",
      references: "Robinson JG et al. JACC 2009 (meta-analysis of non-HDL-C and CV events); Sniderman AD et al. Circ Cardiovasc Qual Outcomes 2011 (ApoB vs non-HDL-C); Boekholdt SM et al. JAMA 2012 (HDL-C and ApoA-I in CV events)",
    },
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
    descriptor: {
      reflection: "Your HDL Large reads %VALUE% μmol/L. HDL Large is the buoyant, cholesterol-rich HDL subfraction — refines the read on HDL-C, which by itself is a coarse and sometimes misleading marker.",
      whatItIs: "HDL Large is the buoyant, cholesterol-rich HDL subfraction reported by NMR. It is thought to carry more of HDL's reverse-cholesterol-transport activity than smaller HDL subspecies, and large HDL associates with lower cardiovascular risk in the Framingham Offspring and Quebec Cardiovascular cohorts. It refines the read on HDL-C, which by itself is a coarse and sometimes misleading marker.",
      raisesAndLowers: {
        raises: "Regular aerobic exercise, Mediterranean-style eating patterns, moderate intake of monounsaturated fats from olive oil, nuts, avocado, modest alcohol intake in some patterns (red wine literature), and adequate sleep over time are associated with higher HDL Large.",
        lowers: "Diet high in refined carbohydrates and added sugars, excess visceral fat and insulin resistance, sedentary patterns, smoking, and anabolic steroid use (relevant to dietary/lifestyle context only) are associated with lower HDL Large.",
      },
      limitations: "HDL function is not captured by HDL Large alone; cholesterol efflux capacity tests are the research gold standard for protective HDL activity. NMR assay reference ranges differ by vendor; trend within one lab is more reliable. Pair with HDL-C, total cholesterol, and triglycerides.",
      references: "Asztalos BF et al. Arterioscler Thromb Vasc Biol 2004 (HDL subspecies in Framingham); Mackey RH et al. JACC 2012 (HDL particles in MESA); Lamarche B et al. Arterioscler Thromb Vasc Biol 1997 (HDL subclasses); Rohatgi A et al. NEJM 2014 (HDL cholesterol efflux capacity)",
    },
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
    descriptor: {
      reflection: "Your blood mercury reads %VALUE% μg/L. Blood mercury reflects recent exposure to methylmercury (mostly fish) and inorganic mercury — chronic low-level exposure has been linked to subtle cognitive and cardiovascular effects.",
      whatItIs: "Blood mercury reflects recent exposure to methylmercury (mostly from fish) and inorganic mercury (occupational, dental amalgam off-gassing in some settings). Methylmercury crosses the blood-brain barrier and accumulates in neural tissue; chronic low-level exposure has been linked to subtle cognitive and cardiovascular effects in cohort studies.",
      raisesAndLowers: {
        raises: "Frequent consumption of high-mercury fish (swordfish, shark, king mackerel, tilefish, bigeye tuna), regular albacore tuna intake more than once a week, occupational exposure (dental, mining, manufacturing, gold refining), living near coal-fired power plants or contaminated waterways, and use of skin-lightening creams containing mercury are associated with higher blood mercury.",
        lowers: "Choosing low-mercury fish (salmon, sardines, anchovies, trout, light tuna in moderation), limiting high-mercury species per FDA/EPA fish advisory guidance, filtering tap water in regions with industrial contamination, reviewing occupational exposure controls and using PPE where applicable, and following local fish advisories for sport-caught freshwater fish are associated with lower blood mercury.",
      },
      limitations: "Blood mercury reflects recent exposure; chronic body burden is better tracked with hair or urine mercury, depending on which species (methyl versus inorganic) is suspected. A single value cannot distinguish dietary methylmercury from occupational inorganic mercury, and individual fish portion sizes shift readings substantially.",
      references: "Mahaffey KR et al. Environ Health Perspect 2011 (blood mercury, fish consumption, and CV disease in NHANES); Mozaffarian D et al. NEJM 2011 (mercury exposure and CV disease); FDA/EPA fish advisory; Karimi R et al. Environ Health Perspect 2012 (mercury, fish, and CV risk meta-analysis)",
    },
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
    descriptor: {
      reflection: "Your blood lead reads %VALUE% μg/dL. Chronic low-level lead exposure is associated with cognitive aging, cardiovascular events, kidney function decline, and all-cause mortality — there is no known safe threshold.",
      whatItIs: "Blood lead reflects ongoing exposure plus recent release from bone stores, where 90 percent of body lead is sequestered. Lead accumulates over decades and re-mobilizes during bone turnover (menopause, fracture, prolonged immobilization). Chronic low-level lead exposure is associated with cognitive aging, cardiovascular events, kidney function decline, and all-cause mortality even at levels once considered safe. There is no known safe threshold.",
      raisesAndLowers: {
        raises: "Living in older housing (pre-1978 US) with lead paint or lead service lines, drinking water from lead-soldered plumbing without filtration, occupational exposure (battery work, soldering, firearms ranges, demolition), hobbies involving lead (stained glass, fishing weights, ceramics with lead glaze), imported spices, pottery, or supplements contaminated with lead, and peri- and postmenopausal bone turnover releasing stored lead are associated with higher blood lead.",
        lowers: "Identifying and removing residential lead sources (paint, plumbing, soil), using NSF/ANSI 53-certified water filters where lead in tap water is a concern, using cold water for drinking and cooking and flushing taps after stagnation, maintaining adequate dietary calcium, iron, and vitamin D (which compete with lead absorption), reviewing occupational exposure controls and using respiratory PPE where applicable, and avoiding imported goods (cosmetics, spices, pottery) without lead testing are associated with lower blood lead.",
      },
      limitations: "Blood lead reflects recent exposure plus bone release; it underestimates total body burden. Bone lead (measured by K-shell X-ray fluorescence) is the research gold standard but is rarely available clinically. A single low value does not rule out historical exposure that may release later in life.",
      references: "Lanphear BP et al. Lancet Public Health 2018 (low-level lead exposure and mortality in NHANES); Bakulski KM et al. Curr Environ Health Rep 2020 (lead exposure and cognitive aging review); Navas-Acien A et al. Environ Health Perspect 2007 (lead exposure and CV disease); CDC Adult Blood Lead Reference Value (NIOSH ABLES)",
    },
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
    descriptor: {
      reflection: "Your total PSA reads %VALUE% ng/mL. Total PSA trends over years are far more informative than any single value — a flagship longevity-screening marker for men over 45.",
      whatItIs: "Total PSA is a glycoprotein produced by prostate epithelium and secreted into seminal fluid. Small amounts leak into blood; the leak rate rises with prostate volume, inflammation, manipulation, and prostate cancer. PSA trends over years are far more informative than any single value, making it a flagship longevity-screening marker for men over 45.",
      raisesAndLowers: {
        raises: "Aging itself (prostate volume gradually rises), recent ejaculation within 48 hours of draw, recent vigorous cycling within 48 hours of draw, recent digital rectal exam, prostate biopsy, or urinary catheterization, and active urinary tract infection or prostatitis are associated with higher total PSA.",
        lowers: "Avoiding ejaculation, vigorous cycling, and prostate manipulation for 48 hours before draw, reducing visceral fat (lower-grade association), Mediterranean-style eating with vegetables, tomatoes (lycopene), and fish, and regular aerobic exercise are associated with lower total PSA.",
      },
      limitations: "PSA is not specific to prostate cancer; benign prostatic hyperplasia, prostatitis, and recent activity all elevate it. A single value cannot distinguish these; trend over years, PSA velocity, PSA density, and percent free PSA add specificity. Race-based reference differences and age effects matter.",
      references: "Thompson IM et al. NEJM 2004 (PSA <= 4.0 PCPT); Catalona WJ et al. JAMA 1998 (percent free PSA); Schroder FH et al. NEJM 2009 (ERSPC); Vickers AJ et al. BMJ 2013 (PSA at age 40-55 and long-term risk); Wei JT et al. J Urol 2023 (AUA/SUO guideline)",
    },
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
    descriptor: {
      reflection: "Your free PSA reads %VALUE% ng/mL. Free PSA is meaningful only as part of the percent free PSA calculation — refines biopsy decision-making when total PSA is borderline.",
      whatItIs: "Free PSA is the unbound fraction of PSA circulating in blood, as opposed to PSA bound to alpha-1-antichymotrypsin and other proteins. It is meaningful only as part of the percent free PSA calculation: prostate cancer cells produce relatively more bound PSA, so a lower percent free PSA points toward cancer when total PSA is borderline.",
      raisesAndLowers: {
        raises: "Avoiding ejaculation, vigorous cycling, and prostate manipulation for 48 hours before draw, reducing visceral fat (lower-grade association), Mediterranean-style eating with vegetables, tomatoes, and fish, and regular aerobic exercise are associated with higher free PSA.",
        lowers: "Recent ejaculation within 48 hours of draw, recent vigorous cycling, recent digital rectal exam, prostate biopsy, or urinary catheterization, and active urinary tract infection or prostatitis are associated with lower free PSA.",
      },
      limitations: "Free PSA in isolation has limited value; it is informative only as a ratio with total PSA. Same caveats about timing of recent ejaculation, cycling, and prostate manipulation apply. Always interpret with total PSA and percent free PSA.",
      references: "Catalona WJ et al. JAMA 1998 (percent free PSA); Loeb S, Catalona WJ. Ther Adv Urol 2014 (Prostate Health Index)",
    },
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
    descriptor: {
      reflection: "Your PSA % Free reads %VALUE% %. Percent free PSA is most useful when total PSA is borderline (4-10 ng/mL) — a useful refinement for biopsy decision-making.",
      whatItIs: "Percent free PSA is the ratio of free PSA to total PSA expressed as a percentage. Prostate cancer cells produce relatively more bound PSA, so a lower percent free points toward cancer when total PSA is in the borderline 4 to 10 ng/mL range. It is a useful refinement for biopsy decision-making.",
      raisesAndLowers: {
        raises: "Benign prostatic hyperplasia (favorable signal in this context) and avoiding ejaculation, vigorous cycling, and prostate manipulation for 48 hours before draw are associated with higher percent free PSA.",
        lowers: "Prostate cancer (the clinically meaningful direction), active urinary tract infection or prostatitis, and recent prostate manipulation (digital rectal exam, biopsy) are associated with lower percent free PSA.",
      },
      limitations: "Percent free PSA is most useful when total PSA is between 4 and 10 ng/mL; outside that range its value drops. It cannot substitute for imaging or biopsy in the cancer-detection pathway; it is one input among several.",
      references: "Catalona WJ et al. JAMA 1998 (percent free PSA); Wei JT et al. J Urol 2023 (AUA/SUO guideline); Loeb S, Catalona WJ. Ther Adv Urol 2014 (Prostate Health Index)",
    },
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
    descriptor: {
      reflection: "Your lipase reads %VALUE% U/L. Lipase rises sharply when pancreatic acinar cells are damaged — most useful as a longevity marker when abnormal.",
      whatItIs: "Lipase is a digestive enzyme produced by the pancreas that breaks down dietary fats in the small intestine. Small amounts circulate in blood; large elevations occur when pancreatic acinar cells are damaged, most often from gallstones, alcohol, or metabolic stressors. As a longevity marker, lipase is most useful when abnormal.",
      raisesAndLowers: {
        raises: "Heavy chronic alcohol intake, recent very large fatty meals in some individuals, sustained very high triglycerides (over 500 mg/dL), and reduced kidney function (lipase is renally cleared) are associated with higher lipase.",
        lowers: "Limiting heavy alcohol intake, maintaining healthy triglycerides through diet and exercise, reducing visceral fat, and maintaining kidney function through hydration and stable blood pressure are associated with lower lipase.",
      },
      limitations: "Lipase rises later and stays elevated longer than amylase after pancreatic injury. A single normal value does not rule out chronic pancreatic insufficiency, which requires fecal elastase or imaging. Mild elevations are common and often non-specific.",
      references: "Tenner S et al. Am J Gastroenterol 2013 (ACG Guideline: acute pancreatitis); Yadav D, Lowenfels AB. Gastroenterology 2013 (epidemiology of pancreatitis)",
    },
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
    descriptor: {
      reflection: "Your amylase reads %VALUE% U/L. Amylase rises in many non-pancreatic conditions — most useful when paired with lipase and clinical context.",
      whatItIs: "Amylase is a digestive enzyme produced primarily by the pancreas and salivary glands that breaks down dietary starches. Small amounts circulate in blood; large elevations occur with pancreatic injury, salivary gland conditions, and a range of non-pancreatic causes from kidney disease to ovarian pathology. As a longevity marker, amylase is most useful when abnormal.",
      raisesAndLowers: {
        raises: "Heavy chronic alcohol intake, recent salivary gland inflammation (mumps, sialadenitis), and reduced kidney function (amylase is partly renally cleared) are associated with higher amylase.",
        lowers: "Limiting heavy alcohol intake, maintaining healthy triglycerides through diet and exercise, and maintaining kidney function through hydration and stable blood pressure are associated with lower amylase.",
      },
      limitations: "Amylase rises in many non-pancreatic conditions (salivary disease, kidney dysfunction, macroamylasemia), so an elevation requires lipase and clinical context to interpret. It rises and falls faster than lipase after pancreatic injury, making it less sensitive for delayed presentations.",
      references: "Tenner S et al. Am J Gastroenterol 2013 (ACG Guideline: acute pancreatitis); Matull WR et al. J Clin Pathol 2006 (biochemical markers of acute pancreatitis)",
    },
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
    descriptor: {
      reflection: "Your MMA reads %VALUE% nmol/L. MMA is the gold-standard blood marker for catching subclinical B12 deficiency — more sensitive than serum B12 itself.",
      whatItIs: "MMA is a metabolic intermediate that accumulates when vitamin B12 is functionally insufficient at the tissue level. It is more sensitive than serum B12 itself, often rising before B12 falls below the standard reference range. MMA is the gold-standard blood marker for catching subclinical B12 deficiency, particularly relevant in older adults, vegetarians, and those on long-term acid-suppressing medications.",
      raisesAndLowers: {
        raises: "Diet very low in B12 sources (strict vegan without B12-fortified foods), reduced gastric acid production with aging, reduced kidney function (MMA is partly renally cleared), and heavy chronic alcohol intake are associated with higher MMA.",
        lowers: "Adequate B12 sources from animal foods or B12-fortified plant foods, regular dietary intake of fish, eggs, and dairy where appropriate, maintaining kidney function through hydration and stable blood pressure, and limiting heavy alcohol intake are associated with lower MMA.",
      },
      limitations: "MMA also rises with reduced kidney function independent of B12 status, so a single high value should be paired with serum B12, holotranscobalamin (active B12), and creatinine/eGFR. It does not distinguish dietary insufficiency from absorption issues.",
      references: "Stabler SP. NEJM 2013 (vitamin B12 deficiency); Allen LH. Am J Clin Nutr 2009 (B-12 deficiency prevalence); Carmel R. Annu Rev Med 2000 (cobalamin deficiencies); Green R et al. Nat Rev Dis Primers 2017 (vitamin B12 deficiency)",
    },
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
    descriptor: {
      reflection: "Your OmegaCheck (Omega-3 Index) reads %VALUE% %. OmegaCheck reflects long-term dietary omega-3 intake over the prior 3-4 months — flagship longevity marker because higher Omega-3 Index associates with lower CV mortality.",
      whatItIs: "OmegaCheck (and the related Omega-3 Index) reports the percentage of red blood cell membrane fatty acids that are EPA and DHA. It reflects long-term dietary omega-3 intake over the prior three to four months because red cells are replaced on that timescale. Higher Omega-3 Index associates with lower cardiovascular mortality, slower cognitive aging, and longer telomeres, making it a flagship longevity marker.",
      raisesAndLowers: {
        raises: "Regular consumption of fatty fish (salmon, sardines, mackerel, herring, anchovies), aiming for two to three fish servings per week, choosing wild-caught or pasture-raised animal foods (slightly higher omega-3), walnuts, flax, and chia provide ALA which converts modestly to EPA/DHA, and algae-based food sources for those avoiding fish are associated with higher OmegaCheck.",
        lowers: "Diet low in fatty fish or other marine sources, diet very high in omega-6 vegetable oils (corn, soybean) without omega-3 balance, heavy alcohol intake over time, and smoking are associated with lower OmegaCheck.",
      },
      limitations: "Plasma omega-3 levels swing with the most recent meal; the red blood cell membrane version is more stable. OmegaCheck does not capture omega-3 distribution across tissues (brain, heart, liver). It also does not distinguish dietary fish quality (mercury, PCBs).",
      references: "Harris WS, von Schacky C. Prev Med 2004 (Omega-3 Index); Harris WS et al. Nat Commun 2021 (n-3 fatty acid levels and mortality, 17-cohort meta-analysis); Mozaffarian D, Rimm EB. JAMA 2006 (fish intake and human health); Siscovick DS et al. Circulation 2017 (AHA Science Advisory)",
    },
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
    descriptor: {
      reflection: "Your Omega 3 Total reads %VALUE% %. Omega 3 Total sums EPA + DHA + DPA in red cell membranes — the longevity target is total at or above 8% of red cell membrane fatty acids.",
      whatItIs: "Omega 3 Total sums EPA, DHA, and DPA in red cell membranes. It reflects long-term dietary omega-3 intake over the prior three to four months. Higher total tracks with lower cardiovascular mortality, slower cognitive aging, and longer telomeres in cohort data.",
      raisesAndLowers: {
        raises: "Regular consumption of fatty fish (salmon, sardines, mackerel, herring), aiming for two to three fish servings per week, choosing wild-caught or pasture-raised animal foods, walnuts, flax, and chia, and algae-based food sources for those avoiding fish are associated with higher total omega-3.",
        lowers: "Diet low in fatty fish or other marine sources, diet very high in omega-6 vegetable oils without omega-3 balance, heavy alcohol intake over time, and smoking are associated with lower total omega-3.",
      },
      limitations: "The total figure is most informative when paired with total omega-6 to compute the omega-6/3 ratio. Plasma values swing with the most recent meal; red cell membrane is more stable.",
      references: "Harris WS, von Schacky C. Prev Med 2004 (Omega-3 Index); Harris WS et al. Nat Commun 2021 (mortality meta-analysis)",
    },
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
    descriptor: {
      reflection: "Your Omega 3: EPA reads %VALUE% %. EPA is the substrate for resolvins and other specialized pro-resolving mediators that actively wind down inflammation.",
      whatItIs: "Eicosapentaenoic acid (EPA) is one of the two long-chain marine omega-3 fatty acids. It is the substrate for resolvins and other specialized pro-resolving mediators that actively wind down inflammation. Higher EPA in red cell membranes tracks with lower cardiovascular events, particularly in the REDUCE-IT and JELIS trial subanalyses.",
      raisesAndLowers: {
        raises: "Regular consumption of fatty fish (salmon, sardines, mackerel, herring), aiming for two to three fish servings per week, choosing wild-caught or pasture-raised animal foods, and algae-based food sources for those avoiding fish are associated with higher EPA.",
        lowers: "Diet low in fatty fish or other marine sources, diet very high in omega-6 vegetable oils without omega-3 balance, heavy alcohol intake over time, and smoking are associated with lower EPA.",
      },
      limitations: "EPA alone does not capture the full omega-3 picture; DHA has its own tissue distribution and effects, particularly in brain. Always read with DHA, total Omega-3 Index, and the AA/EPA ratio.",
      references: "Bhatt DL et al. NEJM 2019 (REDUCE-IT); Yokoyama M et al. Lancet 2007 (JELIS); Harris WS, von Schacky C. Prev Med 2004 (Omega-3 Index)",
    },
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
    descriptor: {
      reflection: "Your Omega 3: DHA reads %VALUE% %. DHA is the most abundant long-chain omega-3 in brain and retinal tissue — structurally critical for neuronal membrane fluidity and synaptic function.",
      whatItIs: "Docosahexaenoic acid (DHA) is the most abundant long-chain omega-3 in brain and retinal tissue. It is structurally critical for neuronal membrane fluidity and synaptic function. Higher DHA in red cell membranes tracks with slower cognitive decline and lower dementia risk in observational cohorts.",
      raisesAndLowers: {
        raises: "Regular consumption of fatty fish (salmon, sardines, mackerel, herring), aiming for two to three fish servings per week, algae-based food sources for those avoiding fish (DHA is the primary algal omega-3), and choosing wild-caught or pasture-raised animal foods are associated with higher DHA.",
        lowers: "Diet low in fatty fish or other marine sources, diet very high in omega-6 vegetable oils without omega-3 balance, heavy alcohol intake over time, and smoking are associated with lower DHA.",
      },
      limitations: "DHA alone does not capture the full omega-3 picture; EPA has its own anti-inflammatory and cardiovascular effects. Always read with EPA, total Omega-3 Index, and AA/EPA ratio.",
      references: "Schaefer EJ et al. Arch Neurol 2006 (DHA and dementia: Framingham); Yurko-Mauro K et al. Alzheimers Dement 2010 (DHA in age-related cognitive decline); Harris WS et al. Nat Commun 2021 (mortality)",
    },
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
    descriptor: {
      reflection: "Your Omega 3: DPA reads %VALUE% %. DPA is an intermediate long-chain omega-3 between EPA and DHA — emerging evidence suggests it contributes independently to cardiovascular protection.",
      whatItIs: "Docosapentaenoic acid (DPA) is an intermediate long-chain omega-3 between EPA and DHA. It appears in fatty fish and is also produced endogenously from EPA. Emerging evidence suggests DPA contributes independently to cardiovascular protection and tissue resolution of inflammation, though its role is less well characterized than EPA or DHA.",
      raisesAndLowers: {
        raises: "Regular consumption of fatty fish (salmon, sardines, mackerel, herring), choosing wild-caught animal foods, and adequate dietary EPA which converts to DPA are associated with higher DPA.",
        lowers: "Diet low in fatty fish or other marine sources, diet very high in omega-6 vegetable oils without omega-3 balance, and heavy alcohol intake over time are associated with lower DPA.",
      },
      limitations: "DPA is rarely interpreted in isolation. It is part of the marine omega-3 panel but does not have a validated standalone longevity target. Read with EPA, DHA, and total Omega-3 Index.",
      references: "Byelashov OA et al. Lipid Technol 2015 (DPA dietary sources and role); Kleber ME et al. Atherosclerosis 2016 (omega-3 fatty acids and mortality)",
    },
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
    descriptor: {
      reflection: "Your Omega 6 Total reads %VALUE% %. Total omega-6 sums linoleic acid + arachidonic acid + minor omega-6 species — most informative when paired with total omega-3 to compute the omega-6/3 ratio.",
      whatItIs: "Total omega-6 sums linoleic acid, arachidonic acid, and minor omega-6 species in red cell membranes. It reflects long-term dietary intake of plant oils, nuts, seeds, and animal fats over the prior three to four months. The total figure is most informative when paired with total omega-3 to compute the omega-6/3 ratio.",
      raisesAndLowers: {
        raises: "Diet high in seed and vegetable oils (corn, soybean, sunflower), diet high in red meat and processed foods, and heavy reliance on packaged snack foods are associated with higher total omega-6.",
        lowers: "Mediterranean-style eating with olive oil and fish, whole-food, plant-forward diet patterns, and severe energy restriction reducing all dietary fats are associated with lower total omega-6.",
      },
      limitations: "Total omega-6 conflates beneficial linoleic acid from whole foods with arachidonic acid and processed-food exposures. The omega-6/3 ratio and AA/EPA ratio carry more interpretive weight.",
      references: "Simopoulos AP. Exp Biol Med 2008 (omega-6/omega-3 ratio); Marklund M et al. Circulation 2019 (omega-6 biomarkers and CV disease)",
    },
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
    descriptor: {
      reflection: "Your Omega 6: Linoleic Acid reads %VALUE% %. Higher circulating linoleic acid in cohort studies is associated with lower cardiovascular events and all-cause mortality — likely because it tracks higher whole-food and lower trans-fat patterns.",
      whatItIs: "Linoleic acid is the dominant dietary omega-6 fatty acid, abundant in seed oils, nuts, and many processed foods. It is essential and serves as a precursor to arachidonic acid. Despite common framing of omega-6 as inflammatory, higher circulating linoleic acid in cohort studies is associated with lower cardiovascular events and all-cause mortality, likely because it tracks higher whole-food and lower trans-fat patterns.",
      raisesAndLowers: {
        raises: "Diet including nuts, seeds, and modest amounts of olive and avocado oils, replacing saturated fat with whole-food unsaturated sources, and whole-food eating patterns rich in plants are associated with higher linoleic acid.",
        lowers: "Diet very low in plant fats, heavy reliance on saturated and trans fats, and severe energy restriction reducing all dietary fats are associated with lower linoleic acid.",
      },
      limitations: "Linoleic acid is one piece of a broader fatty-acid profile; reading it alone misses the balance with omega-3, the omega-6/3 ratio, and arachidonic acid. The literature linking linoleic acid to lower mortality reflects whole-food dietary patterns, not isolated seed oil intake.",
      references: "Marklund M et al. Circulation 2019 (biomarkers of dietary omega-6 fatty acids and CV disease); Farvid MS et al. Circulation 2014 (dietary linoleic acid and CHD meta-analysis)",
    },
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
    descriptor: {
      reflection: "Your Omega 6: Arachidonic Acid reads %VALUE% %. Arachidonic acid is the substrate for pro-inflammatory eicosanoids — the AA/EPA ratio is more informative than AA alone.",
      whatItIs: "Arachidonic acid (AA) is a long-chain omega-6 fatty acid found in animal foods and produced from linoleic acid. It is the substrate for pro-inflammatory eicosanoids (prostaglandins, leukotrienes) and shares enzymatic pathways with EPA, so the AA-to-EPA ratio is more informative than AA alone. Persistently high AA without balancing EPA tracks with inflammatory tone.",
      raisesAndLowers: {
        raises: "Diet high in red meat and animal fats, diet very high in omega-6 vegetable oils without omega-3 balance, and heavy chronic alcohol intake are associated with higher arachidonic acid.",
        lowers: "Mediterranean-style eating with fish and plants, higher intake of fatty fish (more EPA/DHA), reducing visceral fat, and plant-forward eating patterns are associated with lower arachidonic acid.",
      },
      limitations: "AA in isolation is hard to interpret because it is essential for membrane function and appropriate immune response. The AA/EPA ratio is the more useful read on inflammatory tone.",
      references: "Lands B. Mol Cell Biochem 2008 (essential fatty acid balance); Simopoulos AP. Exp Biol Med 2008 (omega-6/omega-3 ratio in CV disease)",
    },
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
    descriptor: {
      reflection: "Your Omega 6 / 3 Ratio reads %VALUE% ratio. Modern Western diets typically run 15:1 to 20:1; ancestral and Mediterranean-style diets run closer to 4:1 — higher ratio tracks with inflammatory tone and CV risk.",
      whatItIs: "The omega-6/3 ratio is the proportion of omega-6 to omega-3 fatty acids in red cell membranes. Modern Western diets typically run 15:1 to 20:1, while ancestral and Mediterranean-style diets run closer to 4:1 or lower. A higher ratio tracks with inflammatory tone and cardiovascular risk in cohort studies, though the absolute Omega-3 Index probably matters more than the ratio itself.",
      raisesAndLowers: {
        raises: "Diet high in seed oils and processed foods, low intake of fatty fish and marine omega-3 sources, and diet high in red meat without balancing fish are associated with higher omega-6/3 ratios.",
        lowers: "Regular fatty fish consumption (two to three servings per week), Mediterranean-style eating with olive oil and plants, reducing ultra-processed food intake, and whole-food, plant-forward diet patterns are associated with lower ratios.",
      },
      limitations: "The ratio can look favorable from low omega-6 alone (very low fat diets) without adequate omega-3, which is not the goal. Read alongside the absolute Omega-3 Index. The AA/EPA ratio is more biologically specific for inflammatory tone.",
      references: "Simopoulos AP. Exp Biol Med 2008 (omega-6/omega-3 ratio); Lands B. Mol Cell Biochem 2008 (essential fatty acid balance)",
    },
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
    descriptor: {
      reflection: "Your Arachidonic Acid / EPA Ratio reads %VALUE% ratio. AA/EPA is the most biologically specific omega-6/omega-3 read for inflammatory tone — AA and EPA compete for the same enzymes that produce eicosanoids.",
      whatItIs: "The AA/EPA ratio is the most biologically specific omega-6/omega-3 read for inflammatory tone. AA and EPA compete for the same enzymes (cyclooxygenase, lipoxygenase) that produce eicosanoids; a higher AA/EPA ratio shifts production toward pro-inflammatory prostaglandins and leukotrienes, while a lower ratio shifts toward resolution-promoting mediators.",
      raisesAndLowers: {
        raises: "Diet low in fatty fish, diet high in red meat and processed foods, heavy chronic alcohol intake, and excess visceral fat are associated with higher AA/EPA ratios.",
        lowers: "Regular fatty fish consumption (two to three servings per week), Mediterranean-style eating, reducing visceral fat, and lower intake of seed oils and ultra-processed foods are associated with lower ratios.",
      },
      limitations: "AA/EPA reflects fatty acid balance but does not capture downstream eicosanoid production, which depends on enzyme activity and tissue context. Read alongside hs-CRP and IL-6 for the full inflammation picture.",
      references: "Lands B. Mol Cell Biochem 2008 (essential fatty acid balance); Simopoulos AP. Exp Biol Med 2008 (omega-6/omega-3 ratio in CV disease)",
    },
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
    descriptor: {
      reflection: "Your TgAb reads %VALUE% IU/mL. TgAb signals thyroid autoimmunity — most often Hashimoto's thyroiditis. Even with normal thyroid function tests, positive TgAb tracks with higher progression risk.",
      whatItIs: "Thyroglobulin antibodies are immune proteins targeting thyroglobulin, a protein made by the thyroid gland. They are present in roughly 10 to 15 percent of adults and signal thyroid autoimmunity, most often Hashimoto's thyroiditis. Even when thyroid function tests are normal, positive TgAb tracks with higher risk of progression to hypothyroidism over years.",
      raisesAndLowers: {
        raises: "Personal or family history of autoimmune disease, high dietary iodine intake (excess iodine can trigger autoimmunity in susceptible people), chronic high stress, smoking transitions (rapid reduction can unmask thyroid autoimmunity), and pregnancy and postpartum period are associated with higher TgAb.",
        lowers: "Stable, moderate iodine intake from whole-food sources, reducing chronic psychological stress, adequate selenium intake from whole foods (Brazil nuts, fish, eggs), and stable, sufficient sleep are associated with lower TgAb in some patterns.",
      },
      limitations: "TgAb positivity does not always lead to clinical thyroid disease; many people remain euthyroid for decades. The titer level matters less than the trend over time. Read alongside TPO antibodies, TSH, and free T4.",
      references: "Hollowell JG et al. JCEM 2002 (NHANES III thyroid antibodies); Vanderpump MP et al. Clin Endocrinol 1995 (Whickham Survey 20-year follow-up); Effraimidis G, Wiersinga WM. Eur J Endocrinol 2014 (autoimmune thyroid disease)",
    },
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
    descriptor: {
      reflection: "Your TPO antibodies reads %VALUE% IU/mL. TPO antibodies are the most common thyroid autoantibody — the strongest predictor of progression to hypothyroidism and a flagship longevity-screening marker.",
      whatItIs: "TPO antibodies are immune proteins targeting thyroid peroxidase, the enzyme that builds thyroid hormone. They are the most common thyroid autoantibody and the strongest predictor of progression to hypothyroidism. Roughly 11 percent of women and 3 percent of men carry detectable TPO antibodies; positivity in a euthyroid person carries 2 to 4 percent annual risk of becoming hypothyroid.",
      raisesAndLowers: {
        raises: "Personal or family history of autoimmune disease, high dietary iodine intake, chronic high stress, pregnancy and postpartum period (TPO often rises postpartum), and smoking cessation in some patterns are associated with higher TPO antibodies.",
        lowers: "Stable, moderate iodine intake from whole-food sources, adequate selenium from Brazil nuts, fish, eggs, reducing chronic psychological stress, stable, sufficient sleep, and Mediterranean-style eating patterns are associated with lower TPO antibodies in some patterns.",
      },
      limitations: "TPO antibody titer does not determine when (or whether) thyroid function will fail; trend over time and TSH trajectory matter more than any single value. Read alongside TgAb, TSH, and free T4. Pregnancy planning warrants tighter TPO awareness.",
      references: "Hollowell JG et al. JCEM 2002 (NHANES III thyroid antibodies); Vanderpump MP et al. Clin Endocrinol 1995 (Whickham 20-year follow-up); Walsh JP et al. JCEM 2010 (thyroid antibodies and CV mortality in Busselton); Pearce EN et al. Clin Endocrinol 2008 (TPO and progression to hypothyroidism)",
    },
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

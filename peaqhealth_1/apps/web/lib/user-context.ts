import { cache } from "react"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { bloodPanelDataFromBloodResults } from "./blood/bloodPanelDataFromBloodResults"

// ── Types ───────────────────────────────────────────────────────────────────

export interface UserPanelContext {
  userId: string
  firstName: string | null
  sex: string | null
  age: number | null
  dateOfBirth: string | null

  hasOralKit: boolean
  oralKit: OralKitData | null

  hasBloodPanel: boolean
  bloodPanel: BloodPanelData | null
  bloodMarkersPopulated: string[]

  hasWearable: boolean
  sleepData: SleepData | null

  hasQuestionnaire: boolean
  questionnaire: QuestionnaireData | null

  availablePanels: string[]
  panelCount: number
  convergeStrength: number
}

export interface OralKitData {
  id: string
  collectionDate: string | null
  status: string
  shannonIndex: number | null
  speciesCount: number | null
  namedSpecies: number | null
  genera: number | null
  phyla: number | null
  neisseriaPct: number | null
  rothiaPct: number | null
  haemophilusPct: number | null
  actinomycesPct: number | null
  veillonellaPct: number | null
  fusobacteriumPct: number | null
  aggregatibacterPct: number | null
  campylobacterPct: number | null
  porphyromonasPct: number | null
  tannerellaPct: number | null
  treponemaPct: number | null
  pIntermediaPct: number | null
  streptococcusTotalPct: number | null
  prevotellaPct: number | null
  fNucleatumPct: number | null
  pGingivalisPct: number | null
  sMutansPct: number | null
  sSobrinusPct: number | null
  lactobacillusPct: number | null
  sSanguinisPct: number | null
  sGordoniiPct: number | null
  sSalivariusPct: number | null
  envPattern: string | null
  primaryPattern: string | null
  envAerobicScorePct: number | null
  envAnaerobicLoadPct: number | null
  envAcidRatio: number | null
  envAerobicAnaerobicRatio: number | null
  nitricOxideTotal: number
  gumHealthTotal: number
  cavityBacteriaTotal: number
  cavityProtectorsTotal: number
  phBalanceApi: number | null
  phBalanceCategory: string | null
  phBalanceConfidence: string | null
  cariogenicLoadPct: number | null
  cariogenicLoadCategory: string | null
  protectiveRatio: number | null
  protectiveRatioCategory: string | null

  // Caries v3 fields. Optional because PR-α (parser/schema) has not yet
  // populated them on oral_kit_orders; this PR ships only the v3 module.
  // See ADR-0014 and lib/oral/caries-v3.ts for the contract.
  phBalanceApiV3?: number | null
  phBalanceApiV3Category?: string | null
  cariogenicLoadV3?: number | null
  cariogenicLoadV3Category?: string | null
  protectiveRatioV3?: number | null
  protectiveRatioV3Category?: string | null
  commensalSufficiencyIndex?: number | null
  commensalSufficiencyCategory?: string | null
  adsPrimaryPct?: number | null
  adsExtendedPct?: number | null
  compensatedDysbiosisFlag?: boolean | null
  synergyActiveFlag?: boolean | null
  cariesRiskCategory?: string | null
  confounderAdjustments?: Record<string, string> | null
  reliabilityFlag?: string | null

  // NR-α fields. Optional because the runner / pipeline integration ships in
  // a follow-up PR (NR-β1); this slice only adds the algorithm. See ADR-0019
  // and lib/oral/nr-v1.ts for the contract.
  nrCapacityIndex?: number | null
  nrCapacityCategory?: string | null
  noSignature?: number | null
  noSignatureCategory?: string | null
  nrRiskCategory?: string | null
  nrParadoxFlag?: boolean | null
  nrConfidence?: string | null
  nrReliabilityFlags?: string[] | null
  nrConfounderAdjustments?: Record<string, string> | null
}

export interface BloodPanelData {
  id: string
  drawDate: string | null
  labName: string | null
  ldl: number | null; hdl: number | null; triglycerides: number | null; totalCholesterol: number | null
  hsCrp: number | null; hba1c: number | null; glucose: number | null
  wbc: number | null; hemoglobin: number | null; hematocrit: number | null
  tsh: number | null; freeT4: number | null
  egfr: number | null; creatinine: number | null; bun: number | null
  alt: number | null; ast: number | null; albumin: number | null
  vitaminD: number | null; ferritin: number | null; vitaminB12: number | null
  sodium: number | null; potassium: number | null
  platelets: number | null; rdw: number | null
  [key: string]: unknown
}

export interface SleepData {
  nightsCount: number
  spo2Avg: number | null
  breathingRateAvg: number | null
  restingHr: number | null
  hrvRmssd: number | null
  deepSleepMin: number | null
  totalSleepMin: number | null
  sleepEfficiency: number | null
}

export interface QuestionnaireData {
  mouthBreathing: string | null
  mouthBreathingWhen: string | null
  snoringReported: string | null
  nasalObstruction: string | null
  nasalObstructionSeverity: string | null
  nonRestorativeSleep: string | null
  daytimeFatigue: string | null
  flossingFreq: string | null
  whiteningFrequency: string | null
  dietaryNitrateFrequency: string | null
  smokingStatus: string | null
  biologicalSex: string | null
  ageRange: string | null
  sleepDuration: string | null
  sleepLatency: string | null
  sleepQualSelf: string | null
  nightWakings: string | null
  morningHeadaches: string | null
  jawFatigueMorning: string | null
  daytimeCognitiveFog: string | null
  bruxismNight: string | null
  osaWitnessed: string | null
  sinusHistory: string | null
  gerdNocturnal: boolean | null
  stressLevel: string | null
  caffeineCutoff: string | null
  bmiCalculated: number | null
  sleepPositionPrimary: string | null
  sugarIntake: string | null
  antibioticsWindow: string | null
  medicationPpiDetail: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function n(v: unknown): number | null {
  if (v == null) return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

function s(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))
}

function convergeStrength(panels: string[]): number {
  const count = panels.length
  if (count >= 3) return 100
  if (count === 2) return 60
  if (count === 1) return 25
  return 0
}

// ── Builder ─────────────────────────────────────────────────────────────────

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function buildContext(userId: string): Promise<UserPanelContext> {
  const supabase = svc()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [{ data: profile }, { data: oralRaw }, { data: labRaw }, { data: lifestyle }, { data: sleepNights }, { data: wearableConn }] = await Promise.all([
    supabase.from("profiles").select("first_name, date_of_birth, email").eq("id", userId).maybeSingle(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", userId).not("shannon_diversity", "is", null).order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("blood_results").select("*").eq("user_id", userId).order("collected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("sleep_data").select("hrv_rmssd, spo2, resting_heart_rate, respiratory_rate, deep_sleep_minutes, total_sleep_minutes, sleep_efficiency").eq("user_id", userId).gt("sleep_efficiency", 0).gte("date", thirtyDaysAgo).order("date", { ascending: false }),
    supabase.from("wearable_connections_v2").select("provider, last_synced_at").eq("user_id", userId).order("connected_at", { ascending: false }).limit(1).maybeSingle(),
  ])

  const dob = profile?.date_of_birth as string | null
  const age = ageFromDob(dob) ?? (lifestyle?.age_range ? ({ "18_29": 25, "30_39": 35, "40_49": 45, "50_59": 55, "60_69": 65, "70_plus": 72 } as Record<string, number>)[lifestyle.age_range as string] ?? null : null)

  // ── Oral ──
  let oralKit: OralKitData | null = null
  if (oralRaw) {
    const o = oralRaw as Record<string, unknown>
    const meta = (o.raw_otu_table as Record<string, unknown>)?.__meta as Record<string, unknown> | undefined
    const cs = meta?.community_summary as Record<string, number> | undefined
    const ne = n(o.neisseria_pct); const ro = n(o.rothia_pct); const ha = n(o.haemophilus_pct)
    const ac = n(o.actinomyces_pct); const ve = n(o.veillonella_pct)
    const fu = n(o.fusobacterium_pct); const ag = n(o.aggregatibacter_pct); const ca = n(o.campylobacter_pct)
    const po = n(o.porphyromonas_pct); const ta = n(o.tannerella_pct); const tr = n(o.treponema_pct); const pi = n(o.prevotella_intermedia_pct)
    const sm = n(o.s_mutans_pct); const ss = n(o.s_sobrinus_pct); const la = n(o.lactobacillus_pct)
    const sg = n(o.s_sanguinis_pct); const go = n(o.s_gordonii_pct)

    oralKit = {
      id: o.id as string, collectionDate: s(o.collection_date), status: s(o.status) ?? "unknown",
      shannonIndex: n(o.shannon_diversity), speciesCount: n(o.species_count),
      namedSpecies: cs?.named_species_count ?? null, genera: cs?.distinct_genera ?? null, phyla: cs?.distinct_phyla ?? null,
      neisseriaPct: ne, rothiaPct: ro, haemophilusPct: ha, actinomycesPct: ac, veillonellaPct: ve,
      fusobacteriumPct: fu, aggregatibacterPct: ag, campylobacterPct: ca,
      porphyromonasPct: po, tannerellaPct: ta, treponemaPct: tr, pIntermediaPct: pi,
      streptococcusTotalPct: n(o.streptococcus_total_pct), prevotellaPct: n(o.prevotella_pct),
      fNucleatumPct: n(o.fusobacterium_nucleatum_pct), pGingivalisPct: n(o.porphyromonas_gingivalis_pct),
      sMutansPct: sm, sSobrinusPct: ss, lactobacillusPct: la,
      sSanguinisPct: sg, sGordoniiPct: go, sSalivariusPct: n(o.s_salivarius_pct),
      envPattern: s(o.env_pattern), primaryPattern: s(o.primary_pattern),
      envAerobicScorePct: n(o.env_aerobic_score_pct), envAnaerobicLoadPct: n(o.env_anaerobic_load_pct),
      envAcidRatio: n(o.env_acid_ratio), envAerobicAnaerobicRatio: n(o.env_aerobic_anaerobic_ratio),
      nitricOxideTotal: (ne ?? 0) + (ro ?? 0) + (ha ?? 0) + (ac ?? 0) + (ve ?? 0),
      gumHealthTotal: (fu ?? 0) + (ag ?? 0) + (ca ?? 0) + (po ?? 0) + (ta ?? 0) + (tr ?? 0) + (pi ?? 0),
      cavityBacteriaTotal: (sm ?? 0) + (ss ?? 0) + (la ?? 0),
      cavityProtectorsTotal: (sg ?? 0) + (go ?? 0),
      phBalanceApi: n(o.ph_balance_api),
      phBalanceCategory: s(o.ph_balance_category),
      phBalanceConfidence: s(o.ph_balance_confidence),
      cariogenicLoadPct: n(o.cariogenic_load_pct),
      cariogenicLoadCategory: s(o.cariogenic_load_category),
      protectiveRatio: n(o.protective_ratio),
      protectiveRatioCategory: s(o.protective_ratio_category),
    }
  }

  // ── Blood ──
  // Reads the latest blood_results row (per-test, ordered by collected_at).
  // Translation to BloodPanelData happens in the adapter, which also
  // splats every registry id onto the result so the 25-field ceiling
  // from the audit no longer applies. See ADR-0020.
  const bloodPanel = bloodPanelDataFromBloodResults(
    labRaw as Record<string, unknown> | null,
  )
  const bloodMarkersPopulated: string[] = []
  if (bloodPanel) {
    for (const [k, v] of Object.entries(bloodPanel)) {
      if (v != null && typeof v === "number") bloodMarkersPopulated.push(k)
    }
  }

  // ── Sleep ──
  const nights = (sleepNights ?? []) as Array<Record<string, unknown>>
  const avg = (key: string) => {
    const vals = nights.map(r => Number(r[key])).filter(v => Number.isFinite(v) && v > 0)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const sleepData: SleepData | null = nights.length > 0 ? {
    nightsCount: nights.length,
    spo2Avg: avg("spo2"), breathingRateAvg: avg("respiratory_rate"),
    restingHr: avg("resting_heart_rate"), hrvRmssd: avg("hrv_rmssd"),
    deepSleepMin: avg("deep_sleep_minutes"), totalSleepMin: avg("total_sleep_minutes"),
    sleepEfficiency: avg("sleep_efficiency"),
  } : null

  // ── Questionnaire ──
  const q = lifestyle as Record<string, unknown> | null
  const questionnaire: QuestionnaireData | null = q ? {
    mouthBreathing: s(q.mouth_breathing), mouthBreathingWhen: s(q.mouth_breathing_when),
    snoringReported: s(q.snoring_reported), nasalObstruction: s(q.nasal_obstruction),
    nasalObstructionSeverity: s(q.nasal_obstruction_severity),
    nonRestorativeSleep: s(q.non_restorative_sleep), daytimeFatigue: s(q.daytime_fatigue),
    flossingFreq: s(q.flossing_freq), whiteningFrequency: s(q.whitening_frequency),
    dietaryNitrateFrequency: s(q.dietary_nitrate_frequency),
    smokingStatus: s(q.smoking_status), biologicalSex: s(q.biological_sex), ageRange: s(q.age_range),
    sleepDuration: s(q.sleep_duration), sleepLatency: s(q.sleep_latency), sleepQualSelf: s(q.sleep_qual_self),
    nightWakings: s(q.night_wakings), morningHeadaches: s(q.morning_headaches),
    jawFatigueMorning: s(q.jaw_fatigue_morning), daytimeCognitiveFog: s(q.daytime_cognitive_fog),
    bruxismNight: s(q.bruxism_night), osaWitnessed: s(q.osa_witnessed),
    sinusHistory: s(q.sinus_history), gerdNocturnal: q.gerd_nocturnal as boolean | null ?? null,
    stressLevel: s(q.stress_level), caffeineCutoff: s(q.caffeine_cutoff),
    bmiCalculated: n(q.bmi_calculated), sleepPositionPrimary: s(q.sleep_position_primary),
    sugarIntake: s(q.sugar_intake), antibioticsWindow: s(q.antibiotics_window),
    medicationPpiDetail: s(q.medication_ppi_detail),
  } : null

  // ── Assembly ──
  const availablePanels: string[] = []
  if (oralKit) availablePanels.push("oral")
  if (bloodPanel) availablePanels.push("blood")
  if (sleepData) availablePanels.push("sleep")
  if (questionnaire) availablePanels.push("questionnaire")

  return {
    userId,
    firstName: s(profile?.first_name),
    sex: s(lifestyle?.biological_sex),
    age,
    dateOfBirth: dob,
    hasOralKit: !!oralKit, oralKit,
    hasBloodPanel: !!bloodPanel, bloodPanel, bloodMarkersPopulated,
    hasWearable: nights.length > 0 || !!wearableConn,
    sleepData,
    hasQuestionnaire: !!questionnaire, questionnaire,
    availablePanels,
    panelCount: availablePanels.filter(p => p !== "questionnaire").length,
    convergeStrength: convergeStrength(availablePanels.filter(p => p !== "questionnaire")),
  }
}

// ── Cached per-request ──────────────────────────────────────────────────────

export const getUserPanelContext = cache(buildContext)

// ── Quick lookups ───────────────────────────────────────────────────────────

export function hasMarker(ctx: UserPanelContext, key: string): boolean {
  return ctx.bloodMarkersPopulated.includes(key)
}

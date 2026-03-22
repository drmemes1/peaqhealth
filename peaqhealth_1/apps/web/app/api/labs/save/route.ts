import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"
import type { BloodMarkers } from "../../../components/lab-upload"
import { AzureOpenAI } from "openai"
import type { SupabaseClient } from "@supabase/supabase-js"

type DbRow = Record<string, number | string | null | undefined>

async function generateBloodInsight(userId: string, supabase: SupabaseClient, bloodRow: DbRow): Promise<string | null> {
  const key = process.env.AZURE_OPENAI_KEY
  if (!key) return null

  const n = (v: unknown) => typeof v === "number" && v > 0

  // ── Blood panel ────────────────────────────────────────────────────────────
  const bloodLines: string[] = []
  if (n(bloodRow.ldl_mgdl))           bloodLines.push(`LDL: ${bloodRow.ldl_mgdl} mg/dL`)
  if (n(bloodRow.hdl_mgdl))           bloodLines.push(`HDL: ${bloodRow.hdl_mgdl} mg/dL`)
  if (n(bloodRow.triglycerides_mgdl)) bloodLines.push(`Triglycerides: ${bloodRow.triglycerides_mgdl} mg/dL`)
  if (n(bloodRow.hs_crp_mgl))         bloodLines.push(`hsCRP: ${bloodRow.hs_crp_mgl} mg/L`)
  if (n(bloodRow.glucose_mgdl))       bloodLines.push(`Glucose: ${bloodRow.glucose_mgdl} mg/dL`)
  if (n(bloodRow.hba1c_pct))          bloodLines.push(`HbA1c: ${bloodRow.hba1c_pct}%`)
  if (n(bloodRow.vitamin_d_ngml))     bloodLines.push(`Vitamin D: ${bloodRow.vitamin_d_ngml} ng/mL`)
  if (n(bloodRow.apob_mgdl))          bloodLines.push(`ApoB: ${bloodRow.apob_mgdl} mg/dL`)
  if (n(bloodRow.egfr_mlmin))         bloodLines.push(`eGFR: ${bloodRow.egfr_mlmin} mL/min`)
  if (n(bloodRow.alt_ul))             bloodLines.push(`ALT: ${bloodRow.alt_ul} U/L`)
  if (n(bloodRow.wbc_kul))            bloodLines.push(`WBC: ${bloodRow.wbc_kul} K/uL`)
  if (n(bloodRow.albumin_gdl))        bloodLines.push(`Albumin: ${bloodRow.albumin_gdl} g/dL`)
  if (n(bloodRow.hemoglobin_gdl))     bloodLines.push(`Hemoglobin: ${bloodRow.hemoglobin_gdl} g/dL`)
  if (n(bloodRow.lpa_mgdl))           bloodLines.push(`Lp(a): ${bloodRow.lpa_mgdl} mg/dL`)
  if (bloodLines.length === 0) return null

  const missingBlood: string[] = []
  if (!n(bloodRow.hs_crp_mgl))     missingBlood.push("hsCRP")
  if (!n(bloodRow.hba1c_pct))      missingBlood.push("HbA1c")
  if (!n(bloodRow.vitamin_d_ngml)) missingBlood.push("Vitamin D")
  if (!n(bloodRow.apob_mgdl))      missingBlood.push("ApoB")
  if (!n(bloodRow.lpa_mgdl))       missingBlood.push("Lp(a)")

  // ── Sleep / wearable ───────────────────────────────────────────────────────
  const { data: wearable } = await supabase
    .from("wearable_connections")
    .select("deep_sleep_pct, hrv_rmssd, spo2_dips, rem_pct, sleep_efficiency, nights_available, provider")
    .eq("user_id", userId)
    .eq("status", "connected")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const sleepLines: string[] = []
  if (wearable) {
    if (n(wearable.sleep_efficiency)) sleepLines.push(`Sleep efficiency: ${wearable.sleep_efficiency}%`)
    if (n(wearable.deep_sleep_pct))   sleepLines.push(`Deep sleep: ${wearable.deep_sleep_pct}%`)
    if (n(wearable.rem_pct))          sleepLines.push(`REM: ${wearable.rem_pct}%`)
    if (n(wearable.hrv_rmssd))        sleepLines.push(`HRV: ${wearable.hrv_rmssd} ms`)
    if (n(wearable.spo2_dips))        sleepLines.push(`SpO2 dips: ${wearable.spo2_dips}`)
  }

  // ── Oral microbiome ────────────────────────────────────────────────────────
  const { data: oral } = await supabase
    .from("oral_kit_orders")
    .select("shannon_diversity, nitrate_reducers_pct, periodontopathogen_pct, osa_taxa_pct")
    .eq("user_id", userId)
    .in("status", ["results_ready", "scored"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const oralLines: string[] = []
  if (oral) {
    if (n(oral.shannon_diversity))       oralLines.push(`Shannon diversity: ${oral.shannon_diversity}`)
    if (n(oral.nitrate_reducers_pct))    oralLines.push(`Nitrate reducers: ${oral.nitrate_reducers_pct}%`)
    if (n(oral.periodontopathogen_pct))  oralLines.push(`Periodontal pathogens: ${oral.periodontopathogen_pct}%`)
    if (n(oral.osa_taxa_pct))            oralLines.push(`OSA-associated taxa: ${oral.osa_taxa_pct}%`)
  }

  // ── Lifestyle ──────────────────────────────────────────────────────────────
  const { data: lifestyle } = await supabase
    .from("lifestyle_records")
    .select("exercise_level, brushing_freq, flossing_freq, smoking_status, stress_level, alcohol_drinks_per_week, vegetable_servings_per_day, processed_food_frequency")
    .eq("user_id", userId)
    .maybeSingle()

  const lifestyleLines: string[] = []
  if (lifestyle) {
    if (lifestyle.exercise_level)           lifestyleLines.push(`Exercise: ${lifestyle.exercise_level}`)
    if (lifestyle.smoking_status)           lifestyleLines.push(`Smoking: ${lifestyle.smoking_status}`)
    if (lifestyle.stress_level)             lifestyleLines.push(`Stress: ${lifestyle.stress_level}`)
    if (n(lifestyle.alcohol_drinks_per_week)) lifestyleLines.push(`Alcohol: ${lifestyle.alcohol_drinks_per_week} drinks/week`)
    if (n(lifestyle.vegetable_servings_per_day)) lifestyleLines.push(`Vegetables: ${lifestyle.vegetable_servings_per_day} servings/day`)
  }

  // ── Build prompt ───────────────────────────────────────────────────────────
  const systemPrompt = `You are a longevity health assistant for Peaq Health, a precision wellness platform that tracks blood, sleep, oral microbiome, and lifestyle data together.

Your job is to identify the single most meaningful cross-panel pattern in a user's data — a connection that spans two or more panels (blood + sleep, blood + oral, oral + lifestyle, etc.) — and communicate it clearly and specifically.

Rules:
- Write exactly 2 sentences, max 60 words total
- Sentence 1: state the cross-panel pattern using actual numbers (e.g. "Your hsCRP of 2.1 mg/L and periodontal pathogen load of 3.4% are both elevated, pointing to a shared inflammatory driver")
- Sentence 2: give one concrete, actionable next step that addresses the root pattern — not a generic tip
- Warm but clinical tone — no disclaimers, no "I'm not a doctor", no hollow praise
- If only blood data is available, fall back to a single-panel blood insight using actual values
- Never mention markers with value 0 or panels with no data`

  const userMessage = `Blood panel: ${bloodLines.join(", ")}
${missingBlood.length > 0 ? `Missing: ${missingBlood.join(", ")}` : "Blood panel is comprehensive."}
${sleepLines.length > 0 ? `\nSleep data: ${sleepLines.join(", ")}` : ""}
${oralLines.length > 0 ? `\nOral microbiome: ${oralLines.join(", ")}` : ""}
${lifestyleLines.length > 0 ? `\nLifestyle: ${lifestyleLines.join(", ")}` : ""}`.trim()

  try {
    const client = new AzureOpenAI({
      apiKey: key,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: "2024-08-01-preview",
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    })
    const res = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      max_tokens: 150,
      temperature: 0.7,
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user"   as const, content: userMessage },
      ],
    })
    const insight = res.choices[0]?.message?.content?.trim() ?? null
    console.log("[insight] finish_reason:", res.choices[0]?.finish_reason)
    console.log("[insight] generated:", insight)
    return insight
  } catch (err) {
    console.error("[insight] error:", err)
    return null
  }
}

const LOCK_WINDOW_MS = 24 * 60 * 60 * 1000  // 24 hours

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let markers: BloodMarkers
  let labDate: string | undefined
  let source: string = "upload_pdf"
  let labName: string | undefined

  try {
    const body = await request.json() as { markers: BloodMarkers; labDate?: string; source?: string; labName?: string }
    markers = body.markers
    labDate = body.labDate
    source  = body.source ?? "upload_pdf"
    labName = body.labName
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (labDate) {
    const today      = new Date().toISOString().slice(0, 10)
    const fiveYrsAgo = new Date(Date.now() - 5 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    if (labDate > today) {
      return NextResponse.json({ error: "Lab date cannot be in the future" }, { status: 400 })
    }
    if (labDate < fiveYrsAgo) {
      return NextResponse.json({ error: "Lab date cannot be more than 5 years ago" }, { status: 400 })
    }
  }

  const collectionDate  = labDate ?? new Date().toISOString().slice(0, 10)
  const lockExpiresAt   = new Date(Date.now() + LOCK_WINDOW_MS).toISOString()

  // ── Check existing row ────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("lab_results")
    .select("id, is_locked, version")
    .eq("user_id", user.id)
    .maybeSingle()

  const isNewVersion = existing?.is_locked === true
  const nextVersion  = isNewVersion ? (existing.version ?? 1) + 1 : (existing?.version ?? 1)

  // ── Upsert markers into lab_results ──────────────────────────────────────
  // Cast to access all extended marker fields the frontend now passes through
  const m = markers as Record<string, unknown>

  const { error: upsertError } = await supabase
    .from("lab_results")
    .upsert({
      user_id:            user.id,
      source,
      lab_name:           labName ?? null,
      collection_date:    collectionDate,
      parser_status:      "complete",
      is_locked:          false,
      lock_expires_at:    lockExpiresAt,
      version:            nextVersion,
      // Core markers
      hs_crp_mgl:              m.hsCRP_mgL          ?? null,
      vitamin_d_ngml:          m.vitaminD_ngmL      ?? null,
      apob_mgdl:               m.apoB_mgdL          ?? null,
      ldl_mgdl:                m.ldl_mgdL           ?? null,
      hdl_mgdl:                m.hdl_mgdL           ?? null,
      triglycerides_mgdl:      m.triglycerides_mgdL ?? null,
      lpa_mgdl:                m.lpa_mgdL           ?? null,
      glucose_mgdl:            m.glucose_mgdL       ?? null,
      hba1c_pct:               m.hba1c_pct          ?? null,
      // Extended markers
      total_cholesterol_mgdl:  m.totalCholesterol_mgdL ?? null,
      non_hdl_mgdl:            m.nonHDL_mgdL           ?? null,
      vldl_mgdl:               m.vldl_mgdL             ?? null,
      egfr_mlmin:              m.egfr_mLmin            ?? null,
      creatinine_mgdl:         m.creatinine_mgdL       ?? null,
      bun_mgdl:                m.bun_mgdL              ?? null,
      uric_acid_mgdl:          m.uricAcid_mgdL         ?? null,
      fasting_insulin_uiuml:   m.fastingInsulin_uIUmL  ?? null,
      alt_ul:                  m.alt_UL                ?? null,
      ast_ul:                  m.ast_UL                ?? null,
      alk_phos_ul:             m.alkPhos_UL            ?? null,
      total_bilirubin_mgdl:    m.totalBilirubin_mgdL   ?? null,
      albumin_gdl:             m.albumin_gdL           ?? null,
      wbc_kul:                 m.wbc_kul               ?? null,
      hemoglobin_gdl:          m.hemoglobin_gdL        ?? null,
      hematocrit_pct:          m.hematocrit_pct        ?? null,
      rdw_pct:                 m.rdw_pct               ?? null,
      mcv_fl:                  m.mcv_fL                ?? null,
      platelets_kul:           m.platelets_kul         ?? null,
      testosterone_ngdl:       m.testosterone_ngdL     ?? null,
      free_testo_pgml:         m.freeTesto_pgmL        ?? null,
      shbg_nmoll:              m.shbg_nmolL            ?? null,
      tsh_uiuml:               m.tsh_uIUmL             ?? null,
      ferritin_ngml:           m.ferritin_ngmL         ?? null,
      sodium_mmoll:            m.sodium_mmolL          ?? null,
      potassium_mmoll:         m.potassium_mmolL       ?? null,
      homocysteine_umoll:      m.homocysteine_umolL    ?? null,
      mch_pg:                  m.mch_pg                ?? null,
      mchc_gdl:                m.mchc_gdl              ?? null,
      rbc_mil:                 m.rbc_mil               ?? null,
      neutrophils_pct:         m.neutrophils_pct       ?? null,
      lymphs_pct:              m.lymphs_pct            ?? null,
      globulin_gdl:            m.globulin_gdL          ?? null,
      total_protein_gdl:       m.totalProtein_gdL      ?? null,
      calcium_mgdl:            m.calcium_mgdL          ?? null,
      chloride_mmoll:          m.chloride_mmolL        ?? null,
      co2_mmoll:               m.co2_mmolL             ?? null,
      free_t4_ngdl:            m.free_t4_ngdL          ?? null,
      free_t3_pgml:            m.free_t3_pgmL          ?? null,
      dhea_s_ugdl:             m.dhea_s_ugdL           ?? null,
      igf1_ngml:               m.igf1_ngmL             ?? null,
      cortisol_ugdl:           m.cortisol_ugdL         ?? null,
      vitamin_b12_pgml:        m.vitaminB12_pgmL       ?? null,
      folate_ngml:             m.folate_ngmL           ?? null,
      psa_ngml:                m.psa_ngmL              ?? null,
      cea_ngml:                m.cea_ngmL              ?? null,
      ca199_uml:               m.ca199_UmL             ?? null,
      thyroglobulin_ngml:      m.thyroglobulin_ngmL    ?? null,
      tpo_antibodies_iuml:     m.tpoAntibodies_iuML    ?? null,
    }, { onConflict: "user_id" })

  if (upsertError) {
    console.error("[labs/save] upsert error:", upsertError)
    return NextResponse.json({ error: "Failed to save lab results" }, { status: 500 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch the full saved row so the insight generator sees all columns (incl. extended markers)
  const { data: savedRow } = await supabase
    .from("lab_results")
    .select("hs_crp_mgl, vitamin_d_ngml, apob_mgdl, ldl_mgdl, hdl_mgdl, triglycerides_mgdl, lpa_mgdl, glucose_mgdl, hba1c_pct, egfr_mlmin, alt_ul, wbc_kul, albumin_gdl, hemoglobin_gdl")
    .eq("user_id", user.id)
    .single()

  const [newScore, bloodInsight] = await Promise.all([
    recalculateScore(user.id, serviceClient),
    generateBloodInsight(user.id, supabase, savedRow ?? {}),
  ])

  if (bloodInsight) {
    await supabase.from("lab_results").update({ blood_insight: bloodInsight }).eq("user_id", user.id)
  }

  return NextResponse.json({
    score:        newScore,
    isNewVersion,
    lockExpiresAt,
    bloodInsight: bloodInsight ?? undefined,
  })
}

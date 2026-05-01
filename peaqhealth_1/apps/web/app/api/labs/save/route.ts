/**
 * Blood-results save endpoint.
 *
 * Post-architectural-reset (PR-252 / ADR-0020), this route:
 *   1. Accepts a registry-keyed payload from /api/labs/upload (or
 *      programmatic callers that already validated the markers).
 *   2. Inserts ONE NEW ROW into blood_results per test (no upsert —
 *      the per-user-upsert was the old failure mode where a fresh
 *      upload silently overwrote prior history).
 *   3. Inserts per-marker confidence rows into blood_marker_confidence
 *      for forensic debugging.
 *   4. Triggers a score recalculation (which now reads blood_results).
 *   5. Generates a cross-panel AI insight from the freshly-saved row.
 *
 * Payload contract:
 *   {
 *     markers: { [registryId]: { value, unitFound, confidence, rawExtractedText, wasComputed } | null },
 *     sourceLab?: string,
 *     collectedAt?: string,            // YYYY-MM-DD or ISO
 *     parserUsed?: string,             // 'openai-vision-v1' | 'manual' | …
 *     parseConfidence?: number,
 *     rawPdfPath?: string,
 *   }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { recalculateScore } from "../../../../lib/score/recalculate"
import { BLOOD_MARKER_REGISTRY } from "../../../../lib/blood/markerRegistry"

interface SaveMarkerPayload {
  value: number
  unitFound?: string
  confidence?: number
  rawExtractedText?: string
  wasComputed?: boolean
}

/** Marker values may arrive either as the structured ParseResult shape OR as plain numbers (from manual entry). */
type MarkerValue = SaveMarkerPayload | number | null | undefined

interface SaveBody {
  markers: { [markerId: string]: MarkerValue }
  sourceLab?: string | null
  collectedAt?: string | null
  parserUsed?: string
  parseConfidence?: number
  rawPdfPath?: string | null
}

function normalizeMarker(v: MarkerValue): SaveMarkerPayload | null {
  if (v == null) return null
  if (typeof v === "number") {
    return Number.isFinite(v) && v > 0
      ? { value: v, unitFound: "", confidence: 0, rawExtractedText: "[manual entry]", wasComputed: false }
      : null
  }
  if (typeof v === "object" && typeof v.value === "number" && Number.isFinite(v.value)) {
    return v
  }
  return null
}

type DbRow = Record<string, number | string | null | undefined>

async function generateBloodInsight(
  userId: string,
  supabase: SupabaseClient,
  bloodRow: DbRow,
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  const n = (v: unknown) => typeof v === "number" && v > 0

  // ── Blood panel ────────────────────────────────────────────────────────────
  const bloodLines: string[] = []
  if (n(bloodRow.ldl_mgdl))                bloodLines.push(`LDL: ${bloodRow.ldl_mgdl} mg/dL`)
  if (n(bloodRow.hdl_mgdl))                bloodLines.push(`HDL: ${bloodRow.hdl_mgdl} mg/dL`)
  if (n(bloodRow.triglycerides_mgdl))      bloodLines.push(`Triglycerides: ${bloodRow.triglycerides_mgdl} mg/dL`)
  if (n(bloodRow.hs_crp_mgl))              bloodLines.push(`hsCRP: ${bloodRow.hs_crp_mgl} mg/L`)
  if (n(bloodRow.glucose_mgdl))            bloodLines.push(`Glucose: ${bloodRow.glucose_mgdl} mg/dL`)
  if (n(bloodRow.hba1c_percent))           bloodLines.push(`HbA1c: ${bloodRow.hba1c_percent}%`)
  if (n(bloodRow.vitamin_d_ngml))          bloodLines.push(`Vitamin D: ${bloodRow.vitamin_d_ngml} ng/mL`)
  if (n(bloodRow.apob_mgdl))               bloodLines.push(`ApoB: ${bloodRow.apob_mgdl} mg/dL`)
  if (n(bloodRow.egfr_mlmin))              bloodLines.push(`eGFR: ${bloodRow.egfr_mlmin} mL/min`)
  if (n(bloodRow.alt_ul))                  bloodLines.push(`ALT: ${bloodRow.alt_ul} U/L`)
  if (n(bloodRow.wbc_thousand_ul))         bloodLines.push(`WBC: ${bloodRow.wbc_thousand_ul} K/uL`)
  if (n(bloodRow.albumin_gdl))             bloodLines.push(`Albumin: ${bloodRow.albumin_gdl} g/dL`)
  if (n(bloodRow.hemoglobin_gdl))          bloodLines.push(`Hemoglobin: ${bloodRow.hemoglobin_gdl} g/dL`)
  if (n(bloodRow.lipoprotein_a_mgdl))      bloodLines.push(`Lp(a): ${Math.round(Number(bloodRow.lipoprotein_a_mgdl) * 2.5)} nmol/L`)
  if (bloodLines.length === 0) return null

  const missingBlood: string[] = []
  if (!n(bloodRow.hs_crp_mgl))         missingBlood.push("hsCRP")
  if (!n(bloodRow.hba1c_percent))      missingBlood.push("HbA1c")
  if (!n(bloodRow.vitamin_d_ngml))     missingBlood.push("Vitamin D")
  if (!n(bloodRow.apob_mgdl))          missingBlood.push("ApoB")
  if (!n(bloodRow.lipoprotein_a_mgdl)) missingBlood.push("Lp(a)")

  // ── Sleep / wearable ───────────────────────────────────────────────────────
  const { data: wearable } = await supabase
    .from("wearable_connections")
    .select("deep_sleep_pct, hrv_rmssd, latest_spo2_dips, rem_pct, sleep_efficiency, nights_available, provider")
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
    if (n(wearable.latest_spo2_dips)) sleepLines.push(`SpO2 dips: ${wearable.latest_spo2_dips}`)
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
  const systemPrompt = `You are a longevity health assistant for Oravi, a precision wellness platform that tracks blood, sleep, oral microbiome, and lifestyle data together.

Your job is to identify the single most meaningful cross-panel pattern in a user's data — a connection that spans two or more panels (blood + sleep, blood + oral, oral + lifestyle, etc.) — and communicate it clearly and specifically.

Rules:
- Write exactly 2 sentences, max 60 words total
- Sentence 1: state the cross-panel pattern using actual numbers (e.g. "Your hsCRP of 2.1 mg/L and periodontal pathogen load of 3.4% are both elevated, pointing to a shared inflammatory driver")
- Sentence 2: give one concrete, actionable next step that addresses the root pattern — not a generic tip
- Warm but clinical tone — no disclaimers, no "I'm not a doctor", no hollow praise
- If only blood data is available, fall back to a single-panel blood insight using actual values
- Never mention markers with value 0 or panels with no data

LANGUAGE RULES — ALWAYS FOLLOW:
- Write in plain English a smart non-scientist understands immediately
- Lead with what this means for the person, not the mechanism
- Never use Latin species names in the response
- Never use: dysbiosis, biomarker, optimize, endothelial, autonomic, parasympathetic, sympathetic dominance, inflammatory cascade, NF-kB, glycemic variability, cardiometabolic
- Replace with plain English:
    "dysbiosis" → "imbalance in your oral bacteria"
    "circadian rhythm" → "your body's internal clock"
    "insulin sensitivity" → "how well your body handles sugar"
    "autonomic" → "your body's stress response system"
- End every insight with one specific action
- The action must be free or low-cost first, clinical referral last
- Never say "consider" or "may want to" — be direct`

  const userMessage = `Blood panel: ${bloodLines.join(", ")}
${missingBlood.length > 0 ? `Missing: ${missingBlood.join(", ")}` : "Blood panel is comprehensive."}
${sleepLines.length > 0 ? `\nSleep data: ${sleepLines.join(", ")}` : ""}
${oralLines.length > 0 ? `\nOral microbiome: ${oralLines.join(", ")}` : ""}
${lifestyleLines.length > 0 ? `\nLifestyle: ${lifestyleLines.join(", ")}` : ""}`.trim()

  // HIPAA BAA signed 2026-03-28. Zero Data Retention active.
  try {
    const client = new OpenAI({ apiKey: key })
    const model  = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
    const res = await client.chat.completions.create({
      model,
      max_tokens: 150,
      temperature: 0.7,
      store: false,
      messages: [
        { role: "system" as const, content: systemPrompt },
        { role: "user"   as const, content: userMessage },
      ],
    })
    return res.choices[0]?.message?.content?.trim() ?? null
  } catch (err) {
    const e = err as { message?: string }
    console.error("[labs-save] insight error:", e.message)
    return null
  }
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: SaveBody
  try {
    body = (await request.json()) as SaveBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body || typeof body !== "object" || !body.markers || typeof body.markers !== "object") {
    return NextResponse.json({ error: "Missing markers payload" }, { status: 400 })
  }

  // ── Validate collectedAt ─────────────────────────────────────────────────
  const today      = new Date().toISOString().slice(0, 10)
  const fiveYrsAgo = new Date(Date.now() - 5 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  let collectedAt = body.collectedAt
    ? body.collectedAt.length > 10 ? body.collectedAt : `${body.collectedAt}T00:00:00Z`
    : new Date().toISOString()
  const collectedDateOnly = collectedAt.slice(0, 10)
  if (collectedDateOnly > today) {
    return NextResponse.json({ error: "Lab date cannot be in the future" }, { status: 400 })
  }
  if (collectedDateOnly < fiveYrsAgo) {
    return NextResponse.json({ error: "Lab date cannot be more than 5 years ago" }, { status: 400 })
  }

  // ── Build the row from registry IDs ──────────────────────────────────────
  const row: Record<string, unknown> = {
    user_id:          user.id,
    collected_at:     collectedAt,
    source_lab:       body.sourceLab ?? null,
    parser_used:      body.parserUsed ?? "manual",
    parse_confidence: typeof body.parseConfidence === "number" ? body.parseConfidence : null,
    raw_pdf_path:     body.rawPdfPath ?? null,
  }

  // Map every registry id → DB column. Markers absent from the payload
  // are written as NULL. The set of columns matches the registry exactly
  // (enforced by the schema-sync test). normalizeMarker tolerates both
  // structured ParseResult marker objects and bare numbers (manual entry).
  const normalizedMarkers: Record<string, SaveMarkerPayload | null> = {}
  for (const m of BLOOD_MARKER_REGISTRY) {
    const normalized = normalizeMarker(body.markers[m.id])
    normalizedMarkers[m.id] = normalized
    row[m.id] = normalized?.value ?? null
  }

  // ── Insert blood_results row ─────────────────────────────────────────────
  const { data: bloodResult, error: insertError } = await supabase
    .from("blood_results")
    .insert(row)
    .select()
    .single()
  if (insertError || !bloodResult) {
    console.error("[labs/save] insert error:", insertError)
    return NextResponse.json({ error: "Failed to save lab results" }, { status: 500 })
  }

  // ── Insert per-marker confidence rows ────────────────────────────────────
  const confidenceRows: Array<{
    blood_result_id: string
    marker_id: string
    confidence: number
    raw_extracted_text: string | null
    was_computed: boolean
  }> = []
  for (const [markerId, parsed] of Object.entries(normalizedMarkers)) {
    if (!parsed) continue
    confidenceRows.push({
      blood_result_id: bloodResult.id as string,
      marker_id: markerId,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      raw_extracted_text: typeof parsed.rawExtractedText === "string" ? parsed.rawExtractedText : null,
      was_computed: parsed.wasComputed === true,
    })
  }
  if (confidenceRows.length > 0) {
    const { error: confErr } = await supabase
      .from("blood_marker_confidence")
      .insert(confidenceRows)
    if (confErr) {
      // Non-fatal — the result row is saved, confidence is forensic only.
      console.error("[labs/save] confidence insert error (continuing):", confErr.message)
    }
  }

  // ── Score recalc + cross-panel insight (run in parallel) ─────────────────
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [newScore, bloodInsight] = await Promise.all([
    recalculateScore(user.id, serviceClient),
    generateBloodInsight(user.id, supabase, row as DbRow),
  ])

  return NextResponse.json({
    bloodResultId:    bloodResult.id,
    score:            newScore,
    markersExtracted: confidenceRows.length,
    bloodInsight:     bloodInsight ?? undefined,
  })
}

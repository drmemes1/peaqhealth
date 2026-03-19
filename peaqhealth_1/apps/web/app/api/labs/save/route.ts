import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"
import type { BloodMarkers } from "../../../components/lab-upload"
import { AzureOpenAI } from "openai"

type DbRow = Record<string, number | string | null | undefined>

async function generateBloodInsight(row: DbRow): Promise<string | null> {
  const key = process.env.AZURE_OPENAI_KEY
  if (!key) return null

  const n = (v: unknown) => typeof v === "number" && v > 0

  const present: string[] = []
  if (n(row.ldl_mgdl))           present.push(`LDL: ${row.ldl_mgdl} mg/dL`)
  if (n(row.hdl_mgdl))           present.push(`HDL: ${row.hdl_mgdl} mg/dL`)
  if (n(row.triglycerides_mgdl)) present.push(`Triglycerides: ${row.triglycerides_mgdl} mg/dL`)
  if (n(row.hs_crp_mgl))         present.push(`hsCRP: ${row.hs_crp_mgl} mg/L`)
  if (n(row.glucose_mgdl))       present.push(`Glucose: ${row.glucose_mgdl} mg/dL`)
  if (n(row.hba1c_pct))          present.push(`HbA1c: ${row.hba1c_pct}%`)
  if (n(row.vitamin_d_ngml))     present.push(`Vitamin D: ${row.vitamin_d_ngml} ng/mL`)
  if (n(row.apob_mgdl))          present.push(`ApoB: ${row.apob_mgdl} mg/dL`)
  if (n(row.egfr_mlmin))         present.push(`eGFR: ${row.egfr_mlmin} mL/min`)
  if (n(row.alt_ul))             present.push(`ALT: ${row.alt_ul} U/L`)
  if (n(row.wbc_kul))            present.push(`WBC: ${row.wbc_kul} K/uL`)
  if (n(row.albumin_gdl))        present.push(`Albumin: ${row.albumin_gdl} g/dL`)
  if (n(row.hemoglobin_gdl))     present.push(`Hemoglobin: ${row.hemoglobin_gdl} g/dL`)
  if (n(row.lpa_mgdl))           present.push(`Lp(a): ${row.lpa_mgdl} mg/dL`)
  if (present.length === 0) return null

  const missing: string[] = []
  if (!n(row.hs_crp_mgl))    missing.push("hsCRP")
  if (!n(row.hba1c_pct))     missing.push("HbA1c")
  if (!n(row.vitamin_d_ngml)) missing.push("Vitamin D")
  if (!n(row.apob_mgdl))     missing.push("ApoB")
  if (!n(row.lpa_mgdl))      missing.push("Lp(a)")

  const insightPrompt = `You are a longevity health assistant for Peaq Health, a precision wellness platform.

A user just uploaded their blood panel.
Present markers: ${present.join(", ")}
${missing.length > 0 ? `Missing high-value markers: ${missing.join(", ")}` : "Panel is comprehensive."}

Write exactly 2 sentences:
1. One sentence about the most notable finding in their results — good or concerning. Reference the actual values.
2. One sentence about what missing markers would add to their picture, framed as opportunity. If panel is complete, mention a lifestyle factor that could improve their weakest marker.

Rules:
- Be specific — use actual numbers
- Warm but clinical tone
- No disclaimers, no "I'm not a doctor", no "Great job" or hollow praise
- Max 50 words total
- Never mention markers with value 0`

  try {
    const client = new AzureOpenAI({
      apiKey: key,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: "2024-08-01-preview",
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    })
    const res = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      max_tokens: 120,
      temperature: 0.7,
      messages: [{ role: "user", content: insightPrompt }],
    })
    const insight = res.choices[0]?.message?.content?.trim() ?? null
    console.log("[insight] generated:", insight)
    return insight
  } catch {
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
      hs_crp_mgl:         markers.hsCRP_mgL          ?? null,
      vitamin_d_ngml:     markers.vitaminD_ngmL      ?? null,
      apob_mgdl:          markers.apoB_mgdL          ?? null,
      ldl_mgdl:           markers.ldl_mgdL           ?? null,
      hdl_mgdl:           markers.hdl_mgdL           ?? null,
      triglycerides_mgdl: markers.triglycerides_mgdL ?? null,
      lpa_mgdl:           markers.lpa_mgdL           ?? null,
      glucose_mgdl:       markers.glucose_mgdL       ?? null,
      hba1c_pct:          markers.hba1c_pct          ?? null,
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
    generateBloodInsight(savedRow ?? {}),
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

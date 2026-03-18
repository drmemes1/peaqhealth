import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"
import type { BloodMarkers } from "../../../components/lab-upload"
import OpenAI from "openai"

async function generateBloodInsight(markers: BloodMarkers): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  const lines: string[] = []
  if (markers.hsCRP_mgL)          lines.push(`hs-CRP: ${markers.hsCRP_mgL} mg/L`)
  if (markers.apoB_mgdL)          lines.push(`ApoB: ${markers.apoB_mgdL} mg/dL`)
  if (markers.ldl_mgdL)           lines.push(`LDL: ${markers.ldl_mgdL} mg/dL`)
  if (markers.hdl_mgdL)           lines.push(`HDL: ${markers.hdl_mgdL} mg/dL`)
  if (markers.triglycerides_mgdL) lines.push(`Triglycerides: ${markers.triglycerides_mgdL} mg/dL`)
  if (markers.lpa_mgdL)           lines.push(`Lp(a): ${markers.lpa_mgdL} mg/dL`)
  if (markers.glucose_mgdL)       lines.push(`Glucose: ${markers.glucose_mgdL} mg/dL`)
  if (markers.hba1c_pct)          lines.push(`HbA1c: ${markers.hba1c_pct}%`)
  if (markers.vitaminD_ngmL)      lines.push(`Vitamin D: ${markers.vitaminD_ngmL} ng/mL`)
  if (lines.length === 0) return null

  try {
    const client = new OpenAI({ apiKey: key })
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 120,
      messages: [{
        role: "system",
        content: "You are a concise health data interpreter. Write 1–3 sentence plain-English summary of these blood markers for the patient. Be specific about what looks good or needs attention. Do not use the word 'remarkable'. No markdown. No disclaimers.",
      }, {
        role: "user",
        content: lines.join(", "),
      }],
    })
    return res.choices[0]?.message?.content?.trim() ?? null
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

  const [newScore, bloodInsight] = await Promise.all([
    recalculateScore(user.id, serviceClient),
    generateBloodInsight(markers),
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

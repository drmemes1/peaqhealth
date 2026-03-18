import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"
import type { BloodMarkers } from "../../../components/lab-upload"

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
      locked_at:          null,
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
  const newScore = await recalculateScore(user.id, serviceClient)

  return NextResponse.json({
    score:          newScore,
    isNewVersion,
    lockExpiresAt,
  })
}

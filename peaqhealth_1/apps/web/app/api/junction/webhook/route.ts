import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"
import { createClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"
import { mapParserResultToBloodInputs, type LabParserResult } from "@peaq/api-client/junction"

const HANDLED_EVENTS = new Set([
  "daily.data.sleep.created",
  "daily.data.sleep.updated",
  "daily.data.sleep_cycle.created",
  "daily.data.sleep_cycle.updated",
  "daily.data.sleep_breathing_disturbance.created",
  "daily.data.sleep_breathing_disturbance.updated",
  "daily.data.sleep_apnea_alert.created",
  "historical.data",
  "provider.connection.created",
  "lab_report.parsing_job.updated",
])

export async function POST(request: NextRequest) {
  // ── Signature verification (Svix) ────────────────────────────────────────
  // Junction uses Svix to deliver webhooks. Svix signs each request with
  // three headers: svix-id, svix-timestamp, svix-signature.
  const webhookSecret = process.env.JUNCTION_WEBHOOK_SECRET
  const payload = await request.text()

  if (webhookSecret) {
    const svixId        = request.headers.get("svix-id")
    const svixTimestamp = request.headers.get("svix-timestamp")
    const svixSignature = request.headers.get("svix-signature")

    console.log("[webhook] svix headers — id:", svixId, "timestamp:", svixTimestamp, "signature present:", !!svixSignature)

    const wh = new Webhook(webhookSecret)
    try {
      wh.verify(payload, {
        "svix-id":        svixId        ?? "",
        "svix-timestamp": svixTimestamp ?? "",
        "svix-signature": svixSignature ?? "",
      })
      console.log("[webhook] Webhook signature verified")
    } catch {
      console.error("[webhook] Svix signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  } else {
    console.warn("[webhook] JUNCTION_WEBHOOK_SECRET not set — skipping verification")
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = JSON.parse(payload) as Record<string, unknown>
  } catch {
    console.error("[webhook] failed to parse JSON body")
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Junction webhook payload shape:
  //   event_type    — e.g. "daily.data.sleep.created"
  //   user_id       — Junction's own UUID for this user (stable, not hashed)
  //   client_user_id — our ID passed at user-creation time, BUT Junction
  //                    hashes it in webhook payloads, so we CANNOT use it
  //                    directly as a Supabase user ID.
  const event_type      = body.event_type      as string | undefined
  const junctionUserId  = body.user_id         as string | undefined
  const clientUserIdRaw = body.client_user_id  as string | undefined

  console.log("[webhook] received event:", event_type,
    "| junction user_id:", junctionUserId,
    "| client_user_id (hashed):", clientUserIdRaw)

  if (!event_type || !HANDLED_EVENTS.has(event_type)) {
    console.log("[webhook] ignoring event:", event_type)
    return NextResponse.json({ status: "ignored" })
  }

  // Lab parser webhooks may not have a junction user_id — handle separately
  if (event_type === "lab_report.parsing_job.updated" && !junctionUserId) {
    const data = body.data as Record<string, unknown> | undefined
    const jobId = (data?.job_id ?? data?.id) as string | undefined
    const jobStatus = data?.status as string | undefined
    console.log("[webhook] lab_report event without user_id — jobId:", jobId, "status:", jobStatus)

    if (jobStatus === "completed" && jobId) {
      const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      // Find the lab_results row by job_id to get the user
      const { data: labRow } = await supabaseAnon
        .from("lab_results")
        .select("id, user_id")
        .eq("junction_parser_job_id", jobId)
        .single()

      if (labRow) {
        const parserResult: LabParserResult = {
          jobId,
          status: "completed",
          data: data!.data as LabParserResult["data"],
        }
        const bloodInputs = mapParserResultToBloodInputs(parserResult)

        await supabaseAnon.from("lab_results").update({
          parser_status:      "complete",
          hs_crp_mgl:         bloodInputs.hsCRP_mgL ?? null,
          vitamin_d_ngml:     bloodInputs.vitaminD_ngmL ?? null,
          apob_mgdl:          bloodInputs.apoB_mgdL ?? null,
          ldl_mgdl:           bloodInputs.ldl_mgdL ?? null,
          hdl_mgdl:           bloodInputs.hdl_mgdL ?? null,
          triglycerides_mgdl: bloodInputs.triglycerides_mgdL ?? null,
          lpa_mgdl:           bloodInputs.lpa_mgdL ?? null,
          glucose_mgdl:       bloodInputs.glucose_mgdL ?? null,
          hba1c_pct:          bloodInputs.hba1c_pct ?? null,
          collection_date:    bloodInputs.labCollectionDate ?? null,
          lab_name:           bloodInputs.labName ?? null,
        }).eq("id", labRow.id)

        const newScore = await recalculateScore(labRow.user_id as string, supabaseAnon)
        console.log("[webhook] lab parser (no user_id) — updated and recalculated for user:", labRow.user_id)
        return NextResponse.json({ status: "processed", event: "lab_report_completed" })
      }
    }
    return NextResponse.json({ received: true })
  }

  if (!junctionUserId) {
    console.error("[webhook] missing user_id in payload")
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── Resolve Supabase user from Junction user_id ───────────────────────────
  // client_user_id is hashed by Junction in webhook payloads, so we look up
  // the real Supabase user ID via profiles.junction_user_id instead.
  const { data: profileRow, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("junction_user_id", junctionUserId)
    .single()

  if (profileErr || !profileRow) {
    // For provider.connection.created: junction_user_id may not be stamped yet.
    // Try client_user_id directly as the Supabase UUID (unhashed for this event type).
    if (event_type === "provider.connection.created" && clientUserIdRaw) {
      const { error: stampErr } = await supabase
        .from("profiles")
        .update({ junction_user_id: junctionUserId })
        .eq("id", clientUserIdRaw)
      if (!stampErr) {
        console.log("[webhook] provider.connection.created — stamped junction_user_id via client_user_id fallback:", clientUserIdRaw)
      } else {
        console.error("[webhook] provider.connection.created — fallback stamp failed:", stampErr.message)
      }
    }
    console.error("[webhook] No profile found for junction_user_id:", junctionUserId, "— skipping event")
    return NextResponse.json({ received: true, skipped: true })
  }

  const userId = profileRow.id as string
  console.log("[webhook] resolved Supabase userId:", userId, "for junction_user_id:", junctionUserId)

  // ── provider.connection.created: stamp junction_user_id + upsert connection ─
  if (event_type === "provider.connection.created") {
    await supabase
      .from("profiles")
      .update({ junction_user_id: junctionUserId })
      .eq("id", userId)

    const data = body.data as Record<string, unknown> | undefined
    const provider = (data?.source ?? data?.provider_slug ?? data?.provider ?? "unknown") as string

    const { error: connErr } = await supabase
      .from("wearable_connections")
      .upsert({
        user_id: userId,
        provider,
        junction_user_id: junctionUserId,
        connected_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        status: "connected",
      }, { onConflict: "user_id,provider" })

    if (connErr) console.error("[webhook] provider.connection.created — wearable_connections upsert error:", connErr.message)
    else console.log("[webhook] provider.connection.created — upserted wearable_connections for user:", userId, "provider:", provider)

    return NextResponse.json({ received: true })
  }

  // ── sleep_breathing_disturbance: store spo2 dip estimate ─────────────────
  if (
    event_type === "daily.data.sleep_breathing_disturbance.created" ||
    event_type === "daily.data.sleep_breathing_disturbance.updated"
  ) {
    const data = body.data as Record<string, unknown> | undefined
    const disturbanceCount = (data?.disturbance_count as number) ?? 0
    const spo2Dips =
      disturbanceCount === 0  ? 0 :
      disturbanceCount <= 3   ? 1 :
      disturbanceCount <= 10  ? 3 : 8

    console.log("[webhook] sleep_breathing_disturbance — processed for user:", userId)

    const { error: updateErr } = await supabase
      .from("wearable_connections")
      .update({ latest_spo2_dips: spo2Dips, last_sync_at: new Date().toISOString(), status: "connected" })
      .eq("user_id", userId)

    if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

    return NextResponse.json({ status: "processed", event: "sleep_breathing_disturbance" })
  }

  // ── sleep_apnea_alert: flag high_osa_risk ─────────────────────────────────
  if (event_type === "daily.data.sleep_apnea_alert.created") {
    console.log("[webhook] sleep_apnea_alert — flagging high_osa_risk for user:", userId)

    const { error: updateErr } = await supabase
      .from("wearable_connections")
      .update({ high_osa_risk: true, last_sync_at: new Date().toISOString(), status: "connected" })
      .eq("user_id", userId)

    if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook] sleep_apnea_alert — recalculated score for user:", userId)
    return NextResponse.json({ status: "processed", event: "sleep_apnea_alert" })
  }

  // ── historical.data: upsert sleep records then recalculate once ───────────
  if (event_type === "historical.data") {
    const data = body.data as Record<string, unknown> | undefined
    const sleepRecords = (data?.sleep ?? []) as Array<Record<string, unknown>>
    console.log("[webhook] historical.data — sleep records:", sleepRecords.length)

    if (sleepRecords.length > 0) {
      const retroNights = sleepRecords.filter(r => (r.duration as number) > 0).length
      const { error: updateErr } = await supabase
        .from("wearable_connections")
        .update({ retro_nights: retroNights, last_sync_at: new Date().toISOString(), status: "connected" })
        .eq("user_id", userId)

      if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)
    }

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook] historical.data — recalculated for user:", userId)
    return NextResponse.json({ status: "processed", event: "historical.data" })
  }

  // ── lab_report.parsing_job.updated: process parsed lab results ────────────
  if (event_type === "lab_report.parsing_job.updated") {
    const data = body.data as Record<string, unknown> | undefined
    const jobStatus = data?.status as string | undefined
    const jobId = (data?.job_id ?? data?.id) as string | undefined

    console.log("[webhook] lab_report.parsing_job.updated — jobId:", jobId, "status:", jobStatus)

    if (jobStatus === "completed" && data) {
      // Build a LabParserResult from the webhook payload
      const parserResult: LabParserResult = {
        jobId: jobId ?? "",
        status: "completed",
        data: data.data as LabParserResult["data"],
      }

      const bloodInputs = mapParserResultToBloodInputs(parserResult)
      console.log("[webhook] lab parser — extracted markers:", Object.keys(bloodInputs).filter(k => (bloodInputs as Record<string, unknown>)[k] !== undefined).length)

      // Find pending lab_results row by junction_parser_job_id, or insert new
      if (jobId) {
        const { data: existingLab } = await supabase
          .from("lab_results")
          .select("id")
          .eq("user_id", userId)
          .eq("junction_parser_job_id", jobId)
          .single()

        if (existingLab) {
          await supabase.from("lab_results").update({
            parser_status:      "complete",
            hs_crp_mgl:         bloodInputs.hsCRP_mgL ?? null,
            vitamin_d_ngml:     bloodInputs.vitaminD_ngmL ?? null,
            apob_mgdl:          bloodInputs.apoB_mgdL ?? null,
            ldl_mgdl:           bloodInputs.ldl_mgdL ?? null,
            hdl_mgdl:           bloodInputs.hdl_mgdL ?? null,
            triglycerides_mgdl: bloodInputs.triglycerides_mgdL ?? null,
            lpa_mgdl:           bloodInputs.lpa_mgdL ?? null,
            glucose_mgdl:       bloodInputs.glucose_mgdL ?? null,
            hba1c_pct:          bloodInputs.hba1c_pct ?? null,
            esr_mmhr:           bloodInputs.esr_mmhr ?? null,
            homocysteine_umoll: bloodInputs.homocysteine_umolL ?? null,
            ferritin_ngml:      bloodInputs.ferritin_ngmL ?? null,
            collection_date:    bloodInputs.labCollectionDate ?? null,
            lab_name:           bloodInputs.labName ?? null,
          }).eq("id", existingLab.id)

          console.log("[webhook] lab parser — updated existing lab_results row:", existingLab.id)
        } else {
          await supabase.from("lab_results").insert({
            user_id:                  userId,
            junction_parser_job_id:   jobId,
            source:                   "webhook_parser",
            parser_status:            "complete",
            collection_date:          bloodInputs.labCollectionDate ?? new Date().toISOString().slice(0, 10),
            lab_name:                 bloodInputs.labName ?? null,
            hs_crp_mgl:              bloodInputs.hsCRP_mgL ?? null,
            vitamin_d_ngml:          bloodInputs.vitaminD_ngmL ?? null,
            apob_mgdl:               bloodInputs.apoB_mgdL ?? null,
            ldl_mgdl:                bloodInputs.ldl_mgdL ?? null,
            hdl_mgdl:                bloodInputs.hdl_mgdL ?? null,
            triglycerides_mgdl:      bloodInputs.triglycerides_mgdL ?? null,
            lpa_mgdl:                bloodInputs.lpa_mgdL ?? null,
            glucose_mgdl:            bloodInputs.glucose_mgdL ?? null,
            hba1c_pct:               bloodInputs.hba1c_pct ?? null,
            esr_mmhr:                bloodInputs.esr_mmhr ?? null,
            homocysteine_umoll:      bloodInputs.homocysteine_umolL ?? null,
            ferritin_ngml:           bloodInputs.ferritin_ngmL ?? null,
          })

          console.log("[webhook] lab parser — inserted new lab_results row for user:", userId)
        }

        const newScore = await recalculateScore(userId, supabase)
        console.log("[webhook] lab parser — recalculated for user:", userId)
        return NextResponse.json({ status: "processed", event: "lab_report_completed" })
      }
    }

    return NextResponse.json({ received: true, event: "lab_report.parsing_job.updated" })
  }

  // ── All other sleep events: update last_sync_at + biometrics + recalculate ─
  console.log("[webhook] sleep event:", event_type, "— updating last_sync_at and recalculating for user:", userId)

  // Extract resting HR and VO2 max from sleep data when available
  const sleepData = body.data as Record<string, unknown> | undefined
  const updatePayload: Record<string, unknown> = { last_sync_at: new Date().toISOString(), status: "connected" }
  const hrLowest = sleepData?.hr_lowest as number | undefined
  const avgHR = sleepData?.average_hr as number | undefined
  const vo2Max = sleepData?.vo2_max as number | undefined
  if (hrLowest && hrLowest > 0) updatePayload.latest_resting_hr = hrLowest
  else if (avgHR && avgHR > 0) updatePayload.latest_resting_hr = avgHR
  if (vo2Max && vo2Max > 0) updatePayload.latest_vo2max = vo2Max

  const { error: updateErr } = await supabase
    .from("wearable_connections")
    .update(updatePayload)
    .eq("user_id", userId)

  if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

  const newScore = await recalculateScore(userId, supabase)
  console.log("[webhook] recalculated for user:", userId)
  return NextResponse.json({ status: "processed" })
}

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
  "historical.data.sleep.created",
  "historical.data.sleep_cycle.created",
  "daily.data.sleep_breathing_disturbance.created",
  "daily.data.sleep_breathing_disturbance.updated",
  "daily.data.sleep_apnea_alert.created",
  "historical.data",
  "provider.connection.created",
  "lab_report.parsing_job.updated",
])

// ── Helper: fetch sleep sessions from the Vital API ──────────────────────────
async function fetchSleepSessions(
  junctionUserId: string,
): Promise<Array<Record<string, unknown>>> {
  const baseUrl = process.env.JUNCTION_ENV === "production"
    ? "https://api.tryvital.io"
    : "https://api.sandbox.tryvital.io"

  const endDate = new Date().toISOString().split("T")[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const url = `${baseUrl}/v2/summary/sleep/${junctionUserId}?start_date=${startDate}&end_date=${endDate}`
  console.log("[sleep] fetching URL:", url)

  try {
    const res = await fetch(url, { headers: { "x-vital-api-key": process.env.JUNCTION_API_KEY! } })
    if (!res.ok) {
      const body = await res.text()
      console.error("[sleep] Vital API fetch failed:", res.status, "body:", body)
      return []
    }
    const data = await res.json() as Record<string, unknown>
    const sessions = (data.sleep ?? data.data ?? []) as Array<Record<string, unknown>>
    console.log("[sleep] sessions fetched:", sessions.length)
    if (sessions.length > 0) {
      console.log("[sleep] session[0]:", JSON.stringify(sessions[0]).slice(0, 500))
    }
    return sessions
  } catch (err) {
    console.error("[sleep] fetch error:", err instanceof Error ? err.message : "unknown")
    return []
  }
}

// ── Helper: map a Vital sleep session to a sleep_data row ─────────────────────
function buildSleepDataRow(session: Record<string, unknown>, userId: string): Record<string, unknown> | null {
  const date = session.calendar_date as string | undefined
  if (!date) return null
  const totalSecs = (session.total as number) || (session.duration as number) || 0
  if (totalSecs === 0) return null

  const deepSecs  = (session.deep  as number) || 0
  const remSecs   = (session.rem   as number) || 0
  const efficiency = (session.efficiency as number) || 0
  const hrv       = (session.hrv_rmssd ?? session.hrv ?? null) as number | null
  const hrLowest  = (session.hr_lowest as number) || 0
  const spo2Avg   = (session.spo2_avg as number) || 0
  // Normalize source from Vital API (may be "Oura", "oura", etc.)
  const rawSource = (session.source as string | undefined) ?? "oura"
  const source    = rawSource.toLowerCase().includes("oura") ? "oura"
    : rawSource.toLowerCase().includes("whoop") ? "whoop"
    : rawSource.toLowerCase()

  return {
    user_id:             userId,
    date,
    source,
    total_sleep_minutes: Math.round(totalSecs / 60),
    deep_sleep_minutes:  deepSecs   > 0 ? Math.round(deepSecs  / 60) : null,
    rem_sleep_minutes:   remSecs    > 0 ? Math.round(remSecs   / 60) : null,
    sleep_efficiency:    efficiency > 0 ? Math.round(efficiency * 10) / 10 : null,
    hrv_rmssd:           hrv !== null && hrv > 0 ? Math.round(hrv * 10) / 10 : null,
    resting_heart_rate:  hrLowest   > 0 ? hrLowest : null,
    spo2:                spo2Avg    > 0 ? spo2Avg  : null,
  }
}

// ── Helper: build wearable update payload from a single sleep session ──────────
function buildSleepUpdatePayload(session: Record<string, unknown>): Record<string, unknown> {
  // Vital API v2 short field names: total, deep, rem, light, efficiency
  const totalSecs  = (session.total as number) || (session.duration as number) || 0
  const payload: Record<string, unknown> = {
    last_sync_at: new Date().toISOString(),
    status: "connected",
  }

  if (totalSecs > 0) {
    const deepSecs   = (session.deep       as number) || 0
    const remSecs    = (session.rem        as number) || 0
    const lightSecs  = (session.light      as number) || 0
    const efficiency = (session.efficiency as number) || 0
    const hrv        = (session.hrv_rmssd ?? session.hrv ?? null) as number | null
    const hrLowest   = (session.hr_lowest  as number) || 0
    const spo2Avg    = session.spo2_avg    as number | undefined

    if (deepSecs  > 0) payload.deep_sleep_pct    = Math.round((deepSecs  / totalSecs) * 1000) / 10
    if (remSecs   > 0) payload.rem_pct            = Math.round((remSecs   / totalSecs) * 1000) / 10
    if (lightSecs > 0) payload.light_sleep_pct    = Math.round((lightSecs / totalSecs) * 1000) / 10
    if (efficiency > 0) payload.sleep_efficiency  = Math.round(efficiency * 10) / 10
    if (hrv !== null && hrv > 0) payload.hrv_rmssd = hrv
    if (hrLowest  > 0) payload.latest_resting_hr   = hrLowest
    payload.total_sleep_seconds = totalSecs
    if (spo2Avg !== undefined && spo2Avg > 0) {
      // Estimate dip count from average SpO2 (Vital doesn't surface raw dip counts via sleep summary)
      payload.latest_spo2_dips = spo2Avg >= 95 ? 0 : spo2Avg >= 92 ? 2 : 5
    }
  }

  return payload
}

// ── Helper: build averaged wearable payload from multiple sleep sessions ───────
function buildAveragedSleepPayload(sessions: Array<Record<string, unknown>>): Record<string, unknown> | null {
  // Filter out naps and very short sessions — only count full nights (>1 hour)
  const fullSessions = sessions.filter(s => {
    const total = (s.total as number) || (s.duration as number) || 0
    const type  = s.type as string | undefined
    return total > 3600 && type !== "acknowledged_nap" && type !== "nap"
  })
  console.log("[sleep] full sessions:", fullSessions.length, "of", sessions.length)

  const nightsAvailable = fullSessions.length
  if (nightsAvailable < 7) return null

  const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length

  const deepPcts: number[]     = []
  const remPcts: number[]      = []
  const efficiencies: number[] = []
  const hrvs: number[]         = []
  const restingHRs: number[]   = []
  const totalSecsList: number[] = []

  for (const s of fullSessions) {
    const totalSecs  = (s.total as number) || (s.duration as number) || 0
    const deepSecs   = (s.deep       as number) || 0
    const remSecs    = (s.rem        as number) || 0
    const efficiency = (s.efficiency as number) || 0
    // HRV: use null coalescing — don't conflate missing with zero
    const hrv        = (s.hrv_rmssd ?? s.hrv ?? null) as number | null
    const hrLowest   = (s.hr_lowest  as number) || 0

    totalSecsList.push(totalSecs)
    if (deepSecs  > 0) deepPcts.push((deepSecs / totalSecs) * 100)
    if (remSecs   > 0) remPcts.push((remSecs   / totalSecs) * 100)
    if (efficiency > 0) efficiencies.push(efficiency)
    if (hrv !== null && hrv > 0) hrvs.push(hrv)
    if (hrLowest  > 0) restingHRs.push(hrLowest)
  }

  const payload: Record<string, unknown> = {
    last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "connected",
    nights_available: nightsAvailable,
    total_sleep_seconds: Math.round(avg(totalSecsList)),
  }

  if (deepPcts.length)     payload.deep_sleep_pct   = Math.round(avg(deepPcts)     * 10) / 10
  if (remPcts.length)      payload.rem_pct           = Math.round(avg(remPcts)      * 10) / 10
  if (efficiencies.length) payload.sleep_efficiency  = Math.round(avg(efficiencies) * 10) / 10
  if (hrvs.length)         payload.hrv_rmssd          = Math.round(avg(hrvs)         * 10) / 10
  if (restingHRs.length)   payload.latest_resting_hr  = Math.round(avg(restingHRs))

  console.log("[sleep] nights available:", nightsAvailable,
    "avg efficiency:", payload.sleep_efficiency,
    "avg deep%:", payload.deep_sleep_pct,
    "avg rem%:", payload.rem_pct,
    "avg HRV:", payload.hrv_rmssd,
    "avg resting HR:", payload.latest_resting_hr)

  return payload
}

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
        .from("blood_results")
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

        await supabaseAnon.from("blood_results").update({
          hs_crp_mgl:         bloodInputs.hsCRP_mgL ?? null,
          vitamin_d_ngml:     bloodInputs.vitaminD_ngmL ?? null,
          apob_mgdl:          bloodInputs.apoB_mgdL ?? null,
          ldl_mgdl:           bloodInputs.ldl_mgdL ?? null,
          hdl_mgdl:           bloodInputs.hdl_mgdL ?? null,
          triglycerides_mgdl: bloodInputs.triglycerides_mgdL ?? null,
          lipoprotein_a_mgdl:           bloodInputs.lpa_mgdL ?? null,
          glucose_mgdl:       bloodInputs.glucose_mgdL ?? null,
          hba1c_percent:          bloodInputs.hba1c_pct ?? null,
          collected_at:    bloodInputs.labCollectionDate ?? null,
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
    console.error("[webhook] No profile found for junction_user_id (lookup failed)", "— skipping event")
    return NextResponse.json({ received: true, skipped: true })
  }

  const userId = profileRow.id as string
  console.log("[webhook] resolved user:", userId?.slice(0, 8))

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
    else console.log("[webhook] provider.connection.created — upserted wearable_connections for user:", userId?.slice?.(0, 8) ?? "?", "provider:", provider)

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

    console.log("[webhook] sleep_breathing_disturbance — processed for user:", userId?.slice?.(0, 8) ?? "?")

    const { error: updateErr } = await supabase
      .from("wearable_connections")
      .update({
        latest_spo2_dips: spo2Dips,
        last_sync_at: new Date().toISOString(),
        status: "connected",
      })
      .eq("junction_user_id", junctionUserId)

    if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

    return NextResponse.json({ status: "processed", event: "sleep_breathing_disturbance" })
  }

  // ── sleep_apnea_alert: flag high_osa_risk ─────────────────────────────────
  if (event_type === "daily.data.sleep_apnea_alert.created") {
    console.log("[webhook] sleep_apnea_alert — flagging high_osa_risk for user:", userId?.slice?.(0, 8) ?? "?")

    const { error: updateErr } = await supabase
      .from("wearable_connections")
      .update({
        high_osa_risk: true,
        last_sync_at: new Date().toISOString(),
        status: "connected",
      })
      .eq("junction_user_id", junctionUserId)

    if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook] sleep_apnea_alert — recalculated score for user:", userId?.slice?.(0, 8) ?? "?")
    return NextResponse.json({ status: "processed", event: "sleep_apnea_alert" })
  }

  // ── sleep_cycle events: extract sleep architecture + save display columns ─
  if (
    event_type === "daily.data.sleep_cycle.created" ||
    event_type === "daily.data.sleep_cycle.updated"
  ) {
    const data = body.data as Record<string, unknown> | undefined
    console.log("[sleep-cycle] full payload:", JSON.stringify(body.data).slice(0, 500))
    const duration = (data?.total_sleep_duration as number) || (data?.duration as number) || 0

    const updatePayload: Record<string, unknown> = {
      last_sync_at: new Date().toISOString(),
      status: "connected",
    }

    if (duration > 0) {
      const deepSecs   = (data?.deep               as number) || (data?.deep_sleep_duration  as number) || 0
      const remSecs    = (data?.rem                as number) || (data?.rem_sleep_duration   as number) || 0
      const lightSecs  = (data?.light              as number) || (data?.light_sleep_duration as number) || 0
      const deepPct    = (deepSecs  / duration) * 100
      const remPct     = (remSecs   / duration) * 100
      const lightPct   = (lightSecs / duration) * 100
      const efficiency = (data?.efficiency         as number) || (data?.sleep_efficiency     as number) || 0
      const hrv        = (data?.hrv_rmssd_evening  as number) || (data?.hrv_rmssd as number) || (data?.hrv as number) || 0

      if (deepPct  > 0) updatePayload.deep_sleep_pct  = Math.round(deepPct  * 10) / 10
      if (remPct   > 0) updatePayload.rem_pct          = Math.round(remPct   * 10) / 10
      if (lightPct > 0) updatePayload.light_sleep_pct  = Math.round(lightPct * 10) / 10
      if (efficiency > 0) updatePayload.sleep_efficiency = Math.round(efficiency * 10) / 10
      if (hrv > 0) updatePayload.hrv_rmssd = hrv

      console.log("[webhook]", event_type, "— deepPct:", deepPct.toFixed(1),
        "remPct:", remPct.toFixed(1), "efficiency:", efficiency, "hrv:", hrv,
        "for user:", userId?.slice?.(0, 8) ?? "?")
    } else {
      console.log("[webhook]", event_type, "— no duration in payload, skipping percentages for user:", userId?.slice?.(0, 8) ?? "?")
    }

    const { error: updateErr } = await supabase
      .from("wearable_connections")
      .update(updatePayload)
      .eq("junction_user_id", junctionUserId)

    if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook]", event_type, "— recalculated score:", newScore, "for user:", userId?.slice?.(0, 8) ?? "?")
    return NextResponse.json({ status: "processed", event: event_type })
  }

  // ── historical.data.sleep.created: fetch 7-night avg from Vital API + save ─
  if (event_type === "historical.data.sleep.created") {
    const data = body.data as Record<string, unknown> | undefined
    const startDate = (body.start_date ?? data?.start_date) as string | undefined
    const endDate   = (body.end_date   ?? data?.end_date)   as string | undefined

    if (!startDate || !endDate) {
      console.log("[sleep] historical — missing dates in payload, skipping")
      return NextResponse.json({ received: true })
    }

    const sessions = await fetchSleepSessions(junctionUserId)

    // Filter naps and short sessions before counting — must match buildAveragedSleepPayload
    const fullSessions = sessions.filter(s => {
      const type = s.type as string | undefined
      const d = (s.total as number) || (s.duration as number) || 0
      return d > 3600 && type !== "acknowledged_nap" && type !== "nap"
    })
    const nightsAvailable = fullSessions.length

    console.log("[sleep] full sessions:", nightsAvailable, "of", sessions.length, "for user:", userId?.slice?.(0, 8) ?? "?")

    if (nightsAvailable < 7) {
      console.log("[sleep] insufficient full sessions (<7) — storing count only, skipping averages")
      await supabase
        .from("wearable_connections")
        .update({
          nights_available: nightsAvailable,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: "connected",
        })
        .eq("junction_user_id", junctionUserId)
      return NextResponse.json({ received: true, nightsAvailable })
    }

    // Write each full session to sleep_data (primary upsert)
    const sleepRows = fullSessions
      .map(s => buildSleepDataRow(s, userId))
      .filter((r): r is Record<string, unknown> => r !== null)

    console.log("[sleep] upserting to sleep_data:", sleepRows.length, "rows")
    const { data: upsertedRows, error: sleepErr } = await supabase
      .from("sleep_data")
      .upsert(sleepRows, { onConflict: "user_id,date,source" })
      .select("id")
    console.log("[sleep] sleep_data upsert result:", upsertedRows?.length ?? 0, "rows | error:", sleepErr?.message ?? "none")

    // Also update wearable_connections for UI status
    const updatePayload = buildAveragedSleepPayload(sessions)
    if (updatePayload) {
      const { error: connErr } = await supabase
        .from("wearable_connections")
        .update(updatePayload)
        .eq("junction_user_id", junctionUserId)
      if (connErr) console.error("[webhook] wearable_connections update error:", connErr.message)
    }

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook] historical.data.sleep.created — recalculated score:", newScore, "for user:", userId?.slice?.(0, 8) ?? "?")
    return NextResponse.json({ status: "processed", event: event_type })
  }

  // ── historical.data.sleep_cycle.created: fetch from Vital API (deduped) ──
  if (event_type === "historical.data.sleep_cycle.created") {
    // Skip if already synced today — historical events can fire repeatedly
    const { data: wConn } = await supabase
      .from("wearable_connections")
      .select("last_sync_at")
      .eq("user_id", userId)
      .maybeSingle()

    const today = new Date().toISOString().slice(0, 10)
    if (wConn?.last_sync_at && (wConn.last_sync_at as string).slice(0, 10) === today) {
      console.log("[sleep-cycle] already synced today — skipping for user:", userId?.slice?.(0, 8) ?? "?")
      return NextResponse.json({ status: "skipped", event: event_type })
    }

    const data = body.data as Record<string, unknown> | undefined
    const startDate = (body.start_date ?? data?.start_date) as string | undefined
    const endDate   = (body.end_date   ?? data?.end_date)   as string | undefined

    if (!startDate || !endDate) {
      console.log("[sleep-cycle] historical — missing dates in payload, skipping")
      return NextResponse.json({ received: true })
    }

    const sessions = await fetchSleepSessions(junctionUserId)
    const fullSessions = sessions.filter(s => {
      const total = (s.total as number) || (s.duration as number) || 0
      const type  = s.type as string | undefined
      return total > 3600 && type !== "acknowledged_nap" && type !== "nap"
    })
    const session = fullSessions[0] ?? null
    if (!session) {
      console.log("[sleep-cycle] no full sleep session returned from API for user:", userId?.slice?.(0, 8) ?? "?")
      return NextResponse.json({ received: true })
    }

    const updatePayload = buildSleepUpdatePayload(session)
    console.log("[sleep-cycle] historical — saving —", Object.entries(updatePayload)
      .filter(([k]) => k !== "last_sync_at" && k !== "status")
      .map(([k, v]) => `${k}: ${v}`).join(", "), "for user:", userId?.slice?.(0, 8) ?? "?")

    // Write all full sessions to sleep_data
    const sleepRows = fullSessions
      .map(s => buildSleepDataRow(s, userId))
      .filter((r): r is Record<string, unknown> => r !== null)

    console.log("[sleep-cycle] upserting to sleep_data:", sleepRows.length, "rows")
    const { data: upsertedRows, error: sleepErr } = await supabase
      .from("sleep_data")
      .upsert(sleepRows, { onConflict: "user_id,date,source" })
      .select("id")
    console.log("[sleep-cycle] sleep_data upsert result:", upsertedRows?.length ?? 0, "rows | error:", sleepErr?.message ?? "none")

    // Also update wearable_connections for UI status
    const { error: updateErr } = await supabase
      .from("wearable_connections")
      .update(updatePayload)
      .eq("junction_user_id", junctionUserId)
    if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook]", event_type, "— recalculated score:", newScore, "for user:", userId?.slice?.(0, 8) ?? "?")
    return NextResponse.json({ status: "processed", event: event_type })
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
        .update({
          retro_nights: retroNights,
          last_sync_at: new Date().toISOString(),
          status: "connected",
        })
        .eq("junction_user_id", junctionUserId)

      if (updateErr) console.error("[webhook] wearable_connections update error:", updateErr.message)
    }

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook] historical.data — recalculated for user:", userId?.slice?.(0, 8) ?? "?")
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
          .from("blood_results")
          .select("id")
          .eq("user_id", userId)
          .eq("junction_parser_job_id", jobId)
          .single()

        if (existingLab) {
          await supabase.from("blood_results").update({
            hs_crp_mgl:         bloodInputs.hsCRP_mgL ?? null,
            vitamin_d_ngml:     bloodInputs.vitaminD_ngmL ?? null,
            apob_mgdl:          bloodInputs.apoB_mgdL ?? null,
            ldl_mgdl:           bloodInputs.ldl_mgdL ?? null,
            hdl_mgdl:           bloodInputs.hdl_mgdL ?? null,
            triglycerides_mgdl: bloodInputs.triglycerides_mgdL ?? null,
            lipoprotein_a_mgdl:           bloodInputs.lpa_mgdL ?? null,
            glucose_mgdl:       bloodInputs.glucose_mgdL ?? null,
            hba1c_percent:          bloodInputs.hba1c_pct ?? null,
            esr_mmhr:           bloodInputs.esr_mmhr ?? null,
            homocysteine_umoll: bloodInputs.homocysteine_umolL ?? null,
            ferritin_ngml:      bloodInputs.ferritin_ngmL ?? null,
            collected_at:    bloodInputs.labCollectionDate ?? null,
            lab_name:           bloodInputs.labName ?? null,
          }).eq("id", existingLab.id)

          console.log("[webhook] lab parser — updated existing lab_results row:", existingLab.id)
        } else {
          await supabase.from("blood_results").insert({
            user_id:                  userId,
            junction_parser_job_id:   jobId,
            source:                   "webhook_parser",
            collected_at:          bloodInputs.labCollectionDate ?? new Date().toISOString().slice(0, 10),
            lab_name:                 bloodInputs.labName ?? null,
            hs_crp_mgl:              bloodInputs.hsCRP_mgL ?? null,
            vitamin_d_ngml:          bloodInputs.vitaminD_ngmL ?? null,
            apob_mgdl:               bloodInputs.apoB_mgdL ?? null,
            ldl_mgdl:                bloodInputs.ldl_mgdL ?? null,
            hdl_mgdl:                bloodInputs.hdl_mgdL ?? null,
            triglycerides_mgdl:      bloodInputs.triglycerides_mgdL ?? null,
            lipoprotein_a_mgdl:                bloodInputs.lpa_mgdL ?? null,
            glucose_mgdl:            bloodInputs.glucose_mgdL ?? null,
            hba1c_percent:               bloodInputs.hba1c_pct ?? null,
            esr_mmhr:                bloodInputs.esr_mmhr ?? null,
            homocysteine_umoll:      bloodInputs.homocysteine_umolL ?? null,
            ferritin_ngml:           bloodInputs.ferritin_ngmL ?? null,
          })

          console.log("[webhook] lab parser — inserted new lab_results row for user:", userId?.slice?.(0, 8) ?? "?")
        }

        const newScore = await recalculateScore(userId, supabase)
        console.log("[webhook] lab parser — recalculated for user:", userId?.slice?.(0, 8) ?? "?")
        return NextResponse.json({ status: "processed", event: "lab_report_completed" })
      }
    }

    return NextResponse.json({ received: true, event: "lab_report.parsing_job.updated" })
  }

  // ── daily.data.sleep.created/updated: single session → sleep_data ────────────
  if (
    event_type === "daily.data.sleep.created" ||
    event_type === "daily.data.sleep.updated"
  ) {
    const session = body.data as Record<string, unknown> | undefined
    if (session) {
      const row = buildSleepDataRow(session, userId)
      if (row) {
        console.log("[sleep] daily — upserting to sleep_data: date:", row.date, "source:", row.source)
        const { data: upsertedRows, error: sleepErr } = await supabase
          .from("sleep_data")
          .upsert([row], { onConflict: "user_id,date,source" })
          .select("id")
        console.log("[sleep] daily — sleep_data upsert result:", upsertedRows?.length ?? 0, "rows | error:", sleepErr?.message ?? "none")
      } else {
        console.log("[sleep] daily —", event_type, "— no calendar_date or duration in payload, skipping")
      }
    }

    await supabase
      .from("wearable_connections")
      .update({ last_sync_at: new Date().toISOString(), status: "connected" })
      .eq("junction_user_id", junctionUserId)

    const newScore = await recalculateScore(userId, supabase)
    console.log("[webhook]", event_type, "— recalculated score:", newScore, "for user:", userId?.slice?.(0, 8) ?? "?")
    return NextResponse.json({ status: "processed", event: event_type })
  }

  // ── All other sleep events: update last_sync_at + biometrics + recalculate ─
  console.log("[webhook] sleep event:", event_type, "— updating last_sync_at and recalculating for user:", userId?.slice?.(0, 8) ?? "?")

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
    .upsert({
      user_id: userId,
      junction_user_id: junctionUserId,
      provider: "unknown",
      connected_at: new Date().toISOString(),
      ...updatePayload,
    }, { onConflict: "user_id" })

  if (updateErr) console.error("[webhook] wearable_connections upsert error:", updateErr.message)

  const newScore = await recalculateScore(userId, supabase)
  console.log("[webhook] recalculated for user:", userId?.slice?.(0, 8) ?? "?")
  return NextResponse.json({ status: "processed" })
}

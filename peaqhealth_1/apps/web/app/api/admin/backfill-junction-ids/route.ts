import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST /api/admin/backfill-junction-ids
 *
 * One-time backfill: for every profile missing junction_user_id,
 * calls the Junction API to find their user by client_user_id
 * (which is our Supabase user ID) and stamps it.
 *
 * Protected by SUPABASE_SERVICE_ROLE_KEY in the Authorization header.
 * DELETE THIS ROUTE after the backfill is complete.
 */
export async function POST(request: NextRequest) {
  // Guard: only allow requests with the service role key
  const authHeader = request.headers.get("authorization")
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const junctionApiKey = process.env.JUNCTION_API_KEY
  if (!junctionApiKey) {
    return NextResponse.json({ error: "JUNCTION_API_KEY not configured" }, { status: 503 })
  }

  const junctionBaseUrl =
    process.env.JUNCTION_ENV === "production"
      ? "https://api.us.junction.com"
      : "https://api.sandbox.us.junction.com"

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  // Fetch all profiles without a junction_user_id
  const { data: profiles, error: fetchErr } = await supabase
    .from("profiles")
    .select("id")
    .is("junction_user_id", null)

  if (fetchErr) {
    return NextResponse.json({ error: "Failed to fetch profiles", detail: fetchErr.message }, { status: 500 })
  }

  console.log(`[backfill] Found ${profiles?.length ?? 0} profiles without junction_user_id`)

  let updated = 0
  let failed = 0
  const errors: string[] = []

  for (const profile of profiles ?? []) {
    try {
      // Junction: GET /v2/user?client_user_id={supabase_user_id}
      const res = await fetch(
        `${junctionBaseUrl}/v2/user?client_user_id=${profile.id}`,
        { headers: { "x-vital-api-key": junctionApiKey } }
      )

      if (!res.ok) {
        if (res.status === 404) {
          // User doesn't exist in Junction yet — skip silently
          console.log(`[backfill] No Junction user for profile ${profile.id} — skipping`)
          continue
        }
        const body = await res.text().catch(() => "")
        throw new Error(`Junction API ${res.status}: ${body}`)
      }

      const data = await res.json() as Record<string, unknown>
      const junctionUserId = data.user_id as string | undefined

      if (!junctionUserId) {
        throw new Error("Junction response missing user_id")
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ junction_user_id: junctionUserId })
        .eq("id", profile.id)

      if (updateErr) throw new Error(`Supabase update failed: ${updateErr.message}`)

      console.log(`[backfill] Stamped junction_user_id=${junctionUserId} for profile ${profile.id}`)
      updated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[backfill] Failed for profile ${profile.id}:`, msg)
      errors.push(`${profile.id}: ${msg}`)
      failed++
    }
  }

  console.log(`[backfill] Done — updated: ${updated}, failed: ${failed}`)
  return NextResponse.json({ updated, failed, errors })
}

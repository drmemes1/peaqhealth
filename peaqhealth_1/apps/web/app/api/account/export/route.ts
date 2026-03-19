import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [
    { data: profile },
    { data: labResults },
    { data: lifestyle },
    { data: snapshot },
    { data: wearable },
  ] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single(),
    supabase
      .from("lab_results")
      .select("*")
      .eq("user_id", user.id)
      .eq("parser_status", "complete")
      .order("collection_date", { ascending: false })
      .limit(1)
      .single(),
    supabase.from("lifestyle_records").select("*").eq("user_id", user.id).single(),
    supabase
      .from("score_snapshots")
      .select("score, sleep_sub, blood_sub, lifestyle_sub, oral_sub, calculated_at")
      .eq("user_id", user.id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("wearable_connections")
      .select("provider, hrv_rmssd, sleep_efficiency, deep_sleep_pct, rem_pct, spo2_dips, last_sync_at")
      .eq("user_id", user.id)
      .eq("status", "connected")
      .order("connected_at", { ascending: false })
      .limit(1)
      .single(),
  ])

  return NextResponse.json({
    profile,
    labResults,
    lifestyle,
    snapshot,
    wearable,
    email: user.email,
    createdAt: user.created_at,
  })
}

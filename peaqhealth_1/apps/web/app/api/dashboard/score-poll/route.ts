import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

// Lightweight endpoint polled every 10s after a resync request.
// Returns the most recent score so the client can detect when it changes.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: snapshot } = await supabase
    .from("score_snapshots")
    .select("score, calculated_at")
    .eq("user_id", user.id)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ score: Number(snapshot?.score ?? 0) })
}

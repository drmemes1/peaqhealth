import { NextResponse } from "next/server"
import { createClient as createSessionClient } from "../../../../lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { generateWeeklySnapshot, getWeekStart } from "../../../../lib/weekly-snapshot/generate"

export const dynamic = "force-dynamic"

export async function GET() {
  const sessionSupa = await createSessionClient()
  const { data: { user } } = await sessionSupa.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const weekStart = getWeekStart()

  // Check cache
  const { data: cached } = await supabase
    .from("weekly_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle()

  const cacheAgeHours = cached
    ? (Date.now() - new Date(cached.generated_at as string).getTime()) / 3600000
    : Infinity

  if (cached && cacheAgeHours < 24) {
    return NextResponse.json({ snapshot: cached, cached: true })
  }

  // Generate fresh
  try {
    const snapshot = await generateWeeklySnapshot(user.id)
    return NextResponse.json({ snapshot, cached: false })
  } catch (err) {
    const e = err as { message?: string }
    console.error("[weekly-snapshot] generation failed:", e.message)
    // Return cached (even if stale) rather than a hard error so the UI degrades gracefully
    if (cached) return NextResponse.json({ snapshot: cached, cached: true, stale: true })
    return NextResponse.json({ snapshot: null, error: e.message }, { status: 200 })
  }
}

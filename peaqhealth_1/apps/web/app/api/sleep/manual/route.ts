import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"

interface NightEntry {
  date: string      // ISO date "2026-03-08"
  bedtime: string   // "23:00"
  wake_time: string // "07:00"
  quality: number   // 1–5
}

function parseDurationSeconds(bedtime: string, wake_time: string): number {
  const [bh, bm] = bedtime.split(":").map(Number)
  const [wh, wm] = wake_time.split(":").map(Number)
  let bedMins = bh * 60 + (bm ?? 0)
  let wakeMins = wh * 60 + (wm ?? 0)
  if (wakeMins <= bedMins) wakeMins += 24 * 60 // overnight crossing
  return (wakeMins - bedMins) * 60
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let entries: NightEntry[]
  try {
    const body = await request.json() as { entries: NightEntry[] }
    entries = body.entries
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(entries) || entries.length < 7) {
    return NextResponse.json({ error: "Must submit at least 7 nights" }, { status: 422 })
  }

  const rows = entries.map((e) => ({
    user_id:          user.id,
    date:             e.date,
    bedtime:          e.bedtime,
    wake_time:        e.wake_time,
    duration_seconds: parseDurationSeconds(e.bedtime, e.wake_time),
    quality:          Math.min(5, Math.max(1, Math.round(e.quality))),
  }))

  const { error: upsertError } = await supabase
    .from("manual_sleep_entries")
    .upsert(rows, { onConflict: "user_id,date" })

  if (upsertError) {
    console.error("[manual-sleep] upsert error:", upsertError)
    return NextResponse.json({ error: "Failed to save entries" }, { status: 500 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const newScore = await recalculateScore(user.id, serviceClient)

  return NextResponse.json({ saved: rows.length, score: newScore })
}

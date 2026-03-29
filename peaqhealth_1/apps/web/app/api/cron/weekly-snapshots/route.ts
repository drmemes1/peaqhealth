import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateWeeklySnapshot } from "../../../../lib/weekly-snapshot/generate"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Get all users with sleep data in the last 7 days
  const since = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  const { data: activeRows } = await supabase
    .from("sleep_data")
    .select("user_id")
    .gte("date", since)
    .limit(200)

  const uniqueUsers = [...new Set((activeRows ?? []).map(r => r.user_id as string))]
  console.log(`[weekly-snapshot cron] generating for ${uniqueUsers.length} active users`)

  let generated = 0
  const errors: string[] = []

  for (const userId of uniqueUsers) {
    try {
      await generateWeeklySnapshot(userId)
      generated++
      // Rate-limit: 500ms between users to avoid OpenAI burst
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      const e = err as { message?: string }
      console.error(`[weekly-snapshot cron] failed for user ${userId.slice(0, 8)}:`, e.message)
      errors.push(userId.slice(0, 8))
    }
  }

  return NextResponse.json({ generated, total: uniqueUsers.length, errors })
}

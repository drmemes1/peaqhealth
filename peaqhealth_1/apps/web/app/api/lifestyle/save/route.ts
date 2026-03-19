import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let row: Record<string, unknown>
  try {
    row = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { error: upsertErr } = await supabase
    .from("lifestyle_records")
    .upsert({ ...row, user_id: user.id }, { onConflict: "user_id" })

  if (upsertErr) {
    console.error("[lifestyle/save] upsert error:", upsertErr.message)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const newScore = await recalculateScore(user.id, serviceClient)
  console.log("[lifestyle/save] recalculated score:", newScore, "for user:", user.id)

  return NextResponse.json({ score: newScore })
}

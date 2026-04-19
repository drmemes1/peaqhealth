import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  try {
    const score = await recalculateScore(user.id, svc)
    return NextResponse.json({ ok: true, score })
  } catch (err) {
    console.error("[lifestyle-finalize] recalculate failed:", err)
    return NextResponse.json({ error: "Recalculation failed" }, { status: 500 })
  }
}

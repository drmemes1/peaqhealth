import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { recalculateScore } from "../../../../lib/score/recalculate"

/**
 * Admin endpoint: POST /api/admin/recalculate
 * Body: { userId: string, secret: string }
 *
 * Triggers a score recalculation for any user without modifying any input data.
 * Requires ADMIN_SECRET env var.
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as { userId?: string; secret?: string }

  if (!body.secret || body.secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('[admin-recalculate] triggered')

  const newScore = await recalculateScore(body.userId, serviceClient)

  return NextResponse.json({ success: true, newScore })
}

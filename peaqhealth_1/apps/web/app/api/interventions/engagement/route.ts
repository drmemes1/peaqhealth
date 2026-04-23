import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json() as {
    interventionId: string
    action: "committed" | "already_doing" | "not_relevant"
    reason?: string
    reasonCode?: string
  }

  if (!body.interventionId || !body.action) {
    return NextResponse.json({ error: "Missing interventionId or action" }, { status: 400 })
  }

  const { error } = await supabase.from("intervention_engagements").insert({
    user_id: user.id,
    intervention_id: body.interventionId,
    action: body.action,
    reason: body.reason ?? null,
    reason_code: body.reasonCode ?? null,
  })

  if (error) {
    console.error("[engagement] insert error:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { interventionId } = await request.json() as { interventionId: string }
  if (!interventionId) return NextResponse.json({ error: "Missing interventionId" }, { status: 400 })

  const { error } = await supabase
    .from("intervention_engagements")
    .update({ retracted_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("intervention_id", interventionId)
    .is("retracted_at", null)

  if (error) {
    console.error("[engagement] retract error:", error)
    return NextResponse.json({ error: "Failed to retract" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

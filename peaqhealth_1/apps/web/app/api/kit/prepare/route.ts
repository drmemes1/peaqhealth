import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const dietary = body.dietary_nitrate_today
  const preHygiene = body.pre_hygiene_confirmed
  if (typeof dietary !== "boolean" || typeof preHygiene !== "boolean") {
    return NextResponse.json({ error: "dietary_nitrate_today and pre_hygiene_confirmed must be booleans" }, { status: 400 })
  }

  const { data: kit, error: findError } = await supabase
    .from("oral_kit_orders")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "registered")
    .order("registered_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findError) return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
  if (!kit) return NextResponse.json({ error: "No registered kit found" }, { status: 404 })

  const { error: updateError } = await supabase
    .from("oral_kit_orders")
    .update({
      dietary_nitrate_today: dietary,
      pre_hygiene_confirmed: preHygiene,
      minutes_since_waking: null,
    })
    .eq("id", kit.id)

  if (updateError) return NextResponse.json({ error: "Failed to save" }, { status: 500 })

  return NextResponse.json({ saved: true })
}

import { createClient } from "../../../../lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("score_snapshots")
    .select("score, sleep_sub, blood_sub, oral_sub, lifestyle_sub, sleep_source, calculated_at")
    .eq("user_id", user.id)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .single()

  return Response.json(data ?? {})
}

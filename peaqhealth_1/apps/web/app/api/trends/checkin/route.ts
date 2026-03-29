import { createClient } from "../../../../lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const { error } = await supabase
    .from("lifestyle_checkins")
    .insert({
      user_id: user.id,
      exercise_frequency: body.exercise_frequency ?? null,
      diet_quality: body.diet_quality ?? null,
      alcohol_frequency: body.alcohol_frequency ?? null,
      stress_level: body.stress_level ?? null,
      sleep_priority: body.sleep_priority ?? null,
      smoking: body.smoking ?? null,
      notes: body.notes ?? null,
    })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}

import { createClient } from "../../../../lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const { error } = await supabase
    .from("lifestyle_checkins")
    .insert({
      user_id:            user.id,
      exercise_frequency: body.exercise_frequency ?? null,
      diet_quality:       body.diet_quality       ?? null,
      alcohol_frequency:  body.alcohol_frequency  ?? null,
      stress_level:       body.stress_level       ?? null,
      sleep_priority:     body.sleep_priority     ?? null,
      smoking:            body.smoking            ?? null,
    })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Detect significant lifestyle change relative to submitted answers.
  // These are relative ("more_than_before" etc.) so we only prompt for
  // a questionnaire update — we never modify the lifestyle sub-score here.
  const significantChange = (
    body.exercise_frequency === "more" ||
    body.diet_quality       === "better" ||
    body.stress_level       === "lower" ||
    body.alcohol_frequency  === "less" ||
    body.alcohol_frequency  === "none" ||
    body.sleep_priority     === "more"
  )

  const negativeChange = (
    body.exercise_frequency === "less" ||
    body.diet_quality       === "worse" ||
    body.stress_level       === "higher" ||
    body.alcohol_frequency  === "more"
  )

  const shouldUpdateQuestionnaire = significantChange || negativeChange
  const changeDirection = significantChange ? "positive" : negativeChange ? "negative" : "neutral"

  const message = significantChange
    ? "Great changes — update your lifestyle assessment to reflect this in your score."
    : negativeChange
    ? "Your lifestyle has shifted — updating your assessment will keep your score accurate."
    : "Check-in saved. Your score stays the same unless you update your full assessment."

  return Response.json({ success: true, shouldUpdateQuestionnaire, changeDirection, message })
}

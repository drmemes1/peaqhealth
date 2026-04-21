import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

const ALLOWED_FIELDS = new Set([
  "age_range", "biological_sex",
  "sleep_duration", "sleep_latency", "sleep_qual_self",
  "non_restorative_sleep", "daytime_fatigue", "night_wakings", "daytime_cognitive_fog",
  "snoring_reported", "osa_witnessed", "mouth_breathing_when", "nasal_obstruction_severity",
  "morning_headaches", "bruxism_night",
  "smoking_status",
  "gerd_nocturnal",
  "flossing_freq", "whitening_frequency", "dietary_nitrate_frequency",
  "sugar_intake",
  "height_cm", "weight_kg",
  "antibiotics_window", "antibiotics_last_60d",
  "medication_ppi", "medication_ppi_detail",
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json() as Record<string, unknown>
  const field = body.field_name as string
  const value = body.value

  if (!field || !ALLOWED_FIELDS.has(field)) {
    return NextResponse.json({ error: `Invalid field: ${field}` }, { status: 400 })
  }

  const update: Record<string, unknown> = { [field]: value, updated_at: new Date().toISOString() }

  // Antibiotics window → also write the boolean flag
  if (field === "antibiotics_window") {
    update.antibiotics_last_60d = value === "past_30" || value === "31_to_60"
  }

  // PPI detail → also write the boolean flag
  if (field === "medication_ppi_detail") {
    update.medication_ppi = value === "daily_under_6mo" || value === "daily_over_6mo"
  }

  if (field === "height_cm" || field === "weight_kg") {
    const { data: existing } = await supabase
      .from("lifestyle_records")
      .select("height_cm, weight_kg")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const h = field === "height_cm" ? Number(value) : Number(existing?.height_cm)
    const w = field === "weight_kg" ? Number(value) : Number(existing?.weight_kg)
    if (Number.isFinite(h) && Number.isFinite(w) && h > 0) {
      const m = h / 100
      update.bmi_calculated = Math.round((w / (m * m)) * 100) / 100
    }
  }

  const { data: existing } = await supabase
    .from("lifestyle_records")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("lifestyle_records")
      .update(update)
      .eq("user_id", user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from("lifestyle_records")
      .insert({ user_id: user.id, ...update })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { V2_QUESTIONS } from "../../../../lib/questionnaire/v2-questions"
import { recalculateScore } from "../../../../lib/score/recalculate"

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const LIFESTYLE_FIELDS = new Set(V2_QUESTIONS.filter(q => !q.dbTable || q.dbTable === "lifestyle_records").map(q => q.dbCol))
const SYMPTOM_FIELDS = new Set(V2_QUESTIONS.filter(q => q.dbTable === "user_symptoms").map(q => q.dbCol))

// GET — load draft / current answers
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = svc()

  const [{ data: lifestyle }, { data: symptoms }] = await Promise.all([
    db.from("lifestyle_records").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("user_symptoms").select("*").eq("user_id", user.id).maybeSingle(),
  ])

  const answers: Record<string, unknown> = {}

  if (lifestyle) {
    for (const q of V2_QUESTIONS) {
      if (!q.dbTable || q.dbTable === "lifestyle_records") {
        const val = (lifestyle as Record<string, unknown>)[q.dbCol]
        if (val != null) answers[q.dbCol] = val
      }
    }
    answers._questionnaire_version = (lifestyle as Record<string, unknown>).questionnaire_version ?? "v1"
  }

  if (symptoms) {
    for (const q of V2_QUESTIONS) {
      if (q.dbTable === "user_symptoms") {
        const val = (symptoms as Record<string, unknown>)[q.dbCol]
        if (val != null) answers[q.dbCol] = val
      }
    }
  }

  return NextResponse.json({ answers, hasExistingData: !!lifestyle })
}

// POST — save individual answer (draft pattern)
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as { field: string; value: unknown }
  const { field, value } = body

  if (!field) return NextResponse.json({ error: "Missing field" }, { status: 400 })

  const db = svc()

  if (LIFESTYLE_FIELDS.has(field)) {
    const update: Record<string, unknown> = { [field]: value, updated_at: new Date().toISOString() }

    // Auto-compute BMI when both height and weight are set
    if (field === "height_cm" || field === "weight_kg") {
      const { data: current } = await db.from("lifestyle_records").select("height_cm, weight_kg").eq("user_id", user.id).maybeSingle()
      const h = field === "height_cm" ? Number(value) : Number((current as Record<string, unknown>)?.height_cm)
      const w = field === "weight_kg" ? Number(value) : Number((current as Record<string, unknown>)?.weight_kg)
      if (h > 0 && w > 0) {
        update.bmi_calculated = parseFloat((w / ((h / 100) ** 2)).toFixed(1))
      }
    }

    const { data: existing } = await db.from("lifestyle_records").select("id").eq("user_id", user.id).maybeSingle()
    if (existing) {
      await db.from("lifestyle_records").update(update).eq("user_id", user.id)
    } else {
      await db.from("lifestyle_records").insert({ user_id: user.id, ...update })
    }
  } else if (SYMPTOM_FIELDS.has(field)) {
    const update: Record<string, unknown> = { [field]: value }
    const { data: existing } = await db.from("user_symptoms").select("id").eq("user_id", user.id).maybeSingle()
    if (existing) {
      await db.from("user_symptoms").update(update).eq("user_id", user.id)
    } else {
      await db.from("user_symptoms").insert({ user_id: user.id, ...update })
    }
  } else {
    return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

// PUT — finalize/submit questionnaire
export async function PUT() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = svc()

  await db.from("lifestyle_records").update({
    questionnaire_version: "v2",
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id)

  try {
    await recalculateScore(user.id, db)
  } catch (err) {
    console.error("[questionnaire/v2] recalculate failed:", err)
  }

  return NextResponse.json({ ok: true })
}

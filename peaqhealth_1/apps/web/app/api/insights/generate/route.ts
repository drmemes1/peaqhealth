import { createClient } from "../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export const dynamic = "force-dynamic"

const SYSTEM_PROMPT = `You are Peaq's clinical intelligence layer.
Analyze this user's biomarker data and generate dashboard insights.

Rules:
- Write for an intelligent adult with no medical background — specific but human, no jargon without explanation
- Never hedge or say 'consult your doctor' unless genuinely critical
- Every insight must reference specific markers from their data, not generic advice
- Positive insights: what's working and why, how to protect it
- Watch insights: what needs attention, exactly what to do about it (2-3 actions)
- Cross-panel signals: what the combination means that individual panels can't show
- Tone: direct, slightly serious, like a knowledgeable friend who's reviewed your chart

Return valid JSON only:
{
  "headline": "One bold clinical statement about overall picture",
  "headline_sub": "One explanatory sentence with specific marker references",
  "insights_positive": [
    {
      "panels": ["sleep", "blood"],
      "title": "Short insight headline",
      "explanation": "1-2 sentences with specific marker values"
    }
  ],
  "insights_watch": [
    {
      "panels": ["oral", "blood"],
      "title": "Short insight headline",
      "explanation": "1-2 sentences with specific marker values",
      "actions": ["Specific action 1", "Specific action 2"]
    }
  ],
  "cross_panel": [
    {
      "panels": ["oral", "sleep", "blood"],
      "title": "Signal name",
      "description": "One-line description",
      "positive": false,
      "actions": ["Action 1", "Action 2"]
    }
  ]
}`

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch current snapshot
  const { data: snapshot } = await svc
    .from("score_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!snapshot) {
    return Response.json({ error: "No score data" }, { status: 404 })
  }

  // Check cache
  const { data: cached } = await svc
    .from("insight_cache")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (cached && cached.score_snapshot_id === snapshot.id) {
    return Response.json(cached)
  }

  // Fetch all panel data for context (same pattern as chat route)
  const [
    { data: lab },
    { data: oral },
    { data: sleepNights },
    { data: lifestyle },
    { data: wearable },
  ] = await Promise.all([
    svc.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    svc.from("oral_kit_orders").select("*").eq("user_id", user.id).not("shannon_diversity", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    svc.from("sleep_data").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(14),
    svc.from("lifestyle_records").select("*").eq("user_id", user.id).maybeSingle(),
    svc.from("wearable_connections_v2").select("provider").eq("user_id", user.id).limit(1).maybeSingle(),
  ])

  // Build data context string (same as chat route does)
  const panels: string[] = []
  let dataContext = ""

  if (lab) {
    panels.push("blood")
    dataContext += `\n== BLOOD PANEL ==\n`
    dataContext += `Collection: ${lab.collection_date}\n`
    dataContext += `hs-CRP: ${lab.hs_crp_mgl ?? "not tested"} mg/L\n`
    dataContext += `LDL: ${lab.ldl_mgdl ?? "not tested"} mg/dL\n`
    dataContext += `HDL: ${lab.hdl_mgdl ?? "not tested"} mg/dL\n`
    dataContext += `Triglycerides: ${lab.triglycerides_mgdl ?? "not tested"} mg/dL\n`
    dataContext += `Glucose: ${lab.glucose_mgdl ?? "not tested"} mg/dL\n`
    dataContext += `HbA1c: ${lab.hba1c_pct ?? "not tested"} %\n`
    dataContext += `ApoB: ${lab.apob_mgdl ?? "not tested"} mg/dL\n`
    dataContext += `Lp(a): ${lab.lpa_mgdl ? (lab.lpa_mgdl as number * 2.5).toFixed(0) + " nmol/L" : "not tested"}\n`
    dataContext += `Vitamin D: ${lab.vitamin_d_ngml ?? "not tested"} ng/mL\n`
    dataContext += `eGFR: ${lab.egfr_mlmin ?? "not tested"} mL/min\n`
    dataContext += `Hemoglobin: ${lab.hemoglobin_gdl ?? "not tested"} g/dL\n`
  }

  if (oral) {
    panels.push("oral")
    dataContext += `\n== ORAL MICROBIOME ==\n`
    dataContext += `Shannon Diversity: ${oral.shannon_diversity}\n`
    dataContext += `Nitrate Reducers: ${((oral.nitrate_reducers_pct as number) * 100).toFixed(1)}%\n`
    dataContext += `Periodontal Pathogens: ${((oral.periodontopathogen_pct as number) * 100).toFixed(1)}%\n`
    dataContext += `OSA Taxa: ${((oral.osa_taxa_pct as number) * 100).toFixed(1)}%\n`
  }

  const nights = (sleepNights ?? []) as Array<Record<string, any>>
  if (nights.length > 0 && wearable) {
    panels.push("sleep")
    const avg = (key: string) => {
      const vals = nights.map(n => Number(n[key])).filter(v => !isNaN(v) && v > 0)
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    }
    const totalMin = avg("total_sleep_minutes")
    dataContext += `\n== SLEEP (${nights.length} nights, ${wearable.provider}) ==\n`
    dataContext += `Deep Sleep: ${totalMin > 0 ? ((avg("deep_sleep_minutes") / totalMin) * 100).toFixed(1) : 0}%\n`
    dataContext += `REM: ${totalMin > 0 ? ((avg("rem_sleep_minutes") / totalMin) * 100).toFixed(1) : 0}%\n`
    dataContext += `Sleep Efficiency: ${avg("sleep_efficiency").toFixed(1)}%\n`
    dataContext += `HRV: ${avg("hrv_rmssd").toFixed(0)} ms\n`
    dataContext += `SpO2: ${avg("spo2").toFixed(1)}%\n`
  }

  dataContext += `\n== SCORE ==\n`
  dataContext += `PRI: ${snapshot.score}\n`
  dataContext += `Sleep: ${snapshot.sleep_sub}/30\n`
  dataContext += `Blood: ${snapshot.blood_sub}/40\n`
  dataContext += `Oral: ${snapshot.oral_sub}/30\n`
  dataContext += `Cross-panel modifier: ${snapshot.modifier_total}\n`

  if (snapshot.modifiers_applied && Array.isArray(snapshot.modifiers_applied)) {
    dataContext += `\nModifiers:\n`
    for (const m of snapshot.modifiers_applied) {
      dataContext += `- ${m.label} (${m.direction} ${m.points}pts): ${m.rationale}\n`
    }
  }

  // Call OpenAI
  const openai = new OpenAI()

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 1500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Generate dashboard insights for this user:\n${dataContext}\n\nPanels available: ${panels.join(", ") || "none"}` },
      ],
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0]?.message?.content ?? "{}"
    const insights = JSON.parse(raw)

    // Upsert cache
    await svc.from("insight_cache").upsert({
      user_id: user.id,
      generated_at: new Date().toISOString(),
      headline: insights.headline ?? "",
      headline_sub: insights.headline_sub ?? "",
      insights_positive: insights.insights_positive ?? [],
      insights_watch: insights.insights_watch ?? [],
      cross_panel_signals: insights.cross_panel ?? [],
      panels_available: panels,
      score_snapshot_id: snapshot.id,
    }, { onConflict: "user_id" })

    return Response.json({
      headline: insights.headline,
      headline_sub: insights.headline_sub,
      insights_positive: insights.insights_positive ?? [],
      insights_watch: insights.insights_watch ?? [],
      cross_panel_signals: insights.cross_panel ?? [],
      panels_available: panels,
    })
  } catch (err) {
    console.error("[insights/generate] OpenAI error:", err)
    return Response.json({ error: "Generation failed" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { ageRangeToMidpoint, getHRVTarget } from "../../../../lib/score/recalculate"

export const dynamic = "force-dynamic"

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const avg = (arr: number[]): number | null =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = svc()
  const userId = user.id

  const today = new Date().toISOString().split("T")[0]
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0]

  // ── Cache check — skip regeneration if < 12 hours old ────────────────────
  const { data: cached } = await supabase
    .from("sleep_narratives")
    .select("*")
    .eq("user_id", userId)
    .eq("period_end", today)
    .maybeSingle()

  const cacheAgeHours = cached
    ? (Date.now() - new Date(cached.generated_at as string).getTime()) / 3600000
    : Infinity

  if (cached && cacheAgeHours < 12) {
    console.log(`[sleep-narrative] cache hit for user=${userId.slice(0, 8)} age=${cacheAgeHours.toFixed(1)}h`)
    return NextResponse.json({ narrative: cached, cached: true })
  }

  // ── Fetch last 14 nights from sleep_data ─────────────────────────────────
  const { data: sleepNights } = await supabase
    .from("sleep_data")
    .select("date, hrv_rmssd, sleep_efficiency, deep_sleep_minutes, rem_sleep_minutes, total_sleep_minutes, spo2, resting_heart_rate, source")
    .eq("user_id", userId)
    .gte("date", fourteenDaysAgo)
    .order("date", { ascending: false })

  if (!sleepNights?.length) {
    return NextResponse.json({ narrative: null, reason: "no_sleep_data" })
  }

  // ── Compute averages ──────────────────────────────────────────────────────
  type SleepRow = typeof sleepNights[0]

  const hrvValues  = sleepNights.map((n: SleepRow) => n.hrv_rmssd).filter((v): v is number => v != null && v > 0)
  const effValues  = sleepNights.map((n: SleepRow) => n.sleep_efficiency).filter((v): v is number => v != null && v > 0)
  const deepValues = sleepNights
    .filter((n: SleepRow) => n.total_sleep_minutes > 0)
    .map((n: SleepRow) => (n.deep_sleep_minutes / n.total_sleep_minutes) * 100)
  const remValues  = sleepNights
    .filter((n: SleepRow) => n.total_sleep_minutes > 0)
    .map((n: SleepRow) => (n.rem_sleep_minutes  / n.total_sleep_minutes) * 100)

  const avgHrv  = avg(hrvValues)
  const avgEff  = avg(effValues)
  const avgDeep = avg(deepValues)
  const avgRem  = avg(remValues)

  // HRV trend — this 7 vs last 7
  const thisWeekHrv = avg(sleepNights.slice(0, 7).map((n: SleepRow) => n.hrv_rmssd).filter((v): v is number => v != null && v > 0))
  const lastWeekHrv = avg(sleepNights.slice(7, 14).map((n: SleepRow) => n.hrv_rmssd).filter((v): v is number => v != null && v > 0))
  const hrvTrendPct = thisWeekHrv != null && lastWeekHrv != null
    ? ((thisWeekHrv - lastWeekHrv) / lastWeekHrv) * 100
    : null

  // ── Cross-panel context ───────────────────────────────────────────────────
  const [oralRes, snapshotRes, lifestyleRes] = await Promise.all([
    supabase
      .from("oral_kit_orders")
      .select("oral_score_snapshot")
      .eq("user_id", userId)
      .eq("status", "results_ready")
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("score_snapshots")
      .select("blood_sub, modifiers_applied")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("lifestyle_records")
      .select("exercise_level, stress_level, age_range, biological_sex, mouthwash_type")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const oralSnap = oralRes.data?.oral_score_snapshot as Record<string, unknown> | null
  const rawNitrate = oralSnap?.nitrateReducerPct != null ? Number(oralSnap.nitrateReducerPct) : null
  // nitrateReducerPct may be stored as fraction (0-1) or percentage — normalise
  const nitrateDisplayPct = rawNitrate != null
    ? (rawNitrate > 1 ? rawNitrate : rawNitrate * 100).toFixed(1)
    : null
  const rawBurden = oralSnap?.periodontalBurden != null ? Number(oralSnap.periodontalBurden) : null
  const periodontalLevel = rawBurden != null
    ? (rawBurden > 0.02 ? "elevated" : "within target")
    : "not tested"

  const modifiers = (snapshotRes.data?.modifiers_applied ?? []) as Array<{ label: string; points: number; direction: string }>

  const ageRange = lifestyleRes.data?.age_range as string | null
  const biologicalSex = lifestyleRes.data?.biological_sex as string | null
  const age = ageRangeToMidpoint(ageRange)
  const hrvTarget = getHRVTarget(age, biologicalSex)

  // ── Build prompt ──────────────────────────────────────────────────────────
  const systemPrompt = `You are the sleep intelligence engine for Peaq Health, a longevity platform built by a cardiologist and periodontist.

Generate a short, personal sleep narrative for this user based on their last ${sleepNights.length} nights of data. Connect sleep signals to their other health panels where the data supports it.

VOICE:
- Warm, direct, like a knowledgeable friend reviewing your week
- Specific — use actual numbers
- Not alarming — observational and curious
- 2-3 sentences max for the narrative
- Never say "you should" — say "worth exploring" or "interesting to watch"
- Never diagnose. Never prescribe. Never mention disease.

RULES:
- If HRV is trending down AND oral nitrate reducers are low → mention the nitric oxide pathway connection
- If deep sleep is above 20% → celebrate it specifically with the number
- If efficiency is above 85% → acknowledge it with the number
- If HRV is below 50ms → note it without alarm
- If age range is provided, contextualize HRV relative to their age group using the age-adjusted targets in the user prompt. A 43ms HRV may be good for a 45-year-old but below target for a 28-year-old. Never invent thresholds — only use the ones provided.${hrvTarget.cycleCaveat ? `\n- IMPORTANT: This user is female. ${hrvTarget.cycleCaveat} If HRV has dropped but other sleep metrics are stable, mention this possibility gently.` : ""}
- Return ONLY valid JSON. No markdown. No backticks.
- Always express the score as 'Peaq Age' in years, not points or /100. A negative delta means younger (favorable). Components: PhenoAge 48%, OMA 22%, RHR 11%, HRV 8% (pending), Sleep 9%, Cross-panel 3%. VO₂ max is informational only — do not reference it as a scored component.`

  const hrvTrendStr = hrvTrendPct != null
    ? (hrvTrendPct > 0 ? `+${hrvTrendPct.toFixed(1)}%` : `${hrvTrendPct.toFixed(1)}%`)
    : "insufficient data"

  const userPrompt = `Generate a personalized sleep narrative for this user.

LAST ${sleepNights.length} NIGHTS (${fourteenDaysAgo} to ${today}):
- Nights tracked: ${sleepNights.length}
- Avg HRV: ${avgHrv != null ? `${avgHrv.toFixed(1)} ms (age-adjusted target: ${hrvTarget.optimal}ms optimal, ${hrvTarget.good}ms good${avgHrv >= hrvTarget.optimal ? " — above optimal" : avgHrv >= hrvTarget.good ? " — good range" : " — below good range"})` : "no data"}
- HRV trend vs last week: ${hrvTrendStr}
- Avg deep sleep: ${avgDeep != null ? `${avgDeep.toFixed(1)}%${avgDeep >= 17 ? " (above 17% target)" : ""}` : "no data"}
- Avg REM: ${avgRem != null ? `${avgRem.toFixed(1)}%${avgRem >= 18 ? " (above 18% target)" : ""}` : "no data"}
- Avg efficiency: ${avgEff != null ? `${avgEff.toFixed(1)}%${avgEff >= 85 ? " (above 85% target)" : ""}` : "no data"}

CROSS-PANEL CONTEXT:
- Oral nitrate reducers: ${nitrateDisplayPct ? `${nitrateDisplayPct}% (target ≥20%)` : "not tested"}
- Periodontal burden: ${periodontalLevel}
- Active cross-panel modifiers: ${modifiers.length > 0 ? modifiers.map(m => m.label).join(", ") : "none"}
- Exercise level: ${lifestyleRes.data?.exercise_level ?? "not provided"}
- Stress (self-reported): ${lifestyleRes.data?.stress_level ?? "not provided"}
- User age range: ${ageRange ?? "not provided"}
- User sex: ${biologicalSex ?? "not provided"}

Return this exact JSON:
{
  "headline": "6-10 words, specific to this user's data, warm",
  "narrative": "2-3 sentences. Use actual numbers. Connect to another panel if data supports. Warm and observational.",
  "positive_signal": "One specific thing that's going well — actual number. null if nothing notable.",
  "watch_signal": "One thing worth watching — framed with curiosity. null if nothing notable.",
  "trend_summary": "one word: improving or stable or declining"
}`

  // ── Call OpenAI ───────────────────────────────────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  const openai = new OpenAI({ apiKey: openaiKey })
  const model  = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"

  let result: Record<string, unknown>
  try {
    const completion = await openai.chat.completions.create({
      model,
      max_tokens: 400,
      temperature: 0.65,
      store: false, // HIPAA ZDR
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
    })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
    result = JSON.parse(cleaned) as Record<string, unknown>
    console.log(`[sleep-narrative] generated for user=${userId.slice(0, 8)} headline="${result.headline}"`)
  } catch (err) {
    console.error("[sleep-narrative] generation failed:", err)
    return NextResponse.json({ narrative: null, error: String(err) }, { status: 500 })
  }

  // ── Upsert to cache ───────────────────────────────────────────────────────
  const { data: saved, error: upsertErr } = await supabase
    .from("sleep_narratives")
    .upsert({
      user_id:         userId,
      period_start:    fourteenDaysAgo,
      period_end:      today,
      generated_at:    new Date().toISOString(),
      nights_analyzed: sleepNights.length,
      headline:        typeof result.headline === "string" ? result.headline : null,
      narrative:       typeof result.narrative === "string" ? result.narrative : null,
      watch_signal:    typeof result.watch_signal === "string" ? result.watch_signal : null,
      positive_signal: typeof result.positive_signal === "string" ? result.positive_signal : null,
      avg_hrv:         avgHrv,
      avg_efficiency:  avgEff,
      avg_deep_pct:    avgDeep,
      avg_rem_pct:     avgRem,
      hrv_trend_pct:   hrvTrendPct,
      oral_context:    { nitrateReducerPct: nitrateDisplayPct, periodontalLevel },
      blood_context:   { modifiers },
      raw_response:    result,
    }, { onConflict: "user_id,period_end" })
    .select()
    .single()

  if (upsertErr) {
    console.error("[sleep-narrative] upsert failed:", upsertErr.message)
    // Return the generated result even if caching fails
    return NextResponse.json({ narrative: { ...result, avg_hrv: avgHrv, avg_efficiency: avgEff, avg_deep_pct: avgDeep, avg_rem_pct: avgRem, nights_analyzed: sleepNights.length, raw_response: result }, cached: false })
  }

  return NextResponse.json({ narrative: saved, cached: false })
}

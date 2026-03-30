import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getWeekStart(): string {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return monday.toISOString().split("T")[0]
}

const avg = (arr: number[]): number | null =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

export async function generateWeeklySnapshot(userId: string): Promise<Record<string, unknown> | null> {
  const supabase = serviceClient()
  const weekStart = getWeekStart()
  const prevWeekStart = new Date(new Date(weekStart).getTime() - 7 * 86400000).toISOString().split("T")[0]

  const [
    { data: currentSnapshot },
    { data: prevWeekRow },
    { data: sleepThisWeek },
    { data: sleepLastWeek },
    { data: oralData },
    { data: bloodData },
    { data: checkins },
  ] = await Promise.all([
    supabase
      .from("score_snapshots")
      .select("score, sleep_sub, blood_sub, oral_sub, lifestyle_sub, calculated_at")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("weekly_snapshots")
      .select("total_score, avg_hrv, avg_efficiency, trend_direction")
      .eq("user_id", userId)
      .lt("week_start", weekStart)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Rolling 7-day window instead of calendar week — avoids empty results at the
    // start of a new week (e.g. Sunday) before all nights have synced
    supabase
      .from("sleep_data")
      .select("date, hrv_rmssd, sleep_efficiency, deep_sleep_minutes, rem_sleep_minutes, total_sleep_minutes, spo2, resting_heart_rate")
      .eq("user_id", userId)
      .gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0])
      .order("date", { ascending: false }),

    supabase
      .from("sleep_data")
      .select("hrv_rmssd, sleep_efficiency")
      .eq("user_id", userId)
      .gte("date", prevWeekStart)
      .lt("date", weekStart),

    supabase
      .from("oral_kit_orders")
      .select("oral_score_snapshot, results_date, ordered_at")
      .eq("user_id", userId)
      .eq("status", "results_ready")
      .order("ordered_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("lab_results")
      .select("collection_date, hs_crp_mgl, ldl_mgdl, hdl_mgdl, apob_mgdl, triglycerides_mgdl, glucose_mgdl, hba1c_pct, vitamin_d_ngml, lpa_mgdl, created_at")
      .eq("user_id", userId)
      .order("collection_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("lifestyle_checkins")
      .select("exercise_frequency, diet_quality, stress_level, alcohol_frequency, energy_level, supplements, checked_in_at")
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false })
      .limit(2),
  ])

  // ── Sleep metrics ──────────────────────────────────────────────────────────
  const thisWeekSleep = (sleepThisWeek ?? []) as Array<Record<string, number | null>>
  const lastWeekSleep = (sleepLastWeek ?? []) as Array<Record<string, number | null>>

  const thisWeekHrv  = thisWeekSleep.map(n => n.hrv_rmssd).filter((v): v is number => v != null && v > 0)
  const lastWeekHrv  = lastWeekSleep.map(n => n.hrv_rmssd).filter((v): v is number => v != null && v > 0)
  const avgHrv       = avg(thisWeekHrv)
  const prevAvgHrv   = avg(lastWeekHrv)
  const hrvTrendPct  = avgHrv != null && prevAvgHrv != null
    ? ((avgHrv - prevAvgHrv) / prevAvgHrv) * 100
    : null

  const effVals     = thisWeekSleep.map(n => n.sleep_efficiency).filter((v): v is number => v != null && v > 0)
  const avgEfficiency = avg(effVals)

  const totalMinutes = thisWeekSleep.reduce((s, n) => s + (n.total_sleep_minutes ?? 0), 0)
  const deepMinutes  = thisWeekSleep.reduce((s, n) => s + (n.deep_sleep_minutes  ?? 0), 0)
  const remMinutes   = thisWeekSleep.reduce((s, n) => s + (n.rem_sleep_minutes   ?? 0), 0)
  const avgDeepPct   = totalMinutes > 0 ? (deepMinutes / totalMinutes) * 100 : null
  const avgRemPct    = totalMinutes > 0 ? (remMinutes  / totalMinutes) * 100 : null

  // ── Recency ────────────────────────────────────────────────────────────────
  const daysSinceBlood = bloodData?.created_at
    ? Math.floor((Date.now() - new Date(bloodData.created_at as string).getTime()) / 86400000)
    : null
  const daysSinceOral = oralData
    ? Math.floor((Date.now() - new Date((oralData.results_date ?? oralData.ordered_at) as string).getTime()) / 86400000)
    : null

  // ── Blood summary for prompt ───────────────────────────────────────────────
  const bloodLines = bloodData ? [
    `Collection date: ${bloodData.collection_date ?? "unknown"} (${daysSinceBlood} days ago)`,
    bloodData.hs_crp_mgl    != null ? `hsCRP: ${bloodData.hs_crp_mgl} mg/L`      : null,
    bloodData.ldl_mgdl      != null ? `LDL: ${bloodData.ldl_mgdl} mg/dL`          : null,
    bloodData.hdl_mgdl      != null ? `HDL: ${bloodData.hdl_mgdl} mg/dL`          : null,
    bloodData.apob_mgdl     != null ? `ApoB: ${bloodData.apob_mgdl} mg/dL`        : null,
    bloodData.glucose_mgdl  != null ? `Glucose: ${bloodData.glucose_mgdl} mg/dL`  : null,
    bloodData.hba1c_pct     != null ? `HbA1c: ${bloodData.hba1c_pct}%`            : null,
    bloodData.vitamin_d_ngml!= null ? `Vitamin D: ${bloodData.vitamin_d_ngml} ng/mL` : null,
    bloodData.triglycerides_mgdl != null ? `Triglycerides: ${bloodData.triglycerides_mgdl} mg/dL` : null,
  ].filter(Boolean).join("\n") : "No blood data on file"

  // ── Oral summary for prompt ────────────────────────────────────────────────
  const snap = oralData?.oral_score_snapshot as Record<string, unknown> | null
  // oral_score_snapshot values may be stored as fractions (0–1) or already as percentages
  // Normalise both to percentage for the prompt
  const toPromptPct = (v: unknown) => {
    const n = Number(v)
    if (isNaN(n)) return null
    return n > 1 ? n : n * 100
  }
  const nitrateForPrompt     = snap?.nitrateReducerPct != null ? toPromptPct(snap.nitrateReducerPct)    : null
  const periodontalForPrompt = snap?.periodontalBurden != null ? toPromptPct(snap.periodontalBurden)    : null
  const oralLines = oralData ? [
    `Last tested: ${daysSinceOral} days ago`,
    snap?.shannonDiversity != null ? `Shannon diversity: ${Number(snap.shannonDiversity).toFixed(2)}` : null,
    nitrateForPrompt     != null ? `Nitrate reducers: ${nitrateForPrompt.toFixed(1)}%` : null,
    periodontalForPrompt != null
      ? `Periodontal burden: ${periodontalForPrompt > 0.5 ? "elevated" : "within target"} (${periodontalForPrompt.toFixed(2)}%)`
      : null,
  ].filter(Boolean).join("\n") : "No oral data on file"

  // ── Lifestyle summary ─────────────────────────────────────────────────────
  const c0 = checkins?.[0]
  const c1 = checkins?.[1]
  const checkinLines = c0
    ? [
        `Most recent (${c0.checked_in_at}): exercise=${c0.exercise_frequency ?? "—"}, diet=${c0.diet_quality ?? "—"}, stress=${c0.stress_level ?? "—"}, energy=${c0.energy_level ?? "—"}`,
        c0.supplements && Array.isArray(c0.supplements) && (c0.supplements as string[]).length > 0
          ? `Supplements: ${(c0.supplements as string[]).join(", ")}`
          : null,
        c1 ? `Previous: exercise=${c1.exercise_frequency ?? "—"}, diet=${c1.diet_quality ?? "—"}` : null,
      ].filter(Boolean).join("\n")
    : "No recent check-in"

  // ── Prompts ───────────────────────────────────────────────────────────────
  const systemPrompt = `You are the weekly insight engine for Peaq Health, a longevity platform built by a cardiologist and periodontist.

Generate a warm, motivating weekly snapshot based on this user's health data.

VOICE:
- Like a knowledgeable, encouraging friend reviewing your week
- Celebrate genuine wins specifically — use actual numbers
- Note trends with curiosity, not alarm
- Never diagnose, never prescribe, never make medical claims
- Use "consider", "may be worth", "worth exploring", "speak with your healthcare provider about" for any clinical suggestions

STRICT RULES:
- Never say "you have [condition]" or "you are at risk of [condition]"
- Never recommend specific medications or dosages
- Retest recommendations must use "consider" or "you may want to discuss with your healthcare provider"
- Positive reinforcement first, always
- If all data is stable/good — celebrate that explicitly
- Keep body under 80 words — punchy, not exhaustive
- Return ONLY valid JSON, no markdown, no backticks

BODY RULES:
- Do not summarize what the user can already see on their dashboard
- Surface one non-obvious cross-panel connection if data supports it
- If sleep and oral data both exist, find a connection (e.g. low nitrate reducers affecting cardiovascular recovery, oral bacteria pattern and HRV)
- If blood and sleep both exist, connect them (e.g. hsCRP + HRV, glucose + deep sleep)
- Be specific — use actual numbers from the data
- Never say "sleep data remains missing" if nights_tracked > 0
- Never say "your score held steady" as the main insight — that is obvious and unhelpful
- Find what is interesting, not what is visible

RETEST THRESHOLDS:
- Blood: consider if >90 days since last test, or significant lifestyle change, or borderline markers
- Oral: consider if >180 days since last kit, or elevated periodontal burden, or low nitrate reducers with confirmed mouthwash use`

  const userPrompt = `Generate a weekly snapshot for week of ${weekStart}.

SLEEP (last 7 days — ${thisWeekSleep.length} nights tracked):
${thisWeekSleep.length > 0 ? `Average HRV: ${avgHrv != null ? `${avgHrv.toFixed(1)} ms${avgHrv >= 50 ? " (above target)" : " (below 50ms target)"}` : "no HRV data"}
HRV vs prior 7 days: ${hrvTrendPct != null ? `${hrvTrendPct > 0 ? "+" : ""}${hrvTrendPct.toFixed(1)}%` : "no comparison available"}
Average efficiency: ${avgEfficiency != null ? `${avgEfficiency.toFixed(1)}%${avgEfficiency >= 85 ? " (above target)" : ""}` : "no data"}
Average deep sleep: ${avgDeepPct != null ? `${avgDeepPct.toFixed(1)}%${avgDeepPct >= 17 ? " (above target)" : ""}` : "no data"}
Average REM: ${avgRemPct != null ? `${avgRemPct.toFixed(1)}%${avgRemPct >= 18 ? " (above target)" : ""}` : "no data"}` : "No sleep data in the last 7 days"}

CURRENT SCORES:
Total: ${currentSnapshot?.score ?? "no data"}/100
Sleep: ${currentSnapshot?.sleep_sub ?? "no data"}/30
Blood: ${currentSnapshot?.blood_sub ?? "no data"}/40
Oral: ${currentSnapshot?.oral_sub ?? "no data"}/30
Lifestyle: ${currentSnapshot?.lifestyle_sub ?? "no data"}/13

PREVIOUS WEEK:
Previous total score: ${prevWeekRow?.total_score ?? "no prior data"}
Previous avg HRV: ${prevWeekRow?.avg_hrv != null ? `${Number(prevWeekRow.avg_hrv).toFixed(1)} ms` : "no prior data"}
Previous trend: ${prevWeekRow?.trend_direction ?? "no prior data"}

BLOOD PANEL:
${bloodLines}

ORAL MICROBIOME:
${oralLines}

LIFESTYLE CHECK-IN:
${checkinLines}

Return exactly this JSON (no other keys):
{
  "headline": "6-10 words, specific to this user's week, warm and honest",
  "body": "2-4 sentences max. Celebrate wins with actual numbers. Note trends with curiosity. Cross-panel where possible. Under 80 words.",
  "trend_direction": "improving" or "stable" or "declining",
  "retest_recommendation": "One sentence using consider language. Only if daysSinceBlood > 90 OR daysSinceOral > 180 OR clinical reason exists. Otherwise null.",
  "positive_highlight": "One specific win this week using actual numbers.",
  "watch_note": "One thing worth watching with may-be-worth language. null if nothing notable."
}`

  // ── Generate ──────────────────────────────────────────────────────────────
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const model  = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"

  const completion = await openai.chat.completions.create({
    model,
    max_tokens: 600,
    temperature: 0.7,
    store: false,  // HIPAA ZDR
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt },
    ],
  })

  const raw = completion.choices[0]?.message.content ?? "{}"
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>

  console.log(`[weekly-snapshot] generated for user=${userId.slice(0, 8)} headline="${parsed.headline}"`)

  // ── Upsert ────────────────────────────────────────────────────────────────
  const { data: saved, error: upsertErr } = await supabase
    .from("weekly_snapshots")
    .upsert({
      user_id:          userId,
      week_start:       weekStart,
      generated_at:     new Date().toISOString(),
      total_score:      currentSnapshot?.score        ?? null,
      sleep_sub:        currentSnapshot?.sleep_sub    ?? null,
      blood_sub:        currentSnapshot?.blood_sub    ?? null,
      oral_sub:         currentSnapshot?.oral_sub     ?? null,
      lifestyle_sub:    currentSnapshot?.lifestyle_sub ?? null,
      prev_total_score: prevWeekRow?.total_score      ?? null,
      avg_hrv:          avgHrv,
      avg_efficiency:   avgEfficiency,
      avg_deep_pct:     avgDeepPct,
      avg_rem_pct:      avgRemPct,
      nights_tracked:   thisWeekSleep.length,
      hrv_trend_pct:    hrvTrendPct,
      headline:         parsed.headline       ?? null,
      body:             parsed.body           ?? null,
      trend_direction:  parsed.trend_direction ?? "stable",
      retest_recommendation: parsed.retest_recommendation ?? null,
      raw_response:     parsed,
    }, { onConflict: "user_id,week_start" })
    .select()
    .single()

  if (upsertErr) throw new Error(`weekly_snapshots upsert failed: ${upsertErr.message}`)

  return saved as Record<string, unknown>
}

export { getWeekStart }

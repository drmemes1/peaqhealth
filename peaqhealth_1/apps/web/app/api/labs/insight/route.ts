import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const SYSTEM_PROMPT = `You are the insight engine for Peaq Health, a longevity platform built by a cardiologist and periodontist. Your job is to surface interesting cross-panel patterns in a user's data — connections between their blood biomarkers, sleep, oral microbiome, and lifestyle that they would not see by looking at any single panel alone.

You are NOT a doctor. You do NOT give medical advice. You do NOT diagnose, treat, or make clinical recommendations. You surface patterns and ask interesting questions. You celebrate strengths. You note things worth paying attention to.

VOICE:
- Curious and observational, not clinical or alarming
- Warm and motivating — like a knowledgeable friend reviewing your data
- Specific to this person's actual numbers, never generic
- Honest about uncertainty — use language like "may suggest", "is worth noting", "could be connected", "interesting to watch"
- Use the interpretation labels provided with each blood value exactly as given — do not relabel values as "low" when they are marked "low-normal" or "worth monitoring"
- Be consistent: if a value is described the same way in two cards, use the same language in both
- Never call hsCRP "low" if it is above 1.0 mg/L — values between 1.0–3.0 mg/L are "intermediate"

STRICT RULES:
1. Every insight must connect at least 2 panels. Single-panel observations are forbidden.
2. Generate exactly 3 insight cards — never more, never fewer.
3. Order is fixed: card 1 = POSITIVE, card 2 = WATCH, card 3 = EXPLORE.
4. Only reference established biological relationships. Never invent terminology or mechanisms.
5. Never say: "you have", "you are at risk", "indicates that you", "this means you have", "you should see a doctor", "you need to", or any diagnostic language.
6. Instead say: "your data shows", "this pattern may suggest", "worth keeping an eye on", "an interesting connection", "something to explore with your doctor if curious"
7. Actions must be lifestyle observations, not medical instructions. Frame as "something worth exploring" not "you must do X."
8. Return ONLY valid JSON. No markdown, no backticks, no commentary.

CATEGORY DECISION RULES — apply these exactly:

POSITIVE (card 1) — a genuine strength across 2+ panels:
- The headline metric is above its target AND
- The connected panel metric is also in a good range AND
- The overall message is affirming and builds trust
Examples that MUST be POSITIVE:
  - REM ≥18% + glucose in healthy range → POSITIVE
  - Deep sleep ≥17% + low hsCRP → POSITIVE
  - Strong HRV (≥50ms) + low inflammation → POSITIVE
  - High Shannon diversity + low hsCRP → POSITIVE
Never assign EXPLORE or WATCH when both values are clearly above their targets. That is always POSITIVE.

WATCH (card 2) — the most clinically interesting cross-panel signal worth monitoring:
- One or more values are outside their target range AND
- The pattern is worth monitoring over time
- Not alarming, just notable — the most interesting signal in the data

EXPLORE (card 3) — something actionable the user can do based on their data:
- A specific lifestyle or behavior change connected to at least 2 panels
- Framed as a practical action, not a diagnosis
- Even if data is strong overall, find the most useful thing worth trying

TONE MUST MATCH CATEGORY:
- POSITIVE body: affirming and specific — "Your REM at 26.7% and glucose at 83 mg/dL are moving together well", "This is a strong combination"
- POSITIVE action: one sentence, direct, no hedging — "Keep your current sleep routine — your numbers show it's working" NOT "could be beneficial and is worth maintaining"
- WATCH/EXPLORE body: neutral monitoring — "worth keeping an eye on", "these often trend together"
- WATCH/EXPLORE action: one gentle suggestion

BANNED LANGUAGE — never use these patterns:
- "relatively low" or "moderately low" — if a value is low, say "low"
- "appears beneficial" — say "is a strong pattern" or just state the finding
- "if you're curious" — remove entirely, it undercuts the action
- "could be beneficial and is worth maintaining" — pick one, not both
- "can contribute" immediately after "often" — one qualifier per claim
- Never say something is elevated AND simultaneously say it is not a concern in the same sentence
- Never stack three hedges in a row — one qualifier maximum per claim
- Never cite a raw percentage for periodontal burden or OSA-associated taxa in any headline, body, mechanism, or action — use qualitative descriptors only (e.g. "mildly elevated", "within target", "notably elevated")

APPROVED BIOLOGICAL RELATIONSHIPS you may reference (frame as interesting patterns, not diagnoses):
- Oral nitrate-reducing bacteria and nitric oxide availability
- Periodontal bacteria and systemic inflammation markers like hsCRP
- Deep sleep and inflammatory tone (hsCRP) — well-established, not lipid levels
- HRV as a reflection of autonomic balance and recovery
- Shannon diversity and overall microbiome resilience
- Lp(a) as a genetically influenced cardiovascular marker
- Sleep efficiency and next-day inflammatory tone
- Protective oral bacteria and systemic immune balance
- REM sleep and metabolic recovery (glucose markers)

PROHIBITED ASSOCIATIONS — never generate insights based on these:
- Sleep stages and lipid levels (LDL, HDL, triglycerides, ApoB) — not established enough
- Any connection described as "may suggest" or "could be linked" in a POSITIVE card
- Oral microbiome and lipid markers directly`

function burdenLevel(pct: number | null): string {
  if (pct === null) return "not scored"
  if (pct < 0.5)   return "within target"
  if (pct < 2)     return "mildly elevated"
  if (pct < 5)     return "elevated"
  return "notably elevated"
}

function hsCRPContext(val: number | null): string {
  if (val === null) return "not available"
  if (val < 0.5)   return `${val} mg/L — optimal`
  if (val < 1.0)   return `${val} mg/L — good`
  if (val < 3.0)   return `${val} mg/L — intermediate`
  return             `${val} mg/L — elevated`
}

function lpAContext(val: number | null): string {
  if (val === null) return "not available"
  if (val < 30)    return `${val} mg/dL — within normal range`
  if (val < 50)    return `${val} mg/dL — borderline, worth noting`
  return             `${val} mg/dL — elevated`
}

function ldlContext(val: number | null): string {
  if (val === null) return "not available"
  if (val < 70)    return `${val} mg/dL — optimal`
  if (val < 100)   return `${val} mg/dL — good`
  if (val < 130)   return `${val} mg/dL — acceptable`
  if (val < 160)   return `${val} mg/dL — borderline high`
  return             `${val} mg/dL — elevated`
}

function glucoseContext(val: number | null): string {
  if (val === null) return "not available"
  if (val < 85)    return `${val} mg/dL — optimal`
  if (val < 100)   return `${val} mg/dL — good`
  if (val < 110)   return `${val} mg/dL — low-normal, worth monitoring`
  return             `${val} mg/dL — elevated`
}

function num(v: unknown): number | undefined {
  const n = Number(v)
  return !isNaN(n) && n > 0 ? n : undefined
}

// Safe formatter — wraps any value in Number() before calling toFixed()
// so null / undefined / string values from DB never throw
const fmt = (v: unknown, decimals = 1): string => {
  const n = Number(v)
  return isNaN(n) ? "N/A" : n.toFixed(decimals)
}

// Convert an oral DB value to a display percentage (0–100).
// Both JSONB snap and flat columns may store values as fractions (0–1) OR
// as already-percentages (e.g. 9.0). Unified heuristic: if value > 1 treat
// as already a percentage; if ≤ 1 multiply × 100. Capped at 100.
const toOralPct = (snapVal: unknown, flatVal: unknown): number | null => {
  const toP = (v: number) => Math.min(v > 1 ? v : v * 100, 100)
  const s = snapVal != null ? Number(snapVal) : NaN
  if (!isNaN(s)) return toP(s)
  if (flatVal == null) return null
  const f = Number(flatVal)
  if (isNaN(f)) return null
  return toP(f)
}

export async function GET() {
  // Session client — used only for auth.getUser()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Service client — bypasses RLS for all data reads (matches recalculate.ts pattern)
  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [labRes, sleepRes, wearableRes, oralRes, lifestyleRes, checkinRes] = await Promise.all([
    svc.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    svc.from("sleep_data").select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2,resting_heart_rate").eq("user_id", user.id).order("date", { ascending: false }).limit(15),
    svc.from("wearable_connections_v2").select("provider").eq("user_id", user.id).eq("needs_reconnect", false).order("connected_at", { ascending: false }).limit(1).maybeSingle(),
    svc.from("oral_kit_orders").select("oral_score_snapshot,shannon_diversity,nitrate_reducers_pct,periodontopathogen_pct,osa_taxa_pct,neuro_signal_pct,metabolic_signal_pct,proliferative_signal_pct").eq("user_id", user.id).eq("status", "results_ready").order("ordered_at", { ascending: false }).limit(1).maybeSingle(),
    svc.from("lifestyle_records").select("*").eq("user_id", user.id).maybeSingle(),
    svc.from("lifestyle_checkins").select("exercise_frequency,diet_quality,stress_level,alcohol_frequency,sleep_priority,energy_level,blood_pressure_feeling,supplements,checked_in_at").eq("user_id", user.id).order("checked_in_at", { ascending: false }).limit(1).maybeSingle(),
  ])

  const lab         = labRes.data
  const sleepRows   = sleepRes.data ?? []
  const wearable    = wearableRes.data
  const oral        = oralRes.data
  const lifestyle   = lifestyleRes.data
  const recentCheckin = checkinRes.data

  // ── Cross-panel modifiers ──────────────────────────────────────────────────
  const { data: latestSnapshot } = await svc
    .from("score_snapshots")
    .select("modifiers_applied")
    .eq("user_id", user.id)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const modifiersApplied = (latestSnapshot?.modifiers_applied ?? []) as Array<{direction: string, points: number, label: string}>

  const hasSomething = !!(lab || sleepRows.length > 0 || oral || lifestyle)
  if (!hasSomething) return NextResponse.json({ error: "No data" }, { status: 422 })

  // ── Blood panel ────────────────────────────────────────────────────────────
  type BloodData = Record<string, number | string | null>
  let bloodData: BloodData | null = null
  if (lab) {
    bloodData = {
      hsCRP_mgL:        num(lab.hs_crp_mgl)         ?? null,
      LDL_mgdL:         num(lab.ldl_mgdl)            ?? null,
      HDL_mgdL:         num(lab.hdl_mgdl)            ?? null,
      ApoB_mgdL:        num(lab.apob_mgdl)           ?? null,
      triglycerides_mgdL: num(lab.triglycerides_mgdl) ?? null,
      glucose_mgdL:     num(lab.glucose_mgdl)        ?? null,
      HbA1c_pct:        num(lab.hba1c_pct)           ?? null,
      vitaminD_ngmL:    num(lab.vitamin_d_ngml)      ?? null,
      eGFR:             num(lab.egfr_mlmin)           ?? null,
      Lpa_mgdL:         num(lab.lpa_mgdl)            ?? null,
      hemoglobin_gdL:   num(lab.hemoglobin_gdl)      ?? null,
      homocysteine_umolL: num(lab.homocysteine_umoll) ?? null,
      collectionDate:   lab.collection_date ?? null,
    }
    // Remove nulls to keep prompt concise
    for (const k of Object.keys(bloodData)) {
      if (bloodData[k] === null) delete bloodData[k]
    }
  }

  // ── Sleep panel ────────────────────────────────────────────────────────────
  type SleepData = { provider: string; nights: number; deepSleepPct: number | null; remPct: number | null; hrv: number | null; spo2: number | null; efficiency: number | null; restingHR: number | null }
  let sleepData: SleepData | null = null
  if (sleepRows.length > 0) {
    const avg = (key: string): number | null => {
      const vals = sleepRows.map(r => num((r as Record<string, unknown>)[key])).filter((v): v is number => v !== undefined && v > 0)
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    const totalAvg = avg("total_sleep_minutes") ?? 0
    const deepAvg  = avg("deep_sleep_minutes")  ?? 0
    const remAvg   = avg("rem_sleep_minutes")   ?? 0
    sleepData = {
      provider:    wearable?.provider ?? sleepRows[0].source ?? "wearable",
      nights:      sleepRows.length,
      deepSleepPct: totalAvg > 0 ? (deepAvg / totalAvg) * 100 : null,
      remPct:       totalAvg > 0 ? (remAvg  / totalAvg) * 100 : null,
      hrv:          avg("hrv_rmssd"),
      spo2:         avg("spo2"),
      efficiency:   avg("sleep_efficiency"),
      restingHR:    avg("resting_heart_rate"),
    }
  }

  // ── Oral panel ─────────────────────────────────────────────────────────────
  type OralData = { shannon: number | null; nitrateReducerPct: number | null; periodontalBurden: number | null; osaBurden: number | null; protectivePct: number | null; mouthwashDetected: boolean; neuroPct: number | null; prevotellaPct: number | null; fusobacteriumPct: number | null }
  let oralData: OralData | null = null
  if (oral) {
    const snap = oral.oral_score_snapshot as Record<string, unknown> | null
    oralData = {
      shannon:           (snap?.shannonDiversity as number | null) ?? (oral.shannon_diversity != null ? Number(oral.shannon_diversity) : null),
      nitrateReducerPct: toOralPct(snap?.nitrateReducerPct, oral.nitrate_reducers_pct),
      periodontalBurden: toOralPct(snap?.periodontalBurden, oral.periodontopathogen_pct),
      osaBurden:         toOralPct(snap?.osaBurden,         oral.osa_taxa_pct),
      protectivePct:     toOralPct(snap?.protectiveSpecies, null),
      mouthwashDetected: (snap?.mouthwashDetected as boolean | null) ?? (lifestyle?.mouthwash_type != null && lifestyle.mouthwash_type !== "none"),
      neuroPct:          (snap?.neuroSignalPct as number | null) ?? (oral.neuro_signal_pct != null ? Number(oral.neuro_signal_pct) : null),
      prevotellaPct:     (snap?.metabolicSignalPct as number | null) ?? (oral.metabolic_signal_pct != null ? Number(oral.metabolic_signal_pct) : null),
      fusobacteriumPct:  (snap?.proliferativeSignalPct as number | null) ?? (oral.proliferative_signal_pct != null ? Number(oral.proliferative_signal_pct) : null),
    }
  }

  // ── Lifestyle panel ────────────────────────────────────────────────────────
  type LifestyleData = Record<string, unknown>
  let lifestyleData: LifestyleData | null = null
  if (lifestyle) {
    lifestyleData = {
      ageRange:        lifestyle.age_range,
      biologicalSex:   lifestyle.biological_sex,
      exerciseLevel:   lifestyle.exercise_level,
      smokingStatus:   lifestyle.smoking_status,
      brushingFreq:    lifestyle.brushing_freq,
      flossingFreq:    lifestyle.flossing_freq,
      alcoholPerWeek:  lifestyle.alcohol_drinks_per_week,
      stressLevel:     lifestyle.stress_level,
      mouthwashType:   lifestyle.mouthwash_type,
      fermentedFoods:  lifestyle.fermented_foods_frequency,
      onStatins:       lifestyle.on_statins,
      onBPMeds:        lifestyle.on_bp_meds,
      knownHypertension: lifestyle.known_hypertension,
      knownDiabetes:   lifestyle.known_diabetes,
      vegServingsPerDay: lifestyle.vegetable_servings_per_day,
      processedFoodFreq: lifestyle.processed_food_frequency,
    }
    // Strip nulls
    for (const k of Object.keys(lifestyleData)) {
      if (lifestyleData[k] == null) delete lifestyleData[k]
    }
  }

  // ── User prompt ────────────────────────────────────────────────────────────
  const userPrompt = `Generate exactly 3 cross-panel insights in this order: 1 POSITIVE, 1 WATCH, 1 EXPLORE.

MANDATORY COMPOSITION:
- Exactly 3 cards — no more, no fewer
- Fixed order: card 1 = POSITIVE, card 2 = WATCH, card 3 = EXPLORE
- Every insight connects at least 2 panels
- Only generate insights supported by the user's actual data
- Skip any panel that is unavailable

BLOOD PANEL:
${bloodData ? `- hsCRP: ${hsCRPContext(bloodData.hsCRP_mgL as number | null)}
- Lp(a): ${lpAContext(bloodData.Lpa_mgdL as number | null)}
- LDL: ${ldlContext(bloodData.LDL_mgdL as number | null)}
- Glucose: ${glucoseContext(bloodData.glucose_mgdL as number | null)}
- HDL: ${bloodData.HDL_mgdL != null ? `${bloodData.HDL_mgdL} mg/dL` : "not available"}
- ApoB: ${bloodData.ApoB_mgdL != null ? `${bloodData.ApoB_mgdL} mg/dL` : "not available"}
- Triglycerides: ${bloodData.triglycerides_mgdL != null ? `${bloodData.triglycerides_mgdL} mg/dL` : "not available"}
- HbA1c: ${bloodData.HbA1c_pct != null ? `${bloodData.HbA1c_pct}%` : "not available"}
- Vitamin D: ${bloodData.vitaminD_ngmL != null ? `${bloodData.vitaminD_ngmL} ng/mL` : "not available"}
- eGFR: ${bloodData.eGFR != null ? `${bloodData.eGFR} mL/min` : "not available"}
- Homocysteine: ${bloodData.homocysteine_umolL != null ? `${bloodData.homocysteine_umolL} µmol/L` : "not available"}
- Hemoglobin: ${bloodData.hemoglobin_gdL != null ? `${bloodData.hemoglobin_gdL} g/dL` : "not available"}
- Collection date: ${bloodData.collectionDate ?? "unknown"}` : "Not available"}

SLEEP PANEL (${sleepData?.provider ?? "none"}, ${sleepData?.nights ?? 0} nights avg):
- Deep sleep: ${sleepData ? fmt(sleepData.deepSleepPct) : "N/A"}% (target ≥17%)
- REM: ${sleepData ? fmt(sleepData.remPct) : "N/A"}% (target ≥18%)
- HRV: ${sleepData ? fmt(sleepData.hrv) : "N/A"} ms (target ≥50ms)
- SpO2: ${sleepData ? fmt(sleepData.spo2) : "N/A"}% (target ≥96%)
- Efficiency: ${sleepData ? fmt(sleepData.efficiency) : "N/A"}% (target ≥85%)

ORAL MICROBIOME (v2 — 7 dimensions):
${oralData ? `- Shannon diversity: ${fmt(oralData.shannon, 2)} (target ≥3.0)
- Nitrate reducers: ${fmt(oralData.nitrateReducerPct)}% (target ≥20%)
- Periodontal burden: ${burdenLevel(oralData.periodontalBurden)}
- Protective bacteria: ${oralData.protectivePct != null ? fmt(oralData.protectivePct) + "%" : "not scored"}
- Neurological balance signal: ${oralData.neuroPct !== null ? oralData.neuroPct.toFixed(2) + "% (P. gingivalis + T. denticola)" : "not detected"}
- Metabolic balance signal: ${oralData.prevotellaPct !== null ? oralData.prevotellaPct.toFixed(1) + "% Prevotella" : "not detected"}
- Cellular environment signal: ${oralData.fusobacteriumPct !== null ? oralData.fusobacteriumPct.toFixed(1) + "% Fusobacterium" : "not detected"}
- Antiseptic mouthwash detected: ${oralData.mouthwashDetected ? "yes — note that antiseptic mouthwash suppresses nitrate-reducing bacteria" : "no"}` : "Not available — do not reference oral panel in any insight"}

ACTIVE CROSS-PANEL MODIFIERS:
${modifiersApplied.length > 0
  ? modifiersApplied.map(m => `${m.direction === 'bonus' ? '+' : '-'}${m.points} ${m.label}`).join('\n')
  : 'None active'}

LIFESTYLE CONTEXT (not scored — informational only):
${lifestyleData ? `- Age range: ${lifestyleData.ageRange ?? "not provided"}
- Exercise: ${lifestyleData.exerciseLevel ?? "not provided"}
- Smoking: ${lifestyleData.smokingStatus ?? "not provided"}
- Brushing frequency: ${lifestyleData.brushingFreq ?? "not provided"}
- Flossing frequency: ${lifestyleData.flossingFreq ?? "not provided"}
- Mouthwash: ${lifestyleData.mouthwashType ?? "not provided"}
- Stress: ${lifestyleData.stressLevel ?? "not provided"}` : "Not available"}

LIFESTYLE SELF-REPORT (most recent check-in: ${recentCheckin?.checked_in_at ?? "none"}):
${recentCheckin ? `- Exercise: ${recentCheckin.exercise_frequency ?? "not reported"}
- Diet: ${recentCheckin.diet_quality ?? "not reported"}
- Stress: ${recentCheckin.stress_level ?? "not reported"}
- Alcohol: ${recentCheckin.alcohol_frequency ?? "not reported"}
- Sleep focus: ${(recentCheckin as Record<string, unknown>).sleep_priority ?? "not reported"}
- Energy level: ${(recentCheckin as Record<string, unknown>).energy_level ?? "not reported"}
- Blood pressure feeling: ${(recentCheckin as Record<string, unknown>).blood_pressure_feeling ?? "not reported"}
- Supplements: ${Array.isArray((recentCheckin as Record<string, unknown>).supplements) && ((recentCheckin as Record<string, unknown>).supplements as string[]).length > 0 ? ((recentCheckin as Record<string, unknown>).supplements as string[]).join(", ") : "none reported"}` : "No check-in data available"}
Note: these are self-reported relative changes, not absolute values. Use them to add context to insights but do not make strong claims from them.
SUPPLEMENT CONTEXT (apply when relevant):
- If taking a statin: LDL and ApoB values may be lower than baseline due to treatment — note this as context rather than attributing the value solely to lifestyle
- If taking fish oil: omega-3 supplementation is relevant to triglycerides and inflammatory markers like hsCRP — worth noting as a contributing factor if both are in a good range
- If taking Vitamin D: relevant to immune function and inflammatory tone

PATTERNS TO LOOK FOR:
Interesting cross-panel connections (frame with curiosity, not alarm):
- Low nitrate reducers alongside cardiovascular markers — the relationship between oral bacteria and nitric oxide availability is an emerging area
- Elevated periodontal burden alongside hsCRP — these two often trend together and the connection is worth noting
- Low HRV alongside sleep efficiency and oral diversity — autonomic balance touches multiple systems
- Glucose markers alongside sleep architecture — sleep and metabolic markers are increasingly understood to be connected

POSITIVE card guidance:
A POSITIVE card is valid ONLY when:
- A metric is meaningfully above its target (not just within range)
- AND a second panel has a related metric also in a good range
- AND the connection is well-established

Valid POSITIVE examples:
- Strong deep sleep (≥20%) + low hsCRP → sleep and inflammation moving together
- High Shannon diversity + low hsCRP → oral microbiome resilience reflected systemically
- Good HRV (≥50ms) + low hsCRP → autonomic balance and low inflammation
- Healthy glucose + strong REM → metabolic and cognitive recovery aligned

Invalid POSITIVE examples (do not generate these):
- Any card connecting sleep stages to lipid levels (LDL, HDL, triglycerides, ApoB)
- Any card where both values are merely "within range" rather than genuinely strong
- Any card framed as "may suggest" or "could be linked" — POSITIVE cards require established connections

If no strong POSITIVE signal exists, pick the best available strength and frame it warmly. Do not invent connections that aren't there.

Return a JSON array of exactly 3 insight objects in this order: POSITIVE, WATCH, EXPLORE:
[
  {
    "id": "unique_string",
    "panels": ["oral", "blood"],
    "headline": "5-8 words, specific to this user's values, not alarming",
    "body": "2-3 sentences. Observational tone. Use actual numbers. Use language like 'may suggest', 'worth noting', 'interesting pattern'. For positive cards, be warm and affirming.",
    "mechanism": "one sentence describing the biological relationship in plain language — frame as 'research suggests' or 'these two are thought to be connected through...'",
    "action": "one direct sentence — for POSITIVE: affirming and specific, no hedging. For WATCH/EXPLORE: one gentle, actionable suggestion.",
    "category": "POSITIVE",
    "priority": 1,
    "citations": ["1-3 real published studies most relevant to this specific insight. Format: Author et al., Journal Name, Year. Only include studies you are highly confident exist — omit if uncertain."]
  }
]

category must be exactly one of: "POSITIVE", "WATCH", "EXPLORE"
Array order is fixed: index 0 = POSITIVE, index 1 = WATCH, index 2 = EXPLORE.`

  // ── Pre-call panel data log ────────────────────────────────────────────────
  console.log(
    `[labs-insight] generating insight for user: ${user.id.slice(0, 8)}`,
    `| panels: blood=${!!bloodData} sleep=${!!sleepData} oral=${!!oralData} lifestyle=${!!lifestyleData}`,
  )
  if (oralData) {
    console.log(
      "[insight] oral values passed to prompt:",
      `shannon=${oralData.shannon}`,
      `nitrate=${fmt(oralData.nitrateReducerPct)}%`,
      `periodontal=${oralData.periodontalBurden} → ${burdenLevel(oralData.periodontalBurden)}`,
      `osa=${oralData.osaBurden} → ${burdenLevel(oralData.osaBurden)}`,
    )
  }

  // ── Call OpenAI ───────────────────────────────────────────────────────────
  // HIPAA BAA signed 2026-03-28. Zero Data Retention active.
  // ZDR eligible endpoint: /v1/chat/completions only. Confirmation: uKTeFVcJ3x
  // PHI must never appear in logs.
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    console.error("[labs-insight] OPENAI_API_KEY not set")
    return NextResponse.json({ error: "No AI key" }, { status: 503 })
  }

  const openai = new OpenAI({ apiKey: openaiKey })
  const model  = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
  console.log("[labs-insight] calling model:", model, "| api key present:", true)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  // HIPAA: PHI-free payload — numeric biomarkers, age range (not exact DOB),
  // biological sex, lifestyle categories. No user_id, name, email, or DOB.
  let raw: string
  try {
    const resp = await openai.chat.completions.create({
      model,
      messages:    [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
      temperature: 0.72,
      max_tokens:  1200,
      store:       false,  // ZDR — never store
    }, { signal: controller.signal })
    raw = resp.choices[0]?.message.content ?? ""
    console.log("[labs-insight] response received, tokens:", resp.usage?.total_tokens)
  } catch (err) {
    const e = err as { message?: string }
    console.error("[labs-insight] error:", e.message)
    return NextResponse.json({ error: "AI timeout" }, { status: 504 })
  } finally {
    clearTimeout(timeout)
  }

  // ── Parse + validate ───────────────────────────────────────────────────────
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
  let parsed: unknown[]
  try {
    const p = JSON.parse(cleaned)
    parsed = Array.isArray(p) ? p : []
  } catch {
    console.error("[labs-insight] JSON parse failed")
    return NextResponse.json({ error: "Parse failed" }, { status: 500 })
  }

  // Remove cards containing banned diagnostic or alarming language
  const BANNED_TERMS = [
    "you have", "you are at risk", "indicates that you",
    "this means you", "you should see", "you need to",
    "lipid recovery strain", "metabolic recovery efficiency",
    "recovery capacity deficit", "inflammatory load index",
    "you are experiencing", "you suffer from",
    "clinical recommendation", "medical advice",
    // Clinician-flagged: sleep-lipid association not established enough (flagged 2026-03-28)
    "deep sleep supports your lipid",
    "slow-wave sleep.*ldl", "slow-wave sleep.*triglyceride",
    "deep sleep.*ldl", "deep sleep.*triglyceride", "deep sleep.*apob",
    "sleep.*lipid clearance", "hepatic lipid",
  ]

  // Take first 3 valid cards (2+ panels, no banned language)
  const validated = parsed
    .filter((item) => {
      const c = item as Record<string, unknown>
      if (!Array.isArray(c.panels) || (c.panels as unknown[]).length < 2) return false
      const text = `${c.headline ?? ""} ${c.body ?? ""} ${c.mechanism ?? ""} ${c.action ?? ""}`.toLowerCase()
      const hit = BANNED_TERMS.find(term => text.includes(term.toLowerCase()))
      if (hit) { console.warn("[labs-insight] removed card with banned term:", hit); return false }
      return true
    })
    .slice(0, 3)

  if (validated.length < 3) console.warn(`[labs-insight] fewer than 3 valid cards: ${validated.length}`)
  console.log(`[labs-insight] insight generated successfully — cards: ${validated.length}`)

  return NextResponse.json(validated)
}

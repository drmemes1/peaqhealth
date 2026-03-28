import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { AzureOpenAI } from "openai"

const SYSTEM_PROMPT = `You are the clinical insight engine for Peaq Health, a longevity platform built by a cardiologist and dentist. Generate cross-panel insights that connect blood biomarkers, sleep physiology, oral microbiome, and lifestyle data in ways that reveal risk or opportunity that no single data source could show alone.

RULES:
1. Every insight MUST reference data from at least 2 panels. Single-panel observations are forbidden.
2. Use the user's actual values and numbers — never generic ranges.
3. Reveal non-obvious biological connections — the kind a cardiologist and periodontist would discuss together.
4. Never use disease language. Use wellness and optimization framing.
5. Write in warm, plain language a motivated patient can understand.
6. Return ONLY a valid JSON array. No markdown, no backticks, no preamble.`

function num(v: unknown): number | undefined {
  const n = Number(v)
  return !isNaN(n) && n > 0 ? n : undefined
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [labRes, sleepRes, wearableRes, oralRes, lifestyleRes] = await Promise.all([
    supabase.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("sleep_data").select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2,resting_heart_rate").eq("user_id", user.id).order("date", { ascending: false }).limit(15),
    supabase.from("wearable_connections_v2").select("provider").eq("user_id", user.id).eq("needs_reconnect", false).order("connected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", user.id).not("shannon_diversity", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("*").eq("user_id", user.id).maybeSingle(),
  ])

  const lab       = labRes.data
  const sleepRows = sleepRes.data ?? []
  const wearable  = wearableRes.data
  const oral      = oralRes.data
  const lifestyle = lifestyleRes.data

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
  type OralData = { shannon: number | null; nitrateReducerPct: number | null; periodontalBurden: number | null }
  let oralData: OralData | null = null
  if (oral) {
    oralData = {
      shannon:           num(oral.shannon_diversity) ?? null,
      nitrateReducerPct: oral.nitrate_reducers_pct != null ? Number(oral.nitrate_reducers_pct) * 100 : null,
      periodontalBurden: oral.periodontopathogen_pct != null ? Number(oral.periodontopathogen_pct) * 100 : null,
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
  const userPrompt = `Generate 6 cross-panel longevity insights for this user.
Every insight must connect at least 2 of the 4 panels below.
Only generate insights where the user's actual data supports the signal.
If a panel is unavailable, do not reference it.

BLOOD PANEL:
${bloodData ? JSON.stringify(bloodData, null, 2) : "Not available"}

SLEEP PANEL (${sleepData?.provider ?? "none"}, ${sleepData?.nights ?? 0} nights avg):
- Deep sleep: ${sleepData?.deepSleepPct?.toFixed(1) ?? "N/A"}% (target ≥17%)
- REM: ${sleepData?.remPct?.toFixed(1) ?? "N/A"}% (target ≥18%)
- HRV: ${sleepData?.hrv?.toFixed(1) ?? "N/A"} ms (target ≥50ms)
- SpO2: ${sleepData?.spo2?.toFixed(1) ?? "N/A"}% (target ≥96%)
- Efficiency: ${sleepData?.efficiency?.toFixed(1) ?? "N/A"}% (target ≥85%)

ORAL MICROBIOME:
- Shannon diversity: ${oralData?.shannon ?? "N/A"} (target ≥3.0)
- Nitrate reducers: ${oralData?.nitrateReducerPct?.toFixed(1) ?? "N/A"}% (target ≥20%)
- Periodontal burden: ${oralData?.periodontalBurden?.toFixed(1) ?? "N/A"}% (target <0.5%)

LIFESTYLE:
${lifestyleData ? JSON.stringify(lifestyleData, null, 2) : "Not available"}

CROSS-PANEL SIGNALS TO PRIORITIZE (only if user data supports):
- Low nitrate reducers + low HRV + elevated BP markers → nitric oxide / vasodilation pathway
- Elevated Lp(a) + high periodontal burden + poor sleep efficiency → inflammation convergence
- Low HRV + elevated hsCRP + low protective bacteria → systemic inflammation triple signal
- Low deep sleep + elevated glucose + low Shannon diversity → metabolic dysregulation
- P. gingivalis burden + elevated ApoB + poor sleep → atherogenic triple signal
- Low REM + low nitrate reducers + elevated LDL → cardiovascular recovery deficit

Return a JSON array of exactly 6 insight objects:
[
  {
    "id": "unique_string",
    "panels": ["blood", "sleep"],
    "headline": "5-8 word headline specific to this user's values",
    "body": "2-3 sentences connecting panels using actual numbers",
    "mechanism": "one sentence explaining the biological pathway",
    "action": "one concrete specific recommendation",
    "category": "ROUTINE",
    "priority": 1
  }
]

category must be exactly one of: "ROUTINE", "WATCH", "OPTIMIZE"
Priority 1 = most clinically relevant. panels array must have at least 2 entries.`

  // ── Call Azure OpenAI ─────────────────────────────────────────────────────
  const azureKey = process.env.AZURE_OPENAI_KEY
  if (!azureKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  const openai = new AzureOpenAI({
    apiKey:     azureKey,
    endpoint:   process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: "2024-08-01-preview",
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  // HIPAA: PHI-free payload — numeric biomarkers, age range (not exact DOB),
  // biological sex, lifestyle categories. No user_id, name, email, or DOB.
  let raw: string
  try {
    const resp = await openai.chat.completions.create({
      model:       process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages:    [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
      temperature: 0.72,
      max_tokens:  2000,
    }, { signal: controller.signal })
    raw = resp.choices[0]?.message.content ?? ""
  } catch (err) {
    console.error("[insight] OpenAI error:", err)
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
    console.error("[insight] JSON parse failed, raw:", raw.slice(0, 200))
    return NextResponse.json({ error: "Parse failed" }, { status: 500 })
  }

  // Enforce: every card must reference at least 2 panels
  const valid = parsed.filter((item) => {
    const i = item as Record<string, unknown>
    return Array.isArray(i.panels) && (i.panels as unknown[]).length >= 2
  })

  if (valid.length < 4) {
    console.warn(`[insight] only ${valid.length} insights passed the 2-panel filter (raw count: ${parsed.length})`)
  }

  return NextResponse.json(valid)
}

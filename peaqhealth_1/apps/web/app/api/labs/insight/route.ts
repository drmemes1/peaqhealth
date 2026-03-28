import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { AzureOpenAI } from "openai"

const SYSTEM_PROMPT = `You are the insight engine for Peaq Health, a longevity platform built by a cardiologist and periodontist. Your job is to surface interesting cross-panel patterns in a user's data — connections between their blood biomarkers, sleep, oral microbiome, and lifestyle that they would not see by looking at any single panel alone.

You are NOT a doctor. You do NOT give medical advice. You do NOT diagnose, treat, or make clinical recommendations. You surface patterns and ask interesting questions. You celebrate strengths. You note things worth paying attention to.

VOICE:
- Curious and observational, not clinical or alarming
- Warm and motivating — like a knowledgeable friend reviewing your data
- Specific to this person's actual numbers, never generic
- Honest about uncertainty — use language like "may suggest", "is worth noting", "could be connected", "interesting to watch"

STRICT RULES:
1. Every insight must connect at least 2 panels. Single-panel observations are forbidden.
2. At least 2 of 6 insights must include the oral panel.
3. At least 2 of 6 insights must be POSITIVE — celebrating something the user is doing well across panels.
4. Only reference established biological relationships. Never invent terminology or mechanisms.
5. Never say: "you have", "you are at risk", "indicates that you", "this means you have", "you should see a doctor", "you need to", or any diagnostic language.
6. Instead say: "your data shows", "this pattern may suggest", "worth keeping an eye on", "an interesting connection", "something to explore with your doctor if curious"
7. Actions must be lifestyle observations, not medical instructions. Frame as "something worth exploring" not "you must do X."
8. Return ONLY valid JSON. No markdown, no backticks, no commentary.

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

function num(v: unknown): number | undefined {
  const n = Number(v)
  return !isNaN(n) && n > 0 ? n : undefined
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

  const [labRes, sleepRes, wearableRes, oralRes, lifestyleRes] = await Promise.all([
    svc.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    svc.from("sleep_data").select("date,source,total_sleep_minutes,deep_sleep_minutes,rem_sleep_minutes,sleep_efficiency,hrv_rmssd,spo2,resting_heart_rate").eq("user_id", user.id).order("date", { ascending: false }).limit(15),
    svc.from("wearable_connections_v2").select("provider").eq("user_id", user.id).eq("needs_reconnect", false).order("connected_at", { ascending: false }).limit(1).maybeSingle(),
    svc.from("oral_kit_orders").select("shannon_diversity,nitrate_reducers_pct,periodontopathogen_pct,osa_taxa_pct,raw_otu_table").eq("user_id", user.id).in("status", ["results_ready", "scored"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    svc.from("lifestyle_records").select("*").eq("user_id", user.id).maybeSingle(),
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
  type OralData = { shannon: number | null; nitrateReducerPct: number | null; periodontalBurden: number | null; protectivePct: number | null }
  let oralData: OralData | null = null
  if (oral) {
    // Protective bacteria: Rothia + Neisseria genera from raw OTU table (summed, *100 for %)
    let protectivePct: number | null = null
    const rawOtu = oral.raw_otu_table as Record<string, number> | null
    if (rawOtu) {
      const protective = Object.entries(rawOtu)
        .filter(([k]) => k.toLowerCase().startsWith("rothia") || k.toLowerCase().startsWith("neisseria"))
        .reduce((sum, [, v]) => sum + v, 0)
      protectivePct = protective * 100
    }
    oralData = {
      shannon:           oral.shannon_diversity != null ? Number(oral.shannon_diversity) : null,
      nitrateReducerPct: oral.nitrate_reducers_pct != null ? Number(oral.nitrate_reducers_pct) * 100 : null,
      periodontalBurden: oral.periodontopathogen_pct != null ? Number(oral.periodontopathogen_pct) * 100 : null,
      protectivePct,
    }
  }
  console.log(`[insight] user=${user.id.slice(0, 8)} oral=${oralData ? JSON.stringify(oralData) : "null"} | oralRow=${oral ? "present" : "null"}`)

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
  const userPrompt = `Generate 6 cross-panel insights for this user's Peaq Health data.

MANDATORY COMPOSITION:
- Every insight connects at least 2 panels
- At least 2 insights include the ORAL panel
- At least 2 insights are POSITIVE — celebrating strong cross-panel patterns
- Remaining insights note interesting patterns worth watching, framed with curiosity not alarm
- Only generate insights supported by the user's actual data
- Skip any panel that is unavailable

BLOOD PANEL:
${bloodData ? JSON.stringify(bloodData) : "Not available"}

SLEEP PANEL (${sleepData?.provider ?? "none"}, ${sleepData?.nights ?? 0} nights avg):
- Deep sleep: ${sleepData?.deepSleepPct?.toFixed(1) ?? "N/A"}% (target ≥17%)
- REM: ${sleepData?.remPct?.toFixed(1) ?? "N/A"}% (target ≥18%)
- HRV: ${sleepData?.hrv?.toFixed(1) ?? "N/A"} ms (target ≥50ms)
- SpO2: ${sleepData?.spo2?.toFixed(1) ?? "N/A"}% (target ≥96%)
- Efficiency: ${sleepData?.efficiency?.toFixed(1) ?? "N/A"}% (target ≥85%)

ORAL MICROBIOME:
${oralData ? `- Shannon diversity: ${oralData.shannon ?? "N/A"} (target ≥3.0)
- Nitrate reducers: ${oralData.nitrateReducerPct?.toFixed(1) ?? "N/A"}% (target ≥20%)
- Periodontal burden: ${oralData.periodontalBurden?.toFixed(1) ?? "N/A"}% (target <0.5%)
- Protective bacteria (Rothia + Neisseria): ${oralData.protectivePct?.toFixed(1) ?? "N/A"}% (target ≥10%)` : "Not available"}

LIFESTYLE:
${lifestyleData ? JSON.stringify(lifestyleData) : "Not available"}

PATTERNS TO LOOK FOR:
Interesting cross-panel connections (frame with curiosity, not alarm):
- Low nitrate reducers alongside cardiovascular markers — the relationship between oral bacteria and nitric oxide availability is an emerging area
- Elevated periodontal burden alongside hsCRP — these two often trend together and the connection is worth noting
- Low HRV alongside sleep efficiency and oral diversity — autonomic balance touches multiple systems
- Glucose markers alongside sleep architecture — sleep and metabolic markers are increasingly understood to be connected

POSITIVE cards (generate only when genuinely supported — do not manufacture to fill a quota):
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

If fewer than 2 valid POSITIVE cards exist in the user's data, generate 1 POSITIVE and use the remaining slot for a well-evidenced WATCH or EXPLORE card. Do not invent positive associations to meet the quota.

Return a JSON array of exactly 6 insight objects:
[
  {
    "id": "unique_string",
    "panels": ["oral", "blood"],
    "headline": "5-8 words, specific to this user's values, not alarming",
    "body": "2-3 sentences. Observational tone. Use actual numbers. Use language like 'may suggest', 'worth noting', 'interesting pattern'. For positive cards, be warm and affirming.",
    "mechanism": "one sentence describing the biological relationship in plain language — frame as 'research suggests' or 'these two are thought to be connected through...'",
    "action": "one gentle suggestion framed as 'worth exploring' or 'something to discuss if you're curious' — never a medical instruction",
    "category": "POSITIVE",
    "priority": 1
  }
]

category must be exactly one of: "POSITIVE", "WATCH", "EXPLORE"
Priority 1 = most interesting or relevant. Oral panel must appear in at least 2 cards. At least 2 cards must be POSITIVE category.`

  // ── Pre-call panel data log ────────────────────────────────────────────────
  console.log(
    `[insight] user=${user.id.slice(0, 8)}`,
    `oral=${oralData ? `shannon=${oralData.shannon}/nitrate=${oralData.nitrateReducerPct?.toFixed(1)}/perio=${oralData.periodontalBurden?.toFixed(1)}/protective=${oralData.protectivePct?.toFixed(1)}` : "null"}`,
    `| sleep=${sleepData ? `deep=${sleepData.deepSleepPct?.toFixed(1)}%/rem=${sleepData.remPct?.toFixed(1)}%/hrv=${sleepData.hrv?.toFixed(1)}` : "null"}`,
    `| blood=${bloodData ? "present" : "null"}`,
    `| lifestyle=${lifestyleData ? "present" : "null"}`,
  )

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
  const twoPanel = parsed.filter((item) => {
    const i = item as Record<string, unknown>
    return Array.isArray(i.panels) && (i.panels as unknown[]).length >= 2
  })

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
  const validated = twoPanel.filter((item) => {
    const c = item as Record<string, unknown>
    const text = `${c.headline ?? ""} ${c.body ?? ""} ${c.mechanism ?? ""} ${c.action ?? ""}`.toLowerCase()
    const hit = BANNED_TERMS.find(term => text.includes(term.toLowerCase()))
    if (hit) {
      console.warn("[insight] removed card with banned language:", c.headline, "| term:", hit)
      return false
    }
    return true
  })

  // Composition warnings
  const oralCards     = validated.filter(c => Array.isArray((c as Record<string, unknown>).panels) && ((c as Record<string, unknown>).panels as string[]).includes("oral"))
  const positiveCards = validated.filter(c => (c as Record<string, unknown>).category === "POSITIVE")
  if (oralCards.length < 2)     console.warn(`[insight] only ${oralCards.length} oral cards — oral data may be missing`)
  if (positiveCards.length < 2) console.warn(`[insight] only ${positiveCards.length} positive cards generated`)
  if (validated.length < 4)     console.warn(`[insight] only ${validated.length} valid insights after filtering (raw: ${parsed.length})`)

  // Log all cards for clinician review
  validated.forEach(item => {
    const c = item as Record<string, unknown>
    console.log(`[insight] "${c.headline}" panels=${(c.panels as string[]).join("+")} category=${c.category}`)
  })

  return NextResponse.json(validated)
}

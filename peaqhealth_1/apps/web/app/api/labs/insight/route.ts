import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { AzureOpenAI } from "openai"

const SYSTEM_PROMPT = `You are a world-class preventive medicine physician — the kind patients fly across the country to see. You specialize in the intersection of cardiovascular medicine, sleep medicine, metabolic health, and the oral-systemic axis. You have just reviewed this patient's complete data across all panels. Your job is to tell them the most important things in their data that no standard doctor visit would ever surface — connections between panels, hidden risks, and early signals that are actionable right now. You speak like a brilliant, warm doctor talking directly to a motivated patient — never clinical, never vague, never generic. Every sentence you write contains this patient's actual numbers. You never say 'consider' or 'may want to' — you say what needs to be done and why.`

function fmtVal(val: unknown, unit: string): string | null {
  if (val === null || val === undefined) return null
  const n = Number(val)
  if (isNaN(n) || n <= 0) return null
  return `${n} ${unit}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [labRes, labHistRes, wearableRes, oralRes, lifestyleRes] = await Promise.all([
    supabase.from("lab_results").select("*").eq("user_id", user.id).eq("parser_status", "complete").order("collection_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lab_history").select("locked_at, collection_date, ldl_mgdl, hdl_mgdl, hs_crp_mgl, vitamin_d_ngml, total_score, blood_score").eq("user_id", user.id).order("locked_at", { ascending: false }).limit(5),
    supabase.from("wearable_connections").select("*").eq("user_id", user.id).eq("status", "connected").order("connected_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("oral_kit_orders").select("*").eq("user_id", user.id).in("status", ["results_ready", "scored"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("lifestyle_records").select("*").eq("user_id", user.id).maybeSingle(),
  ])

  const lab       = labRes.data
  const labHist   = labHistRes.data ?? []
  const wearable  = wearableRes.data
  const oral      = oralRes.data
  const lifestyle = lifestyleRes.data

  const hasSomething = !!(lab || wearable || oral || lifestyle)
  if (!hasSomething) return NextResponse.json({ error: "No data" }, { status: 422 })

  // ── Blood markers ──────────────────────────────────────────────────────────
  const bloodMarkers: Record<string, string> = {}
  if (lab) {
    const pairs: [string, unknown, string][] = [
      ["hsCRP",              lab.hs_crp_mgl,           "mg/L"],
      ["LDL Cholesterol",    lab.ldl_mgdl,              "mg/dL"],
      ["HDL Cholesterol",    lab.hdl_mgdl,              "mg/dL"],
      ["ApoB",               lab.apob_mgdl,             "mg/dL"],
      ["Triglycerides",      lab.triglycerides_mgdl,    "mg/dL"],
      ["Glucose (fasting)",  lab.glucose_mgdl,          "mg/dL"],
      ["HbA1c",              lab.hba1c_pct,             "%"],
      ["Vitamin D",          lab.vitamin_d_ngml,        "ng/mL"],
      ["eGFR",               lab.egfr_mlmin,            "mL/min"],
      ["Lp(a)",              lab.lpa_mgdl,              "mg/dL"],
      ["Hemoglobin",         lab.hemoglobin_gdl,        "g/dL"],
      ["ALT",                lab.alt_ul,                "U/L"],
      ["AST",                lab.ast_ul,                "U/L"],
      ["Albumin",            lab.albumin_gdl,           "g/dL"],
      ["WBC",                lab.wbc_kul,               "K/µL"],
      ["Homocysteine",       lab.homocysteine_umoll,    "µmol/L"],
      ["Ferritin",           lab.ferritin_ngml,         "ng/mL"],
      ["TSH",                lab.tsh_uiuml,             "µIU/mL"],
      ["Free T4",            lab.free_t4_ngdl,          "ng/dL"],
      ["DHEA-S",             lab.dhea_s_ugdl,           "µg/dL"],
      ["IGF-1",              lab.igf1_ngml,             "ng/mL"],
      ["PSA",                lab.psa_ngml,              "ng/mL"],
    ]
    for (const [name, val, unit] of pairs) {
      const f = fmtVal(val, unit)
      if (f) bloodMarkers[name] = f
    }
  }

  // ── Previous labs (from lab_history, second most recent entry) ────────────
  let previousLabs: Record<string, string> | undefined
  let previousCollectionDate: string | undefined
  if (labHist.length > 1) {
    const prev = labHist[1]
    const prevPairs: [string, unknown, string][] = [
      ["LDL Cholesterol", prev.ldl_mgdl,     "mg/dL"],
      ["HDL Cholesterol", prev.hdl_mgdl,     "mg/dL"],
      ["hsCRP",           prev.hs_crp_mgl,   "mg/L"],
      ["Vitamin D",       prev.vitamin_d_ngml,"ng/mL"],
    ]
    const prevObj: Record<string, string> = {}
    for (const [name, val, unit] of prevPairs) {
      const f = fmtVal(val, unit)
      if (f) prevObj[name] = f
    }
    if (Object.keys(prevObj).length > 0) {
      previousLabs = prevObj
      previousCollectionDate = prev.collection_date ?? prev.locked_at?.slice(0, 10)
    }
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────
  const nightsAvailable = Number(wearable?.nights_available ?? 0)
  const deepSleepPct    = fmtVal(wearable?.deep_sleep_pct,    "%")    ?? "—"
  const remPct          = fmtVal(wearable?.rem_pct,           "%")    ?? "—"
  const sleepEfficiency = fmtVal(wearable?.sleep_efficiency,  "%")    ?? "—"
  const hrv             = fmtVal(wearable?.hrv_rmssd,         "ms")   ?? "—"
  const restingHr       = fmtVal(wearable?.latest_resting_hr, "bpm")  ?? "—"

  // ── Oral ──────────────────────────────────────────────────────────────────
  const shannonDiv      = fmtVal(oral?.shannon_diversity,           "")   ?? "—"
  const nitrateReducing = fmtVal(oral?.nitrate_reducers_pct,        "%")  ?? "—"
  const periodontalPath = fmtVal(oral?.periodont_path_pct ?? oral?.periodontopathogen_pct, "%") ?? "—"
  const osaTaxa         = fmtVal(oral?.osa_taxa_pct,                "%")  ?? "—"

  // ── Lifestyle ─────────────────────────────────────────────────────────────
  const exMap: Record<string, string> = { active: "Very active (>300 min/week)", moderate: "Moderately active (150–300 min/week)", light: "Lightly active (<150 min/week)", sedentary: "Sedentary (<60 min/week)" }
  const exerciseFreq = exMap[lifestyle?.exercise_level ?? ""] ?? (lifestyle?.exercise_level ?? "not reported")
  const smoking      = lifestyle?.smoking_status ?? "not reported"
  const dietQuality  = lifestyle?.diet_quality ?? "not reported"
  const alcoholNum   = lifestyle?.alcohol_drinks_per_week
  const alcohol      = alcoholNum != null ? `${alcoholNum} drinks/week` : "not reported"

  const medsList: string[] = []
  if (lifestyle?.on_statins === true)      medsList.push("statin therapy")
  if (lifestyle?.on_bp_meds === true)      medsList.push("antihypertensive medication")
  if (lifestyle?.on_diabetes_meds === true) medsList.push("diabetes medication")
  const medications = medsList.length > 0 ? medsList.join(", ") : "none reported"

  // ── User prompt ───────────────────────────────────────────────────────────
  const collectionDate = lab?.collection_date ?? "unknown"
  const labName        = lab?.lab_name ?? "lab"

  const bloodSection = lab
    ? `BLOOD BIOMARKERS (collected ${collectionDate} via ${labName}):
${Object.entries(bloodMarkers).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
    : "BLOOD BIOMARKERS: No blood panel on file."

  const sleepSection = wearable
    ? `SLEEP DATA (${nightsAvailable} nights tracked via wearable):
- Deep sleep: ${deepSleepPct} (target >20%)
- REM sleep: ${remPct} (target >20%)
- Sleep efficiency: ${sleepEfficiency} (target >85%)
- HRV (RMSSD): ${hrv}
- Resting HR: ${restingHr}`
    : "SLEEP DATA: No wearable data on file."

  const oralSection = oral
    ? `ORAL MICROBIOME (Zymo 16S sequencing):
- Shannon diversity index: ${shannonDiv} (target ≥3.0 — low = dysbiosis)
- Nitrate-reducing bacteria: ${nitrateReducing} reads (target ≥5% — low = BP risk)
- Periodontal pathogens (P. gingivalis, T. denticola): ${periodontalPath} reads (target <0.5%)
- OSA-associated taxa (Prevotella, Fusobacterium): ${osaTaxa} reads (target <1%)`
    : "ORAL MICROBIOME: No oral microbiome data on file."

  const previousSection = previousLabs && previousCollectionDate
    ? `\nPREVIOUS LABS (${previousCollectionDate}):
${Object.entries(previousLabs).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
    : ""

  const userPrompt = `Here is my complete health data. Analyze everything together and find the most important cross-panel patterns.

${bloodSection}

${sleepSection}

${oralSection}

LIFESTYLE:
- Smoking: ${smoking}
- Exercise: ${exerciseFreq}
- Diet: ${dietQuality}
- Alcohol: ${alcohol}
- Medications: ${medications}
${previousSection}

Generate a response in this EXACT JSON format — no markdown, no backticks, start with { and end with }:

{
"primaryFinding": {
"title": "5-7 word headline that would make them stop scrolling",
"finding": "2-3 sentences connecting their specific numbers across at least 2 panels. Include the actual values. This should be something their doctor has never told them.",
"mechanism": "1-2 sentences explaining the biological reason this matters — specific pathway, not generic advice.",
"action": "One specific, concrete action they can take this week. Not a suggestion — a directive with a reason.",
"urgency": "routine",
"panels": ["blood", "sleep"]
},
"insights": [
{
"title": "compelling short title",
"finding": "1-2 sentences with their actual numbers",
"mechanism": "1 sentence — the biological why",
"action": "one specific next step",
"urgency": "routine",
"panels": ["panel1", "panel2"]
}
],
"trajectoryNote": "Only include if previous labs exist. 1-2 sentences on what improved or worsened and by how much. Omit this field entirely if no previous labs.",
"allPanelsBonus": "Only include if all 4 panels have data. 1-2 sentences revealing the single most important pattern that ONLY becomes visible when all 4 panels are analyzed together. This is the insight that justifies having all 4 panels. Omit if any panel is missing."
}

Rules you must follow:
- Every insight must contain at least one of the patient's actual numbers
- Primary finding must connect at least 2 panels
- Generate 2-3 supporting insights (not 4 — quality over quantity)
- If all 4 panels have data, allPanelsBonus is REQUIRED and must be genuinely surprising
- urgency "act" = needs attention soon, "watch" = monitor this, "routine" = good to know
- Never use the words: consider, may want to, it's important to, you might, perhaps
- If a panel has no data, do not reference it or fabricate values
- trajectoryNote only appears when previousLabs data is provided`

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

  let raw: string
  try {
    const resp = await openai.chat.completions.create({
      model:       process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages:    [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
      temperature: 0.72,
      max_tokens:  1400,
    }, { signal: controller.signal })
    raw = resp.choices[0]?.message.content ?? ""
  } catch (err) {
    console.error("[insight] OpenAI error:", err)
    return NextResponse.json({ error: "AI timeout" }, { status: 504 })
  } finally {
    clearTimeout(timeout)
  }

  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.error("[insight] JSON parse failed, raw:", raw.slice(0, 200))
    return NextResponse.json({ error: "Parse failed" }, { status: 500 })
  }

  return NextResponse.json(parsed)
}

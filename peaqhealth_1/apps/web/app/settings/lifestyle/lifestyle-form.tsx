"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoSvg } from "../../components/logo-svg";
import Link from "next/link";

interface QuestionDef {
  key: string;
  dbKey: string;
  label: string;
  context?: string;
  introBefore?: string;
  options: { value: string; label: string; sub?: string }[];
  type: "choice" | "boolean";
}

// ── Section groupings ──────────────────────────────────────────────────────────
const SECTIONS: {
  title: string;
  subtitle: string;
  ptsLabel: string;
  color: string;
  keys: string[];
}[] = [
  {
    title: "Demographics",
    subtitle: "Used for age-appropriate screening recommendations and cardiovascular risk calibration",
    ptsLabel: "risk calibration",
    color: "#6B4D8A",
    keys: [],
  },
  {
    title: "Physical Activity",
    subtitle: "Cardiovascular fitness is the single highest-ROI intervention for longevity",
    ptsLabel: "up to 2.5 pts",
    color: "#185FA5",
    keys: ["exerciseLevel", "exerciseMinutes"],
  },
  {
    title: "Oral Hygiene",
    subtitle: "Oral bacteria directly predict cardiovascular risk, inflammation, and sleep-breathing disorders",
    ptsLabel: "up to 3.5 pts",
    color: "#3B6D11",
    keys: ["brushingFreq", "flossingFreq", "mouthwashType", "lastDentalVisit"],
  },
  {
    title: "Sleep Patterns",
    subtitle: "Self-reported sleep calibrates your baseline and drives interaction scoring",
    ptsLabel: "sleep estimate",
    color: "#185FA5",
    keys: ["sleepDuration", "sleepLatency", "nightWakings", "daytimeFatigue", "nasalObstruction", "sinusHistory", "snoringReported", "mouthBreathing"],
  },
  {
    title: "Diet & Nutrition",
    subtitle: "Dietary patterns modulate glycemic control, inflammation, and microbiome composition",
    ptsLabel: "up to 3.5 pts",
    color: "#C49A3C",
    keys: ["vegetableServings", "fruitServings", "processedFood", "sugaryDrinks", "dietQuality", "omegaFrequency", "fermentedFoods"],
  },
  {
    title: "Alcohol & Stress",
    subtitle: "Both independently disrupt sleep architecture and amplify systemic inflammation",
    ptsLabel: "up to 0.5 pts",
    color: "#A32D2D",
    keys: ["alcoholDrinks", "stressLevel"],
  },
  {
    title: "Medical History",
    subtitle: "Diagnoses and medications calibrate cardiovascular risk interaction scoring",
    ptsLabel: "risk modifier",
    color: "#6B4D8A",
    keys: ["smokingStatus", "hypertensionDx", "onBPMeds", "onStatins", "familyHistoryCVD"],
  },
]

const QUESTIONS: QuestionDef[] = [
  // ── Physical Activity ──────────────────────────────────────────────────────
  {
    key: "exerciseLevel", dbKey: "exercise_level",
    label: "What best describes your typical weekly physical activity?",
    context: "The ACC/AHA 2022 guidelines define 150–300 min/week of moderate activity as the threshold for cardiovascular benefit.",
    type: "choice",
    options: [
      { value: "sedentary",  label: "Inactive", sub: "< 60 min/week" },
      { value: "light",      label: "Lightly active", sub: "60–150 min/week" },
      { value: "moderate",   label: "Moderately active", sub: "150–300 min/week" },
      { value: "active",     label: "Very active", sub: "> 300 min/week" },
    ],
  },
  {
    key: "exerciseMinutes", dbKey: "exercise_minutes_per_week",
    label: "How many minutes per week do you engage in vigorous exercise (running, cycling, HIIT)?",
    context: "Vigorous exercise carries a 2× cardiovascular benefit multiplier vs. moderate exercise per MET-hours (Arem et al., JAMA 2015).",
    type: "choice",
    options: [
      { value: "0",   label: "None" },
      { value: "30",  label: "< 60 min" },
      { value: "105", label: "60–150 min" },
      { value: "225", label: "150–300 min" },
    ],
  },
  // ── Oral Hygiene ──────────────────────────────────────────────────────────
  {
    key: "brushingFreq", dbKey: "brushing_freq",
    label: "How many times per day do you brush your teeth?",
    context: "Twice-daily brushing with fluoride toothpaste reduces periodontal bacterial load by ~60% (Slot et al., 2019).",
    type: "choice",
    options: [
      { value: "once",  label: "Once daily" },
      { value: "twice", label: "Twice daily" },
      { value: "more",  label: "3+ times daily" },
    ],
  },
  {
    key: "flossingFreq", dbKey: "flossing_freq",
    label: "How often do you use floss or interdental cleaners?",
    context: "Daily interdental cleaning is associated with 51% lower cardiovascular mortality (Janket 2023, n=13,413).",
    type: "choice",
    options: [
      { value: "never",     label: "Never or rarely" },
      { value: "sometimes", label: "A few times per week" },
      { value: "daily",     label: "Daily" },
    ],
  },
  {
    key: "mouthwashType", dbKey: "mouthwash_type",
    label: "What type of oral rinse do you use regularly?",
    context: "Antiseptic mouthwashes — like Listerine, Scope, and prescription chlorhexidine — are designed to kill bacteria broadly. While this reduces harmful bacteria, it also eliminates the beneficial nitrate-reducing bacteria responsible for producing nitric oxide — a molecule that regulates blood pressure and vascular health. Fluoride mouthwashes clean teeth without this effect. (Kapil et al., 2013)",
    type: "choice",
    options: [
      { value: "none",     label: "None" },
      { value: "fluoride", label: "Fluoride or other" },
      { value: "natural",  label: "Natural or oil-pulling" },
      { value: "alcohol",  label: "Antiseptic (Listerine, Scope, chlorhexidine)" },
    ],
  },
  {
    key: "lastDentalVisit", dbKey: "last_dental_visit",
    label: "When did you last receive a professional dental cleaning?",
    context: "Annual professional cleaning reduces cardiovascular risk by 14% (Park 2019, n=247,696).",
    type: "choice",
    options: [
      { value: "6mo",  label: "Within 6 months" },
      { value: "1yr",  label: "6–12 months ago" },
      { value: "2yr",  label: "1–2 years ago" },
      { value: "more", label: "More than 2 years ago" },
    ],
  },
  // ── Sleep Patterns ────────────────────────────────────────────────────────
  {
    key: "sleepDuration", dbKey: "sleep_duration",
    label: "On average, how many hours do you sleep per night?",
    context: "Both short (< 7h) and long (> 9h) sleep duration are independently associated with increased all-cause mortality (Cappuccio 2010, n=1.38M).",
    type: "choice",
    options: [
      { value: "lt6",   label: "< 6 hours" },
      { value: "6to7",  label: "6–7 hours" },
      { value: "7to8",  label: "7–8 hours" },
      { value: "gt8",   label: "8+ hours" },
    ],
  },
  {
    key: "sleepLatency", dbKey: "sleep_latency",
    label: "How long does it typically take you to fall asleep once in bed?",
    context: "Sleep onset latency > 30 min is a DSM-5 criterion for insomnia disorder and correlates with elevated cortisol.",
    type: "choice",
    options: [
      { value: "lt10",   label: "< 10 minutes" },
      { value: "10to20", label: "10–20 minutes" },
      { value: "20to40", label: "20–40 minutes" },
      { value: "gt40",   label: "40+ minutes" },
    ],
  },
  {
    key: "sleepQualSelf", dbKey: "sleep_qual_self",
    label: "How would you rate the overall quality of your sleep?",
    context: "Subjective sleep quality is independently predictive of cardiometabolic risk even when objective duration is normal.",
    type: "choice",
    options: [
      { value: "poor",      label: "Poor — rarely feel rested" },
      { value: "fair",      label: "Fair — sometimes feel rested" },
      { value: "good",      label: "Good — usually feel rested" },
      { value: "excellent", label: "Excellent — consistently feel rested" },
    ],
  },
  {
    key: "nightWakings", dbKey: "night_wakings",
    label: "How many nights per week do you wake up and struggle to fall back asleep?",
    context: "Frequent nocturnal awakenings fragment slow-wave and REM sleep, elevating next-day cortisol and inflammatory cytokines.",
    type: "choice",
    options: [
      { value: "0",    label: "Rarely or never" },
      { value: "1to2", label: "1–2 nights/week" },
      { value: "3to5", label: "3–5 nights/week" },
      { value: "gt5",  label: "Most nights" },
    ],
  },
  {
    key: "daytimeFatigue", dbKey: "daytime_fatigue",
    label: "How often do you experience excessive daytime sleepiness or fatigue?",
    context: "Excessive daytime sleepiness is a primary clinical indicator of sleep insufficiency and a screening criterion for OSA.",
    type: "choice",
    options: [
      { value: "none",     label: "Rarely or never" },
      { value: "mild",     label: "Occasionally (1–2×/week)" },
      { value: "moderate", label: "Frequently (3–5×/week)" },
      { value: "severe",   label: "Daily" },
    ],
  },
  // ── Airway & Breathing (renders inside Sleep Patterns) ────────────────────
  {
    key: "nasalObstruction", dbKey: "nasal_obstruction",
    label: "How often do you find it difficult to breathe through your nose?",
    introBefore: "These questions help us personalise your breathing and sleep insights.",
    type: "choice",
    options: [
      { value: "never",      label: "Never" },
      { value: "occasional", label: "Occasionally" },
      { value: "often",      label: "Often" },
      { value: "chronic",    label: "Chronically" },
    ],
  },
  {
    key: "sinusHistory", dbKey: "sinus_history",
    label: "Do you have any history of sinus problems or surgery?",
    context: "Include anything you've been told by a doctor, even if it was years ago.",
    type: "choice",
    options: [
      { value: "none",                 label: "None" },
      { value: "recurrent_sinusitis",  label: "Recurrent sinus infections" },
      { value: "sinus_surgery",        label: "Sinus surgery" },
      { value: "nasal_polyps",         label: "Nasal polyps" },
      { value: "deviated_septum",      label: "Deviated septum" },
    ],
  },
  {
    key: "snoringReported", dbKey: "snoring_reported",
    label: "Has anyone told you that you snore, or have you been diagnosed with sleep apnoea?",
    type: "choice",
    options: [
      { value: "no",            label: "No" },
      { value: "occasional",    label: "Occasionally" },
      { value: "frequent",      label: "Frequently" },
      { value: "osa_diagnosed", label: "Diagnosed with sleep apnoea" },
    ],
  },
  {
    key: "mouthBreathing", dbKey: "mouth_breathing",
    label: "Do you breathe through your mouth during the day or while sleeping?",
    type: "choice",
    options: [
      { value: "rarely",    label: "Rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often",     label: "Often" },
      { value: "confirmed", label: "Yes, I know I do" },
    ],
  },
  // ── Diet & Nutrition ──────────────────────────────────────────────────────
  {
    key: "vegetableServings", dbKey: "vegetable_servings_per_day",
    label: "How many servings of vegetables do you typically eat per day?",
    context: "≥ 3 servings/day is associated with 17% lower all-cause mortality and reduced systemic inflammation (Aune 2017, n=2.1M).",
    type: "choice",
    options: [
      { value: "0", label: "0" },
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "5", label: "4+" },
    ],
  },
  {
    key: "fruitServings", dbKey: "fruit_servings_per_day",
    label: "How many servings of fruit do you typically eat per day?",
    context: "≥ 2 servings/day is associated with lower cardiovascular and all-cause mortality risk (Aune 2017).",
    type: "choice",
    options: [
      { value: "0", label: "0" },
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3+" },
    ],
  },
  {
    key: "processedFood", dbKey: "processed_food_frequency",
    label: "How often do you consume ultra-processed foods (fast food, packaged snacks, ready meals)?",
    context: "Ultra-processed food consumption drives elevated triglycerides, systemic inflammation, and gut dysbiosis.",
    type: "choice",
    options: [
      { value: "1", label: "Never" },
      { value: "2", label: "Rarely (1–2×/week)" },
      { value: "3", label: "Sometimes (3–4×/week)" },
      { value: "4", label: "Often (5–6×/week)" },
      { value: "5", label: "Daily" },
    ],
  },
  {
    key: "sugaryDrinks", dbKey: "sugary_drinks_per_week",
    label: "How many sugary drinks do you consume in a typical week?",
    context: "Sugary drink consumption is a primary driver of elevated fasting insulin and triglycerides independent of total calories.",
    type: "choice",
    options: [
      { value: "0", label: "None" },
      { value: "1", label: "1–2" },
      { value: "3", label: "3–5" },
      { value: "7", label: "6–10" },
      { value: "14", label: "10+" },
    ],
  },
  {
    key: "dietQuality", dbKey: "diet_quality",
    label: "Which pattern best describes your overall diet?",
    context: "Mediterranean and DASH diets show the strongest evidence for cardiovascular risk reduction (PREDIMED, n=7,447).",
    type: "choice",
    options: [
      { value: "western",       label: "Standard Western", sub: "High red meat, refined carbs" },
      { value: "mediterranean", label: "Mediterranean", sub: "Olive oil, fish, legumes" },
      { value: "dash",          label: "DASH", sub: "Low sodium, high produce" },
      { value: "plant_based",   label: "Plant-based", sub: "Minimal animal products" },
      { value: "other",         label: "Other / Mixed" },
    ],
  },
  {
    key: "omegaFrequency", dbKey: "omega3_frequency",
    label: "How often do you eat fatty fish (salmon, sardines, mackerel, anchovies)?",
    context: "2+ servings/week of fatty fish reduces cardiovascular events by 36% via EPA/DHA-mediated inflammation reduction.",
    type: "choice",
    options: [
      { value: "rarely", label: "Rarely or never" },
      { value: "weekly", label: "Once per week" },
      { value: "often",  label: "2–3× per week" },
      { value: "daily",  label: "Daily" },
    ],
  },
  {
    key: "fermentedFoods", dbKey: "fermented_foods_frequency",
    label: "How often do you eat fermented foods?",
    context: "Fermented food consumption increased microbiome diversity and reduced inflammatory markers in a 17-week RCT (Wastyk et al., Cell 2021).",
    type: "choice",
    options: [
      { value: "rarely",    label: "Rarely or never" },
      { value: "sometimes", label: "A few times a week", sub: "Yogurt, kefir, kimchi, sauerkraut, miso, kombucha" },
      { value: "daily",     label: "Daily" },
    ],
  },
  // ── Alcohol & Stress ──────────────────────────────────────────────────────
  {
    key: "alcoholDrinks", dbKey: "alcohol_drinks_per_week",
    label: "How many alcoholic drinks do you consume in a typical week?",
    context: "Above 14 drinks/week, alcohol directly fragments REM sleep architecture and chronically elevates hsCRP.",
    type: "choice",
    options: [
      { value: "0",  label: "None" },
      { value: "3",  label: "1–5" },
      { value: "7",  label: "6–10" },
      { value: "14", label: "11–14" },
      { value: "20", label: "15+" },
    ],
  },
  {
    key: "stressLevel", dbKey: "stress_level",
    label: "How would you describe your current level of chronic stress?",
    context: "Chronic psychological stress elevates cortisol, hsCRP, and resting heart rate — amplifying inflammatory interactions across all scoring panels.",
    type: "choice",
    options: [
      { value: "low",      label: "Low", sub: "Manageable demands" },
      { value: "moderate", label: "Moderate", sub: "Noticeable but coping" },
      { value: "high",     label: "High", sub: "Persistent and disruptive" },
    ],
  },
  // ── Medical History ───────────────────────────────────────────────────────
  {
    key: "smokingStatus", dbKey: "smoking_status",
    label: "What is your current smoking status?",
    context: "Active smoking confers 2.4× hazard ratio for major cardiovascular events, independent of other risk factors (De Oliveira 2010).",
    type: "choice",
    options: [
      { value: "never",   label: "Never smoked" },
      { value: "former",  label: "Former smoker" },
      { value: "current", label: "Current smoker" },
    ],
  },
  {
    key: "hypertensionDx", dbKey: "hypertension_dx",
    label: "Have you been diagnosed with hypertension (high blood pressure)?",
    context: "Hypertension is the leading modifiable risk factor for stroke and the second for coronary artery disease.",
    type: "choice",
    options: [
      { value: "no",  label: "No" },
      { value: "yes", label: "Yes, diagnosed" },
    ],
  },
  {
    key: "onBPMeds", dbKey: "on_bp_meds",
    label: "If hypertensive, are you currently taking antihypertensive medication?",
    context: "Treated hypertension substantially reduces cardiovascular risk and modifies interaction term scoring.",
    type: "choice",
    options: [
      { value: "na",  label: "N/A — not hypertensive" },
      { value: "yes", label: "Yes, on medication" },
      { value: "no",  label: "No, not medicated" },
    ],
  },
  {
    key: "onStatins", dbKey: "on_statins",
    label: "Are you currently taking a statin or other lipid-lowering therapy?",
    context: "Statin use modifies the interpretation of LDL and ApoB values in the blood scoring panel.",
    type: "choice",
    options: [
      { value: "no",  label: "No" },
      { value: "yes", label: "Yes" },
    ],
  },
  {
    key: "familyHistoryCVD", dbKey: "family_history_cvd",
    label: "Has a parent or sibling been diagnosed with heart disease or stroke before age 65?",
    context: "Premature cardiovascular disease in a first-degree relative approximately doubles personal risk, independent of lifestyle factors.",
    type: "choice",
    options: [
      { value: "no",     label: "No" },
      { value: "yes",    label: "Yes" },
      { value: "unsure", label: "Unsure" },
    ],
  },
]

interface Props {
  existing: Record<string, unknown> | null;
}

export function LifestyleForm({ existing }: Props) {
  const router = useRouter();

  const initial: Record<string, string> = {};
  for (const q of QUESTIONS) {
    if (existing && existing[q.dbKey] !== undefined && existing[q.dbKey] !== null) {
      initial[q.key] = String(existing[q.dbKey]);
    } else {
      initial[q.key] = "";
    }
  }

  // New fields: age range, biological sex, and preventive screening
  initial["ageRange"]               = existing?.age_range           != null ? String(existing.age_range)          : "";
  initial["biologicalSex"]          = existing?.biological_sex       != null ? String(existing.biological_sex)     : "";
  initial["cacScored"]              = existing?.cac_scored              === true ? "yes" : "";
  initial["colorectalScreeningDone"] = existing?.colorectal_screening_done === true ? "yes" : "";
  initial["lungCtDone"]             = existing?.lung_ct_done             === true ? "yes" : "";
  initial["mammogramDone"]          = existing?.mammogram_done            === true ? "yes" : "";
  initial["dexaDone"]               = existing?.dexa_done                 === true ? "yes" : "";
  initial["psaDiscussed"]           = existing?.psa_discussed             === true ? "yes" : "";
  initial["cervicalScreeningDone"]  = existing?.cervical_screening_done   === true ? "yes" : "";

  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  }

  const demographicAnswered = [answers["ageRange"], answers["biologicalSex"]].filter(v => v !== "").length;
  const answeredCount = QUESTIONS.filter((q) => answers[q.key] !== "").length + demographicAnswered;
  const totalQuestions = QUESTIONS.length + 2; // +2 for age range and biological sex
  const progressPct = Math.round((answeredCount / totalQuestions) * 100);
  const allAnswered = answeredCount === totalQuestions;

  async function handleSave() {
    setSaving(true);
    setError(null);

    const row: Record<string, unknown> = {};
    const intKeys = new Set([
      "vegetable_servings_per_day",
      "fruit_servings_per_day",
      "processed_food_frequency",
      "sugary_drinks_per_week",
      "alcohol_drinks_per_week",
      "exercise_minutes_per_week",
    ]);
    for (const q of QUESTIONS) {
      if (q.type === "boolean") {
        row[q.dbKey] = answers[q.key] === "true";
      } else if (intKeys.has(q.dbKey)) {
        row[q.dbKey] = answers[q.key] ? parseInt(answers[q.key], 10) : null;
      } else {
        row[q.dbKey] = answers[q.key] || null;
      }
    }

    // Derived fields required by schema
    row["sleep_medication"] = "never";
    row["known_hypertension"] = answers["hypertensionDx"] === "yes";
    row["known_diabetes"] = false;

    // Age range, biological sex, and preventive screening fields
    row["age_range"]                 = answers["ageRange"]               || null;
    row["biological_sex"]            = answers["biologicalSex"]          || null;
    row["cac_scored"]                = answers["cacScored"]              === "yes";
    row["colorectal_screening_done"] = answers["colorectalScreeningDone"] === "yes";
    row["lung_ct_done"]              = answers["lungCtDone"]             === "yes";
    row["mammogram_done"]            = answers["mammogramDone"]          === "yes";
    row["dexa_done"]                 = answers["dexaDone"]               === "yes";
    row["psa_discussed"]             = answers["psaDiscussed"]           === "yes";
    row["cervical_screening_done"]   = answers["cervicalScreeningDone"]  === "yes";

    const res = await fetch("/api/lifestyle/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSaving(false);
      setError(body.error ?? "Save failed — please try again.");
      return;
    }

    await fetch("/api/score/recalculate", { method: "POST" });

    setSaving(false);
    setSaved(true);
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  return (
    <div className="min-h-svh bg-off-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-ink/8 bg-off-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[680px] items-center justify-between px-6">
          <LogoSvg size={22} />
          <Link
            href="/dashboard"
            className="font-body text-xs uppercase tracking-widest text-ink/40 hover:text-ink transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </nav>

      {/* Progress bar */}
      <div className="sticky top-14 z-40 h-[2px] bg-ink/6">
        <div
          className="h-full bg-gold transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <main className="mx-auto max-w-[620px] px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display text-4xl font-light tracking-tight text-ink">
            Health baseline
          </h1>
          <p className="mt-2 font-body text-sm text-ink/50 leading-relaxed">
            Clinical questionnaire used to calibrate your Peaq score. Lifestyle contributes up to{" "}
            <span className="text-ink/70">13 points</span>. Takes about 3 minutes.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-body text-[11px] text-ink/30">
              {answeredCount} of {totalQuestions} answered
            </span>
            <span className="font-body text-[11px] text-gold">
              {progressPct}% complete
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-12">
          {SECTIONS.map((section) => {
            const yesNoOptions = [
              { label: "Yes",      value: "yes"    },
              { label: "No",       value: "no"     },
              { label: "Not sure", value: "unsure" },
            ];

            const sectionQs = section.keys
              .map((k) => QUESTIONS.find((q) => q.key === k))
              .filter(Boolean) as QuestionDef[];
            const sectionAnswered = sectionQs.filter((q) => answers[q.key] !== "").length;
            const sectionComplete = sectionAnswered === sectionQs.length;

            return (
              <div key={section.title}>
                {/* Section header */}
                <div className="mb-6 pb-4 border-b border-ink/8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span
                          className="font-body text-[10px] uppercase tracking-[0.14em]"
                          style={{ color: section.color }}
                        >
                          {section.title}
                        </span>
                        {sectionComplete && (
                          <span
                            className="font-body text-[9px] uppercase tracking-[0.08em] px-2 py-0.5"
                            style={{ background: `${section.color}14`, color: section.color }}
                          >
                            Complete
                          </span>
                        )}
                      </div>
                      <p className="font-body text-xs text-ink/40 leading-relaxed">
                        {section.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 font-body text-[10px] text-ink/25 mt-0.5">
                      {section.ptsLabel}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  {/* Age range and biological sex */}
                  {section.title === "Demographics" && (
                    <>
                      {/* Age range */}
                      <div>
                        <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                          Age range
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {[
                            { label: "Under 30",    value: "18_29"   },
                            { label: "30–39",       value: "30_39"   },
                            { label: "40–49",       value: "40_49"   },
                            { label: "50–59",       value: "50_59"   },
                            { label: "60–69",       value: "60_69"   },
                            { label: "70 or older", value: "70_plus" },
                          ].map((opt) => {
                            const isSelected = answers["ageRange"] === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setAnswer("ageRange", opt.value)}
                                className="flex flex-col items-start transition-all"
                                style={{
                                  padding: "9px 14px",
                                  border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(20,20,16,0.1)",
                                  background: isSelected ? "rgba(184,134,11,0.07)" : "transparent",
                                }}
                              >
                                <span
                                  className="font-body text-xs leading-tight"
                                  style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}
                                >
                                  {opt.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Biological sex */}
                      <div>
                        <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                          Biological sex
                        </p>
                        <p className="font-body text-[11px] text-ink/35 leading-relaxed mb-3 italic">
                          Used only for age-appropriate screening recommendations. Not stored with your identity.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {[
                            { label: "Male",                value: "male"              },
                            { label: "Female",              value: "female"            },
                            { label: "Non-binary",          value: "non_binary"        },
                            { label: "Prefer not to answer", value: "prefer_not_to_say" },
                          ].map((opt) => {
                            const isSelected = answers["biologicalSex"] === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setAnswer("biologicalSex", opt.value)}
                                className="flex flex-col items-start transition-all"
                                style={{
                                  padding: "9px 14px",
                                  border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(20,20,16,0.1)",
                                  background: isSelected ? "rgba(184,134,11,0.07)" : "transparent",
                                }}
                              >
                                <span
                                  className="font-body text-xs leading-tight"
                                  style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}
                                >
                                  {opt.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {sectionQs.map((q) => (
                    <div key={q.key}>
                      {/* Optional group intro — appears above the first question of a subgroup */}
                      {q.introBefore && (
                        <p className="font-body text-xs text-ink/45 leading-relaxed mb-5 italic">
                          {q.introBefore}
                        </p>
                      )}
                      {/* Question text */}
                      <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                        {q.label}
                      </p>
                      {/* Clinical context */}
                      {q.context && (
                        <p className="font-body text-[11px] text-ink/35 leading-relaxed mb-3 italic">
                          {q.context}
                        </p>
                      )}
                      {/* Options */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {q.options.map((opt) => {
                          const isSelected = answers[q.key] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setAnswer(q.key, opt.value)}
                              className="flex flex-col items-start transition-all"
                              style={{
                                padding: opt.sub ? "10px 14px 9px" : "9px 14px",
                                border: isSelected
                                  ? "1px solid var(--gold)"
                                  : "1px solid rgba(20,20,16,0.1)",
                                background: isSelected
                                  ? "rgba(184,134,11,0.07)"
                                  : "transparent",
                              }}
                            >
                              <span
                                className="font-body text-xs leading-tight"
                                style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}
                              >
                                {opt.label}
                              </span>
                              {opt.sub && (
                                <span
                                  className="font-body text-[10px] leading-tight mt-0.5"
                                  style={{ color: isSelected ? "var(--gold)" : "rgba(20,20,16,0.28)" }}
                                >
                                  {opt.sub}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Conditional preventive screening questions — Medical History only */}
                  {section.title === "Medical History" && (
                    <>
                      {/* CAC — ACC/AHA 2019: 40–75 */}
                      {(answers["ageRange"] === "40_49" || answers["ageRange"] === "50_59" || answers["ageRange"] === "60_69") && (
                        <div>
                          <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                            Have you had a coronary artery calcium (CAC) score?
                          </p>
                          <p className="font-body text-[11px] text-ink/35 leading-relaxed mb-3 italic">
                            Consider asking your doctor whether CAC scoring is appropriate for you. A score of 0 may support a conversation about delaying statin therapy (ACC/AHA 2019).
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {yesNoOptions.map((opt) => {
                              const isSelected = answers["cacScored"] === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setAnswer("cacScored", opt.value)}
                                  className="flex flex-col items-start transition-all"
                                  style={{
                                    padding: "9px 14px",
                                    border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(20,20,16,0.1)",
                                    background: isSelected ? "rgba(184,134,11,0.07)" : "transparent",
                                  }}
                                >
                                  <span className="font-body text-xs leading-tight" style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}>
                                    {opt.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Colorectal — USPSTF 2021: shown from 45 (40_49 band) */}
                      {(answers["ageRange"] === "40_49" || answers["ageRange"] === "50_59" || answers["ageRange"] === "60_69" || answers["ageRange"] === "70_plus") && (
                        <div>
                          <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                            Are you up to date on colorectal screening?
                          </p>
                          <p className="font-body text-[11px] text-ink/35 leading-relaxed mb-3 italic">
                            Consider discussing screening options (colonoscopy, Cologuard, or FIT) with your doctor. USPSTF recommends considering screening starting at age 45.
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {yesNoOptions.map((opt) => {
                              const isSelected = answers["colorectalScreeningDone"] === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setAnswer("colorectalScreeningDone", opt.value)}
                                  className="flex flex-col items-start transition-all"
                                  style={{
                                    padding: "9px 14px",
                                    border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(20,20,16,0.1)",
                                    background: isSelected ? "rgba(184,134,11,0.07)" : "transparent",
                                  }}
                                >
                                  <span className="font-body text-xs leading-tight" style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}>
                                    {opt.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Lung CT — USPSTF: 50–80, smoking history */}
                      {(answers["ageRange"] === "50_59" || answers["ageRange"] === "60_69" || answers["ageRange"] === "70_plus") &&
                       (answers["smokingStatus"] === "current" || answers["smokingStatus"] === "former") && (
                        <div>
                          <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                            Have you discussed annual lung CT screening with your doctor?
                          </p>
                          <p className="font-body text-[11px] text-ink/35 leading-relaxed mb-3 italic">
                            Consider asking your doctor about low-dose CT lung screening if you have a significant smoking history (USPSTF).
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {yesNoOptions.map((opt) => {
                              const isSelected = answers["lungCtDone"] === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setAnswer("lungCtDone", opt.value)}
                                  className="flex flex-col items-start transition-all"
                                  style={{
                                    padding: "9px 14px",
                                    border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(20,20,16,0.1)",
                                    background: isSelected ? "rgba(184,134,11,0.07)" : "transparent",
                                  }}
                                >
                                  <span className="font-body text-xs leading-tight" style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}>
                                    {opt.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Mammogram — USPSTF 2024: females 40+ */}
                      {answers["biologicalSex"] === "female" &&
                       (answers["ageRange"] === "40_49" || answers["ageRange"] === "50_59" || answers["ageRange"] === "60_69" || answers["ageRange"] === "70_plus") && (
                        <div>
                          <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                            Are you up to date on mammography?
                          </p>
                          <p className="font-body text-[11px] text-ink/35 leading-relaxed mb-3 italic">
                            Consider discussing mammogram frequency with your doctor. USPSTF (2024) recommends considering biennial screening starting at 40.
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {yesNoOptions.map((opt) => {
                              const isSelected = answers["mammogramDone"] === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setAnswer("mammogramDone", opt.value)}
                                  className="flex flex-col items-start transition-all"
                                  style={{
                                    padding: "9px 14px",
                                    border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(20,20,16,0.1)",
                                    background: isSelected ? "rgba(184,134,11,0.07)" : "transparent",
                                  }}
                                >
                                  <span className="font-body text-xs leading-tight" style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}>
                                    {opt.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Cervical — USPSTF: females 25–65 */}
                      {answers["biologicalSex"] === "female" &&
                       (answers["ageRange"] === "30_39" || answers["ageRange"] === "40_49" || answers["ageRange"] === "50_59" || answers["ageRange"] === "60_69") && (
                        <div>
                          <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                            Are you current on cervical screening (Pap / HPV)?
                          </p>
                          <p className="font-body text-[11px] text-ink/35 leading-relaxed mb-3 italic">
                            Consider discussing Pap smear or HPV testing schedules with your doctor (USPSTF).
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {yesNoOptions.map((opt) => {
                              const isSelected = answers["cervicalScreeningDone"] === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setAnswer("cervicalScreeningDone", opt.value)}
                                  className="flex flex-col items-start transition-all"
                                  style={{
                                    padding: "9px 14px",
                                    border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(20,20,16,0.1)",
                                    background: isSelected ? "rgba(184,134,11,0.07)" : "transparent",
                                  }}
                                >
                                  <span className="font-body text-xs leading-tight" style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}>
                                    {opt.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* DEXA — USPSTF Grade B: females 65+ */}
                      {answers["biologicalSex"] === "female" &&
                       (answers["ageRange"] === "60_69" || answers["ageRange"] === "70_plus") && (
                        <div>
                          <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                            Have you had a bone density (DEXA) scan?
                          </p>
                          <p className="font-body text-[11px] text-ink/35 leading-relaxed mb-3 italic">
                            Consider asking your doctor about bone density screening. USPSTF recommends considering it for women 65 and older.
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {yesNoOptions.map((opt) => {
                              const isSelected = answers["dexaDone"] === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setAnswer("dexaDone", opt.value)}
                                  className="flex flex-col items-start transition-all"
                                  style={{
                                    padding: "9px 14px",
                                    border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(20,20,16,0.1)",
                                    background: isSelected ? "rgba(184,134,11,0.07)" : "transparent",
                                  }}
                                >
                                  <span className="font-body text-xs leading-tight" style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}>
                                    {opt.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* PSA — USPSTF Grade C: males 55–69 */}
                      {answers["biologicalSex"] === "male" &&
                       (answers["ageRange"] === "50_59" || answers["ageRange"] === "60_69") && (
                        <div>
                          <p className="font-display text-[17px] font-light leading-snug text-ink mb-1">
                            Have you discussed PSA screening with your doctor?
                          </p>
                          <p className="font-body text-[11px] text-ink/35 leading-relaxed mb-3 italic">
                            PSA screening is an individualized decision. Consider discussing the potential benefits and limitations with your doctor (USPSTF Grade C).
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {yesNoOptions.map((opt) => {
                              const isSelected = answers["psaDiscussed"] === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => setAnswer("psaDiscussed", opt.value)}
                                  className="flex flex-col items-start transition-all"
                                  style={{
                                    padding: "9px 14px",
                                    border: isSelected ? "1px solid var(--gold)" : "1px solid rgba(20,20,16,0.1)",
                                    background: isSelected ? "rgba(184,134,11,0.07)" : "transparent",
                                  }}
                                >
                                  <span className="font-body text-xs leading-tight" style={{ color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.5)" }}>
                                    {opt.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save */}
        <div className="mt-12 flex flex-col gap-3">
          {error && (
            <p className="font-body text-xs text-red-500 text-center">{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={!allAnswered || saving}
            className="h-12 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                       text-off-white transition-colors hover:bg-gold disabled:opacity-30"
          >
            {saving ? "Saving…" : saved ? "Score updated ✓" : "Save & recalculate score"}
          </button>
          {!allAnswered && (
            <p className="font-body text-xs text-ink/30 text-center">
              {totalQuestions - answeredCount} question{totalQuestions - answeredCount !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

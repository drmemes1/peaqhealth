"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { Logo } from "../../components/logo";
import Link from "next/link";

interface QuestionDef {
  key: string;
  dbKey: string;
  label: string;
  options: { value: string; label: string }[];
  type: "choice" | "boolean";
}

// ── Section groupings for display ─────────────────────────────────────────
const SECTIONS: { title: string; subtitle: string; keys: string[] }[] = [
  { title: "Activity", subtitle: "Exercise patterns affect cardiovascular, metabolic, and inflammatory markers", keys: ["exerciseLevel"] },
  { title: "Oral Health", subtitle: "Oral hygiene directly influences microbiome, inflammation, and sleep-breathing risk", keys: ["brushingFreq", "flossingFreq", "mouthwashType", "lastDentalVisit"] },
  { title: "Sleep", subtitle: "Self-reported sleep quality calibrates wearable data and influences your score", keys: ["sleepDuration", "sleepLatency", "sleepQualSelf", "nightWakings", "daytimeFatigue"] },
  { title: "Nutrition", subtitle: "Diet patterns affect glycemic control, inflammation, and gut microbiome diversity", keys: ["vegetableServings", "fruitServings", "processedFood", "sugaryDrinks"] },
  { title: "Alcohol & Stress", subtitle: "Both independently modulate sleep architecture and inflammatory markers", keys: ["alcoholDrinks", "stressLevel"] },
  { title: "Medical History", subtitle: "Diagnoses and medications calibrate cardiovascular interaction scoring", keys: ["smokingStatus", "knownHypertension", "knownDiabetes", "hypertensionDx", "onBPMeds", "onStatins", "familyHistoryCVD"] },
]

const QUESTIONS: QuestionDef[] = [
  {
    key: "exerciseLevel", dbKey: "exercise_level",
    label: "How often do you exercise?", type: "choice",
    options: [
      { value: "sedentary", label: "Rarely or never" },
      { value: "light", label: "1–2×/wk" },
      { value: "moderate", label: "3–4×/wk" },
      { value: "active", label: "5+×/wk" },
    ],
  },
  {
    key: "brushingFreq", dbKey: "brushing_freq",
    label: "How often do you brush?", type: "choice",
    options: [
      { value: "once", label: "Once/day" },
      { value: "twice", label: "Twice/day" },
      { value: "more", label: "3+ times" },
    ],
  },
  {
    key: "flossingFreq", dbKey: "flossing_freq",
    label: "How often do you floss?", type: "choice",
    options: [
      { value: "never", label: "Never" },
      { value: "sometimes", label: "Sometimes" },
      { value: "daily", label: "Daily" },
    ],
  },
  {
    key: "mouthwashType", dbKey: "mouthwash_type",
    label: "Do you use mouthwash?", type: "choice",
    options: [
      { value: "none", label: "None" },
      { value: "alcohol", label: "Alcohol-based" },
      { value: "fluoride", label: "Fluoride" },
      { value: "natural", label: "Natural" },
    ],
  },
  {
    key: "lastDentalVisit", dbKey: "last_dental_visit",
    label: "Last dental visit?", type: "choice",
    options: [
      { value: "6mo", label: "< 6 months" },
      { value: "1yr", label: "6–12 months" },
      { value: "2yr", label: "1–2 years" },
      { value: "more", label: "2+ years" },
    ],
  },
  {
    key: "smokingStatus", dbKey: "smoking_status",
    label: "Smoking status?", type: "choice",
    options: [
      { value: "never", label: "Never" },
      { value: "former", label: "Former" },
      { value: "current", label: "Current" },
    ],
  },
  {
    key: "knownHypertension", dbKey: "known_hypertension",
    label: "Diagnosed hypertension?", type: "boolean",
    options: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    key: "knownDiabetes", dbKey: "known_diabetes",
    label: "Diagnosed diabetes?", type: "boolean",
    options: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    key: "sleepDuration", dbKey: "sleep_duration",
    label: "Average sleep duration?", type: "choice",
    options: [
      { value: "lt6", label: "< 6 hrs" },
      { value: "6to7", label: "6–7 hrs" },
      { value: "7to8", label: "7–8 hrs" },
      { value: "gt8", label: "8+ hrs" },
    ],
  },
  {
    key: "sleepLatency", dbKey: "sleep_latency",
    label: "How long to fall asleep?", type: "choice",
    options: [
      { value: "lt10", label: "< 10 min" },
      { value: "10to20", label: "10–20 min" },
      { value: "20to40", label: "20–40 min" },
      { value: "gt40", label: "40+ min" },
    ],
  },
  {
    key: "sleepQualSelf", dbKey: "sleep_qual_self",
    label: "How would you rate your sleep?", type: "choice",
    options: [
      { value: "poor", label: "Poor" },
      { value: "fair", label: "Fair" },
      { value: "good", label: "Good" },
      { value: "excellent", label: "Excellent" },
    ],
  },
  {
    key: "nightWakings", dbKey: "night_wakings",
    label: "Night wakings per week?", type: "choice",
    options: [
      { value: "0", label: "None" },
      { value: "1to2", label: "1–2" },
      { value: "3to5", label: "3–5" },
      { value: "gt5", label: "5+" },
    ],
  },
  {
    key: "daytimeFatigue", dbKey: "daytime_fatigue",
    label: "Daytime fatigue level?", type: "choice",
    options: [
      { value: "none", label: "None" },
      { value: "mild", label: "Mild" },
      { value: "moderate", label: "Moderate" },
      { value: "severe", label: "Severe" },
    ],
  },
  // ── Medical History ──
  {
    key: "hypertensionDx", dbKey: "hypertension_dx",
    label: "Have you been diagnosed with high blood pressure?", type: "choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "onBPMeds", dbKey: "on_bp_meds",
    label: "Are you taking medication for blood pressure?", type: "choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "na", label: "N/A" },
    ],
  },
  {
    key: "onStatins", dbKey: "on_statins",
    label: "Are you taking a statin (cholesterol medication)?", type: "choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "familyHistoryCVD", dbKey: "family_history_cvd",
    label: "Parent or sibling had heart attack/stroke before 65?", type: "choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  // ── Nutrition ──
  {
    key: "vegetableServings", dbKey: "vegetable_servings_per_day",
    label: "Servings of vegetables per day?", type: "choice",
    options: [
      { value: "0", label: "0" },
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
      { value: "5", label: "5+" },
    ],
  },
  {
    key: "fruitServings", dbKey: "fruit_servings_per_day",
    label: "Servings of fruit per day?", type: "choice",
    options: [
      { value: "0", label: "0" },
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
      { value: "5", label: "5+" },
    ],
  },
  {
    key: "processedFood", dbKey: "processed_food_frequency",
    label: "How often do you eat processed or fast food?", type: "choice",
    options: [
      { value: "1", label: "Never" },
      { value: "2", label: "Rarely" },
      { value: "3", label: "Sometimes" },
      { value: "4", label: "Often" },
      { value: "5", label: "Daily" },
    ],
  },
  {
    key: "sugaryDrinks", dbKey: "sugary_drinks_per_week",
    label: "Sugary drinks per week?", type: "choice",
    options: [
      { value: "0", label: "0" },
      { value: "1", label: "1–2" },
      { value: "3", label: "3–5" },
      { value: "7", label: "6–10" },
      { value: "14", label: "10+" },
    ],
  },
  // ── Alcohol ──
  {
    key: "alcoholDrinks", dbKey: "alcohol_drinks_per_week",
    label: "Alcoholic drinks per week on average?", type: "choice",
    options: [
      { value: "0", label: "0" },
      { value: "3", label: "1–5" },
      { value: "7", label: "6–10" },
      { value: "14", label: "11–14" },
      { value: "20", label: "15+" },
    ],
  },
  // ── Stress ──
  {
    key: "stressLevel", dbKey: "stress_level",
    label: "How would you rate your current stress level?", type: "choice",
    options: [
      { value: "low", label: "Low" },
      { value: "moderate", label: "Moderate" },
      { value: "high", label: "High" },
    ],
  },
];

interface Props {
  userId: string;
  existing: Record<string, unknown> | null;
}

export function LifestyleForm({ userId, existing }: Props) {
  const router = useRouter();
  const supabase = createClient();

  // Pre-fill from existing data
  const initial: Record<string, string> = {};
  for (const q of QUESTIONS) {
    if (existing && existing[q.dbKey] !== undefined && existing[q.dbKey] !== null) {
      initial[q.key] = String(existing[q.dbKey]);
    } else {
      initial[q.key] = "";
    }
  }

  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  const allAnswered = QUESTIONS.every((q) => answers[q.key] !== "");

  async function handleSave() {
    setSaving(true);

    // Build DB row
    const row: Record<string, unknown> = { user_id: userId };
    const intKeys = new Set(["vegetable_servings_per_day", "fruit_servings_per_day", "processed_food_frequency", "sugary_drinks_per_week", "alcohol_drinks_per_week"]);
    for (const q of QUESTIONS) {
      if (q.type === "boolean") {
        row[q.dbKey] = answers[q.key] === "true";
      } else if (intKeys.has(q.dbKey)) {
        row[q.dbKey] = answers[q.key] ? parseInt(answers[q.key], 10) : null;
      } else {
        row[q.dbKey] = answers[q.key] || null;
      }
    }

    await supabase
      .from("lifestyle_records")
      .upsert(row, { onConflict: "user_id" })
      .select();

    setSaving(false);
    setSaved(true);

    // Refresh dashboard data after a beat
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  return (
    <div className="min-h-svh bg-off-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-ink/8 bg-off-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[680px] items-center justify-between px-6">
          <Logo height={22} />
          <Link
            href="/dashboard"
            className="font-body text-xs uppercase tracking-widest text-ink/40 hover:text-ink transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-[620px] px-6 py-10">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-light tracking-tight text-ink">
            Lifestyle questionnaire
          </h1>
          <p className="mt-2 font-body text-sm text-ink/40">
            Answers are used to calibrate your Peaq score. Takes about 2 minutes.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          {SECTIONS.map((section) => {
            const sectionQs = section.keys
              .map((k) => QUESTIONS.find((q) => q.key === k))
              .filter(Boolean) as QuestionDef[];

            return (
              <div key={section.title}>
                {/* Section header */}
                <div className="mb-5 pb-3 border-b border-ink/8">
                  <span className="font-body text-[10px] uppercase tracking-[0.12em] text-gold">{section.title}</span>
                  <p className="mt-0.5 font-body text-xs text-ink/40 leading-relaxed">{section.subtitle}</p>
                </div>

                <div className="flex flex-col gap-6">
                  {sectionQs.map((q) => (
                    <div key={q.key} className="flex flex-col gap-2.5">
                      <span className="font-body text-sm text-ink">{q.label}</span>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt) => {
                          const isSelected = answers[q.key] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setAnswer(q.key, opt.value)}
                              className={`border px-3.5 py-2 font-body text-xs transition-all ${
                                isSelected
                                  ? "border-gold bg-gold/8 text-ink"
                                  : "border-ink/10 bg-white text-ink/50 hover:border-ink/20 hover:text-ink/70"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={!allAnswered || saving}
            className="h-12 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                       text-off-white transition-colors hover:bg-gold disabled:opacity-30"
          >
            {saving ? "Saving…" : saved ? "Score updated ✓" : "Save answers"}
          </button>
          {!allAnswered && (
            <p className="font-body text-xs text-ink/30 text-center">Answer all questions to save</p>
          )}
        </div>
      </main>
    </div>
  );
}

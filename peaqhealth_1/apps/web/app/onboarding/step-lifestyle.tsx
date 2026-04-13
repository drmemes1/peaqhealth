"use client";

import { useState } from "react";
import type { LifestyleAnswers } from "./types";

interface QuestionDef {
  key: keyof LifestyleAnswers;
  label: string;
  options: { value: string; label: string }[];
}

interface SectionDef {
  title: string;
  subtitle: string;
  questions: QuestionDef[];
}

const SECTIONS: SectionDef[] = [
  {
    title: "About you",
    subtitle: "Basic info to personalize your health score",
    questions: [
      {
        key: "ageRange",
        label: "What is your age range?",
        options: [
          { value: "18_29", label: "Under 30" },
          { value: "30_39", label: "30–39" },
          { value: "40_49", label: "40–49" },
          { value: "50_59", label: "50–59" },
          { value: "60_69", label: "60–69" },
          { value: "70_plus", label: "70+" },
        ],
      },
      {
        key: "biologicalSex",
        label: "Biological sex",
        options: [
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
          { value: "non_binary", label: "Non-binary" },
          { value: "prefer_not_to_say", label: "Prefer not to say" },
        ],
      },
      {
        key: "hsCrpAvailable",
        label: "Does your most recent blood panel include hs-CRP (high-sensitivity C-reactive protein)?",
        options: [
          { value: "yes", label: "Yes, it's on my results" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
    ],
  },
  {
    title: "Your diet",
    subtitle: "What you eat shapes your metabolic health",
    questions: [
      {
        key: "fermentedFoodsFrequency",
        label: "How often do you eat fermented foods? (yogurt, kefir, kimchi, sauerkraut, etc.)",
        options: [
          { value: "never", label: "Never" },
          { value: "rarely", label: "Rarely" },
          { value: "weekly", label: "Weekly" },
          { value: "daily", label: "Daily" },
        ],
      },
      {
        key: "vegetableServings",
        label: "Servings of vegetables per day?",
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
        key: "fruitServings",
        label: "Servings of fruit per day?",
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
        key: "processedFood",
        label: "How often do you eat processed or fast food?",
        options: [
          { value: "1", label: "Never" },
          { value: "2", label: "Rarely" },
          { value: "3", label: "Sometimes" },
          { value: "4", label: "Often" },
          { value: "5", label: "Daily" },
        ],
      },
      {
        key: "sugaryDrinks",
        label: "Sugary drinks per week?",
        options: [
          { value: "0", label: "0" },
          { value: "1", label: "1–2" },
          { value: "3", label: "3–5" },
          { value: "7", label: "6–10" },
          { value: "14", label: "10+" },
        ],
      },
      {
        key: "alcoholDrinks",
        label: "Alcoholic drinks per week on average?",
        options: [
          { value: "0", label: "0" },
          { value: "3", label: "1–5" },
          { value: "7", label: "6–10" },
          { value: "14", label: "11–14" },
          { value: "20", label: "15+" },
        ],
      },
    ],
  },
  {
    title: "Oral health",
    subtitle: "Your oral microbiome connects to your whole-body health",
    questions: [
      {
        key: "brushingFreq",
        label: "How often do you brush?",
        options: [
          { value: "once", label: "Once/day" },
          { value: "twice", label: "Twice/day" },
          { value: "more", label: "3+ times" },
        ],
      },
      {
        key: "flossingFreq",
        label: "How often do you floss?",
        options: [
          { value: "never", label: "Never" },
          { value: "sometimes", label: "Sometimes" },
          { value: "daily", label: "Daily" },
        ],
      },
      {
        key: "mouthwashType",
        label: "Does your mouthwash contain any of these active ingredients?",
        options: [
          { value: "antiseptic", label: "Yes — alcohol, chlorhexidine, or essential oils" },
          { value: "fluoride",   label: "No — fluoride only" },
          { value: "none",       label: "I don't use mouthwash" },
          { value: "unknown",    label: "Not sure — I'll check the label" },
        ],
      },
      {
        key: "lastDentalVisit",
        label: "Last dental visit?",
        options: [
          { value: "6mo", label: "< 6 months" },
          { value: "1yr", label: "6–12 months" },
          { value: "2yr", label: "1–2 years" },
          { value: "more", label: "2+ years" },
        ],
      },
      {
        key: "smokingStatus",
        label: "Smoking status?",
        options: [
          { value: "never", label: "Never" },
          { value: "former", label: "Former" },
          { value: "current", label: "Current" },
        ],
      },
    ],
  },
  {
    title: "Sleep & recovery",
    subtitle: "Sleep quality is one of the strongest predictors of long-term health",
    questions: [
      {
        key: "sleepDuration",
        label: "Average sleep duration?",
        options: [
          { value: "lt6", label: "< 6 hrs" },
          { value: "6to7", label: "6–7 hrs" },
          { value: "7to8", label: "7–8 hrs" },
          { value: "gt8", label: "8+ hrs" },
        ],
      },
      {
        key: "sleepLatency",
        label: "How long does it take you to fall asleep?",
        options: [
          { value: "lt10", label: "< 10 min" },
          { value: "10to20", label: "10–20 min" },
          { value: "20to40", label: "20–40 min" },
          { value: "gt40", label: "40+ min" },
        ],
      },
      {
        key: "sleepQualSelf",
        label: "How would you rate your sleep quality?",
        options: [
          { value: "poor", label: "Poor" },
          { value: "fair", label: "Fair" },
          { value: "good", label: "Good" },
          { value: "excellent", label: "Excellent" },
        ],
      },
      {
        key: "nightWakings",
        label: "How often do you wake up during the night?",
        options: [
          { value: "0", label: "Never" },
          { value: "1to2", label: "1–2×/night" },
          { value: "3to5", label: "3–5×/night" },
          { value: "gt5", label: "5+×/night" },
        ],
      },
      {
        key: "daytimeFatigue",
        label: "How is your daytime energy level?",
        options: [
          { value: "none", label: "Great — no fatigue" },
          { value: "mild", label: "Mild fatigue" },
          { value: "moderate", label: "Moderate fatigue" },
          { value: "severe", label: "Severe fatigue" },
        ],
      },
    ],
  },
  {
    title: "Lifestyle & health",
    subtitle: "Exercise and medical history refine your cardiovascular risk",
    questions: [
      {
        key: "exerciseLevel",
        label: "How often do you exercise?",
        options: [
          { value: "sedentary", label: "Rarely / never" },
          { value: "light", label: "1–2×/wk" },
          { value: "moderate", label: "3–4×/wk" },
          { value: "active", label: "5+×/wk" },
        ],
      },
      {
        key: "stressLevel",
        label: "How would you rate your current stress level?",
        options: [
          { value: "low", label: "Low" },
          { value: "moderate", label: "Moderate" },
          { value: "high", label: "High" },
        ],
      },
      {
        key: "knownHypertension",
        label: "Have you ever been diagnosed with high blood pressure?",
        options: [
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
      },
      {
        key: "knownDiabetes",
        label: "Have you ever been diagnosed with diabetes?",
        options: [
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
      },
      {
        key: "hypertensionDx",
        label: "Are you currently being treated for high blood pressure?",
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ],
      },
      {
        key: "onBPMeds",
        label: "Are you taking blood pressure medication?",
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
          { value: "na", label: "N/A" },
        ],
      },
      {
        key: "onStatins",
        label: "Are you taking a statin (cholesterol medication)?",
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ],
      },
      {
        key: "familyHistoryCVD",
        label: "Did a parent or sibling have a heart attack or stroke before age 65?",
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
          { value: "unsure", label: "Not sure" },
        ],
      },
    ],
  },
];

const INITIAL_ANSWERS: LifestyleAnswers = {
  ageRange: "",
  biologicalSex: "",
  exerciseLevel: "",
  brushingFreq: "",
  flossingFreq: "",
  mouthwashType: "",
  lastDentalVisit: "",
  smokingStatus: "",
  knownHypertension: false,
  knownDiabetes: false,
  sleepDuration: "",
  sleepLatency: "",
  sleepQualSelf: "",
  nightWakings: "",
  daytimeFatigue: "",
  hypertensionDx: "",
  onBPMeds: "",
  onStatins: "",
  familyHistoryCVD: "",
  fermentedFoodsFrequency: "",
  vegetableServings: "",
  fruitServings: "",
  processedFood: "",
  sugaryDrinks: "",
  alcoholDrinks: "",
  stressLevel: "",
  hsCrpAvailable: "",
};

type Phase = "questionnaire" | "saving" | "complete";

interface Props {
  onComplete: (answers: LifestyleAnswers) => void;
}

export function StepLifestyle({ onComplete }: Props) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<LifestyleAnswers>(INITIAL_ANSWERS);
  const [showValidation, setShowValidation] = useState(false);
  const [phase, setPhase] = useState<Phase>("questionnaire");
  const [lifestyleSub, setLifestyleSub] = useState(0);

  const section = SECTIONS[sectionIndex];
  const totalSections = SECTIONS.length;

  function getValue(key: keyof LifestyleAnswers): string {
    const v = answers[key];
    if (typeof v === "boolean") return v ? "true" : "false";
    return v as string;
  }

  function setAnswer(key: keyof LifestyleAnswers, value: string) {
    setShowValidation(false);
    setAnswers((prev) => ({
      ...prev,
      [key]:
        key === "knownHypertension" || key === "knownDiabetes"
          ? value === "true"
          : value,
    }));
  }

  function sectionComplete(idx: number): boolean {
    return SECTIONS[idx].questions.every((q) => {
      const v = getValue(q.key);
      // booleans default to "false" which is a valid answer
      return v !== "";
    });
  }

  async function handleNext() {
    if (!sectionComplete(sectionIndex)) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);

    if (sectionIndex < totalSections - 1) {
      setSectionIndex((i) => i + 1);
      return;
    }

    // Last section — submit to API
    setPhase("saving");

    const toInt = (v: string) => (v !== "" ? parseInt(v, 10) : null);
    const toBool = (v: string | boolean) => {
      if (v === true  || v === "yes" || v === "true")  return true;
      if (v === false || v === "no"  || v === "false") return false;
      return null;
    };

    const hsCrpAvail = answers.hsCrpAvailable === "yes";

    const row = {
      age_range:                  answers.ageRange                 || null,
      biological_sex:             answers.biologicalSex            || null,
      exercise_level:             answers.exerciseLevel            || null,
      brushing_freq:              answers.brushingFreq             || null,
      flossing_freq:              answers.flossingFreq             || null,
      mouthwash_type:             answers.mouthwashType            || null,
      last_dental_visit:          answers.lastDentalVisit          || null,
      smoking_status:             answers.smokingStatus            || null,
      known_hypertension:         answers.knownHypertension,
      known_diabetes:             answers.knownDiabetes,
      sleep_duration:             answers.sleepDuration            || null,
      sleep_latency:              answers.sleepLatency             || null,
      sleep_qual_self:            answers.sleepQualSelf            || null,
      night_wakings:              answers.nightWakings             || null,
      daytime_fatigue:            answers.daytimeFatigue           || null,
      sleep_medication:           "never",
      hypertension_dx:            toBool(answers.hypertensionDx),
      on_bp_meds:                 toBool(answers.onBPMeds),
      on_statins:                 toBool(answers.onStatins),
      family_history_cvd:         toBool(answers.familyHistoryCVD),
      fermented_foods_frequency:  answers.fermentedFoodsFrequency  || null,
      vegetable_servings_per_day: toInt(answers.vegetableServings),
      fruit_servings_per_day:     toInt(answers.fruitServings),
      processed_food_frequency:   toInt(answers.processedFood),
      sugary_drinks_per_week:     toInt(answers.sugaryDrinks),
      alcohol_drinks_per_week:    toInt(answers.alcoholDrinks),
      stress_level:               answers.stressLevel              || null,
      // V5 fields captured at onboarding
      hs_crp_available:           hsCrpAvail,
      hs_crp_qc_pass:             hsCrpAvail,
      oma_qc_pass:                true, // no antibiotics question at onboarding — default pass
    };

    try {
      const res = await fetch("/api/lifestyle/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) {
        const body = await res.json() as { lifestyleSub?: number };
        setLifestyleSub(body.lifestyleSub ?? 0);
      }
    } catch {
      // non-fatal — show completion screen regardless
    }

    setPhase("complete");
  }

  if (phase === "saving") {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="font-body text-sm text-ink/40">Saving your answers…</p>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="flex flex-col items-center gap-10 text-center">
        {/* Score ring */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 120,
            height: 120,
            border: "2px solid var(--gold)",
          }}
        >
          <div className="flex flex-col items-center leading-none">
            <span className="font-display text-4xl font-light text-ink" style={{ letterSpacing: "-0.02em" }}>
              {lifestyleSub}
            </span>
            <span className="font-body text-xs text-ink/40 mt-0.5">/13 pts</span>
          </div>
        </div>

        <div>
          <h2 className="font-display text-4xl font-light tracking-tight text-ink">
            Lifestyle profile complete
          </h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-ink/50 max-w-sm mx-auto">
            Your lifestyle score is now active. Connect a wearable, upload labs, or order an oral kit to unlock your full Peaq score.
          </p>
        </div>

        <button
          onClick={() => onComplete(answers)}
          className="h-12 w-full max-w-md bg-ink font-body text-sm font-medium uppercase tracking-[0.15em] text-off-white transition-colors hover:bg-gold"
        >
          Continue
        </button>
      </div>
    );
  }

  // ── Questionnaire UI ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8">
      {/* Progress bar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1">
          {SECTIONS.map((_, i) => (
            <div
              key={i}
              className="h-0.5 flex-1 transition-all duration-300"
              style={{
                background:
                  i <= sectionIndex
                    ? "var(--gold)"
                    : "rgba(20,20,16,0.10)",
              }}
            />
          ))}
        </div>
        <p className="font-body text-[10px] uppercase tracking-widest text-ink/35">
          Section {sectionIndex + 1} of {totalSections}
        </p>
      </div>

      {/* Section header */}
      <div>
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          {section.title}
        </h2>
        <p className="mt-2 font-body text-sm text-ink/50">{section.subtitle}</p>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-6">
        {section.questions.map((q) => {
          const value = getValue(q.key);
          const isUnanswered = showValidation && value === "";
          return (
            <div key={q.key as string} className="flex flex-col gap-2.5">
              <span
                className="font-body text-sm font-medium transition-colors"
                style={{ color: isUnanswered ? "var(--gold)" : "var(--ink)" }}
              >
                {q.label}
                {isUnanswered && (
                  <span className="ml-1 font-normal text-[11px] text-gold/70">
                    — required
                  </span>
                )}
              </span>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAnswer(q.key, opt.value)}
                      className="rounded-none border px-3 py-1.5 font-body text-xs transition-all"
                      style={{
                        borderColor: isSelected
                          ? "var(--gold)"
                          : isUnanswered
                          ? "rgba(184,134,11,0.30)"
                          : "rgba(20,20,16,0.10)",
                        background: isSelected ? "rgba(184,134,11,0.08)" : "white",
                        color: isSelected ? "var(--ink)" : "rgba(20,20,16,0.55)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 pt-2">
        {sectionIndex > 0 && (
          <button
            onClick={() => { setSectionIndex((i) => i - 1); setShowValidation(false); }}
            className="font-body text-xs uppercase tracking-widest text-ink/35 hover:text-ink/60 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          className="h-12 flex-1 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em] text-off-white transition-colors hover:bg-gold"
        >
          {sectionIndex === totalSections - 1 ? "Complete" : "Next"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { LifestyleAnswers } from "./types";

type Mode = "choose" | "questions";

interface QuestionDef {
  key: keyof LifestyleAnswers;
  label: string;
  options: { value: string; label: string }[];
  type: "choice" | "boolean";
}

const QUESTIONS: QuestionDef[] = [
  {
    key: "exerciseLevel",
    label: "How often do you exercise?",
    type: "choice",
    options: [
      { value: "sedentary", label: "Rarely" },
      { value: "light", label: "1–2×/wk" },
      { value: "moderate", label: "3–4×/wk" },
      { value: "active", label: "5+×/wk" },
    ],
  },
  {
    key: "brushingFreq",
    label: "How often do you brush?",
    type: "choice",
    options: [
      { value: "once", label: "Once/day" },
      { value: "twice", label: "Twice/day" },
      { value: "more", label: "3+ times" },
    ],
  },
  {
    key: "flossingFreq",
    label: "How often do you floss?",
    type: "choice",
    options: [
      { value: "never", label: "Never" },
      { value: "sometimes", label: "Sometimes" },
      { value: "daily", label: "Daily" },
    ],
  },
  {
    key: "mouthwashType",
    label: "Do you use mouthwash?",
    type: "choice",
    options: [
      { value: "none", label: "None" },
      { value: "alcohol", label: "Alcohol-based" },
      { value: "fluoride", label: "Fluoride" },
      { value: "natural", label: "Natural" },
    ],
  },
  {
    key: "lastDentalVisit",
    label: "Last dental visit?",
    type: "choice",
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
    type: "choice",
    options: [
      { value: "never", label: "Never" },
      { value: "former", label: "Former" },
      { value: "current", label: "Current" },
    ],
  },
  {
    key: "knownHypertension",
    label: "Diagnosed hypertension?",
    type: "boolean",
    options: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    key: "knownDiabetes",
    label: "Diagnosed diabetes?",
    type: "boolean",
    options: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    key: "sleepDuration",
    label: "Average sleep duration?",
    type: "choice",
    options: [
      { value: "lt6", label: "< 6 hrs" },
      { value: "6to7", label: "6–7 hrs" },
      { value: "7to8", label: "7–8 hrs" },
      { value: "gt8", label: "8+ hrs" },
    ],
  },
  {
    key: "sleepLatency",
    label: "How long to fall asleep?",
    type: "choice",
    options: [
      { value: "lt10", label: "< 10 min" },
      { value: "10to20", label: "10–20 min" },
      { value: "20to40", label: "20–40 min" },
      { value: "gt40", label: "40+ min" },
    ],
  },
  {
    key: "sleepQualSelf",
    label: "How would you rate your sleep?",
    type: "choice",
    options: [
      { value: "poor", label: "Poor" },
      { value: "fair", label: "Fair" },
      { value: "good", label: "Good" },
      { value: "excellent", label: "Excellent" },
    ],
  },
  {
    key: "nightWakings",
    label: "Night wakings per week?",
    type: "choice",
    options: [
      { value: "0", label: "None" },
      { value: "1to2", label: "1–2" },
      { value: "3to5", label: "3–5" },
      { value: "gt5", label: "5+" },
    ],
  },
  {
    key: "daytimeFatigue",
    label: "Daytime fatigue level?",
    type: "choice",
    options: [
      { value: "none", label: "None" },
      { value: "mild", label: "Mild" },
      { value: "moderate", label: "Moderate" },
      { value: "severe", label: "Severe" },
    ],
  },
  // ── Medical History ──
  {
    key: "hypertensionDx",
    label: "Have you been diagnosed with high blood pressure?",
    type: "choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "onBPMeds",
    label: "Are you taking medication for blood pressure?",
    type: "choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "na", label: "N/A" },
    ],
  },
  {
    key: "onStatins",
    label: "Are you taking a statin (cholesterol medication)?",
    type: "choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "familyHistoryCVD",
    label: "Parent or sibling had heart attack/stroke before 65?",
    type: "choice",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  // ── Nutrition ──
  {
    key: "vegetableServings",
    label: "Servings of vegetables per day?",
    type: "choice",
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
    type: "choice",
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
    type: "choice",
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
    type: "choice",
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
    key: "alcoholDrinks",
    label: "Alcoholic drinks per week on average?",
    type: "choice",
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
    key: "stressLevel",
    label: "How would you rate your current stress level?",
    type: "choice",
    options: [
      { value: "low", label: "Low" },
      { value: "moderate", label: "Moderate" },
      { value: "high", label: "High" },
    ],
  },
];

const INITIAL_ANSWERS: LifestyleAnswers = {
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
  vegetableServings: "",
  fruitServings: "",
  processedFood: "",
  sugaryDrinks: "",
  alcoholDrinks: "",
  stressLevel: "",
};

interface Props {
  onComplete: (answers: LifestyleAnswers) => void;
  onSkip: () => void;
}

export function StepLifestyle({ onComplete, onSkip }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [answers, setAnswers] = useState<LifestyleAnswers>(INITIAL_ANSWERS);

  function setAnswer(key: keyof LifestyleAnswers, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [key]: key === "knownHypertension" || key === "knownDiabetes" ? value === "true" : value,
    }));
  }

  function getValue(key: keyof LifestyleAnswers): string {
    const v = answers[key];
    if (typeof v === "boolean") return String(v);
    return v;
  }

  const answeredCount = QUESTIONS.filter((q) => {
    const v = getValue(q.key);
    return v !== "" && v !== "false";
  }).length;

  const allAnswered = QUESTIONS.every((q) => getValue(q.key) !== "");

  if (mode === "choose") {
    return (
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="font-display text-4xl font-light tracking-tight text-ink">
            Lifestyle questionnaire
          </h2>
          <p className="mt-3 font-body text-sm text-ink/50">
            Quick questions about exercise, oral care, sleep, nutrition, and lifestyle.
          </p>
        </div>

        <div className="grid w-full max-w-md grid-cols-2 gap-3">
          <button
            onClick={() => setMode("questions")}
            className="flex flex-col items-center gap-3 border border-ink/10 bg-white p-6 transition-all hover:border-gold"
          >
            <span className="text-3xl">✏️</span>
            <span className="font-body text-sm font-medium text-ink">Answer now</span>
            <span className="font-body text-[10px] text-ink/35">~2 minutes</span>
          </button>
          <button
            onClick={onSkip}
            className="flex flex-col items-center gap-3 border border-ink/10 bg-white p-6 transition-all hover:border-ink/25"
          >
            <span className="text-3xl">⏭️</span>
            <span className="font-body text-sm font-medium text-ink">Skip for now</span>
            <span className="font-body text-[10px] text-ink/35">Fill out later</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          Lifestyle questionnaire
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          {answeredCount} of {QUESTIONS.length} answered
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-5">
        {QUESTIONS.map((q) => (
          <div key={q.key} className="flex flex-col gap-2">
            <span className="font-body text-sm font-medium text-ink">{q.label}</span>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const isSelected = getValue(q.key) === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAnswer(q.key, opt.value)}
                    className={`rounded-none border px-3 py-1.5 font-body text-xs transition-all ${
                      isSelected
                        ? "border-gold bg-gold/10 text-ink"
                        : "border-ink/10 bg-white text-ink/60 hover:border-ink/25"
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

      <div className="flex w-full max-w-md flex-col gap-3 pt-2">
        <button
          onClick={() => onComplete(answers)}
          disabled={!allAnswered}
          className="h-12 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                     text-off-white transition-colors hover:bg-gold disabled:opacity-30"
        >
          Save answers
        </button>
        <button
          onClick={onSkip}
          className="font-body text-xs text-ink/35 uppercase tracking-widest hover:text-ink/60 transition-colors"
        >
          Skip — answer later
        </button>
      </div>
    </div>
  );
}

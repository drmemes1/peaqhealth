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

const QUESTIONS: QuestionDef[] = [
  {
    key: "exerciseLevel", dbKey: "exercise_level",
    label: "How often do you exercise?", type: "choice",
    options: [
      { value: "sedentary", label: "Rarely" },
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
    for (const q of QUESTIONS) {
      if (q.type === "boolean") {
        row[q.dbKey] = answers[q.key] === "true";
      } else {
        row[q.dbKey] = answers[q.key];
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

      <main className="mx-auto max-w-[680px] px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-light tracking-tight text-ink">
            Lifestyle questionnaire
          </h1>
          <p className="mt-3 font-body text-sm text-ink/50">
            Update your answers to recalculate your score.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {QUESTIONS.map((q) => (
            <div key={q.key} className="flex flex-col gap-2">
              <span className="font-body text-sm font-medium text-ink">{q.label}</span>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const isSelected = answers[q.key] === opt.value;
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

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={!allAnswered || saving}
            className="h-12 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                       text-off-white transition-colors hover:bg-gold disabled:opacity-30"
          >
            {saving ? "Saving..." : saved ? "Score updated ✓" : "Save answers"}
          </button>
        </div>
      </main>
    </div>
  );
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

// ── Question definitions ────────────────────────────────────────────────────

type ChoiceQ = {
  type: "choice"
  key: string
  dbCol: string
  question: string
  descriptor: string
  options: { value: string; label: string }[]
}

type NumberQ = {
  type: "number"
  key: string
  dbCol: string
  question: string
  descriptor: string
  unit: string
  min: number
  max: number
}

type Question = ChoiceQ | NumberQ

const QUESTIONS: Question[] = [
  // A. Demographics
  {
    type: "choice", key: "age_range", dbCol: "age_range",
    question: "How old are you?",
    descriptor: "Age affects how we interpret several biomarkers and oral microbiome patterns.",
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
    type: "choice", key: "biological_sex", dbCol: "biological_sex",
    question: "What's your biological sex?",
    descriptor: "Some biomarker reference ranges differ between males and females. This is separate from gender identity.",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "prefer_not_to_say", label: "Prefer not to say" },
    ],
  },
  // B. Sleep basics
  {
    type: "choice", key: "sleep_duration", dbCol: "sleep_duration",
    question: "On an average night, how many hours do you sleep?",
    descriptor: "Sleep duration affects HRV, hormones, and inflammation. Most adults need 7–9 hours.",
    options: [
      { value: "lt6", label: "Less than 6" },
      { value: "6to7", label: "6–7" },
      { value: "7to8", label: "7–8" },
      { value: "gt8", label: "8 or more" },
    ],
  },
  {
    type: "choice", key: "sleep_latency", dbCol: "sleep_latency",
    question: "How long does it usually take you to fall asleep?",
    descriptor: "Falling asleep in under 10 minutes can actually be a sign of sleep deprivation — a well-rested person usually takes 15–20 minutes.",
    options: [
      { value: "lt10", label: "Less than 10 min" },
      { value: "10to20", label: "10–20 min" },
      { value: "20to40", label: "20–40 min" },
      { value: "gt40", label: "Over 40 min" },
    ],
  },
  {
    type: "choice", key: "sleep_qual_self", dbCol: "sleep_qual_self",
    question: "Overall, how would you rate your sleep quality?",
    descriptor: "Your own sense of whether your sleep is restorative. This is the first layer — we ask more specific questions after.",
    options: [
      { value: "poor", label: "Poor" },
      { value: "fair", label: "Fair" },
      { value: "good", label: "Good" },
      { value: "excellent", label: "Excellent" },
    ],
  },
  // C. Sleep quality signals
  {
    type: "choice", key: "non_restorative_sleep", dbCol: "non_restorative_sleep",
    question: "Do you often wake up feeling unrefreshed, even after a full night's sleep?",
    descriptor: "Sleeping long hours but feeling unrefreshed can point to disrupted breathing or fragmented sleep you're not consciously aware of.",
    options: [
      { value: "never", label: "Never" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" },
      { value: "almost_always", label: "Almost every morning" },
    ],
  },
  {
    type: "choice", key: "daytime_fatigue", dbCol: "daytime_fatigue",
    question: "How often do you feel excessively sleepy during the day?",
    descriptor: "Daytime sleepiness despite enough sleep hours is a flag for sleep quality issues.",
    options: [
      { value: "none", label: "Rarely" },
      { value: "mild", label: "Occasionally" },
      { value: "moderate", label: "Frequently" },
      { value: "severe", label: "Daily" },
    ],
  },
  {
    type: "choice", key: "night_wakings", dbCol: "night_wakings",
    question: "How many nights per week do you wake up and struggle to fall back asleep?",
    descriptor: "Fragmented sleep reduces restoration even when total hours look fine.",
    options: [
      { value: "0", label: "Rarely" },
      { value: "1to2", label: "1–2 nights" },
      { value: "3to5", label: "3–5 nights" },
      { value: "gt5", label: "Most nights" },
    ],
  },
  {
    type: "choice", key: "daytime_cognitive_fog", dbCol: "daytime_cognitive_fog",
    question: "How often do you feel mentally cloudy or struggle to focus during the day?",
    descriptor: "Cognitive fog alongside good sleep hours is often a signal of untreated airway issues at night.",
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "occasionally", label: "Occasionally" },
      { value: "often", label: "Often" },
      { value: "most_mornings", label: "Most days" },
    ],
  },
  // D. Breathing & airway
  {
    type: "choice", key: "snoring_reported", dbCol: "snoring_reported",
    question: "Has anyone told you that you snore, or have you been diagnosed with sleep apnoea?",
    descriptor: "Snoring is the most common sign of airway narrowing during sleep. Many people don't hear themselves.",
    options: [
      { value: "no", label: "No" },
      { value: "occasional", label: "Occasionally" },
      { value: "frequent", label: "Frequently" },
      { value: "osa_diagnosed", label: "Diagnosed with sleep apnoea" },
    ],
  },
  {
    type: "choice", key: "osa_witnessed", dbCol: "osa_witnessed",
    question: "Has someone told you that you stop breathing, gasp, or choke in your sleep?",
    descriptor: "Witnessed pauses in breathing are one of the strongest predictors of sleep apnoea. It's common to be unsure if you sleep alone.",
    options: [
      { value: "no", label: "No" },
      { value: "possibly", label: "Not sure" },
      { value: "occasionally", label: "Yes, occasionally" },
      { value: "frequently", label: "Yes, frequently" },
    ],
  },
  {
    type: "choice", key: "mouth_breathing_when", dbCol: "mouth_breathing_when",
    question: "Do you breathe through your mouth?",
    descriptor: "Mouth breathing at night dries out saliva and changes the bacteria in your mouth. It also often signals blocked nasal breathing.",
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "sleep_only", label: "Only at night" },
      { value: "exercise_only", label: "Only when exercising" },
      { value: "daytime_and_sleep", label: "Both day and night" },
    ],
  },
  {
    type: "choice", key: "nasal_obstruction_severity", dbCol: "nasal_obstruction_severity",
    question: "How often is your nose blocked or stuffy?",
    descriptor: "Nasal obstruction is the most common reason for mouth breathing. Allergies, a deviated septum, or chronic sinus issues all contribute.",
    options: [
      { value: "never", label: "Never or rarely" },
      { value: "mild", label: "Occasionally (colds only)" },
      { value: "moderate", label: "Often (most weeks)" },
      { value: "severe", label: "Chronically (most days)" },
    ],
  },
  {
    type: "choice", key: "morning_headaches", dbCol: "morning_headaches",
    question: "How often do you wake up with a headache?",
    descriptor: "Morning headaches can be a sign of CO₂ buildup from disrupted breathing, or jaw clenching overnight.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasionally", label: "Occasionally" },
      { value: "often", label: "Often" },
      { value: "most_mornings", label: "Most mornings" },
    ],
  },
  {
    type: "choice", key: "bruxism_night", dbCol: "bruxism_night",
    question: "Do you grind or clench your teeth at night?",
    descriptor: "Night grinding often accompanies airway issues — the jaw thrusts forward to keep the airway open. You may not know unless someone has told you or a dentist has seen the wear.",
    options: [
      { value: "never", label: "No" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" },
      { value: "confirmed", label: "Diagnosed by dentist" },
    ],
  },
  // D2. Smoking/vaping
  {
    type: "choice", key: "smoking_status", dbCol: "smoking_status",
    question: "Do you smoke, vape, or use other tobacco products?",
    descriptor: "Smoking and vaping directly alter your oral bacteria — specifically reducing some of the protective species we measure. We need to know this to interpret your results accurately.",
    options: [
      { value: "never", label: "Never" },
      { value: "former_6mo", label: "Former (quit 6+ months ago)" },
      { value: "former_recent", label: "Former (quit in last 6 months)" },
      { value: "current_smoke", label: "Currently smoke" },
      { value: "current_vape", label: "Currently vape" },
      { value: "current_chew", label: "Currently use chewing tobacco" },
    ],
  },
  // E. Gut & reflux
  {
    type: "choice", key: "gerd_nocturnal", dbCol: "gerd_nocturnal",
    question: "Do you experience acid reflux or heartburn, especially at night?",
    descriptor: "Nighttime reflux changes oral pH and feeds specific bacteria. It also often coexists with sleep-disordered breathing.",
    options: [
      { value: "no", label: "No" },
      { value: "daytime_only", label: "Occasionally, daytime only" },
      { value: "including_night", label: "Often, including at night" },
      { value: "diagnosed", label: "Diagnosed GERD" },
    ],
  },
  // F. Oral habits
  {
    type: "choice", key: "flossing_freq", dbCol: "flossing_freq",
    question: "How often do you floss?",
    descriptor: "Flossing reaches bacterial colonies between teeth that brushing misses. This affects your gum bacteria.",
    options: [
      { value: "never", label: "Never" },
      { value: "sometimes", label: "Few times per week" },
      { value: "daily", label: "Daily" },
    ],
  },
  {
    type: "choice", key: "whitening_frequency", dbCol: "whitening_frequency",
    question: "How often do you use peroxide-based whitening products?",
    descriptor: "Peroxide temporarily reduces certain oxygen-sensitive bacteria, which can make your oral microbiome look like you have a breathing issue when you don't.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasionally", label: "Occasionally" },
      { value: "monthly_course", label: "Monthly" },
      { value: "daily_toothpaste", label: "Weekly" },
      { value: "nightly_trays", label: "Daily" },
    ],
  },
  {
    type: "choice", key: "dietary_nitrate_frequency", dbCol: "dietary_nitrate_frequency",
    question: "How often do you eat leafy greens, beets, or other nitrate-rich vegetables?",
    descriptor: "Your mouth bacteria convert dietary nitrate into nitric oxide — the signal that keeps blood vessels relaxed. Eating these foods literally feeds the helpful bacteria.",
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "several_weekly", label: "Few times per week" },
      { value: "daily", label: "Daily" },
      { value: "multiple_daily", label: "Multiple times per day" },
    ],
  },
  {
    type: "choice", key: "sugar_intake", dbCol: "sugar_intake",
    question: "How often do you consume sugary foods or drinks — candy, pastries, soda, juice, sweetened coffee?",
    descriptor: "Sugar is the primary food source for cavity-causing bacteria. We use this to interpret your cavity bacteria results.",
    options: [
      { value: "rarely", label: "Rarely or never" },
      { value: "few_weekly", label: "Few times per week" },
      { value: "daily", label: "Daily" },
      { value: "multiple_daily", label: "Multiple times per day" },
    ],
  },
  // G. Body metrics
  {
    type: "number", key: "height_cm", dbCol: "height_cm",
    question: "What's your height?",
    descriptor: "Used with weight to calculate BMI — relevant for airway risk.",
    unit: "cm", min: 100, max: 230,
  },
  {
    type: "number", key: "weight_kg", dbCol: "weight_kg",
    question: "What's your current weight?",
    descriptor: "Used with height to calculate BMI. We store this to track changes over time.",
    unit: "kg", min: 30, max: 250,
  },
  // H. Quality control
  {
    type: "choice", key: "antibiotics_window", dbCol: "antibiotics_window",
    question: "When did you last take antibiotics?",
    descriptor: "Antibiotics significantly change your oral bacteria for weeks to months. Knowing roughly when you last took them lets us interpret your sample in that context.",
    options: [
      { value: "past_30", label: "In past 30 days" },
      { value: "31_to_60", label: "31–60 days ago" },
      { value: "61_to_90", label: "61–90 days ago" },
      { value: "over_90", label: "More than 90 days ago" },
      { value: "never_year", label: "Never in last year" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  // I. Medications
  {
    type: "choice", key: "chlorhexidine_use", dbCol: "chlorhexidine_use",
    question: "Have you used chlorhexidine mouthwash or rinse recently?",
    descriptor: "Brand names include Peridex, PerioGard, Periochip. Often prescribed after dental procedures or for gum disease — different from over-the-counter mouthwash like Listerine. Chlorhexidine strongly suppresses the protective bacteria we measure.",
    options: [
      { value: "never", label: "Never" },
      { value: "past_8wks", label: "Used in past 8 weeks but not currently" },
      { value: "currently_using", label: "Currently using" },
    ],
  },
  {
    type: "choice", key: "xerostomia_self_report", dbCol: "xerostomia_self_report",
    question: "How often do you experience dry mouth?",
    descriptor: "Beyond just feeling thirsty — actual dry mouth sensation, especially on waking or during the day. Reduced saliva limits the substrates your buffering bacteria need.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasional", label: "Occasionally" },
      { value: "frequent", label: "Frequently (most days)" },
      { value: "constant", label: "Constantly" },
    ],
  },
  {
    type: "choice", key: "medication_ppi_detail", dbCol: "medication_ppi_detail",
    question: "Do you take a daily proton pump inhibitor (Omeprazole, Pantoprazole, Nexium, Prilosec, Prevacid)?",
    descriptor: "PPIs change the acid-base balance throughout your digestive tract, including your mouth. They affect the bacteria we measure for caries and gum health.",
    options: [
      { value: "no", label: "No" },
      { value: "occasionally", label: "Yes, occasionally" },
      { value: "daily_under_6mo", label: "Yes, daily for less than 6 months" },
      { value: "daily_over_6mo", label: "Yes, daily for over 6 months" },
    ],
  },
]

// ── Component ───────────────────────────────────────────────────────────────

export default function LifestyleWizard({
  mode = "settings",
  existing,
  onComplete,
}: {
  mode?: "onboarding" | "settings"
  existing?: Record<string, unknown> | null
  onComplete?: () => void
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [isReturning, setIsReturning] = useState(false)

  useEffect(() => {
    if (!existing) return
    const loaded: Record<string, string> = {}
    for (const q of QUESTIONS) {
      const val = existing[q.dbCol]
      if (val != null && val !== "" && val !== false) {
        loaded[q.key] = String(val)
      }
    }
    setAnswers(loaded)

    const firstUnanswered = QUESTIONS.findIndex(q => !loaded[q.key])
    if (firstUnanswered > 0) {
      setCurrentIdx(firstUnanswered)
      setIsReturning(true)
    }
  }, [existing])

  const q = QUESTIONS[currentIdx]
  const isLast = currentIdx === QUESTIONS.length - 1
  const answeredCount = QUESTIONS.filter(q => answers[q.key]).length
  const progress = (answeredCount / QUESTIONS.length) * 100

  const saveAnswer = useCallback(async (field: string, value: string | number) => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/lifestyle/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_name: field, value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? "Save failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }, [])

  const handleChoiceSelect = useCallback(async (value: string) => {
    setAnswers(prev => ({ ...prev, [q.key]: value }))
    await saveAnswer(q.dbCol, value)

    if (!error) {
      setTimeout(() => {
        if (currentIdx < QUESTIONS.length - 1) {
          setCurrentIdx(i => i + 1)
        }
      }, 300)
    }
  }, [q, currentIdx, saveAnswer, error])

  const handleNumberSubmit = useCallback(async () => {
    const val = answers[q.key]
    if (!val) return
    const num = parseFloat(val)
    const nq = q as NumberQ
    if (!Number.isFinite(num) || num < nq.min || num > nq.max) {
      setError(`Please enter a value between ${nq.min} and ${nq.max}`)
      return
    }
    await saveAnswer(q.dbCol, num)
    if (!error && currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(i => i + 1)
    }
  }, [q, answers, currentIdx, saveAnswer, error])

  const handleFinalize = useCallback(async () => {
    if (q.type === "number") {
      const val = answers[q.key]
      if (!val) return
      const num = parseFloat(val)
      const nq = q as NumberQ
      if (!Number.isFinite(num) || num < nq.min || num > nq.max) {
        setError(`Please enter a value between ${nq.min} and ${nq.max}`)
        return
      }
      await saveAnswer(q.dbCol, num)
    }

    setFinalizing(true)
    setError("")
    try {
      const res = await fetch("/api/lifestyle/finalize", { method: "POST" })
      if (!res.ok) throw new Error("Recalculation failed")
      if (onComplete) { onComplete(); return }
      setDone(true)
    } catch {
      setError("Something went wrong updating your panels. Try again.")
      setFinalizing(false)
    }
  }, [q, answers, saveAnswer])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (done || finalizing) return
      if (q.type === "choice") {
        const idx = parseInt(e.key) - 1
        if (idx >= 0 && idx < (q as ChoiceQ).options.length) {
          handleChoiceSelect((q as ChoiceQ).options[idx].value)
        }
      }
      if (e.key === "Escape" && currentIdx > 0) {
        setCurrentIdx(i => i - 1)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [q, currentIdx, done, finalizing, handleChoiceSelect])

  if (done) {
    return (
      <div className="min-h-svh flex items-center justify-center px-6" style={{ background: "#FAFAF8" }}>
        <div className="text-center max-w-md">
          <h1 style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 32, fontWeight: 400, color: "#141410", marginBottom: 12 }}>
            All done — thank you.
          </h1>
          <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#9B9891", marginBottom: 32, lineHeight: 1.6 }}>
            Your panels will now refresh with this new context.
          </p>
          <button
            onClick={() => router.push(mode === "onboarding" ? "/dashboard" : "/dashboard/oral")}
            style={{
              fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "14px 32px", background: "#141410", color: "#FAFAF8",
              border: "none", borderRadius: 3, cursor: "pointer",
            }}
          >
            {mode === "onboarding" ? "Go to dashboard" : "View my oral panel"} →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh flex flex-col" style={{ background: "#FAFAF8" }}>
      {/* Progress bar */}
      <div style={{ height: 2, background: "#E8E6E0" }}>
        <div style={{ height: 2, background: "#3B6D11", width: `${progress}%`, transition: "width 0.3s ease" }} />
      </div>

      {/* Header */}
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 11, color: "#9B9891", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {currentIdx + 1} of {QUESTIONS.length}
        </span>
        {isReturning && currentIdx === QUESTIONS.findIndex(q2 => !answers[q2.key]) && (
          <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 11, color: "#B8860B", letterSpacing: "0.06em" }}>
            We simplified the questionnaire — just a few new questions
          </span>
        )}
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-6 pb-24">
        <div style={{ maxWidth: 520, width: "100%" }}>
          <h2 style={{
            fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 26, fontWeight: 400,
            color: "#141410", lineHeight: 1.35, marginBottom: 28, textAlign: "center",
          }}>
            {q.question}
          </h2>

          {q.type === "choice" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(q as ChoiceQ).options.map((opt, i) => {
                const selected = answers[q.key] === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleChoiceSelect(opt.value)}
                    disabled={saving}
                    style={{
                      padding: "16px 20px",
                      background: selected ? "#14141008" : "#FFFFFF",
                      border: `1.5px solid ${selected ? "#141410" : "rgba(20,20,16,0.12)"}`,
                      borderRadius: 3,
                      fontFamily: "'Instrument Sans', sans-serif",
                      fontSize: 15, fontWeight: selected ? 600 : 400,
                      color: "#141410",
                      cursor: saving ? "not-allowed" : "pointer",
                      textAlign: "left",
                      transition: "border-color 0.15s, background 0.15s",
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `1.5px solid ${selected ? "#141410" : "rgba(20,20,16,0.2)"}`,
                      background: selected ? "#141410" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, fontSize: 10, color: "#FAFAF8",
                    }}>
                      {selected ? "✓" : i + 1}
                    </span>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}

          {q.type === "number" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <input
                  type="number"
                  value={answers[q.key] ?? ""}
                  onChange={e => { setAnswers(prev => ({ ...prev, [q.key]: e.target.value })); setError("") }}
                  onKeyDown={e => { if (e.key === "Enter") { isLast ? handleFinalize() : handleNumberSubmit() } }}
                  min={(q as NumberQ).min}
                  max={(q as NumberQ).max}
                  autoFocus
                  style={{
                    width: 140, padding: "12px 16px",
                    fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 32, fontWeight: 300,
                    color: "#141410", textAlign: "center",
                    border: "1.5px solid rgba(20,20,16,0.15)", borderRadius: 3,
                    background: "#fff", outline: "none",
                  }}
                />
                <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: "#9B9891" }}>
                  {(q as NumberQ).unit}
                </span>
              </div>
              <button
                onClick={() => { isLast ? handleFinalize() : handleNumberSubmit() }}
                disabled={saving || !answers[q.key]}
                style={{
                  padding: "12px 28px",
                  background: answers[q.key] ? "#141410" : "rgba(20,20,16,0.1)",
                  color: answers[q.key] ? "#FAFAF8" : "#9B9891",
                  border: "none", borderRadius: 3, cursor: answers[q.key] ? "pointer" : "not-allowed",
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}
              >
                {isLast ? (finalizing ? "Updating your panel..." : "Save and finish") : "Next"}
              </button>
            </div>
          )}

          {/* Descriptor */}
          <div style={{ marginTop: 32, borderTop: "0.5px solid rgba(20,20,16,0.08)", paddingTop: 20 }}>
            <p style={{
              fontFamily: "'Instrument Sans', sans-serif", fontSize: 13,
              color: "#9B9891", lineHeight: 1.65, textAlign: "center",
              maxWidth: 440, margin: "0 auto",
            }}>
              {q.descriptor}
            </p>
          </div>

          {error && (
            <p style={{
              fontFamily: "'Instrument Sans', sans-serif", fontSize: 13,
              color: "#991B1B", textAlign: "center", marginTop: 12,
            }}>
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "16px 24px", background: "#FAFAF8",
        borderTop: "0.5px solid rgba(20,20,16,0.08)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <button
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          style={{
            fontFamily: "'Instrument Sans', sans-serif", fontSize: 12,
            color: currentIdx === 0 ? "#D4D2CC" : "#9B9891",
            background: "none", border: "none", cursor: currentIdx === 0 ? "default" : "pointer",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}
        >
          ← Back
        </button>

        {isLast && q.type === "choice" && answers[q.key] && (
          <button
            onClick={handleFinalize}
            disabled={finalizing}
            style={{
              padding: "10px 24px", background: "#141410", color: "#FAFAF8",
              border: "none", borderRadius: 3, cursor: finalizing ? "not-allowed" : "pointer",
              fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
              opacity: finalizing ? 0.6 : 1,
            }}
          >
            {finalizing ? "Updating your panel..." : "Save and finish →"}
          </button>
        )}
      </div>
    </div>
  )
}

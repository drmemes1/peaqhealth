"use client"

import { useState, useEffect, useRef } from "react"
import type { QuizAnswers, QuizResult } from "../../../lib/quizScoring"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const ACCENT = "#C49A3C"
const INK    = "#1a1a18"

// ── Question definitions ───────────────────────────────────────────────────

interface QuestionDef {
  id: keyof QuizAnswers
  question: string
  type: "single" | "multi"
  options: { value: string; label: string }[]
  revelation: string
}

const QUESTIONS: QuestionDef[] = [
  {
    id: "q1_nitrate",
    question: "How often do you eat foods like arugula, beetroot, spinach, or celery?",
    type: "single",
    options: [
      { value: "rarely", label: "Rarely or never" },
      { value: "few_times", label: "A few times a week" },
      { value: "daily", label: "Almost every day" },
    ],
    revelation: "A specific group of bacteria in your mouth \u2014 Neisseria, Rothia, and Veillonella \u2014 convert nitrate from these foods into nitric oxide, the molecule your blood vessels use to regulate blood pressure. Without both the food and the bacteria, the pathway breaks down.",
  },
  {
    id: "q2_mouthwash",
    question: "Do you use a mouthwash regularly?",
    type: "single",
    options: [
      { value: "none", label: "No" },
      { value: "antiseptic", label: "Yes \u2014 an alcohol-based rinse (Listerine, Scope, Colgate Total)" },
      { value: "alcohol_free", label: "Yes \u2014 an alcohol-free or fluoride rinse (ACT, Closys, Biotene)" },
      { value: "unsure", label: "Yes \u2014 I\u2019m not sure which type" },
    ],
    revelation: "Alcohol-based mouthwashes kill the bacteria responsible for nitric oxide production. Most people using antiseptic rinses for fresher breath don\u2019t know they may be disrupting a pathway that connects directly to blood pressure and cardiovascular health.",
  },
  {
    id: "q3_airway",
    question: "Do any of these sound like you?",
    type: "multi",
    options: [
      { value: "snore", label: "I snore, or my partner says I do" },
      { value: "grind", label: "I grind or clench my teeth" },
      { value: "mouth_breathe", label: "I tend to breathe through my mouth at night" },
      { value: "none", label: "None of these" },
    ],
    revelation: "Grinding, snoring, and mouth breathing are physical signs that your airway is under stress during sleep. A 2022 study found oral microbiome composition alone predicted obstructive sleep apnea with 91.9% accuracy \u2014 before a sleep study was done.",
  },
  {
    id: "q4_dental",
    question: "When did you last have a routine dental cleaning?",
    type: "single",
    options: [
      { value: "recent", label: "Within the last 6 months" },
      { value: "within_2yr", label: "6 months to 2 years ago" },
      { value: "over_2yr", label: "More than 2 years ago" },
      { value: "emergency_only", label: "I go only when something hurts" },
      { value: "deep_cleaning_recommended", label: "My dentist recommended a deep cleaning" },
    ],
    revelation: "Standard cleanings address what\u2019s above the gumline. The subgingival environment \u2014 where periodontal pathogens colonize \u2014 is largely untouched by routine care. That\u2019s where the systemic signals originate.",
  },
  {
    id: "q5_cv_history",
    question: "Has a doctor ever mentioned any of these \u2014 for you or a close family member?",
    type: "multi",
    options: [
      { value: "crp", label: "Elevated inflammation (CRP or hs-CRP)" },
      { value: "blood_pressure", label: "High blood pressure" },
      { value: "cholesterol_lpa", label: "Elevated cholesterol or Lp(a)" },
      { value: "prediabetes", label: "Pre-diabetes or metabolic concerns" },
      { value: "heart_disease", label: "Heart disease or stroke history" },
      { value: "none", label: "None of the above" },
    ],
    revelation: "Each of these conditions shares inflammatory pathways with the oral microbiome. Periodontal bacteria enter the bloodstream through gum tissue and trigger the same response your doctor measures with CRP. Most people managing these conditions have never looked at the oral source.",
  },
  {
    id: "q6_awareness",
    question: "When did you last see your oral microbiome connected to your blood markers and sleep data?",
    type: "single",
    options: [
      { value: "never_heard", label: "I didn\u2019t know the oral microbiome could be tested" },
      { value: "didnt_know_connected", label: "I didn\u2019t know it connected to blood or sleep" },
      { value: "curious", label: "I\u2019ve been curious but didn\u2019t know where to start" },
      { value: "done_standalone", label: "I\u2019ve done standalone testing but never seen it integrated" },
    ],
    revelation: "Almost nobody has. That\u2019s the gap Peaq was built to close.",
  },
]

// ── Component ──────────────────────────────────────────────────────────────

export function OralSnapshot() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [showRevelation, setShowRevelation] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const revelRef = useRef<HTMLDivElement>(null)

  const q = QUESTIONS[step]
  const isLastQuestion = step === QUESTIONS.length - 1
  const currentAnswer = answers[q?.id]
  const hasAnswer = currentAnswer !== undefined && (
    Array.isArray(currentAnswer) ? currentAnswer.length > 0 : currentAnswer !== ""
  )

  // Reset revelation state when step changes
  useEffect(() => {
    setShowRevelation(false)
    setShowNext(false)
  }, [step])

  // Show revelation after answer is selected
  useEffect(() => {
    if (!hasAnswer) return
    const t1 = setTimeout(() => setShowRevelation(true), 200)
    const t2 = setTimeout(() => setShowNext(true), 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [hasAnswer, step]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectSingle(value: string) {
    setAnswers(a => ({ ...a, [q.id]: value }))
  }

  function toggleMulti(value: string) {
    const current = (answers[q.id] as string[] | undefined) ?? []
    if (value === "none") {
      setAnswers(a => ({ ...a, [q.id]: ["none"] }))
      return
    }
    const filtered = current.filter(v => v !== "none")
    const next = filtered.includes(value)
      ? filtered.filter(v => v !== value)
      : [...filtered, value]
    setAnswers(a => ({ ...a, [q.id]: next.length > 0 ? next : [] }))
  }

  function advance() {
    if (isLastQuestion) {
      // Build full answers object
      const full: QuizAnswers = {
        q1_nitrate: (answers.q1_nitrate as string) as QuizAnswers["q1_nitrate"],
        q2_mouthwash: (answers.q2_mouthwash as string) as QuizAnswers["q2_mouthwash"],
        q3_airway: (answers.q3_airway as string[]) as QuizAnswers["q3_airway"],
        q4_dental: (answers.q4_dental as string) as QuizAnswers["q4_dental"],
        q5_cv_history: (answers.q5_cv_history as string[]) as QuizAnswers["q5_cv_history"],
        q6_awareness: (answers.q6_awareness as string) as QuizAnswers["q6_awareness"],
      }
      // Score locally for instant display
      import("../../../lib/quizScoring").then(({ scoreQuiz }) => {
        setResult(scoreQuiz(full))
      })
    } else {
      setStep(s => s + 1)
    }
  }

  async function handleSubmit() {
    if (!email.includes("@") || !result) return
    setSubmitting(true)
    try {
      const full: QuizAnswers = {
        q1_nitrate: (answers.q1_nitrate as string) as QuizAnswers["q1_nitrate"],
        q2_mouthwash: (answers.q2_mouthwash as string) as QuizAnswers["q2_mouthwash"],
        q3_airway: (answers.q3_airway as string[]) as QuizAnswers["q3_airway"],
        q4_dental: (answers.q4_dental as string) as QuizAnswers["q4_dental"],
        q5_cv_history: (answers.q5_cv_history as string[]) as QuizAnswers["q5_cv_history"],
        q6_awareness: (answers.q6_awareness as string) as QuizAnswers["q6_awareness"],
      }
      await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: full, email }),
      })
      setSubmitted(true)
    } catch {
      // Still show results even if save fails
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Results screen ───────────────────────────────────────────────────────
  if (result) {
    const riskColor = result.riskLevel === "higher" ? "#A32D2D"
      : result.riskLevel === "moderate" ? "#C49A3C" : "#2D6A4F"
    const riskLabel = result.riskLevel === "higher" ? "Higher signal density"
      : result.riskLevel === "moderate" ? "Moderate signal density" : "Low signal density"

    return (
      <div style={{ textAlign: "left" }}>
        {/* Risk badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          marginBottom: 24,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: riskColor,
          }} />
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
            textTransform: "uppercase", color: riskColor, fontWeight: 500,
          }}>
            {riskLabel}
          </span>
        </div>

        {/* Email capture — before showing insights */}
        {!submitted && (
          <div style={{
            background: "#fff", borderRadius: 10,
            border: "0.5px solid rgba(0,0,0,0.08)",
            padding: "24px 24px 20px", marginBottom: 28,
          }}>
            <p style={{
              fontFamily: serif, fontSize: 20, fontWeight: 400,
              color: INK, margin: "0 0 8px",
            }}>
              Your snapshot is ready.
            </p>
            <p style={{
              fontFamily: sans, fontSize: 13, color: "rgba(20,20,16,0.5)",
              lineHeight: 1.6, margin: "0 0 16px",
            }}>
              Enter your email to see your personalized results and get early access to Peaq.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{
                  flex: 1, fontFamily: sans, fontSize: 14,
                  padding: "10px 14px", borderRadius: 6,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  outline: "none", background: "#FAFAF8",
                  color: INK,
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !email.includes("@")}
                style={{
                  fontFamily: sans, fontSize: 11, letterSpacing: "1px",
                  textTransform: "uppercase", fontWeight: 500,
                  background: ACCENT, color: "#fff", border: "none",
                  borderRadius: 6, padding: "10px 20px", cursor: "pointer",
                  opacity: submitting || !email.includes("@") ? 0.5 : 1,
                }}
              >
                {submitting ? "..." : "Show me"}
              </button>
            </div>
          </div>
        )}

        {/* Insights — shown after email submitted */}
        {submitted && (
          <div style={{
            animation: "quizFadeIn 600ms ease both",
          }}>
            {[
              { label: "Your primary signal", text: result.primaryInsight },
              { label: "What Peaq would measure", text: result.secondaryInsight },
              { label: "The full picture", text: result.tertiaryInsight },
            ].map((insight, i) => (
              <div key={i} style={{
                marginBottom: 24,
                animation: `quizFadeIn 500ms ease ${200 + i * 200}ms both`,
              }}>
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "1.5px",
                  textTransform: "uppercase", color: ACCENT,
                  display: "block", marginBottom: 8,
                }}>
                  {insight.label}
                </span>
                <p style={{
                  fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.65)",
                  lineHeight: 1.7, margin: 0,
                }}>
                  {insight.text}
                </p>
              </div>
            ))}

            {/* CTA */}
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <a
                href="#cta"
                style={{
                  fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
                  textTransform: "uppercase", textDecoration: "none",
                  color: "#fff", background: ACCENT,
                  borderRadius: 6, padding: "12px 28px",
                  display: "inline-block",
                }}
              >
                Join the waitlist &rarr;
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Question screen ──────────────────────────────────────────────────────
  return (
    <div>
      {/* Progress bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 32,
      }}>
        <div style={{
          flex: 1, height: 2, borderRadius: 1,
          background: "rgba(0,0,0,0.06)",
        }}>
          <div style={{
            height: "100%", borderRadius: 1,
            background: ACCENT,
            width: `${((step + 1) / QUESTIONS.length) * 100}%`,
            transition: "width 300ms ease",
          }} />
        </div>
        <span style={{
          fontFamily: sans, fontSize: 11, color: "rgba(20,20,16,0.35)",
          flexShrink: 0,
        }}>
          {step + 1}/{QUESTIONS.length}
        </span>
      </div>

      {/* Question */}
      <h3 style={{
        fontFamily: serif, fontSize: 22, fontWeight: 400,
        color: INK, lineHeight: 1.3, margin: "0 0 24px",
        textAlign: "left",
      }}>
        {q.question}
      </h3>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
        {q.options.map(opt => {
          const isSelected = q.type === "single"
            ? currentAnswer === opt.value
            : Array.isArray(currentAnswer) && currentAnswer.includes(opt.value)

          return (
            <button
              key={opt.value}
              onClick={() => q.type === "single" ? selectSingle(opt.value) : toggleMulti(opt.value)}
              style={{
                fontFamily: sans, fontSize: 14, color: INK,
                textAlign: "left", lineHeight: 1.5,
                background: isSelected ? "rgba(196,154,60,0.08)" : "#fff",
                border: `0.5px solid ${isSelected ? ACCENT : "rgba(0,0,0,0.08)"}`,
                borderRadius: 8, padding: "12px 16px",
                cursor: "pointer",
                transition: "border-color 150ms ease, background 150ms ease",
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Revelation */}
      <div ref={revelRef} style={{
        maxHeight: showRevelation ? 300 : 0,
        overflow: "hidden",
        opacity: showRevelation ? 1 : 0,
        transition: "max-height 400ms ease, opacity 300ms ease 100ms",
      }}>
        <div style={{
          marginTop: 20, padding: "16px 18px",
          background: "rgba(196,154,60,0.06)",
          borderLeft: `3px solid ${ACCENT}`,
          borderRadius: 6,
        }}>
          <p style={{
            fontFamily: sans, fontSize: 13, color: "rgba(20,20,16,0.6)",
            lineHeight: 1.65, margin: 0,
          }}>
            {q.revelation}
          </p>
        </div>
      </div>

      {/* Next button */}
      <div style={{
        marginTop: 20,
        opacity: showNext ? 1 : 0,
        transform: showNext ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 250ms ease, transform 250ms ease",
        textAlign: "right",
      }}>
        <button
          onClick={advance}
          disabled={!hasAnswer}
          style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "1px",
            textTransform: "uppercase", fontWeight: 500,
            color: ACCENT, background: "none",
            border: `1px solid ${ACCENT}`,
            borderRadius: 6, padding: "10px 24px",
            cursor: hasAnswer ? "pointer" : "default",
            opacity: hasAnswer ? 1 : 0.4,
            transition: "opacity 150ms ease",
          }}
        >
          {isLastQuestion ? "See your results" : "Next \u2192"}
        </button>
      </div>

      <style>{`
        @keyframes quizFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

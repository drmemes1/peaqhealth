"use client"

import { useState, useEffect, useRef } from "react"
import { QUIZ_QUESTIONS, scoreQuiz, type QuizResult } from "../../../lib/quizScoring"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const ACCENT = "#C49A3C"
const INK    = "#1a1a18"

export function OralSnapshot() {
  const [step, setStep] = useState(0)
  // Selections per question: { questionId: [selectedValues] }
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [showRevelation, setShowRevelation] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const revelRef = useRef<HTMLDivElement>(null)

  const q = QUIZ_QUESTIONS[step]
  const isLastQuestion = step === QUIZ_QUESTIONS.length - 1
  const currentSelections = selections[q?.id] ?? []
  const hasAnswer = currentSelections.length > 0

  // Reset revelation when step changes
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

  function toggleOption(value: string) {
    const current = selections[q.id] ?? []
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    setSelections(s => ({ ...s, [q.id]: next }))
  }

  function advance() {
    if (isLastQuestion) {
      // Flatten all selected values across all questions
      const allSelected = Object.values(selections).flat()
      setResult(scoreQuiz(allSelected))
    } else {
      setStep(s => s + 1)
    }
  }

  async function handleSubmit() {
    if (!email.includes("@") || !result) return
    setSubmitting(true)
    try {
      const allSelected = Object.values(selections).flat()
      await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedValues: allSelected, email }),
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Results screen ───────────────────────────────────────────────────────
  if (result) {
    const riskColor = result.tier === "high" ? "#A32D2D"
      : result.tier === "moderate" ? "#C49A3C" : "#2D6A4F"
    const riskLabel = result.tier === "high" ? "Higher signal density"
      : result.tier === "moderate" ? "Moderate signal density" : "Low signal density"

    return (
      <div style={{ textAlign: "left" }}>
        {/* Risk badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          marginBottom: 24,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: riskColor }} />
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
            textTransform: "uppercase", color: riskColor, fontWeight: 500,
          }}>
            {riskLabel}
          </span>
        </div>

        {/* Email capture */}
        {!submitted && (
          <div style={{
            background: "#fff", borderRadius: 10,
            border: "0.5px solid rgba(0,0,0,0.08)",
            padding: "24px 24px 20px", marginBottom: 28,
          }}>
            <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 400, color: INK, margin: "0 0 8px" }}>
              Enter your email for your assessment.
            </p>
            <p style={{ fontFamily: sans, fontSize: 13, color: "rgba(20,20,16,0.5)", lineHeight: 1.6, margin: "0 0 16px" }}>
              We&rsquo;ll send your personalized signal profile and early access details.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{
                  flex: 1, fontFamily: sans, fontSize: 14, padding: "10px 14px",
                  borderRadius: 6, border: "0.5px solid rgba(0,0,0,0.12)",
                  outline: "none", background: "#FAFAF8", color: INK,
                }}
              />
              <button
                onClick={handleSubmit} disabled={submitting || !email.includes("@")}
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

        {/* Insights */}
        {submitted && (
          <div style={{ animation: "quizFadeIn 600ms ease both" }}>
            {[
              { label: "Your primary signal", text: result.primaryInsight },
              { label: "What Peaq would measure", text: result.secondaryInsight },
              { label: "The full picture", text: result.tertiaryInsight },
            ].map((insight, i) => (
              <div key={i} style={{ marginBottom: 24, animation: `quizFadeIn 500ms ease ${200 + i * 200}ms both` }}>
                <span style={{
                  fontFamily: sans, fontSize: 10, letterSpacing: "1.5px",
                  textTransform: "uppercase", color: ACCENT, display: "block", marginBottom: 8,
                }}>{insight.label}</span>
                <p style={{ fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.65)", lineHeight: 1.7, margin: 0 }}>
                  {insight.text}
                </p>
              </div>
            ))}
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <a href="#cta" style={{
                fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
                textTransform: "uppercase", textDecoration: "none",
                color: "#fff", background: ACCENT, borderRadius: 6, padding: "12px 28px",
                display: "inline-block",
              }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <div style={{ flex: 1, height: 2, borderRadius: 1, background: "rgba(0,0,0,0.06)" }}>
          <div style={{
            height: "100%", borderRadius: 1, background: ACCENT,
            width: `${((step + 1) / QUIZ_QUESTIONS.length) * 100}%`,
            transition: "width 300ms ease",
          }} />
        </div>
        <span style={{ fontFamily: sans, fontSize: 11, color: "rgba(20,20,16,0.35)", flexShrink: 0 }}>
          {step + 1}/{QUIZ_QUESTIONS.length}
        </span>
      </div>

      {/* Question */}
      <h3 style={{
        fontFamily: serif, fontSize: 22, fontWeight: 400,
        color: INK, lineHeight: 1.3, margin: "0 0 24px", textAlign: "left",
      }}>
        {q.question}
      </h3>

      {/* Options — all multi-select */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
        {q.options.map(opt => {
          const isSelected = currentSelections.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              style={{
                fontFamily: sans, fontSize: 14, color: INK,
                textAlign: "left", lineHeight: 1.5,
                background: isSelected ? "rgba(196,154,60,0.12)" : "#fff",
                border: isSelected ? `1.5px solid ${ACCENT}` : "0.5px solid rgba(0,0,0,0.08)",
                borderRadius: 8, padding: "12px 16px", cursor: "pointer",
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
        maxHeight: showRevelation ? 300 : 0, overflow: "hidden",
        opacity: showRevelation ? 1 : 0,
        transition: "max-height 400ms ease, opacity 300ms ease 100ms",
      }}>
        <div style={{
          marginTop: 20, padding: "16px 18px",
          background: "rgba(196,154,60,0.06)",
          borderLeft: `3px solid ${ACCENT}`, borderRadius: 6,
        }}>
          <p style={{ fontFamily: sans, fontSize: 13, color: "rgba(20,20,16,0.6)", lineHeight: 1.65, margin: 0 }}>
            {q.subtext}
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
          onClick={advance} disabled={!hasAnswer}
          style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "1px",
            textTransform: "uppercase", fontWeight: 500,
            color: ACCENT, background: "none",
            border: `1px solid ${ACCENT}`, borderRadius: 6,
            padding: "10px 24px", cursor: hasAnswer ? "pointer" : "default",
            opacity: hasAnswer ? 1 : 0.4, transition: "opacity 150ms ease",
            pointerEvents: hasAnswer ? "auto" : "none",
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

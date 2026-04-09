"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { QUIZ_QUESTIONS, scoreQuiz, type QuizResult } from "../../../lib/quizScoring"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const ACCENT = "#C49A3C"
const INK    = "#1a1a18"

export function OralSnapshot() {
  const [step, setStep] = useState(0)
  // Selections per question: { questionId: [selectedValue] } (single-select, array for compat)
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [showRevelation, setShowRevelation] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [multiConfirmed, setMultiConfirmed] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const revelRef = useRef<HTMLDivElement>(null)

  // Compute visible questions based on current selections (for showIf support)
  const visibleQuestions = useMemo(() => {
    return QUIZ_QUESTIONS.filter(q => {
      if (!q.showIf) return true
      const parentSelections = selections[q.showIf.questionId] ?? []
      return parentSelections.includes(q.showIf.value)
    })
  }, [selections])

  const q = visibleQuestions[step]
  const isLastQuestion = step === visibleQuestions.length - 1
  const currentSelections = selections[q?.id] ?? []
  const hasAnswer = currentSelections.length > 0

  // Clamp step if visible questions shrink (e.g. user deselects female)
  useEffect(() => {
    if (step >= visibleQuestions.length && visibleQuestions.length > 0) {
      setStep(visibleQuestions.length - 1)
    }
  }, [visibleQuestions.length, step])

  // Reset revelation when step changes
  useEffect(() => {
    setShowRevelation(false)
    setShowNext(false)
    setMultiConfirmed(false)
  }, [step])

  // Show revelation after answer is selected (single-select only — multi waits for Done)
  useEffect(() => {
    if (!hasAnswer) return
    if (q?.multiSelect && !multiConfirmed) return // multi-select waits for Done tap
    const t1 = setTimeout(() => setShowRevelation(true), 200)
    const t2 = setTimeout(() => setShowNext(true), 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [hasAnswer, step, multiConfirmed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Detect "None of the above" options (0 points, empty tags, label contains "None")
  const noneValues = useMemo(() => {
    return new Set(
      QUIZ_QUESTIONS.flatMap(question =>
        question.options
          .filter(o => o.points === 0 && o.tags.length === 0 && /none/i.test(o.label))
          .map(o => o.value)
      )
    )
  }, [])

  function selectOption(value: string) {
    if (q.multiSelect) {
      const current = selections[q.id] ?? []
      const isNone = noneValues.has(value)

      if (isNone) {
        // "None of the above" — exclusive: deselect everything else, select only this
        setSelections(s => ({ ...s, [q.id]: [value] }))
      } else {
        // Regular option — remove any "none" option, then toggle this one
        const withoutNone = current.filter(v => !noneValues.has(v))
        const next = withoutNone.includes(value)
          ? withoutNone.filter(v => v !== value)
          : [...withoutNone, value]
        setSelections(s => ({ ...s, [q.id]: next }))
      }
    } else {
      // Single-select: replace previous selection
      setSelections(s => ({ ...s, [q.id]: [value] }))
    }
  }

  function confirmMultiSelect() {
    setMultiConfirmed(true)
  }

  function advance() {
    if (isLastQuestion) {
      // Flatten all selected values across all questions (only visible ones)
      const visibleIds = new Set(visibleQuestions.map(vq => vq.id))
      const allSelected = Object.entries(selections)
        .filter(([id]) => visibleIds.has(id))
        .flatMap(([, vals]) => vals)
      setResult(scoreQuiz(allSelected))
    } else {
      setStep(s => s + 1)
    }
  }

  async function handleSubmit() {
    if (!email.includes("@") || !result) return
    setSubmitting(true)
    try {
      const visibleIds = new Set(visibleQuestions.map(vq => vq.id))
      const allSelected = Object.entries(selections)
        .filter(([id]) => visibleIds.has(id))
        .flatMap(([, vals]) => vals)
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
            background: "#0A0A0A", borderRadius: 10,
            border: "0.5px solid rgba(255,255,255,0.1)",
            padding: "24px 24px 20px", marginBottom: 28,
          }}>
            <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 400, color: "#ffffff", margin: "0 0 8px" }}>
              Enter your email for your assessment.
            </p>
            <p style={{ fontFamily: sans, fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: "0 0 16px" }}>
              We&rsquo;ll send your personalized signal profile and early access details.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{
                  flex: 1, fontFamily: sans, fontSize: 14, padding: "10px 14px",
                  borderRadius: 6, border: "0.5px solid rgba(255,255,255,0.12)",
                  outline: "none", background: "#111111", color: "#ffffff",
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
                <p style={{ fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0 }}>
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
        <div style={{ flex: 1, height: 2, borderRadius: 1, background: "rgba(255,255,255,0.1)" }}>
          <div style={{
            height: "100%", borderRadius: 1, background: ACCENT,
            width: `${((step + 1) / visibleQuestions.length) * 100}%`,
            transition: "width 300ms ease",
          }} />
        </div>
        <span style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
          {step + 1}/{visibleQuestions.length}
        </span>
      </div>

      {/* Question */}
      <h3 style={{
        fontFamily: serif, fontSize: 22, fontWeight: 400,
        color: "#ffffff", lineHeight: 1.3, margin: "0 0 24px", textAlign: "left",
      }}>
        {q.question}
      </h3>

      {/* Options — single-select */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
        {q.options.map(opt => {
          const isSelected = currentSelections.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => selectOption(opt.value)}
              style={{
                fontFamily: sans, fontSize: 14, color: "#ffffff",
                textAlign: "left", lineHeight: 1.5,
                background: isSelected ? "rgba(196,154,60,0.15)" : "#0A0A0A",
                border: isSelected ? `1.5px solid ${ACCENT}` : "0.5px solid rgba(255,255,255,0.1)",
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
          background: "rgba(196,154,60,0.08)",
          borderLeft: `3px solid ${ACCENT}`, borderRadius: 6,
        }}>
          <p style={{ fontFamily: sans, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>
            {q.subtext}
          </p>
        </div>
      </div>

      {/* Done button — multi-select only, before reveal */}
      {q.multiSelect && !multiConfirmed && (
        <div style={{
          marginTop: 20,
          opacity: hasAnswer ? 1 : 0,
          transform: hasAnswer ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 250ms ease, transform 250ms ease",
          textAlign: "right",
        }}>
          <button
            onClick={confirmMultiSelect} disabled={!hasAnswer}
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
            Done &rarr;
          </button>
        </div>
      )}

      {/* Next button — shows after reveal (single-select: after selection, multi-select: after Done) */}
      {(!q.multiSelect || multiConfirmed) && (
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
      )}

      <style>{`
        @keyframes quizFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

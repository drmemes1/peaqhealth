"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { V2_QUESTIONS, getV2QuestionCount } from "../../../lib/questionnaire/v2-questions"
import { ExplanationBox, UnitToggle, RadioOption, CheckboxOption, QuestionScreen, QuestionNavigation } from "../../components/questionnaire/v2"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const TOTAL = getV2QuestionCount()

function feetInchesToCm(ft: number, inches: number): number {
  return (ft * 12 + inches) * 2.54
}

function lbsToKg(lbs: number): number {
  return lbs * 0.453592
}

function inchesToCm(inches: number): number {
  return inches * 2.54
}

export function QuestionnaireV2Client() {
  const router = useRouter()
  const [step, setStep] = useState(-1) // -1 = intro, 0-41 = questions, 42 = complete
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [units, setUnits] = useState<"imperial" | "metric">("imperial")

  // Temp state for height ft/in inputs
  const [heightFt, setHeightFt] = useState<number>(5)
  const [heightIn, setHeightIn] = useState<number>(10)
  const [weightLbs, setWeightLbs] = useState<number>(170)
  const [neckIn, setNeckIn] = useState<number>(15)

  // Load saved answers on mount
  useEffect(() => {
    fetch("/api/questionnaire/v2")
      .then(r => r.json())
      .then(data => {
        if (data.answers) {
          setAnswers(data.answers)
          if (data.answers.preferred_units) setUnits(data.answers.preferred_units as "imperial" | "metric")
          if (data.answers.height_cm) {
            const totalIn = Number(data.answers.height_cm) / 2.54
            setHeightFt(Math.floor(totalIn / 12))
            setHeightIn(Math.round(totalIn % 12))
          }
          if (data.answers.weight_kg) setWeightLbs(Math.round(Number(data.answers.weight_kg) / 0.453592))
          if (data.answers.neck_circumference_inches) setNeckIn(Number(data.answers.neck_circumference_inches))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const saveAnswer = useCallback(async (field: string, value: unknown) => {
    setSaving(true)
    setAnswers(prev => ({ ...prev, [field]: value }))
    try {
      await fetch("/api/questionnaire/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      })
    } catch { /* silent */ }
    setSaving(false)
  }, [])

  const finalize = useCallback(async () => {
    await fetch("/api/questionnaire/v2", { method: "PUT" })
    setStep(TOTAL)
  }, [])

  // Filter out conditional questions whose condition isn't met
  const visibleQuestions = V2_QUESTIONS.filter(q => {
    if (!q.conditionalOn) return true
    const depVal = answers[q.conditionalOn.field]
    if (Array.isArray(depVal)) return !depVal.includes(q.conditionalOn.notEquals)
    return depVal !== q.conditionalOn.notEquals && depVal != null
  })

  const currentQ = step >= 0 && step < visibleQuestions.length ? visibleQuestions[step] : null
  const currentAnswer = currentQ ? answers[currentQ.dbCol] : null
  const canProceed = currentQ ? currentAnswer != null && currentAnswer !== "" : true

  const handleNext = () => {
    if (step === visibleQuestions.length - 1) {
      finalize()
    } else {
      setStep(s => Math.min(s + 1, visibleQuestions.length))
    }
  }

  const handleBack = () => setStep(s => Math.max(s - 1, -1))

  const handleSave = () => {
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div style={{ background: "#EDEAE1", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: sans, fontSize: 14, color: "#8C897F" }}>Loading your questionnaire...</p>
      </div>
    )
  }

  // ── INTRO SCREEN ──
  if (step === -1) {
    return (
      <div style={{ background: "#EDEAE1", minHeight: "100vh", padding: "24px 16px 60px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{
            background: "#FAFAF8", border: "1px solid #D6D3C8",
            borderRadius: 20, padding: "36px 36px 28px",
            minHeight: 460, display: "flex", flexDirection: "column",
          }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: serif, fontSize: 40, fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.015em", marginBottom: 4 }}>
                Help us <em style={{ fontStyle: "italic", color: "#5A5750" }}>understand you</em>
              </h1>
              <p style={{ fontSize: 14, color: "#8C897F", lineHeight: 1.55, maxWidth: 440, marginBottom: 24 }}>
                A handful of questions so your results read like insights from a doctor who actually knows you — not generic ranges pulled from a textbook.
              </p>
            </div>

            <div style={{
              fontFamily: serif, fontStyle: "italic", fontSize: 17, lineHeight: 1.55,
              color: "#4A4740", padding: "20px 24px", background: "#F4F1E8",
              borderRadius: 14, marginBottom: 24, borderLeft: "3px solid #B8935A",
            }}>
              The bacteria in your mouth tell part of the story. Your lifestyle, medications, and symptoms tell the other half.
              When we can see both, we can tell you exactly why something is happening and <strong style={{ fontStyle: "normal", color: "#2C2A24", fontWeight: 600 }}>what to do about it</strong>.
              Without your answers, we're just reading numbers.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {[
                { icon: "①", text: <><strong style={{ color: "#2C2A24", fontWeight: 600 }}>About 7 minutes</strong> — you can pause and come back anytime.</> },
                { icon: "②", text: <>Your answers <strong style={{ color: "#2C2A24", fontWeight: 600 }}>shape every recommendation</strong> — not just a score, but the specific actions we suggest.</> },
                { icon: "③", text: <><strong style={{ color: "#2C2A24", fontWeight: 600 }}>Nothing is shared.</strong> This stays between you and your data.</> },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5, color: "#4A4740" }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", background: "#EDEAE1",
                    border: "1px solid #B8935A", color: "#B8935A",
                    display: "grid", placeItems: "center",
                    fontFamily: serif, fontStyle: "italic", fontSize: 11, fontWeight: 600,
                    flexShrink: 0, marginTop: 1,
                  }}>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: "auto", paddingTop: 24, borderTop: "1px solid #D6D3C8",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <button disabled style={{ opacity: 0.4, padding: "12px 24px", background: "transparent", border: "1px solid #D6D3C8", borderRadius: 10, fontFamily: sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C897F", cursor: "not-allowed" }}>
                ← Back
              </button>
              <button onClick={() => setStep(0)} style={{
                padding: "12px 24px", background: "#2C2A24", color: "#EDEAE1",
                border: "1px solid #2C2A24", borderRadius: 10,
                fontFamily: sans, fontSize: 12, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              }}>
                Begin →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── COMPLETE SCREEN ──
  if (step >= TOTAL || step >= visibleQuestions.length) {
    return (
      <div style={{ background: "#EDEAE1", minHeight: "100vh", padding: "24px 16px 60px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{
            background: "#FAFAF8", border: "1px solid #D6D3C8",
            borderRadius: 20, padding: "36px 36px 28px",
            minHeight: 460, display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8C897F", fontWeight: 500, marginBottom: 24, fontFamily: sans }}>
              <span style={{ color: "#B8935A", fontWeight: 600 }}>Complete</span>
              <span>{TOTAL} / {TOTAL}</span>
            </div>
            <div style={{ height: 3, background: "#E6E2D4", borderRadius: 2, overflow: "hidden", marginBottom: 28 }}>
              <div style={{ height: "100%", background: "#2C2A24", borderRadius: 2, width: "100%" }} />
            </div>

            <h1 style={{ fontFamily: serif, fontSize: 40, fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.015em", marginBottom: 4 }}>
              Thank you — <em style={{ fontStyle: "italic", color: "#5A5750" }}>that&rsquo;s everything.</em>
            </h1>
            <p style={{ fontSize: 14, color: "#8C897F", lineHeight: 1.55, maxWidth: 440, marginBottom: 24 }}>
              Your answers are saved. When your sample results come in, they&rsquo;ll be read against this context — not generic ranges.
            </p>

            <div style={{
              fontFamily: serif, fontStyle: "italic", fontSize: 17, lineHeight: 1.55,
              color: "#4A4740", padding: "20px 24px", background: "#F4F1E8",
              borderRadius: 14, marginBottom: 24, borderLeft: "3px solid #B8935A",
            }}>
              Based on what you told us, we already know what to watch for in your results.
              The bacterial data will fill in the rest.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 13, color: "#4A4740" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#EDEAE1", border: "1px solid #B8935A", color: "#B8935A", display: "grid", placeItems: "center", fontFamily: serif, fontStyle: "italic", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>→</span>
                <span>You&rsquo;ll get a notification when your results are ready.</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 13, color: "#4A4740" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#EDEAE1", border: "1px solid #B8935A", color: "#B8935A", display: "grid", placeItems: "center", fontFamily: serif, fontStyle: "italic", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>↻</span>
                <span>You can update your answers anytime — we&rsquo;ll re-run the interpretation.</span>
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: 24, borderTop: "1px solid #D6D3C8", display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(0)} style={{ padding: "12px 24px", background: "transparent", border: "1px solid #D6D3C8", borderRadius: 10, fontFamily: sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C897F", cursor: "pointer" }}>
                ← Review answers
              </button>
              <button onClick={() => router.push("/dashboard")} style={{
                padding: "12px 24px", background: "#2C2A24", color: "#EDEAE1",
                border: "1px solid #2C2A24", borderRadius: 10,
                fontFamily: sans, fontSize: 12, fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              }}>
                Return to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── QUESTION SCREEN ──
  if (!currentQ) return null

  const handleChoiceSelect = (value: string) => {
    saveAnswer(currentQ.dbCol, value)
  }

  const handleMultiSelect = (value: string) => {
    const current = (answers[currentQ.dbCol] as string[]) ?? []
    if (value === "none") {
      saveAnswer(currentQ.dbCol, ["none"])
    } else {
      const without = current.filter(v => v !== "none" && v !== value)
      const next = current.includes(value) ? without : [...without, value]
      saveAnswer(currentQ.dbCol, next.length > 0 ? next : ["none"])
    }
  }

  const renderQuestion = () => {
    const q = currentQ

    if (q.type === "choice") {
      return (
        <>
          <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, lineHeight: 1.25, marginBottom: 8, letterSpacing: "-0.005em" }}>{q.question}</h2>
          <p style={{ fontSize: 13, color: "#8C897F", marginBottom: 22, lineHeight: 1.55 }}>{q.helper}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {q.options?.map(opt => (
              <RadioOption
                key={opt.value}
                label={opt.label}
                sublabel={opt.sub}
                selected={currentAnswer === opt.value}
                onSelect={() => handleChoiceSelect(opt.value)}
              />
            ))}
          </div>
          {currentAnswer != null && q.explanation && (
            <ExplanationBox label={q.explanation.label}>
              <span dangerouslySetInnerHTML={{ __html: q.explanation.body.replace(/<strong>/g, '<strong style="font-weight:600;color:#2C2A24">') }} />
            </ExplanationBox>
          )}
        </>
      )
    }

    if (q.type === "multi") {
      const selected = (answers[q.dbCol] as string[]) ?? []
      return (
        <>
          <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, lineHeight: 1.25, marginBottom: 8 }}>{q.question}</h2>
          <p style={{ fontSize: 13, color: "#8C897F", marginBottom: 22, lineHeight: 1.55 }}>{q.helper}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {q.options?.map(opt => (
              <CheckboxOption
                key={opt.value}
                label={opt.label}
                sublabel={opt.sub}
                selected={selected.includes(opt.value)}
                onSelect={() => handleMultiSelect(opt.value)}
              />
            ))}
          </div>
          {selected.length > 0 && q.explanation && (
            <ExplanationBox label={q.explanation.label}>
              <span dangerouslySetInnerHTML={{ __html: q.explanation.body.replace(/<strong>/g, '<strong style="font-weight:600;color:#2C2A24">') }} />
            </ExplanationBox>
          )}
        </>
      )
    }

    if (q.type === "number_pair" && q.id === "q3") {
      return (
        <>
          <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, lineHeight: 1.25, marginBottom: 8 }}>{q.question}</h2>
          <p style={{ fontSize: 13, color: "#8C897F", marginBottom: 22, lineHeight: 1.55 }}>{q.helper}</p>
          {q.unitToggle && (
            <UnitToggle value={units === "imperial" ? "ft / in" : "cm"} onChange={(v) => { setUnits(v === "cm" ? "metric" : "imperial"); saveAnswer("preferred_units", v === "cm" ? "metric" : "imperial") }} options={["ft / in", "cm"]} />
          )}
          {units === "imperial" ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input type="number" value={heightFt} onChange={e => { setHeightFt(Number(e.target.value)); const cm = feetInchesToCm(Number(e.target.value), heightIn); saveAnswer("height_cm", Math.round(cm * 10) / 10) }}
                style={{ flex: 1, maxWidth: 80, padding: "14px 16px", background: "#FFF", border: "1px solid #D6D3C8", borderRadius: 10, fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", textAlign: "center" }} />
              <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#8C897F", alignSelf: "center" }}>ft</span>
              <input type="number" value={heightIn} onChange={e => { setHeightIn(Number(e.target.value)); const cm = feetInchesToCm(heightFt, Number(e.target.value)); saveAnswer("height_cm", Math.round(cm * 10) / 10) }}
                style={{ flex: 1, maxWidth: 80, padding: "14px 16px", background: "#FFF", border: "1px solid #D6D3C8", borderRadius: 10, fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", textAlign: "center" }} />
              <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#8C897F", alignSelf: "center" }}>in</span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input type="number" value={Math.round(feetInchesToCm(heightFt, heightIn))} onChange={e => { const cm = Number(e.target.value); const totalIn = cm / 2.54; setHeightFt(Math.floor(totalIn / 12)); setHeightIn(Math.round(totalIn % 12)); saveAnswer("height_cm", cm) }}
                style={{ flex: 1, padding: "14px 16px", background: "#FFF", border: "1px solid #D6D3C8", borderRadius: 10, fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", textAlign: "center" }} />
              <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#8C897F", alignSelf: "center" }}>cm</span>
            </div>
          )}
          {answers.height_cm != null && q.explanation && (
            <ExplanationBox label={q.explanation.label}>
              <span dangerouslySetInnerHTML={{ __html: q.explanation.body }} />
            </ExplanationBox>
          )}
        </>
      )
    }

    if (q.type === "number") {
      const isWeight = q.id === "q4"
      const isNeck = q.id === "q5"
      const isAge = q.id === "q1"

      return (
        <>
          <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 500, lineHeight: 1.25, marginBottom: 8 }}>{q.question}</h2>
          <p style={{ fontSize: 13, color: "#8C897F", marginBottom: 22, lineHeight: 1.55 }}>{q.helper}</p>
          {q.unitToggle && (
            <UnitToggle
              value={units === "imperial" ? (q.numberConfig?.imperialUnit ?? "imperial") : (q.numberConfig?.metricUnit ?? "metric")}
              onChange={(v) => { const isMetric = v === (q.numberConfig?.metricUnit ?? "metric"); setUnits(isMetric ? "metric" : "imperial"); saveAnswer("preferred_units", isMetric ? "metric" : "imperial") }}
              options={[q.numberConfig?.imperialUnit ?? "imperial", q.numberConfig?.metricUnit ?? "metric"]}
            />
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              step={q.numberConfig?.step ?? 1}
              value={isWeight ? (units === "imperial" ? weightLbs : Math.round(lbsToKg(weightLbs))) : isNeck ? (units === "imperial" ? neckIn : Math.round(inchesToCm(neckIn))) : (currentAnswer as string | number ?? "")}
              onChange={e => {
                const v = Number(e.target.value)
                if (isWeight) {
                  if (units === "imperial") { setWeightLbs(v); saveAnswer("weight_kg", Math.round(lbsToKg(v) * 10) / 10) }
                  else { setWeightLbs(Math.round(v / 0.453592)); saveAnswer("weight_kg", v) }
                } else if (isNeck) {
                  if (units === "imperial") { setNeckIn(v); saveAnswer("neck_circumference_inches", v) }
                  else { setNeckIn(Math.round(v / 2.54 * 10) / 10); saveAnswer("neck_circumference_inches", Math.round(v / 2.54 * 10) / 10) }
                } else if (isAge) {
                  saveAnswer(q.dbCol, v)
                } else {
                  saveAnswer(q.dbCol, v)
                }
              }}
              style={{ flex: 1, padding: "14px 16px", background: "#FFF", border: "1px solid #D6D3C8", borderRadius: 10, fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", textAlign: "center", fontVariantNumeric: "tabular-nums" }}
            />
            <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#8C897F", alignSelf: "center", padding: "0 4px" }}>
              {isWeight ? (units === "imperial" ? "lbs" : "kg") : isNeck ? (units === "imperial" ? "in" : "cm") : q.numberConfig?.unit}
            </span>
          </div>
          {currentAnswer != null && q.explanation && (
            <ExplanationBox label={q.explanation.label}>
              <span dangerouslySetInnerHTML={{ __html: q.explanation.body }} />
            </ExplanationBox>
          )}
        </>
      )
    }

    return null
  }

  return (
    <div style={{ background: "#EDEAE1", minHeight: "100vh", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <QuestionScreen
          sectionName={currentQ.section}
          questionNumber={step + 1}
          totalQuestions={TOTAL}
          tag={currentQ.tag}
        >
          {renderQuestion()}
          <QuestionNavigation
            onBack={handleBack}
            onNext={handleNext}
            onSave={handleSave}
            isFirst={step === 0}
            isLast={step === visibleQuestions.length - 1}
            canProceed={canProceed}
          />
        </QuestionScreen>
      </div>
      {saving && (
        <div style={{ position: "fixed", bottom: 16, right: 16, fontFamily: sans, fontSize: 11, color: "#8C897F", background: "#FAFAF8", border: "1px solid #D6D3C8", borderRadius: 8, padding: "6px 12px" }}>
          Saving...
        </div>
      )}
    </div>
  )
}

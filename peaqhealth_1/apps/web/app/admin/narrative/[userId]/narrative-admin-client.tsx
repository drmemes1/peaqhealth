"use client"

import { useState } from "react"
import type { UserSituation } from "../../../../lib/narrative/situationModel"
import type { NarrativeResult, ValidationResult } from "../../../../lib/narrative/generateNarrative"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const STATUS_COLOR: Record<string, string> = { strong: "#4A7A4A", watch: "#B8860B", attention: "#9B3838" }

export function NarrativeAdminClient({ situation }: { situation: UserSituation }) {
  const [narrative, setNarrative] = useState<NarrativeResult | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showJson, setShowJson] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/narrative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: situation.identity.userId }),
      })
      const data = await res.json()
      setNarrative(data.narrative)
      setValidation(data.validation)
    } catch (err) {
      console.error("Generation failed:", err)
    }
    setLoading(false)
  }

  const firedPatterns = situation.patterns.filter(p => p.fired)

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px", background: "#F5F3EE" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#B8860B" }}>ADMIN — NARRATIVE ENGINE PHASE 1</span>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 500, color: "#2C2A24", margin: "8px 0 4px" }}>
          {situation.identity.displayName}&rsquo;s Narrative
        </h1>
        <p style={{ fontFamily: sans, fontSize: 13, color: "#8C897F" }}>
          {situation.identity.age ? `Age ${situation.identity.age}` : ""} {situation.identity.sex ?? ""}
          {" · "}Oral: {situation.oral.hasData ? "✓" : "—"} · Blood: {situation.blood.hasData ? "✓" : "—"} · Sleep: {situation.sleep.hasData ? "✓" : "—"}
        </p>
      </div>

      {/* Patterns */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {firedPatterns.map(p => (
          <span key={p.id} style={{
            fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
            padding: "4px 12px", borderRadius: 20,
            background: `${STATUS_COLOR[p.category] ?? "#8C897F"}14`,
            color: STATUS_COLOR[p.category] ?? "#8C897F",
            border: `1px solid ${STATUS_COLOR[p.category] ?? "#8C897F"}30`,
          }}>
            {p.label}
          </span>
        ))}
        {firedPatterns.length === 0 && <span style={{ fontFamily: sans, fontSize: 12, color: "#8C897F" }}>No patterns fired</span>}
      </div>

      {/* Generate button */}
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        <button onClick={generate} disabled={loading} style={{
          fontFamily: sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "12px 24px", borderRadius: 8, border: "none", cursor: loading ? "default" : "pointer",
          background: loading ? "#B0A896" : "#2C2A24", color: "#F5F3EE",
        }}>
          {loading ? "Generating..." : "Generate Narrative"}
        </button>
        {narrative && (
          <button onClick={() => {
            const blob = new Blob([JSON.stringify({ situation, narrative, validation }, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a"); a.href = url; a.download = `narrative-${situation.identity.userId.slice(0, 8)}.json`; a.click()
          }} style={{
            fontFamily: sans, fontSize: 12, padding: "12px 24px", borderRadius: 8,
            border: "1px solid #D6D3C8", background: "transparent", color: "#8C897F", cursor: "pointer",
          }}>
            Download JSON
          </button>
        )}
      </div>

      {narrative && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
          {/* Main narrative */}
          <div>
            {/* Headline */}
            <div style={{ background: "#2C2A24", borderRadius: 14, padding: "24px 28px", marginBottom: 16 }}>
              <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(184,134,11,0.8)" }}>THE COMPLETE PICTURE</span>
              <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: "#F5F3EE", margin: "8px 0 0", lineHeight: 1.3 }}>{narrative.headline}</h2>
            </div>

            {/* Complete picture */}
            <div style={{ background: "#FAFAF8", border: "1px solid #E8E4D8", borderRadius: 14, padding: "24px 28px", marginBottom: 16 }}>
              <p style={{ fontFamily: serif, fontSize: 16, lineHeight: 1.7, color: "#3D3B35", margin: 0 }}>{narrative.completePicture}</p>
            </div>

            {/* Cross-panel cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {(["oral", "blood", "sleep"] as const).map(panel => (
                <div key={panel} style={{ background: "#FAFAF8", border: "1px solid #E8E4D8", borderRadius: 10, padding: "16px 18px" }}>
                  <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#B8860B" }}>{panel}</span>
                  <p style={{ fontFamily: sans, fontSize: 13, color: "#4A4740", lineHeight: 1.5, margin: "6px 0 0" }}>
                    {narrative.crossPanelSummary[panel]}
                  </p>
                </div>
              ))}
            </div>

            {/* Next steps */}
            {(narrative.nextSteps.actions.length > 0 || narrative.nextSteps.retests.length > 0) && (
              <div style={{ background: "#FAFAF8", border: "1px solid #E8E4D8", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#B8860B", display: "block", marginBottom: 10 }}>NEXT STEPS</span>
                {narrative.nextSteps.actions.map((a, i) => (
                  <p key={i} style={{ fontFamily: sans, fontSize: 13, color: "#4A4740", margin: "0 0 8px" }}>
                    <strong style={{ color: "#2C2A24" }}>{a.what}</strong> — {a.when}. {a.why}
                  </p>
                ))}
                {narrative.nextSteps.retests.map((r, i) => (
                  <p key={i} style={{ fontFamily: sans, fontSize: 13, color: "#8C897F", margin: "0 0 8px" }}>
                    Retest: {r.what} — {r.when}. {r.why}
                  </p>
                ))}
              </div>
            )}

            {/* Metadata */}
            <p style={{ fontFamily: sans, fontSize: 10, color: "#A8A59B" }}>
              Generated {narrative.generatedAt} · {narrative.modelVersion} · {narrative.tokenUsage.total} tokens
            </p>
          </div>

          {/* Validation sidebar */}
          <div>
            <div style={{ background: "#FAFAF8", border: "1px solid #E8E4D8", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
              <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: validation?.valid ? "#4A7A4A" : "#9B3838" }}>
                VALIDATION {validation?.valid ? "✓ PASSED" : "⚠ REVIEW NEEDED"}
              </span>
              {validation?.unverifiedNumbers.length ? (
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontFamily: sans, fontSize: 11, color: "#9B3838", fontWeight: 600 }}>Unverified numbers:</span>
                  {validation.unverifiedNumbers.map((n, i) => (
                    <span key={i} style={{ display: "inline-block", fontFamily: sans, fontSize: 11, color: "#9B3838", background: "rgba(155,56,56,0.08)", padding: "2px 8px", borderRadius: 4, margin: "4px 4px 0 0" }}>{n}</span>
                  ))}
                </div>
              ) : null}
              {validation?.warnings.map((w, i) => (
                <p key={i} style={{ fontFamily: sans, fontSize: 11, color: "#946F1B", margin: "6px 0 0" }}>⚠ {w}</p>
              ))}
            </div>

            {/* Evidence refs */}
            <div style={{ background: "#FAFAF8", border: "1px solid #E8E4D8", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
              <span style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8C897F" }}>EVIDENCE CITED</span>
              {narrative.evidenceReferences.map((r, i) => (
                <p key={i} style={{ fontFamily: sans, fontSize: 11, color: "#4A4740", margin: "6px 0 0" }}>{r}</p>
              ))}
            </div>

            {/* Raw JSON toggle */}
            <button onClick={() => setShowJson(!showJson)} style={{
              fontFamily: sans, fontSize: 11, color: "#8C897F", background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>
              {showJson ? "Hide raw JSON" : "Show raw JSON"}
            </button>
            {showJson && (
              <pre style={{ fontFamily: "monospace", fontSize: 10, background: "#2C2A24", color: "#F5F3EE", padding: 16, borderRadius: 10, marginTop: 8, overflow: "auto", maxHeight: 400 }}>
                {JSON.stringify({ situation, narrative, validation }, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

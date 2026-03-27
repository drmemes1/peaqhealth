"use client"
import React, { useState } from "react"
import type { OralScore, OralFinding } from "@peaq/score-engine"

interface OralInsightsProps {
  oralScore: OralScore | null
  kitStatus?: string | null
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH:     "#B8860B",
  MEDIUM:   "rgba(20,20,16,0.6)",
  LOW:      "rgba(20,20,16,0.4)",
  POSITIVE: "#2D6A4F",
}

const PRIORITY_BG: Record<string, string> = {
  CRITICAL: "rgba(220,38,38,0.06)",
  HIGH:     "rgba(184,134,11,0.06)",
  MEDIUM:   "rgba(20,20,16,0.03)",
  LOW:      "rgba(20,20,16,0.02)",
  POSITIVE: "rgba(45,106,79,0.06)",
}

const PRIORITY_BORDER: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH:     "#B8860B",
  MEDIUM:   "rgba(20,20,16,0.15)",
  LOW:      "rgba(20,20,16,0.1)",
  POSITIVE: "#2D6A4F",
}

const WATCH_LABELS: Record<string, { label: string; citation: string }> = {
  systemicInflammationSignal:   { label: "Systemic inflammation signal (P. gingivalis)", citation: "Hussain M, et al. Frontiers Immunology. 2023." },
  metabolicDysbiosisSignal:     { label: "Metabolic dysbiosis signal", citation: "Hajishengallis G. Nature Reviews. 2015." },
  autoimmuneInflammationSignal: { label: "Inflammatory periodontal burden", citation: "Hajishengallis G. Nature Reviews Immunology. 2015." },
  gutOralAxisSignal:            { label: "Oral-gut axis signal (F. nucleatum)", citation: "Castellarin M, et al. Genome Research. 2012." },
}

function FindingCard({ finding }: { finding: OralFinding }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{
      background: PRIORITY_BG[finding.priority],
      borderLeft: `3px solid ${PRIORITY_BORDER[finding.priority]}`,
      borderRadius: "0 4px 4px 0",
      padding: "14px 16px",
    }}>
      <div
        style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, cursor: "pointer", marginBottom: 8 }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em",
            color: PRIORITY_COLORS[finding.priority], fontWeight: 600, flexShrink: 0,
          }}>{finding.priority}</span>
          <span style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 16, color: "var(--ink)", lineHeight: 1.3,
          }}>{finding.title}</span>
        </div>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "rgba(20,20,16,0.3)", flexShrink: 0 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Action — always visible */}
      <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.5 }}>
        → {finding.action}
      </p>

      {/* Body — expanded only */}
      {expanded && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "rgba(20,20,16,0.65)", margin: "0 0 8px", lineHeight: 1.6 }}>
            {finding.body}
          </p>
          <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "rgba(20,20,16,0.55)", margin: "0 0 6px", lineHeight: 1.5 }}>
            Impact: {finding.impact}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "rgba(20,20,16,0.35)", margin: 0 }}>
              {finding.citation}
            </p>
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "rgba(20,20,16,0.4)", flexShrink: 0 }}>
              Retest in {finding.retestDays} days
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function OralInsights({ oralScore, kitStatus }: OralInsightsProps) {
  const [showSpecies, setShowSpecies] = useState(false)

  if (!oralScore) {
    // No kit ordered / kit pending
    if (!kitStatus || kitStatus === 'ordered' || kitStatus === 'shipped' || kitStatus === 'registered') {
      return (
        <div style={{ padding: "16px 0", color: "rgba(20,20,16,0.4)", fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13 }}>
          {kitStatus === 'registered' || kitStatus === 'shipped'
            ? "Kit registered. Mail your swab in the prepaid envelope — results in 10–14 days."
            : "No oral kit data yet."}
        </div>
      )
    }
    if (kitStatus === 'processing' || kitStatus === 'received_lab' || kitStatus === 'mailed_back') {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#B8860B", display: "inline-block", animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "rgba(20,20,16,0.5)" }}>
            Your sample is being sequenced. Results arrive in 10–14 days.
          </span>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Mouthwash banner */}
      {oralScore.mouthwashDetected && (
        <div style={{
          background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.3)",
          borderRadius: 6, padding: "14px 16px",
        }}>
          <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, fontWeight: 600, color: "#B8860B", margin: "0 0 6px" }}>
            ⚠ Antiseptic mouthwash detected
          </p>
          <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, color: "rgba(20,20,16,0.6)", margin: "0 0 8px", lineHeight: 1.5 }}>
            Stop mouthwash → retest in 14 days → see your score change.
          </p>
          <a href="/kit/register" style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "#B8860B", textDecoration: "underline" }}>
            Order a retest kit
          </a>
        </div>
      )}

      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[
          { label: "Shannon", value: oralScore.shannonDiversity.toFixed(2), sub: `${oralScore.shannonSub}/8 pts` },
          { label: "Nitrate", value: `${oralScore.nitrateReducerPct.toFixed(1)}%`, sub: `${oralScore.nitrateSub}/7 pts` },
          { label: "P. gingivalis", value: `${oralScore.pGingivalisPct.toFixed(2)}%`, sub: `${oralScore.periodontalSub}/7 pts` },
          { label: "Protective", value: `${oralScore.protectivePct?.toFixed(1) ?? "—"}%`, sub: `${oralScore.osaSub}/5 pts` },
        ].map(item => (
          <div key={item.label} style={{ background: "rgba(20,20,16,0.03)", borderRadius: 4, padding: "10px 12px" }}>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(20,20,16,0.4)", margin: "0 0 4px" }}>{item.label}</p>
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, color: "var(--ink)", margin: "0 0 2px" }}>{item.value}</p>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, color: "rgba(20,20,16,0.35)", margin: 0 }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Findings */}
      {oralScore.findings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {oralScore.findings.map(f => <FindingCard key={f.id} finding={f} />)}
        </div>
      )}

      {/* Top species (collapsible) */}
      {oralScore.topSpecies.length > 0 && (
        <div>
          <button
            onClick={() => setShowSpecies(s => !s)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "rgba(20,20,16,0.4)", textDecoration: "underline" }}
          >
            {showSpecies ? "Hide" : "View"} your top {oralScore.topSpecies.length} species →
          </button>
          {showSpecies && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {oralScore.topSpecies.map(sp => (
                <div key={sp.species} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "0.5px solid rgba(20,20,16,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: sp.category === 'protective' ? "#2D6A4F" : sp.category === 'pathogenic' ? "#C0392B" : "rgba(20,20,16,0.2)",
                    }} />
                    <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--ink)", fontStyle: "italic" }}>{sp.species}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 60, height: 3, borderRadius: 2, background: "rgba(20,20,16,0.08)", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, sp.abundance * 4)}%`, height: "100%", background: sp.category === 'protective' ? "#2D6A4F" : sp.category === 'pathogenic' ? "#C0392B" : "rgba(20,20,16,0.3)", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: "rgba(20,20,16,0.5)", width: 40, textAlign: "right" }}>{sp.abundance.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watch signals */}
      {oralScore.watchSignals && (
        <div>
          <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(20,20,16,0.3)", margin: "0 0 10px" }}>
            Signals we&apos;re tracking
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, opacity: 0.6 }}>
            {(Object.entries(oralScore.watchSignals) as [string, number][])
              .filter(([, v]) => v > 0.05)
              .map(([key, val]) => {
                const info = WATCH_LABELS[key]
                if (!info) return null
                return (
                  <div key={key} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "8px 12px", background: "rgba(20,20,16,0.02)", borderRadius: 4, gap: 12 }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "rgba(20,20,16,0.6)" }}>{info.label}</span>
                      <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, color: "rgba(20,20,16,0.3)", display: "block" }}>Emerging science — not yet scored · {info.citation}</span>
                    </div>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(20,20,16,0.08)", overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ width: `${Math.round(val * 100)}%`, height: "100%", background: val > 0.6 ? "#dc2626" : val > 0.3 ? "#B8860B" : "rgba(20,20,16,0.3)", borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

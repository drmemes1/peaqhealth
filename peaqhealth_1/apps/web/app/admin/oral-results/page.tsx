"use client"
import { useState } from "react"
import Link from "next/link"
import { Logo } from "../../components/logo"

// Inline mock ZymoReport data (taxonomy: Record<taxon, relativeAbundance 0-1>)
const MOCK_REPORTS: Record<string, { taxonomy: Record<string, number> }> = {
  optimal: {
    taxonomy: {
      "Streptococcus salivarius": 0.22,
      "Rothia mucilaginosa": 0.14,
      "Neisseria flavescens": 0.11,
      "Haemophilus parainfluenzae": 0.09,
      "Veillonella parvula": 0.08,
      "Prevotella melaninogenica": 0.06,
      "Fusobacterium nucleatum": 0.03,
      "Actinomyces naeslundii": 0.05,
      "Gemella haemolysans": 0.04,
      "Lachnoanaerobaculum umeaense": 0.04,
      "Streptococcus mitis": 0.07,
      "Porphyromonas gingivalis": 0.0005,
      "Prevotella intermedia": 0.005,
      "Treponema denticola": 0.001,
      "Other": 0.0695,
    },
  },
  average: {
    taxonomy: {
      "Streptococcus salivarius": 0.16,
      "Rothia mucilaginosa": 0.09,
      "Neisseria flavescens": 0.07,
      "Haemophilus parainfluenzae": 0.07,
      "Veillonella parvula": 0.09,
      "Prevotella melaninogenica": 0.08,
      "Fusobacterium nucleatum": 0.06,
      "Actinomyces naeslundii": 0.04,
      "Porphyromonas gingivalis": 0.015,
      "Prevotella intermedia": 0.02,
      "Treponema denticola": 0.01,
      "Tannerella forsythia": 0.01,
      "Streptococcus mutans": 0.04,
      "Other": 0.265,
    },
  },
  dysbiotic: {
    taxonomy: {
      "Porphyromonas gingivalis": 0.09,
      "Treponema denticola": 0.07,
      "Tannerella forsythia": 0.06,
      "Prevotella intermedia": 0.08,
      "Fusobacterium nucleatum": 0.10,
      "Streptococcus mutans": 0.08,
      "Lactobacillus fermentum": 0.05,
      "Veillonella parvula": 0.06,
      "Streptococcus salivarius": 0.05,
      "Rothia mucilaginosa": 0.03,
      "Neisseria flavescens": 0.02,
      "Haemophilus parainfluenzae": 0.02,
      "Other": 0.27,
    },
  },
  mouthwash: {
    taxonomy: {
      "Streptococcus salivarius": 0.05,
      "Rothia mucilaginosa": 0.04,
      "Neisseria flavescens": 0.03,
      "Veillonella parvula": 0.04,
      "Streptococcus mitis": 0.06,
      "Porphyromonas gingivalis": 0.002,
      "Prevotella intermedia": 0.003,
      "Fusobacterium nucleatum": 0.02,
      "Haemophilus parainfluenzae": 0.03,
      "Actinomyces naeslundii": 0.02,
      "Other": 0.741,
    },
  },
}

type InputMode = "mock" | "paste"

interface OralScoreResult {
  shannonDiversity?: number
  nitrateReducerPct?: number
  pGingivalisPct?: number
  prevotellaPct?: number
  totalScore?: number
  findings?: Array<{ title: string }>
  [key: string]: unknown
}

interface PreviewData {
  oralScore: OralScoreResult
  newTotalScore?: number
}

export default function AdminOralResultsPage() {
  const [kitCode, setKitCode] = useState("")
  const [inputMode, setInputMode] = useState<InputMode>("mock")
  const [mockProfile, setMockProfile] = useState<string>("average")
  const [pastedJson, setPastedJson] = useState("")
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  function buildPayload() {
    const code = kitCode.toUpperCase().trim()
    if (inputMode === "mock") {
      return { kitCode: code, zymoReport: MOCK_REPORTS[mockProfile] }
    } else {
      let parsed: unknown
      try {
        parsed = JSON.parse(pastedJson)
      } catch {
        throw new Error("Invalid JSON. Please check your Zymo report format.")
      }
      return { kitCode: code, zymoReport: parsed }
    }
  }

  async function handlePreview() {
    setError("")
    setPreviewData(null)
    setSaved(false)

    let payload: ReturnType<typeof buildPayload>
    try {
      payload = buildPayload()
    } catch (e) {
      setError((e as Error).message)
      return
    }

    if (!payload.kitCode) {
      setError("Enter a kit code.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/oral-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { error?: string; oralScore?: OralScoreResult; newTotalScore?: number }
      if (!res.ok) {
        setError(data.error ?? "Request failed.")
        return
      }
      setPreviewData({ oralScore: data.oralScore ?? {}, newTotalScore: data.newTotalScore })
    } catch {
      setError("Network error.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setError("")
    setSaveLoading(true)

    let payload: ReturnType<typeof buildPayload>
    try {
      payload = buildPayload()
    } catch (e) {
      setError((e as Error).message)
      setSaveLoading(false)
      return
    }

    try {
      const res = await fetch("/api/admin/oral-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { error?: string; success?: boolean }
      if (!res.ok) {
        setError(data.error ?? "Save failed.")
        return
      }
      setSaved(true)
    } catch {
      setError("Network error.")
    } finally {
      setSaveLoading(false)
    }
  }

  const score = previewData?.oralScore

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper, #faf9f7)", color: "var(--ink, #1a1a18)" }}>
      {/* Nav */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}>
        <Logo height={26} />
        <Link
          href="/admin"
          style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: 14,
            color: "var(--ink, #1a1a18)",
            textDecoration: "none",
            opacity: 0.6,
          }}
        >
          ← Admin
        </Link>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "64px 24px 80px" }}>
        <h1 style={{
          fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
          fontSize: "clamp(36px, 6vw, 52px)",
          fontWeight: 400,
          lineHeight: 1.1,
          margin: "0 0 40px",
          letterSpacing: "-0.01em",
        }}>
          Upload oral results.
        </h1>

        {/* Kit code */}
        <label style={labelStyle}>Kit code</label>
        <input
          type="text"
          value={kitCode}
          onChange={e => setKitCode(e.target.value)}
          placeholder="PEAQ-XXXX-XXXXX"
          style={inputStyle}
        />

        {/* Input mode radio */}
        <div style={{ margin: "24px 0 8px" }}>
          <label style={labelStyle}>Data source</label>
          <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
            {(["mock", "paste"] as InputMode[]).map(mode => (
              <label key={mode} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 14,
                cursor: "pointer",
              }}>
                <input
                  type="radio"
                  name="inputMode"
                  value={mode}
                  checked={inputMode === mode}
                  onChange={() => { setInputMode(mode); setPreviewData(null); setSaved(false) }}
                  style={{ accentColor: "var(--gold, #c8a96e)" }}
                />
                {mode === "mock" ? "Use mock profile" : "Paste Zymo JSON"}
              </label>
            ))}
          </div>
        </div>

        {/* Mock profile selector */}
        {inputMode === "mock" && (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Mock profile</label>
            <select
              value={mockProfile}
              onChange={e => { setMockProfile(e.target.value); setPreviewData(null); setSaved(false) }}
              style={{
                ...inputStyle,
                paddingTop: 12,
                paddingBottom: 12,
                appearance: "none",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%231a1a18' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                paddingRight: 36,
                cursor: "pointer",
              }}
            >
              <option value="optimal">Optimal</option>
              <option value="average">Average</option>
              <option value="dysbiotic">Dysbiotic</option>
              <option value="mouthwash">Mouthwash</option>
            </select>
          </div>
        )}

        {/* JSON paste */}
        {inputMode === "paste" && (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Zymo JSON report</label>
            <textarea
              value={pastedJson}
              onChange={e => { setPastedJson(e.target.value); setPreviewData(null); setSaved(false) }}
              placeholder='{"taxonomy": {"Streptococcus salivarius": 0.22, ...}}'
              rows={10}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: 13,
            color: "#c0392b",
            margin: "16px 0 0",
          }}>
            {error}
          </p>
        )}

        {/* Preview button */}
        <button
          onClick={handlePreview}
          disabled={loading}
          style={{
            ...buttonStyle,
            marginTop: 28,
            background: "transparent",
            color: "var(--ink, #1a1a18)",
            border: "1.5px solid rgba(0,0,0,0.2)",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Loading…" : "Preview results"}
        </button>

        {/* Preview panel */}
        {score && !saved && (
          <div style={{
            marginTop: 32,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 12,
            padding: "24px",
          }}>
            <p style={{ ...metaLabel, marginBottom: 16 }}>Score breakdown</p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-body, sans-serif)", fontSize: 14 }}>
              <tbody>
                <ScoreRow label="Shannon diversity" value={score.shannonDiversity?.toFixed(2)} pts={8} />
                <ScoreRow label="Nitrate reducers" value={score.nitrateReducerPct !== undefined ? `${(score.nitrateReducerPct * 100).toFixed(1)}%` : undefined} pts={6} />
                <ScoreRow label="Periodontopathogen load" value={score.pGingivalisPct !== undefined ? `${(score.pGingivalisPct * 100).toFixed(2)}%` : undefined} pts={7} />
                <ScoreRow label="OSA-associated taxa" value={score.prevotellaPct !== undefined ? `${(score.prevotellaPct * 100).toFixed(2)}%` : undefined} pts={4} />
              </tbody>
            </table>

            {score.totalScore !== undefined && (
              <div style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid rgba(0,0,0,0.08)",
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: 14,
                fontWeight: 600,
              }}>
                <span>Total oral score</span>
                <span style={{ color: "var(--gold, #c8a96e)" }}>{score.totalScore}/25</span>
              </div>
            )}

            {previewData?.newTotalScore !== undefined && (
              <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: 13, opacity: 0.5, marginTop: 8 }}>
                New composite score: {previewData.newTotalScore}
              </p>
            )}

            {/* Findings */}
            {Array.isArray(score.findings) && score.findings.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ ...metaLabel, marginBottom: 10 }}>Findings</p>
                <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                  {score.findings.map((f, i) => (
                    <li key={i} style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: 13, marginBottom: 4, opacity: 0.75 }}>
                      {f.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saveLoading}
              style={{
                ...buttonStyle,
                marginTop: 24,
                opacity: saveLoading ? 0.5 : 1,
              }}
            >
              {saveLoading ? "Saving…" : "Save results"}
            </button>
          </div>
        )}

        {/* Saved confirmation */}
        {saved && (
          <div style={{
            marginTop: 28,
            background: "#f0faf4",
            border: "1.5px solid #27ae60",
            borderRadius: 10,
            padding: "16px 20px",
          }}>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: 15, color: "#1e7e34", margin: 0, fontWeight: 500 }}>
              Results saved.
            </p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: 13, color: "#1e7e34", margin: "4px 0 0", opacity: 0.8 }}>
              Kit {kitCode.toUpperCase()} has been scored and the user's peaq score recalculated.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// Sub-components

function ScoreRow({ label, value, pts }: { label: string; value?: string; pts: number }) {
  return (
    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <td style={{ padding: "8px 0", opacity: 0.6 }}>{label}</td>
      <td style={{ padding: "8px 0", textAlign: "right", paddingRight: 16, opacity: 0.8 }}>{value ?? "—"}</td>
      <td style={{ padding: "8px 0", textAlign: "right", color: "var(--gold, #c8a96e)", fontWeight: 500, whiteSpace: "nowrap" }}>
        — /{pts} pts
      </td>
    </tr>
  )
}

// Shared styles
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  opacity: 0.4,
  marginBottom: 6,
  marginTop: 20,
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: "var(--font-body, sans-serif)",
  border: "1.5px solid rgba(0,0,0,0.15)",
  borderRadius: 8,
  background: "#fff",
  color: "var(--ink, #1a1a18)",
  outline: "none",
  boxSizing: "border-box",
}

const buttonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "13px 24px",
  background: "var(--ink, #1a1a18)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "var(--font-body, sans-serif)",
  fontWeight: 500,
  cursor: "pointer",
  transition: "opacity 0.15s",
}

const metaLabel: React.CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  opacity: 0.4,
  margin: 0,
}

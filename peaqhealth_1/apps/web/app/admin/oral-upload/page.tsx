"use client"

import { useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

type User = { id: string; email: string; first_name: string | null; last_name: string | null }
type Kit = { id: string; kit_code: string | null; status: string; ordered_at: string; collection_date: string | null; shannon_diversity: number | null; neisseria_pct: number | null; primary_pattern: string | null; interpretability_tier: string | null }
type ParsedEntry = { rawName: string; genus: string; species: string | null; pct: number; mappedColumn: string | null; mappingType: string }
type ParseResult = { entries: ParsedEntry[]; columnValues: Record<string, number>; shannonDiversity: number | null; shannonSource: string | null; speciesCount: number; totalTracked: number; totalUntracked: number }
type ShannonInfo = { shannon: number; sampleName: string; maxDepth: number; iterations: number; allSamples: string[] }
type SaveSummary = { speciesCount: number; shannonDiversity: number | null; interpretabilityTier: string; envPattern: string | null; primaryPattern: string | null; secondaryPattern: string | null; totalScore: number }

async function api(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/oral-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<Record<string, unknown>>
}

export default function OralUploadPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [kits, setKits] = useState<Kit[]>([])
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null)
  const [rawInput, setRawInput] = useState("")
  const [shannonInput, setShannonInput] = useState("")
  const [sampleIndex, setSampleIndex] = useState(0)
  const [shannonInfo, setShannonInfo] = useState<ShannonInfo | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ success: boolean; steps: string[]; summary?: SaveSummary; error?: string } | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function loadUsers() {
    setLoading(true)
    const data = await api({ action: "list_users" })
    if (data.error) { setError(data.error as string); setLoading(false); return }
    setUsers(data.users as User[])
    setLoading(false)
  }

  async function selectUser(u: User) {
    setSelectedUser(u)
    setSelectedKit(null)
    setParsed(null)
    setResult(null)
    const data = await api({ action: "list_kits", user_id: u.id })
    setKits(data.kits as Kit[])
  }

  async function handleParse() {
    setError("")
    setParsed(null)
    setShannonInfo(null)
    setResult(null)
    const data = await api({ action: "parse", raw_input: rawInput, shannon_input: shannonInput || undefined, sample_index: sampleIndex })
    if (data.error) { setError(data.error as string); return }
    setParsed(data.parsed as ParseResult)
    if (data.shannon) setShannonInfo(data.shannon as ShannonInfo)
  }

  async function handleSave() {
    if (!selectedKit || !selectedUser || !rawInput) return
    setSaving(true)
    setError("")
    setResult(null)
    const data = await api({ action: "save", kit_id: selectedKit.id, user_id: selectedUser.id, raw_input: rawInput, shannon_input: shannonInput || undefined, sample_index: sampleIndex })
    setSaving(false)
    if (data.success) {
      setResult({ success: true, steps: data.steps as string[], summary: data.summary as SaveSummary })
      const refreshed = await api({ action: "list_kits", user_id: selectedUser.id })
      setKits(refreshed.kits as Kit[])
    } else {
      setResult({ success: false, steps: data.steps as string[] ?? [], error: data.error as string })
    }
  }

  const statusColor = (s: string) =>
    s === "results_ready" ? "#3B6D11" : s === "failed" ? "#991B1B" : "#92400E"

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", color: "#141410" }}>
      <nav style={{ padding: "20px 32px", borderBottom: "0.5px solid rgba(20,20,16,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 400 }}>L7 Upload</span>
        <span style={{ fontFamily: sans, fontSize: 11, color: "#9B9891", letterSpacing: "0.1em", textTransform: "uppercase" }}>Admin</span>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Step 1: Select user */}
        <section style={{ marginBottom: 32 }}>
          <Label>1. Select user</Label>
          {users.length === 0 ? (
            <button onClick={loadUsers} disabled={loading} style={btnStyle}>{loading ? "Loading…" : "Load users"}</button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  style={{
                    ...btnStyle,
                    background: selectedUser?.id === u.id ? "#141410" : "#fff",
                    color: selectedUser?.id === u.id ? "#FAFAF8" : "#141410",
                    border: "0.5px solid rgba(20,20,16,0.12)",
                    textAlign: "left",
                  }}
                >
                  {u.first_name} {u.last_name} — {u.email}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Step 2: Select kit */}
        {selectedUser && (
          <section style={{ marginBottom: 32 }}>
            <Label>2. Select oral kit</Label>
            {kits.length === 0 ? (
              <p style={{ fontFamily: sans, fontSize: 13, color: "#9B9891" }}>No oral kits found for this user.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {kits.map(k => (
                  <button
                    key={k.id}
                    onClick={() => { setSelectedKit(k); setParsed(null); setResult(null) }}
                    style={{
                      ...btnStyle,
                      background: selectedKit?.id === k.id ? "#141410" : "#fff",
                      color: selectedKit?.id === k.id ? "#FAFAF8" : "#141410",
                      border: "0.5px solid rgba(20,20,16,0.12)",
                      textAlign: "left",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <span>{k.kit_code ?? k.id.slice(0, 8)} — {new Date(k.ordered_at).toLocaleDateString()}</span>
                    <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: selectedKit?.id === k.id ? "#FAFAF8" : statusColor(k.status), opacity: 0.8 }}>
                      {k.status}{k.neisseria_pct != null ? "" : " · no L7"}{k.primary_pattern ? ` · ${k.primary_pattern}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Step 3: Paste L7 data */}
        {selectedKit && (
          <section style={{ marginBottom: 32 }}>
            <Label>3a. Paste L7 data (Zymo TSV or CSV)</Label>
            <textarea
              value={rawInput}
              onChange={e => { setRawInput(e.target.value); setParsed(null); setResult(null) }}
              placeholder={"k__Bacteria;p__...;g__Streptococcus;s__mutans\t0.271\t0.0\t0.0"}
              rows={10}
              style={{
                width: "100%", fontFamily: "monospace", fontSize: 12, padding: 12,
                border: "0.5px solid rgba(20,20,16,0.12)", borderRadius: 3,
                background: "#fff", color: "#141410", resize: "vertical",
                boxSizing: "border-box",
              }}
            />

            <div style={{ marginTop: 16, marginBottom: 10 }}>
              <Label>3b. Paste Zymo Shannon text (optional — recommended)</Label>
              <p style={{ fontFamily: sans, fontSize: 11, color: "#9B9891", margin: "0 0 8px", lineHeight: 1.5 }}>
                Zymo rarefaction file. If provided, uses the average Shannon at max read depth. Without this, Shannon is estimated from L7 abundances (less accurate).
              </p>
              <textarea
                value={shannonInput}
                onChange={e => { setShannonInput(e.target.value); setParsed(null); setResult(null); setShannonInfo(null) }}
                placeholder={"sequences per sample\titeration\tPilot.Peaq.1\tPilot.Peaq.2\t..."}
                rows={4}
                style={{
                  width: "100%", fontFamily: "monospace", fontSize: 11, padding: 12,
                  border: "0.5px solid rgba(20,20,16,0.12)", borderRadius: 3,
                  background: "#fff", color: "#141410", resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              {shannonInfo && shannonInfo.allSamples.length > 1 && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: sans, fontSize: 11, color: "#5C5A54" }}>Sample:</span>
                  <select
                    value={sampleIndex}
                    onChange={e => { setSampleIndex(Number(e.target.value)); setParsed(null); setShannonInfo(null) }}
                    style={{ fontFamily: sans, fontSize: 12, padding: "4px 8px", border: "0.5px solid rgba(20,20,16,0.12)", borderRadius: 3, background: "#fff" }}
                  >
                    {shannonInfo.allSamples.map((name, i) => (
                      <option key={i} value={i}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={handleParse} disabled={!rawInput.trim()} style={btnStyle}>Parse preview</button>
              <label style={{ ...btnStyle, cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                Upload L7 file
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  style={{ display: "none" }}
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const text = await file.text()
                      setRawInput(text)
                      setParsed(null)
                      setResult(null)
                    }
                  }}
                />
              </label>
            </div>
          </section>
        )}

        {/* Step 4: Parse preview */}
        {parsed && (
          <section style={{ marginBottom: 32 }}>
            <Label>4. Parse preview — {parsed.speciesCount} species, Shannon {parsed.shannonDiversity?.toFixed(4) ?? "N/A"} ({parsed.shannonSource === "zymo_rarefaction" ? `Zymo rarefaction${shannonInfo ? `, depth ${shannonInfo.maxDepth}, ${shannonInfo.iterations} iter, sample: ${shannonInfo.sampleName}` : ""}` : "computed from L7 — less accurate"})</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <Chip label={`${parsed.speciesCount} total species`} color="#141410" />
              <Chip label={`${parsed.totalTracked} tracked → ${Object.keys(parsed.columnValues).length} columns`} color="#3B6D11" />
              <Chip label={`${parsed.totalUntracked} untracked (preserved in raw_otu_table)`} color="#92400E" />
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto", border: "0.5px solid rgba(20,20,16,0.12)", borderRadius: 3 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: sans, fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#F0EDE6", position: "sticky", top: 0 }}>
                    <th style={thStyle}>Species</th>
                    <th style={thStyle}>%</th>
                    <th style={thStyle}>Column</th>
                    <th style={thStyle}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.entries.slice(0, 80).map((e, i) => (
                    <tr key={i} style={{ borderBottom: "0.5px solid rgba(20,20,16,0.06)", background: e.mappingType === "unmatched" ? "rgba(254,243,199,0.3)" : "transparent" }}>
                      <td style={tdStyle}>{e.rawName}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{e.pct.toFixed(3)}</td>
                      <td style={tdStyle}>{e.mappedColumn ?? "—"}</td>
                      <td style={tdStyle}>{e.mappingType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16 }}>
              <Label>Column values to write</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(parsed.columnValues).sort(([, a], [, b]) => b - a).map(([col, val]) => (
                  <span key={col} style={{ fontFamily: "monospace", fontSize: 10, background: "#fff", border: "0.5px solid rgba(20,20,16,0.12)", padding: "3px 8px", borderRadius: 2 }}>
                    {col}: {val.toFixed(3)}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !selectedKit}
              style={{ ...btnStyle, background: "#141410", color: "#FAFAF8", marginTop: 20, width: "100%" }}
            >
              {saving ? "Processing pipeline…" : "Save & run pipeline"}
            </button>
          </section>
        )}

        {/* Step 5: Result */}
        {result && (
          <section style={{ marginBottom: 32, padding: 20, border: `1.5px solid ${result.success ? "#3B6D11" : "#991B1B"}`, borderRadius: 6, background: result.success ? "#f0faf4" : "#fef2f2" }}>
            <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 400, margin: "0 0 12px", color: result.success ? "#3B6D11" : "#991B1B" }}>
              {result.success ? "Pipeline complete" : "Pipeline failed"}
            </p>
            {result.steps.map((s, i) => (
              <p key={i} style={{ fontFamily: sans, fontSize: 12, color: "#5C5A54", margin: "4px 0", lineHeight: 1.5 }}>
                {i + 1}. {s}
              </p>
            ))}
            {result.error && (
              <p style={{ fontFamily: sans, fontSize: 12, color: "#991B1B", margin: "8px 0 0", fontWeight: 500 }}>{result.error}</p>
            )}
            {result.summary && (
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Chip label={`${result.summary.speciesCount} species`} color="#3B6D11" />
                <Chip label={`Shannon ${result.summary.shannonDiversity?.toFixed(2) ?? "—"}`} color="#185FA5" />
                <Chip label={`Tier: ${result.summary.interpretabilityTier}`} color="#6B4D8A" />
                {result.summary.envPattern && <Chip label={`Env: ${result.summary.envPattern}`} color="#C49A3C" />}
                {result.summary.primaryPattern && <Chip label={`Primary: ${result.summary.primaryPattern}`} color="#A32D2D" />}
                {result.summary.secondaryPattern && <Chip label={`Secondary: ${result.summary.secondaryPattern}`} color="#92400E" />}
                <Chip label={`Score: ${result.summary.totalScore}`} color="#141410" />
              </div>
            )}
            {result.success && selectedUser && (
              <a href={`/dashboard/oral`} target="_blank" rel="noopener" style={{ fontFamily: sans, fontSize: 12, color: "#B8860B", display: "inline-block", marginTop: 12 }}>
                View oral results page →
              </a>
            )}
          </section>
        )}

        {error && (
          <p style={{ fontFamily: sans, fontSize: 13, color: "#991B1B", margin: "16px 0" }}>{error}</p>
        )}
      </main>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Instrument Sans', sans-serif", fontSize: 11, letterSpacing: "0.12em",
      textTransform: "uppercase", color: "#9B9891", margin: "0 0 10px",
    }}>
      {children}
    </p>
  )
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, letterSpacing: "0.05em",
      textTransform: "uppercase", padding: "3px 10px", borderRadius: 10,
      background: `${color}15`, color,
    }}>
      {label}
    </span>
  )
}

const btnStyle: React.CSSProperties = {
  fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, fontWeight: 500,
  letterSpacing: "0.06em", textTransform: "uppercase",
  padding: "10px 20px", border: "none", borderRadius: 3,
  background: "#F0EDE6", color: "#141410", cursor: "pointer",
}
const thStyle: React.CSSProperties = { padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "#5C5A54" }
const tdStyle: React.CSSProperties = { padding: "5px 10px", color: "#3D3B35" }

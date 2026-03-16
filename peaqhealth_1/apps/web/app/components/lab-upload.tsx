"use client"

import { useState, useCallback, useEffect, useRef } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BloodMarkers {
  hsCRP_mgL?:          number
  vitaminD_ngmL?:      number
  apoB_mgdL?:          number
  ldl_mgdL?:           number
  hdl_mgdL?:           number
  triglycerides_mgdL?: number
  lpa_mgdL?:           number
  glucose_mgdL?:       number
  hba1c_pct?:          number
  labDate?:            string
}

interface ParsedMarker {
  slug:  keyof BloodMarkers
  name:  string
  unit:  string
  value: number | null
  found: boolean
}

interface LabUploadProps {
  onSuccess: (markers: BloodMarkers, newScore: number) => void
  onSkip?: () => void
}

// ─── Canonical markers ────────────────────────────────────────────────────────

const MARKERS: Array<{ slug: keyof BloodMarkers; name: string; unit: string; placeholder: string }> = [
  { slug: "hsCRP_mgL",          name: "hs-CRP",        unit: "mg/L",  placeholder: "0.8"  },
  { slug: "vitaminD_ngmL",      name: "Vitamin D",     unit: "ng/mL", placeholder: "42"   },
  { slug: "apoB_mgdL",          name: "ApoB",          unit: "mg/dL", placeholder: "85"   },
  { slug: "ldl_mgdL",           name: "LDL",           unit: "mg/dL", placeholder: "110"  },
  { slug: "hdl_mgdL",           name: "HDL",           unit: "mg/dL", placeholder: "58"   },
  { slug: "triglycerides_mgdL", name: "Triglycerides", unit: "mg/dL", placeholder: "95"   },
  { slug: "lpa_mgdL",           name: "Lp(a)",         unit: "mg/dL", placeholder: "18"   },
  { slug: "glucose_mgdL",       name: "Glucose",       unit: "mg/dL", placeholder: "88"   },
  { slug: "hba1c_pct",          name: "HbA1c",         unit: "%",     placeholder: "5.2"  },
]

const PARSE_STAGES = [
  { key: "uploading",  label: "Uploading PDF..."          },
  { key: "extracting", label: "Reading your lab report..." },
  { key: "mapping",    label: "Mapping biomarkers..."     },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1] ?? result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LabUpload({ onSuccess, onSkip }: LabUploadProps) {
  type Phase = "idle" | "parsing" | "confirm" | "saving" | "success" | "manual"

  const [phase,         setPhase]         = useState<Phase>("idle")
  const [stageIdx,      setStageIdx]      = useState(0)
  const [parsedMarkers, setParsedMarkers] = useState<ParsedMarker[]>([])
  const [labDate,       setLabDate]       = useState(new Date().toISOString().slice(0, 10))
  const [manualLabDate, setManualLabDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualValues,  setManualValues]  = useState<Partial<Record<keyof BloodMarkers, string>>>({})
  const [newScore,      setNewScore]      = useState(0)
  const [dragOver,      setDragOver]      = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout>  | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current)  clearInterval(pollRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const startPolling = useCallback((jobId: string) => {
    let polls = 0
    const MAX_POLLS = 45 // 45 × 2s = 90s timeout
    pollRef.current = setInterval(async () => {
      polls++
      if (polls === 3) setStageIdx(2) // advance to "Mapping..."

      if (polls > MAX_POLLS) {
        clearInterval(pollRef.current!)
        setError("Lab parsing is taking longer than expected. Try uploading again or enter your values manually.")
        setPhase("idle")
        return
      }

      try {
        const res  = await fetch(`/api/labs/status/${jobId}`)
        const data = await res.json() as {
          status: string
          markers?: ParsedMarker[]
          labDate?: string
          error?: string
        }

        if (data.status === "complete" && data.markers) {
          clearInterval(pollRef.current!)
          setParsedMarkers(data.markers)
          setLabDate(data.labDate ?? new Date().toISOString().slice(0, 10))
          setPhase("confirm")
        } else if (data.status === "failed" || !res.ok) {
          clearInterval(pollRef.current!)
          setError(data.error ?? "Parsing failed — please try re-uploading.")
          setPhase("idle")
        }
      } catch {
        clearInterval(pollRef.current!)
        setError("Connection error while checking parse status.")
        setPhase("idle")
      }
    }, 2000)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.")
      return
    }
    setError(null)
    setPhase("parsing")
    setStageIdx(0)

    timerRef.current = setTimeout(() => setStageIdx(1), 1500)

    try {
      const pdfBase64 = await fileToBase64(file)
      const res  = await fetch("/api/labs/upload", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pdfBase64 }),
      })
      const data = await res.json() as { jobId?: string; error?: string }

      if (!res.ok || !data.jobId) throw new Error(data.error ?? `HTTP ${res.status}`)

      startPolling(data.jobId)
    } catch (err) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setError(err instanceof Error ? err.message : "Upload failed")
      setPhase("idle")
    }
  }, [startPolling])

  async function saveMarkers(markers: BloodMarkers, src = "upload_pdf") {
    setPhase("saving")
    try {
      const res  = await fetch("/api/labs/save", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ markers, labDate: markers.labDate, source: src }),
      })
      const data = await res.json() as { score?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setNewScore(data.score ?? 0)
      setPhase("success")
      onSuccess(markers, data.score ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
      setPhase(parsedMarkers.length > 0 ? "confirm" : "manual")
    }
  }

  function handleConfirmSave() {
    const markers: BloodMarkers = { labDate }
    for (const m of parsedMarkers) {
      if (m.found && m.value !== null) {
        (markers as Record<string, unknown>)[m.slug] = m.value
      }
    }
    saveMarkers(markers, "upload_pdf")
  }

  function handleManualSave() {
    const markers: BloodMarkers = { labDate: manualLabDate }
    for (const m of MARKERS) {
      const v = parseFloat(manualValues[m.slug] ?? "")
      if (!isNaN(v)) (markers as Record<string, unknown>)[m.slug] = v
    }
    saveMarkers(markers, "manual_entry")
  }

  // ── Success ─────────────────────────────────────────────────────────────────

  if (phase === "success") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center"
          style={{ background: "var(--blood-bg)", borderRadius: "50%" }}
        >
          <span style={{ color: "var(--blood-c)", fontSize: 22 }}>✓</span>
        </div>
        <div>
          <p className="font-display text-xl font-light" style={{ color: "var(--ink)" }}>
            Blood panel saved.
          </p>
          <p className="font-body text-sm mt-1" style={{ color: "var(--ink-60)" }}>
            Your score has been updated.
          </p>
        </div>
        {newScore > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="font-display text-5xl font-light" style={{ color: "var(--ink)" }}>
              {newScore}
            </span>
            <span className="font-body text-sm" style={{ color: "var(--ink-30)" }}>/100</span>
          </div>
        )}
      </div>
    )
  }

  // ── Saving ──────────────────────────────────────────────────────────────────

  if (phase === "saving") {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div
          className="h-2.5 w-2.5 rounded-full animate-pulse"
          style={{ background: "var(--blood-c)" }}
        />
        <p className="font-body text-sm" style={{ color: "var(--ink-60)" }}>
          Saving to your profile...
        </p>
      </div>
    )
  }

  // ── Parsing / polling ────────────────────────────────────────────────────────

  if (phase === "parsing") {
    return (
      <div className="flex flex-col gap-4 py-10">
        {PARSE_STAGES.map((s, i) => {
          const isDone    = i < stageIdx
          const isCurrent = i === stageIdx
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div
                className={`h-2.5 w-2.5 rounded-full transition-all ${isCurrent ? "animate-pulse" : ""}`}
                style={{ background: isDone || isCurrent ? "var(--blood-c)" : "var(--ink-12)" }}
              />
              <span
                className="font-body text-sm"
                style={{ color: isDone ? "var(--ink-30)" : isCurrent ? "var(--ink)" : "var(--ink-20, #d8d8d8)" }}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Confirmation ─────────────────────────────────────────────────────────────

  if (phase === "confirm") {
    const found = parsedMarkers.filter((m) => m.found).length
    const today = new Date().toISOString().slice(0, 10)
    return (
      <div className="flex flex-col gap-5">
        <p className="font-body text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>
          {found} of {parsedMarkers.length} markers detected
        </p>

        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "white" }}
        >
          <span className="font-body text-sm flex-1" style={{ color: "var(--ink)" }}>Date of blood draw</span>
          <input
            type="date"
            max={today}
            value={labDate}
            onChange={(e) => setLabDate(e.target.value)}
            className="font-body text-sm"
            style={{ color: "var(--ink)", background: "transparent", border: "none", outline: "none" }}
          />
        </div>

        <div style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, overflow: "hidden" }}>
          <div
            className="grid items-center px-4 py-2"
            style={{ gridTemplateColumns: "1fr 80px 56px", borderBottom: "0.5px solid var(--ink-12)" }}
          >
            {["Marker", "Value", "Unit"].map((h) => (
              <span
                key={h}
                className="font-body text-[9px] uppercase tracking-widest"
                style={{ color: "var(--ink-30)", textAlign: h !== "Marker" ? "right" : undefined }}
              >
                {h}
              </span>
            ))}
          </div>

          {parsedMarkers.map((m) => (
            <div
              key={m.slug}
              className="grid items-center px-4 py-2.5"
              style={{
                gridTemplateColumns: "1fr 80px 56px",
                borderBottom: "0.5px solid var(--ink-06, #f8f8f8)",
                background: m.found ? "white" : "var(--ink-03, #fafafa)",
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 11, color: m.found ? "var(--blood-c)" : "var(--ink-30)" }}>
                  {m.found ? "✓" : "✗"}
                </span>
                <span
                  className="font-body text-sm"
                  style={{ color: m.found ? "var(--ink)" : "var(--ink-30)" }}
                >
                  {m.name}
                </span>
              </div>
              <span
                className="font-body text-sm font-medium text-right"
                style={{ color: m.found ? "var(--ink)" : "var(--ink-20, #ddd)" }}
              >
                {m.found && m.value !== null ? m.value : "—"}
              </span>
              <span className="font-body text-xs text-right" style={{ color: "var(--ink-30)" }}>
                {m.unit}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <p className="font-body text-xs" style={{ color: "#991B1B" }}>{error}</p>
        )}

        <button
          onClick={handleConfirmSave}
          className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85"
          style={{ background: "var(--blood-c)" }}
        >
          Save to my profile
        </button>
        <button
          onClick={() => { setPhase("idle"); setError(null) }}
          className="font-body text-xs uppercase tracking-widest"
          style={{ color: "var(--ink-30)" }}
        >
          Re-upload
        </button>
      </div>
    )
  }

  // ── Manual entry ─────────────────────────────────────────────────────────────

  if (phase === "manual") {
    const today = new Date().toISOString().slice(0, 10)
    return (
      <div className="flex flex-col gap-4">
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "white" }}
        >
          <span className="font-body text-sm flex-1" style={{ color: "var(--ink)" }}>Date of blood draw</span>
          <input
            type="date"
            max={today}
            value={manualLabDate}
            onChange={(e) => setManualLabDate(e.target.value)}
            className="font-body text-sm"
            style={{ color: "var(--ink)", background: "transparent", border: "none", outline: "none" }}
          />
        </div>

        <div
          className="grid items-center gap-2 px-1"
          style={{ gridTemplateColumns: "1fr 110px 52px" }}
        >
          {["Marker", "Value", "Unit"].map((h) => (
            <span
              key={h}
              className="font-body text-[9px] uppercase tracking-widest"
              style={{ color: "var(--ink-30)", textAlign: h !== "Marker" ? "right" : undefined }}
            >
              {h}
            </span>
          ))}
        </div>

        {MARKERS.map((m) => (
          <div
            key={m.slug}
            className="grid items-center gap-2 p-3"
            style={{
              gridTemplateColumns: "1fr 110px 52px",
              border: "0.5px solid var(--ink-12)",
              borderRadius: 4,
              background: "white",
            }}
          >
            <span className="font-body text-sm" style={{ color: "var(--ink)" }}>{m.name}</span>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder={m.placeholder}
              value={manualValues[m.slug] ?? ""}
              onChange={(e) =>
                setManualValues((prev) => ({ ...prev, [m.slug]: e.target.value }))
              }
              className="font-body text-sm w-full text-right"
              style={{
                color: "var(--ink)",
                background: "transparent",
                border: "none",
                outline: "none",
                borderBottom: "1px solid var(--ink-12)",
              }}
            />
            <span className="font-body text-xs text-right" style={{ color: "var(--ink-30)" }}>
              {m.unit}
            </span>
          </div>
        ))}

        {error && (
          <p className="font-body text-xs" style={{ color: "#991B1B" }}>{error}</p>
        )}

        <button
          onClick={handleManualSave}
          className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85 mt-2"
          style={{ background: "var(--blood-c)" }}
        >
          Save values
        </button>
        <button
          onClick={() => { setPhase("idle"); setError(null) }}
          className="font-body text-xs uppercase tracking-widest"
          style={{ color: "var(--ink-30)" }}
        >
          ← Back to upload
        </button>
      </div>
    )
  }

  // ── Idle (default) ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        className="flex w-full cursor-pointer flex-col items-center gap-4 border-2 border-dashed px-8 py-14 transition-colors"
        style={{
          borderColor:   dragOver ? "var(--blood-c)" : "var(--ink-15, #e4e4e4)",
          background:    dragOver ? "var(--blood-bg)" : "white",
          borderRadius:  4,
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center"
          style={{ border: "0.5px solid var(--ink-12)", borderRadius: 2 }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: "var(--ink-30)" }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <div className="text-center">
          <span className="font-body text-sm" style={{ color: "var(--ink)" }}>
            Drop your lab PDF here
          </span>
          <span className="block font-body text-xs mt-1" style={{ color: "var(--ink-30)" }}>
            Quest · LabCorp · BioReference · Everlywell · or click to browse
          </span>
        </div>
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </label>

      {error && (
        <p className="font-body text-xs self-start" style={{ color: "#991B1B" }}>{error}</p>
      )}

      {onSkip && (
        <button
          onClick={onSkip}
          className="font-body text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-30)" }}
        >
          Skip — add later
        </button>
      )}

      <div
        className="w-full text-center"
        style={{ borderTop: "0.5px solid var(--ink-08, #f2f2f2)", paddingTop: 14 }}
      >
        <button
          onClick={() => { setError(null); setPhase("manual") }}
          className="font-body text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-30)" }}
        >
          Have your results but no PDF? Enter them here.
        </button>
      </div>
    </div>
  )
}

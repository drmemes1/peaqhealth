"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BloodMarkers {
  hsCRP_mgL?:              number
  vitaminD_ngmL?:          number
  apoB_mgdL?:              number
  ldl_mgdL?:               number
  hdl_mgdL?:               number
  triglycerides_mgdL?:     number
  lpa_mgdL?:               number
  glucose_mgdL?:           number
  hba1c_pct?:              number
  fastingInsulin_uIUmL?:   number
  labDate?:                string
}

interface LabUploadProps {
  onSkip?: () => void
}

// ─── Canonical markers for display ──────────────────────────────────────────

const DISPLAY_MARKERS: Array<{ slug: keyof BloodMarkers; name: string; unit: string; placeholder: string }> = [
  { slug: "hsCRP_mgL",              name: "hs-CRP",           unit: "mg/L",     placeholder: "0.8"  },
  { slug: "vitaminD_ngmL",          name: "Vitamin D",        unit: "ng/mL",    placeholder: "42"   },
  { slug: "apoB_mgdL",              name: "ApoB",             unit: "mg/dL",    placeholder: "85"   },
  { slug: "ldl_mgdL",               name: "LDL",              unit: "mg/dL",    placeholder: "110"  },
  { slug: "hdl_mgdL",               name: "HDL",              unit: "mg/dL",    placeholder: "58"   },
  { slug: "triglycerides_mgdL",     name: "Triglycerides",    unit: "mg/dL",    placeholder: "95"   },
  { slug: "lpa_mgdL",               name: "Lp(a)",            unit: "mg/dL",    placeholder: "18"   },
  { slug: "glucose_mgdL",           name: "Glucose",          unit: "mg/dL",    placeholder: "88"   },
  { slug: "hba1c_pct",              name: "HbA1c",            unit: "%",        placeholder: "5.2"  },
  { slug: "fastingInsulin_uIUmL",   name: "Fasting Insulin",  unit: "µIU/mL",   placeholder: "7"    },
]

// High-value markers to surface in "missing" section
const MISSING_MARKER_SLUGS: Array<keyof BloodMarkers> = [
  "apoB_mgdL",
  "hsCRP_mgL",
  "hba1c_pct",
  "vitaminD_ngmL",
  "fastingInsulin_uIUmL",
]

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

export function LabUpload({ onSkip }: LabUploadProps) {
  type Phase = "idle" | "parsing" | "confirm" | "saving" | "manual"

  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [parsedMarkers, setParsedMarkers] = useState<BloodMarkers | null>(null)
  const [parsedLabName, setParsedLabName] = useState<string | undefined>()
  const [missingValues, setMissingValues] = useState<Partial<Record<keyof BloodMarkers, string>>>({})
  const [manualLabDate, setManualLabDate] = useState(new Date().toISOString().slice(0, 10))
  const [manualValues, setManualValues] = useState<Partial<Record<keyof BloodMarkers, string>>>({})
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(newFiles: FileList | File[]) {
    const valid = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    )
    if (valid.length === 0) {
      setError("Please upload PDF, JPG, or PNG files.")
      return
    }
    setError(null)
    setSelectedFiles((prev) => [...prev, ...valid])
  }

  function removeFile(name: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name))
  }

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return
    setError(null)
    setPhase("parsing")

    try {
      const filesPayload = await Promise.all(
        selectedFiles.map(async (f) => ({
          base64: await fileToBase64(f),
          filename: f.name,
          type: f.type,
        }))
      )

      const res = await fetch("/api/labs/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: filesPayload }),
      })

      const data = await res.json() as {
        markers?: Record<string, number>
        labName?: string
        collectionDate?: string
        error?: string
      }

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      if (!data.markers || Object.keys(data.markers).length === 0) {
        throw new Error("We processed your files but couldn't identify standard lab markers. Try entering your values manually.")
      }

      // Build BloodMarkers from parsed data (only DISPLAY_MARKERS slugs)
      const markers: BloodMarkers = { labDate: data.collectionDate ?? new Date().toISOString().slice(0, 10) }
      for (const m of DISPLAY_MARKERS) {
        const val = data.markers[m.slug]
        if (val !== undefined) (markers as Record<string, unknown>)[m.slug] = val
      }

      setParsedMarkers(markers)
      setParsedLabName(data.labName)
      setMissingValues({})
      setPhase("confirm")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setPhase("idle")
    }
  }, [selectedFiles])

  async function saveMarkers(markers: BloodMarkers, src = "upload_pdf", labName?: string) {
    setPhase("saving")
    try {
      const res = await fetch("/api/labs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markers, labDate: markers.labDate, source: src, labName }),
      })
      const data = await res.json() as { score?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
      setPhase("idle")
    }
  }

  function handleConfirmSave() {
    if (!parsedMarkers) return
    // Merge missing-marker inputs into parsed markers
    const merged: BloodMarkers = { ...parsedMarkers }
    for (const slug of MISSING_MARKER_SLUGS) {
      const v = parseFloat(missingValues[slug] ?? "")
      if (!isNaN(v)) (merged as Record<string, unknown>)[slug] = v
    }
    saveMarkers(merged, "upload_pdf", parsedLabName)
  }

  function handleManualSave() {
    const markers: BloodMarkers = { labDate: manualLabDate }
    for (const m of DISPLAY_MARKERS) {
      const v = parseFloat(manualValues[m.slug] ?? "")
      if (!isNaN(v)) (markers as Record<string, unknown>)[m.slug] = v
    }
    saveMarkers(markers, "manual_entry")
  }

  // ── Saving ────────────────────────────────────────────────────────────────

  if (phase === "saving") {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: "var(--blood-c)" }} />
        <p className="font-body text-sm" style={{ color: "var(--ink-60)" }}>Saving to your profile...</p>
      </div>
    )
  }

  // ── Parsing ───────────────────────────────────────────────────────────────

  if (phase === "parsing") {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: "var(--blood-c)" }} />
        <p className="font-body text-sm" style={{ color: "var(--ink)" }}>
          Analyzing your lab reports...
        </p>
        <p className="font-body text-xs" style={{ color: "var(--ink-30)" }}>
          Processing {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""}...
        </p>
      </div>
    )
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  if (phase === "confirm" && parsedMarkers) {
    // Which high-value markers are missing from parse results
    const missingMarkers = MISSING_MARKER_SLUGS
      .map(slug => DISPLAY_MARKERS.find(m => m.slug === slug)!)
      .filter(m => (parsedMarkers as Record<string, unknown>)[m.slug] === undefined)

    // Parsed rows to display (exclude labDate)
    const parsedRows = DISPLAY_MARKERS.filter(
      m => (parsedMarkers as Record<string, unknown>)[m.slug] !== undefined
    )

    return (
      <div className="flex flex-col gap-5 w-full">
        {/* Parsed results */}
        <div>
          <p className="font-body text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--ink-30)" }}>
            Found {parsedRows.length} marker{parsedRows.length !== 1 ? "s" : ""}
            {parsedLabName ? ` · ${parsedLabName}` : ""}
            {parsedMarkers.labDate ? ` · ${parsedMarkers.labDate}` : ""}
          </p>
          <div style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, overflow: "hidden" }}>
            {parsedRows.map((m, i) => (
              <div
                key={m.slug}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: i < parsedRows.length - 1 ? "0.5px solid var(--ink-06, #f8f8f8)" : "none", background: "white" }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--blood-c)", fontSize: 11 }}>✓</span>
                  <span className="font-body text-sm" style={{ color: "var(--ink)" }}>{m.name}</span>
                </div>
                <span className="font-body text-sm" style={{ color: "var(--ink)" }}>
                  {(parsedMarkers as Record<string, number>)[m.slug]}
                  <span className="font-body text-[10px] ml-1" style={{ color: "var(--ink-30)" }}>{m.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Missing markers */}
        {missingMarkers.length > 0 && (
          <div>
            <p className="font-body text-[12px] mb-3" style={{ color: "var(--ink-30)" }}>
              Missing any markers? Add them manually
            </p>
            <div style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, overflow: "hidden" }}>
              {missingMarkers.map((m, i) => (
                <div
                  key={m.slug}
                  className="grid items-center px-4 py-2.5"
                  style={{
                    gridTemplateColumns: "1fr auto auto",
                    gap: 12,
                    borderBottom: i < missingMarkers.length - 1 ? "0.5px solid var(--ink-06, #f8f8f8)" : "none",
                    background: "white",
                  }}
                >
                  <span className="font-body text-sm" style={{ color: "var(--ink)" }}>{m.name}</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={`e.g. ${m.placeholder}`}
                    value={missingValues[m.slug] ?? ""}
                    onChange={(e) => setMissingValues(prev => ({ ...prev, [m.slug]: e.target.value }))}
                    className="font-body text-sm text-right"
                    style={{
                      width: 90,
                      color: "var(--ink)",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--ink-12)",
                      outline: "none",
                    }}
                  />
                  <span className="font-body text-[10px]" style={{ color: "var(--ink-30)", minWidth: 48, textAlign: "right" }}>{m.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="font-body text-xs" style={{ color: "#991B1B" }}>{error}</p>}

        <button
          onClick={handleConfirmSave}
          className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85"
          style={{ background: "var(--blood-c)" }}
        >
          Save to my profile
        </button>
        <button
          onClick={() => { setPhase("idle"); setError(null); setSelectedFiles([]) }}
          className="font-body text-xs uppercase tracking-widest"
          style={{ color: "var(--ink-30)" }}
        >
          Re-upload
        </button>
      </div>
    )
  }

  // ── Manual entry ──────────────────────────────────────────────────────────

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

        <div className="grid items-center gap-2 px-1" style={{ gridTemplateColumns: "1fr 110px 52px" }}>
          {["Marker", "Value", "Unit"].map((h) => (
            <span key={h} className="font-body text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-30)", textAlign: h !== "Marker" ? "right" : undefined }}>{h}</span>
          ))}
        </div>

        {DISPLAY_MARKERS.map((m) => (
          <div key={m.slug} className="grid items-center gap-2 p-3" style={{ gridTemplateColumns: "1fr 110px 52px", border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "white" }}>
            <span className="font-body text-sm" style={{ color: "var(--ink)" }}>{m.name}</span>
            <input
              type="number" step="0.1" min="0" placeholder={m.placeholder}
              value={manualValues[m.slug] ?? ""}
              onChange={(e) => setManualValues((prev) => ({ ...prev, [m.slug]: e.target.value }))}
              className="font-body text-sm w-full text-right"
              style={{ color: "var(--ink)", background: "transparent", border: "none", outline: "none", borderBottom: "1px solid var(--ink-12)" }}
            />
            <span className="font-body text-xs text-right" style={{ color: "var(--ink-30)" }}>{m.unit}</span>
          </div>
        ))}

        {error && <p className="font-body text-xs" style={{ color: "#991B1B" }}>{error}</p>}

        <button onClick={handleManualSave} className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85 mt-2" style={{ background: "var(--blood-c)" }}>
          Save values
        </button>
        <button onClick={() => { setPhase("idle"); setError(null) }} className="font-body text-xs uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>
          ← Back to upload
        </button>
      </div>
    )
  }

  // ── Idle (default) ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
        }}
        className="flex w-full cursor-pointer flex-col items-center gap-4 px-8 py-14 transition-colors"
        style={{
          border: dragOver ? "0.5px dashed var(--gold)" : "0.5px dashed rgba(20,20,16,0.2)",
          background: dragOver ? "rgba(184,134,11,0.04)" : "white",
          borderRadius: 4,
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center" style={{ border: "0.5px solid var(--ink-12)", borderRadius: 2 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-30)" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </div>
        <div className="text-center">
          <span className="font-display text-sm" style={{ color: "var(--ink)", fontStyle: "italic" }}>
            Drop your lab reports here
          </span>
          <span className="block font-body text-[10px] uppercase tracking-widest mt-2" style={{ color: "var(--ink-30)" }}>
            or click to select · PDF, JPG, or PNG
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) addFiles(e.target.files)
          }}
        />
      </label>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="w-full flex flex-col gap-2">
          {selectedFiles.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "white" }}
            >
              <span className="font-body text-xs" style={{ color: "var(--ink-30)" }}>📄</span>
              <span className="font-body text-sm flex-1" style={{ color: "var(--ink)" }}>{f.name}</span>
              <button
                onClick={() => removeFile(f.name)}
                className="font-body text-xs"
                style={{ color: "var(--ink-30)" }}
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={handleUpload}
            className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85 mt-1"
            style={{ background: "var(--blood-c)" }}
          >
            {selectedFiles.length === 1
              ? "Analyze my lab results"
              : `Analyze all ${selectedFiles.length} lab reports`}
          </button>
        </div>
      )}

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

      <div className="w-full text-center" style={{ borderTop: "0.5px solid var(--ink-08, #f2f2f2)", paddingTop: 14 }}>
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

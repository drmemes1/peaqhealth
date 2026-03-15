"use client"

import { useState, useRef, useCallback } from "react"

export interface BloodMarkers {
  hsCRP_mgL?: number
  vitaminD_ngmL?: number
  apoB_mgdL?: number
  ldl_mgdL?: number
  hdl_mgdL?: number
  triglycerides_mgdL?: number
  lpa_mgdL?: number
  glucose_mgdL?: number
  hba1c_pct?: number
  esr_mmhr?: number
  homocysteine_umolL?: number
  ferritin_ngmL?: number
  labCollectionDate?: string
}

interface LabUploadProps {
  onSuccess: (markers: BloodMarkers, newScore: number) => void
  onSkip?: () => void
  existingLabDate?: string
}

type UploadState = "idle" | "uploading" | "parsing" | "complete" | "error"

const PARSING_MESSAGES = [
  "Parsing markers...",
  "Extracting hsCRP, ApoB...",
  "Checking lab date...",
  "Almost done...",
]

const MARKER_LABELS: Record<string, string> = {
  hsCRP_mgL: "hsCRP",
  vitaminD_ngmL: "Vitamin D",
  apoB_mgdL: "ApoB",
  ldl_mgdL: "LDL",
  hdl_mgdL: "HDL",
  triglycerides_mgdL: "Triglycerides",
  lpa_mgdL: "Lp(a)",
  glucose_mgdL: "Glucose",
  hba1c_pct: "HbA1c",
  esr_mmhr: "ESR",
  homocysteine_umolL: "Homocysteine",
  ferritin_ngmL: "Ferritin",
}

export function LabUpload({ onSuccess, onSkip, existingLabDate }: LabUploadProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [dragOver, setDragOver] = useState(false)
  const [parsingMsg, setParsingMsg] = useState(PARSING_MESSAGES[0])
  const [markers, setMarkers] = useState<BloodMarkers | null>(null)
  const [collectionDate, setCollectionDate] = useState<string | null>(null)
  const [newScore, setNewScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.")
      return
    }
    setState("uploading")
    setError(null)

    const formData = new FormData()
    formData.append("file", file)

    let jobId: string
    try {
      const res = await fetch("/api/labs/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      jobId = data.jobId
    } catch (err) {
      setError(String(err))
      setState("error")
      return
    }

    // Start polling
    setState("parsing")
    let msgIdx = 0
    let attempts = 0

    pollRef.current = setInterval(async () => {
      attempts++
      msgIdx = (msgIdx + 1) % PARSING_MESSAGES.length
      setParsingMsg(PARSING_MESSAGES[msgIdx]!)

      if (attempts > 60) {
        clearInterval(pollRef.current!)
        setError("Parsing timed out. Please try again.")
        setState("error")
        return
      }

      try {
        const res = await fetch(`/api/labs/status/${jobId}`)
        const data = await res.json()

        if (data.status === "complete") {
          clearInterval(pollRef.current!)
          setMarkers(data.markers)
          setCollectionDate(data.collectionDate)
          setNewScore(data.newScore)
          setState("complete")
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!)
          setError("We couldn't parse this PDF. Make sure it's a lab report from Quest, LabCorp, or similar.")
          setState("error")
        }
        // "pending" / "processing" — keep polling
      } catch {
        // network hiccup — keep polling
      }
    }, 2000)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  // ── Idle state ──
  if (state === "idle" || state === "error") {
    return (
      <div className="flex flex-col gap-4">
        {existingLabDate && (
          <p className="font-body text-xs" style={{ color: "var(--ink-60)" }}>
            Current labs from {existingLabDate}. Upload new results to update your score.
          </p>
        )}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer transition-all"
          style={{
            border: `1.5px dashed ${dragOver ? "var(--blood-c)" : "var(--ink-30)"}`,
            borderRadius: 4,
            background: dragOver ? "var(--blood-bg)" : "var(--warm-50)",
          }}
        >
          <span className="font-body text-2xl" style={{ color: "var(--blood-c)", fontFamily: "monospace" }}>⌗</span>
          <p className="font-body text-sm text-center" style={{ color: "var(--ink)" }}>
            Drop your lab PDF here
          </p>
          <p className="font-body text-xs" style={{ color: "var(--ink-30)" }}>or click to browse</p>
          <div className="flex gap-3 mt-1">
            {["Quest", "LabCorp", "BioReference", "Everlywell"].map(lab => (
              <span key={lab} className="font-body text-[9px] uppercase tracking-widest px-2 py-1"
                    style={{ border: "0.5px solid var(--ink-12)", color: "var(--ink-60)" }}>
                {lab}
              </span>
            ))}
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} />

        {error && (
          <div className="flex flex-col gap-2">
            <p className="font-body text-xs" style={{ color: "#991B1B" }}>{error}</p>
            <button onClick={() => { setState("idle"); setError(null) }}
                    className="self-start font-body text-xs uppercase tracking-widest"
                    style={{ color: "var(--ink-60)" }}>Try again</button>
          </div>
        )}

        {onSkip && (
          <button onClick={onSkip} className="font-body text-xs uppercase tracking-widest"
                  style={{ color: "var(--ink-30)" }}>Skip for now</button>
        )}
      </div>
    )
  }

  // ── Uploading / parsing ──
  if (state === "uploading" || state === "parsing") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
             style={{ borderColor: "var(--blood-c)", borderTopColor: "transparent" }} />
        <p className="font-body text-sm" style={{ color: "var(--ink)" }}>
          {state === "uploading" ? "Uploading your lab results..." : parsingMsg}
        </p>
        {state === "parsing" && (
          <p className="font-body text-xs" style={{ color: "var(--ink-30)" }}>
            Usually takes 10–30 seconds
          </p>
        )}
      </div>
    )
  }

  // ── Complete ──
  if (state === "complete" && markers) {
    const detectedMarkers = Object.entries(markers).filter(
      ([k, v]) => k !== "labCollectionDate" && v !== undefined
    )
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full"
               style={{ background: "var(--blood-bg)" }}>
            <span style={{ color: "var(--blood-c)" }}>✓</span>
          </div>
          <div>
            <p className="font-body text-sm font-medium" style={{ color: "var(--ink)" }}>
              {detectedMarkers.length} markers detected
            </p>
            {collectionDate && (
              <p className="font-body text-xs" style={{ color: "var(--ink-60)" }}>
                Results from {new Date(collectionDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col divide-y" style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4 }}>
          {detectedMarkers.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between px-3 py-2">
              <span className="font-body text-xs" style={{ color: "var(--ink-60)" }}>
                {MARKER_LABELS[key] ?? key}
              </span>
              <span className="font-display text-sm font-light" style={{ color: "var(--ink)" }}>
                {typeof value === "number" ? value.toFixed(1) : String(value)}
              </span>
            </div>
          ))}
        </div>

        {newScore !== null && (
          <p className="font-body text-xs" style={{ color: "var(--gold)" }}>
            Blood panel updated · New score: {newScore}
          </p>
        )}

        <button
          onClick={() => markers && newScore !== null && onSuccess(markers, newScore)}
          className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white"
          style={{ background: "var(--blood-c)" }}
        >
          Use these results →
        </button>

        <button onClick={() => { setState("idle"); setError(null) }}
                className="font-body text-xs uppercase tracking-widest"
                style={{ color: "var(--ink-30)" }}>
          Re-upload different file
        </button>
      </div>
    )
  }

  return null
}

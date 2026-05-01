"use client"

import { LabUpload } from "../../components/lab-upload"

interface Props {
  latestLab: Record<string, unknown> | null
  history: Record<string, unknown>[]
}

export function LabUploadClient({ latestLab, history }: Props) {
  return (
    <div className="flex flex-col gap-8">
      {/* Current labs */}
      {latestLab && (
        <div className="flex flex-col gap-3">
          <span className="font-body text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>
            Current results
          </span>
          <div className="p-4 bg-white" style={{ border: "0.5px solid var(--ink-12)", borderLeft: "2px solid var(--blood-c)", borderRadius: 4 }}>
            <p className="font-display text-base font-light" style={{ color: "var(--ink)" }}>
              Blood Panel · {latestLab.collected_at as string}
            </p>
            <p className="font-body text-xs mt-1" style={{ color: "var(--ink-60)" }}>
              {`Parsed via ${latestLab.parser_used as string ?? "unknown"}`}
            </p>
          </div>
        </div>
      )}

      {/* Upload new */}
      <div className="flex flex-col gap-3">
        <span className="font-body text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>
          {latestLab ? "Upload new results" : "Upload lab results"}
        </span>
        <LabUpload />
      </div>

      {/* History */}
      {history.length > 1 && (
        <div className="flex flex-col gap-3">
          <span className="font-body text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>
            Upload history
          </span>
          <div className="flex flex-col divide-y" style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4 }}>
            {history.map((lab, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <span className="font-body text-sm" style={{ color: "var(--ink)" }}>
                  {lab.collected_at as string}
                </span>
                <span className="font-body text-xs uppercase tracking-widest"
                      style={{ color: "var(--oral-c)" }}>
                  {lab.parser_used as string ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { LabUpload, type BloodMarkers } from "../../components/lab-upload"

interface Props {
  existingDate: string | null
}

export function LabsSettingsClient({ existingDate }: Props) {
  const router = useRouter()

  function handleSuccess(_markers: BloodMarkers, _score: number) {
    // Reload dashboard after a brief success moment
    setTimeout(() => router.push("/dashboard"), 1800)
  }

  return (
    <div className="min-h-svh bg-off-white">
      <main className="mx-auto max-w-[480px] px-6 py-16 flex flex-col gap-8">
        <div>
          <p
            className="font-body text-[10px] uppercase tracking-[0.12em] mb-4"
            style={{ color: "var(--ink-30)" }}
          >
            Settings / Blood Labs
          </p>
          <h1
            className="font-display text-3xl font-light"
            style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}
          >
            Blood panel
          </h1>
          <p className="font-body text-sm mt-2" style={{ color: "var(--ink-60)" }}>
            Upload your most recent results to unlock 28 points and cross-panel insights.
          </p>
          {existingDate && (
            <p
              className="font-body text-xs mt-3 px-3 py-2 inline-block"
              style={{ background: "var(--blood-bg)", color: "var(--blood-c)", borderRadius: 3 }}
            >
              Last results filed:{" "}
              {new Date(existingDate + "T12:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        <LabUpload onSuccess={handleSuccess} />
      </main>
    </div>
  )
}

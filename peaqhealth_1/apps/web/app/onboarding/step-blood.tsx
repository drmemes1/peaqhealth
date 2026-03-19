"use client"

import { LabUpload } from "../components/lab-upload"

interface Props {
  onSkip: () => void
}

export function StepBlood({ onSkip }: Props) {
  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          Upload blood labs
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          Drop a PDF from any major lab. We&apos;ll extract your biomarkers automatically.
        </p>
      </div>
      <LabUpload onSkip={onSkip} />
    </div>
  )
}

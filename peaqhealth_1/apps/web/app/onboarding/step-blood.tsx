"use client";

import { LabUpload, type BloodMarkers } from "../components/lab-upload";

interface Props {
  onConfirm: (markers: BloodMarkers, newScore: number) => void;
  onSkip: () => void;
}

export function StepBlood({ onConfirm, onSkip }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          Upload blood labs
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          Drop a PDF from any major lab. We&apos;ll extract your biomarkers automatically.
        </p>
      </div>
      <LabUpload onSuccess={onConfirm} onSkip={onSkip} />
    </div>
  );
}

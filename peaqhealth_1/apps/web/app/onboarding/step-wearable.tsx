"use client";

import { ConnectWearable } from "../components/connect-wearable";

interface Props {
  onConnect: (provider: string, retroNights: number) => void;
  onSkip: () => void;
}

export function StepWearable({ onConnect, onSkip }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          Connect your wearable
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          We pull sleep data nightly — deep sleep, HRV, SpO2, and REM.
        </p>
      </div>
      <ConnectWearable mode="onboarding" onSuccess={onConnect} onSkip={onSkip} />
    </div>
  );
}

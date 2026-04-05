"use client";

import type { OnboardingData } from "./types";

const PANEL_CHECKS: {
  label: string;
  color: string;
  dataKey: keyof OnboardingData;
  trueLabel: string;
  falseLabel: string;
}[] = [
  { label: "Sleep", color: "#185FA5", dataKey: "wearableConnected", trueLabel: "Wearable connected", falseLabel: "Not connected" },
  { label: "Blood", color: "#A32D2D", dataKey: "bloodUploaded", trueLabel: "Labs uploaded", falseLabel: "Not uploaded" },
  { label: "Oral", color: "#3B6D11", dataKey: "oralOrdered", trueLabel: "Kit ordered", falseLabel: "Not ordered" },
  { label: "Lifestyle", color: "#C49A3C", dataKey: "lifestyleCompleted", trueLabel: "Questionnaire done", falseLabel: "Not completed" },
];

interface Props {
  data: OnboardingData;
  onFinish: () => void;
  saving?: boolean;
}

export function StepDone({ data, onFinish, saving }: Props) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          You&apos;re all set
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          Your dashboard is ready. You can always add missing panels later.
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-3">
        {PANEL_CHECKS.map((p) => {
          const active = !!data[p.dataKey];
          return (
            <div key={p.label} className="flex items-center gap-3 border border-ink/10 bg-white px-4 py-3">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: p.color, opacity: active ? 1 : 0.3 }}
              />
              <div className="flex flex-col">
                <span className="font-body text-sm font-medium text-ink">{p.label}</span>
                <span className={`font-body text-xs ${active ? "text-ink/50" : "text-ink/25"}`}>
                  {active ? p.trueLabel : p.falseLabel}
                </span>
              </div>
              <div className="ml-auto">
                {active ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#3B6D11]">
                    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className="font-body text-[10px] uppercase tracking-widest text-ink/20">
                    Skip
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onFinish}
        disabled={saving}
        className="h-12 w-full max-w-md bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                   text-off-white transition-colors hover:bg-gold disabled:opacity-30"
      >
        {saving ? "Saving..." : "Go to dashboard"}
      </button>
    </div>
  );
}

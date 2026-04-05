"use client";

import { useEffect, useState } from "react";
import { ScoreRing } from "./score-ring";
import type { OnboardingData } from "./types";

interface PanelBreakdown {
  label: string;
  pts: number;
  max: number;
  color: string;
  active: boolean;
}

function computeBreakdowns(data: OnboardingData): PanelBreakdown[] {
  const sleepActive = data.wearableConnected;
  const bloodActive = data.bloodUploaded;
  const oralActive = data.oralOrdered;
  const lifestyleActive = data.lifestyleCompleted;

  return [
    {
      label: "Sleep",
      pts: sleepActive ? 21 : 0,
      max: 27,
      color: "#185FA5",
      active: sleepActive,
    },
    {
      label: "Blood",
      pts: bloodActive ? 28 : 0,
      max: 33,
      color: "#A32D2D",
      active: bloodActive,
    },
    {
      label: "Oral",
      pts: oralActive ? 19 : 0,
      max: 27,
      color: "#3B6D11",
      active: oralActive,
    },
    {
      label: "Lifestyle",
      pts: lifestyleActive ? 10 : 0,
      max: 13,
      color: "#C49A3C",
      active: lifestyleActive,
    },
  ];
}

function getScoreMessage(score: number): string {
  if (score >= 80) return "Exceptional. Your body is well-optimized.";
  if (score >= 60) return "Strong foundation. A few areas to refine.";
  if (score >= 40) return "Good start. There's room to improve.";
  return "We've captured your baseline. Let's build from here.";
}

interface Props {
  data: OnboardingData;
  onNext: () => void;
}

export function StepScore({ data, onNext }: Props) {
  const [revealed, setRevealed] = useState(false);
  const breakdowns = computeBreakdowns(data);

  const activePanels = breakdowns.filter((b) => b.active);
  const subtotal = activePanels.reduce((s, b) => s + b.pts, 0);
  const totalScore = subtotal;

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          Your peaq score
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          {getScoreMessage(totalScore)}
        </p>
      </div>

      <ScoreRing
        score={totalScore}
        sleep={{ pts: breakdowns[0]!.pts, max: breakdowns[0]!.max, active: breakdowns[0]!.active }}
        blood={{ pts: breakdowns[1]!.pts, max: breakdowns[1]!.max, active: breakdowns[1]!.active }}
        oral={{ pts: breakdowns[2]!.pts, max: breakdowns[2]!.max, active: breakdowns[2]!.active }}

        size={200}
        animate={revealed}
      />

      {/* Panel breakdown grid */}
      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        {breakdowns.map((b) => (
          <div
            key={b.label}
            className={`border px-4 py-3 transition-all ${
              b.active ? "border-ink/10 bg-white" : "border-ink/5 bg-ink/[0.02]"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: b.color, opacity: b.active ? 1 : 0.3 }}
              />
              <span className="font-body text-xs font-medium text-ink">{b.label}</span>
            </div>
            {b.active ? (
              <span className="font-display text-xl font-light text-ink">
                {b.pts}<span className="text-ink/30 text-sm">/{b.max}</span>
              </span>
            ) : (
              <span className="font-body text-[10px] uppercase tracking-widest text-ink/25">
                Locked
              </span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="h-12 w-full max-w-md bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                   text-off-white transition-colors hover:bg-gold"
      >
        Continue
      </button>
    </div>
  );
}

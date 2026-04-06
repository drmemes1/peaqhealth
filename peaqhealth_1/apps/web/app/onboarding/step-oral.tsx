"use client";

import { useState } from "react";

const FEATURES = [
  "Shannon diversity index",
  "Nitrate-reducing bacteria",
  "Periodontal pathogen load",
  "OSA-associated taxa",
];

interface Props {
  onOrder: () => void;
  onSkip: () => void;
}

export function StepOral({ onOrder, onSkip }: Props) {
  const [ordering, setOrdering] = useState(false);

  function handleOrder() {
    setOrdering(true);
    setTimeout(() => onOrder(), 800);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          Oral microbiome kit
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          A simple saliva swab reveals the bacteria shaping your cardiovascular and metabolic health.
        </p>
      </div>

      <div className="w-full max-w-md border border-ink/10 bg-white overflow-hidden">
        {/* Green header */}
        <div className="bg-[#3B6D11] px-6 py-5">
          <span className="font-body text-[10px] uppercase tracking-widest text-white/60">
            Powered by
          </span>
          <p className="font-display text-xl font-light text-white mt-1">
            DNA sequencing
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl font-light text-ink">$129</span>
            <span className="font-body text-[10px] uppercase tracking-widest text-ink/30">
              One-time kit
            </span>
          </div>

          <div className="border-t border-ink/8 pt-4 flex flex-col gap-2.5">
            <span className="font-body text-[10px] uppercase tracking-widest text-ink/30">
              What we measure
            </span>
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#3B6D11]/60" />
                <span className="font-body text-sm text-ink/70">{f}</span>
              </div>
            ))}
          </div>

          <p className="font-body text-xs text-ink/35 leading-relaxed mt-1">
            Kit ships within 2 business days. Results in 10–14 days.
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3">
        <button
          onClick={handleOrder}
          disabled={ordering}
          className="h-12 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                     text-off-white transition-colors hover:bg-gold disabled:opacity-30"
        >
          {ordering ? "Placing order..." : "Order kit — $129"}
        </button>
        <button
          onClick={onSkip}
          className="font-body text-xs text-ink/35 uppercase tracking-widest hover:text-ink/60 transition-colors"
        >
          Skip — order later
        </button>
      </div>
    </div>
  );
}

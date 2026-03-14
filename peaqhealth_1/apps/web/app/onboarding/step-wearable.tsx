"use client";

import { useState } from "react";
import type { WearableProvider } from "./types";

const DEVICES: { id: WearableProvider; name: string; icon: string }[] = [
  { id: "apple_watch", name: "Apple Watch", icon: "⌚" },
  { id: "oura",        name: "Oura Ring",   icon: "💍" },
  { id: "whoop",       name: "WHOOP",       icon: "📿" },
  { id: "garmin",      name: "Garmin",      icon: "⏱" },
];

interface Props {
  onConnect: (provider: WearableProvider) => void;
  onSkip: () => void;
}

export function StepWearable({ onConnect, onSkip }: Props) {
  const [selected, setSelected] = useState<WearableProvider | null>(null);
  const [connecting, setConnecting] = useState(false);

  function handleConnect() {
    if (!selected) return;
    setConnecting(true);
    setTimeout(() => onConnect(selected), 800);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          Connect your wearable
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          We pull sleep data nightly — deep sleep, HRV, SpO2, and REM.
        </p>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        {DEVICES.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelected(d.id)}
            className={`flex flex-col items-center gap-3 rounded-none border p-6 transition-all ${
              selected === d.id
                ? "border-gold bg-gold/5"
                : "border-ink/10 bg-white hover:border-ink/25"
            }`}
          >
            <span className="text-3xl">{d.icon}</span>
            <span className="font-body text-sm font-medium text-ink">{d.name}</span>
            {selected === d.id && (
              <span className="font-body text-[10px] uppercase tracking-widest text-gold">
                Selected
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex w-full max-w-md flex-col gap-3">
        <button
          onClick={handleConnect}
          disabled={!selected || connecting}
          className="h-12 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                     text-off-white transition-colors hover:bg-gold disabled:opacity-30"
        >
          {connecting
            ? "Connecting..."
            : selected
              ? `Connect ${DEVICES.find((d) => d.id === selected)?.name}`
              : "Select a device"}
        </button>
        <button
          onClick={onSkip}
          className="font-body text-xs text-ink/35 uppercase tracking-widest hover:text-ink/60 transition-colors"
        >
          I don&apos;t have a wearable
        </button>
      </div>
    </div>
  );
}

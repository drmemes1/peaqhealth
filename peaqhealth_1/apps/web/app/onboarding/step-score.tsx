"use client";

import { useEffect, useState } from "react";
import type { OnboardingData } from "./types";

const serif = "var(--font-manrope), system-ui, sans-serif"

function getBandMessage(band: string): string {
  if (band === "EXCEPTIONAL") return "Exceptional. Your biology is well ahead of your age.";
  if (band === "OPTIMIZED") return "Optimized. Strong signals across your panels.";
  if (band === "ON PACE") return "On pace. A few areas to refine.";
  if (band === "ELEVATED") return "We've captured your baseline. Targeted actions ahead.";
  return "Your starting point. Every signal is actionable.";
}

const BAND_COLORS: Record<string, string> = {
  EXCEPTIONAL: "#34d399",
  OPTIMIZED:   "#34d399",
  "ON PACE":   "#fbbf24",
  ELEVATED:    "#fb923c",
  ACCELERATED: "#f87171",
}

interface Props {
  data: OnboardingData;
  onNext: () => void;
}

export function StepScore({ data, onNext }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [peaqAge, setPeaqAge] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/score/latest")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.peaq_age_breakdown) setPeaqAge(d.peaq_age_breakdown);
      })
      .catch(() => {});
    const t = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(t);
  }, []);

  const age = (peaqAge?.peaqAge as number) ?? 35;
  const chronoAge = (peaqAge?.chronoAge as number) ?? 35;
  const delta = (peaqAge?.delta as number) ?? 0;
  const band = (peaqAge?.band as string) ?? "ON PACE";
  const color = BAND_COLORS[band] ?? "#fbbf24";

  const deltaStr = delta > 0
    ? `${delta.toFixed(1)} years younger than your chronological age of ${chronoAge}`
    : delta < 0
      ? `${Math.abs(delta).toFixed(1)} years older than your chronological age of ${chronoAge}`
      : `on pace with your chronological age of ${chronoAge}`;

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h2 className="font-display text-4xl font-light tracking-tight text-ink">
          Your Oravi Age
        </h2>
        <p className="mt-3 font-body text-sm text-ink/50">
          {getBandMessage(band)}
        </p>
      </div>

      {/* Oravi Age number — animated count-up */}
      <div className="flex flex-col items-center">
        <span style={{
          fontFamily: serif, fontSize: 72, fontWeight: 300,
          color: "var(--ink)", lineHeight: 1, letterSpacing: -1,
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 1s ease, transform 1s ease",
        }}>
          {age.toFixed(1)}
        </span>
        <span className="font-body text-xs text-ink/40 uppercase tracking-widest mt-1">
          years
        </span>
        <span style={{
          fontFamily: serif, fontSize: 16, fontStyle: "italic",
          color, marginTop: 8,
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.8s ease 0.6s",
        }}>
          {deltaStr}
        </span>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "3px 14px", borderRadius: 20, marginTop: 12,
          background: `${color}18`, color, border: `0.5px solid ${color}40`,
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.8s ease 0.8s",
        }}>
          {band}
        </span>
      </div>

      {/* Panel status */}
      <div className="grid w-full max-w-md grid-cols-3 gap-3">
        {([
          { label: "Sleep", color: "#4A7FB5", active: data.wearableConnected },
          { label: "Blood", color: "#C0392B", active: data.bloodUploaded },
          { label: "Oral",  color: "#2D6A4F", active: data.oralOrdered },
        ] as const).map(p => (
          <div key={p.label} className={`border px-4 py-3 text-center ${p.active ? "border-ink/10 bg-white" : "border-ink/5 bg-ink/[0.02]"}`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color, opacity: p.active ? 1 : 0.3 }} />
              <span className="font-body text-xs font-medium text-ink">{p.label}</span>
            </div>
            <span className="font-body text-[10px] uppercase tracking-widest" style={{ color: p.active ? p.color : "rgba(20,20,16,0.25)" }}>
              {p.active ? "Active" : "Pending"}
            </span>
          </div>
        ))}
      </div>

      <p className="font-body text-xs text-ink/35 text-center max-w-sm leading-relaxed">
        Your Oravi Age will refine as more panels come online. Each additional data source sharpens the picture.
      </p>

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

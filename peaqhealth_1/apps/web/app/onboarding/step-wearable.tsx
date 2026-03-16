"use client";

import { useState } from "react";
import { ConnectWearable } from "../components/connect-wearable";

interface Props {
  onConnect: (provider: string, retroNights: number) => void;
  onSkip: () => void;
}

interface NightEntry {
  date: string;
  bedtime: string;
  wake_time: string;
  quality: number;
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function ManualSleepForm({
  onSuccess,
  onBack,
}: {
  onSuccess: (retroNights: number) => void;
  onBack: () => void;
}) {
  const nights: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 7 + i);
    return d.toISOString().slice(0, 10);
  });

  const [entries, setEntries] = useState<NightEntry[]>(
    nights.map((date) => ({ date, bedtime: "23:00", wake_time: "07:00", quality: 3 }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, field: keyof NightEntry, value: string | number) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sleep/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onSuccess(7);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="grid items-center gap-2 px-1" style={{ gridTemplateColumns: "1fr 72px 72px 80px" }}>
        <span className="font-body text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>Night</span>
        <span className="font-body text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>Bed</span>
        <span className="font-body text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>Wake</span>
        <span className="font-body text-[9px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>Quality</span>
      </div>

      {entries.map((entry, i) => (
        <div
          key={entry.date}
          className="grid items-center gap-2 p-3"
          style={{ gridTemplateColumns: "1fr 72px 72px 80px", border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "white" }}
        >
          <span className="font-body text-xs" style={{ color: "var(--ink-60)" }}>
            {formatDate(entry.date)}
          </span>
          <input
            type="time"
            value={entry.bedtime}
            onChange={(e) => update(i, "bedtime", e.target.value)}
            className="font-body text-xs w-full"
            style={{ color: "var(--ink)", background: "transparent", border: "none", outline: "none" }}
          />
          <input
            type="time"
            value={entry.wake_time}
            onChange={(e) => update(i, "wake_time", e.target.value)}
            className="font-body text-xs w-full"
            style={{ color: "var(--ink)", background: "transparent", border: "none", outline: "none" }}
          />
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                onClick={() => update(i, "quality", q)}
                className="h-3.5 w-3.5 rounded-full transition-all"
                style={{ background: q <= entry.quality ? "var(--sleep-c)" : "var(--ink-12)" }}
                aria-label={`Quality ${q}`}
              />
            ))}
          </div>
        </div>
      ))}

      {error && (
        <p className="font-body text-xs" style={{ color: "#991B1B" }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        style={{ background: "var(--sleep-c)" }}
      >
        {submitting ? "Saving..." : "Save sleep data"}
      </button>

      <button
        onClick={onBack}
        className="font-body text-xs uppercase tracking-widest"
        style={{ color: "var(--ink-30)" }}
      >
        ← Back to connect wearable
      </button>
    </div>
  );
}

export function StepWearable({ onConnect, onSkip }: Props) {
  const [mode, setMode] = useState<"connect" | "manual">("connect");

  if (mode === "manual") {
    return (
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <h2 className="font-display text-4xl font-light tracking-tight text-ink">
            Enter sleep manually
          </h2>
          <p className="mt-3 font-body text-sm text-ink/50">
            Log your last 7 nights — bedtime, wake time, and how well you slept.
          </p>
        </div>
        <ManualSleepForm
          onSuccess={(retroNights) => onConnect("manual", retroNights)}
          onBack={() => setMode("connect")}
        />
      </div>
    );
  }

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
      <div className="text-center">
        <button
          onClick={() => setMode("manual")}
          className="font-body text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-30)" }}
        >
          No wearable yet? Enter your sleep manually.
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useVitalLink } from "@tryvital/vital-link";
import type { WearableProvider } from "./types";

interface Props {
  onConnect: (provider: WearableProvider) => void;
  onSkip: () => void;
}

export function StepWearable({ onConnect, onSkip }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccess = useCallback(
    (metadata: { provider_slug?: string }) => {
      // Map the Junction provider slug to our WearableProvider type
      const slug = metadata.provider_slug ?? "";
      const providerMap: Record<string, WearableProvider> = {
        apple_health_kit: "apple_watch",
        oura: "oura",
        whoop: "whoop",
        garmin: "garmin",
      };
      const provider = providerMap[slug] ?? "oura";
      onConnect(provider);
    },
    [onConnect]
  );

  const onExit = useCallback(() => {
    setLoading(false);
  }, []);

  const onError = useCallback(() => {
    setError("Connection failed. Please try again.");
    setLoading(false);
  }, []);

  const { open, ready } = useVitalLink({
    onSuccess,
    onExit,
    onError,
    env: (process.env.NEXT_PUBLIC_JUNCTION_ENV as "sandbox" | "production") ?? "sandbox",
  });

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/junction/link-token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to get link token");

      const { link_token } = await res.json();
      open(link_token);
    } catch {
      setError("Could not start wearable connection. Please try again.");
      setLoading(false);
    }
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

      <div className="flex w-full max-w-md flex-col gap-3">
        <button
          onClick={handleConnect}
          disabled={loading || !ready}
          className="h-12 bg-ink font-body text-sm font-medium uppercase tracking-[0.15em]
                     text-off-white transition-colors hover:bg-gold disabled:opacity-30"
        >
          {loading ? "Opening..." : "Connect a wearable"}
        </button>

        {error && (
          <p className="font-body text-xs text-red-500 text-center">{error}</p>
        )}

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

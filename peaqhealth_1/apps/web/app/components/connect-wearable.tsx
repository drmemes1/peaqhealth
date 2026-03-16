"use client"

import { useState } from "react"
import { useVitalLink } from "@tryvital/vital-link"

interface ConnectWearableProps {
  onSuccess: (provider: string, retroNights: number) => void
  onSkip?: () => void
  mode: "onboarding" | "dashboard"
}

const DEVICES = [
  { id: "apple_health", label: "Apple Watch", icon: "◎" },
  { id: "oura",         label: "Oura Ring",   icon: "○" },
  { id: "whoop",        label: "WHOOP",        icon: "⌇" },
  { id: "garmin",       label: "Garmin",       icon: "◈" },
]

export function ConnectWearable({ onSuccess, onSkip, mode }: ConnectWearableProps) {
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [retroNights, setRetroNights] = useState(0)
  const [provider, setProvider] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { open: openWidget, ready } = useVitalLink({
    onSuccess: async (metadata: { userId?: string; connected?: Array<{ providerSlug?: string; name?: string }> }) => {
      setError(null)
      const providerSlug = metadata.connected?.[0]?.providerSlug
        ?? metadata.connected?.[0]?.name?.toLowerCase().replace(/\s+/g, "_")
        ?? "unknown"
      const junctionUserId = metadata.userId ?? ""
      try {
        const res = await fetch("/api/junction/wearable-connected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: providerSlug, junctionUserId }),
        })
        const data = await res.json()
        setProvider(providerSlug)
        setRetroNights(data.retroNights ?? 0)
        setConnected(true)
        setConnecting(false)
        onSuccess(providerSlug, data.retroNights ?? 0)
      } catch {
        setError("Connection saved but score update failed. Refresh the page.")
        setConnecting(false)
      }
    },
    onExit: () => setConnecting(false),
    onError: (err: { message?: string }) => {
      setError(err.message ?? "Connection failed")
      setConnecting(false)
    },
    env: (process.env.NEXT_PUBLIC_JUNCTION_ENV ?? "sandbox") as "sandbox" | "production",
  })

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const res = await fetch("/api/junction/link-token", { method: "POST" })
      if (!res.ok) throw new Error("Failed to get link token")
      const data = await res.json()
      const linkToken = data.link_token ?? data.linkToken
      openWidget(linkToken)
    } catch {
      setError("Could not initialise connection. Please try again.")
      setConnecting(false)
    }
  }

  if (connected) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full"
             style={{ background: "var(--sleep-bg)" }}>
          <span className="font-body text-2xl" style={{ color: "var(--sleep-c)" }}>✓</span>
        </div>
        <p className="font-display text-xl font-light" style={{ color: "var(--ink)" }}>
          {provider.replace(/_/g, " ")} connected.
        </p>
        <p className="font-body text-sm" style={{ color: "var(--ink-60)" }}>
          Found {retroNights} night{retroNights !== 1 ? "s" : ""} of sleep data.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Device grid */}
      <div className="grid grid-cols-2 gap-3">
        {DEVICES.map(d => (
          <div
            key={d.id}
            className="flex items-center gap-3 p-3"
            style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "white" }}
          >
            <span className="font-body text-lg" style={{ color: "var(--sleep-c)", fontFamily: "monospace" }}>
              {d.icon}
            </span>
            <span className="font-body text-xs" style={{ color: "var(--ink)" }}>{d.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="font-body text-xs" style={{ color: "#991B1B" }}>{error}</p>
      )}

      <button
        disabled={!ready || connecting}
        onClick={handleConnect}
        className="h-12 w-full font-body text-xs uppercase tracking-[0.08em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
        style={{ background: "var(--sleep-c)" }}
      >
        {connecting ? "Connecting..." : "Connect your device"}
      </button>

      {onSkip && (
        <button
          onClick={onSkip}
          className="font-body text-xs uppercase tracking-widest"
          style={{ color: "var(--ink-30)" }}
        >
          Skip for now
        </button>
      )}
    </div>
  )
}

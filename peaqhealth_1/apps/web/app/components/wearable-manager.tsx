"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useVitalLink } from "@tryvital/vital-link"

export interface WearableManagerProps {
  whoopConnected: boolean
  whoopLastSynced: string | null
  lastSyncRequestedAt?: string | null
  isPolling?: boolean
  onSyncSuccess?: () => void
  onDisconnected?: () => void
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
}

function minutesUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000))
}

export function WearableManager({
  whoopConnected,
  whoopLastSynced,
  lastSyncRequestedAt,
  isPolling = false,
  onSyncSuccess,
  onDisconnected,
}: WearableManagerProps) {
  type SyncState = "idle" | "loading" | "success" | "rate-limited"
  const [syncState, setSyncState] = useState<SyncState>("idle")
  const [nextSyncAt, setNextSyncAt] = useState<string | null>(null)
  const [minsUntil, setMinsUntil] = useState(0)
  const [disconnectConfirm, setDisconnectConfirm] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [junctionConnecting, setJunctionConnecting] = useState(false)
  const [junctionError, setJunctionError] = useState<string | null>(null)

  // Detect existing rate limit on mount
  useEffect(() => {
    if (!whoopConnected || !lastSyncRequestedAt) return
    const expiry = new Date(new Date(lastSyncRequestedAt).getTime() + 60 * 60000).toISOString()
    const mins = minutesUntil(expiry)
    if (mins > 0) {
      setNextSyncAt(expiry)
      setMinsUntil(mins)
      setSyncState("rate-limited")
    }
  }, [whoopConnected, lastSyncRequestedAt])

  // Countdown timer for rate-limit
  useEffect(() => {
    if (syncState !== "rate-limited" || !nextSyncAt) return
    const interval = setInterval(() => {
      const mins = minutesUntil(nextSyncAt)
      setMinsUntil(mins)
      if (mins <= 0) { setSyncState("idle"); clearInterval(interval) }
    }, 30000)
    setMinsUntil(minutesUntil(nextSyncAt))
    return () => clearInterval(interval)
  }, [syncState, nextSyncAt])

  const { open: openWidget, ready: widgetReady } = useVitalLink({
    onSuccess: async (metadata: { userId?: string; connected?: Array<{ providerSlug?: string; name?: string }> }) => {
      setJunctionError(null)
      const providerSlug = metadata.connected?.[0]?.providerSlug
        ?? metadata.connected?.[0]?.name?.toLowerCase().replace(/\s+/g, "_")
        ?? "unknown"
      const junctionUserId = metadata.userId ?? ""
      try {
        await fetch("/api/junction/wearable-connected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: providerSlug, junctionUserId }),
        })
        onSyncSuccess?.()
      } catch {
        setJunctionError("Connection saved but score update failed — please refresh.")
      } finally {
        setJunctionConnecting(false)
      }
    },
    onExit: () => setJunctionConnecting(false),
    onError: (err: { message?: string }) => {
      setJunctionError(err.message ?? "Connection failed")
      setJunctionConnecting(false)
    },
    env: (process.env.NEXT_PUBLIC_JUNCTION_ENV ?? "sandbox") as "sandbox" | "production",
  })

  const handleSync = async () => {
    setSyncState("loading")
    try {
      const res = await fetch("/api/wearable/resync", { method: "POST" })
      const body = await res.json() as { next_sync_available_at?: string; error?: string }
      if (res.status === 429 && body.next_sync_available_at) {
        setNextSyncAt(body.next_sync_available_at)
        setMinsUntil(minutesUntil(body.next_sync_available_at))
        setSyncState("rate-limited")
        return
      }
      if (!res.ok) { setSyncState("idle"); return }
      if (body.next_sync_available_at) setNextSyncAt(body.next_sync_available_at)
      setSyncState("success")
      onSyncSuccess?.()
      setTimeout(() => setSyncState("idle"), 5000)
    } catch {
      setSyncState("idle")
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch("/api/auth/whoop/disconnect", { method: "POST" })
      onDisconnected?.()
    } finally {
      setDisconnecting(false)
    }
  }

  const handleJunction = async () => {
    setJunctionConnecting(true)
    setJunctionError(null)
    try {
      const res = await fetch("/api/junction/link-token", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string; error?: string }
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { link_token?: string; linkToken?: string }
      const linkToken = data.link_token ?? data.linkToken
      if (!linkToken) throw new Error("No link token returned from server")
      if (!widgetReady) throw new Error("Widget not ready — please refresh and try again")
      openWidget(linkToken)
    } catch (err) {
      setJunctionError(err instanceof Error ? err.message : "Unknown error")
      setJunctionConnecting(false)
    }
  }

  const syncLabel =
    syncState === "loading"        ? "Refreshing..."
    : syncState === "success"      ? "✓ Requested"
    : syncState === "rate-limited" ? `Available in ${minsUntil}m`
    : "Refresh data"

  const divider = <div style={{ height: "0.5px", background: "var(--ink-12)", margin: "0 16px" }} />

  const sharedBtnStyle: React.CSSProperties = {
    fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
    fontSize: 11, background: "none",
    border: "0.5px solid var(--ink-30)", padding: "5px 12px",
    whiteSpace: "nowrap",
  }

  return (
    <>
      <div className="overflow-hidden" style={{ border: "0.5px solid var(--ink-12)", borderRadius: 8 }}>

        {/* ── WHOOP ── */}
        <div className="flex items-start justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0, display: "inline-block",
              background: whoopConnected ? "#22C55E" : "rgba(20,20,16,0.22)",
            }} />
            <div className="min-w-0">
              <p className="font-body text-sm" style={{ color: "var(--ink)" }}>WHOOP</p>
              <p className="mt-0.5 font-body text-xs" style={{ color: "var(--ink-60)" }}>
                {whoopConnected
                  ? whoopLastSynced
                    ? `Last synced ${relativeTime(whoopLastSynced)}${isPolling ? " · Waiting for new data..." : ""}`
                    : "Connected — not yet synced"
                  : "Direct OAuth · Band 4.0 & 5.0"}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {whoopConnected ? (
              disconnectConfirm ? (
                <div style={{ textAlign: "right" }}>
                  <p className="font-body" style={{ fontSize: 11, color: "var(--ink-60)", marginBottom: 6, maxWidth: 220, lineHeight: 1.5 }}>
                    Disconnect WHOOP? Your sleep data will remain but live sync will stop.
                  </p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setDisconnectConfirm(false)} className="font-body"
                      style={{ fontSize: 11, color: "var(--ink-40)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={handleDisconnect} disabled={disconnecting} className="font-body"
                      style={{ fontSize: 11, color: "#DC2626", background: "none", border: "none", padding: 0, cursor: "pointer", opacity: disconnecting ? 0.5 : 1 }}>
                      {disconnecting ? "Disconnecting…" : "Disconnect"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleSync}
                    disabled={syncState === "loading" || syncState === "rate-limited"}
                    style={{
                      ...sharedBtnStyle,
                      fontSize: 10, letterSpacing: "0.05em", borderRadius: 4, padding: "3px 8px",
                      color: syncState === "success" ? "var(--gold)" : syncState === "rate-limited" ? "rgba(20,20,16,0.30)" : "var(--ink)",
                      borderColor: syncState === "rate-limited" ? "rgba(20,20,16,0.12)" : "rgba(20,20,16,0.30)",
                      cursor: syncState === "loading" || syncState === "rate-limited" ? "default" : "pointer",
                    }}
                  >
                    {syncLabel}
                  </button>
                  <button onClick={() => setDisconnectConfirm(true)} className="font-body"
                    style={{ fontSize: 11, color: "rgba(20,20,16,0.30)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                    Disconnect
                  </button>
                </>
              )
            ) : (
              <a href="/api/auth/whoop/connect"
                style={{ ...sharedBtnStyle, color: "var(--ink)", textDecoration: "none", cursor: "pointer" }}>
                Connect
              </a>
            )}
          </div>
        </div>

        {divider}

        {/* ── Oura Ring ── */}
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, display: "inline-block", background: "rgba(20,20,16,0.22)" }} />
            <div>
              <p className="font-body text-sm" style={{ color: "var(--ink)" }}>Oura Ring</p>
              <p className="mt-0.5 font-body text-xs" style={{ color: "var(--ink-60)" }}>Via Junction · Gen 3 &amp; 4</p>
            </div>
          </div>
          <button onClick={handleJunction} disabled={!widgetReady || junctionConnecting}
            style={{ ...sharedBtnStyle, color: "var(--ink)", cursor: !widgetReady || junctionConnecting ? "default" : "pointer", opacity: !widgetReady ? 0.4 : 1 }}>
            {junctionConnecting ? "Loading…" : "Connect"}
          </button>
        </div>

        {divider}

        {/* ── More devices ── */}
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-body text-sm" style={{ color: "var(--ink)" }}>More devices</p>
            <p className="mt-0.5 font-body text-xs" style={{ color: "var(--ink-60)" }}>Garmin · Fitbit · Samsung Health · Polar</p>
          </div>
          <button onClick={handleJunction} disabled={!widgetReady || junctionConnecting}
            style={{ ...sharedBtnStyle, color: "var(--ink-60)", borderColor: "rgba(20,20,16,0.20)", cursor: !widgetReady || junctionConnecting ? "default" : "pointer", opacity: !widgetReady || junctionConnecting ? 0.4 : 1 }}>
            {junctionConnecting ? "Loading…" : "Browse →"}
          </button>
        </div>

        {divider}

        {/* ── Apple Health ── */}
        <div className="flex items-center justify-between gap-4 px-4 py-4" style={{ background: "rgba(184,134,11,0.02)" }}>
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
              <path d="M11 4C11 4 9 2 7 3C6 5 7 8 9 9C8 10 7 12 7 14C7 17 9 19 11 19C13 19 15 17 15 14C15 12 14 10 13 9C15 8 16 5 15 3C13 2 11 4 11 4Z"
                fill="rgba(184,134,11,0.45)" />
            </svg>
            <div>
              <p className="font-body text-sm" style={{ color: "var(--ink)" }}>Apple Health &amp; Apple Watch</p>
              <p className="mt-0.5 font-body text-xs" style={{ color: "var(--ink-60)" }}>Coming to the iOS app</p>
            </div>
          </div>
          <Link href="/#waitlist"
            style={{ ...sharedBtnStyle, color: "var(--gold)", borderColor: "rgba(184,134,11,0.4)", textDecoration: "none", cursor: "pointer" }}>
            Notify me
          </Link>
        </div>

      </div>

      {junctionError && (
        <p className="font-body text-xs mt-2" style={{ color: "#991B1B" }}>{junctionError}</p>
      )}
    </>
  )
}

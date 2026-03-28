"use client"

import Link from "next/link"
import { useState } from "react"
import { useVitalLink } from "@tryvital/vital-link"

export interface JunctionConnection {
  provider: string
  lastSynced: string | null
}

export interface WearableManagerProps {
  whoopConnected: boolean
  whoopLastSynced: string | null
  whoopNeedsReconnect?: boolean
  junctionConnections?: JunctionConnection[]
  onDisconnected?: () => void
  onJunctionDisconnected?: (provider: string) => void
}

const PROVIDER_LABELS: Record<string, string> = {
  oura:         "Oura Ring",
  garmin:       "Garmin",
  fitbit:       "Fitbit",
  samsung:      "Samsung Health",
  polar:        "Polar",
  apple_health: "Apple Health",
}

const PROVIDER_SUBS: Record<string, string> = {
  oura:    "Via Junction · Gen 3 & 4",
  garmin:  "Via Junction",
  fitbit:  "Via Junction",
  samsung: "Via Junction",
  polar:   "Via Junction",
}

function providerLabel(p: string): string {
  return PROVIDER_LABELS[p] ?? p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function providerSub(p: string): string {
  return PROVIDER_SUBS[p] ?? "Via Junction"
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

export function WearableManager({
  whoopConnected,
  whoopLastSynced,
  whoopNeedsReconnect = false,
  junctionConnections = [],
  onDisconnected,
  onJunctionDisconnected,
}: WearableManagerProps) {
  const [disconnectConfirm, setDisconnectConfirm] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmProvider, setConfirmProvider] = useState<string | null>(null)
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null)
  const [junctionConnecting, setJunctionConnecting] = useState(false)
  const [junctionError, setJunctionError] = useState<string | null>(null)

  const { open: openWidget, ready: widgetReady } = useVitalLink({
    onSuccess: async (metadata: Record<string, unknown>) => {
      setJunctionError(null)
      console.log("[junction] onSuccess raw metadata:", JSON.stringify(metadata))
      const connectedArr = (metadata.connected as Array<Record<string, unknown>> | undefined)
      const firstConnected = connectedArr?.[0]
      const sourceObj = firstConnected?.source as Record<string, unknown> | undefined
      const providerSlug: string =
        (sourceObj?.slug as string | undefined) ??
        (firstConnected?.providerSlug as string | undefined) ??
        (firstConnected?.slug as string | undefined) ??
        (firstConnected?.sourceType as string | undefined) ??
        (firstConnected?.name as string | undefined)?.toLowerCase().replace(/\s+/g, "_") ??
        "unknown"
      const junctionUserId: string =
        (metadata.userId as string | undefined) ??
        (metadata.user_id as string | undefined) ??
        ""
      console.log("[junction] extracted provider:", providerSlug, "junctionUserId:", junctionUserId)
      try {
        await fetch("/api/junction/wearable-connected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: providerSlug, junctionUserId, rawMetadata: metadata }),
        })
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

  const handleWhoopDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch("/api/auth/whoop/disconnect", { method: "POST" })
      onDisconnected?.()
    } finally {
      setDisconnecting(false)
    }
  }

  const handleJunctionDisconnect = async (provider: string) => {
    setDisconnectingProvider(provider)
    try {
      if (provider === "oura") {
        await fetch("/api/auth/oura/disconnect", { method: "POST" })
      } else {
        await fetch("/api/wearable/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        })
      }
      onJunctionDisconnected?.(provider)
    } finally {
      setDisconnectingProvider(null)
      setConfirmProvider(null)
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
              background: whoopNeedsReconnect
                ? "#F59E0B"
                : whoopConnected
                  ? "#22C55E"
                  : "rgba(20,20,16,0.22)",
            }} />
            <div className="min-w-0">
              <p className="font-body text-sm" style={{ color: "var(--ink)" }}>WHOOP</p>
              <p className="mt-0.5 font-body text-xs" style={{ color: "var(--ink-60)" }}>
                {whoopNeedsReconnect
                  ? "WHOOP connection expired"
                  : whoopConnected
                    ? whoopLastSynced
                      ? `Last synced ${relativeTime(whoopLastSynced)} · syncs nightly`
                      : "Connected · syncs nightly"
                    : "Direct OAuth · Band 4.0 & 5.0"}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {whoopNeedsReconnect ? (
              <a href="/api/auth/whoop/connect"
                style={{ ...sharedBtnStyle, color: "#92400E", borderColor: "#F59E0B", textDecoration: "none", cursor: "pointer" }}>
                Reconnect
              </a>
            ) : whoopConnected ? (
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
                    <button onClick={handleWhoopDisconnect} disabled={disconnecting} className="font-body"
                      style={{ fontSize: 11, color: "#DC2626", background: "none", border: "none", padding: 0, cursor: "pointer", opacity: disconnecting ? 0.5 : 1 }}>
                      {disconnecting ? "Disconnecting…" : "Disconnect"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setDisconnectConfirm(true)} className="font-body"
                  style={{ fontSize: 11, color: "rgba(20,20,16,0.30)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  Disconnect
                </button>
              )
            ) : (
              <a href="/api/auth/whoop/connect"
                style={{ ...sharedBtnStyle, color: "var(--ink)", textDecoration: "none", cursor: "pointer" }}>
                Connect
              </a>
            )}
          </div>
        </div>

        {/* ── Junction-connected devices (dynamic) ── */}
        {junctionConnections.map((conn) => (
          <div key={conn.provider}>
            {divider}
            <div className="flex items-start justify-between gap-4 px-4 py-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, display: "inline-block", background: "#22C55E" }} />
                <div className="min-w-0">
                  <p className="font-body text-sm" style={{ color: "var(--ink)" }}>{providerLabel(conn.provider)}</p>
                  <p className="mt-0.5 font-body text-xs" style={{ color: "var(--ink-60)" }}>
                    {conn.lastSynced
                      ? `Last synced ${relativeTime(conn.lastSynced)} · syncs nightly`
                      : `${providerSub(conn.provider)} · syncs nightly`}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1.5">
                {confirmProvider === conn.provider ? (
                  <div style={{ textAlign: "right" }}>
                    <p className="font-body" style={{ fontSize: 11, color: "var(--ink-60)", marginBottom: 6, maxWidth: 220, lineHeight: 1.5 }}>
                      Disconnect {providerLabel(conn.provider)}? Your sleep data will remain but live sync will stop.
                    </p>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button onClick={() => setConfirmProvider(null)} className="font-body"
                        style={{ fontSize: 11, color: "var(--ink-40)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                        Cancel
                      </button>
                      <button
                        onClick={() => handleJunctionDisconnect(conn.provider)}
                        disabled={disconnectingProvider === conn.provider}
                        className="font-body"
                        style={{ fontSize: 11, color: "#DC2626", background: "none", border: "none", padding: 0, cursor: "pointer", opacity: disconnectingProvider === conn.provider ? 0.5 : 1 }}
                      >
                        {disconnectingProvider === conn.provider ? "Disconnecting…" : "Disconnect"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmProvider(conn.provider)} className="font-body"
                    style={{ fontSize: 11, color: "rgba(20,20,16,0.30)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {divider}

        {/* ── Connect via Junction ── */}
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-body text-sm" style={{ color: "var(--ink)" }}>
              {junctionConnections.length > 0 ? "Add another device" : "More devices"}
            </p>
            <p className="mt-0.5 font-body text-xs" style={{ color: "var(--ink-60)" }}>
              Oura Ring · Garmin · Fitbit · Samsung · Polar
            </p>
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

"use client"

import { useState } from "react"
import Link from "next/link"
import { useVitalLink } from "@tryvital/vital-link"

interface ConnectWearableProps {
  onSuccess: (provider: string, retroNights: number) => void
  onSkip?: () => void
  mode: "onboarding" | "dashboard"
}

// ─── Wearable definitions ──────────────────────────────────────────────────

const FEATURED = [
  {
    id: "whoop",
    label: "WHOOP",
    sub: "Direct OAuth · Band 4.0 & 5.0",
    method: "whoop_oauth" as const,
    color: "#000000",
    badge: null,
    icon: (
      <svg width="28" height="14" viewBox="0 0 28 14" fill="none">
        <rect width="28" height="14" rx="7" fill="#000"/>
        <text x="14" y="10.5" textAnchor="middle" fill="white"
          style={{ fontSize: 7, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em" }}>
          WHOOP
        </text>
      </svg>
    ),
  },
  {
    id: "oura",
    label: "Oura Ring",
    sub: "Via Junction · Gen 3 & 4",
    method: "junction" as const,
    color: "#1a1a2e",
    badge: null,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9" stroke="#1a1a2e" strokeWidth="2.5" fill="none"/>
        <circle cx="11" cy="11" r="3.5" fill="#1a1a2e"/>
      </svg>
    ),
  },
]

const OTHER_DEVICES = [
  { id: "garmin",  label: "Garmin" },
  { id: "fitbit",  label: "Fitbit" },
  { id: "samsung", label: "Samsung Health" },
  { id: "polar",   label: "Polar" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function ConnectWearable({ onSuccess, onSkip, mode }: ConnectWearableProps) {
  const [connecting, setConnecting] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [retroNights, setRetroNights] = useState(0)
  const [connectedLabel, setConnectedLabel] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { open: openWidget, ready } = useVitalLink({
    onSuccess: async (metadata: Record<string, unknown>) => {
      setError(null)
      console.log("[junction] onSuccess raw metadata:", JSON.stringify(metadata))
      const connectedArr = (metadata.connected as Array<Record<string, unknown>> | undefined)
      const providerSlug: string =
        (connectedArr?.[0]?.providerSlug as string | undefined) ??
        (connectedArr?.[0]?.slug as string | undefined) ??
        ((metadata.source as Record<string, unknown> | undefined)?.slug as string | undefined) ??
        (connectedArr?.[0]?.name as string | undefined)?.toLowerCase().replace(/\s+/g, "_") ??
        "unknown"
      const junctionUserId: string =
        (metadata.userId as string | undefined) ??
        (metadata.user_id as string | undefined) ??
        ""
      console.log("[junction] extracted provider:", providerSlug, "junctionUserId:", junctionUserId)
      try {
        const res = await fetch("/api/junction/wearable-connected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: providerSlug, junctionUserId }),
        })
        const data = await res.json()
        setConnectedLabel(providerSlug.replace(/_/g, " "))
        setRetroNights(data.retroNights ?? 0)
        setConnected(true)
        setConnecting(null)
        onSuccess(providerSlug, data.retroNights ?? 0)
      } catch {
        setError("Connection saved but score update failed — please refresh.")
        setConnecting(null)
      }
    },
    onExit: () => setConnecting(null),
    onError: (err: { message?: string }) => {
      setError(err.message ?? "Connection failed")
      setConnecting(null)
    },
    env: (process.env.NEXT_PUBLIC_JUNCTION_ENV ?? "sandbox") as "sandbox" | "production",
  })

  async function handleJunction() {
    setConnecting("junction")
    setError(null)
    try {
      const res = await fetch("/api/junction/link-token", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string; error?: string }
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as { link_token?: string; linkToken?: string }
      const linkToken = data.link_token ?? data.linkToken
      if (!linkToken) throw new Error("No link token returned from server")
      if (!ready) throw new Error("Widget not ready — please refresh and try again")
      openWidget(linkToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setConnecting(null)
    }
  }

  // ── Connected state ────────────────────────────────────────────────────────

  if (connected) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "rgba(74,127,181,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <span style={{ fontSize: 22, color: "var(--sleep-c)" }}>✓</span>
        </div>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: "0 0 6px",
        }}>
          {connectedLabel} connected
        </p>
        <p style={{
          fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
          fontSize: 13, color: "var(--ink-60)", margin: 0,
        }}>
          Found {retroNights} night{retroNights !== 1 ? "s" : ""} of sleep data.
        </p>
      </div>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Section label */}
      <p style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em",
        color: "var(--ink-40)", margin: 0,
      }}>
        Choose your device
      </p>

      {/* Featured — WHOOP + Oura */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {FEATURED.map(device => {
          const isLoading = connecting === device.id
          const isWhoop   = device.method === "whoop_oauth"

          return (
            <div key={device.id} style={{ display: "flex", flexDirection: "column" }}>
              {isWhoop ? (
                // WHOOP — direct OAuth redirect.
                // Onboarding passes returnTo so callback returns with ?whoop=connected
                // signal instead of doing its own onboarding_completed check.
                <a
                  href={mode === "onboarding"
                    ? `/api/auth/whoop/connect?returnTo=${encodeURIComponent("/onboarding?whoop=connected")}`
                    : "/api/auth/whoop/connect"
                  }
                  style={{
                    display: "flex", flexDirection: "column", gap: 12,
                    padding: "18px 16px",
                    background: "var(--white)",
                    border: "1px solid var(--ink-12)",
                    textDecoration: "none",
                    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--sleep-c)"
                    ;(e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(74,127,181,0.10)"
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-12)"
                    ;(e.currentTarget as HTMLElement).style.boxShadow = "none"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {device.icon}
                    </div>
                    <span style={{
                      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                      fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em",
                      color: "var(--sleep-c)", border: "0.5px solid var(--sleep-c)",
                      padding: "2px 6px",
                    }}>
                      Connect
                    </span>
                  </div>
                  <div>
                    <p style={{
                      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                      fontSize: 14, fontWeight: 500, color: "var(--ink)", margin: "0 0 3px",
                    }}>
                      {device.label}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                      fontSize: 11, color: "var(--ink-40)", margin: 0, lineHeight: 1.4,
                    }}>
                      {device.sub}
                    </p>
                  </div>
                </a>
              ) : (
                // Oura — Junction widget
                <button
                  onClick={handleJunction}
                  disabled={!ready || connecting !== null}
                  style={{
                    display: "flex", flexDirection: "column", gap: 12,
                    padding: "18px 16px", textAlign: "left",
                    background: "var(--white)",
                    border: "1px solid var(--ink-12)",
                    cursor: ready && !connecting ? "pointer" : "default",
                    opacity: connecting && connecting !== "junction" ? 0.5 : 1,
                    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                  }}
                  onMouseEnter={e => {
                    if (ready && !connecting) {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--sleep-c)"
                      ;(e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(74,127,181,0.10)"
                    }
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-12)"
                    ;(e.currentTarget as HTMLElement).style.boxShadow = "none"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {device.icon}
                    </div>
                    <span style={{
                      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                      fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em",
                      color: isLoading ? "var(--ink-30)" : "var(--sleep-c)",
                      border: `0.5px solid ${isLoading ? "var(--ink-30)" : "var(--sleep-c)"}`,
                      padding: "2px 6px",
                    }}>
                      {isLoading ? "Loading…" : "Connect"}
                    </span>
                  </div>
                  <div>
                    <p style={{
                      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                      fontSize: 14, fontWeight: 500, color: "var(--ink)", margin: "0 0 3px",
                    }}>
                      {device.label}
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                      fontSize: 11, color: "var(--ink-40)", margin: 0, lineHeight: 1.4,
                    }}>
                      {device.sub}
                    </p>
                  </div>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Other devices via Junction */}
      <div style={{ border: "0.5px solid var(--ink-10)", padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 13, fontWeight: 500, color: "var(--ink)", margin: "0 0 4px",
            }}>
              More devices
            </p>
            <p style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 11, color: "var(--ink-40)", margin: 0,
            }}>
              {OTHER_DEVICES.map(d => d.label).join(" · ")}
            </p>
          </div>
          <button
            onClick={handleJunction}
            disabled={!ready || connecting !== null}
            style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em",
              color: "var(--ink-60)", background: "none", border: "0.5px solid var(--ink-20)",
              padding: "6px 12px", cursor: ready && !connecting ? "pointer" : "default",
              opacity: !ready || (connecting && connecting !== "junction") ? 0.4 : 1,
              transition: "border-color 0.15s ease",
            }}
          >
            {connecting === "junction" ? "Loading…" : "Browse →"}
          </button>
        </div>
      </div>

      {/* Apple Health — coming soon */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px",
        background: "rgba(184,134,11,0.03)",
        border: "0.5px solid rgba(184,134,11,0.20)",
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 4C11 4 9 2 7 3C6 5 7 8 9 9C8 10 7 12 7 14C7 17 9 19 11 19C13 19 15 17 15 14C15 12 14 10 13 9C15 8 16 5 15 3C13 2 11 4 11 4Z"
            fill="rgba(184,134,11,0.5)" />
        </svg>
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 13, fontWeight: 500, color: "var(--ink)", margin: "0 0 2px",
          }}>
            Apple Health &amp; Apple Watch
          </p>
          <p style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 11, color: "var(--ink-40)", margin: 0,
          }}>
            Coming to the iOS app
          </p>
        </div>
        <Link
          href="/#waitlist"
          style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--gold)", textDecoration: "none",
            border: "0.5px solid rgba(184,134,11,0.4)",
            padding: "5px 10px", whiteSpace: "nowrap",
          }}
        >
          Notify me
        </Link>
      </div>

      {/* Error */}
      {error && (
        <p style={{
          fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
          fontSize: 12, color: "#991B1B", margin: 0, lineHeight: 1.5,
        }}>
          {error}
        </p>
      )}

      {/* Skip */}
      {onSkip && (
        <button
          onClick={onSkip}
          style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--ink-30)", background: "none", border: "none",
            cursor: "pointer", padding: 0, alignSelf: "center",
          }}
        >
          Skip for now
        </button>
      )}
    </div>
  )
}

"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "-apple-system, BlinkMacSystemFont, sans-serif"

interface TopbarProps {
  firstName: string
  lastSyncAt?: string | null
  wearableProvider?: string
  onSync?: () => void
  syncing?: boolean
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export function DashboardTopbar({ firstName, lastSyncAt, wearableProvider, onSync, syncing }: TopbarProps) {
  const syncLabel = lastSyncAt
    ? `Last synced ${new Date(lastSyncAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${new Date(lastSyncAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : null
  const providerLabel = wearableProvider
    ? ({ whoop: "WHOOP", oura: "Oura", garmin: "Garmin", fitbit: "Fitbit" } as Record<string, string>)[wearableProvider] ?? wearableProvider
    : null

  return (
    <div style={{
      height: 52,
      background: "#fff",
      borderBottom: "0.5px solid rgba(0,0,0,0.06)",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginLeft: 62,
      flexShrink: 0,
    }}>
      {/* Left */}
      <div>
        <span style={{ fontFamily: serif, fontSize: 19, color: "#1a1a18" }}>
          {greeting()}, {firstName}.
        </span>
        {(syncLabel || providerLabel) && (
          <span style={{
            fontFamily: sans,
            fontSize: 10,
            color: "#bbb",
            letterSpacing: "0.5px",
            marginLeft: 12,
          }}>
            {[syncLabel, providerLabel].filter(Boolean).join(" \u00B7 ")}
          </span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {onSync && (
          <button
            onClick={onSync}
            disabled={syncing}
            style={{
              fontFamily: sans,
              fontSize: 9,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              padding: "6px 13px",
              borderRadius: 6,
              border: "0.5px solid rgba(0,0,0,0.10)",
              background: "transparent",
              color: syncing ? "#bbb" : "#8C8A82",
              cursor: syncing ? "default" : "pointer",
            }}
          >
            {syncing ? "Syncing\u2026" : "Sync Now"}
          </button>
        )}
        <a
          href="/settings/labs"
          style={{
            fontFamily: sans,
            fontSize: 9,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            padding: "6px 13px",
            borderRadius: 6,
            background: "#C49A3C",
            color: "#fff",
            border: "none",
            textDecoration: "none",
          }}
        >
          Add Data
        </a>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"

interface ExportModalProps {
  onClose: () => void
}

export function ExportModal({ onClose }: ExportModalProps) {
  const [email, setEmail] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [loading, setLoading] = useState<"email" | "download" | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (sendEmail: boolean) => {
    setLoading(sendEmail ? "email" : "download")
    setError(null)
    try {
      const res = await fetch("/api/account/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendEmail,
          recipientEmail: sendEmail ? email : null,
          recipientName: sendEmail ? recipientName : null,
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? "Something went wrong. Please try again.")
        return
      }

      if (sendEmail) {
        setSent(true)
      } else {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `peaq-health-report-${new Date().toISOString().split("T")[0]}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        onClose()
      }
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: "var(--white)", borderRadius: 12, padding: "28px 32px", maxWidth: 440, width: "100%", margin: "0 16px" }}>
        <p style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 20, marginBottom: 6, color: "var(--ink)" }}>
          Export health report
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-40)", marginBottom: 20, lineHeight: 1.6 }}>
          Download your full Peaq report or send it directly to your physician or dentist.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-40)", display: "block", marginBottom: 6 }}>
            Send to physician (optional)
          </label>
          <input
            type="text"
            placeholder="Dr. Smith"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "0.5px solid var(--ink-20)", borderRadius: 6, fontSize: 13, marginBottom: 8, boxSizing: "border-box", background: "var(--white)", color: "var(--ink)", outline: "none" }}
          />
          <input
            type="email"
            placeholder="physician@clinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "0.5px solid var(--ink-20)", borderRadius: 6, fontSize: 13, boxSizing: "border-box", background: "var(--white)", color: "var(--ink)", outline: "none" }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "var(--blood-c, #C0392B)", marginBottom: 12 }}>{error}</p>
        )}

        {sent ? (
          <p style={{ fontSize: 13, color: "#1D9E75", padding: "10px 0" }}>✓ Report sent to {email}</p>
        ) : (
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {email && (
              <button
                onClick={() => handleExport(true)}
                disabled={loading !== null}
                style={{ flex: 1, padding: 10, background: "var(--ink)", color: "var(--white)", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: 500, opacity: loading !== null ? 0.5 : 1 }}
              >
                {loading === "email" ? "Sending…" : "Send to physician"}
              </button>
            )}
            <button
              onClick={() => handleExport(false)}
              disabled={loading !== null}
              style={{ flex: 1, padding: 10, background: "transparent", color: "var(--ink)", border: "0.5px solid var(--ink-20)", borderRadius: 6, fontSize: 13, cursor: "pointer", opacity: loading !== null ? 0.5 : 1 }}
            >
              {loading === "download" ? "Building…" : "Download PDF"}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: 12, width: "100%", padding: 8, background: "transparent", border: "none", color: "var(--ink-30)", fontSize: 12, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

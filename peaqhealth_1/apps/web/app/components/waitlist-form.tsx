"use client"

import { useState } from "react"

const sans = "'Instrument Sans', system-ui, sans-serif"
const INK = "#1a1a18"
const BG = "#F6F4EF"

export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || status === "sending") return
    setStatus("sending")
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus("sent")
        setEmail("")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  if (status === "sent") {
    return (
      <p style={{
        fontFamily: sans, fontSize: 13, color: "#3B6D11",
        padding: "12px 0", margin: 0,
      }}>
        Thanks — we&apos;ll be in touch.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, maxWidth: 420, flexWrap: "wrap" }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        required
        style={{
          flex: 1,
          minWidth: 200,
          fontFamily: sans,
          fontSize: 14,
          padding: "12px 16px",
          border: "0.5px solid rgba(20,20,16,0.20)",
          borderRadius: 3,
          background: "transparent",
          color: INK,
          outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={status === "sending"}
        style={{
          fontFamily: sans,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          padding: "12px 28px",
          background: INK,
          color: BG,
          border: "none",
          borderRadius: 3,
          cursor: status === "sending" ? "not-allowed" : "pointer",
          opacity: status === "sending" ? 0.6 : 1,
        }}
      >
        {status === "sending" ? "Sending..." : "Join waitlist"}
      </button>
      {status === "error" && (
        <p style={{ fontFamily: sans, fontSize: 12, color: "#A32D2D", margin: "4px 0 0", width: "100%" }}>
          Something went wrong. Try again.
        </p>
      )}
    </form>
  )
}

"use client"
import { useEffect, useState } from "react"

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem("peaq-push-dismissed")
    const supported = "serviceWorker" in navigator && "PushManager" in window
    if (!dismissed && supported) setShow(true)
  }, [])

  const handleEnable = async () => {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      dismiss()
      return
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    })

    dismiss()
  }

  const dismiss = () => {
    localStorage.setItem("peaq-push-dismissed", "true")
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      margin: "0 0 16px",
      padding: "16px 20px",
      background: "var(--white)",
      border: "0.5px solid var(--ink-12)",
      borderLeft: "3px solid #4A7FB5",
      borderRadius: 6,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>
          Get your morning sleep summary
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-50)", lineHeight: 1.6 }}>
          Turn on notifications to get your daily HRV and sleep digest each morning.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button
            onClick={handleEnable}
            style={{
              fontSize: 12, fontWeight: 500, padding: "6px 14px",
              background: "var(--ink)", color: "var(--white)",
              border: "none", borderRadius: 6, cursor: "pointer",
            }}
          >
            Turn on
          </button>
          <button
            onClick={dismiss}
            style={{ fontSize: 12, color: "var(--ink-30)", background: "none", border: "none", cursor: "pointer" }}
          >
            Not now
          </button>
        </div>
      </div>
      <button onClick={dismiss} style={{
        background: "none", border: "none",
        color: "var(--ink-20)", fontSize: 16,
        cursor: "pointer", flexShrink: 0,
      }}>
        ×
      </button>
    </div>
  )
}

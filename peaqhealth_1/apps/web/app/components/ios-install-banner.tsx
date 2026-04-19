"use client"
import { useEffect, useState } from "react"

export function IOSInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches
    const dismissed = localStorage.getItem("peaq-ios-install-dismissed")
    if (isIOS && !isInStandaloneMode && !dismissed) setShow(true)
  }, [])

  if (!show) return null

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      left: 16,
      right: 16,
      background: "var(--ink)",
      color: "var(--white)",
      borderRadius: 12,
      padding: "16px 18px",
      zIndex: 1000,
      boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
        Add Cnvrg to your home screen
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.6 }}>
        Tap the share icon below, then &quot;Add to Home Screen&quot; for the full app experience.
      </div>
      <button
        onClick={() => {
          localStorage.setItem("peaq-ios-install-dismissed", "true")
          setShow(false)
        }}
        style={{
          marginTop: 10,
          fontSize: 12,
          color: "rgba(255,255,255,0.6)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        Dismiss
      </button>
    </div>
  )
}

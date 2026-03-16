"use client"
import { useRouter } from "next/navigation"

interface PendingBannerProps {
  type: "sleep" | "blood" | "oral" | "blood-stale"
  monthsOld?: number
}

export function PendingBanner({ type, monthsOld }: PendingBannerProps) {
  const router = useRouter()

  const configs = {
    sleep: {
      bg: "var(--sleep-bg)",
      border: "rgba(74,127,181,0.2)",
      iconBg: "rgba(74,127,181,0.12)",
      color: "var(--sleep-c)",
      subColor: "rgba(74,127,181,0.7)",
      title: "No wearable connected",
      sub: "32 pts locked · Connect Apple Watch, Oura, WHOOP, or Garmin",
      href: "/onboarding",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M8 2C5.2 2 3 5 3 8c0 2.2 1 3 1 3"/>
          <path d="M13 8c0-2.8-2.2-6-5-6"/>
          <circle cx="8" cy="8" r="1.5"/>
        </svg>
      ),
    },
    blood: {
      bg: "var(--blood-bg)",
      border: "rgba(192,57,43,0.2)",
      iconBg: "rgba(192,57,43,0.12)",
      color: "var(--blood-c)",
      subColor: "rgba(192,57,43,0.7)",
      title: "No lab results uploaded",
      sub: "28 pts locked · Upload your most recent blood panel",
      href: "/settings/labs",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M8 2v7"/>
          <path d="M5 6l-2 5c-.5 1.5.5 3 2 3h6c1.5 0 2.5-1.5 2-3L11 6"/>
          <path d="M5.5 4h5"/>
        </svg>
      ),
    },
    "blood-stale": {
      bg: "var(--amber-bg)",
      border: "rgba(146,64,14,0.2)",
      iconBg: "rgba(146,64,14,0.12)",
      color: "var(--amber)",
      subColor: "rgba(146,64,14,0.7)",
      title: `Labs are ${monthsOld} months old — consider retesting`,
      sub: "Score reflects your results as filed · Retest recommended",
      href: "/settings/labs",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M8 2L2 13h12L8 2z"/>
          <path d="M8 7v3M8 11.5v.5"/>
        </svg>
      ),
    },
    oral: {
      bg: "var(--oral-bg)",
      border: "rgba(45,106,79,0.2)",
      iconBg: "rgba(45,106,79,0.12)",
      color: "var(--oral-c)",
      subColor: "rgba(45,106,79,0.7)",
      title: "Oral microbiome data pending",
      sub: "4 cross-panel terms locked · 25 pts available",
      href: "/shop",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="5"/>
          <path d="M8 5v3l2 1"/>
        </svg>
      ),
    },
  }

  const c = configs[type]
  if (!c) return null

  return (
    <button
      onClick={() => router.push(c.href)}
      className="w-full flex items-center gap-3 text-left"
      style={{
        background: c.bg,
        border: `0.5px solid ${c.border}`,
        borderRadius: 4,
        padding: "12px 16px",
        cursor: "pointer",
        transition: "filter 150ms",
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.97)")}
      onMouseLeave={e => (e.currentTarget.style.filter = "")}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: c.iconBg, color: c.color }}>
        {c.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[12px] font-medium" style={{ color: c.color }}>{c.title}</p>
        <p className="font-body text-[11px]" style={{ color: c.subColor }}>{c.sub}</p>
      </div>
      <span className="font-body text-sm" style={{ color: c.color }}>→</span>
    </button>
  )
}

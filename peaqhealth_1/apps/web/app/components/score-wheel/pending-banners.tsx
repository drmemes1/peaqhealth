"use client"
import { useRouter } from "next/navigation"
import { haptics } from "@/lib/haptics"

interface PendingBannerProps {
  type: "sleep" | "blood" | "oral" | "blood-stale" | "blood-expired"
  monthsOld?: number
}

const CONFIGS = {
  sleep: {
    bg: "var(--sleep-bg)", border: "rgba(74,127,181,0.2)", iconBg: "rgba(74,127,181,0.12)",
    color: "var(--sleep-c)", subColor: "rgba(74,127,181,0.7)",
    title: "No wearable connected", sub: "32 pts locked · Connect Apple Watch, Oura, WHOOP, or Garmin",
    href: "/onboarding", breathe: true,
  },
  blood: {
    bg: "var(--blood-bg)", border: "rgba(192,57,43,0.2)", iconBg: "rgba(192,57,43,0.12)",
    color: "var(--blood-c)", subColor: "rgba(192,57,43,0.7)",
    title: "No lab results uploaded", sub: "28 pts locked · Upload your most recent blood panel",
    href: "/settings/labs", breathe: true,
  },
  "blood-stale": {
    bg: "var(--amber-bg)", border: "rgba(146,64,14,0.2)", iconBg: "rgba(146,64,14,0.12)",
    color: "var(--amber)", subColor: "rgba(146,64,14,0.7)",
    title: "Labs are getting old — consider retesting",
    sub: "Score reflects your results as filed · Retest recommended",
    href: "/settings/labs", breathe: false,
  },
  "blood-expired": {
    bg: "var(--blood-bg)", border: "rgba(192,57,43,0.2)", iconBg: "rgba(192,57,43,0.12)",
    color: "var(--blood-c)", subColor: "rgba(192,57,43,0.7)",
    title: "Lab results expired — over 12 months old",
    sub: "Blood panel locked · Upload recent labs to restore 28 pts",
    href: "/settings/labs", breathe: false,
  },
  oral: {
    bg: "var(--oral-bg)", border: "rgba(45,106,79,0.2)", iconBg: "rgba(45,106,79,0.12)",
    color: "var(--oral-c)", subColor: "rgba(45,106,79,0.7)",
    title: "Oral microbiome data pending", sub: "4 cross-panel terms locked · 25 pts available",
    href: "/shop", breathe: true,
  },
} as const

export function PendingBanner({ type, monthsOld }: PendingBannerProps) {
  const router = useRouter()
  const c = CONFIGS[type]
  if (!c) return null
  const title = (type === "blood-stale" && monthsOld) ? `Labs are ${monthsOld} months old — consider retesting` : c.title

  return (
    <button
      onClick={() => { haptics.medium(); router.push(c.href) }}
      onTouchStart={() => haptics.medium()}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        background: c.bg, border: `0.5px solid ${c.border}`,
        borderRadius: 4, padding: "12px 16px", cursor: "pointer",
        textAlign: "left", transition: "filter 150ms",
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.97)")}
      onMouseLeave={e => (e.currentTarget.style.filter = "")}
    >
      <div
        className={c.breathe ? "pb-icon-breathe" : ""}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: c.iconBg, color: c.color, flexShrink: 0 }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="7" cy="7" r="5.5" />
          <path d="M7 4.5v3M7 9v.5" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, fontWeight: 500, color: c.color, margin: 0 }}>{title}</p>
        <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, color: c.subColor, margin: "2px 0 0" }}>{c.sub}</p>
      </div>
      <span style={{ color: c.color, fontSize: 14 }}>→</span>
    </button>
  )
}

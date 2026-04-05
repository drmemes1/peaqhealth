"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"

const serif = "'Cormorant Garamond', Georgia, serif"

const ICONS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="10" y="1" width="6" height="6" rx="1.5" />
        <rect x="1" y="10" width="6" height="6" rx="1.5" />
        <rect x="10" y="10" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/panels",
    label: "Panels",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="2,13 8.5,9 15,13" />
        <polygon points="2,10 8.5,6 15,10" />
        <polygon points="2,7 8.5,3 15,7" />
      </svg>
    ),
  },
  {
    href: "/science",
    label: "Science",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 1v5.5L2 14a1.5 1.5 0 001.3 2.2h10.4A1.5 1.5 0 0015 14l-4-7.5V1" />
        <line x1="5" y1="1" x2="12" y2="1" />
        <circle cx="8" cy="12" r="0.5" fill="currentColor" />
        <circle cx="10.5" cy="10.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/shop",
    label: "Shop",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 1.5L2.5 4.5v10a1 1 0 001 1h10a1 1 0 001-1v-10L13 1.5H4z" />
        <path d="M2.5 4.5h12" />
        <path d="M6 7a2.5 2.5 0 005 0" />
      </svg>
    ),
  },
]

const SETTINGS_ICON = {
  href: "/settings",
  label: "Settings",
  icon: (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8.5" r="2.5" />
      <path d="M8.5 1v1.5M8.5 14.5V16M1 8.5h1.5M14.5 8.5H16M3.2 3.2l1.06 1.06M12.74 12.74l1.06 1.06M3.2 13.8l1.06-1.06M12.74 4.26l1.06-1.06" />
    </svg>
  ),
}

export function AuthSidebar({ initials }: { initials: string }) {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <aside style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: 62,
      height: "100vh",
      background: "#16150F",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "18px 0 20px",
      gap: 4,
      zIndex: 50,
    }}>
      {/* Logo */}
      <img
        src="/images/peaq_logo_transparent.png"
        alt="Peaq"
        style={{
          width: 36,
          height: "auto",
          filter: "invert(1) brightness(1.8)",
          marginBottom: 16,
          display: "block",
        }}
      />

      {/* Main icons */}
      {ICONS.map((item, i) => {
        const active = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(item.href)
        const isHovered = hovered === item.href && !active
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            onMouseEnter={() => setHovered(item.href)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: active ? "#C49A3C" : isHovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.28)",
              background: active ? "rgba(196,154,60,0.12)" : isHovered ? "rgba(255,255,255,0.07)" : "transparent",
              transition: "background 150ms ease, color 150ms ease",
              textDecoration: "none",
              animation: "sidebarIconIn 250ms ease both",
              animationDelay: `${i * 60}ms`,
            }}
          >
            {item.icon}
          </Link>
        )
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Settings */}
      {(() => {
        const settingsActive = pathname.startsWith("/settings")
        const settingsHovered = hovered === SETTINGS_ICON.href && !settingsActive
        return (
          <Link
            href={SETTINGS_ICON.href}
            title={SETTINGS_ICON.label}
            onMouseEnter={() => setHovered(SETTINGS_ICON.href)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: settingsActive ? "#C49A3C" : settingsHovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.28)",
              background: settingsActive ? "rgba(196,154,60,0.12)" : settingsHovered ? "rgba(255,255,255,0.07)" : "transparent",
              transition: "background 150ms ease, color 150ms ease",
              textDecoration: "none",
              animation: "sidebarIconIn 250ms ease both",
              animationDelay: "240ms",
            }}
          >
            {SETTINGS_ICON.icon}
          </Link>
        )
      })()}

      {/* Avatar */}
      <div style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "rgba(196,154,60,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: serif,
        fontSize: 14,
        color: "#C49A3C",
        marginTop: 8,
      }}>
        {initials}
      </div>
    </aside>
  )
}

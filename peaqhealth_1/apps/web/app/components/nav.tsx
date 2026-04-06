"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoSvg } from "./logo-svg";

interface NavProps {
  cartCount?: number;
  onCartOpen?: () => void;
}

const PANEL_ITEMS = [
  { href: "/dashboard/sleep", label: "SLEEP", color: "#185FA5" },
  { href: "/dashboard/blood", label: "BLOOD", color: "#A32D2D" },
  { href: "/dashboard/oral", label: "ORAL", color: "#3B6D11" },
  { href: "/dashboard/cross-panel", label: "CROSS-PANEL", color: "#C49A3C" },
];

export function Nav({ cartCount = 0, onCartOpen }: NavProps) {
  const pathname = usePathname();
  const [panelsOpen, setPanelsOpen] = useState(false);
  const panelsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!panelsOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelsRef.current && !panelsRef.current.contains(e.target as Node)) {
        setPanelsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [panelsOpen]);

  const links = [
    { href: "/dashboard", label: "Dashboard" },
  ];
  const linksAfterPanels = [
    { href: "/explore", label: "Explore" },
    { href: "/shop", label: "Shop" },
    { href: "/science", label: "Science" },
    { href: "/settings", label: "Settings" },
  ];
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <nav className="sticky z-50 border-b bg-off-white/92 backdrop-blur-[12px]"
         style={{ borderBottomColor: "var(--ink-12)", top: "env(safe-area-inset-top, 0px)" }}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/dashboard">
          <LogoSvg size={75} color="var(--ink)" />
        </Link>

        {/* Center nav links */}
        <div className="flex items-center gap-9">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard");
            return (
              <Link
                key={href}
                href={href}
                className="font-body text-[13px] uppercase tracking-[0.08em] transition-colors"
                style={{
                  color: active ? "var(--color-accent-gold, #C49A3C)" : "var(--ink)",
                  opacity: active ? 1 : 0.5,
                  textDecoration: active ? "underline" : "none",
                  textUnderlineOffset: "4px",
                  textDecorationThickness: "0.5px",
                  textDecorationColor: active ? "var(--color-accent-gold, #C49A3C)" : undefined,
                }}
              >
                {label}
              </Link>
            );
          })}

          {/* Panels dropdown — right after Dashboard */}
          <div ref={panelsRef} style={{ position: "relative" }}>
            <button
              onClick={() => setPanelsOpen(o => !o)}
              className="font-body text-[13px] uppercase tracking-[0.08em] transition-colors"
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                color: PANEL_ITEMS.some(p => pathname.startsWith(p.href))
                  ? "var(--color-accent-gold, #C49A3C)" : "var(--ink)",
                opacity: PANEL_ITEMS.some(p => pathname.startsWith(p.href)) ? 1 : 0.5,
                textDecoration: PANEL_ITEMS.some(p => pathname.startsWith(p.href)) ? "underline" : "none",
                textUnderlineOffset: "4px",
                textDecorationThickness: "0.5px",
                textDecorationColor: "var(--color-accent-gold, #C49A3C)",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              Panels
              <span style={{
                fontSize: 8, lineHeight: 1,
                transform: panelsOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s ease",
              }}>
                ▼
              </span>
            </button>

            <div style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: "50%",
              transform: `translateX(-50%) translateY(${panelsOpen ? "0" : "-4px"})`,
              opacity: panelsOpen ? 1 : 0,
              pointerEvents: panelsOpen ? "auto" : "none",
              background: "#FFFFFF",
              border: "0.5px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              padding: "8px 0",
              minWidth: 160,
              boxShadow: "0 12px 40px rgba(0,0,0,0.1), 0 0 0 0.5px rgba(0,0,0,0.04)",
              zIndex: 100,
              transition: "opacity 0.18s ease, transform 0.18s ease",
            }}>
              {PANEL_ITEMS.map((p, i) => {
                const itemActive = pathname.startsWith(p.href);
                return (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setPanelsOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "10px 20px",
                      textDecoration: "none",
                      transition: "background 0.12s ease",
                      background: itemActive ? "rgba(0,0,0,0.03)" : "transparent",
                      borderBottom: i < PANEL_ITEMS.length - 1 ? "0.5px solid rgba(0,0,0,0.04)" : "none",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)" }}
                    onMouseLeave={e => { if (!itemActive) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                  >
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: p.color, flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                      fontSize: 12, fontWeight: 500,
                      letterSpacing: "0.08em",
                      color: itemActive ? "var(--ink)" : "var(--ink-60)",
                    }}>
                      {p.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {linksAfterPanels.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="font-body text-[13px] uppercase tracking-[0.08em] transition-colors"
                style={{
                  color: active ? "var(--color-accent-gold, #C49A3C)" : "var(--ink)",
                  opacity: active ? 1 : 0.5,
                  textDecoration: active ? "underline" : "none",
                  textUnderlineOffset: "4px",
                  textDecorationThickness: "0.5px",
                  textDecorationColor: active ? "var(--color-accent-gold, #C49A3C)" : undefined,
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right — cart + avatar + date */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:block font-body text-[11px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>
            {today}
          </span>
          {onCartOpen && (
            <button onClick={onCartOpen} className="relative flex items-center gap-1" style={{ color: "var(--ink-60)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M2 2h1.5l2 7h7l1.5-5H5"/>
                <circle cx="7" cy="13" r="1"/>
                <circle cx="12" cy="13" r="1"/>
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink font-body text-[9px] text-off-white">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

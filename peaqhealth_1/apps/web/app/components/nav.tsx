"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OraviMark } from "./OraviMark";

interface NavProps {
  cartCount?: number;
  onCartOpen?: () => void;
}

const PANEL_ITEMS = [
  { href: "/dashboard/sleep", label: "SLEEP", color: "#185FA5" },
  { href: "/dashboard/blood", label: "BLOOD", color: "#A32D2D" },
  { href: "/dashboard/oral", label: "ORAL", color: "#3B6D11" },
  { href: "/dashboard/converge", label: "CONVERGE", color: "var(--gold)" },
];

export function Nav({ cartCount = 0, onCartOpen }: NavProps) {
  const pathname = usePathname();
  const [panelsOpen, setPanelsOpen] = useState(false);
  const panelsRef = useRef<HTMLDivElement>(null);

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

  const links = [{ href: "/dashboard", label: "Dashboard" }];
  const linksAfterPanels = [
    { href: "/explore", label: "Explore" },
    { href: "/shop", label: "Shop" },
    { href: "/science", label: "Science" },
    { href: "/settings", label: "Settings" },
  ];
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <nav
      className="oravi-nav sticky z-50 backdrop-blur-[12px]"
      style={{
        background: "var(--cream)",
        borderBottom: "1px solid var(--hairline)",
        top: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="oravi-nav-inner mx-auto flex max-w-[1200px] items-center justify-between" style={{ padding: "16px 32px" }}>
        {/* Brand cluster */}
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--ink)", display: "inline-flex", alignItems: "center" }}>
            <OraviMark size={28} />
          </span>
          <span
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              textTransform: "lowercase",
            }}
          >
            oravi
          </span>
        </Link>

        {/* Center nav links */}
        <div className="oravi-nav-links flex items-center gap-9">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard");
            return <NavLink key={href} href={href} label={label} active={active} />;
          })}

          <div ref={panelsRef} style={{ position: "relative" }}>
            <button
              onClick={() => setPanelsOpen(o => !o)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontFamily: "var(--font-manrope), sans-serif",
                fontWeight: 500,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: PANEL_ITEMS.some(p => pathname.startsWith(p.href)) ? "var(--ink)" : "var(--ink-soft-2)",
                borderBottom: PANEL_ITEMS.some(p => pathname.startsWith(p.href)) ? "1px solid var(--gold)" : "1px solid transparent",
                paddingBottom: 2,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Panels
              <span
                style={{
                  fontSize: 8,
                  lineHeight: 1,
                  transform: panelsOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s ease",
                }}
              >
                ▼
              </span>
            </button>

            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: "50%",
                transform: `translateX(-50%) translateY(${panelsOpen ? "0" : "-4px"})`,
                opacity: panelsOpen ? 1 : 0,
                pointerEvents: panelsOpen ? "auto" : "none",
                background: "var(--paper)",
                border: "1px solid var(--hairline)",
                borderRadius: 10,
                padding: "8px 0",
                minWidth: 160,
                boxShadow: "0 12px 40px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)",
                zIndex: 100,
                transition: "opacity 0.18s ease, transform 0.18s ease",
              }}
            >
              {PANEL_ITEMS.map((p, i) => {
                const itemActive = pathname.startsWith(p.href);
                return (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setPanelsOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 20px",
                      textDecoration: "none",
                      transition: "background 0.12s ease",
                      background: itemActive ? "rgba(0,0,0,0.03)" : "transparent",
                      borderBottom: i < PANEL_ITEMS.length - 1 ? "0.5px solid rgba(0,0,0,0.04)" : "none",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)";
                    }}
                    onMouseLeave={e => {
                      if (!itemActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: p.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-manrope), sans-serif",
                        fontSize: 12,
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: itemActive ? "var(--ink)" : "var(--ink-soft-2)",
                      }}
                    >
                      {p.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {linksAfterPanels.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return <NavLink key={href} href={href} label={label} active={active} />;
          })}
        </div>

        {/* Right — cart + date */}
        <div className="flex items-center gap-4">
          <span
            className="hidden sm:block"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: 500,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "var(--ink-soft-2)",
            }}
          >
            {today}
          </span>
          {onCartOpen && (
            <button onClick={onCartOpen} className="relative flex items-center gap-1" style={{ color: "var(--ink-soft-2)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M2 2h1.5l2 7h7l1.5-5H5" />
                <circle cx="7" cy="13" r="1" />
                <circle cx="12" cy="13" r="1" />
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

      <style jsx>{`
        @media (max-width: 640px) {
          .oravi-nav-inner {
            padding: 14px 20px !important;
          }
          .oravi-nav-links {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        fontFamily: "var(--font-manrope), sans-serif",
        fontWeight: 500,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: active ? "var(--ink)" : "var(--ink-soft-2)",
        textDecoration: "none",
        borderBottom: active ? "1px solid var(--gold)" : "1px solid transparent",
        paddingBottom: 2,
        transition: "color 150ms ease",
      }}
    >
      {label}
    </Link>
  );
}

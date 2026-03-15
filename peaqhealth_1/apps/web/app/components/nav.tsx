"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoSvg } from "./logo-svg";

interface NavProps {
  initials?: string;
  cartCount?: number;
  onCartOpen?: () => void;
}

export function Nav({ initials = "?", cartCount = 0, onCartOpen }: NavProps) {
  const pathname = usePathname();
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/shop", label: "Shop" },
    { href: "/settings", label: "Settings" },
  ];
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <nav className="sticky top-0 z-50 border-b bg-off-white/92 backdrop-blur-[12px]"
         style={{ borderBottomColor: "var(--ink-12)" }}>
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/dashboard">
          <LogoSvg size={44} color="var(--ink)" />
        </Link>

        {/* Center nav links */}
        <div className="flex items-center gap-8">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="font-body text-[11px] uppercase tracking-[0.08em] transition-colors"
                style={{
                  color: active ? "var(--ink)" : "var(--ink-60)",
                  textDecoration: active ? "underline" : "none",
                  textUnderlineOffset: "4px",
                  textDecorationThickness: "0.5px",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right — cart + avatar + date */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:block font-body text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full font-body text-xs font-medium"
               style={{ background: "var(--warm-100)", color: "var(--ink)" }}>
            {initials}
          </div>
        </div>
      </div>
    </nav>
  );
}

"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { LandingPanelStrip } from "./landing-panel-strip"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

const LS_THEME_KEY = "peaq-landing-theme"

// The wearable toggle doubles as the site-wide dark/light theme toggle.
// wearable=true  → LIGHT theme (wearable "on" / connected, bright UI)
// wearable=false → DARK  theme (wearable "off" / dramatic photo hero)
// Default = DARK to match the current site's dominant visual language.
function readStoredTheme(): boolean {
  if (typeof window === "undefined") return false // SSR default: dark
  const stored = window.localStorage.getItem(LS_THEME_KEY)
  if (stored === "light") return true
  if (stored === "dark") return false
  return false // no stored preference → dark
}

function applyThemeToDocument(isLight: boolean) {
  if (typeof document === "undefined") return
  document.documentElement.dataset.landingTheme = isLight ? "light" : "dark"
}

export function LandingHero() {
  // SSR starts dark (default). Client bootstrap effect reads localStorage and
  // may flip it on mount; accept one potential flicker on return visitors.
  const [wearable, setWearable] = useState(false)

  // Bootstrap: read stored preference, sync state + <html> attribute
  useEffect(() => {
    const isLight = readStoredTheme()
    setWearable(isLight)
    applyThemeToDocument(isLight)
  }, [])

  const handleToggle = useCallback(() => {
    setWearable(prev => {
      const next = !prev
      applyThemeToDocument(next)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_THEME_KEY, next ? "light" : "dark")
      }
      return next
    })
  }, [])

  return (
    <section
      className="landing-hero-section"
      data-wearable={wearable ? "on" : "off"}
    >
      {/* Full-bleed hero image — Next.js serves WebP/AVIF + responsive sizes */}
      <Image
        src="/images/heropeaq.png"
        alt=""
        aria-hidden="true"
        className="hero-bg-image"
        fill
        priority
        sizes="100vw"
        quality={80}
      />

      {/* Dark gradient overlay — top-to-bottom, keeps text and CTAs legible */}
      <div className="hero-bg-overlay" />

      {/* Radial accent — swaps between warm cream and dark gold glow */}
      <div className="hero-radial" />

      <div className="hero-inner">
        {/* Eyebrow */}
        <p className="fade-up hero-eyebrow">
          Three signals &middot; One measure of resilience
        </p>

        {/* H1 */}
        <h1 className="fade-up hero-h1" style={{ animationDelay: "100ms" }}>
          Your body is talking.
          <br />
          <em>We&rsquo;re listening.</em>
        </h1>

        {/* Secondary */}
        <p className="fade-up hero-secondary" style={{ animationDelay: "200ms" }}>
          Most platforms hear one signal. Peaq listens to three.
        </p>

        {/* Body */}
        <p className="fade-up hero-body" style={{ animationDelay: "300ms" }}>
          Oral microbiome. Blood biomarkers. Nightly sleep data. Measured
          separately, they tell partial stories. Measured together, with
          cross-panel analysis, they tell you things no single test ever could.
        </p>

        {/* CTAs */}
        <div className="fade-up hero-ctas" style={{ animationDelay: "400ms" }}>
          <a href="#quiz" className="hero-cta-primary">
            Let&rsquo;s take a Peaq
          </a>
          <a href="#cta" className="hero-cta-secondary">
            Join waitlist &rarr;
          </a>
        </div>

        {/* Panel strip — toggle lives inside Sleep chip, also flips site theme */}
        <div className="fade-up" style={{ width: "100%", maxWidth: 640, animationDelay: "450ms" }}>
          <LandingPanelStrip wearableOff={!wearable} onToggle={handleToggle} />
        </div>

        {/* No-wearable explainer — only visible in off state */}
        <p className="hero-no-wearable-note">
          Peaq works with or without a wearable. Sleep and HRV data adds a powerful
          third signal, but your oral and blood panels tell a complete story on their own.
        </p>
      </div>

      <style>{`
        /* ── Hero section base ─────────────────────────────────── */
        /* Hero locals derive from --lp-* globals so the theme toggle cascades.
           Dark theme is the default; light theme overrides further down. */
        .landing-hero-section {
          position: relative;
          overflow: hidden;
          background: var(--lp-hero-fallback);
          transition: background 600ms cubic-bezier(0.4, 0.0, 0.2, 1);
          --hero-ink: var(--lp-text);
          --hero-gold: #C49A3C;
          --hero-muted: var(--lp-text-50);
          --hero-body:  var(--lp-text-50);
          --hero-cta-bg: #C49A3C;
          --hero-cta-color: #fff;
          --hero-cta2-border: var(--lp-text-12);
          --hero-cta2-color: var(--lp-text-50);
          --hero-eyebrow-alpha: 0.9;
        }

        /* Light theme override — dark ink CTA on cream */
        [data-landing-theme="light"] .landing-hero-section {
          --hero-cta-bg: var(--lp-text);
          --hero-cta-color: var(--lp-hero-fallback);
          --hero-eyebrow-alpha: 1;
        }

        /* ── Full-bleed hero image + overlay ──────────────────── */
        /* Photo renders in both themes; overlay gradient flips per theme to
           keep text legible (dark warm wash in dark mode, heavy cream wash in
           light mode so the photo reads as a subtle tint behind dark text). */
        .hero-bg-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          z-index: 0;
          pointer-events: none;
          user-select: none;
        }
        /* Mobile: anchor crop toward the left so the woman stays in frame
           when the 16:9 landscape photo gets cropped for narrow viewports. */
        @media (max-width: 768px) {
          .hero-bg-image {
            object-position: 18% center;
          }
        }

        .hero-bg-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            linear-gradient(to bottom,
              rgba(14,13,8,0.62) 0%,
              rgba(14,13,8,0.48) 32%,
              rgba(14,13,8,0.64) 68%,
              rgba(14,13,8,0.92) 100%);
          transition: background 600ms cubic-bezier(0.4,0.0,0.2,1);
        }

        /* Light theme: cream wash — photo becomes a textured tint */
        [data-landing-theme="light"] .hero-bg-overlay {
          background:
            linear-gradient(to bottom,
              rgba(246,244,239,0.88) 0%,
              rgba(246,244,239,0.76) 32%,
              rgba(246,244,239,0.84) 68%,
              rgba(246,244,239,0.98) 100%);
        }

        /* Radial accents — sit above the image/overlay for warmth */
        /* Default (dark) sits stronger; light theme softens it */
        .hero-radial {
          position: absolute; inset: 0; pointer-events: none;
          z-index: 2;
          background: radial-gradient(circle at 50% 50%, rgba(196,154,60,0.12) 0%, transparent 60%);
          transition: background 600ms cubic-bezier(0.4,0.0,0.2,1);
        }
        [data-landing-theme="light"] .landing-hero-section .hero-radial {
          background: radial-gradient(circle at 50% 40%, rgba(196,154,60,0.05) 0%, transparent 55%);
        }

        /* Inner container */
        .hero-inner {
          max-width: var(--layout-max-width, 1100px);
          margin: 0 auto;
          padding: clamp(60px, 8vw, 100px) 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          z-index: 3;
        }

        /* ── Text elements ──────────────────────────────────────── */
        .hero-eyebrow {
          font-family: ${sans};
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--hero-gold);
          opacity: var(--hero-eyebrow-alpha);
          margin: 0 0 24px;
          transition: color 250ms ease 100ms, opacity 250ms ease 100ms;
        }

        .hero-h1 {
          font-family: ${serif};
          font-size: clamp(48px, 7vw, 88px);
          font-weight: 300;
          line-height: 1.05;
          letter-spacing: -0.5px;
          color: var(--hero-ink);
          max-width: 820px;
          margin: 0 0 12px;
          transition: color 250ms ease 100ms;
        }
        .hero-h1 em {
          font-style: italic;
          color: var(--hero-gold);
        }

        .hero-secondary {
          font-family: ${serif};
          font-size: clamp(18px, 2.5vw, 24px);
          font-weight: 300;
          font-style: italic;
          color: var(--hero-muted);
          margin: 0 0 32px;
          transition: color 250ms ease 100ms;
        }

        .hero-body {
          font-family: ${sans};
          font-size: 14px;
          color: var(--hero-body);
          line-height: 1.7;
          max-width: 480px;
          margin: 0 0 40px;
          transition: color 250ms ease 100ms;
        }

        /* ── CTAs ───────────────────────────────────────────────── */
        .hero-ctas {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .hero-cta-primary {
          font-family: ${sans};
          font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          padding: 12px 28px; border-radius: 6px;
          background: var(--hero-cta-bg);
          color: var(--hero-cta-color);
          border: none; text-decoration: none; display: inline-block;
          transition: background 250ms ease 100ms, color 250ms ease 100ms, opacity 80ms ease;
        }
        .hero-cta-primary:hover { opacity: 0.82; }

        .hero-cta-secondary {
          font-family: ${sans};
          font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          padding: 12px 20px; border-radius: 6px;
          background: transparent;
          color: var(--hero-cta2-color);
          border: 0.5px solid var(--hero-cta2-border);
          text-decoration: none; display: inline-block;
          transition: color 250ms ease 100ms, border-color 250ms ease 100ms;
        }

        /* ── No-wearable explainer ──────────────────────────────── */
        .hero-no-wearable-note {
          font-family: ${sans};
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          text-align: center;
          max-width: 480px;
          line-height: 1.6;
          margin-top: 16px;
          opacity: 0;
          transform: translateY(4px);
          pointer-events: none;
          transition: opacity 200ms ease, transform 200ms ease;
        }
        .landing-hero-section[data-wearable="off"] .hero-no-wearable-note {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 200ms;
        }
      `}</style>
    </section>
  )
}

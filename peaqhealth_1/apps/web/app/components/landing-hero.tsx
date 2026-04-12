"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { LandingPanelStrip } from "./landing-panel-strip"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

const HERO_VIDEOS = ["/videos/heropeaq.mp4", "/videos/heromovie.mp4"]

const LS_THEME_KEY = "peaq-landing-theme"

// The wearable toggle doubles as the site-wide dark/light theme toggle.
// wearable=true  → DARK  theme (toggle ON,  default, dramatic photo hero)
// wearable=false → LIGHT theme (toggle OFF, bright cream overlay)
// Default = toggle ON / DARK to match the dominant site visual language.
function readStoredTheme(): boolean {
  if (typeof window === "undefined") return true // SSR default: dark / toggle on
  const stored = window.localStorage.getItem(LS_THEME_KEY)
  if (stored === "light") return false
  if (stored === "dark") return true
  return true // no stored preference → dark / toggle on
}

function applyThemeToDocument(wearable: boolean) {
  if (typeof document === "undefined") return
  document.documentElement.dataset.landingTheme = wearable ? "dark" : "light"
}

export function LandingHero() {
  // SSR starts with toggle ON / dark theme. Client bootstrap may flip on
  // mount from localStorage; accept one potential flicker on return visitors.
  const [wearable, setWearable] = useState(true)

  // Bootstrap: read stored preference, sync state + <html> attribute
  useEffect(() => {
    const nextWearable = readStoredTheme()
    setWearable(nextWearable)
    applyThemeToDocument(nextWearable)
  }, [])

  const handleToggle = useCallback(() => {
    setWearable(prev => {
      const next = !prev
      applyThemeToDocument(next)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_THEME_KEY, next ? "dark" : "light")
      }
      return next
    })
  }, [])

  // ── Hero video playlist — crossfade between clips on "ended" ──────────
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [activeVideo, setActiveVideo] = useState(0)

  useEffect(() => {
    const current = videoRefs.current[activeVideo]
    if (!current) return

    current.currentTime = 0
    current.play().catch(() => {})

    const onEnded = () => setActiveVideo(prev => (prev + 1) % HERO_VIDEOS.length)
    current.addEventListener("ended", onEnded)
    return () => current.removeEventListener("ended", onEnded)
  }, [activeVideo])

  return (
    <section
      className="landing-hero-section"
      data-wearable={wearable ? "on" : "off"}
    >
      {/* Two hero videos stacked — only activeVideo is opaque. Each plays
          once, fires "ended", JS crossfades to the next, loops forever.
          Both share .hero-bg-image for object-fit/position/mobile crop. */}
      {HERO_VIDEOS.map((src, i) => (
        <video
          key={src}
          ref={el => { videoRefs.current[i] = el }}
          className="hero-bg-image"
          src={src}
          poster={i === 0 ? "/images/heropeaq-poster.jpg" : undefined}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          style={{
            opacity: activeVideo === i ? 1 : 0,
            transition: "opacity 1.2s ease",
          }}
        />
      ))}

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
        /* The hero always sits on a dark-overlaid photo regardless of the
           site theme toggle, so every color here is hardcoded dark-mode. */
        .landing-hero-section {
          position: relative;
          overflow: hidden;
          background: #0E0D08;
          --hero-ink: #FAFAF8;
          --hero-gold: #B8860B;
          --hero-muted: rgba(250,250,248,0.70);
          --hero-body:  rgba(250,250,248,0.70);
          --hero-cta-bg: #B8860B;
          --hero-cta-color: #FAFAF8;
          --hero-cta2-border: rgba(250,250,248,0.40);
          --hero-cta2-color: #FAFAF8;
          --hero-eyebrow-alpha: 1;
        }

        /* ── Full-bleed hero image + overlay ──────────────────── */
        /* Overlay is always the same dark wash — no theme variants. */
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
        /* Mobile: anchor crop toward the right so the woman stays in frame
           when the 16:9 landscape asset gets cropped for narrow viewports. */
        @media (max-width: 768px) {
          .hero-bg-image {
            object-position: 78% center;
          }
        }

        .hero-bg-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(to bottom, rgba(20,20,16,0.55) 0%, rgba(20,20,16,0.70) 100%);
        }

        /* Radial accent — gold warmth, same strength regardless of theme */
        .hero-radial {
          position: absolute; inset: 0; pointer-events: none;
          z-index: 2;
          background: radial-gradient(circle at 50% 50%, rgba(196,154,60,0.12) 0%, transparent 60%);
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
        /* All hero text is hardcoded for the dark photo backdrop. */
        .hero-eyebrow {
          font-family: ${sans};
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--hero-gold);
          opacity: var(--hero-eyebrow-alpha);
          margin: 0 0 24px;
          text-shadow: 0 1px 20px rgba(0,0,0,0.4);
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
          text-shadow: 0 1px 20px rgba(0,0,0,0.4);
        }
        .hero-h1 em {
          font-style: italic;
          color: var(--hero-gold);
          text-shadow: 0 1px 20px rgba(0,0,0,0.4);
        }

        .hero-secondary {
          font-family: ${serif};
          font-size: clamp(18px, 2.5vw, 24px);
          font-weight: 300;
          font-style: italic;
          color: var(--hero-muted);
          margin: 0 0 32px;
          text-shadow: 0 1px 20px rgba(0,0,0,0.4);
        }

        .hero-body {
          font-family: ${sans};
          font-size: 14px;
          color: var(--hero-body);
          line-height: 1.7;
          max-width: 480px;
          margin: 0 0 40px;
          text-shadow: 0 1px 20px rgba(0,0,0,0.4);
        }

        /* ── CTAs ───────────────────────────────────────────────── */
        .hero-ctas {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        /* Primary — gold on the photo, always */
        .hero-cta-primary {
          font-family: ${sans};
          font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          padding: 12px 28px; border-radius: 6px;
          background: #B8860B;
          color: #FAFAF8;
          border: none; text-decoration: none; display: inline-block;
          transition: opacity 120ms ease;
        }
        .hero-cta-primary:hover { opacity: 0.85; }

        /* Secondary — outlined cream on the photo, always */
        .hero-cta-secondary {
          font-family: ${sans};
          font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          padding: 12px 20px; border-radius: 6px;
          background: transparent;
          color: #FAFAF8;
          border: 1px solid rgba(250,250,248,0.40);
          text-decoration: none; display: inline-block;
          transition: background 150ms ease, border-color 150ms ease;
        }
        .hero-cta-secondary:hover {
          background: rgba(250,250,248,0.06);
          border-color: rgba(250,250,248,0.6);
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

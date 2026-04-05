"use client"

import { useState } from "react"
import { LandingPanelStrip } from "./landing-panel-strip"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

export function LandingHero() {
  const [wearable, setWearable] = useState(true)

  return (
    <section
      className="landing-hero-section"
      data-wearable={wearable ? "on" : "off"}
    >
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
          separately, they tell partial stories. Measured together &mdash; with
          cross-panel analysis &mdash; they tell you things no single test ever could.
        </p>

        {/* CTAs */}
        <div className="fade-up hero-ctas" style={{ animationDelay: "400ms" }}>
          <a href="#cta" className="hero-cta-primary">
            Start your assessment
          </a>
          <a href="#science" className="hero-cta-secondary">
            See the science &rarr;
          </a>
        </div>

        {/* Panel strip — toggle lives inside Sleep chip */}
        <div className="fade-up" style={{ width: "100%", maxWidth: 640, animationDelay: "450ms" }}>
          <LandingPanelStrip wearableOff={!wearable} onToggle={() => setWearable(w => !w)} />
        </div>

        {/* No-wearable explainer — only visible in off state */}
        <p className="hero-no-wearable-note">
          Peaq works with or without a wearable. Sleep and HRV data adds a powerful
          third signal &mdash; but your oral and blood panels tell a complete story on their own.
        </p>
      </div>

      <style>{`
        /* ── Hero section base ─────────────────────────────────── */
        .landing-hero-section {
          position: relative;
          overflow: hidden;
          background: var(--hero-bg);
          transition: background 600ms cubic-bezier(0.4, 0.0, 0.2, 1);
          --hero-bg: #F6F4EF;
          --hero-ink: #1a1a18;
          --hero-gold: #C49A3C;
          --hero-muted: #8C8A82;
          --hero-body: #8C8A82;
          --hero-cta-bg: #1a1a18;
          --hero-cta-color: #fff;
          --hero-cta2-border: rgba(0,0,0,0.12);
          --hero-cta2-color: #8C8A82;
          --hero-eyebrow-alpha: 1;
        }

        .landing-hero-section[data-wearable="off"] {
          --hero-bg: #16150F;
          --hero-ink: #ffffff;
          --hero-gold: #C49A3C;
          --hero-muted: rgba(255,255,255,0.55);
          --hero-body: rgba(255,255,255,0.55);
          --hero-cta-bg: #C49A3C;
          --hero-cta-color: #fff;
          --hero-cta2-border: rgba(255,255,255,0.15);
          --hero-cta2-color: rgba(255,255,255,0.5);
          --hero-eyebrow-alpha: 0.7;
        }

        /* Radial accents */
        .hero-radial {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at 20% 50%, rgba(196,154,60,0.04) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(24,95,165,0.03) 0%, transparent 40%);
          transition: background 600ms cubic-bezier(0.4,0.0,0.2,1);
        }
        .landing-hero-section[data-wearable="off"] .hero-radial {
          background: radial-gradient(circle at 50% 50%, rgba(196,154,60,0.06) 0%, transparent 60%);
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
          z-index: 2;
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

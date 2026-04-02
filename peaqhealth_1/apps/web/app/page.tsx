import Link from "next/link"
import { LogoSvg } from "./components/logo-svg"
import { LandingPanelsAndScience } from "./components/landing-panels-science"

/* ─── Design tokens ───────────────────────────────────────────────────────── */

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

const INK    = "#141410"
const INK_60 = "rgba(20,20,16,0.60)"
const INK_40 = "rgba(20,20,16,0.40)"
const INK_20 = "rgba(20,20,16,0.20)"
const INK_08 = "rgba(20,20,16,0.08)"
const INK_04 = "rgba(20,20,16,0.04)"
const GOLD   = "#9A7200"
const ORAL   = "#2D6A4F"
const BLOOD  = "#C0392B"
const SLEEP  = "#4A7FB5"
const BORDER = "rgba(20,20,16,0.10)"
const BG     = "#FAFAF8"

const wrap: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "0 10%",
}

const eyebrow: React.CSSProperties = {
  fontFamily: sans,
  fontSize: 11,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: INK_40,
  margin: "0 0 16px",
}

const rule: React.CSSProperties = {
  border: "none",
  borderTop: `0.5px solid ${BORDER}`,
  margin: 0,
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div style={{ background: BG, color: INK }}>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
          ══════════════════════════════════════════════════════════════════ */}

      <section className="hero-grid" style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        alignItems: "stretch",
        minHeight: "100vh",
        overflow: "hidden",
      }}>
        {/* Logo — absolute within hero only */}
        <div className="fade-up" style={{
          position: "absolute",
          top: 32,
          left: "10%",
          zIndex: 10,
          animationDelay: "0ms",
        }}>
          <LogoSvg size={80} color={INK} />
        </div>
        {/* Left — copy */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: "10%",
          paddingRight: "6%",
          paddingTop: 80,
          paddingBottom: 80,
        }}>
          {/* Headline */}
          <h1 className="fade-up" style={{
            fontFamily: serif,
            fontSize: "clamp(32px, 3.5vw, 48px)",
            fontWeight: 400,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            margin: 0,
            animationDelay: "80ms",
          }}>
            Your mouth is affecting your heart.
            <br />
            <em style={{ fontStyle: "italic", color: GOLD }}>
              We can show you exactly how.
            </em>
          </h1>

          {/* Subhead */}
          <p className="fade-up" style={{
            fontFamily: sans,
            fontSize: 15,
            fontStyle: "italic",
            lineHeight: 1.65,
            color: "rgba(20,20,16,0.60)",
            maxWidth: 400,
            margin: "24px 0 0",
            animationDelay: "180ms",
          }}>
            <em>P. gingivalis</em> — a bacterium found in gum disease — has been
            detected inside human coronary artery plaques. Peaq is the first
            platform to connect your oral microbiome, bloodwork, and sleep data
            into a single longitudinal score.
          </p>

          {/* CTAs */}
          <div className="fade-up" style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            marginTop: 36,
            animationDelay: "280ms",
          }}>
            <Link href="/signup" style={{
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              padding: "14px 36px",
              background: INK,
              color: BG,
              borderRadius: 3,
              textDecoration: "none",
            }}>
              Get started
            </Link>
            <Link href="/science" style={{
              fontFamily: sans,
              fontSize: 15,
              letterSpacing: "0.02em",
              color: "rgba(20,20,16,0.50)",
              textDecoration: "none",
            }}>
              See the science →
            </Link>
          </div>

          {/* Attribution */}
          <p className="fade-up" style={{
            fontFamily: sans,
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "rgba(20,20,16,0.30)",
            marginTop: 48,
            animationDelay: "360ms",
          }}>
            Built by Dr. Igor Khabensky (General Dentist)
            and Dr. Paul Leis (Cardiologist)
          </p>
        </div>

        {/* Right — staggered duo phone mockups */}
        <div className="fade-up hero-mockup" style={{
          position: "relative",
          height: "100vh",
          overflow: "hidden",
          backgroundColor: "#FAFAF8",
          animationDelay: "400ms",
        }}>
          {/* Back phone — Sleep panel */}
          <img
            className="phone-mockup"
            src="/images/preview-sleep.png"
            alt="Peaq sleep panel"
            style={{
              position: "absolute",
              height: "78%",
              width: "auto",
              right: 100,
              top: "6%",
              zIndex: 1,
              opacity: 0.88,
              mixBlendMode: "multiply" as const,
              imageRendering: "crisp-edges" as const,
              filter: "drop-shadow(-4px 0 20px rgba(20,20,16,0.08))",
            }}
          />
          {/* Front phone — Insights */}
          <img
            className="phone-mockup"
            src="/images/dashboard-preview.png"
            alt="Peaq Health dashboard"
            style={{
              position: "absolute",
              height: "88%",
              width: "auto",
              right: -20,
              top: "5%",
              zIndex: 2,
              mixBlendMode: "multiply" as const,
              imageRendering: "crisp-edges" as const,
              filter: "drop-shadow(-8px 0 40px rgba(20,20,16,0.12))",
            }}
          />
        </div>

      </section>

      <hr style={rule} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — SCIENCE HOOK
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ ...wrap, paddingTop: 80, paddingBottom: 80 }}>
        <p style={eyebrow}>The pathway</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 64,
          alignItems: "center",
        }}>
          {/* Left — key stat */}
          <div>
            <p style={{
              fontFamily: serif,
              fontSize: "clamp(64px, 8vw, 96px)",
              fontWeight: 400,
              lineHeight: 1,
              color: GOLD,
              margin: "0 0 16px",
            }}>
              100%
            </p>
            <p style={{
              fontFamily: sans,
              fontSize: 16,
              lineHeight: 1.65,
              color: INK_60,
              maxWidth: 340,
              margin: "0 0 12px",
            }}>
              of coronary artery plaques studied contained{" "}
              <em>P. gingivalis</em> DNA — an oral bacterium.
            </p>
            <p style={{
              fontFamily: sans,
              fontSize: 11,
              fontStyle: "italic",
              color: INK_40,
              margin: 0,
            }}>
              — J. Am. Coll. Cardiol., 2023
            </p>
          </div>

          {/* Right — pathway SVG */}
          <div>
            <svg
              viewBox="0 0 470 80"
              role="img"
              aria-label="Pathway: oral bacteria to cardiac tissue"
              style={{ width: "100%", maxWidth: 500, overflow: "visible" }}
            >
              <defs>
                <marker id="science-pathway-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={INK_20} />
                </marker>
              </defs>
              {/* Connecting lines */}
              <line x1="83" y1="40" x2="143" y2="40" stroke={INK_20} strokeWidth="1.5" markerEnd="url(#science-pathway-arrow)" />
              <line x1="203" y1="40" x2="263" y2="40" stroke={INK_20} strokeWidth="1.5" markerEnd="url(#science-pathway-arrow)" />
              <line x1="323" y1="40" x2="383" y2="40" stroke={INK_20} strokeWidth="1.5" markerEnd="url(#science-pathway-arrow)" />
              {/* Node 1 — Oral */}
              <circle cx="55" cy="40" r="28" fill="#EAF3DE" />
              {/* Node 2 — Bloodstream */}
              <circle cx="175" cy="40" r="28" fill="#FDECEA" />
              {/* Node 3 — Inflammation */}
              <circle cx="295" cy="40" r="28" fill="#FEF3C7" />
              {/* Node 4 — Cardiac */}
              <circle cx="415" cy="40" r="28" fill={INK_08} />
              <g style={{ fontFamily: sans }}>
                {/* Node 1 text */}
                <text x="55" y="38" textAnchor="middle" fontSize="8" fontWeight="600" fill={ORAL}>Oral</text>
                <text x="55" y="49" textAnchor="middle" fontSize="7" fill={ORAL}>bacteria</text>
                {/* Node 2 text */}
                <text x="175" y="38" textAnchor="middle" fontSize="8" fontWeight="600" fill={BLOOD}>Blood-</text>
                <text x="175" y="49" textAnchor="middle" fontSize="7" fill={BLOOD}>stream</text>
                {/* Node 3 text */}
                <text x="295" y="38" textAnchor="middle" fontSize="8" fontWeight="600" fill="#B8860B">Systemic</text>
                <text x="295" y="49" textAnchor="middle" fontSize="7" fill="#B8860B">inflam.</text>
                {/* Node 4 text */}
                <text x="415" y="38" textAnchor="middle" fontSize="8" fontWeight="600" fill="#141410">Cardiac</text>
                <text x="415" y="49" textAnchor="middle" fontSize="7" fill={INK_60}>tissue</text>
              </g>
            </svg>
            <p style={{
              fontFamily: sans,
              fontSize: 12,
              color: INK_40,
              marginTop: 20,
              lineHeight: 1.6,
            }}>
              The same species that cause gum disease cross into the
              bloodstream, trigger systemic inflammation, and have been
              found embedded in coronary artery plaque.
            </p>
          </div>
        </div>
      </section>

      <hr style={rule} />

      {/* ══ SECTIONS 3 + 5 — Interactive panels + science (shared state) ═══ */}
      <LandingPanelsAndScience />

      <hr style={rule} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — INSIDE THE APP
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: "var(--warm-50)",
        paddingTop: 96,
        paddingBottom: 96,
      }}>
        <div style={{ ...wrap }}>
          <p style={eyebrow}>Inside the app</p>
          <h2 style={{
            fontFamily: serif,
            fontSize: "clamp(24px, 2.5vw, 36px)",
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            margin: "0 0 56px",
            maxWidth: 480,
          }}>
            This is what you actually see.
          </h2>

          <div className="app-showcase-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "start",
          }}>
            {/* Left — Insights view */}
            <div>
              <img
                className="phone-mockup"
                src="/images/dashboard-preview.png"
                alt="Peaq Insights dashboard showing cross-panel AI cards"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  height: "auto",
                  display: "block",
                  mixBlendMode: "multiply" as const,
                  imageRendering: "crisp-edges" as const,
                  filter: "drop-shadow(-6px 6px 32px rgba(20,20,16,0.12))",
                  marginBottom: 28,
                }}
              />
              <p style={{
                fontFamily: sans, fontSize: 10, fontWeight: 600,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: ORAL, margin: "0 0 8px",
              }}>
                AI Insights
              </p>
              <p style={{
                fontFamily: serif, fontSize: 20, fontWeight: 400,
                color: INK, margin: "0 0 12px", lineHeight: 1.3,
              }}>
                Cross-panel signals, updated daily
              </p>
              <p style={{
                fontFamily: sans, fontSize: 14, color: INK_60,
                lineHeight: 1.7, maxWidth: 340, margin: 0,
              }}>
                Peaq&apos;s AI reads across your oral, blood, and sleep data to
                surface connections no single panel can see. Every insight
                links to the underlying science.
              </p>
            </div>

            {/* Right — Sleep panel */}
            <div>
              <img
                className="phone-mockup"
                src="/images/preview-sleep.png"
                alt="Peaq sleep panel showing deep sleep, HRV, SpO2 and REM metrics"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  height: "auto",
                  display: "block",
                  mixBlendMode: "multiply" as const,
                  imageRendering: "crisp-edges" as const,
                  filter: "drop-shadow(-6px 6px 32px rgba(20,20,16,0.12))",
                  marginBottom: 28,
                }}
              />
              <p style={{
                fontFamily: sans, fontSize: 10, fontWeight: 600,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: SLEEP, margin: "0 0 8px",
              }}>
                Sleep Panel
              </p>
              <p style={{
                fontFamily: serif, fontSize: 20, fontWeight: 400,
                color: INK, margin: "0 0 12px", lineHeight: 1.3,
              }}>
                Clinical thresholds, not just ranges
              </p>
              <p style={{
                fontFamily: sans, fontSize: 14, color: INK_60,
                lineHeight: 1.7, maxWidth: 340, margin: 0,
              }}>
                Deep sleep, HRV, SpO₂, REM — each metric measured against a
                clinical target, not a population average. When something needs
                attention, you&apos;ll know.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr style={rule} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5 — HOW IT WORKS
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ ...wrap, paddingTop: 96, paddingBottom: 96 }}>
        <p style={eyebrow}>How it works</p>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {([
            { num: "1", title: "Order your kit",        text: "Oral microbiome swab \u2014 16S rRNA sequencing at species-level resolution. Results in 2\u20133 weeks.", img: "/images/oralkit.png" as string | undefined, pill: undefined as string | undefined },
            { num: "2", title: "Upload your labs",      text: "LabCorp, Quest, or any standard bloodwork. 40+ biomarkers tracked.", img: undefined, pill: undefined },
            { num: "3", title: "Connect your wearable", text: "WHOOP or Oura. Syncs nightly. Apple Health coming soon.", img: undefined, pill: undefined },
            { num: "4", title: "Get your Peaq score",   text: "A single number \u2014 recalculated as your data updates. With the cross-panel signals that change how you understand your health.", img: undefined, pill: "Peaq score" as string | undefined },
          ]).map(s => (
            <div key={s.num} style={{
              display: "flex", alignItems: "flex-start", gap: 32,
              padding: "32px 0",
              borderBottom: `0.5px solid ${INK_08}`,
            }}>
              <span style={{
                fontFamily: serif, fontSize: 32, fontWeight: 400,
                color: "rgba(20,20,16,0.15)", lineHeight: 1,
                width: 32, flexShrink: 0, marginTop: 2,
              }}>
                {s.num}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <p style={{
                    fontFamily: sans, fontSize: 15, fontWeight: 500,
                    color: INK, margin: 0,
                  }}>
                    {s.title}
                  </p>
                  {s.pill && (
                    <span style={{
                      fontSize: 11, fontWeight: 500, fontFamily: sans,
                      background: "rgba(154,114,0,0.10)", color: GOLD,
                      padding: "3px 10px", borderRadius: 20,
                    }}>
                      {s.pill}
                    </span>
                  )}
                </div>
                <p style={{
                  fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.55)",
                  lineHeight: 1.7, margin: 0,
                }}>
                  {s.text}
                </p>
              </div>
              {s.img && (
                <img
                  src={s.img}
                  alt=""
                  aria-hidden="true"
                  style={{
                    height: 64, width: "auto", opacity: 0.85,
                    mixBlendMode: "multiply" as const, flexShrink: 0,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <hr style={rule} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 7 — BUILT BY CLINICIANS
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ ...wrap, paddingTop: 96, paddingBottom: 96 }}>
        <p style={eyebrow}>Built by clinicians, not algorithms</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 64,
          marginBottom: 56,
        }}>
          {([
            { name: "Dr. Igor Khabensky", title: "General Dentist", photo: "/images/dr-igor-khabensky.jpg" },
            { name: "Dr. Paul Leis",      title: "Cardiologist",    photo: "/images/dr-paul-leis.jpg" },
          ] as const).map(doc => (
            <div key={doc.name}>
              {doc.photo ? (
                <img
                  src={doc.photo}
                  alt={doc.name}
                  style={{
                    width: 160, height: 160, borderRadius: "50%",
                    objectFit: "cover", marginBottom: 20,
                  }}
                />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "rgba(20,20,16,0.06)", marginBottom: 20,
                }} />
              )}
              <p style={{
                fontFamily: sans, fontSize: 16, fontWeight: 500,
                color: INK, margin: "0 0 4px",
              }}>
                {doc.name}
              </p>
              <p style={{
                fontFamily: sans, fontSize: 13,
                color: "rgba(20,20,16,0.45)", margin: 0,
              }}>
                {doc.title}
              </p>
            </div>
          ))}
        </div>

        <p style={{
          fontFamily: serif, fontSize: 24, fontWeight: 400,
          fontStyle: "italic", lineHeight: 1.5,
          color: INK_60, maxWidth: 640,
        }}>
          &ldquo;We built Peaq because we kept seeing the same pattern —
          oral disease showing up in cardiovascular risk, sleep disruption
          compounding inflammation. No platform was connecting these
          dots.&rdquo;
        </p>
      </section>

      <hr style={rule} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 8 — FINAL CTA
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ ...wrap, paddingTop: 120, paddingBottom: 80 }}>
        <p style={{
          fontFamily: serif,
          fontSize: "clamp(28px, 4vw, 48px)",
          fontWeight: 400,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          margin: "0 0 40px",
        }}>
          Ready to measure what others miss?
        </p>

        <Link href="/signup" style={{
          fontFamily: sans,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          padding: "14px 36px",
          background: INK,
          color: BG,
          borderRadius: 3,
          textDecoration: "none",
          display: "inline-block",
        }}>
          Get started
        </Link>

        <p style={{
          fontFamily: sans, fontSize: 11, color: "rgba(20,20,16,0.30)",
          marginTop: 48, lineHeight: 1.7, maxWidth: 440,
        }}>
          For informational purposes only. Not a medical device.
          Not intended to diagnose, treat, cure, or prevent any disease.
        </p>
      </section>
    </div>
  )
}

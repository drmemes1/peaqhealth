import { WaitlistForm } from "./components/waitlist-form"

/* ─── Design tokens ───────────────────────────────────────────────────────── */

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

const BG_DARK   = "#16150F"
const BG_DARK2  = "#1E1D16"
const BG_CREAM  = "#F6F4EF"
const ACCENT    = "var(--color-accent-gold)"
const ACCENT_RAW = "#C49A3C"
const MUTED     = "#8C8A82"
const INK       = "#1a1a18"
const INK_60    = "rgba(20,20,16,0.60)"

const BORDER_DARK  = "rgba(255,255,255,0.1)"
const BORDER_LIGHT = "rgba(0,0,0,0.08)"

const SLEEP_C = "#5B9BD5"
const BLOOD_C = "#C97070"
const ORAL_C  = "#7AB87A"

const WHITE     = "#FFFFFF"
const WHITE_80  = "rgba(255,255,255,0.8)"
const WHITE_45  = "rgba(255,255,255,0.45)"
const WHITE_40  = "rgba(255,255,255,0.4)"
const WHITE_30  = "rgba(255,255,255,0.3)"
const WHITE_10  = "rgba(255,255,255,0.1)"

const contentWrap: React.CSSProperties = {
  maxWidth: "var(--layout-max-width)",
  margin: "0 auto",
  padding: "0 24px",
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div style={{ background: BG_DARK, color: WHITE }}>

      {/* ══════════════════════════════════════════════════════════════════
          NAV — sticky dark
          ══════════════════════════════════════════════════════════════════ */}
      <nav className="landing-nav" style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(22,21,15,0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: `1px solid ${BORDER_DARK}`,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "20px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Logo */}
          <div className="landing-nav-logo">
            <img
              src="/images/peaq_logo_transparent.png"
              alt="Peaq Health"
              style={{
                height: 75,
                width: "auto",
                filter: "brightness(0) invert(1)",
              }}
            />
          </div>

          {/* Center links */}
          <div className="landing-nav-links" style={{ display: "flex", alignItems: "center", gap: 36 }}>
            {([
              { label: "Science", href: "#science" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Team", href: "#team" },
            ] as const).map(link => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  fontFamily: sans,
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "rgba(255,255,255,0.4)",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA pill */}
          <a
            className="landing-nav-cta"
            href="#cta"
            style={{
              fontFamily: sans,
              fontSize: 12,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: ACCENT,
              textDecoration: "none",
              border: `1px solid ${ACCENT_RAW}`,
              borderRadius: 4,
              padding: "10px 22px",
            }}
          >
            Join waitlist &rarr;
          </a>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO (dark bg)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: BG_DARK }}>
        <div className="landing-hero" style={{
          ...contentWrap,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          maxWidth: 720,
          paddingTop: "clamp(72px, 10vw, 120px)",
          paddingBottom: "clamp(72px, 10vw, 120px)",
          minHeight: "70vh",
          justifyContent: "center",
        }}>
          <div>
            {/* Eyebrow */}
            <p style={{
              fontFamily: sans,
              fontSize: "clamp(11px, 1vw, 13px)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: ACCENT,
              margin: "0 0 20px",
            }}>
              Oral &middot; Blood &middot; Sleep
            </p>

            {/* H1 */}
            <h1 style={{
              fontFamily: serif,
              fontSize: "clamp(40px, 5vw, 72px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: WHITE,
              margin: "0 0 20px",
            }}>
              Your mouth is affecting your heart. We can show you{" "}
              <em style={{ fontStyle: "italic", color: ACCENT }}>exactly</em> how.
            </h1>

            {/* Sub */}
            <p style={{
              fontFamily: sans,
              fontSize: "clamp(14px, 1.2vw, 17px)",
              lineHeight: 1.7,
              color: WHITE_45,
              maxWidth: 420,
              margin: "0 0 32px",
            }}>
              Peaq unifies oral microbiome sequencing, blood biomarkers, and
              nightly sleep data into a single, clinician-designed score. See
              the connections your doctors are missing.
            </p>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 48 }}>
              <a
                href="#cta"
                style={{
                  fontFamily: sans,
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "13px 28px",
                  background: ACCENT,
                  color: BG_DARK,
                  border: "none",
                  borderRadius: 3,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Join waitlist
              </a>
              <a
                href="#science"
                style={{
                  fontFamily: sans,
                  fontSize: 13,
                  letterSpacing: "0.02em",
                  color: WHITE_40,
                  textDecoration: "none",
                }}
              >
                See the science &rarr;
              </a>
            </div>

            {/* Stats row */}
            <p style={{
              fontFamily: sans,
              fontSize: "clamp(11px, 1vw, 13px)",
              letterSpacing: "0.04em",
              color: WHITE_30,
              margin: 0,
            }}>
              100+ species &middot; 40+ biomarkers &middot; 29 cited studies &middot; 1 score
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — THREE PANELS (dark bg, flush with hero)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: BG_DARK, paddingTop: "clamp(64px, 8vw, 96px)", paddingBottom: "clamp(64px, 8vw, 96px)" }}>
        <div style={contentWrap}>
          {/* Eyebrow */}
          <p style={{
            fontFamily: sans,
            fontSize: "clamp(10px, 0.9vw, 12px)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: ACCENT,
            margin: "0 0 12px",
          }}>
            Three panels. One score.
          </p>

          {/* H2 */}
          <h2 style={{
            fontFamily: serif,
            fontSize: "clamp(28px, 3vw, 42px)",
            fontWeight: 400,
            lineHeight: 1.2,
            color: WHITE,
            margin: "0 0 48px",
          }}>
            Everything that matters, nothing that doesn&rsquo;t.
          </h2>

          {/* Panel grid */}
          <div className="landing-panels-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            border: `1px solid ${BORDER_DARK}`,
            borderRadius: 6,
            overflow: "hidden",
          }}>
            {([
              {
                color: SLEEP_C,
                title: "Sleep",
                source: "Wearable \u00B7 nightly",
                metrics: "5 metrics nightly",
                points: "30 pts",
                devices: "WHOOP \u00B7 Oura \u00B7 Apple Health",
              },
              {
                color: BLOOD_C,
                title: "Blood",
                source: "Lab upload \u00B7 any provider",
                metrics: "40+ biomarkers",
                points: "40 pts",
                devices: "LabCorp \u00B7 Quest \u00B7 any lab",
              },
              {
                color: ORAL_C,
                title: "Oral",
                source: "16S rRNA \u00B7 at-home swab",
                metrics: "100+ species",
                points: "30 pts",
                devices: "Results in 10\u201314 days",
              },
            ] as const).map((panel, i) => (
              <div key={panel.title} style={{
                background: BG_DARK2,
                padding: "36px 28px",
                borderLeft: i > 0 ? `1px solid ${BORDER_DARK}` : "none",
              }}>
                {/* Color dot + title */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: panel.color,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: sans,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    color: panel.color,
                  }}>
                    {panel.title}
                  </span>
                </div>

                {/* Source */}
                <p style={{
                  fontFamily: sans,
                  fontSize: 12,
                  color: WHITE_45,
                  margin: "0 0 6px",
                }}>
                  {panel.source}
                </p>

                {/* Metrics */}
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 500,
                  color: WHITE_80,
                  margin: "0 0 4px",
                }}>
                  {panel.metrics}
                </p>

                {/* Points */}
                <p style={{
                  fontFamily: serif,
                  fontSize: 22,
                  fontWeight: 400,
                  color: WHITE,
                  margin: "0 0 16px",
                }}>
                  {panel.points}
                </p>

                {/* Devices */}
                <p style={{
                  fontFamily: sans,
                  fontSize: 11,
                  color: MUTED,
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  {panel.devices}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom quote */}
          <p style={{
            fontFamily: serif,
            fontSize: "clamp(14px, 1.2vw, 17px)",
            fontStyle: "italic",
            color: WHITE_40,
            textAlign: "center",
            marginTop: 40,
            lineHeight: 1.6,
          }}>
            &ldquo;Each panel sees a piece. The score sees the pattern.&rdquo;
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — HOW IT WORKS (cream bg)
          ══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ background: BG_CREAM }}>
        <div style={{ ...contentWrap, paddingTop: "clamp(64px, 8vw, 96px)", paddingBottom: "clamp(64px, 8vw, 96px)" }}>
          {/* Eyebrow */}
          <p style={{
            fontFamily: sans,
            fontSize: "clamp(10px, 0.9vw, 12px)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: MUTED,
            margin: "0 0 12px",
          }}>
            How it works
          </p>

          {/* H2 */}
          <h2 style={{
            fontFamily: serif,
            fontSize: "clamp(28px, 3vw, 42px)",
            fontWeight: 400,
            lineHeight: 1.2,
            color: INK,
            margin: "0 0 48px",
          }}>
            Four steps to your full picture.
          </h2>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Step 1 */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 24,
              padding: "28px 0",
              borderBottom: `1px solid ${BORDER_LIGHT}`,
            }}>
              <span style={{
                fontFamily: serif,
                fontSize: 32,
                fontWeight: 400,
                color: "rgba(0,0,0,0.12)",
                lineHeight: 1,
                width: 32,
                flexShrink: 0,
                marginTop: 2,
              }}>
                1
              </span>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 500,
                  color: INK,
                  margin: "0 0 6px",
                }}>
                  Order your kit
                </p>
                <p style={{
                  fontFamily: sans,
                  fontSize: "clamp(13px, 1.1vw, 15px)",
                  color: INK_60,
                  lineHeight: 1.7,
                  margin: 0,
                }}>
                  Oral microbiome swab &mdash; 16S rRNA sequencing at species-level
                  resolution. Results in 2&ndash;3 weeks.
                </p>
              </div>
              <img
                src="/images/oralkit.png"
                alt="Peaq oral swab kit"
                style={{
                  width: 80,
                  height: "auto",
                  flexShrink: 0,
                  borderRadius: 4,
                }}
              />
            </div>

            {/* Step 2 */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 24,
              padding: "28px 0",
              borderBottom: `1px solid ${BORDER_LIGHT}`,
            }}>
              <span style={{
                fontFamily: serif,
                fontSize: 32,
                fontWeight: 400,
                color: "rgba(0,0,0,0.12)",
                lineHeight: 1,
                width: 32,
                flexShrink: 0,
                marginTop: 2,
              }}>
                2
              </span>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 500,
                  color: INK,
                  margin: "0 0 6px",
                }}>
                  Upload your labs
                </p>
                <p style={{
                  fontFamily: sans,
                  fontSize: "clamp(13px, 1.1vw, 15px)",
                  color: INK_60,
                  lineHeight: 1.7,
                  margin: 0,
                }}>
                  LabCorp, Quest, or any standard bloodwork. 40+ biomarkers
                  tracked against clinical and optimal ranges.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 24,
              padding: "28px 0",
              borderBottom: `1px solid ${BORDER_LIGHT}`,
            }}>
              <span style={{
                fontFamily: serif,
                fontSize: 32,
                fontWeight: 400,
                color: "rgba(0,0,0,0.12)",
                lineHeight: 1,
                width: 32,
                flexShrink: 0,
                marginTop: 2,
              }}>
                3
              </span>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 500,
                  color: INK,
                  margin: "0 0 6px",
                }}>
                  Connect your wearable
                </p>
                <p style={{
                  fontFamily: sans,
                  fontSize: "clamp(13px, 1.1vw, 15px)",
                  color: INK_60,
                  lineHeight: 1.7,
                  margin: 0,
                }}>
                  WHOOP or Oura. Syncs nightly sleep, HRV, respiratory rate.
                  Apple Health coming soon.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 24,
              padding: "28px 0",
              borderBottom: `1px solid ${BORDER_LIGHT}`,
            }}>
              <span style={{
                fontFamily: serif,
                fontSize: 32,
                fontWeight: 400,
                color: "rgba(0,0,0,0.12)",
                lineHeight: 1,
                width: 32,
                flexShrink: 0,
                marginTop: 2,
              }}>
                4
              </span>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 500,
                  color: INK,
                  margin: "0 0 6px",
                }}>
                  Get your Peaq score
                </p>
                <p style={{
                  fontFamily: sans,
                  fontSize: "clamp(13px, 1.1vw, 15px)",
                  color: INK_60,
                  lineHeight: 1.7,
                  margin: "0 0 8px",
                }}>
                  A single number &mdash; recalculated as your data updates.
                  With the cross-panel signals that change how you understand
                  your health.
                </p>
                <p style={{
                  fontFamily: sans,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: MUTED,
                  margin: 0,
                }}>
                  Not a diagnosis. A lens your clinician can actually use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — SCIENCE STRIP (dark bg)
          ══════════════════════════════════════════════════════════════════ */}
      <section id="science" style={{ background: BG_DARK }}>
        <div style={{ ...contentWrap, paddingTop: "clamp(64px, 8vw, 96px)", paddingBottom: "clamp(64px, 8vw, 96px)" }}>
          {/* Eyebrow */}
          <p style={{
            fontFamily: sans,
            fontSize: "clamp(10px, 0.9vw, 12px)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: ACCENT,
            margin: "0 0 12px",
          }}>
            The evidence
          </p>

          <h2 style={{
            fontFamily: serif,
            fontSize: "clamp(28px, 3vw, 42px)",
            fontWeight: 400,
            lineHeight: 1.2,
            color: WHITE,
            margin: "0 0 48px",
          }}>
            Built on peer-reviewed research.
          </h2>

          {/* Citation rows */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {([
              {
                journal: "Circulation, 2026",
                quote: "Periodontal disease increases ASCVD risk independently of traditional risk factors.",
                note: undefined as string | undefined,
                tag: "Oral \u2192 Blood",
              },
              {
                journal: "Eur Heart Journal, 2025",
                quote: "Residual inflammatory risk is at least as strong a predictor of recurrent events as residual cholesterol risk.",
                note: "n = 448,653" as string | undefined,
                tag: "Blood",
              },
              {
                journal: "Biol Psychiatry, 2016",
                quote: "Elevated CRP fragments sleep architecture, reducing slow-wave sleep and increasing nocturnal arousal.",
                note: undefined as string | undefined,
                tag: "Blood \u2192 Sleep",
              },
              {
                journal: "mSystems, 2022",
                quote: "Oral microbiome composition alone predicts obstructive sleep apnea with AUC 91.9%.",
                note: "n = 156" as string | undefined,
                tag: "Oral \u2192 Sleep",
              },
            ]).map((cite, i) => (
              <div className="landing-science-row" key={i} style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr auto",
                gap: 24,
                alignItems: "baseline",
                padding: "24px 0",
                borderBottom: `1px solid ${BORDER_DARK}`,
              }}>
                {/* Journal */}
                <span style={{
                  fontFamily: sans,
                  fontSize: "clamp(10px, 0.9vw, 12px)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: MUTED,
                  lineHeight: 1.8,
                }}>
                  {cite.journal}
                </span>

                {/* Quote */}
                <p style={{
                  fontFamily: serif,
                  fontSize: "clamp(14px, 1.2vw, 17px)",
                  fontStyle: "italic",
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.65)",
                  margin: 0,
                }}>
                  &ldquo;{cite.quote}&rdquo;
                  {cite.note && (
                    <span style={{
                      fontFamily: sans,
                      fontSize: 11,
                      fontStyle: "normal",
                      color: MUTED,
                      marginLeft: 8,
                    }}>
                      {cite.note}
                    </span>
                  )}
                </p>

                {/* Path tag */}
                <span style={{
                  fontFamily: sans,
                  fontSize: "clamp(10px, 0.9vw, 12px)",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  color: ACCENT,
                  border: `1px solid rgba(196,154,60,0.3)`,
                  borderRadius: 999,
                  padding: "4px 12px",
                  whiteSpace: "nowrap",
                }}>
                  {cite.tag}
                </span>
              </div>
            ))}
          </div>

          {/* View full evidence base */}
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <a
              href="/science"
              style={{
                fontFamily: sans,
                fontSize: 13,
                letterSpacing: "0.02em",
                color: ACCENT,
                textDecoration: "none",
              }}
            >
              View full evidence base &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5 — APP SCREENSHOTS (cream bg)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: BG_CREAM }}>
        <div style={{ ...contentWrap, paddingTop: "clamp(64px, 8vw, 96px)", paddingBottom: "clamp(64px, 8vw, 96px)" }}>
          <p style={{
            fontFamily: sans,
            fontSize: "clamp(10px, 0.9vw, 12px)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: MUTED,
            margin: "0 0 12px",
          }}>
            Inside the app
          </p>

          <h2 style={{
            fontFamily: serif,
            fontSize: "clamp(28px, 3vw, 42px)",
            fontWeight: 400,
            lineHeight: 1.2,
            color: INK,
            margin: "0 0 56px",
          }}>
            This is what you actually see.
          </h2>

          {/* Row 1 — oral image left, text right */}
          <div className="landing-app-feature" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "center",
            marginBottom: 64,
          }}>
            <img
              src="/images/landing-oral.png"
              alt="Peaq oral microbiome panel showing Shannon diversity, nitrate reducers, periodontal burden, and OSA-associated taxa"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: 8,
                border: `0.5px solid ${BORDER_LIGHT}`,
              }}
            />
            <div>
              <p style={{
                fontFamily: sans,
                fontSize: "clamp(10px, 0.9vw, 12px)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: ORAL_C,
                margin: "0 0 8px",
              }}>
                Oral Microbiome
              </p>
              <p style={{
                fontFamily: serif,
                fontSize: 24,
                fontWeight: 400,
                color: INK,
                margin: "0 0 14px",
                lineHeight: 1.3,
              }}>
                Species-level resolution
              </p>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: INK_60,
                lineHeight: 1.7,
                maxWidth: 380,
                margin: 0,
              }}>
                Shannon diversity, nitrate-reducing bacteria, periodontal
                pathogens, OSA-associated taxa &mdash; each scored against
                clinical targets with clear status indicators.
              </p>
            </div>
          </div>

          {/* Row 2 — text left, sleep image right */}
          <div className="landing-app-feature" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "center",
          }}>
            <div>
              <p style={{
                fontFamily: sans,
                fontSize: "clamp(10px, 0.9vw, 12px)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: SLEEP_C,
                margin: "0 0 8px",
              }}>
                AI Insights
              </p>
              <p style={{
                fontFamily: serif,
                fontSize: 24,
                fontWeight: 400,
                color: INK,
                margin: "0 0 14px",
                lineHeight: 1.3,
              }}>
                Cross-panel context
              </p>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: INK_60,
                lineHeight: 1.7,
                maxWidth: 380,
                margin: 0,
              }}>
                Your sleep data interpreted through your oral and blood panels.
                Not just numbers &mdash; the connections between deep sleep, HRV,
                and your oral nitrate pathways.
              </p>
            </div>
            <img
              src="/images/landing-sleep.png"
              alt="Peaq sleep narrative showing deep sleep, HRV, efficiency analysis with cross-panel context"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: 8,
                border: `0.5px solid ${BORDER_LIGHT}`,
              }}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 6 — TEAM (cream bg)
          ══════════════════════════════════════════════════════════════════ */}
      <section id="team" style={{ background: BG_CREAM }}>
        <div style={{ ...contentWrap, paddingTop: "clamp(64px, 8vw, 96px)", paddingBottom: "clamp(64px, 8vw, 96px)" }}>
          <p style={{
            fontFamily: sans,
            fontSize: "clamp(10px, 0.9vw, 12px)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: MUTED,
            margin: "0 0 16px",
          }}>
            Our team
          </p>

          <h2 style={{
            fontFamily: serif,
            fontSize: "clamp(28px, 3vw, 42px)",
            fontWeight: 400,
            lineHeight: 1.2,
            color: INK,
            margin: "0 0 40px",
          }}>
            Built by real doctors,{" "}
            <em style={{ fontStyle: "italic", color: ACCENT_RAW }}>not algorithms.</em>
          </h2>

          <div className="landing-team-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            marginTop: 40,
          }}>
            {([
              { name: "Dr. Igor Khabensky", title: "General Dentist", photo: "/images/dr-igor-khabensky.jpg" },
              { name: "Dr. Paul Leis", title: "Cardiologist", photo: "/images/dr-paul-leis.jpg" },
            ] as const).map(doc => (
              <div key={doc.name} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <img
                  src={doc.photo}
                  alt={doc.name}
                  style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
                <div>
                  <p style={{ fontFamily: sans, fontSize: 16, fontWeight: 500, color: INK, margin: 0 }}>{doc.name}</p>
                  <p style={{ fontFamily: sans, fontSize: 13, color: MUTED, margin: "4px 0 0" }}>{doc.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 7 — TRANSPARENCY (dark bg)
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: BG_DARK }}>
        <div style={{ ...contentWrap, paddingTop: "clamp(64px, 8vw, 96px)", paddingBottom: "clamp(64px, 8vw, 96px)" }}>
          <p style={{
            fontFamily: sans,
            fontSize: "clamp(10px, 0.9vw, 12px)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: ACCENT,
            margin: "0 0 12px",
          }}>
            Radical transparency
          </p>

          <h2 style={{
            fontFamily: serif,
            fontSize: "clamp(28px, 3vw, 42px)",
            fontWeight: 400,
            lineHeight: 1.2,
            color: WHITE,
            margin: "0 0 48px",
          }}>
            What we say &mdash; and what we don&rsquo;t.
          </h2>

          {/* 2x2 grid */}
          <div className="landing-transparency-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1,
            background: BORDER_DARK,
            borderRadius: 6,
            overflow: "hidden",
            marginBottom: 40,
          }}>
            {/* What we say */}
            <div style={{ background: BG_DARK2, padding: "32px 28px" }}>
              <p style={{
                fontFamily: sans,
                fontSize: "clamp(10px, 0.9vw, 12px)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: ORAL_C,
                margin: "0 0 16px",
              }}>
                What we say
              </p>
              <ul style={{
                fontFamily: sans,
                fontSize: 14,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.8,
                margin: 0,
                paddingLeft: 18,
              }}>
                <li>Your oral microbiome correlates with systemic inflammation</li>
                <li>Periodontal pathogens are associated with elevated ASCVD risk</li>
                <li>Sleep disruption and CRP share a bidirectional relationship</li>
                <li>Your Peaq score tracks multi-system health signals over time</li>
              </ul>
            </div>

            {/* What we don't say */}
            <div style={{ background: BG_DARK2, padding: "32px 28px" }}>
              <p style={{
                fontFamily: sans,
                fontSize: "clamp(10px, 0.9vw, 12px)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: BLOOD_C,
                margin: "0 0 16px",
              }}>
                What we don&rsquo;t say
              </p>
              <ul style={{
                fontFamily: sans,
                fontSize: 14,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.8,
                margin: 0,
                paddingLeft: 18,
              }}>
                <li>We never claim to diagnose, treat, or cure any condition</li>
                <li>We don&rsquo;t replace your doctor, your labs, or your clinical judgment</li>
                <li>We don&rsquo;t overstate emerging research as settled fact</li>
                <li>We won&rsquo;t sell your data or hide our methodology</li>
              </ul>
            </div>
          </div>

          {/* Footer note */}
          <p style={{
            fontFamily: serif,
            fontSize: "clamp(14px, 1.2vw, 17px)",
            fontStyle: "italic",
            color: WHITE_40,
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 520,
            margin: "0 auto",
          }}>
            &ldquo;If we can&rsquo;t cite it, we don&rsquo;t claim it.
            Every threshold in Peaq links back to a peer-reviewed source.&rdquo;
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 8 — CTA (cream bg)
          ══════════════════════════════════════════════════════════════════ */}
      <section id="cta" style={{ background: BG_CREAM }}>
        <div style={{
          ...contentWrap,
          paddingTop: "clamp(64px, 8vw, 120px)",
          paddingBottom: "clamp(64px, 8vw, 96px)",
          textAlign: "center",
        }}>
          <h2 style={{
            fontFamily: serif,
            fontSize: "clamp(32px, 4vw, 52px)",
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: INK,
            margin: "0 0 16px",
          }}>
            Ready to measure what others miss?
          </h2>

          <p style={{
            fontFamily: sans,
            fontSize: 14,
            color: INK_60,
            lineHeight: 1.7,
            maxWidth: 420,
            margin: "0 auto 36px",
          }}>
            Join the waitlist for early access. Be among the first to see oral,
            blood, and sleep data in a single score.
          </p>

          <div style={{
            display: "flex",
            justifyContent: "center",
          }}>
            <WaitlistForm />
          </div>

          <a
            href="#science"
            style={{
              fontFamily: sans,
              fontSize: 13,
              letterSpacing: "0.02em",
              color: MUTED,
              textDecoration: "none",
              display: "inline-block",
              marginTop: 24,
            }}
          >
            See the science &rarr;
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER (cream bg)
          ══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        background: BG_CREAM,
        borderTop: `1px solid ${BORDER_LIGHT}`,
      }}>
        <div style={{
          ...contentWrap,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 32,
          paddingBottom: 32,
        }}>
          {/* Logo — natural color */}
          <img
            src="/images/peaq_logo_transparent.png"
            alt="Peaq Health"
            style={{
              height: 24,
              width: "auto",
              opacity: 0.5,
            }}
          />

          {/* Disclaimer */}
          <p style={{
            fontFamily: sans,
            fontSize: 11,
            color: MUTED,
            lineHeight: 1.7,
            maxWidth: 400,
            margin: 0,
            textAlign: "right",
          }}>
            For informational purposes only. Not a medical device.
            Not intended to diagnose, treat, cure, or prevent any disease.
          </p>
        </div>
      </footer>
    </div>
  )
}

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

      {/* Logo — fixed, outside content flow */}
      <div className="fade-up" style={{
        position: "fixed",
        top: 32,
        left: "10%",
        zIndex: 100,
        animationDelay: "0ms",
      }}>
        <LogoSvg size={80} color={INK} />
      </div>

      <section className="hero-grid" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0,
        alignItems: "stretch",
        minHeight: "100vh",
        overflow: "hidden",
      }}>
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

        {/* Right — phone mockup, fills column, bleeds top/bottom */}
        <div className="fade-up hero-mockup" style={{
          position: "relative",
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          animationDelay: "400ms",
        }}>
          <img
            src="/images/dashboard-preview.png"
            alt="Peaq Health dashboard"
            style={{
              height: "110%",
              width: "auto",
              maxWidth: "none",
              display: "block",
              marginRight: -20,
              filter: "drop-shadow(-8px 0 40px rgba(20,20,16,0.12))",
            }}
          />
        </div>

      </section>

      <hr style={rule} />

      {/* ══ SECTIONS 2 + 4 — Interactive panels + science (shared state) ═══ */}
      <LandingPanelsAndScience />

      <hr style={rule} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — CROSS-PANEL INSIGHT
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ ...wrap, paddingTop: 96, paddingBottom: 96 }}>
        <p style={eyebrow}>What Peaq reveals</p>

        {/* Quote card 1 — Oral → Blood (nitrate-reducers + HRV) */}
        <div style={{
          borderLeft: `3px solid ${SLEEP}`,
          padding: "32px 40px",
          background: INK_04,
          borderRadius: "0 8px 8px 0",
          maxWidth: 720,
          marginBottom: 24,
        }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: ORAL, padding: "3px 8px", border: `1px solid ${ORAL}30`, borderRadius: 3 }}>Oral</span>
            <span style={{ fontFamily: sans, fontSize: 10, color: INK_20 }}>{"\u2192"}</span>
            <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: SLEEP, padding: "3px 8px", border: `1px solid ${SLEEP}30`, borderRadius: 3 }}>Sleep</span>
          </div>
          <p style={{
            fontFamily: serif, fontSize: 22, fontWeight: 400,
            lineHeight: 1.6, color: INK, margin: "0 0 20px",
          }}>
            &ldquo;Your oral nitrate-reducing bacteria are at 13% — below
            the 20% threshold. Your HRV dropped to 27ms this week. These
            two signals share a pathway: the same bacteria that convert
            dietary nitrate to nitric oxide also regulate cardiovascular
            recovery during sleep.&rdquo;
          </p>
          <p style={{ fontFamily: sans, fontSize: 12, fontStyle: "italic", color: INK_40, margin: 0 }}>
            — From a real Peaq weekly snapshot
          </p>
        </div>

        {/* Quote card 2 — Sleep → Oral (OSA taxa + SpO₂) */}
        <div style={{
          borderLeft: `3px solid ${ORAL}`,
          padding: "32px 40px",
          background: INK_04,
          borderRadius: "0 8px 8px 0",
          maxWidth: 720,
        }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: SLEEP, padding: "3px 8px", border: `1px solid ${SLEEP}30`, borderRadius: 3 }}>Sleep</span>
            <span style={{ fontFamily: sans, fontSize: 10, color: INK_20 }}>{"\u2192"}</span>
            <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: ORAL, padding: "3px 8px", border: `1px solid ${ORAL}30`, borderRadius: 3 }}>Oral</span>
          </div>
          <p style={{
            fontFamily: serif, fontSize: 22, fontWeight: 400,
            lineHeight: 1.6, color: INK, margin: "0 0 20px",
          }}>
            &ldquo;Your OSA-associated taxa are at 8.2% — elevated. Your
            wearable shows SpO{"\u2082"} dipping to 91% three nights this week.
            The microbiome is flagging the same risk your wearable is
            measuring: Prevotella and Fusobacterium are enriched in the
            upper airway of sleep apnea patients.&rdquo;
          </p>
          <p style={{ fontFamily: sans, fontSize: 12, fontStyle: "italic", color: INK_40, margin: 0 }}>
            — From a real Peaq cross-panel signal
          </p>
        </div>

        {/* Stat blocks */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 48,
          marginTop: 48,
          maxWidth: 680,
        }}>
          <div>
            <p style={{ fontFamily: serif, fontSize: 48, fontWeight: 400, color: GOLD, margin: "0 0 4px", lineHeight: 1 }}>13%</p>
            <p style={{ fontFamily: sans, fontSize: 13, color: INK_60, lineHeight: 1.6, margin: "0 0 8px" }}>nitrate reducers</p>
            <p style={{ fontFamily: sans, fontSize: 12, color: INK_40, margin: 0 }}>healthy threshold: {"\u2265"}20%</p>
          </div>
          <div>
            <p style={{ fontFamily: serif, fontSize: 48, fontWeight: 400, color: GOLD, margin: "0 0 4px", lineHeight: 1 }}>27ms</p>
            <p style={{ fontFamily: sans, fontSize: 13, color: INK_60, lineHeight: 1.6, margin: "0 0 8px" }}>HRV this week</p>
            <p style={{ fontFamily: sans, fontSize: 12, color: INK_40, margin: 0 }}>population avg: 45ms</p>
          </div>
          <div>
            <p style={{ fontFamily: serif, fontSize: 48, fontWeight: 400, color: GOLD, margin: "0 0 4px", lineHeight: 1 }}>8.2%</p>
            <p style={{ fontFamily: sans, fontSize: 13, color: INK_60, lineHeight: 1.6, margin: "0 0 8px" }}>OSA-associated taxa</p>
            <p style={{ fontFamily: sans, fontSize: 12, color: INK_40, margin: 0 }}>clinical target: {"<"}2%</p>
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
            { num: "1", title: "Order your kit",          text: "Oral microbiome swab \u2014 16S rRNA sequencing at species-level resolution. Results in 2\u20133 weeks." },
            { num: "2", title: "Upload your labs",        text: "LabCorp, Quest, or any standard bloodwork. 40+ biomarkers tracked." },
            { num: "3", title: "Connect your wearable",   text: "WHOOP or Oura. Syncs nightly. Apple Health coming soon." },
            { num: "4", title: "Get your Peaq score",     text: "A single number \u2014 recalculated as your data updates. With the cross-panel signals that change how you understand your health." },
          ] as const).map(s => (
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
              <div>
                <p style={{
                  fontFamily: sans, fontSize: 15, fontWeight: 500,
                  color: INK, margin: "0 0 6px",
                }}>
                  {s.title}
                </p>
                <p style={{
                  fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.55)",
                  lineHeight: 1.7, margin: 0,
                }}>
                  {s.text}
                </p>
              </div>
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

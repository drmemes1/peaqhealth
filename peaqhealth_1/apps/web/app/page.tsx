import Link from "next/link"
import { LogoSvg } from "./components/logo-svg"

const serif = "'Cormorant Garamond', Georgia, serif"
const body = "var(--font-body, 'Instrument Sans', sans-serif)"

const section: React.CSSProperties = {
  maxWidth: 680,
  margin: "0 auto",
  padding: "0 24px",
}

export default function Home() {
  return (
    <div className="min-h-svh bg-off-white" style={{ color: "var(--ink)" }}>

      {/* ─── SECTION 1: HERO ──────────────────────────────────────────── */}
      <section style={{ ...section, paddingTop: 64, paddingBottom: 100, minHeight: "85vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="fade-up" style={{ animationDelay: "0ms", marginBottom: 64 }}>
          <LogoSvg size={96} color="var(--ink)" />
        </div>

        <h1
          className="fade-up"
          style={{
            fontFamily: serif,
            fontSize: "clamp(40px, 6vw, 64px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: 820,
            margin: "0 0 8px",
            animationDelay: "80ms",
          }}
        >
          Your mouth is affecting your heart.
          <br />
          <em style={{ fontStyle: "italic", color: "#9A7200" }}>
            We can show you exactly how.
          </em>
        </h1>

        <p
          className="fade-up"
          style={{
            fontFamily: body,
            fontSize: 17,
            fontStyle: "italic",
            lineHeight: 1.75,
            color: "rgba(20, 20, 16, 0.62)",
            maxWidth: 520,
            margin: "28px 0 48px",
            animationDelay: "180ms",
          }}
        >
          <em style={{ fontStyle: "italic" }}>P. gingivalis</em> — a bacterium found in gum
          disease — has been detected inside human coronary artery plaques.
          Peaq is the first platform to connect your oral microbiome,
          bloodwork, and sleep data into a single longitudinal score.
        </p>

        <div
          className="fade-up"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            animationDelay: "280ms",
          }}
        >
          <Link
            href="/signup"
            style={{
              fontFamily: body,
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "0.02em",
              padding: "14px 32px",
              background: "#141410",
              color: "var(--off-white)",
              borderRadius: 4,
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
          <Link
            href="/science"
            style={{
              fontFamily: body,
              fontSize: 15,
              letterSpacing: "0.02em",
              color: "rgba(20, 20, 16, 0.5)",
              textDecoration: "none",
            }}
          >
            See the science →
          </Link>
        </div>

        <p
          className="fade-up"
          style={{
            fontFamily: body,
            fontSize: 12,
            letterSpacing: "0.08em",
            color: "rgba(20, 20, 16, 0.35)",
            marginTop: 64,
            animationDelay: "360ms",
          }}
        >
          Built by Dr. Igor Khabensky (General Dentist)
          and Dr. Paul Leis (Cardiologist)
        </p>
      </section>

      <hr style={{ border: "none", borderTop: "0.5px solid rgba(20, 20, 16, 0.10)", margin: 0 }} />

      {/* ─── SECTION 2: THREE PANELS ──────────────────────────────────── */}
      <section style={{ ...section, paddingTop: 80, paddingBottom: 80 }}>
        <p
          style={{
            fontFamily: body,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--ink-30)",
            margin: "0 0 12px",
          }}
        >
          Three panels. One score.
        </p>

        <p
          style={{
            fontFamily: serif,
            fontSize: "clamp(24px, 3.5vw, 30px)",
            fontWeight: 300,
            lineHeight: 1.3,
            margin: "0 0 40px",
            maxWidth: 520,
          }}
        >
          Most health platforms measure one thing.
          Peaq measures three — and finds the connections between them.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            {
              label: "Oral Microbiome",
              color: "#2D6A4F",
              lines: ["16S rRNA sequencing", "via Zymo Research"],
            },
            {
              label: "Blood",
              color: "#C0392B",
              lines: ["40+ biomarkers", "from any lab"],
            },
            {
              label: "Sleep",
              color: "#4A7FB5",
              lines: ["Nightly wearable", "HRV, deep sleep, SpO\u2082"],
            },
          ].map((p) => (
            <div
              key={p.label}
              style={{
                borderTop: `3px solid ${p.color}`,
                padding: "20px 0 0",
              }}
            >
              <p
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: p.color,
                  margin: "0 0 8px",
                }}
              >
                {p.label}
              </p>
              {p.lines.map((l) => (
                <p
                  key={l}
                  style={{
                    fontFamily: body,
                    fontSize: 13,
                    color: "var(--ink-50)",
                    margin: "2px 0",
                    lineHeight: 1.5,
                  }}
                >
                  {l}
                </p>
              ))}
            </div>
          ))}
        </div>

        <p
          style={{
            fontFamily: serif,
            fontSize: 18,
            fontWeight: 300,
            fontStyle: "italic",
            color: "var(--ink-40)",
            maxWidth: 480,
          }}
        >
          The insight isn&apos;t in any single panel.
          It&apos;s in what they reveal about each other.
        </p>
      </section>

      {/* ─── SECTION 3: THE CROSS-PANEL INSIGHT ──────────────────────── */}
      <section style={{ ...section, paddingTop: 80, paddingBottom: 80 }}>
        <p
          style={{
            fontFamily: body,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--ink-30)",
            margin: "0 0 20px",
          }}
        >
          What Peaq reveals
        </p>

        <div
          style={{
            borderLeft: "3px solid #4A7FB5",
            padding: "24px 28px",
            background: "var(--white)",
            borderRadius: "0 6px 6px 0",
            border: "0.5px solid var(--ink-08)",
            borderLeftWidth: 3,
            borderLeftColor: "#4A7FB5",
          }}
        >
          <p
            style={{
              fontFamily: serif,
              fontSize: 20,
              fontWeight: 300,
              lineHeight: 1.4,
              color: "var(--ink)",
              margin: "0 0 16px",
            }}
          >
            &ldquo;Your oral nitrate-reducing bacteria are at 13% —
            below the 20% threshold. Your HRV dropped to 27ms
            this week. These two signals share a pathway:
            the same bacteria that convert dietary nitrate
            to nitric oxide also regulate cardiovascular
            recovery during sleep.&rdquo;
          </p>
          <p
            style={{
              fontFamily: body,
              fontSize: 12,
              color: "var(--ink-30)",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            — From a real Peaq weekly snapshot
          </p>
        </div>
      </section>

      {/* ─── SECTION 4: THE SCIENCE ──────────────────────────────────── */}
      <section style={{ ...section, paddingTop: 80, paddingBottom: 80 }}>
        <p
          style={{
            fontFamily: body,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--ink-30)",
            margin: "0 0 12px",
          }}
        >
          Grounded in peer-reviewed research
        </p>

        <p
          style={{
            fontFamily: serif,
            fontSize: "clamp(22px, 3vw, 28px)",
            fontWeight: 300,
            lineHeight: 1.3,
            margin: "0 0 36px",
            maxWidth: 520,
          }}
        >
          The oral-systemic connection isn&apos;t new —
          it&apos;s just never been made measurable for individuals.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {[
            {
              source: "Tran et al. 2026, Circulation (AHA)",
              finding:
                "Periodontal disease increases ASCVD risk through bacteremia and chronic inflammation pathways.",
            },
            {
              source: "Kurt et al. 2025, European Heart Journal (n=448,653)",
              finding:
                "Residual inflammatory risk is at least as strong a predictor as residual cholesterol risk.",
            },
            {
              source: "Dominy et al. 2019, Science Advances",
              finding:
                "P. gingivalis detected in Alzheimer\u2019s disease brains.",
            },
          ].map((c) => (
            <div key={c.source}>
              <p
                style={{
                  fontFamily: body,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--ink)",
                  margin: "0 0 4px",
                }}
              >
                {c.source}
              </p>
              <p
                style={{
                  fontFamily: body,
                  fontSize: 14,
                  color: "var(--ink-50)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {c.finding}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/science"
          style={{
            fontFamily: body,
            fontSize: 13,
            color: "var(--ink-40)",
            textDecoration: "none",
            display: "inline-block",
            marginTop: 28,
          }}
        >
          View full science →
        </Link>
      </section>

      {/* ─── SECTION 5: HOW IT WORKS ─────────────────────────────────── */}
      <section style={{ ...section, paddingTop: 80, paddingBottom: 80 }}>
        <p
          style={{
            fontFamily: body,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--ink-30)",
            margin: "0 0 36px",
          }}
        >
          How it works
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {[
            {
              num: "1",
              title: "Order your kit",
              text: "Oral microbiome swab — 16S rRNA sequencing via Zymo Research. Results in 2-3 weeks.",
            },
            {
              num: "2",
              title: "Upload your labs",
              text: "LabCorp, Quest, or any standard bloodwork. 40+ biomarkers tracked.",
            },
            {
              num: "3",
              title: "Connect your wearable",
              text: "WHOOP or Oura. Syncs nightly. Apple Health coming soon.",
            },
            {
              num: "4",
              title: "Get your Peaq score",
              text: "A single number — recalculated as your data updates. With the cross-panel signals that change how you understand your health.",
            },
          ].map((s) => (
            <div
              key={s.num}
              style={{ display: "flex", gap: 20, alignItems: "flex-start" }}
            >
              <span
                style={{
                  fontFamily: serif,
                  fontSize: 28,
                  fontWeight: 300,
                  color: "var(--ink-20)",
                  lineHeight: 1,
                  flexShrink: 0,
                  width: 28,
                }}
              >
                {s.num}
              </span>
              <div>
                <p
                  style={{
                    fontFamily: body,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--ink)",
                    margin: "0 0 4px",
                  }}
                >
                  {s.title}
                </p>
                <p
                  style={{
                    fontFamily: body,
                    fontSize: 14,
                    color: "var(--ink-50)",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {s.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SECTION 6: BUILT BY CLINICIANS ──────────────────────────── */}
      <section style={{ ...section, paddingTop: 80, paddingBottom: 80 }}>
        <p
          style={{
            fontFamily: body,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--ink-30)",
            margin: "0 0 28px",
          }}
        >
          Built by clinicians, not algorithms
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 28,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: body,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--ink)",
                margin: "0 0 2px",
              }}
            >
              Dr. Igor Khabensky
            </p>
            <p
              style={{
                fontFamily: body,
                fontSize: 12,
                color: "var(--ink-40)",
                margin: 0,
              }}
            >
              General Dentist
            </p>
          </div>
          <div>
            <p
              style={{
                fontFamily: body,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--ink)",
                margin: "0 0 2px",
              }}
            >
              Dr. Paul Leis
            </p>
            <p
              style={{
                fontFamily: body,
                fontSize: 12,
                color: "var(--ink-40)",
                margin: 0,
              }}
            >
              Cardiologist
            </p>
          </div>
        </div>

        <p
          style={{
            fontFamily: serif,
            fontSize: 18,
            fontWeight: 300,
            fontStyle: "italic",
            lineHeight: 1.5,
            color: "var(--ink-50)",
            maxWidth: 520,
          }}
        >
          &ldquo;We built Peaq because we kept seeing the same
          pattern — oral disease showing up in cardiovascular
          risk, sleep disruption compounding inflammation.
          No platform was connecting these dots.&rdquo;
        </p>
      </section>

      {/* ─── SECTION 7: FINAL CTA ────────────────────────────────────── */}
      <section
        style={{
          ...section,
          paddingTop: 80,
          paddingBottom: 80,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: serif,
            fontSize: "clamp(24px, 3.5vw, 32px)",
            fontWeight: 300,
            lineHeight: 1.3,
            margin: "0 0 32px",
          }}
        >
          Ready to measure what others miss?
        </p>

        <Link
          href="/signup"
          style={{
            fontFamily: body,
            fontSize: 15,
            fontWeight: 500,
            padding: "14px 36px",
            background: "var(--ink)",
            color: "var(--off-white)",
            borderRadius: 6,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Get started
        </Link>

        <p
          style={{
            fontFamily: body,
            fontSize: 11,
            color: "var(--ink-20)",
            marginTop: 24,
            lineHeight: 1.6,
            maxWidth: 400,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          For informational purposes only. Not a medical device.
          Not intended to diagnose, treat, cure, or prevent disease.
        </p>
      </section>
    </div>
  )
}

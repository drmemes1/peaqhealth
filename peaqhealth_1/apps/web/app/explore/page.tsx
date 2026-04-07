"use client"

import { Nav } from "../components/nav"
import { FindingsExplorer } from "./findings-explorer"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export default function ExplorePage() {
  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — HERO
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ textAlign: "center", padding: "88px 0 56px" }}>
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "2px",
            textTransform: "uppercase", color: "#9A7200",
            display: "block", marginBottom: 20,
          }}>
            CDC NHANES Study &middot; 9,660 Americans
          </span>
          <h1 style={{
            fontFamily: serif, fontSize: 52, fontWeight: 400,
            color: "#141410", lineHeight: 1.15,
            margin: "0 0 20px",
          }}>
            Your mouth bacteria<br />show up in your blood.
          </h1>
          <p style={{
            fontFamily: sans, fontSize: 15, color: "rgba(20,20,16,0.5)",
            lineHeight: 1.7, maxWidth: 480, margin: "0 auto",
          }}>
            We ran the CDC&rsquo;s national oral microbiome dataset against real blood
            markers. Specific bacteria showed consistent signals across thousands of
            Americans. Generic diversity scores alone showed none.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — STAT CARDS
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="stat-cards" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12, marginBottom: 64, maxWidth: 640, marginLeft: "auto", marginRight: "auto",
        }}>
          {[
            { num: "9,848", label: "People with oral + blood data", sub: null },
            { num: "28", label: "Real bacteria\u2013blood connections found", sub: null },
            { num: "0", label: "Connections found using diversity score alone", sub: null },
          ].map((c, i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: 10,
              padding: "22px 20px",
              border: "0.5px solid rgba(20,20,16,0.08)",
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: serif, fontSize: 36, fontWeight: 300,
                color: i === 2 ? "rgba(20,20,16,0.25)" : "#141410",
                lineHeight: 1, marginBottom: 8,
              }}>
                {c.num}
              </div>
              <div style={{
                fontFamily: sans, fontSize: 12,
                color: "rgba(20,20,16,0.45)", lineHeight: 1.4,
              }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — FINDINGS (client component)
            ═══════════════════════════════════════════════════════════════════ */}
        <FindingsExplorer />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 — METHODOLOGY
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          borderTop: "0.5px solid rgba(20,20,16,0.08)",
          paddingTop: 48, paddingBottom: 80,
        }}>
          <span style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "2px",
            textTransform: "uppercase", color: "#9A7200",
            display: "block", marginBottom: 24,
          }}>
            Methodology
          </span>

          <div className="method-cols" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 32,
          }}>
            {[
              {
                title: "The study",
                body: "CDC NHANES 2009\u20132012 sequenced the mouth bacteria of 9,660 Americans using 16S rRNA sequencing. Largest nationally representative oral microbiome study in the US.",
              },
              {
                title: "Our analysis",
                body: "We linked oral microbiome data to blood marker files for 9,848 participants. We tested correlations between pre-specified bacteria and blood markers across inflammation, lipids, glucose, and blood pressure.",
              },
              {
                title: "Honest framing",
                body: "These are population associations, not individual predictions. Effect sizes are small (r=0.03\u20130.09). Your Zymo kit uses a swab; NHANES used oral rinse. Both use the same sequencing technology. Comparisons are directionally accurate.",
              },
            ].map(c => (
              <div key={c.title}>
                <div style={{
                  fontFamily: sans, fontSize: 11, fontWeight: 600,
                  color: "#141410", marginBottom: 8,
                  letterSpacing: "0.3px",
                }}>
                  {c.title}
                </div>
                <p style={{
                  fontFamily: sans, fontSize: 12,
                  color: "rgba(20,20,16,0.45)", lineHeight: 1.65,
                  margin: 0,
                }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          <p style={{
            fontFamily: sans, fontSize: 11,
            color: "rgba(20,20,16,0.3)", lineHeight: 1.6,
            marginTop: 32, paddingTop: 20,
            borderTop: "0.5px solid rgba(20,20,16,0.06)",
          }}>
            Analysis: Peaq Health, April 2026 &middot; Dataset: NHANES 2009&ndash;2012 &middot;
            Spearman rank correlations on log-transformed genus relative abundances
          </p>
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          .stat-cards { grid-template-columns: 1fr !important; max-width: 280px !important; }
          main h1 { font-size: 36px !important; }
        }
        @media (max-width: 768px) {
          .method-cols { grid-template-columns: 1fr !important; gap: 20px !important; }
          .card-grid { grid-template-columns: 1fr !important; }
        }
        .explore-card:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}

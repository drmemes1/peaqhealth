"use client"

import { Nav } from "../components/nav"
import { FindingsExplorer } from "./findings-explorer"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "-apple-system, BlinkMacSystemFont, sans-serif"

export default function ExplorePage() {
  return (
    <div style={{ background: "#F6F4EF", minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — HERO
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ textAlign: "center", padding: "80px 0 48px" }}>
          <span style={{
            fontFamily: sans, fontSize: 10, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#C49A3C", display: "block", marginBottom: 16,
          }}>
            CDC NHANES Study · 9,660 Americans
          </span>
          <h1 style={{
            fontFamily: serif, fontSize: 44, fontWeight: 300,
            color: "#1A1917", lineHeight: 1.15, margin: "0 0 16px",
          }}>
            What your mouth bacteria<br />predict about your blood
          </h1>
          <p style={{
            fontFamily: sans, fontSize: 16, color: "#6B6960",
            lineHeight: 1.6, maxWidth: 520, margin: "0 auto 32px",
          }}>
            We ran every genus of oral bacteria against every blood marker in the
            CDC&rsquo;s national dataset. Specific bacteria showed consistent signals.
            Overall diversity showed none.
          </p>

          {/* Stat cards */}
          <div className="stat-cards" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16, maxWidth: 640, margin: "0 auto",
          }}>
            {[
              { num: "9,848", label: "Americans with oral + blood data", sub: null },
              { num: "28", label: "Significant bacteria\u2013marker pairs", sub: "out of 60 tested" },
              { num: "0", label: "Shannon diversity correlations", sub: "with any blood marker" },
            ].map(c => (
              <div key={c.num} style={{
                background: "#fff", borderRadius: 12,
                padding: "20px 24px", border: "0.5px solid rgba(0,0,0,0.06)",
              }}>
                <div style={{ fontFamily: serif, fontSize: 32, color: "#1A1917", lineHeight: 1, marginBottom: 6 }}>{c.num}</div>
                <div style={{ fontFamily: sans, fontSize: 12, color: "#6B6960", lineHeight: 1.4 }}>{c.label}</div>
                {c.sub && <div style={{ fontFamily: sans, fontSize: 11, color: "#9E9C93", marginTop: 2 }}>{c.sub}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — INTERACTIVE FINDINGS
            ═══════════════════════════════════════════════════════════════════ */}
        <FindingsExplorer />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — METHODOLOGY
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: "#fff", borderRadius: 16,
          padding: 32, marginBottom: 80,
        }}>
          <span style={{ fontFamily: sans, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#C49A3C", display: "block", marginBottom: 20 }}>
            Methodology
          </span>

          <div className="method-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[
              { title: "The study", body: "The CDC\u2019s National Health and Nutrition Examination Survey (NHANES) 2009\u20132012 sequenced the mouth bacteria of 9,660 Americans using 16S rRNA DNA sequencing. It is the largest nationally representative oral microbiome study in the US. The full genus-level data was publicly released in November 2024." },
              { title: "Our analysis", body: "We linked the oral microbiome data to NHANES blood marker files for 9,848 participants with both datasets. We tested correlations between 10 pre-specified bacterial genera and 7 blood marker categories \u2014 inflammation, lipids, glucose, blood pressure, and HbA1c. This specific analysis has not been previously published." },
              { title: "Honest framing", body: "NHANES used oral rinse collection; your Zymo kit uses a swab. Both use the same sequencing technology. Comparisons are directionally accurate. NHANES data is genus-level only \u2014 species-level detail was not possible due to NCHS policy. Effect sizes are small (r\u00a0=\u00a00.03\u20130.09). These are population associations, not individual predictors." },
            ].map(c => (
              <div key={c.title}>
                <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: "#1A1917", marginBottom: 8 }}>{c.title}</div>
                <p style={{ fontFamily: sans, fontSize: 12, color: "#6B6960", lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>

          <p style={{
            fontFamily: sans, fontSize: 11, color: "#9E9C93",
            lineHeight: 1.6, marginTop: 24, paddingTop: 16,
            borderTop: "0.5px solid rgba(0,0,0,0.06)",
          }}>
            Analysis: Peaq Health, April 2026 &middot; Dataset: NHANES 2009&ndash;2012, genus-level
            16S rRNA V4 sequencing (DADA2-RB pipeline) linked to NHANES laboratory files &middot;
            Spearman rank correlations on log-transformed genus relative abundances &middot;
            * p&lt;0.05 ** p&lt;0.01 *** p&lt;0.001
          </p>
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          .stat-cards { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .method-cols { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
    </div>
  )
}

"use client"

import { useState } from "react"
import { AuthLayout } from "../components/auth-layout"

/* ───────────────────────── constants ───────────────────────── */

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "-apple-system, BlinkMacSystemFont, sans-serif"

const BLOOD = "#A32D2D"
const SLEEP = "#185FA5"
const ORAL = "#3B6D11"

/* ───────────────────────── citations ───────────────────────── */

const citations: Record<number, { authors: string; title: string; journal: string; year: string; n?: string }> = {
  1:  { authors: "Xie L, et al.", title: "Sleep drives metabolite clearance from the adult brain", journal: "Science", year: "2013" },
  2:  { authors: "Thayer JF, et al.", title: "The relationship of autonomic imbalance, heart rate variability and cardiovascular disease risk factors", journal: "International Journal of Cardiology", year: "2010" },
  3:  { authors: "Benjafield AV, et al.", title: "Estimation of the global prevalence and burden of obstructive sleep apnoea", journal: "Lancet Respiratory Medicine", year: "2019", n: "936 million" },
  4:  { authors: "Walker MP, Stickgold R.", title: "Sleep, memory, and plasticity", journal: "Annual Review of Psychology", year: "2006" },
  5:  { authors: "Buysse DJ, et al.", title: "The Pittsburgh Sleep Quality Index", journal: "Psychiatry Research", year: "1989" },
  6:  { authors: "Ridker PM, et al.", title: "Rosuvastatin to prevent vascular events in men and women with elevated C-reactive protein (Jupiter)", journal: "NEJM", year: "2008", n: "17,802" },
  7:  { authors: "Sniderman AD, et al.", title: "ApoB vs LDL-C — which better predicts cardiovascular risk", journal: "JAMA Cardiology", year: "2019" },
  8:  { authors: "Forrest KY, Stuhldreher WL.", title: "Prevalence and correlates of vitamin D deficiency in US adults", journal: "Nutrition Research", year: "2011", n: "4,495" },
  9:  { authors: "Millan J, et al.", title: "Lipoprotein ratios: physiological significance and clinical usefulness in cardiovascular prevention", journal: "Vascular Health and Risk Management", year: "2009" },
  10: { authors: "Selvin E, et al.", title: "Glycated hemoglobin, diabetes, and cardiovascular risk in nondiabetic adults", journal: "NEJM", year: "2010", n: "11,092" },
  11: { authors: "Tsimikas S.", title: "A test in context: lipoprotein(a)", journal: "JACC", year: "2017" },
  12: { authors: "Austin MA, et al.", title: "Hypertriglyceridemia as a cardiovascular risk factor", journal: "American Journal of Cardiology", year: "1998" },
  13: { authors: "Belstrøm D, et al.", title: "Microbial diversity in saliva and oral health", journal: "Journal of Oral Microbiology", year: "2014" },
  14: { authors: "Petersson J, et al.", title: "Gastroprotective and blood pressure lowering effects of dietary nitrate", journal: "Free Radical Biology & Medicine", year: "2009" },
  15: { authors: "Kapil V, et al.", title: "Dietary nitrate provides sustained blood pressure lowering in hypertension", journal: "Hypertension", year: "2015", n: "300" },
  16: { authors: "Hussain M, et al.", title: "Oral bacteria in cardiovascular specimens", journal: "Frontiers in Immunology", year: "2023", n: "1,791" },
  17: { authors: "Dominy SS, et al.", title: "Porphyromonas gingivalis in human brain tissue", journal: "Science Advances", year: "2019" },
  18: { authors: "Chen X, et al.", title: "Oral microbiome as a potential biomarker for OSA", journal: "mSystems", year: "2022", n: "156" },
  19: { authors: "Dalton B, et al.", title: "Bidirectional relationship between oral microbiome and sleep quality", journal: "Sleep Medicine", year: "2025", n: "1,139" },
  20: { authors: "Park SY, et al.", title: "Association of toothbrushing with cardiovascular risk", journal: "European Journal of Preventive Cardiology", year: "2019", n: "247,696" },
  21: { authors: "Lee IM, et al.", title: "Effect of physical inactivity on major non-communicable diseases worldwide", journal: "Lancet", year: "2012" },
  22: { authors: "Irwin MR, et al.", title: "Sleep disturbance, sleep duration, and inflammation: a systematic review", journal: "Biological Psychiatry", year: "2016" },
  23: { authors: "Savransky V, et al.", title: "Intermittent hypoxia induces atherosclerosis", journal: "American Journal of Respiratory and Critical Care Medicine", year: "2007" },
  24: { authors: "Hajishengallis G.", title: "Periodontitis: from microbial immune subversion to systemic inflammation", journal: "Nature Reviews Immunology", year: "2015" },
  25: { authors: "Mensah GA, Arnold N, Prabhu SD, Ridker PM, Welty FK.", title: "Inflammation and Cardiovascular Disease: 2025 ACC Scientific Statement", journal: "J Am Coll Cardiol", year: "2025" },
  26: { authors: "Cheung J, et al.", title: "Night-to-night variability in objective sleep measurements and its implications for single-night studies", journal: "Sleep Medicine Reviews", year: "2021" },
  27: { authors: "Wastyk HC, et al.", title: "Gut-microbiota-targeted diets modulate human immune status", journal: "Cell", year: "2021", n: "36" },
  28: { authors: "Vanhatalo A, et al.", title: "Dietary nitrate accelerates post-exercise muscle metabolic recovery and O2 delivery in hypoxia", journal: "The Journal of Physiology", year: "2018" },
  29: { authors: "Adibi JJ, et al.", title: "Multi-domain biomarker composite scoring and prediction of health outcomes in midlife adults", journal: "npj Digital Medicine", year: "2026" },
  30: { authors: "Haghayegh S, et al.", title: "Accuracy of wristband wearables for measuring sleep and SpO2 in clinical settings", journal: "JMIR mHealth and uHealth", year: "2025" },
  31: { authors: "Olivieri F, et al.", title: "Heart rate variability and autonomic nervous system imbalance: Potential biomarkers and detectable hallmarks of aging and inflammaging", journal: "Ageing Research Reviews", year: "2024" },
  32: { authors: "Tegegne BS, et al.", title: "Reference values of heart rate variability from 10-second resting electrocardiograms: the Lifelines Cohort Study", journal: "European Journal of Preventive Cardiology", year: "2020", n: "84,772" },
  33: { authors: "Brozat M, Böckelmann I, Sammito S.", title: "Systematic review on HRV reference values", journal: "Journal of Cardiovascular Development and Disease", year: "2025" },
  34: { authors: "López-Otín C, et al.", title: "Hallmarks of aging: An expanding universe", journal: "Cell", year: "2023" },
}

/* ───────────────────────── helpers ──────────────────────────── */

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 8,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        border: `0.5px solid ${color}59`,
        background: `${color}14`,
        color: `${color}bf`,
        borderRadius: 20,
        padding: "3px 10px",
        fontFamily: sans,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}

function MarkerChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 20,
        background: `${color}14`,
        border: `0.5px solid ${color}59`,
        fontFamily: sans,
        fontSize: 8,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: `${color}bf`,
        fontWeight: 600,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

/* ───────────────────────── main ──────────────────────────── */

interface ScienceClientProps {
  initials: string
  hasWearable: boolean
}

export function ScienceClient({ initials, hasWearable }: ScienceClientProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false)

  return (
    <AuthLayout pageId="science" initials={initials}>
      <div style={{ maxWidth: 720, padding: "32px 24px 80px", margin: "0 auto" }}>

        {/* ── Wearable Banner ── */}
        {!hasWearable && !bannerDismissed && (
          <div
            style={{
              border: "0.5px solid #C49A3C",
              borderRadius: 8,
              padding: "16px 20px",
              background: "rgba(196,154,60,0.04)",
              marginBottom: 32,
              position: "relative",
            }}
          >
            <p style={{ fontFamily: sans, fontSize: 12, color: "#8C8A82", margin: 0, paddingRight: 24 }}>
              You're viewing this without a wearable connected. HRV and sleep stage data requires WHOOP or Oura.
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              style={{
                position: "absolute",
                top: 12,
                right: 14,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                color: "#8C8A82",
                padding: 0,
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>
        )}

        {/* ════════════════════ Hallmark #11 — Inflammaging ════════════════════ */}
        <section style={{ marginBottom: 48 }}>
          <Badge label="Hallmark #11" color={BLOOD} />
          <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: "#1a1a18", margin: "12px 0 12px" }}>
            Inflammaging
          </h2>
          <p style={{ fontFamily: sans, fontSize: 13, color: "#555", lineHeight: 1.7, maxWidth: 640, margin: "0 0 0" }}>
            Chronic low-grade inflammation that accelerates biological aging. Unlike acute inflammation (which heals), inflammaging is persistent, systemic, and clinically silent until organ damage is detectable. It drives atherosclerosis, neurodegeneration, and metabolic dysfunction.
          </p>
          <p style={{ fontFamily: sans, fontSize: 9, color: "#bbb", fontStyle: "italic", marginTop: 8, marginBottom: 0 }}>
            Source: Franceschi et al., Nature Reviews Endocrinology, 2018
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            <MarkerChip label="hs-CRP" color={BLOOD} />
            <MarkerChip label="Deep Sleep" color={SLEEP} />
            <MarkerChip label="Periodontal Pathogens" color={ORAL} />
          </div>
        </section>

        {/* ════════════════════ Hallmark #12 — Dysbiosis ════════════════════ */}
        <section style={{ marginBottom: 48 }}>
          <Badge label="Hallmark #12" color={ORAL} />
          <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: "#1a1a18", margin: "12px 0 12px" }}>
            Dysbiosis
          </h2>
          <p style={{ fontFamily: sans, fontSize: 13, color: "#555", lineHeight: 1.7, maxWidth: 640, margin: "0 0 0" }}>
            Microbial imbalance in the oral cavity that disrupts systemic immune regulation. The mouth is the gateway to the bloodstream — periodontal bacteria are found in coronary plaques, and depleted nitrate-reducing species impair vascular function.
          </p>
          <p style={{ fontFamily: sans, fontSize: 9, color: "#bbb", fontStyle: "italic", marginTop: 8, marginBottom: 0 }}>
            Source: Hajishengallis &amp; Chavakis, Nature Reviews Immunology, 2021
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            <MarkerChip label="Shannon Diversity" color={ORAL} />
            <MarkerChip label="Nitrate Reducers" color={ORAL} />
            <MarkerChip label="hs-CRP" color={BLOOD} />
          </div>
        </section>

        {/* ════════════════════ ANS Imbalance ════════════════════ */}
        <section style={{ marginBottom: 48 }}>
          <Badge label="ANS Imbalance" color={SLEEP} />
          <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: "#1a1a18", margin: "12px 0 12px" }}>
            Autonomic Nervous System Imbalance
          </h2>
          <p style={{ fontFamily: sans, fontSize: 13, color: "#555", lineHeight: 1.7, maxWidth: 640, margin: "0 0 0" }}>
            Disrupted balance between sympathetic (fight-or-flight) and parasympathetic (rest-and-digest) branches. Low HRV during sleep is the most accessible biomarker for ANS dysfunction and predicts cardiovascular mortality independently.
          </p>
          <p style={{ fontFamily: sans, fontSize: 9, color: "#bbb", fontStyle: "italic", marginTop: 8, marginBottom: 0 }}>
            Source: Shaffer &amp; Ginsberg, Frontiers in Public Health, 2017
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            <MarkerChip label="HRV" color={SLEEP} />
            <MarkerChip label="Sleep Efficiency" color={SLEEP} />
            <MarkerChip label="SpO&#x2082;" color={SLEEP} />
          </div>
        </section>

        {/* ════════════════════ References ════════════════════ */}
        <div style={{ borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 24, marginTop: 40 }}>
          <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 400, color: "#1a1a18", margin: "0 0 16px" }}>
            References
          </h2>
          {Object.entries(citations).map(([num, c]) => (
            <p
              key={num}
              style={{
                fontFamily: sans,
                fontSize: 11,
                color: "#bbb",
                lineHeight: 1.6,
                marginBottom: 6,
                marginTop: 0,
              }}
            >
              <span style={{ color: "#1a1a18" }}>[{num}]</span>{" "}
              {c.authors} <em>{c.title}.</em> {c.journal}. {c.year}.{c.n ? ` n=${c.n}.` : ""}
            </p>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}

"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { LogoSvg } from "../components/logo-svg";

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
  17: { authors: "Dominy SS, et al.", title: "Porphyromonas gingivalis in Alzheimer's disease brains", journal: "Science Advances", year: "2019" },
  18: { authors: "Chen X, et al.", title: "Oral microbiome as a potential biomarker for OSA", journal: "mSystems", year: "2022", n: "156" },
  19: { authors: "Dalton B, et al.", title: "Bidirectional relationship between oral microbiome and sleep quality", journal: "Sleep Medicine", year: "2025", n: "1,139" },
  20: { authors: "Park SY, et al.", title: "Association of toothbrushing with cardiovascular risk", journal: "European Journal of Preventive Cardiology", year: "2019", n: "247,696" },
  21: { authors: "Lee IM, et al.", title: "Effect of physical inactivity on major non-communicable diseases worldwide", journal: "Lancet", year: "2012" },
  22: { authors: "Irwin MR, et al.", title: "Sleep disturbance, sleep duration, and inflammation: a systematic review", journal: "Biological Psychiatry", year: "2016" },
  23: { authors: "Savransky V, et al.", title: "Intermittent hypoxia induces atherosclerosis", journal: "American Journal of Respiratory and Critical Care Medicine", year: "2007" },
  24: { authors: "Hajishengallis G.", title: "Periodontitis: from microbial immune subversion to systemic inflammation", journal: "Nature Reviews Immunology", year: "2015" },
};

/* ───────────────────────── helpers ──────────────────────────── */

function Cite({ n }: { n: number }) {
  const c = citations[n];
  return (
    <span className="cite-wrapper" style={{ position: "relative", display: "inline" }}>
      <sup
        style={{
          color: "var(--gold)",
          fontFamily: "var(--font-body)",
          fontSize: "10px",
          fontWeight: 600,
          cursor: "default",
          marginLeft: "1px",
        }}
      >
        [{n}]
      </sup>
      {c && (
        <span className="cite-tooltip">
          {c.authors} <em>{c.title}.</em> {c.journal}, {c.year}.{c.n ? ` n=${c.n}.` : ""}
        </span>
      )}
    </span>
  );
}

function SectionDivider() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.style.width = "100%"; },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        height: "0.5px",
        background: "var(--ink-12)",
        width: "0%",
        transition: "width 0.8s ease",
        margin: "64px 0",
      }}
    />
  );
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.animationDelay = `${delay}ms`;
          el.classList.add("fade-up");
          obs.unobserve(el);
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div ref={ref} style={{ opacity: 0 }} className={className}>
      {children}
    </div>
  );
}

function StudyCard({
  journal,
  title,
  stat,
  statLabel,
  finding,
  color,
}: {
  journal: string;
  title: string;
  stat: string;
  statLabel: string;
  finding: string;
  color: string;
}) {
  return (
    <FadeUp>
      <div
        style={{
          border: "0.5px solid var(--ink-12)",
          borderRadius: 4,
          padding: "28px 24px",
          background: "var(--white)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color,
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          {journal}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 400,
            color: "var(--ink)",
            lineHeight: 1.3,
            marginBottom: 16,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 36,
            fontWeight: 300,
            color: "var(--gold)",
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          {stat}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--ink-30)",
            marginBottom: 16,
          }}
        >
          {statLabel}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--ink-60)",
            lineHeight: 1.6,
          }}
        >
          {finding}
        </div>
      </div>
    </FadeUp>
  );
}

/* ───────────────────────── main page ───────────────────────── */

export default function SciencePage() {
  /* scroll-reveal for all FadeUp elements handled inline */

  const panelBars = [
    { label: "Sleep", pts: 28, color: "var(--sleep-c)", pct: 28 },
    { label: "Blood", pts: 28, color: "var(--blood-c)", pct: 28 },
    { label: "Oral microbiome", pts: 25, color: "var(--oral-c)", pct: 25 },
    { label: "Lifestyle", pts: 10, color: "var(--gold)", pct: 10 },
  ];

  const scoreCategories = [
    { range: "85\u2013100", label: "Optimal", desc: "Peak condition." },
    { range: "65\u201384", label: "Good", desc: "Strong foundation. Key levers identified." },
    { range: "45\u201364", label: "Moderate", desc: "Meaningful room to improve." },
    { range: "0\u201344", label: "Attention", desc: "Your body is asking for attention." },
  ];

  const freshnessRows = [
    { label: "Fresh", window: "0\u20136 months", effect: "Full panel score" },
    { label: "Aging", window: "6\u20139 months", effect: "Soft warning, score maintained" },
    { label: "Stale", window: "9\u201312 months", effect: "Strong warning, retest recommended" },
    { label: "Expired", window: ">12 months", effect: "Panel locked, 0 pts" },
  ];

  const doSay = [
    "\u201ChsCRP below 0.5 mg/L is associated with lower cardiovascular risk in population studies.\u201D",
    "\u201CPeriodontal pathogens have been directly detected in coronary plaques in autopsy studies.\u201D",
    "\u201COral microbiome composition predicts OSA with AUC 91.9% in Chen et al. 2022.\u201D",
    "\u201CYour Peaq Score reflects the current state of evidence on these markers.\u201D",
  ];

  const dontSay = [
    "\u201CYour Peaq Score predicts your risk of any specific disease or outcome.\u201D",
    "\u201CImproving your Peaq Score will extend your life.\u201D",
    "\u201CThe Peaq Score is a validated clinical diagnostic tool.\u201D",
    "\u201CYou should make medical decisions based on your Peaq Score without consulting a doctor.\u201D",
  ];

  return (
    <>
      {/* ── Minimal nav ─────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b bg-off-white/92 backdrop-blur-[12px]"
        style={{ borderBottomColor: "var(--ink-12)" }}
      >
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <Link href="/dashboard">
            <LogoSvg size={44} color="var(--ink)" />
          </Link>
          <div className="flex items-center gap-8">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/shop", label: "Shop" },
              { href: "/science", label: "Science" },
              { href: "/settings", label: "Settings" },
            ].map(({ href, label }) => {
              const active = href === "/science";
              return (
                <Link
                  key={href}
                  href={href}
                  className="font-body text-[11px] uppercase tracking-[0.08em] transition-colors"
                  style={{
                    color: active ? "var(--ink)" : "var(--ink-60)",
                    textDecoration: active ? "underline" : "none",
                    textUnderlineOffset: "4px",
                    textDecorationThickness: "0.5px",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <div style={{ width: 44 }} />
        </div>
      </nav>

      {/* ── Page body ────────────────────────────────────── */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "64px 24px 120px" }}>

        {/* ═══ HERO ═══ */}
        <FadeUp>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--gold)",
              marginBottom: 20,
            }}
          >
            Methodology &middot; Evidence &middot; Transparency
          </div>
        </FadeUp>

        <FadeUp delay={80}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 52,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--ink)",
              marginBottom: 24,
            }}
          >
            The science behind
            <br />
            <em>your score.</em>
          </h1>
        </FadeUp>

        <FadeUp delay={160}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-60)", maxWidth: 540, lineHeight: 1.7, marginBottom: 0 }}>
            Every marker, target, and interaction term in the Peaq Score is grounded in peer-reviewed literature.
            We cite our sources. Here is exactly how your score is built and why.
          </p>
        </FadeUp>

        <SectionDivider />

        {/* ═══ THE VALIDATION QUESTION ═══ */}
        <FadeUp>
          <h2 style={sectionTitleStyle}>Is the Peaq Score validated?</h2>
        </FadeUp>

        <FadeUp delay={60}>
          <div style={bodyTextStyle}>
            <p style={{ marginBottom: 16 }}>
              The honest answer is: not yet — and neither is any other consumer health score.
            </p>
            <p style={{ marginBottom: 16 }}>
              Apple Watch readiness scores, Oura Ring recovery indices, WHOOP strain and recovery, InsideTracker&rsquo;s InnerAge — none of these have been validated in a prospective clinical trial showing their composite score predicts hard outcomes like mortality, hospitalisation, or disease onset. They are proprietary algorithms with no published methodology.
            </p>
            <p style={{ marginBottom: 16 }}>
              Peaq is different in one important way: <strong>we show our work.</strong>
            </p>
            <p style={{ marginBottom: 16 }}>
              Every component of the Peaq Score maps directly to peer-reviewed research. We cite the study, the sample size, and the effect size. When we say hsCRP below 0.5 mg/L is associated with lower cardiovascular risk, we link to the study that shows it. When we say periodontal pathogens are found in coronary plaques, we cite <em>Frontiers in Immunology</em> 2023, n=1,791.
            </p>
            <p>
              The Peaq Score is not a clinical diagnostic tool. It is a precision instrument for tracking the markers that matter most — built on the same evidence your doctor uses, made accessible for daily life.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={120}>
          <div
            style={{
              borderLeft: "2px solid var(--gold)",
              background: "var(--gold-dim)",
              padding: "20px 24px",
              marginTop: 32,
              borderRadius: 2,
            }}
          >
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.5, margin: 0 }}>
              &ldquo;Radical transparency about evidence is more valuable than a black-box algorithm. We will always show our sources.&rdquo;
            </p>
          </div>
        </FadeUp>

        <SectionDivider />

        {/* ═══ SCORE ARCHITECTURE ═══ */}
        <FadeUp>
          <h2 style={sectionTitleStyle}>Score architecture</h2>
        </FadeUp>

        <FadeUp delay={60}>
          <p style={{ ...bodyTextStyle, marginBottom: 32 }}>
            The Peaq Score runs from 0 to 100. It is composed of four panels and a cross-panel interaction pool. Each panel is independently meaningful — you receive partial scores as data becomes available.
          </p>
        </FadeUp>

        {/* Architecture bars */}
        <FadeUp delay={120}>
          <div style={{ marginBottom: 12 }}>
            {panelBars.map((b) => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", width: 120, flexShrink: 0 }}>
                  {b.label}
                </span>
                <div style={{ flex: 1, height: 14, background: "var(--ink-06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${b.pct}%`, height: "100%", background: b.color, borderRadius: 2 }} />
                </div>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", width: 60, textAlign: "right", flexShrink: 0 }}>
                  {b.pts} pts
                </span>
              </div>
            ))}
            {/* Interaction pool */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", width: 120, flexShrink: 0 }}>
                Interactions
              </span>
              <div style={{ flex: 1, height: 14, borderBottom: "1px dashed var(--ink-12)" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", width: 60, textAlign: "right", flexShrink: 0 }}>
                14 pts
              </span>
            </div>
            {/* Total */}
            <div style={{ display: "flex", alignItems: "center", borderTop: "0.5px solid var(--ink-12)", paddingTop: 8 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--ink)", width: 120, flexShrink: 0 }}>
                Total
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--ink)", width: 60, textAlign: "right", flexShrink: 0 }}>
                100 pts
              </span>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={140}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", lineHeight: 1.5, marginBottom: 32 }}>
            Interaction pool starts full. Penalty terms subtract from it when two signals compound.
          </p>
        </FadeUp>

        {/* Score categories */}
        <FadeUp delay={160}>
          <div style={{ marginBottom: 32 }}>
            {scoreCategories.map((cat) => (
              <div
                key={cat.range}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  padding: "10px 0",
                  borderBottom: "0.5px solid var(--ink-06)",
                }}
              >
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--ink)", width: 80, flexShrink: 0 }}>
                  {cat.range}
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--gold)", width: 100, flexShrink: 0 }}>
                  {cat.label}
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)" }}>
                  {cat.desc}
                </span>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Freshness note */}
        <FadeUp delay={180}>
          <p style={{ ...bodyTextStyle, marginBottom: 16 }}>
            <strong>Freshness.</strong> Blood panel results are time-gated. Labs older than 12 months lock the blood panel entirely. We do this because stale data is worse than no data — it creates false confidence.
          </p>
          <div style={{ marginBottom: 0 }}>
            {freshnessRows.map((r) => (
              <div
                key={r.label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  padding: "8px 0",
                  borderBottom: "0.5px solid var(--ink-06)",
                }}
              >
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--ink)", width: 80, flexShrink: 0 }}>
                  {r.label}
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)", width: 120, flexShrink: 0 }}>
                  {r.window}
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)" }}>
                  {r.effect}
                </span>
              </div>
            ))}
          </div>
        </FadeUp>

        <SectionDivider />

        {/* ═══ SLEEP PANEL ═══ */}
        <FadeUp>
          <h2 style={{ ...sectionTitleStyle, borderLeft: "3px solid var(--sleep-c)", paddingLeft: 16 }}>
            Sleep &middot; 28 points
          </h2>
        </FadeUp>

        <FadeUp delay={60}>
          <p style={{ ...bodyTextStyle, marginBottom: 16 }}>
            Sleep is the foundation of the Peaq Score. Poor sleep quality is not merely a performance issue — it is a systemic health signal that drives inflammation, glucose dysregulation, immune suppression, and accelerated biological aging. We weight it accordingly.
          </p>
          <p style={{ ...bodyTextStyle, marginBottom: 32 }}>
            Sleep data requires a connected wearable — Apple Watch, Oura, WHOOP, or Garmin. We use a 7-night minimum to avoid single-night noise. Questionnaire estimates are accepted but capped at 22/28 points — wearable data is more precise.
          </p>
        </FadeUp>

        {/* Sleep image */}
        <FadeUp delay={80}>
          <div style={{ marginBottom: 32, borderRadius: 4, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/peaqsleep.png"
              alt="Peaq Sleep tracking"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </FadeUp>

        <Marker
          num={1}
          title="Deep sleep (slow-wave)"
          target="\u226517% of total sleep time"
          color="var(--sleep-c)"
          body={<>Deep sleep drives growth hormone release, metabolic waste clearance via the glymphatic system, and immune consolidation. Below 15% is associated with elevated Alzheimer&rsquo;s biomarkers.<Cite n={1} /></>}
          evidence="Xie et al., Science 2013. Walker, Why We Sleep, 2017."
        />
        <Marker
          num={2}
          title="HRV (RMSSD)"
          target="\u226550 ms"
          color="var(--sleep-c)"
          body={<>Heart rate variability is the most sensitive non-invasive marker of autonomic nervous system function. Low HRV independently predicts all-cause mortality, cardiovascular events, and poor stress resilience.<Cite n={2} /></>}
          evidence="Thayer et al., Neuroscience & Biobehavioral Reviews 2012. Billman, Frontiers in Physiology 2011."
        />
        <Marker
          num={3}
          title="SpO2 dips"
          target="\u22642 events per night below 90%"
          color="var(--sleep-c)"
          body={<>Overnight oxygen desaturation events are the primary screening signal for obstructive sleep apnea. OSA is diagnosed in 936 million people globally and is massively underdiagnosed. Untreated OSA drives hypertension, atrial fibrillation, and cognitive decline.<Cite n={3} /></>}
          evidence="Benjafield et al., Lancet Respiratory Medicine 2019. n=936 million estimate."
        />
        <Marker
          num={4}
          title="REM sleep"
          target="\u226518% of total sleep time"
          color="var(--sleep-c)"
          body={<>REM sleep governs emotional memory consolidation and psychological resilience. Chronic REM suppression is associated with depression, anxiety, and impaired threat processing.<Cite n={4} /></>}
          evidence="Walker & Stickgold, Annual Review of Psychology 2006."
        />
        <Marker
          num={5}
          title="Sleep efficiency"
          target="\u226585%"
          color="var(--sleep-c)"
          body={<>Time asleep as a fraction of time in bed. Low efficiency (fragmented sleep, long wake-after-sleep-onset) indicates poor sleep architecture regardless of total hours.<Cite n={5} /></>}
          evidence="Buysse et al., Psychiatry Research 1989 — Pittsburgh Sleep Quality Index."
        />

        <SectionDivider />

        {/* ═══ BLOOD PANEL ═══ */}
        <FadeUp>
          <h2 style={{ ...sectionTitleStyle, borderLeft: "3px solid var(--blood-c)", paddingLeft: 16 }}>
            Blood &middot; 28 points
          </h2>
        </FadeUp>

        <FadeUp delay={60}>
          <p style={{ ...bodyTextStyle, marginBottom: 16 }}>
            The blood panel captures cardiovascular risk, metabolic health, and systemic inflammation — the three dimensions most predictive of premature mortality in middle-aged adults. We use seven markers, each selected for independent predictive value beyond standard lipid panels.
          </p>
          <p style={{ ...bodyTextStyle, marginBottom: 32 }}>
            Blood data is accepted via PDF upload — Quest, LabCorp, BioReference, Everlywell, and most major labs. Our parser extracts markers automatically.
          </p>
        </FadeUp>

        {/* Featured study: Jupiter Trial */}
        <StudyCard
          journal="New England Journal of Medicine"
          title="Jupiter Trial — Rosuvastatin in patients with elevated CRP"
          stat="n=17,802"
          statLabel="Participants"
          finding="44% reduction in major cardiovascular events in patients with normal LDL but elevated CRP."
          color="var(--blood-c)"
        />
        <div style={{ height: 24 }} />

        <Marker
          num={6}
          title="hsCRP"
          target="<0.5 mg/L"
          color="var(--blood-c)"
          body={<>High-sensitivity C-reactive protein is the benchmark inflammatory marker. Values above 3.0 mg/L confer 2&times; the cardiovascular risk of values below 1.0 mg/L, independent of LDL cholesterol.<Cite n={6} /></>}
          evidence="Ridker et al., NEJM 2008 — Jupiter Trial. n=17,802."
        />
        <Marker
          num={7}
          title="ApoB"
          target="<90 mg/dL"
          color="var(--blood-c)"
          body={<>Apolipoprotein B is the protein that coats every atherogenic particle (LDL, VLDL, IDL, Lp(a)). It is a superior predictor of cardiovascular events compared to LDL-C alone, particularly in people with metabolic syndrome.<Cite n={7} /></>}
          evidence="Sniderman et al., JAMA Cardiology 2019."
        />
        <Marker
          num={8}
          title="Vitamin D"
          target="30\u201360 ng/mL"
          color="var(--blood-c)"
          body={<>Vitamin D deficiency affects ~40% of Americans and is associated with elevated inflammatory cytokines, impaired immune function, depression, and all-cause mortality. The relationship is bidirectional — poor sleep reduces vitamin D synthesis; low vitamin D impairs sleep quality.<Cite n={8} /></>}
          evidence="Forrest & Stuhldreher, Nutrition Research 2011. n=4,495."
        />
        <Marker
          num={9}
          title="LDL:HDL ratio"
          target="<2.0"
          color="var(--blood-c)"
          body={<>The ratio of atherogenic to protective cholesterol particles. A ratio above 3.5 is associated with significantly elevated coronary artery disease risk. HDL&rsquo;s reverse cholesterol transport function makes the ratio more informative than LDL alone.<Cite n={9} /></>}
          evidence="Millan et al., Vascular Health and Risk Management 2009."
        />
        <Marker
          num={10}
          title="HbA1c"
          target="<5.4%"
          color="var(--blood-c)"
          body={<>Glycated haemoglobin reflects average blood glucose over 90 days. Pre-diabetic range (5.7\u20136.4%) confers elevated risk of dementia, kidney disease, neuropathy, and cardiovascular events — often years before diagnosis.<Cite n={10} /></>}
          evidence="Selvin et al., NEJM 2010. n=11,092."
        />
        <Marker
          num={11}
          title="Lp(a)"
          target="<30 mg/dL"
          color="var(--blood-c)"
          body={<>Lipoprotein(a) is a largely genetically-determined atherogenic particle that standard lipid panels miss. Elevated Lp(a) (&gt;50 mg/dL) doubles cardiovascular risk independently. Most people have never had it measured.<Cite n={11} /></>}
          evidence="Tsimikas, JACC 2017."
        />
        <Marker
          num={12}
          title="Triglycerides"
          target="<150 mg/dL"
          color="var(--blood-c)"
          body={<>Fasting triglycerides reflect insulin sensitivity and dietary carbohydrate metabolism. Elevated triglycerides combined with low HDL is the metabolic syndrome pattern most predictive of type 2 diabetes and ASCVD.<Cite n={12} /></>}
          evidence="Austin et al., American Journal of Cardiology 1998."
        />

        <SectionDivider />

        {/* ═══ ORAL MICROBIOME PANEL ═══ */}
        <FadeUp>
          <h2 style={{ ...sectionTitleStyle, borderLeft: "3px solid var(--oral-c)", paddingLeft: 16 }}>
            Oral microbiome &middot; 25 points
          </h2>
        </FadeUp>

        <FadeUp delay={60}>
          <p style={{ ...bodyTextStyle, marginBottom: 16 }}>
            The oral microbiome is the least understood and most underutilised dimension of systemic health. The mouth is not isolated from the rest of the body — it shares blood supply with the heart, lungs, and brain. Dysbiosis in oral bacteria has been directly detected in coronary plaques, cerebrospinal fluid, and colorectal tumours.
          </p>
          <p style={{ ...bodyTextStyle, marginBottom: 16 }}>
            Oral microbiome data comes from Zymo Research 16S rRNA sequencing. A simple at-home swab kit. Results in 10\u201314 days.
          </p>
          <p style={{ ...bodyTextStyle, marginBottom: 32 }}>
            This is the panel nobody else measures. It is also where the most compelling cross-panel interactions originate.
          </p>
        </FadeUp>

        {/* Oral kit image */}
        <FadeUp delay={80}>
          <div style={{ marginBottom: 32, borderRadius: 4, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/oralkit.png"
              alt="Peaq oral microbiome kit"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </FadeUp>

        {/* Featured studies row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <StudyCard
            journal="Frontiers in Immunology"
            title="Oral bacteria in coronary plaques"
            stat="n=1,791"
            statLabel="Patients"
            finding="P. gingivalis directly detected in human coronary artery plaques at autopsy."
            color="var(--oral-c)"
          />
          <StudyCard
            journal="mSystems"
            title="Oral microbiome predicts OSA"
            stat="AUC 91.9%"
            statLabel="Predictive accuracy"
            finding="Oral microbiome composition alone can predict obstructive sleep apnea."
            color="var(--oral-c)"
          />
        </div>

        <Marker
          num={13}
          title="Shannon diversity index"
          target="\u22653.0"
          color="var(--oral-c)"
          body={<>Shannon diversity measures the richness and evenness of microbial species in the oral cavity. Low diversity is the hallmark of dysbiosis — a state where pathogenic species overgrow at the expense of beneficial ones.<Cite n={13} /></>}
          evidence="Belstrøm et al., Journal of Oral Microbiology 2014."
        />
        <Marker
          num={14}
          title="Nitrate-reducing bacteria"
          target="\u22655% of reads"
          color="var(--oral-c)"
          body={<>Neisseria, Rothia, and Veillonella species convert dietary nitrate into nitrite, which is then converted to nitric oxide (NO) in the circulation. NO is a potent vasodilator critical for blood pressure regulation. Antiseptic mouthwash kills these bacteria.<Cite n={14} /><Cite n={15} /></>}
          evidence="Petersson et al., 2009. Kapil et al., Hypertension 2015 — ORIGINS study, n=300."
        />
        <Marker
          num={15}
          title="Periodontal pathogens"
          target="<0.5% of reads"
          color="var(--oral-c)"
          body={<>Porphyromonas gingivalis, Treponema denticola, and Tannerella forsythia are the &ldquo;red complex&rdquo; periodontal pathogens. P. gingivalis has been directly detected in human coronary artery plaques at autopsy.<Cite n={16} /><Cite n={17} /></>}
          evidence="Hussain et al., Frontiers in Immunology 2023, n=1,791. Dominy et al., Science Advances 2019."
        />
        <Marker
          num={16}
          title="OSA-associated taxa"
          target="<1% of reads"
          color="var(--oral-c)"
          body={<>Prevotella and Fusobacterium species are enriched in patients with obstructive sleep apnea. Their abundance is a microbiome-based signal for sleep-disordered breathing. This is the most novel marker in the Peaq Score — and the direct bridge between oral health and sleep quality.<Cite n={18} /><Cite n={19} /></>}
          evidence="Chen et al., mSystems 2022, n=156. Dalton et al., Sleep Medicine 2025, n=1,139."
        />

        <SectionDivider />

        {/* ═══ LIFESTYLE PANEL ═══ */}
        <FadeUp>
          <h2 style={{ ...sectionTitleStyle, borderLeft: "3px solid var(--gold)", paddingLeft: 16 }}>
            Lifestyle &middot; 10 points
          </h2>
        </FadeUp>

        <FadeUp delay={60}>
          <p style={{ ...bodyTextStyle, marginBottom: 32 }}>
            The lifestyle panel is always active from day one — no devices or lab results required. It captures the daily behaviours with the strongest evidence for systemic health outcomes.
          </p>
        </FadeUp>

        {/* Featured study: Park 2019 */}
        <StudyCard
          journal="European Journal of Preventive Cardiology"
          title="Association of toothbrushing with cardiovascular risk"
          stat="n=247,696"
          statLabel="Participants &middot; 10.5-year follow-up"
          finding="Twice-daily brushing with regular dental visits associated with 14% lower cardiovascular disease risk."
          color="var(--gold)"
        />
        <div style={{ height: 24 }} />

        <Marker
          num={17}
          title="Exercise (IPAQ tiers)"
          target="4 points"
          color="var(--gold)"
          body={<>Physical activity is the single most evidence-dense intervention in preventive medicine. Active (\u226575 min vigorous or \u2265150 min moderate/week): 4 pts. Moderate: 2.5 pts. Light: 1.5 pts. Sedentary: 0 pts.<Cite n={21} /></>}
          evidence="Lee et al., Lancet 2012."
        />
        <Marker
          num={18}
          title="Oral hygiene"
          target="3 points"
          color="var(--gold)"
          body={<>Brushing &times;2 + flossing daily: 3 pts. Brushing &times;2 only: 2 pts. Brushing &times;1: 1 pt. Antiseptic mouthwash penalty: &minus;0.5 pts (kills nitrate-reducing bacteria, disrupts NO pathway).<Cite n={20} /></>}
          evidence="Park et al., European Journal of Preventive Cardiology 2019, n=247,696."
        />
        <Marker
          num={19}
          title="Dental visits"
          target="2 points"
          color="var(--gold)"
          body={<>Annual dental visits allow professional debridement of subgingival biofilm — the primary reservoir of periodontal pathogens. \u22651 visit per year: 2 pts. Less frequent: 0 pts.<Cite n={20} /></>}
          evidence="Park et al., 2019."
        />
        <Marker
          num={20}
          title="Smoking"
          target="1 point"
          color="var(--gold)"
          body={<>Current smoking is independently associated with elevated hsCRP, endothelial dysfunction, and periodontal disease severity. It also directly degrades oral microbiome diversity. Non-smoker: 1 pt. Current smoker: 0 pts.</>}
          evidence=""
        />

        <SectionDivider />

        {/* ═══ CROSS-PANEL INTERACTIONS ═══ */}
        <FadeUp>
          <h2 style={{ ...sectionTitleStyle, borderLeft: "3px solid var(--gold)", paddingLeft: 16 }}>
            Cross-panel interactions &middot; 14 point pool
          </h2>
        </FadeUp>

        <FadeUp delay={60}>
          <div style={bodyTextStyle}>
            <p style={{ marginBottom: 16 }}>
              This is what makes the Peaq Score different from any other consumer health product.
            </p>
            <p style={{ marginBottom: 16 }}>
              The interaction pool starts at 14 points. When two signals from different panels compound each other — when the combination is demonstrably worse than either alone — a penalty term fires and subtracts from the pool. The pool floor is zero.
            </p>
            <p style={{ marginBottom: 32 }}>
              This models how biology actually works. Inflammation and poor sleep are not independent risks you simply add together. They amplify each other through shared pathways.
            </p>
          </div>
        </FadeUp>

        {/* Interaction terms */}
        {[
          { id: "I1", title: "Sleep \u00D7 Inflammation", penalty: "up to 5 pts", trigger: "Sleep HRV <40ms AND hsCRP >1.0 mg/L", cite: 22, desc: "Poor sleep elevates CRP. Elevated CRP fragments sleep. The cycle is self-reinforcing." },
          { id: "I2", title: "SpO2 \u00D7 Lipids", penalty: "up to 3 pts", trigger: "SpO2 dips >5/night AND ApoB >100 mg/dL", cite: 23, desc: "Nocturnal hypoxia activates sympathetic nervous system and promotes LDL oxidation." },
          { id: "I3", title: "Dual inflammatory", penalty: "up to 2 pts", trigger: "hsCRP >1.0 mg/L AND ESR elevated", cite: null, desc: "Concurrent elevation indicates systemic, multi-pathway inflammation." },
          { id: "I4", title: "HRV \u00D7 Homocysteine", penalty: "up to 2 pts", trigger: "Low HRV + elevated homocysteine", cite: null, desc: "Autonomic dysfunction compounded by endothelial injury — a specific high-risk cardiovascular phenotype." },
          { id: "I5", title: "Periodontal \u00D7 CRP", penalty: "up to 4 pts", trigger: "Periodontal pathogens >1% AND hsCRP >0.8 mg/L", cite: 24, desc: "The most important interaction term. Periodontal pathogen burden directly elevates systemic CRP via bacteraemia." },
          { id: "I6", title: "OSA taxa \u00D7 SpO2", penalty: "up to 3 pts", trigger: "OSA taxa >2% AND SpO2 dips >3/night", cite: 18, desc: "Convergent signal: the microbiome flags OSA risk, the wearable detects its physiological consequence." },
          { id: "I7", title: "Low nitrate \u00D7 CRP", penalty: "up to 2 pts", trigger: "Nitrate-reducers <3% AND hsCRP >1.0 mg/L", cite: null, desc: "Depleted oral NO pathway + elevated inflammation = dual hit on vascular health." },
          { id: "I8", title: "Low diversity \u00D7 Sleep", penalty: "up to 2 pts", trigger: "Shannon diversity <2.5 AND sleep efficiency <80%", cite: 19, desc: "The bidirectional relationship between oral microbiome and sleep quality." },
        ].map((ix) => (
          <FadeUp key={ix.id}>
            <div
              style={{
                borderLeft: "2px solid var(--gold)",
                padding: "16px 0 16px 20px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {ix.id}
                </span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, color: "var(--ink)" }}>
                  {ix.title}
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)" }}>
                  penalty {ix.penalty}
                </span>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.6, margin: "0 0 6px" }}>
                {ix.desc}{ix.cite && <Cite n={ix.cite} />}
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", margin: 0 }}>
                Fires when: {ix.trigger}
              </p>
            </div>
          </FadeUp>
        ))}

        <SectionDivider />

        {/* ═══ WHAT WE DON'T CLAIM ═══ */}
        <FadeUp>
          <h2 style={sectionTitleStyle}>What Peaq does not claim</h2>
        </FadeUp>

        <FadeUp delay={60}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--oral-c)", fontWeight: 600, marginBottom: 16 }}>
                What we say
              </div>
              {doSay.map((s, i) => (
                <p key={i} style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.6, marginBottom: 12 }}>
                  {s}
                </p>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--blood-c)", fontWeight: 600, marginBottom: 16 }}>
                What we don&rsquo;t say
              </div>
              {dontSay.map((s, i) => (
                <p key={i} style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.6, marginBottom: 12 }}>
                  {s}
                </p>
              ))}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={120}>
          <div style={bodyTextStyle}>
            <p style={{ marginBottom: 16 }}>
              Peaq is a precision tracking tool for people who want to understand their health at a deeper level than standard annual checkups allow. It is built on the same evidence base your doctor uses — made accessible for daily life.
            </p>
            <p>
              We will never claim more than the evidence supports. We will always show our sources. And we will update the score engine as the science evolves.
            </p>
          </div>
        </FadeUp>

        <SectionDivider />

        {/* ═══ REFERENCES ═══ */}
        <FadeUp>
          <h2 style={sectionTitleStyle}>References</h2>
        </FadeUp>

        <FadeUp delay={60}>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {Object.entries(citations).map(([num, c]) => (
              <li
                key={num}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  color: "var(--ink-60)",
                  lineHeight: 1.6,
                  marginBottom: 8,
                  display: "flex",
                  gap: 8,
                }}
              >
                <span style={{ color: "var(--gold)", fontWeight: 600, flexShrink: 0, minWidth: 28 }}>
                  [{num}]
                </span>
                <span>
                  {c.authors} <em>{c.title}.</em> {c.journal}. {c.year}.{c.n ? ` n=${c.n}.` : ""}
                </span>
              </li>
            ))}
          </ol>
        </FadeUp>

        <SectionDivider />

        {/* ═══ FOOTER NOTE ═══ */}
        <FadeUp>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              color: "var(--ink-30)",
              textAlign: "center",
              lineHeight: 1.6,
              maxWidth: 540,
              margin: "0 auto",
            }}
          >
            Peaq Health is not a medical device. The Peaq Score is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a licensed healthcare provider regarding your health. Score engine version 4.0 &middot; Last updated March 2026.
          </p>
        </FadeUp>
      </main>

      {/* ── Tooltip styles ─── */}
      <style jsx global>{`
        .cite-wrapper:hover .cite-tooltip {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }
        .cite-tooltip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: var(--ink);
          color: var(--off-white);
          font-family: var(--font-body);
          font-size: 11px;
          line-height: 1.5;
          padding: 10px 14px;
          border-radius: 3px;
          white-space: normal;
          width: 280px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease;
          z-index: 100;
          font-style: normal;
          font-weight: 400;
        }
        .cite-tooltip::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: var(--ink);
        }
        @media (max-width: 640px) {
          .cite-tooltip {
            left: 0;
            transform: translateY(4px);
            width: 220px;
          }
        }
      `}</style>
    </>
  );
}

/* ───────────────────────── Marker component ────────────────── */

function Marker({
  num,
  title,
  target,
  color,
  body,
  evidence,
}: {
  num: number;
  title: string;
  target: string;
  color: string;
  body: React.ReactNode;
  evidence: string;
}) {
  return (
    <FadeUp>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 10,
              fontWeight: 600,
              color,
              background: `${color}14`,
              padding: "2px 6px",
              borderRadius: 2,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {num}
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, color: "var(--ink)" }}>
            {title}
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)" }}>
            target: {target}
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-60)", lineHeight: 1.7, margin: "0 0 6px" }}>
          {body}
        </p>
        {evidence && (
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-30)", margin: 0, fontStyle: "italic" }}>
            {evidence}
          </p>
        )}
      </div>
    </FadeUp>
  );
}

/* ───────────────────────── shared styles ────────────────────── */

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 28,
  fontWeight: 400,
  color: "var(--ink)",
  marginBottom: 20,
  lineHeight: 1.2,
};

const bodyTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 14,
  color: "var(--ink-60)",
  lineHeight: 1.7,
};

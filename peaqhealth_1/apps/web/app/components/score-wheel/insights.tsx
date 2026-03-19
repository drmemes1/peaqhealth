"use client"
import { useEffect, useRef, useState } from "react"

interface InsightCardProps {
  title: string
  body: string
  ref_: string
  tag: string
  accentColor: string
  tagBg: string
  tagColor: string
  muted?: boolean
  cardIndex: number
}

function InsightCard({ title, body, ref_, tag, accentColor, tagBg, tagColor, muted, cardIndex }: InsightCardProps) {
  const el = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = el.current
    if (!node) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.12 })
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const node = el.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const scrolled = window.innerHeight - rect.top
      const rate = 0.035
      const offset = Math.max(0, scrolled) * rate * (cardIndex % 2 === 0 ? 1 : -0.5)
      node.style.transform = `translateY(${-offset}px)`
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [cardIndex])

  return (
    <div
      ref={el}
      style={{
        background: "white",
        border: "0.5px solid var(--ink-12)",
        borderLeft: `3px solid ${accentColor}`,
        padding: "16px 18px 14px",
        opacity: visible ? (muted ? 0.55 : 1) : 0,
        transition: "opacity 0.55s ease",
      }}
    >
      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 400, color: "var(--ink)", margin: "0 0 7px", lineHeight: 1.3 }}>{title}</p>
      <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12.5, lineHeight: 1.75, color: "var(--ink-60)", margin: "0 0 10px" }}>{body}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", background: tagBg, color: tagColor }}>{tag}</span>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 9.5, color: "var(--ink-30)", fontStyle: "italic" }}>{ref_}</span>
      </div>
    </div>
  )
}

interface InsightsProps {
  sleepConnected: boolean
  hasBlood: boolean
  oralActive: boolean
  sleepHrv?: number
  sleepDeepPct?: number
  sleepEfficiency?: number
  bloodHsCrp?: number
  bloodApoB?: number
  bloodLdl?: number
  bloodVitaminD?: number
  bloodHba1c?: number
  bloodGlucose?: number
  oralPeriodont?: number
  exerciseLevel?: string
  smokingStatus?: string
  stressLevel?: string
  alcoholDrinksPerWeek?: number
  vegServings?: number
  processedFood?: number
}

export function Insights({
  sleepConnected, hasBlood, oralActive,
  sleepHrv, sleepDeepPct, sleepEfficiency,
  bloodHsCrp, bloodApoB, bloodLdl, bloodVitaminD, bloodHba1c, bloodGlucose,
  oralPeriodont,
  exerciseLevel, smokingStatus, stressLevel, alcoholDrinksPerWeek, vegServings, processedFood,
}: InsightsProps) {
  const cards = []
  let idx = 0

  // ── Sleep insights ─────────────────────────────────────────────────────────

  if (sleepConnected && sleepHrv !== undefined && sleepHrv > 0 && sleepHrv < 45) {
    cards.push(
      <InsightCard key="hrv-low" cardIndex={idx++}
        title={`HRV at ${sleepHrv} ms — autonomic recovery is suppressed`}
        body={`Your resting RMSSD sits below the 45 ms threshold associated with robust cardiovascular resilience. Deep sleep${sleepDeepPct ? ` (currently ${sleepDeepPct}%)` : ""} is the primary modifiable driver: slow-wave sleep clears adenosine and resets sympathovagal balance. Consistent bedtimes within ±20 minutes have been shown to raise RMSSD by 5–8 ms over four weeks.`}
        ref_="Dalton et al., 2025 · NIH-AARP (n = 1,139)"
        tag="Sleep · Recovery" accentColor="var(--sleep-c)" tagBg="var(--sleep-bg)" tagColor="var(--sleep-c)"
      />
    )
  }

  if (sleepConnected && sleepHrv !== undefined && sleepHrv >= 60) {
    cards.push(
      <InsightCard key="hrv-good" cardIndex={idx++}
        title={`HRV at ${sleepHrv} ms — strong autonomic baseline`}
        body={`An RMSSD above 60 ms places you in the upper quartile for cardiovascular resilience. This reflects effective parasympathetic tone and rapid stress recovery. Maintaining${sleepDeepPct ? ` your ${sleepDeepPct}% deep sleep` : " consistent deep sleep"} and avoiding late alcohol will protect this advantage.`}
        ref_="Shaffer & Ginsberg, 2017 · Front. Public Health"
        tag="Sleep · Recovery" accentColor="var(--sleep-c)" tagBg="var(--sleep-bg)" tagColor="var(--sleep-c)"
      />
    )
  }

  if (sleepConnected && sleepEfficiency !== undefined && sleepEfficiency > 0 && sleepEfficiency < 80) {
    cards.push(
      <InsightCard key="eff-low" cardIndex={idx++}
        title={`Sleep efficiency at ${sleepEfficiency}% — below the 85% target`}
        body={`Time in bed versus actual sleep is ${sleepEfficiency}%, where ≥85% is considered restorative. Low efficiency increases cortisol AUC by 15–22% the following day and blunts insulin sensitivity. Stimulus-control therapy — reserving bed strictly for sleep — yields a 10–15 percentage-point improvement in 3–4 weeks without medication.`}
        ref_="Morin et al., 2006 · Sleep (n = 462 RCT)"
        tag="Sleep · Efficiency" accentColor="var(--sleep-c)" tagBg="var(--sleep-bg)" tagColor="var(--sleep-c)"
      />
    )
  }

  // ── Blood insights ─────────────────────────────────────────────────────────

  if (hasBlood && bloodHsCrp !== undefined && bloodHsCrp > 0 && bloodHsCrp < 1.0) {
    cards.push(
      <InsightCard key="crp-optimal" cardIndex={idx++}
        title={`hsCRP at ${bloodHsCrp} mg/L — inflammation well controlled`}
        body={`Below 1.0 mg/L is the optimal range for cardiovascular protection. Your inflammatory baseline is genuinely low — the JUPITER trial found that individuals at this level had a 44% lower incidence of major cardiovascular events compared to those above 2.0 mg/L. This is one of the strongest independent predictors you can measure.`}
        ref_="Ridker et al., 2008 · NEJM JUPITER (n = 17,802)"
        tag="Blood · Inflammation" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (hasBlood && bloodHsCrp !== undefined && bloodHsCrp >= 1.0 && bloodHsCrp < 3.0) {
    cards.push(
      <InsightCard key="crp-borderline" cardIndex={idx++}
        title={`hsCRP at ${bloodHsCrp} mg/L — intermediate inflammatory risk`}
        body={`The 1–3 mg/L range is associated with a 2× relative risk of cardiovascular events versus the optimal zone below 1.0 mg/L. Exercise (≥150 min/wk aerobic) reduces hsCRP by 0.3–0.8 mg/L on average. Omega-3 supplementation at 2–4 g/day shows similar effect sizes in meta-analyses of 13 trials.`}
        ref_="Kasapis & Thompson, 2005 · JACC (meta-analysis)"
        tag="Blood · Inflammation" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (hasBlood && bloodHsCrp !== undefined && bloodHsCrp >= 3.0) {
    cards.push(
      <InsightCard key="crp-elevated" cardIndex={idx++}
        title={`hsCRP at ${bloodHsCrp} mg/L — elevated, retest warranted`}
        body={`Above 3.0 mg/L represents high cardiovascular inflammatory risk. This level warrants attention but also context — acute illness, injury, or intense recent exercise can temporarily raise hsCRP. A retest in 2 weeks under normal conditions is recommended before treating this as a chronic baseline.`}
        ref_="Pearson et al., 2003 · AHA/CDC Scientific Statement"
        tag="Blood · Inflammation" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (hasBlood && bloodApoB !== undefined && bloodApoB > 0 && bloodApoB < 80) {
    cards.push(
      <InsightCard key="apob-good" cardIndex={idx++}
        title={`ApoB at ${bloodApoB} mg/dL — atherogenic particle burden low`}
        body={`Below 80 mg/dL is the optimal target for primary prevention. ApoB counts every atherogenic particle (LDL, VLDL, Lp(a)) as a single direct measure — it outperforms LDL-C as a cardiovascular risk predictor, especially in metabolic syndrome and triglyceride-elevated individuals.`}
        ref_="Sniderman et al., 2019 · JAMA Cardiology"
        tag="Blood · Cardiovascular" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (hasBlood && bloodLdl !== undefined && bloodLdl > 130 && bloodApoB !== undefined && bloodApoB > 100) {
    cards.push(
      <InsightCard key="ldl-apob" cardIndex={idx++}
        title={`LDL ${bloodLdl} mg/dL + ApoB ${bloodApoB} mg/dL — lipid pattern warrants attention`}
        body={`When both LDL-C and ApoB are elevated, atherogenic particle load is genuinely increased. The combination predicts event risk more precisely than either marker alone. Dietary saturated fat reduction by 7–10% of total calories lowers LDL-C by 8–15 mg/dL on average; adding 10–25 g/day of soluble fiber adds a further 5–10 mg/dL reduction.`}
        ref_="Grundy et al., 2018 · AHA/ACC Cholesterol Guideline"
        tag="Blood · Lipids" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (hasBlood && bloodVitaminD !== undefined && bloodVitaminD > 0 && bloodVitaminD < 30) {
    cards.push(
      <InsightCard key="vitd-low" cardIndex={idx++}
        title={`Vitamin D at ${bloodVitaminD} ng/mL — below sufficient range`}
        body={`Below 30 ng/mL is considered insufficient; levels under 20 ng/mL are deficient. Vitamin D regulates over 200 genes involved in immune function, insulin sensitivity, and muscle recovery. Supplementation with 2,000–4,000 IU/day typically raises serum 25(OH)D by 10–20 ng/mL over 8–12 weeks.`}
        ref_="Holick et al., 2011 · J. Clin. Endocrinol. Metab."
        tag="Blood · Micronutrients" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (hasBlood && bloodHba1c !== undefined && bloodHba1c > 0 && bloodHba1c >= 5.7 && bloodHba1c < 6.5) {
    cards.push(
      <InsightCard key="hba1c-pre" cardIndex={idx++}
        title={`HbA1c at ${bloodHba1c}% — prediabetic range`}
        body={`Between 5.7% and 6.4% indicates impaired glucose regulation. The Diabetes Prevention Program (n = 3,234) showed that lifestyle intervention — 150 min/week moderate exercise plus 5–7% weight reduction — lowered progression to diabetes by 58% compared to placebo. This is a highly modifiable state.`}
        ref_="Knowler et al., 2002 · NEJM DPP (n = 3,234)"
        tag="Blood · Metabolic" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (hasBlood && bloodGlucose !== undefined && bloodGlucose > 0 && bloodGlucose >= 100 && bloodGlucose < 126) {
    cards.push(
      <InsightCard key="glucose-pre" cardIndex={idx++}
        title={`Fasting glucose at ${bloodGlucose} mg/dL — impaired fasting glucose`}
        body={`100–125 mg/dL is the impaired fasting glucose range. Combining this with ${bloodHba1c !== undefined && bloodHba1c >= 5.7 ? `your HbA1c of ${bloodHba1c}%` : "your other metabolic markers"} narrows the insulin resistance picture. A 10-minute post-meal walk reduces the 2-hour glucose area-under-curve by 22% in multiple controlled trials.`}
        ref_="DiPietro et al., 2013 · Diabetes Care (n = 10 RCT)"
        tag="Blood · Metabolic" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  // ── Oral insights ──────────────────────────────────────────────────────────

  if (oralActive && oralPeriodont !== undefined && oralPeriodont < 0.5) {
    cards.push(
      <InsightCard key="periodont-good" cardIndex={idx++}
        title={`Periodontal burden at ${oralPeriodont}% — cardiovascular protective`}
        body={`Below 0.5% periodontal pathogen burden is genuinely rare and protective. P. gingivalis has been detected directly in coronary atheromatous plaques — the oral-cardiovascular axis is mechanistic, not merely correlational. Your low burden removes a significant hidden inflammatory source.`}
        ref_="Hajishengallis et al., 2023 · Front. Immunol. (n = 1,791)"
        tag="Oral × Blood · Cross-panel" accentColor="var(--gold)" tagBg="var(--gold-dim)" tagColor="var(--gold)"
      />
    )
  }

  if (!oralActive) {
    cards.push(
      <InsightCard key="oral-pending" cardIndex={idx++}
        title="Oral microbiome activates 4 cross-panel interaction terms"
        body="Your oral bacteria directly predict sleep-breathing risk, cardiovascular inflammation, and endogenous nitric oxide production. Nitrate-reducing species (Neisseria, Rothia) convert dietary nitrate into NO — a vasodilator linked to 8–12 mmHg lower systolic BP in carrier-positive individuals."
        ref_="Vanhatalo et al., 2018 · Free Radic. Biol. Med."
        tag="Oral · Pending" accentColor="var(--oral-c)" tagBg="var(--oral-bg)" tagColor="var(--oral-c)" muted
      />
    )
  }

  // ── Lifestyle × cross-panel insights ──────────────────────────────────────

  if (exerciseLevel === "sedentary" && hasBlood && bloodHsCrp !== undefined && bloodHsCrp > 1.5) {
    cards.push(
      <InsightCard key="sedentary-crp" cardIndex={idx++}
        title={`Sedentary pattern amplifying hsCRP (${bloodHsCrp} mg/L)`}
        body={`Physical inactivity is an independent predictor of elevated hsCRP independent of BMI. A 12-week walking program (30 min/day, 5×/week) reduces hsCRP by a mean of 0.6 mg/L — comparable to low-dose statin therapy in metabolically healthy individuals. Your current hsCRP of ${bloodHsCrp} mg/L sits in the range most responsive to exercise intervention.`}
        ref_="Kasapis & Thompson, 2005 · JACC (17 RCTs, n = 1,466)"
        tag="Lifestyle × Blood" accentColor="var(--gold)" tagBg="var(--gold-dim)" tagColor="var(--gold)"
      />
    )
  }

  if (stressLevel === "high" && bloodHsCrp !== undefined && bloodHsCrp > 2) {
    cards.push(
      <InsightCard key="stress-crp" cardIndex={idx++}
        title={`Chronic stress compounding inflammation (hsCRP ${bloodHsCrp} mg/L)`}
        body={`High perceived stress activates the HPA axis, raising cortisol and downstream NF-κB signaling — the primary driver of hsCRP production. Irwin et al. demonstrated that this pathway is bidirectional: elevated hsCRP independently worsens subjective stress and sleep quality, creating a reinforcing loop. Mindfulness-based stress reduction reduces hsCRP by 0.4 mg/L on average after 8 weeks.`}
        ref_="Irwin & Cole, 2016 · Nat. Rev. Immunol."
        tag="Lifestyle × Blood" accentColor="var(--gold)" tagBg="var(--gold-dim)" tagColor="var(--gold)"
      />
    )
  }

  if (stressLevel === "high" && sleepConnected && sleepEfficiency !== undefined && sleepEfficiency < 82) {
    cards.push(
      <InsightCard key="stress-sleep" cardIndex={idx++}
        title={`High stress + ${sleepEfficiency}% sleep efficiency — compounding overnight`}
        body={`Chronic stress elevates nocturnal cortisol, suppressing slow-wave sleep and fragmenting overnight architecture. Your sleep efficiency of ${sleepEfficiency}% is consistent with stress-driven insomnia rather than a primary sleep disorder. Addressing the stress pathway (exercise, structured wind-down) typically improves efficiency by 8–12 percentage points without sleep-specific intervention.`}
        ref_="Vgontzas et al., 2001 · J. Clin. Endocrinol. Metab."
        tag="Lifestyle × Sleep" accentColor="var(--gold)" tagBg="var(--gold-dim)" tagColor="var(--gold)"
      />
    )
  }

  if (smokingStatus === "current" && hasBlood && bloodHsCrp !== undefined) {
    cards.push(
      <InsightCard key="smoking-crp" cardIndex={idx++}
        title={`Smoking driving systemic inflammation — hsCRP ${bloodHsCrp} mg/L`}
        body={`Current smoking raises hsCRP by 0.5–1.5 mg/L above baseline through direct endothelial injury and oxidative activation of inflammatory cascades. Within 3–6 months of cessation, hsCRP returns to non-smoker levels — faster than most pharmaceutical interventions. This is the single highest-impact modifiable driver of your inflammatory and cardiovascular risk.`}
        ref_="Wannamethee et al., 2005 · Eur. Heart J. (n = 4,521)"
        tag="Lifestyle × Blood" accentColor="var(--blood-c)" tagBg="var(--blood-bg)" tagColor="var(--blood-c)"
      />
    )
  }

  if (alcoholDrinksPerWeek !== undefined && alcoholDrinksPerWeek > 10 && sleepConnected && sleepEfficiency !== undefined && sleepEfficiency < 82) {
    cards.push(
      <InsightCard key="alcohol-sleep" cardIndex={idx++}
        title={`${alcoholDrinksPerWeek} drinks/week disrupting sleep architecture`}
        body={`Alcohol at this level suppresses REM sleep and increases overnight arousals, consistent with your efficiency of ${sleepEfficiency}%. While alcohol accelerates sleep onset, it fragments the second half of the night — net sleep quality decreases even when total hours are preserved. A 3-week alcohol reduction trial is the cleanest diagnostic for separating alcohol from other efficiency drivers.`}
        ref_="Colrain, Nicholas & Baker, 2014 · Alcohol Research (meta-analysis)"
        tag="Lifestyle × Sleep" accentColor="var(--sleep-c)" tagBg="var(--sleep-bg)" tagColor="var(--sleep-c)"
      />
    )
  }

  if (vegServings !== undefined && vegServings < 2 && processedFood !== undefined && processedFood >= 4) {
    cards.push(
      <InsightCard key="diet-inflammation" cardIndex={idx++}
        title="Diet pattern associated with elevated inflammatory load"
        body={`${vegServings === 0 ? "No vegetable servings" : `Only ${vegServings} vegetable serving${vegServings > 1 ? "s" : ""}`} per day combined with frequent processed food is a high-polypharmacy dietary pattern. A Mediterranean-style shift (≥5 vegetable servings, minimal ultra-processed foods) lowers hsCRP by 0.4–1.1 mg/L and reduces 10-year cardiovascular risk by 30% in primary prevention populations.`}
        ref_="Estruch et al., 2013 · NEJM PREDIMED (n = 7,447)"
        tag="Lifestyle · Nutrition" accentColor="var(--gold)" tagBg="var(--gold-dim)" tagColor="var(--gold)"
      />
    )
  }

  if (cards.length === 0) return null

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Insights</h3>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-30)" }}>Tailored to your data</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{cards}</div>
    </div>
  )
}

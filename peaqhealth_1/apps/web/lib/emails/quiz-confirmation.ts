// lib/emails/quiz-confirmation.ts
// Inline-styled HTML email — no React Email dependency, no CSS classes.
// All layouts use <table> for Outlook compatibility.

interface QuizEmailProps {
  score: number
  maxScore: number
  tier: "low" | "moderate" | "high"
  tags: string[]
}

// ── Tag → label + panel mapping ──────────────────────────────────────────

const TAG_LABELS: Record<string, { label: string; panel: "sleep" | "blood" | "oral" }> = {
  nitrateLow:        { label: "Nitrate low",       panel: "oral" },
  nitrateHigh:       { label: "Nitrate strong",    panel: "oral" },
  mouthwash:         { label: "Mouthwash use",     panel: "oral" },
  periodontal:       { label: "Periodontal",       panel: "oral" },
  cvHistory:         { label: "CV history",        panel: "blood" },
  cvRisk:            { label: "CV risk",           panel: "blood" },
  inflammation:      { label: "Inflammation",      panel: "blood" },
  airway:            { label: "Airway",            panel: "sleep" },
  osa:               { label: "OSA signal",        panel: "sleep" },
  sexFemale:         { label: "Female",            panel: "blood" },
  pregnant:          { label: "Pregnant/postpartum", panel: "oral" },
  planningPregnancy: { label: "Planning pregnancy", panel: "oral" },
  postMenopausal:    { label: "Post-menopausal",   panel: "sleep" },
  hormonalCondition: { label: "Hormonal condition", panel: "blood" },
  autoimmune:        { label: "Autoimmune",        panel: "oral" },
  sexMale:           { label: "Male",              panel: "blood" },
  hypertension:      { label: "Hypertension",      panel: "blood" },
}

const PANEL_COLORS: Record<string, { main: string; bg: string }> = {
  sleep: { main: "#5B9BD5", bg: "rgba(91,155,213,0.15)" },
  blood: { main: "#C97070", bg: "rgba(201,112,112,0.15)" },
  oral:  { main: "#7AB87A", bg: "rgba(122,184,122,0.15)" },
}

// ── Sex-specific copy helpers ────────────────────────────────────────────

function getOpeningFraming(tags: string[]): string {
  if (tags.includes("sexFemale"))
    return "Your answers reveal connections between your oral health and some of the most important health signals in women: cardiovascular risk, hormonal health, pregnancy outcomes, and autoimmune disease."
  if (tags.includes("sexMale"))
    return "Your answers reveal connections between your oral health and cardiovascular risk, blood pressure regulation, and sleep, the three systems where oral bacteria have the strongest documented impact in men."
  return "Your answers reveal connections between your oral health and your cardiovascular, metabolic, and sleep systems that most doctors have never discussed with you."
}

function getSignalBarLabel(tags: string[]): string {
  if (tags.includes("sexFemale"))
    return "Based on your answers, here are the pathways most relevant to your health as a woman:"
  if (tags.includes("sexMale"))
    return "Based on your answers, here are the pathways most relevant to your health as a man:"
  return "Based on your answers, here are the pathways most relevant to your health:"
}

function getClosingCta(tags: string[]): string {
  if (tags.includes("sexFemale"))
    return "Peaq measures the oral signals most relevant to women&rsquo;s cardiovascular, hormonal, and reproductive health, connected to your blood biomarkers and sleep data in a single score."
  if (tags.includes("sexMale"))
    return "Peaq measures the oral signals most relevant to men&rsquo;s cardiovascular, blood pressure, and sleep health, connected to your blood biomarkers in a single score."
  return "Peaq measures oral, blood, and sleep signals together because no single panel tells the whole story."
}

// ── Signal bars ──────────────────────────────────────────────────────────

function getSignalBars(tags: string[]) {
  const hasSleep = tags.some(t => ["airway", "osa"].includes(t))
  const hasBlood = tags.some(t => ["cvHistory", "cvRisk", "inflammation"].includes(t))
  const hasOral  = tags.some(t => ["nitrateLow", "periodontal", "mouthwash"].includes(t))
  return {
    sleep: { pct: hasSleep ? 65 : 85, status: hasSleep ? "Watch" : "Good" },
    blood: { pct: hasBlood ? 70 : 88, status: hasBlood ? "Watch" : "Good" },
    oral:  { pct: hasOral  ? 28 : 55, status: hasOral  ? "Attention" : "Watch" },
  }
}

function statusBadge(status: string): string {
  const styles: Record<string, string> = {
    Watch:     "background-color:#FAEEDA;color:#633806;",
    Attention: "background-color:#FCEBEB;color:#791F1F;",
    Good:      "background-color:#E1F5EE;color:#085041;",
  }
  return `<span style="font-family:Arial,sans-serif;font-size:9px;font-weight:500;padding:1px 6px;border-radius:2px;${styles[status] ?? ""}">${status}</span>`
}

// ── Primary signal copy ──────────────────────────────────────────────────

function getPrimarySignalCopy(tags: string[]): { h2: string; body: string } {
  const hasPerio  = tags.includes("periodontal")
  const hasCv     = tags.includes("cvHistory") || tags.includes("cvRisk")
  const hasAirway = tags.includes("airway") || tags.includes("osa")
  const hasOsa    = tags.includes("osa")
  const hasNitrate = tags.includes("nitrateLow") || tags.includes("mouthwash")
  const hasInflam = tags.includes("inflammation")
  const hasPregnant = tags.includes("pregnant") || tags.includes("planningPregnancy")
  const hasAutoimmune = tags.includes("autoimmune") || tags.includes("rheumatoidArthritis")
  const hasHormonal = tags.includes("hormonalCondition")
  const hasPostMeno = tags.includes("postMenopausal")
  const isFemale = tags.includes("sexFemale")
  const isMale = tags.includes("sexMale")
  const hasHtn = tags.includes("hypertension")

  // ── Female-specific paths ──────────────────────────────────────────────
  if (isFemale && hasPregnant && hasPerio) return {
    h2: "Your oral health is directly connected to your pregnancy outcomes.",
    body: "Women with periodontitis are 5.56&times; more likely to develop preeclampsia, and 2-3&times; more likely to experience preterm delivery. The good news: periodontal treatment in the second trimester is safe and recommended. Your oral panel measures the specific bacterial burden driving this risk.",
  }
  if (isFemale && hasPregnant) return {
    h2: "Pregnancy changes your oral microbiome in ways that matter beyond your mouth.",
    body: "Hormonal shifts increase gingival inflammation and create conditions that favor periodontal pathogens. Women with periodontitis face 5.56&times; higher preeclampsia risk. Peaq would measure your periodontal pathogen load alongside your inflammatory markers to give you a complete picture.",
  }
  if (isFemale && hasAutoimmune && hasPerio) return {
    h2: "Your immune system and your oral microbiome are speaking the same inflammatory language.",
    body: "RA, lupus, and other autoimmune conditions are 3-9&times; more common in women. P. gingivalis, the primary periodontal pathogen, produces an enzyme called PAD that citrullinates host proteins, potentially triggering the autoimmune cascades underlying RA. Nonsurgical periodontal treatment has been shown to reduce disease activity markers in RA patients.",
  }
  if (isFemale && hasAutoimmune) return {
    h2: "Autoimmune conditions and periodontal disease share overlapping inflammatory pathways.",
    body: "RA patients are 4.68&times; more likely to have periodontitis. P. gingivalis possesses an enzyme that citrullinates host proteins, potentially triggering the autoimmune cascades underlying RA. The oral microbiome is a modifiable factor in autoimmune disease activity.",
  }
  if (isFemale && hasHormonal && (hasPerio || hasNitrate)) return {
    h2: "Hormonal shifts directly alter your oral microbiome.",
    body: "Estrogen fluctuations affect periodontal tissue inflammation throughout the cycle, during pregnancy, and at menopause. Thyroid dysfunction depletes nitrate-reducing bacteria, the same bacteria your blood vessels depend on for pressure regulation. Peaq tracks both.",
  }
  if (isFemale && hasPostMeno && (hasAirway || hasCv)) return {
    h2: "After menopause, cardiovascular and sleep apnea risk converge.",
    body: "Risk of sleep apnea increases significantly after menopause due to loss of progesterone&rsquo;s protective effect on upper airway tone. OSA patients are 2.46&times; more likely to have periodontitis. Estrogen loss simultaneously accelerates periodontal attachment loss and cardiovascular risk. Peaq tracks the intersection of all three.",
  }
  if (isFemale && hasCv) return {
    h2: "Cardiovascular disease is the leading killer of women, and your oral microbiome is part of that story.",
    body: "Women are more likely than men to have atypical cardiovascular symptoms and are frequently underdiagnosed. Periodontal disease increases ASCVD risk independently of traditional risk factors. The AHA&rsquo;s 2026 Scientific Statement confirmed this with Mendelian randomization. Your oral panel tracks the bacterial burden driving this risk.",
  }
  if (isFemale) return {
    h2: "Your oral microbiome is influencing systems your doctor has never connected to your mouth.",
    body: "Peaq measures four oral signals: nitrate-reducing bacteria, periodontal pathogens, microbial diversity, and OSA-associated taxa. It connects them to your blood and sleep data. For women, these connections run through cardiovascular health, hormonal biology, and inflammatory disease in ways that are only now being documented at scale.",
  }

  // ── Male-specific paths ────────────────────────────────────────────────
  if (isMale && hasCv && hasPerio) return {
    h2: "Your heart history and your oral microbiome are connected through the same inflammatory pathway.",
    body: "Periodontal pathogens have been physically detected in human coronary artery plaques at autopsy. The AHA&rsquo;s 2026 Scientific Statement confirmed periodontal disease increases ASCVD risk through bacteremia and chronic systemic inflammation. Mendelian randomization confirms directional causality. If you have a cardiac history, your oral panel is not just a dental metric.",
  }
  if (isMale && hasHtn && hasNitrate) return {
    h2: "The bacteria in your mouth may be influencing your blood pressure.",
    body: "Nitrate-reducing oral bacteria (Neisseria, Rothia, Veillonella) convert dietary nitrate to nitric oxide, the molecule your blood vessels use to regulate pressure. Men using antiseptic mouthwash show measurable blood pressure increases within 7 days as these bacteria are depleted. Two out of three hypertensive patients on medication don&rsquo;t have their blood pressure adequately controlled. This pathway may explain part of why.",
  }
  if (isMale && hasOsa && hasPerio) return {
    h2: "Sleep apnea and gum disease share a biological pathway, and you may have both.",
    body: "OSA patients are 2.46&times; more likely to have periodontitis across meta-analyses of 88,000+ people. Intermittent hypoxia from OSA drives oxidative stress that accelerates periodontal tissue breakdown, while periodontal inflammation elevates systemic CRP that disrupts sleep architecture. Peaq tracks both panels because treating one affects the other.",
  }
  if (isMale && hasCv && !hasPerio) return {
    h2: "Family history of heart disease changes how we interpret your oral panel.",
    body: "Periodontal disease is an independent cardiovascular risk factor, one your cardiologist is unlikely to have mentioned. Men with a family history of early heart disease and elevated periodontal pathogen burden face compounding risk. The bacteremia from inflamed gum tissue is continuous and systemic, not limited to dental appointments.",
  }
  if (isMale) return {
    h2: "Your oral microbiome is influencing systems your doctor has never connected to your mouth.",
    body: "Peaq measures nitrate-reducing bacteria, periodontal pathogens, microbial diversity, and OSA-associated taxa, then connects them to your blood and sleep data. For men, these connections run through cardiovascular risk, blood pressure regulation, and sleep-disordered breathing in ways that are only now being documented at population scale.",
  }

  // ── Generic paths ──────────────────────────────────────────────────────
  if (hasPerio && hasCv && hasAirway) return {
    h2: "Your cardiovascular history, sleep signals, and oral health share one biological pathway.",
    body: "Periodontal bacteria enter the bloodstream and trigger the same inflammatory response your doctor measures with CRP. Those same bacteria predict sleep-disordered breathing before a polysomnogram would catch it. You have flagged signals in all three panels, and the oral microbiome is where they converge.",
  }
  if (hasPerio && hasCv) return {
    h2: "Your cardiovascular history has an oral origin most cardiologists never check.",
    body: "P. gingivalis and T. denticola, both periodontal pathogens, have been physically detected in human coronary artery plaques at autopsy. Your cardiovascular risk profile and your oral microbiome are not separate conversations. They are the same conversation.",
  }
  if (hasAirway && (hasPerio || hasNitrate)) return {
    h2: "Your airway signals and oral health share an inflammatory pathway.",
    body: "People with obstructive sleep apnea are nearly 2.5 times more likely to have periodontal disease, confirmed across 88,000+ patients in multiple meta-analyses. OSA-related intermittent hypoxia accelerates periodontal tissue breakdown, while elevated periodontal pathogen load raises the systemic CRP that disrupts sleep architecture.",
  }
  if (hasCv && hasInflam) return {
    h2: "Elevated inflammation and cardiovascular history compound each other, and the oral microbiome drives both.",
    body: "Residual inflammatory risk is predictive of cardiac events independent of cholesterol. Periodontal pathogen load contributes to systemic CRP elevation through a bacteraemia pathway that is rarely monitored.",
  }
  if (hasNitrate && !hasPerio && !hasCv && !hasAirway) return {
    h2: "Your nitrate pathway may be compromised, and a daily habit could be the cause.",
    body: "The bacteria that convert dietary nitrate into nitric oxide, your blood vessels' primary vasodilator, are among the first casualties of antiseptic mouthwash. This is a vascular risk factor hiding in your bathroom cabinet.",
  }
  return {
    h2: "Your oral microbiome, blood biomarkers, and sleep signals are part of the same system.",
    body: "Most health platforms measure one of these. Peaq measures all three and finds the connections between them that no single test can see. Your quiz answers have identified at least one cross-panel signal worth measuring.",
  }
}

// ── What Peaq would measure copy ─────────────────────────────────────────

function getMeasureCopy(tags: string[]): { h2: string; body: string } {
  const hasPerio  = tags.includes("periodontal")
  const hasCv     = tags.includes("cvHistory") || tags.includes("cvRisk")
  const hasAirway = tags.includes("airway") || tags.includes("osa")
  const hasNitrate = tags.includes("nitrateLow") || tags.includes("mouthwash")

  if (hasPerio && hasCv && hasAirway) return {
    h2: "Three panels. Three signals. One picture no single test has shown you.",
    body: "Your periodontal pathogen load connected to your hs-CRP. Your OSA-associated oral taxa connected to your nightly SpO2. Your nitrate-reducing bacteria connected to your HRV and blood pressure. These are not separate measurements. They are one conversation.",
  }
  if (hasPerio && hasCv) return {
    h2: "The oral-cardiovascular connection, made measurable.",
    body: "Peaq connects your periodontal pathogen load directly to your hs-CRP and Lp(a), two blood markers predictive of cardiovascular events beyond standard LDL panels.",
  }
  if (hasAirway && hasNitrate) return {
    h2: "Your oral microbiome as a sleep health predictor.",
    body: "Peaq tracks OSA-associated taxa at species-level resolution and connects them to your nightly HRV and SpO2 from your wearable. The nitrate pathway shows up in both your blood pressure data and your sleep architecture.",
  }
  return {
    h2: "One score. Three panels. The connections between them.",
    body: "Oral microbiome sequencing at species-level resolution, 40+ blood biomarkers from any lab, and nightly sleep data from your wearable, unified into a single Peaq score that recalculates as your data updates.",
  }
}

// ── Build HTML ────────────────────────────────────────────────────────────

export function renderQuizConfirmationEmail(props: QuizEmailProps): string {
  const { score, maxScore, tier, tags } = props
  const bars = getSignalBars(tags)
  const primary = getPrimarySignalCopy(tags)
  const measure = getMeasureCopy(tags)
  const openingFraming = getOpeningFraming(tags)
  const signalBarLabel = getSignalBarLabel(tags)
  const closingCta = getClosingCta(tags)

  const tierLabel = tier === "high" ? "High" : tier === "moderate" ? "Moderate" : "Low"

  // Build tag pills HTML
  const tagPills = tags.map(t => {
    const info = TAG_LABELS[t]
    if (!info) return ""
    const pc = PANEL_COLORS[info.panel]
    return `<span style="display:inline-block;font-family:Arial,sans-serif;font-size:9px;padding:2px 8px;border-radius:10px;margin:2px 4px 2px 0;background-color:${pc.bg};color:${pc.main};">${info.label}</span>`
  }).filter(Boolean).join("")

  // Tag-filtered citations
  const citations: Array<{ journal: string; finding: string; path: string }> = [
    { journal: "Frontiers Immunol &middot; 2023", finding: "&ldquo;P. gingivalis directly detected in human coronary artery plaques.&rdquo; n=1,791", path: "Oral &rarr; Blood" },
    { journal: "Eur J Prev Card &middot; 2019", finding: "&ldquo;Twice-daily brushing associated with 14% lower cardiovascular disease risk.&rdquo; n=247,696", path: "Oral &rarr; Blood" },
  ]
  if (tags.some(t => ["airway", "osa"].includes(t)))
    citations.push({ journal: "Sleep Breath &middot; 2023 + Dent J &middot; 2024", finding: "&ldquo;OSA patients are 2.46&times; more likely to have periodontitis across meta-analyses of 88,000+ patients.&rdquo;", path: "Oral &harr; Sleep" })
  if (tags.some(t => ["cvHistory", "cvRisk"].includes(t)))
    citations.push({ journal: "Circulation &middot; 2026", finding: "&ldquo;Periodontal disease increases ASCVD risk through bacteremia and chronic inflammation.&rdquo;", path: "Oral &rarr; Blood" })
  if (tags.includes("inflammation"))
    citations.push({ journal: "Biol Psych &middot; 2016", finding: "&ldquo;Elevated CRP fragments sleep architecture and suppresses deep sleep.&rdquo;", path: "Blood &rarr; Sleep" })
  if (tags.includes("nitrateLow"))
    citations.push({ journal: "Hypertension &middot; 2015", finding: "&ldquo;Dietary nitrate provides sustained blood pressure lowering.&rdquo; n=300", path: "Oral &rarr; Blood" })
  // Female-specific citations
  if (tags.includes("sexFemale") && (tags.includes("pregnant") || tags.includes("planningPregnancy") || tags.includes("periodontal")))
    citations.push({ journal: "J Clin Periodontol &middot; 2014", finding: "&ldquo;Women with periodontitis are 5.56&times; more likely to develop preeclampsia. Periodontal disease associated with 2-3&times; higher preterm delivery risk.&rdquo; n=283", path: "Oral &rarr; Pregnancy" })
  if (tags.includes("autoimmune") || tags.includes("rheumatoidArthritis"))
    citations.push({ journal: "Tang et al. &middot; Int J Periodontics &middot; 2017", finding: "&ldquo;RA patients are 4.68&times; more likely to have periodontitis. P. gingivalis citrullination may trigger autoimmune cascades.&rdquo; n=151,569", path: "Oral &rarr; Autoimmune" })
  if (tags.includes("hormonalCondition"))
    citations.push({ journal: "Clinical literature", finding: "&ldquo;Estrogen fluctuations affect periodontal tissue inflammation. Thyroid dysfunction associated with salivary gland changes and oral microbiome shifts.&rdquo;", path: "Hormonal &rarr; Oral" })
  // Male-specific citations
  if (tags.includes("sexMale") && tags.some(t => ["cvHistory", "cvRisk"].includes(t)))
    citations.push({ journal: "Circulation &middot; 2026 + AHA", finding: "&ldquo;Periodontal disease increases ASCVD risk through bacteremia and chronic systemic inflammation. Mendelian randomization confirms directional causality.&rdquo;", path: "Oral &rarr; Blood" })
  if (tags.includes("sexMale") && (tags.includes("hypertension") || tags.includes("nitrateLow")))
    citations.push({ journal: "Bryan et al. &middot; Curr Hypertens Rep &middot; 2017", finding: "&ldquo;Oral nitrate-reducing bacteria are essential for nitric oxide homeostasis and blood pressure regulation. Antiseptic mouthwash disrupts this pathway within days.&rdquo;", path: "Oral &rarr; Blood" })
  if (tags.includes("hypertension"))
    citations.push({ journal: "Clinical literature", finding: "&ldquo;Strong correlation between OSA and hypertension. Intensive periodontal therapy measurably lowered blood pressure in pre-hypertensive patients with periodontitis.&rdquo;", path: "Oral &rarr; Blood" })

  const citationRows = citations.map(c => `
    <tr>
      <td style="font-family:Arial,sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.2);padding:10px 12px 10px 0;vertical-align:top;width:120px;border-bottom:1px solid rgba(255,255,255,0.06);">${c.journal}</td>
      <td style="font-family:Georgia,serif;font-size:12px;font-style:italic;color:rgba(255,255,255,0.5);line-height:1.5;padding:10px 12px 10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${c.finding}</td>
      <td style="font-family:Arial,sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#C49A3C;white-space:nowrap;padding:10px 0;vertical-align:top;border-bottom:1px solid rgba(255,255,255,0.06);">${c.path}</td>
    </tr>
  `).join("")

  function panelBarHtml(panel: string, label: string, color: string, pct: number, status: string) {
    return `
      <td style="width:33%;padding:0 8px;vertical-align:top;">
        <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:${color};margin-bottom:8px;">${label}</div>
        <div style="height:3px;background:rgba(255,255,255,0.08);border-radius:2px;margin-bottom:6px;">
          <div style="height:3px;width:${pct}%;background:${color};border-radius:2px;"></div>
        </div>
        ${statusBadge(status)}
      </td>
    `
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F6F4EF;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F6F4EF;">
<tr><td align="center" style="padding:20px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" width="580" style="max-width:580px;width:100%;">

<!-- 1. DARK HEADER — sex-specific opening -->
<tr><td style="background-color:#16150F;padding:40px 48px 36px;border-radius:8px 8px 0 0;">
  <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:24px;">peaq</div>
  <h1 style="font-family:Georgia,serif;font-size:34px;font-weight:400;color:#ffffff;margin:0 0 12px;line-height:1.15;">You&rsquo;re on the list.</h1>
  <p style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.4);line-height:1.65;margin:0;">${openingFraming}</p>
</td></tr>

<!-- 2. SIGNAL PROFILE BAR — sex-specific label -->
<tr><td style="background-color:#1E1D16;padding:24px 48px;">
  <div style="font-family:Arial,sans-serif;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.25);margin-bottom:6px;">Your signal profile &middot; ${score}/${maxScore} &middot; ${tierLabel} signal density</div>
  <p style="font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.35);line-height:1.5;margin:0 0 16px;">${signalBarLabel}</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
    ${panelBarHtml("sleep", "Sleep", "#5B9BD5", bars.sleep.pct, bars.sleep.status)}
    ${panelBarHtml("blood", "Blood", "#C97070", bars.blood.pct, bars.blood.status)}
    ${panelBarHtml("oral", "Oral", "#7AB87A", bars.oral.pct, bars.oral.status)}
  </tr></table>
  <div style="margin-top:12px;">${tagPills}</div>
</td></tr>

<!-- 3. PRIMARY SIGNAL -->
<tr><td style="background-color:#ffffff;padding:40px 48px 28px;">
  <div style="font-family:Arial,sans-serif;font-size:9px;color:#C49A3C;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:12px;">Your primary signal</div>
  <h2 style="font-family:Georgia,serif;font-size:19px;font-weight:400;color:#16150F;line-height:1.35;margin:0 0 12px;">${primary.h2}</h2>
  <p style="font-family:Arial,sans-serif;font-size:13px;color:#666666;line-height:1.75;margin:0;">${primary.body}</p>
</td></tr>

<!-- 4. ORAL RISK SECTION -->
<tr><td style="background-color:#16150F;padding:28px 48px;">
  <div style="font-family:Arial,sans-serif;font-size:9px;color:#C49A3C;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:16px;">Why the oral panel comes first</div>
  <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#ffffff;line-height:1.3;margin:0 0 16px;">The most underestimated risk factor, and the most <em style="font-style:italic;color:#C49A3C;">actionable one.</em></h2>
  <p style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.75;margin:0 0 12px;">Most risks you discover are hard to move quickly. Elevated Lp(a) is largely genetic. Low HRV takes months of lifestyle work. But periodontal disease is different. It is the rare systemic risk factor where a single appointment changes your numbers.</p>
  <p style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.75;margin:0 0 20px;">The oral microbiome is where cardiovascular risk, sleep disruption, and systemic inflammation all share a common origin. And it is the panel nobody else is measuring.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="font-family:Georgia,serif;font-size:18px;color:#C49A3C;vertical-align:top;padding:10px 12px 10px 0;width:70px;border-bottom:1px solid rgba(255,255,255,0.06);">n=1,791</td>
      <td style="font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:rgba(255,255,255,0.75);font-weight:500;">P. gingivalis directly detected</span> in human coronary artery plaques at autopsy. Not associated. Physically present. Frontiers in Immunology, 2023.</td>
    </tr>
    <tr>
      <td style="font-family:Georgia,serif;font-size:18px;color:#C49A3C;vertical-align:top;padding:10px 12px 10px 0;width:70px;border-bottom:1px solid rgba(255,255,255,0.06);">2.46&times;</td>
      <td style="font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:rgba(255,255,255,0.75);font-weight:500;">OSA patients are 2.46&times; more likely to have periodontitis</span> across meta-analyses of 88,000+ patients. Intermittent hypoxia and periodontal inflammation share an oxidative stress pathway. Dentistry Journal, 2024.</td>
    </tr>
    <tr>
      <td style="font-family:Georgia,serif;font-size:18px;color:#C49A3C;vertical-align:top;padding:10px 12px 10px 0;width:70px;border-bottom:1px solid rgba(255,255,255,0.06);">14%</td>
      <td style="font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">Lower cardiovascular disease risk associated with <span style="color:rgba(255,255,255,0.75);font-weight:500;">twice-daily brushing and regular dental visits</span>. n=247,696. Eur J Preventive Cardiology, 2019.</td>
    </tr>
    <tr>
      <td style="font-family:Georgia,serif;font-size:18px;color:#C49A3C;vertical-align:top;padding:10px 12px 10px 0;width:70px;">&darr; NO</td>
      <td style="font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5;padding:10px 0;"><span style="color:rgba(255,255,255,0.75);font-weight:500;">Antiseptic mouthwash kills</span> the nitrate-reducing bacteria that produce nitric oxide for blood pressure regulation. Most people are actively making this worse.</td>
    </tr>
  </table>
  <div style="background-color:#1E1D16;border-radius:6px;padding:16px 18px;border-left:2px solid #C49A3C;margin-top:20px;">
    <div style="font-family:Arial,sans-serif;font-size:9px;color:#C49A3C;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">The leverage point</div>
    <p style="font-family:Georgia,serif;font-size:14px;font-style:italic;color:rgba(255,255,255,0.55);line-height:1.6;margin:0;">A professional dental cleaning reduces subgingival pathogen load more effectively than any supplement or lifestyle intervention. It is the only systemic risk factor you can meaningfully address in a dentist&rsquo;s chair.</p>
  </div>
</td></tr>

<!-- 5. WHAT PEAQ WOULD MEASURE -->
<tr><td style="background-color:#ffffff;padding:28px 48px;">
  <div style="font-family:Arial,sans-serif;font-size:9px;color:#C49A3C;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:12px;">What Peaq would measure first</div>
  <h2 style="font-family:Georgia,serif;font-size:19px;font-weight:400;color:#16150F;line-height:1.35;margin:0 0 12px;">${measure.h2}</h2>
  <p style="font-family:Arial,sans-serif;font-size:13px;color:#666666;line-height:1.75;margin:0;">${measure.body}</p>
</td></tr>

<!-- 6. WHAT HAPPENS NEXT -->
<tr><td style="background-color:#ffffff;padding:28px 48px;">
  <div style="font-family:Arial,sans-serif;font-size:9px;color:#C49A3C;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:16px;">What happens next</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding:12px 0;border-bottom:1px solid #F0EEE8;">
      <span style="font-family:Georgia,serif;font-size:12px;color:#C49A3C;">01</span>
      <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:500;color:#16150F;margin-left:12px;">You&rsquo;re on the founding member waitlist</span>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#999999;line-height:1.5;margin:4px 0 0 28px;">We&rsquo;ll reach out when your oral kit is ready to ship. Founding members get priority access and founding pricing.</p>
    </td></tr>
    <tr><td style="padding:12px 0;border-bottom:1px solid #F0EEE8;">
      <span style="font-family:Georgia,serif;font-size:12px;color:#C49A3C;">02</span>
      <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:500;color:#16150F;margin-left:12px;">Your kit ships. Swab takes 2 minutes</span>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#999999;line-height:1.5;margin:4px 0 0 28px;">At-home oral swab. 16S rRNA sequencing at species-level resolution. Results in 10&ndash;14 days.</p>
    </td></tr>
    <tr><td style="padding:12px 0;border-bottom:1px solid #F0EEE8;">
      <span style="font-family:Georgia,serif;font-size:12px;color:#C49A3C;">03</span>
      <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:500;color:#16150F;margin-left:12px;">Upload your labs, connect your wearable</span>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#999999;line-height:1.5;margin:4px 0 0 28px;">LabCorp, Quest, or any standard bloodwork. WHOOP or Oura syncs nightly.</p>
    </td></tr>
    <tr><td style="padding:12px 0;">
      <span style="font-family:Georgia,serif;font-size:12px;color:#C49A3C;">04</span>
      <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:500;color:#16150F;margin-left:12px;">Your Peaq score</span>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#999999;line-height:1.5;margin:4px 0 0 28px;">A single number from 0&ndash;100. With the cross-panel signals your doctors aren&rsquo;t seeing.</p>
    </td></tr>
  </table>
</td></tr>

<!-- 7. CTA — sex-specific closing -->
<tr><td style="background-color:#ffffff;padding:0 48px 28px;">
  <div style="background-color:#F6F4EF;border-radius:8px;padding:26px;text-align:center;">
    <div style="font-family:Arial,sans-serif;font-size:9px;color:#aaaaaa;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:8px;">In the meantime</div>
    <p style="font-family:Georgia,serif;font-size:17px;color:#16150F;margin:0 0 8px;">Read the science behind <em style="font-style:italic;color:#C49A3C;">your score.</em></p>
    <p style="font-family:Arial,sans-serif;font-size:12px;color:#888888;line-height:1.6;margin:0 0 16px;">${closingCta}</p>
    <a href="https://peaqhealth.me/science" style="display:inline-block;font-family:Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;background-color:#C49A3C;color:#16150F;padding:12px 32px;border-radius:3px;text-decoration:none;">VIEW THE EVIDENCE BASE &rarr;</a>
  </div>
</td></tr>

<!-- 8. SCIENCE STRIP -->
<tr><td style="background-color:#16150F;padding:24px 48px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    ${citationRows}
  </table>
</td></tr>

<!-- 9. FOOTER -->
<tr><td style="background-color:#ffffff;padding:24px 48px;border-top:1px solid #F0EEE8;border-radius:0 0 8px 8px;">
  <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#bbbbbb;margin-bottom:12px;">peaq health</div>
  <p style="font-family:Arial,sans-serif;font-size:10px;color:#cccccc;line-height:1.6;margin:0 0 10px;">For informational purposes only. Not a medical device. Not intended to diagnose, treat, cure, or prevent any disease. Built by Dr. Igor Khabensky (General Dentist) and Dr. Paul Leis (Cardiologist).</p>
  <p style="font-family:Arial,sans-serif;font-size:10px;color:#bbbbbb;margin:0;">
    <a href="https://peaqhealth.me/science" style="color:#bbbbbb;text-decoration:none;border-bottom:1px solid #dddddd;">Science</a> &nbsp;&middot;&nbsp;
    <a href="https://peaqhealth.me" style="color:#bbbbbb;text-decoration:none;border-bottom:1px solid #dddddd;">peaqhealth.me</a>
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

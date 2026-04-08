// lib/quizScoring.ts — multi-select scoring with points + tags per option

export interface QuizOption {
  label: string
  value: string
  points: number
  tags: string[]
}

export interface QuizQuestion {
  id: string
  question: string
  subtext: string
  options: QuizOption[]
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "nitrate",
    question: "How often do you eat foods like arugula, beetroot, spinach, or celery?",
    subtext: "A specific group of bacteria in your mouth \u2014 Neisseria, Rothia, and Veillonella \u2014 convert nitrate from these foods into nitric oxide, the molecule your blood vessels use to regulate blood pressure.",
    options: [
      { label: "Rarely or never", value: "nitrate-never", points: 3, tags: ["nitrateLow"] },
      { label: "A few times a week", value: "nitrate-some", points: 1, tags: [] },
      { label: "Almost every day", value: "nitrate-daily", points: 0, tags: ["nitrateHigh"] },
    ],
  },
  {
    id: "mouthwash",
    question: "Do you use antiseptic mouthwash (Listerine, Scope, or similar)?",
    subtext: "Antiseptic mouthwash kills the nitrate-reducing bacteria that produce nitric oxide for blood pressure regulation \u2014 often without people realising it.",
    options: [
      { label: "Daily", value: "mouthwash-daily", points: 2, tags: ["nitrateLow", "mouthwash"] },
      { label: "A few times a week", value: "mouthwash-sometimes", points: 1, tags: ["mouthwash"] },
      { label: "Rarely or never", value: "mouthwash-never", points: 0, tags: [] },
    ],
  },
  {
    id: "gums",
    question: "Have you ever been told you have gum disease, or do your gums bleed when you brush?",
    subtext: "Bleeding gums are a sign of periodontal inflammation \u2014 and the bacteria responsible have been directly detected in coronary artery plaques at autopsy.",
    options: [
      { label: "Yes, diagnosed with gum disease", value: "gums-diagnosed", points: 3, tags: ["periodontal", "cvRisk"] },
      { label: "My gums bleed sometimes", value: "gums-bleed", points: 2, tags: ["periodontal"] },
      { label: "No issues", value: "gums-none", points: 0, tags: [] },
    ],
  },
  {
    id: "cv",
    question: "Have you or a close family member been diagnosed with heart disease, high blood pressure, or had a cardiac event?",
    subtext: "Cardiovascular disease has a significant oral component that most cardiologists never check. The periodontal-cardiovascular pathway is confirmed at the highest level of institutional evidence.",
    options: [
      { label: "Yes \u2014 personal history", value: "cv-personal", points: 3, tags: ["cvHistory", "cvRisk"] },
      { label: "Yes \u2014 family history", value: "cv-family", points: 2, tags: ["cvHistory"] },
      { label: "No known history", value: "cv-none", points: 0, tags: [] },
    ],
  },
  {
    id: "sleep",
    question: "Do you snore, wake up unrefreshed, or have you been told you stop breathing in your sleep?",
    subtext: "Oral microbiome composition predicts obstructive sleep apnea with 91.9% accuracy \u2014 before a sleep study would catch it. These taxa are measurable in a simple swab.",
    options: [
      { label: "All of the above", value: "sleep-all", points: 3, tags: ["airway", "osa"] },
      { label: "Snoring or unrefreshed sleep", value: "sleep-some", points: 2, tags: ["airway"] },
      { label: "Occasionally, not a regular pattern", value: "sleep-rarely", points: 1, tags: [] },
      { label: "No sleep issues", value: "sleep-none", points: 0, tags: [] },
    ],
  },
  {
    id: "inflammation",
    question: "Have you had an elevated CRP or been told you have chronic inflammation?",
    subtext: "Elevated CRP fragments sleep architecture and suppresses deep sleep \u2014 which then further elevates CRP. It is also a direct downstream consequence of periodontal pathogen load.",
    options: [
      { label: "Yes \u2014 elevated CRP on labs", value: "crp-elevated", points: 3, tags: ["inflammation", "cvRisk"] },
      { label: "Not sure \u2014 never been tested", value: "crp-unknown", points: 1, tags: ["inflammation"] },
      { label: "No \u2014 normal inflammatory markers", value: "crp-normal", points: 0, tags: [] },
    ],
  },
]

// ── Scoring ────────────────────────────────────────────────────────────────

export interface QuizResult {
  score: number
  maxScore: number
  tier: "low" | "moderate" | "high"
  tags: string[]
  primaryInsight: string
  secondaryInsight: string
  tertiaryInsight: string
}

export function scoreQuiz(selectedValues: string[]): QuizResult {
  // Build a flat lookup of all options
  const optionMap = new Map<string, QuizOption>()
  for (const q of QUIZ_QUESTIONS) {
    for (const o of q.options) optionMap.set(o.value, o)
  }

  const selected = selectedValues.map(v => optionMap.get(v)).filter(Boolean) as QuizOption[]
  const totalScore = selected.reduce((sum, o) => sum + o.points, 0)
  const maxScore = QUIZ_QUESTIONS.reduce((sum, q) => sum + Math.max(...q.options.map(o => o.points)), 0)
  const tags = [...new Set(selected.flatMap(o => o.tags))]

  const ratio = totalScore / maxScore
  const tier: QuizResult["tier"] = ratio >= 0.6 ? "high" : ratio >= 0.3 ? "moderate" : "low"

  const insights = buildInsights(tags)
  return { score: totalScore, maxScore, tier, tags, ...insights }
}

// ── Insight copy ───────────────────────────────────────────────────────────

function buildInsights(tags: string[]): Pick<QuizResult, "primaryInsight" | "secondaryInsight" | "tertiaryInsight"> {
  const hasPerio = tags.includes("periodontal")
  const hasCv = tags.includes("cvHistory") || tags.includes("cvRisk")
  const hasAirway = tags.includes("airway") || tags.includes("osa")
  const hasNitrate = tags.includes("nitrateLow") || tags.includes("mouthwash")
  const hasInflam = tags.includes("inflammation")

  let primaryInsight: string
  if (hasPerio && hasCv && hasAirway) {
    primaryInsight = "Your cardiovascular history, sleep signals, and oral health share one biological pathway. Periodontal bacteria enter the bloodstream and trigger the same inflammatory response your doctor measures with CRP. Those same bacteria predict sleep-disordered breathing before a polysomnogram would catch it. You have flagged signals in all three panels."
  } else if (hasPerio && hasCv) {
    primaryInsight = "Your cardiovascular history has an oral origin most cardiologists never check. P. gingivalis and T. denticola \u2014 periodontal pathogens \u2014 have been physically detected in human coronary artery plaques at autopsy. Your cardiovascular risk profile and your oral microbiome are not separate conversations."
  } else if (hasCv && hasInflam) {
    primaryInsight = "Elevated inflammation and cardiovascular history compound each other \u2014 and the oral microbiome drives both. Residual inflammatory risk is now considered at least as predictive of cardiac events as residual cholesterol risk. Periodontal pathogen load is a primary driver of systemic CRP elevation."
  } else if (hasAirway && (hasPerio || hasNitrate)) {
    primaryInsight = "Your airway signals have an oral microbiome signature. OSA-associated bacteria \u2014 Prevotella and Fusobacterium \u2014 are detectable in the oral cavity before a sleep study would flag disordered breathing. Your nitrate pathway may also be compromised, reducing the nitric oxide your airways need."
  } else if (hasCv) {
    primaryInsight = "The conditions you flagged are directly connected to the oral microbiome through shared inflammatory pathways. Periodontal bacteria have been physically detected in coronary artery plaques in autopsy studies. Most people managing these conditions have never looked at the oral source."
  } else if (hasAirway) {
    primaryInsight = "The sleep and airway signals you flagged are often detectable in the oral microbiome before a sleep study would catch them. A 2022 study found oral microbiome composition predicted obstructive sleep apnea with 91.9% accuracy."
  } else if (hasNitrate) {
    primaryInsight = "Your nitrate pathway may be compromised \u2014 and a daily habit could be the cause. The bacteria that convert dietary nitrate into nitric oxide \u2014 your blood vessels\u2019 primary vasodilator \u2014 are among the first casualties of antiseptic mouthwash. This is a vascular risk factor hiding in your bathroom cabinet."
  } else {
    primaryInsight = "Your answers suggest your oral microbiome may be under mild stress \u2014 not from a single dramatic signal, but from a combination of small gaps in the pathways that connect your mouth to your cardiovascular and sleep health."
  }

  let secondaryInsight: string
  if (hasNitrate || tags.includes("mouthwash")) {
    secondaryInsight = "Peaq measures your nitrate-reducing bacteria specifically \u2014 Neisseria, Rothia, and Veillonella \u2014 and connects their abundance to your HRV and blood pressure data. This is a signal no standard dental exam or blood panel has ever shown you."
  } else if (hasAirway) {
    secondaryInsight = "Peaq tracks OSA-associated taxa \u2014 Prevotella and Fusobacterium \u2014 and cross-references them with your sleep wearable data. If your oral microbiome is flagging airway risk and your HRV confirms it, that\u2019s a cross-panel signal no single test could generate."
  } else {
    secondaryInsight = "Peaq sequences your oral microbiome at species level \u2014 not just diversity, but which specific bacteria are present and at what levels \u2014 and connects that data to your blood markers and nightly sleep physiology."
  }

  const tertiaryInsight = "What you\u2019ve never seen is how all of this connects in one picture. Your oral microbiome, your hs-CRP, your HRV \u2014 they\u2019re part of the same system. Peaq is the first platform that shows you all three together."

  return { primaryInsight, secondaryInsight, tertiaryInsight }
}

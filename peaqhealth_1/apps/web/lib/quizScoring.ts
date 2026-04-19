// lib/quizScoring.ts — single-select scoring with points + tags per option

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
  /** If set, this question only appears when the specified answer was selected */
  showIf?: { questionId: string; value: string }
  /** Allow multiple selections. Default false (single-select). */
  multiSelect?: boolean
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "biological-sex",
    question: "Which best describes you?",
    subtext: "This helps us interpret your results accurately \u2014 HRV targets, cardiovascular risk thresholds, and hormonal signals all differ meaningfully between sexes.",
    options: [
      { label: "Male", value: "sex-male", points: 0, tags: ["sexMale"] },
      { label: "Female", value: "sex-female", points: 0, tags: ["sexFemale"] },
      { label: "Prefer not to say", value: "sex-other", points: 0, tags: [] },
    ],
  },
  {
    id: "female-context",
    question: "Which of these apply to you as a woman?",
    subtext: "Women experience oral and cardiovascular health differently across life stages. These signals help us personalize your interpretation.",
    showIf: { questionId: "biological-sex", value: "sex-female" },
    multiSelect: true,
    options: [
      { label: "Currently pregnant or postpartum (within 1 year)", value: "pregnant-postpartum", points: 2, tags: ["pregnant", "periodontal"] },
      { label: "Planning to become pregnant", value: "planning-pregnancy", points: 1, tags: ["planningPregnancy", "periodontal"] },
      { label: "Post-menopausal", value: "post-menopausal", points: 1, tags: ["postMenopausal", "airway"] },
      { label: "Diagnosed with endometriosis, PCOS, or thyroid condition", value: "hormonal-condition", points: 2, tags: ["hormonalCondition", "inflammation"] },
      { label: "None of the above", value: "female-none", points: 0, tags: [] },
    ],
  },
  {
    id: "male-context",
    question: "Which of these apply to you as a man?",
    subtext: "Men face distinct cardiovascular and metabolic risk patterns. These signals help us personalize your oral-systemic interpretation.",
    showIf: { questionId: "biological-sex", value: "sex-male" },
    multiSelect: true,
    options: [
      { label: "High blood pressure or on blood pressure medication", value: "male-htn", points: 2, tags: ["hypertension", "airway", "cvRisk"] },
      { label: "History of heart disease or cardiac event", value: "male-cv", points: 3, tags: ["cvHistory", "cvRisk", "inflammation"] },
      { label: "Told I snore heavily or have sleep apnea", value: "male-osa", points: 2, tags: ["airway", "osa"] },
      { label: "Father or brother with heart disease before age 55", value: "male-family-cv", points: 2, tags: ["cvHistory", "cvRisk"] },
      { label: "None of the above", value: "male-none", points: 0, tags: [] },
    ],
  },
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
    question: "Does your mouthwash contain alcohol, chlorhexidine, or essential oils (thymol, eucalyptol, menthol)?",
    subtext: "These active ingredients kill the bacteria your body uses to produce nitric oxide, which helps regulate blood pressure and HRV. Check the back label under 'Active Ingredients'.",
    options: [
      { label: "Daily", value: "mouthwash-daily", points: 2, tags: ["nitrateLow", "mouthwash"] },
      { label: "A few times a week", value: "mouthwash-sometimes", points: 1, tags: ["mouthwash"] },
      { label: "Rarely or never", value: "mouthwash-never", points: 0, tags: [] },
    ],
  },
  {
    id: "gums",
    question: "Have you ever been told you have gum disease, or do your gums bleed when you brush?",
    subtext: "Bleeding gums are a sign of periodontal inflammation \u2014 and the bacteria responsible have been directly detected in coronary artery plaques at autopsy. For women, gum disease during pregnancy is associated with a 5.56\u00d7 increased risk of preeclampsia and 2-3\u00d7 higher risk of preterm delivery. Periodontal treatment in the second trimester is recommended.",
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
    subtext: "People with obstructive sleep apnea are nearly 2.5 times more likely to have periodontal disease \u2014 confirmed across meta-analyses of 88,000+ patients. OSA-related intermittent hypoxia accelerates periodontal tissue breakdown, while periodontal inflammation elevates the CRP that disrupts sleep architecture. Cnvrg tracks OSA-associated oral taxa as a signal that this shared inflammatory pathway may be active.",
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
  {
    id: "family-perio",
    question: "Have you ever been told you are prone to gum disease, or does gum disease run in your family?",
    subtext: "Twin studies show that approximately 50% of susceptibility to periodontal disease is genetic. IL-1\u03b2 gene polymorphisms independently increase disease severity. A family history of periodontitis is a clinically meaningful risk signal \u2014 independent of hygiene habits.",
    options: [
      { label: "Yes \u2014 dentist has told me I\u2019m prone to gum disease", value: "family-perio-yes", points: 3, tags: ["familyHistoryPerio", "geneticPerioRisk"] },
      { label: "Yes \u2014 family members have gum disease", value: "family-perio-family", points: 2, tags: ["familyHistoryPerio"] },
      { label: "No known history", value: "family-perio-no", points: 0, tags: [] },
    ],
  },
  {
    id: "fatigue",
    question: "Do you feel exhausted or unrefreshed even after what seems like a full night of sleep?",
    subtext: "Chronic exhaustion despite adequate sleep duration is one of the patterns population research associates with disrupted nighttime breathing. The oral microbiome carries signatures of altered breathing that Cnvrg tracks.",
    options: [
      { label: "Yes \u2014 most mornings", value: "fatigue-most", points: 2, tags: ["fatigue", "airway"] },
      { label: "Sometimes", value: "fatigue-some", points: 1, tags: ["fatigue"] },
      { label: "Rarely or never", value: "fatigue-never", points: 0, tags: [] },
    ],
  },
  {
    id: "systemic-conditions",
    question: "Do you have rheumatoid arthritis, lupus, or high blood pressure?",
    subtext: "Rheumatoid arthritis, lupus, and other autoimmune conditions are 3-9\u00d7 more common in women than men. P. gingivalis \u2014 the primary periodontal pathogen \u2014 produces an enzyme that may trigger the autoimmune cascades underlying RA. Treating periodontitis has been shown to reduce RA disease activity markers.",
    multiSelect: true,
    options: [
      { label: "Rheumatoid arthritis", value: "systemic-ra", points: 2, tags: ["rheumatoidArthritis", "periodontal", "autoimmune"] },
      { label: "Lupus or other autoimmune condition", value: "systemic-autoimmune", points: 2, tags: ["autoimmune", "periodontal"] },
      { label: "High blood pressure", value: "systemic-htn", points: 2, tags: ["hypertension", "airway"] },
      { label: "None of the above", value: "systemic-none", points: 0, tags: [] },
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
  const tags = [...new Set(selected.flatMap(o => o.tags))]

  // Determine which questions were visible (check showIf conditions)
  const visibleQuestions = QUIZ_QUESTIONS.filter(q => {
    if (!q.showIf) return true
    return selectedValues.some(v => v === q.showIf!.value)
  })
  const maxScore = visibleQuestions.reduce((sum, q) => sum + Math.max(...q.options.map(o => o.points)), 0)

  const ratio = maxScore > 0 ? totalScore / maxScore : 0
  const tier: QuizResult["tier"] = ratio >= 0.6 ? "high" : ratio >= 0.3 ? "moderate" : "low"

  const insights = buildInsights(tags)
  return { score: totalScore, maxScore, tier, tags, ...insights }
}

// ── Insight copy ───────────────────────────────────────────────────────────

function buildInsights(tags: string[]): Pick<QuizResult, "primaryInsight" | "secondaryInsight" | "tertiaryInsight"> {
  const hasPerio = tags.includes("periodontal")
  const hasCv = tags.includes("cvHistory") || tags.includes("cvRisk")
  const hasAirway = tags.includes("airway") || tags.includes("osa")
  const hasOsa = tags.includes("osa")
  const hasNitrate = tags.includes("nitrateLow") || tags.includes("mouthwash")
  const hasInflam = tags.includes("inflammation")
  const hasPregnant = tags.includes("pregnant") || tags.includes("planningPregnancy")
  const hasAutoimmune = tags.includes("autoimmune") || tags.includes("rheumatoidArthritis")
  const hasHormonal = tags.includes("hormonalCondition")
  const hasPostMeno = tags.includes("postMenopausal")
  const isFemale = tags.includes("sexFemale")
  const isMale = tags.includes("sexMale")
  const hasHtn = tags.includes("hypertension")

  let primaryInsight: string

  // ── Female-specific paths ──────────────────────────────────────────────
  if (isFemale && hasPregnant && hasPerio) {
    primaryInsight = "Your oral health is directly connected to your pregnancy outcomes. Women with periodontitis are 5.56\u00d7 more likely to develop preeclampsia, and 2-3\u00d7 more likely to experience preterm delivery. The good news: periodontal treatment in the second trimester is safe and recommended. Your oral panel measures the specific bacterial burden driving this risk."
  } else if (isFemale && hasPregnant) {
    primaryInsight = "Pregnancy changes your oral microbiome in ways that matter beyond your mouth. Hormonal shifts increase gingival inflammation and create conditions that favor periodontal pathogens. Women with periodontitis face 5.56\u00d7 higher preeclampsia risk. Cnvrg would measure your periodontal pathogen load alongside your inflammatory markers to give you a complete picture."
  } else if (isFemale && hasAutoimmune && hasPerio) {
    primaryInsight = "Your immune system and your oral microbiome are speaking the same inflammatory language. RA, lupus, and other autoimmune conditions are 3-9\u00d7 more common in women. P. gingivalis \u2014 the primary periodontal pathogen \u2014 produces an enzyme called PAD that citrullinates host proteins, potentially triggering the autoimmune cascades underlying RA. Nonsurgical periodontal treatment has been shown to reduce disease activity markers in RA patients."
  } else if (isFemale && hasAutoimmune) {
    primaryInsight = "Autoimmune conditions and periodontal disease share overlapping inflammatory pathways. RA patients are 4.68\u00d7 more likely to have periodontitis. P. gingivalis possesses an enzyme that citrullinates host proteins, potentially triggering the autoimmune cascades underlying RA. The oral microbiome is a modifiable factor in autoimmune disease activity."
  } else if (isFemale && hasHormonal && (hasPerio || hasNitrate)) {
    primaryInsight = "Hormonal shifts directly alter your oral microbiome. Estrogen fluctuations affect periodontal tissue inflammation throughout the cycle, during pregnancy, and at menopause. Thyroid dysfunction is associated with salivary gland changes that deplete nitrate-reducing bacteria \u2014 the same bacteria your blood vessels depend on for blood pressure regulation. Cnvrg tracks both signals."
  } else if (isFemale && hasPostMeno && (hasAirway || hasCv)) {
    primaryInsight = "After menopause, cardiovascular and sleep apnea risk converge. Risk of sleep apnea increases significantly after menopause due to loss of progesterone\u2019s protective effect on upper airway tone. OSA patients are 2.46\u00d7 more likely to have periodontitis. Meanwhile estrogen loss accelerates periodontal attachment loss and cardiovascular risk simultaneously. Cnvrg tracks the intersection of all three."

  // ── Male-specific paths ────────────────────────────────────────────────
  } else if (isMale && hasCv && hasPerio) {
    primaryInsight = "Your heart history and your oral microbiome are connected through the same inflammatory pathway. Periodontal pathogens have been physically detected in human coronary artery plaques at autopsy. The AHA\u2019s 2026 Scientific Statement confirmed periodontal disease increases ASCVD risk through bacteremia and chronic systemic inflammation \u2014 with Mendelian randomization confirming directional causality. If you have a cardiac history, your oral panel is not just a dental metric."
  } else if (isMale && hasHtn && hasNitrate) {
    primaryInsight = "The bacteria in your mouth may be influencing your blood pressure. Nitrate-reducing oral bacteria \u2014 Neisseria, Rothia, Veillonella \u2014 convert dietary nitrate to nitric oxide, the molecule your blood vessels use to regulate pressure. Men using antiseptic mouthwash show measurable blood pressure increases within 7 days as these bacteria are depleted. Two out of three hypertensive patients on medication don\u2019t have their blood pressure adequately controlled \u2014 this pathway may explain part of why."
  } else if (isMale && hasOsa && hasPerio) {
    primaryInsight = "Sleep apnea and gum disease share a biological pathway \u2014 and you may have both. OSA patients are 2.46\u00d7 more likely to have periodontitis across meta-analyses of 88,000+ people. Intermittent hypoxia from OSA drives oxidative stress that accelerates periodontal tissue breakdown, while periodontal inflammation elevates the systemic CRP that disrupts sleep architecture. Cnvrg tracks both panels because treating one affects the other."
  } else if (isMale && hasCv && !hasPerio) {
    primaryInsight = "Family history of heart disease changes how we interpret your oral panel. Periodontal disease is an independent cardiovascular risk factor \u2014 one your cardiologist is unlikely to have mentioned. Men with a family history of early heart disease and elevated periodontal pathogen burden face compounding risk. The bacteremia from inflamed gum tissue is continuous and systemic, not limited to dental appointments."

  // ── Generic paths (no sex match or prefer-not-to-say) ──────────────────
  } else if (hasPerio && hasCv && hasAirway) {
    primaryInsight = "Your cardiovascular history, sleep signals, and oral health share one biological pathway. Periodontal bacteria enter the bloodstream and trigger the same inflammatory response your doctor measures with CRP. Those same bacteria predict sleep-disordered breathing before a polysomnogram would catch it. You have flagged signals in all three panels."
  } else if (hasPerio && hasCv) {
    primaryInsight = "Your cardiovascular history has an oral origin most cardiologists never check. P. gingivalis and T. denticola \u2014 periodontal pathogens \u2014 have been physically detected in human coronary artery plaques at autopsy. Your cardiovascular risk profile and your oral microbiome are not separate conversations."
  } else if (hasCv && hasInflam) {
    primaryInsight = "Elevated inflammation and cardiovascular history compound each other \u2014 and the oral microbiome contributes to both. Residual inflammatory risk is predictive of cardiac events independent of cholesterol. Periodontal pathogen load contributes to systemic CRP elevation."
  } else if (hasAirway && (hasPerio || hasNitrate)) {
    primaryInsight = "Your airway signals have an oral microbiome signature. OSA-associated bacteria \u2014 Prevotella and Fusobacterium \u2014 are detectable in the oral cavity before a sleep study would flag disordered breathing. Your nitrate pathway may also be compromised, reducing the nitric oxide your airways need."
  } else if (hasCv) {
    primaryInsight = "The conditions you flagged are directly connected to the oral microbiome through shared inflammatory pathways. Periodontal bacteria have been physically detected in coronary artery plaques in autopsy studies. Most people managing these conditions have never looked at the oral source."
  } else if (hasAirway) {
    primaryInsight = "The sleep and airway signals you flagged share a biological pathway with your oral health. People with OSA are nearly 2.5 times more likely to have periodontal disease. OSA-related intermittent hypoxia accelerates periodontal tissue breakdown, while periodontal inflammation elevates the CRP that disrupts sleep architecture."
  } else if (hasAutoimmune) {
    primaryInsight = "Autoimmune conditions and periodontal disease share a biological pathway \u2014 and treating one may improve the other. RA patients are 4.68\u00d7 more likely to have periodontitis. P. gingivalis possesses an enzyme that citrullinates host proteins, potentially triggering the anti-citrullinated protein antibodies that are the hallmark biomarker of RA."
  } else if (hasNitrate) {
    primaryInsight = "Your nitrate pathway may be compromised \u2014 and a daily habit could be the cause. The bacteria that convert dietary nitrate into nitric oxide \u2014 your blood vessels\u2019 primary vasodilator \u2014 are killed by the active ingredients in many mouthwashes (alcohol, chlorhexidine, and essential oils like thymol). Switching to a fluoride-only rinse is free and one of the fastest changes you can make."
  } else {
    primaryInsight = "Your answers suggest your oral microbiome may be under mild stress \u2014 not from a single dramatic signal, but from a combination of small gaps in the pathways that connect your mouth to your cardiovascular and sleep health."
  }

  // Append genetic susceptibility note when relevant
  if (tags.includes("familyHistoryPerio") || tags.includes("geneticPerioRisk")) {
    primaryInsight += " Note: approximately 50% of periodontal susceptibility is genetic. An elevated oral panel score reflects biological vulnerability \u2014 not just hygiene habits."
  }

  let secondaryInsight: string
  if (hasNitrate || tags.includes("mouthwash")) {
    secondaryInsight = "Cnvrg measures your nitrate-reducing bacteria specifically \u2014 Neisseria, Rothia, and Veillonella \u2014 and connects their abundance to your HRV and blood pressure data. This is a signal no standard dental exam or blood panel has ever shown you."
  } else if (hasAirway) {
    secondaryInsight = "Cnvrg tracks OSA-associated taxa \u2014 Prevotella and Fusobacterium \u2014 and cross-references them with your sleep wearable data. If your oral microbiome is flagging airway risk and your HRV confirms it, that\u2019s a cross-panel signal no single test could generate."
  } else {
    secondaryInsight = "Cnvrg sequences your oral microbiome at species level \u2014 not just diversity, but which specific bacteria are present and at what levels \u2014 and connects that data to your blood markers and nightly sleep physiology."
  }

  const tertiaryInsight = "What you\u2019ve never seen is how all of this connects in one picture. Your oral microbiome, your hs-CRP, your HRV \u2014 they\u2019re part of the same system. Cnvrg is the first platform that shows you all three together."

  return { primaryInsight, secondaryInsight, tertiaryInsight }
}

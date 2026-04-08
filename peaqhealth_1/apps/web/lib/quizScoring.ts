// lib/quizScoring.ts

export interface QuizAnswers {
  q1_nitrate: "rarely" | "few_times" | "daily"
  q2_mouthwash: "none" | "antiseptic" | "alcohol_free" | "unsure"
  q3_airway: Array<"snore" | "grind" | "mouth_breathe" | "none">
  q4_dental: "recent" | "within_2yr" | "over_2yr" | "emergency_only" | "deep_cleaning_recommended"
  q5_cv_history: Array<"crp" | "blood_pressure" | "cholesterol_lpa" | "prediabetes" | "heart_disease" | "none">
  q6_awareness: "never_heard" | "didnt_know_connected" | "curious" | "done_standalone"
}

export interface QuizResult {
  score: number
  riskLevel: "low" | "moderate" | "higher"
  tags: {
    airway: boolean
    cvHistory: boolean
    mouthwash: boolean
    nitrateLow: boolean
  }
  primaryInsight: string
  secondaryInsight: string
  tertiaryInsight: string
}

export function scoreQuiz(answers: QuizAnswers): QuizResult {
  let score = 0

  // Q1 — Nitrate diet (0-2 pts)
  if (answers.q1_nitrate === "rarely") score += 2
  if (answers.q1_nitrate === "few_times") score += 1

  // Q2 — Mouthwash (0-2 pts)
  if (answers.q2_mouthwash === "antiseptic") score += 2
  if (answers.q2_mouthwash === "unsure") score += 1

  // Q3 — Airway signals (0-3 pts, 1 per signal)
  const airwaySignals = answers.q3_airway.filter(a => a !== "none")
  score += Math.min(airwaySignals.length, 3)

  // Q4 — Dental care (0-3 pts)
  const dentalScore: Record<string, number> = {
    recent: 0, within_2yr: 1, over_2yr: 2,
    emergency_only: 3, deep_cleaning_recommended: 3,
  }
  score += dentalScore[answers.q4_dental] ?? 0

  // Q5 — CV history (0-3 pts, 1 per signal, max 3)
  const cvSignals = answers.q5_cv_history.filter(a => a !== "none")
  score += Math.min(cvSignals.length, 3)

  // Q6 — no scoring weight

  const riskLevel: QuizResult["riskLevel"] =
    score <= 3 ? "low" : score <= 7 ? "moderate" : "higher"

  const tags = {
    airway: airwaySignals.length > 0,
    cvHistory: cvSignals.length > 0,
    mouthwash: answers.q2_mouthwash === "antiseptic" || answers.q2_mouthwash === "unsure",
    nitrateLow: answers.q1_nitrate === "rarely",
  }

  const insights = buildInsights(tags, riskLevel)
  return { score, riskLevel, tags, ...insights }
}

function buildInsights(
  tags: QuizResult["tags"],
  _riskLevel: QuizResult["riskLevel"],
): Pick<QuizResult, "primaryInsight" | "secondaryInsight" | "tertiaryInsight"> {

  let primaryInsight: string
  if (tags.cvHistory && tags.airway) {
    primaryInsight = "Your cardiovascular history and sleep signals share a biological pathway \u2014 and it runs through your mouth. Periodontal bacteria that enter the bloodstream trigger the same inflammatory response your doctor measures with CRP. The airway stress signals you flagged are often visible in the oral microbiome before a sleep study catches them."
  } else if (tags.cvHistory) {
    primaryInsight = "The conditions you flagged \u2014 elevated inflammation, blood pressure, or cardiovascular history \u2014 are directly connected to the oral microbiome through shared inflammatory pathways. Periodontal bacteria have been physically detected in coronary artery plaques in autopsy studies. Most people managing these conditions have never looked at the oral source."
  } else if (tags.airway) {
    primaryInsight = "The sleep and airway signals you flagged are often detectable in the oral microbiome before a sleep study would catch them. A 2022 study found oral microbiome composition predicted obstructive sleep apnea with 91.9% accuracy. Grinding and mouth breathing are physical signs that your airway is under stress \u2014 and your oral bacteria may be reflecting that stress biochemically."
  } else if (tags.mouthwash && tags.nitrateLow) {
    primaryInsight = "Two of your answers connect to the same pathway. Your diet suggests low nitrate-reducing bacterial activity \u2014 and antiseptic mouthwash directly depletes the bacteria responsible for that pathway. Together, these signals suggest your nitric oxide production may be compromised. That pathway connects directly to blood pressure regulation and cardiovascular recovery."
  } else {
    primaryInsight = "Your answers suggest your oral microbiome may be under mild stress \u2014 not from a single dramatic signal, but from a combination of small gaps in the pathways that connect your mouth to your cardiovascular and sleep health."
  }

  let secondaryInsight: string
  if (tags.nitrateLow || tags.mouthwash) {
    secondaryInsight = "Peaq measures your nitrate-reducing bacteria specifically \u2014 Neisseria, Rothia, and Veillonella \u2014 and connects their abundance to your HRV and blood pressure data. This is a signal no standard dental exam or blood panel has ever shown you."
  } else if (tags.airway) {
    secondaryInsight = "Peaq tracks OSA-associated taxa \u2014 Prevotella and Fusobacterium \u2014 and cross-references them with your sleep wearable data. If your oral microbiome is flagging airway risk and your HRV confirms it, that\u2019s a cross-panel signal no single test could generate."
  } else {
    secondaryInsight = "Peaq sequences your oral microbiome at species level \u2014 not just diversity, but which specific bacteria are present and at what levels \u2014 and connects that data to your blood markers and nightly sleep physiology."
  }

  const tertiaryInsight = "What you\u2019ve never seen is how all of this connects in one picture. Your oral microbiome, your hs-CRP, your HRV \u2014 they\u2019re part of the same system. Peaq is the first platform that shows you all three together."

  return { primaryInsight, secondaryInsight, tertiaryInsight }
}

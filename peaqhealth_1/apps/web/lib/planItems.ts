// Deterministic plan-item generator from snapshot statuses.
// Global logic — applies to any user. Priority sort: 1 = highest.

export type MarkerStatus = "red" | "amber" | "optimal" | "good" | "moderate" | "low" | "missing" | null

export interface PlanInput {
  // Marker statuses — callers derive these from snapshot + raw data
  good_bacteria_status?: MarkerStatus
  harmful_bacteria_status?: MarkerStatus
  cavity_risk_status?: MarkerStatus
  diversity_status?: MarkerStatus
  ldl_status?: MarkerStatus
  hs_crp_status?: MarkerStatus
  glucose_status?: MarkerStatus
  hba1c_status?: MarkerStatus
  vitamin_d_status?: MarkerStatus
  lpa_status?: MarkerStatus
  recovery_hrv_status?: MarkerStatus
  consistency_status?: MarkerStatus
  // Lifestyle flags — drive suppression rules
  uses_antiseptic_mouthwash?: boolean
  flossing_daily?: boolean
  // Phase A — new lifestyle fields
  smoking_status?: string | null
  sugar_intake?: string | null
  antibiotics_window?: string | null
  dietary_nitrate_frequency?: string | null
  // Oral species for cross-referencing
  fusobacterium_pct?: number | null
  porphyromonas_pct?: number | null
  aggregatibacter_pct?: number | null
  neisseria_pct?: number | null
  s_mutans_pct?: number | null
  s_sobrinus_pct?: number | null
  shannon_diversity?: number | null
}

export interface PlanItem {
  id: string
  title: string
  why: string
  timing: string
  priority: number
  marker_link?: string
  marker_label?: string
  reframed?: boolean
}

const TRIGGER: Record<string, (s: MarkerStatus) => boolean> = {
  red_amber: s => s === "red" || s === "amber",
  red_amber_missing: s => s === "red" || s === "amber" || s === "missing",
  low_moderate: s => s === "low" || s === "moderate",
  missing: s => s === "missing",
}

const GENERATED: Record<string, {
  match: (i: PlanInput) => boolean
  item: Omit<PlanItem, "id">
}> = {
  hs_crp: {
    match: i => TRIGGER.red_amber_missing(i.hs_crp_status ?? null),
    item: {
      title: "Add hs-CRP to your next blood draw",
      why: "hs-CRP is the inflammation marker most relevant to biological aging — and it's the missing input blocking your full biological age calculation. It's not on a standard panel. Ask for it specifically.",
      timing: "Next draw",
      priority: 1,
      marker_link: "/dashboard/blood/hs_crp",
      marker_label: "hs-CRP",
    },
  },
  ldl: {
    match: i => TRIGGER.red_amber(i.ldl_status ?? null),
    item: {
      title: "Ask your doctor about your LDL at your next visit",
      why: "Your cholesterol is flagged. Combined with your oral panel, there are two independent signals pointing at cardiovascular strain. Bring the full picture to your doctor — not just the LDL number.",
      timing: "Next appointment",
      priority: 1,
      marker_link: "/dashboard/blood/ldl",
      marker_label: "LDL",
    },
  },
  harmful_bacteria: {
    match: i => TRIGGER.red_amber(i.harmful_bacteria_status ?? null),
    item: {
      title: "Schedule a periodontal evaluation",
      why: "Elevated harmful bacteria in your oral panel is the upstream input for inflammation and cardiovascular signals. A periodontal evaluation — not just a standard cleaning — assesses pocket depth and bacterial load. Tell your dentist your blood panel found elevated inflammation.",
      timing: "This month",
      priority: 1,
      marker_link: "/dashboard/oral/harmful_bacteria",
      marker_label: "Harmful bacteria",
    },
  },
  lpa: {
    match: i => TRIGGER.missing(i.lpa_status ?? null),
    item: {
      title: "Add Lp(a) to your next blood draw",
      why: "Lp(a) is a genetically determined cardiovascular risk factor that doesn't appear on a standard lipid panel. The ACC now recommends everyone test it at least once. Knowing your number changes how aggressively you should manage other modifiable factors.",
      timing: "Next draw",
      priority: 2,
      marker_link: "/dashboard/blood/lpa",
      marker_label: "Lp(a)",
    },
  },
  recovery_hrv: {
    match: i => TRIGGER.low_moderate(i.recovery_hrv_status ?? null),
    item: {
      title: "Focus on sleep consistency to rebuild your HRV",
      why: "Your recovery HRV is in the lower range for your age and sex. HRV reflects how well your parasympathetic nervous system is operating. Anchoring your bedtime within a 30-minute window — even on weekends — is the single most impactful lever for improving it.",
      timing: "This week",
      priority: 2,
      marker_link: "/dashboard/sleep/recovery_hrv",
      marker_label: "Recovery HRV",
    },
  },
  glucose: {
    match: i => TRIGGER.red_amber(i.glucose_status ?? null),
    item: {
      title: "Watch meal timing — when you eat matters for blood sugar",
      why: "Your blood sugar is flagged. The oral bacteria that compete with your nitrate reducers also impair glucose handling through the same nitric oxide pathway. Avoiding large carbohydrate loads late at night is the lowest-friction lever.",
      timing: "This week",
      priority: 3,
      marker_link: "/dashboard/blood/glucose",
      marker_label: "Blood sugar",
    },
  },
  consistency: {
    match: i => TRIGGER.red_amber(i.consistency_status ?? null),
    item: {
      title: "Anchor your bedtime within a 30-minute window",
      why: "Sleep timing consistency — more than duration — drives the circadian signals that regulate immune balance, CRP, and HRV. Anchoring your wake time first, even on weekends, is the single most impactful change.",
      timing: "This week",
      priority: 3,
      marker_link: "/dashboard/sleep/consistency",
      marker_label: "Sleep consistency",
    },
  },
  hba1c: {
    match: i => TRIGGER.red_amber(i.hba1c_status ?? null),
    item: {
      title: "Review your HbA1c trend with your doctor",
      why: "HbA1c reflects average blood sugar over three months — it catches metabolic drift that a single fasting glucose test misses. If it's trending up, the oral-metabolic connection in your panel is worth discussing.",
      timing: "Next appointment",
      priority: 3,
      marker_link: "/dashboard/blood/hba1c",
      marker_label: "HbA1c",
    },
  },
  vitamin_d: {
    match: i => TRIGGER.red_amber_missing(i.vitamin_d_status ?? null),
    item: {
      title: "Test your vitamin D if you haven't recently",
      why: "Vitamin D affects oral tissue integrity, immune regulation, and sleep architecture — three systems Cnvrg tracks. Deficiency is common and easy to correct. Ask for 25-OH vitamin D specifically.",
      timing: "Next draw",
      priority: 4,
      marker_link: "/dashboard/blood/vitamin_d",
      marker_label: "Vitamin D",
    },
  },
}

// ─── Suppression + reframe rules ────────────────────────────────────────────
// Applied AFTER GENERATED matches, BEFORE final plan assembly.

function buildLifestyleItems(input: PlanInput): PlanItem[] {
  const out: PlanItem[] = []

  // stop-mouthwash: suppressed if good_bacteria is healthy OR user doesn't use antiseptic
  const goodBacteriaHealthy = input.good_bacteria_status === "optimal" || input.good_bacteria_status === "good"
  if (input.uses_antiseptic_mouthwash === true && !goodBacteriaHealthy) {
    out.push({
      id: "stop-mouthwash",
      title: "Stop antiseptic mouthwash",
      why: "Antiseptic mouthwash suppresses the bacteria that produce nitric oxide — the same bacteria that support healthy blood pressure and cardiovascular function. Switch to a fluoride-only rinse.",
      timing: "Today",
      priority: 1,
    })
  }

  // leafy-greens-beetroot: reframed as maintenance if good_bacteria is healthy, action if not
  if (goodBacteriaHealthy) {
    out.push({
      id: "leafy-greens-beetroot-maintain",
      title: "Keep up the leafy greens and beetroot",
      why: "Your nitrate-reducing bacteria are already strong — the vegetables are working. Keep eating them to maintain this.",
      timing: "Ongoing",
      priority: 5,
      reframed: true,
      marker_link: "/dashboard/oral/good_bacteria",
      marker_label: "Good bacteria",
    })
  } else if (input.good_bacteria_status === "red" || input.good_bacteria_status === "amber" || input.good_bacteria_status === "low") {
    out.push({
      id: "leafy-greens-beetroot",
      title: "Add leafy greens and beetroot to your diet",
      why: "Your nitrate-reducing bacteria are depleted. Arugula, spinach, and beetroot juice feed the bacteria that produce nitric oxide — visible results within 10 days.",
      timing: "This week",
      priority: 2,
      marker_link: "/dashboard/oral/good_bacteria",
      marker_label: "Good bacteria",
    })
  }

  // start-flossing: suppressed if user already flosses daily
  if (input.flossing_daily === false && (input.harmful_bacteria_status === "red" || input.harmful_bacteria_status === "amber")) {
    out.push({
      id: "start-flossing",
      title: "Start flossing daily",
      why: "Flossing is the single most effective home intervention for reducing harmful bacteria in the gum line. It matters more than brushing for the species driving your inflammation markers.",
      timing: "Today",
      priority: 2,
    })
  }

  // ── Phase A: 5 new rules from orphaned questionnaire fields ──

  const isCurrentSmoker = input.smoking_status === "current_daily" || input.smoking_status === "current_social" || input.smoking_status === "vape_daily" || input.smoking_status === "current"
  const recentAntibiotics = input.antibiotics_window === "within_1_month" || input.antibiotics_window === "within_3_months"

  // RULE 1 — Smoking × gum bacteria
  if (isCurrentSmoker && ((input.fusobacterium_pct ?? 0) > 1.0 || (input.porphyromonas_pct ?? 0) > 0.5 || (input.neisseria_pct ?? 999) < 5)) {
    out.push({
      id: "smoking-oral-impact",
      title: "Cut back on smoking / vaping",
      why: "Any reduction helps. Nicotine replacement patches and gum don't have the same microbiome impact. Pair with dietary nitrate support during the transition.",
      timing: "This month",
      priority: 1,
    })
  }

  // RULE 2 — Sugar frequency × cavity bacteria
  const highSugar = input.sugar_intake === "often" || input.sugar_intake === "multiple_daily" || input.sugar_intake === "every_meal"
  const cavityBacteriaElevated = (input.s_mutans_pct ?? 0) > 0.5 || (input.s_sobrinus_pct ?? 0) > 0.3
  if (highSugar && cavityBacteriaElevated) {
    out.push({
      id: "reduce-sugar-frequency",
      title: "Reduce sugar frequency (not total)",
      why: "Limit to 3 meals + 1 deliberate snack. No sipping sugary drinks throughout the day. Water between meals. Frequency of sugar exposure matters more than total amount — each exposure creates a 20-minute acid attack.",
      timing: "This week",
      priority: 2,
    })
  }

  // RULE 3 — Antibiotics × diversity suppression
  if (recentAntibiotics && ((input.shannon_diversity ?? 999) < 4.0 || (input.neisseria_pct ?? 999) < 5)) {
    out.push({
      id: "post-antibiotic-recovery",
      title: "Support post-antibiotic recovery",
      why: "Fermented foods daily. 30 different plants per week. Avoid adding antiseptic stressors during recovery. Retest at 3 months, not earlier — your microbiome is still recovering.",
      timing: "Ongoing",
      priority: 3,
    })
  }

  // RULE 4 — Flossing escalation: daily flosser but gum bacteria still elevated
  if (input.flossing_daily === true && ((input.fusobacterium_pct ?? 0) > 1.0 || (input.porphyromonas_pct ?? 0) > 0.5 || (input.aggregatibacter_pct ?? 0) > 0.5)) {
    out.push({
      id: "flossing-escalation",
      title: "Flossing alone isn't enough",
      why: "Book a periodontal exam for pocket depth measurement. Daily flossing has limits when inflammation persists below the gumline. Bring your Cnvrg report — periodontists find bacterial data clinically useful.",
      timing: "This month",
      priority: 1,
    })
  }

  // RULE 5 — Dietary nitrate escalation: eating greens but Neisseria still low
  const highNitrate = input.dietary_nitrate_frequency === "daily" || input.dietary_nitrate_frequency === "multiple_daily" || input.dietary_nitrate_frequency === "several_weekly"
  if (highNitrate && (input.neisseria_pct ?? 999) < 10 && !isCurrentSmoker) {
    out.push({
      id: "nitrate-suppressor-check",
      title: "Check what's suppressing your nitrate-reducing bacteria",
      why: "Your diet supports these bacteria — but they're still not thriving. Review your mouthwash type, whitening frequency, or any medications that reduce saliva flow. The suppressor is usually one of these.",
      timing: "This week",
      priority: 2,
    })
  }

  return out
}

export function generatePlanItems(input: PlanInput): PlanItem[] {
  const items: PlanItem[] = []

  for (const [id, g] of Object.entries(GENERATED)) {
    if (g.match(input)) items.push({ id, ...g.item })
  }

  items.push(...buildLifestyleItems(input))

  items.sort((a, b) => a.priority - b.priority)
  return items
}

// ─── Status derivation helpers ──────────────────────────────────────────────
// Maps snapshot + raw data to MarkerStatus values used by the generator.

export function statusFromThresholds(
  value: number | null | undefined,
  thresholds: { optimalMax?: number; watchMax?: number; optimalMin?: number; watchMin?: number; inverted?: boolean },
): MarkerStatus {
  if (value == null || value === 0) return "missing"
  const { optimalMax, watchMax, optimalMin, watchMin, inverted } = thresholds
  if (inverted) {
    // Higher is better
    if (optimalMin != null && value >= optimalMin) return "optimal"
    if (watchMin != null && value >= watchMin) return "amber"
    return "red"
  }
  if (optimalMax != null && value < optimalMax) return "optimal"
  if (watchMax != null && value < watchMax) return "amber"
  return "red"
}

export interface StatusInput {
  lab?: Record<string, unknown> | null
  oral?: Record<string, unknown> | null
  snapshot?: Record<string, unknown> | null
  sleepNights?: Array<Record<string, unknown>> | null
  lifestyle?: Record<string, unknown> | null
}

export function deriveMarkerStatuses(data: StatusInput): PlanInput {
  const lab = data.lab
  const oral = data.oral
  const snapshot = data.snapshot
  const breakdown = (snapshot?.peaq_age_breakdown ?? {}) as Record<string, unknown>
  const lifestyle = data.lifestyle
  const nights = (data.sleepNights ?? []) as Array<Record<string, unknown>>
  const avg = (key: string) => {
    const v = nights.map(n => Number(n[key])).filter(x => !isNaN(x) && x > 0)
    return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null
  }

  // Blood
  const ldl = (lab?.ldl_mgdl as number | null) ?? null
  const hsCrp = (lab?.hs_crp_mgl as number | null) ?? null
  const glucose = (lab?.glucose_mgdl as number | null) ?? null
  const hba1c = (lab?.hba1c_pct as number | null) ?? null
  const vitaminD = (lab?.vitamin_d_ngml as number | null) ?? null
  const lpa = (lab?.lpa_mgdl as number | null) ?? null

  // Oral
  const omaPct = (snapshot?.oma_percentile as number | null) ?? (breakdown.omaPct as number | null) ?? null
  const pathogenPct = oral?.periodontopathogen_pct != null ? (oral.periodontopathogen_pct as number) * 100 : null
  const shannon = (oral?.shannon_diversity as number | null) ?? null

  // Sleep
  const hrvStatus = snapshot?.hrv_status as string | null
  const hrvNights = (snapshot?.hrv_nights_count as number | null) ?? 0

  return {
    ldl_status: statusFromThresholds(ldl, { optimalMax: 100, watchMax: 130 }),
    hs_crp_status: hsCrp != null && hsCrp > 0
      ? statusFromThresholds(hsCrp, { optimalMax: 1.0, watchMax: 3.0 })
      : "missing",
    glucose_status: statusFromThresholds(glucose, { optimalMax: 100, watchMax: 125 }),
    hba1c_status: statusFromThresholds(hba1c, { optimalMax: 5.7, watchMax: 6.4 }),
    vitamin_d_status: vitaminD != null && vitaminD > 0
      ? statusFromThresholds(vitaminD, { optimalMin: 50, watchMin: 30, inverted: true })
      : "missing",
    lpa_status: lpa != null && lpa > 0 ? statusFromThresholds(lpa, { optimalMax: 30, watchMax: 50 }) : "missing",
    good_bacteria_status: omaPct != null
      ? (omaPct >= 60 ? "optimal" : omaPct >= 40 ? "amber" : "red")
      : null,
    harmful_bacteria_status: pathogenPct != null
      ? (pathogenPct < 1 ? "optimal" : pathogenPct < 5 ? "amber" : "red")
      : null,
    diversity_status: shannon != null
      ? (shannon >= 3.5 ? "optimal" : shannon >= 2.5 ? "amber" : "red")
      : null,
    cavity_risk_status: null,
    recovery_hrv_status: hrvStatus && hrvNights >= 14
      ? (hrvStatus as MarkerStatus)
      : null,
    consistency_status: null,
    uses_antiseptic_mouthwash: lifestyle?.mouthwash_type === "antiseptic" || lifestyle?.mouthwash_type === "alcohol",
    flossing_daily: lifestyle?.flossing_freq === "daily" || lifestyle?.flossing_freq === "twice_daily",
    smoking_status: (lifestyle?.smoking_status as string | null) ?? null,
    sugar_intake: (lifestyle?.sugar_intake as string | null) ?? null,
    antibiotics_window: (lifestyle?.antibiotics_window as string | null) ?? null,
    dietary_nitrate_frequency: (lifestyle?.dietary_nitrate_frequency as string | null) ?? null,
    fusobacterium_pct: oral?.fusobacterium_pct != null ? (oral.fusobacterium_pct as number) * 100 : null,
    porphyromonas_pct: oral?.porphyromonas_pct != null ? (oral.porphyromonas_pct as number) * 100 : null,
    aggregatibacter_pct: oral?.aggregatibacter_pct != null ? (oral.aggregatibacter_pct as number) * 100 : null,
    neisseria_pct: oral?.neisseria_pct != null ? (oral.neisseria_pct as number) * 100 : null,
    s_mutans_pct: oral?.s_mutans_pct != null ? (oral.s_mutans_pct as number) * 100 : null,
    s_sobrinus_pct: oral?.s_sobrinus_pct != null ? (oral.s_sobrinus_pct as number) * 100 : null,
    shannon_diversity: (oral?.shannon_diversity as number | null) ?? null,
  }
}

// ─── What's Working signal links ────────────────────────────────────────────
export const SIGNAL_LINKS: Record<string, string> = {
  good_bacteria: "/dashboard/oral/good_bacteria",
  diversity: "/dashboard/oral/diversity",
  deep_sleep: "/dashboard/sleep/deep_sleep",
  rem: "/dashboard/sleep/rem",
  duration: "/dashboard/sleep/duration",
  hrv: "/dashboard/sleep/recovery_hrv",
  phenoage: "/dashboard/blood",
  vitamin_d: "/dashboard/blood/vitamin_d",
  ldl: "/dashboard/blood/ldl",
  low_crp: "/dashboard/blood/hs_crp",
}

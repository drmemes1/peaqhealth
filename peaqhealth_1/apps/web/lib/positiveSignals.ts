// Positive Signals — surface what's working alongside what needs attention.
// Derives favorable signals from snapshot + panel data using deterministic rules.

export interface PositiveSignalInput {
  oral?: {
    shannonDiversity?: number
    nitrateReducersPct?: number
    species?: Record<string, number>
  } | null
  blood?: {
    hsCRP?: number
    ldl?: number
    vitaminD?: number
  } | null
  sleep?: {
    deepPct?: number
    remPct?: number
    hrv?: number
  } | null
  snapshot?: {
    hrv_percentile?: number | null
    hrv_status?: string | null
    pheno_age?: number | null
    oma_percentile?: number | null
    sleep_duration_hrs_avg?: number | null
  } | null
  chronoAge?: number | null
  peaqAgeBreakdown?: Record<string, unknown> | null
}

type Signal = { key: string; text: string; priority: number }

export interface PositiveSignal { key: string; text: string }

export function derivePositiveSignalsKeyed(input: PositiveSignalInput): PositiveSignal[] {
  const raw = derivePositiveSignalsInternal(input)
  return raw.map(s => ({ key: s.key, text: s.text }))
}

export function derivePositiveSignals(input: PositiveSignalInput): string[] {
  return derivePositiveSignalsInternal(input).map(s => s.text)
}

function derivePositiveSignalsInternal(input: PositiveSignalInput): Signal[] {
  const signals: Signal[] = []
  const { oral, blood, sleep, snapshot, chronoAge, peaqAgeBreakdown } = input
  const breakdown = peaqAgeBreakdown as Record<string, number | undefined> | null | undefined

  // Cross-panel: highest priority
  const phenoAge = snapshot?.pheno_age ?? (breakdown?.phenoAge as number | undefined) ?? null
  if (phenoAge != null && chronoAge != null && chronoAge - phenoAge >= 2) {
    signals.push({
      key: "phenoage",
      text: `Your blood age is ${(chronoAge - phenoAge).toFixed(1)} years younger than your calendar age`,
      priority: 1,
    })
  }

  const hrvPct = snapshot?.hrv_percentile ?? null
  const hrvStatus = snapshot?.hrv_status ?? null
  if (hrvPct != null && hrvPct >= 60) {
    signals.push({
      key: "hrv",
      text: `Your recovery HRV is in the ${Math.round(hrvPct)}th percentile for your age and sex`,
      priority: 1,
    })
  } else if (hrvStatus === "optimal" || hrvStatus === "good") {
    signals.push({
      key: "hrv",
      text: "Your recovery HRV is in the healthy range for your age and sex",
      priority: 1,
    })
  }

  // Oral
  const omaPct = snapshot?.oma_percentile ?? (breakdown?.omaPct as number | undefined) ?? null
  if (omaPct != null && omaPct >= 65) {
    signals.push({
      key: "good_bacteria",
      text: `Your oral microbiome is in the top ${Math.max(1, Math.round(100 - omaPct))}% for your age`,
      priority: 2,
    })
  } else if (oral?.nitrateReducersPct != null && oral.nitrateReducersPct >= 10) {
    signals.push({
      key: "good_bacteria",
      text: "Your nitrate-reducing bacteria are strong — nitric oxide pathway active",
      priority: 2,
    })
  }

  if (oral?.shannonDiversity != null && oral.shannonDiversity >= 3.5) {
    signals.push({
      key: "diversity",
      text: "Your oral diversity is in the healthy range — a resilient microbiome",
      priority: 2,
    })
  }

  // Blood
  if (blood?.hsCRP != null && blood.hsCRP > 0 && blood.hsCRP < 1.0) {
    signals.push({
      key: "low_crp",
      text: "Your inflammation marker is low — a strong signal for long-term health",
      priority: 2,
    })
  }
  if (blood?.ldl != null && blood.ldl > 0 && blood.ldl < 100) {
    signals.push({
      key: "ldl",
      text: "Your LDL cholesterol is well-controlled",
      priority: 3,
    })
  }
  if (blood?.vitaminD != null && blood.vitaminD >= 50) {
    signals.push({
      key: "vitamin_d",
      text: "Your vitamin D is in the optimal range",
      priority: 3,
    })
  }

  // Sleep
  if (sleep?.deepPct != null && sleep.deepPct >= 20) {
    signals.push({
      key: "deep_sleep",
      text: `Your deep sleep (${sleep.deepPct.toFixed(0)}%) is above the typical range`,
      priority: 3,
    })
  }
  if (sleep?.remPct != null && sleep.remPct >= 20) {
    signals.push({
      key: "rem",
      text: `Your REM sleep (${sleep.remPct.toFixed(0)}%) is supporting memory and recovery`,
      priority: 3,
    })
  }
  const durHrs = snapshot?.sleep_duration_hrs_avg ?? null
  if (durHrs != null && durHrs >= 7 && durHrs <= 8.5) {
    signals.push({
      key: "duration",
      text: `You're averaging ${durHrs.toFixed(1)} hours — in the optimal window`,
      priority: 3,
    })
  }

  // Sort by priority then dedupe by key, max 5
  signals.sort((a, b) => a.priority - b.priority)
  const seen = new Set<string>()
  const deduped: Signal[] = []
  for (const s of signals) {
    if (seen.has(s.key)) continue
    seen.add(s.key)
    deduped.push(s)
    if (deduped.length >= 5) break
  }
  return deduped
}

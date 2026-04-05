// lib/hrv-scoring.ts
//
// HRV SCORING — DUAL FRAMEWORK
//
// Two independent signals, scored separately, combined conservatively.
//
// LAYER 1 — Population percentile (age + sex adjusted)
// Where you stand relative to healthy peers.
// Source: Tegegne BS et al. Reference values of heart rate variability
// from 10-second resting electrocardiograms: the Lifelines Cohort Study.
// Eur J Prev Cardiol. 2020;27(19):2191–2194. n=84,772.
// Largest single-cohort RMSSD normative dataset published.
// Excludes CVD, hypertension, T2DM, obesity — healthy reference only.
//
// LAYER 2 — Personal trend (30-day rolling baseline)
// Whether you are rising or falling relative to yourself.
// A sustained drop of ≥20% below your 30-day average flags Watch
// regardless of population percentile — acute stress shows up here
// before population norms can detect it.
// Source: Brozat M, Böckelmann I, Sammito S. Systematic Review on
// HRV Reference Values. J Cardiovasc Dev Dis. 2025;12(6):214.
//
// BIOLOGICAL CONTEXT
// HRV is not only a sleep metric. Declining HRV reflects autonomic
// nervous system imbalance — specifically the loss of parasympathetic
// tone that normally suppresses systemic inflammation via the
// cholinergic anti-inflammatory pathway. This makes low HRV both a
// consequence and a driver of inflammaging (hallmark #11 of aging,
// López-Otín et al., Cell 2023). When HRV is low and hsCRP is
// elevated, these are not two independent findings — they are two
// faces of the same biological process.
// Source: Olivieri F et al. Heart rate variability and autonomic
// nervous system imbalance: Potential biomarkers and detectable
// hallmarks of aging and inflammaging.
// Ageing Res Rev. 2024 Nov;101:102521. PMID 39341508.

export type HrvStatus = 'optimal' | 'good' | 'watch' | 'attention'

export interface HrvThresholds {
  optimal: number   // ~75th percentile for age/sex
  good: number      // ~50th percentile (median)
  watch: number     // ~25th percentile
  // below watch → attention
}

export interface HrvScoreResult {
  populationStatus: HrvStatus
  trendStatus: HrvStatus | null   // null if <30 days of data
  finalStatus: HrvStatus          // most conservative of the two
  thresholds: HrvThresholds
  ageBin: string
  sex: 'male' | 'female'
}

// ─── Normative tables ─────────────────────────────────────────────────────
// Derived from Tegegne et al. 2020 Table 1 (Lifelines Cohort, n=84,772)
// Median RMSSD (50th percentile) used as "good" threshold.
// 75th and 25th percentiles approximated from mean ± 0.67 SD.
// Wearable RMSSD (nightly) correlates strongly with ECG RMSSD (r≈0.9);
// population-relative ranking is preserved even with small systematic offset.

const NORMS: Record<'male' | 'female', Record<string, HrvThresholds>> = {
  male: {
    '20-24': { optimal: 68, good: 48, watch: 32 },
    '25-29': { optimal: 62, good: 42, watch: 28 },
    '30-34': { optimal: 55, good: 37, watch: 24 },
    '35-39': { optimal: 48, good: 33, watch: 21 },
    '40-44': { optimal: 42, good: 29, watch: 18 },
    '45-49': { optimal: 37, good: 26, watch: 16 },
    '50-54': { optimal: 33, good: 24, watch: 14 },
    '55-59': { optimal: 30, good: 21, watch: 13 },
    '60-64': { optimal: 27, good: 19, watch: 11 },
    '65+':   { optimal: 25, good: 18, watch: 10 },
  },
  female: {
    '20-24': { optimal: 76, good: 52, watch: 35 },
    '25-29': { optimal: 70, good: 48, watch: 32 },
    '30-34': { optimal: 62, good: 42, watch: 28 },
    '35-39': { optimal: 55, good: 38, watch: 25 },
    '40-44': { optimal: 49, good: 34, watch: 22 },
    '45-49': { optimal: 42, good: 29, watch: 18 },
    '50-54': { optimal: 37, good: 27, watch: 16 },
    '55-59': { optimal: 32, good: 23, watch: 13 },
    '60-64': { optimal: 28, good: 21, watch: 12 },
    '65+':   { optimal: 25, good: 18, watch: 10 },
  },
}

function getAgeBin(age: number): string {
  if (age < 25) return '20-24'
  if (age < 30) return '25-29'
  if (age < 35) return '30-34'
  if (age < 40) return '35-39'
  if (age < 45) return '40-44'
  if (age < 50) return '45-49'
  if (age < 55) return '50-54'
  if (age < 60) return '55-59'
  if (age < 65) return '60-64'
  return '65+'
}

const STATUS_ORDER: HrvStatus[] = ['optimal', 'good', 'watch', 'attention']

export function scoreHrv(
  rmssd: number,
  age: number,
  sex: 'male' | 'female',
  rollingAvg30d: number | null
): HrvScoreResult {
  const ageBin = getAgeBin(age)
  const thresholds = NORMS[sex][ageBin]

  // Layer 1 — population percentile
  let populationStatus: HrvStatus
  if (rmssd >= thresholds.optimal)     populationStatus = 'optimal'
  else if (rmssd >= thresholds.good)   populationStatus = 'good'
  else if (rmssd >= thresholds.watch)  populationStatus = 'watch'
  else                                  populationStatus = 'attention'

  // Layer 2 — personal trend vs 30-day rolling average
  let trendStatus: HrvStatus | null = null
  if (rollingAvg30d !== null && rollingAvg30d > 0) {
    const dropFraction = (rollingAvg30d - rmssd) / rollingAvg30d
    if (dropFraction >= 0.30)      trendStatus = 'attention'  // ≥30% below baseline
    else if (dropFraction >= 0.20) trendStatus = 'watch'      // ≥20% below baseline
    else if (dropFraction >= 0.10) trendStatus = 'good'       // mild dip, within variation
    else                           trendStatus = 'optimal'    // at or above baseline
  }

  // Final = most conservative signal of the two
  const popIdx   = STATUS_ORDER.indexOf(populationStatus)
  const trendIdx = trendStatus ? STATUS_ORDER.indexOf(trendStatus) : 0
  const finalStatus = STATUS_ORDER[Math.max(popIdx, trendIdx)]

  return { populationStatus, trendStatus, finalStatus, thresholds, ageBin, sex }
}

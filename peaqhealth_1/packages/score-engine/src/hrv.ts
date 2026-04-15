// Recovery HRV — Pinheiro 2023 normalization
// Tracks RMSSD as a live dashboard signal with a 14-night minimum gate.
// Data source: sleep_data.hrv_rmssd (any wearable — WHOOP, Oura, Garmin, Apple Watch).
// Formula weight NOT active yet (hasHRV = false). Dot is live, weight held pending product decision.
// See docs/HRV.md for full specification.

export const PINHEIRO_NORMS: Record<string, Record<string, [number, number, number]>> = {
  male: {
    "18-25": [47, 62, 84],
    "26-35": [39, 52, 72],
    "36-45": [32, 44, 61],
    "46-55": [26, 36, 51],
    "56-65": [21, 30, 43],
    "65+":   [18, 26, 38],
  },
  female: {
    "18-25": [52, 68, 91],
    "26-35": [43, 57, 78],
    "36-45": [35, 48, 66],
    "46-55": [27, 38, 53],
    "56-65": [22, 31, 44],
    "65+":   [19, 27, 39],
  },
}

export type HRVStatus = "optimal" | "good" | "moderate" | "low"

export interface HRVResult {
  rmssd_median: number
  percentile: number
  delta: number | null
  nights_count: number
  status: HRVStatus
  has_minimum_nights: boolean
}

export function getAgeBracket(age: number): string {
  if (age < 26) return "18-25"
  if (age < 36) return "26-35"
  if (age < 46) return "36-45"
  if (age < 56) return "46-55"
  if (age < 66) return "56-65"
  return "65+"
}

export function applyIQRClipping(values: number[]): number[] {
  if (values.length < 4) return values
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return values.filter(v => v >= lower && v <= upper)
}

export function rollingMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

export function calculateHRVPercentile(
  rmssdMedian: number,
  age: number,
  sex: "male" | "female",
): number {
  const bracket = getAgeBracket(age)
  const norms = PINHEIRO_NORMS[sex][bracket]
  const [p25, p50, p75] = norms

  if (rmssdMedian <= p25) return Math.max(0, (rmssdMedian / p25) * 25)
  if (rmssdMedian <= p50) return 25 + ((rmssdMedian - p25) / (p50 - p25)) * 25
  if (rmssdMedian <= p75) return 50 + ((rmssdMedian - p50) / (p75 - p50)) * 25
  return Math.min(99, 75 + ((rmssdMedian - p75) / (p75 * 0.5)) * 24)
}

export function getHRVStatus(percentile: number): HRVStatus {
  if (percentile >= 65) return "optimal"
  if (percentile >= 40) return "good"
  if (percentile >= 20) return "moderate"
  return "low"
}

export function calculateHRV(
  rawNights: Array<{ date: string; rmssd: number }>,
  age: number,
  sex: "male" | "female",
  previousMedian?: number,
): HRVResult {
  const MIN_NIGHTS = 14

  const recent = rawNights
    .filter(n => Number.isFinite(n.rmssd) && n.rmssd > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30)
    .map(n => n.rmssd)

  if (recent.length < MIN_NIGHTS) {
    return {
      rmssd_median: 0,
      percentile: 0,
      delta: null,
      nights_count: recent.length,
      status: "low",
      has_minimum_nights: false,
    }
  }

  const clipped = applyIQRClipping(recent)
  const median = rollingMedian(clipped)
  const percentile = calculateHRVPercentile(median, age, sex)
  const status = getHRVStatus(percentile)
  const delta = previousMedian != null ? median - previousMedian : null

  return {
    rmssd_median: Math.round(median * 10) / 10,
    percentile: Math.round(percentile),
    delta: delta != null ? Math.round(delta * 10) / 10 : null,
    nights_count: recent.length,
    status,
    has_minimum_nights: true,
  }
}

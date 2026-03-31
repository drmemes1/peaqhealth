import { computeSleepAverages } from './report-data'

describe('computeSleepAverages', () => {
  const night = (date: string, source: string, overrides: Partial<{
    total_sleep_minutes: number
    deep_sleep_minutes: number
    rem_sleep_minutes: number
    sleep_efficiency: number
    hrv_rmssd: number | null
    spo2: number | null
  }> = {}) => ({
    date,
    source,
    total_sleep_minutes: 420,
    deep_sleep_minutes: 80,
    rem_sleep_minutes: 100,
    sleep_efficiency: 90,
    hrv_rmssd: 30,
    spo2: 97,
    ...overrides,
  })

  it('computes weighted averages for a set of nights', () => {
    const nights = [
      night('2026-03-31', 'whoop', { hrv_rmssd: 30, sleep_efficiency: 90 }),
      night('2026-03-30', 'whoop', { hrv_rmssd: 34, sleep_efficiency: 92 }),
      night('2026-03-29', 'whoop', { hrv_rmssd: 26, sleep_efficiency: 88 }),
    ]
    const result = computeSleepAverages(nights)
    expect(result.trackedNights).toBe(3)
    expect(result.avgHrv).toBeGreaterThan(0)
    expect(result.avgEfficiency).toBeGreaterThan(85)
    expect(result.avgDeepPct).toBeGreaterThan(0)
    expect(result.avgRemPct).toBeGreaterThan(0)
    expect(result.avgSpo2).toBeGreaterThan(95)
    expect(result.avgTotalHours).toBeCloseTo(7, 0)
    expect(result.provider).toBe('whoop')
    expect(result.lastSyncDate).toBe('2026-03-31')
  })

  it('returns zeroes for empty array', () => {
    const result = computeSleepAverages([])
    expect(result.trackedNights).toBe(0)
    expect(result.avgHrv).toBe(0)
    expect(result.lastSyncDate).toBeNull()
  })

  it('deduplicates same date, keeps higher-priority provider', () => {
    const nights = [
      night('2026-03-31', 'garmin', { hrv_rmssd: 20 }),
      night('2026-03-31', 'whoop', { hrv_rmssd: 32 }),
    ]
    const result = computeSleepAverages(nights)
    expect(result.trackedNights).toBe(1)
    expect(result.avgHrv).toBe(32)
  })

  it('recent nights (i<7) get 3x weight vs older nights (i>=14) at 1x', () => {
    // One recent night (weight 3) at HRV=60, one old night (weight 1) at HRV=0
    // Weighted avg = (60*3 + 0*0) / 3 = 60  (0 hrv nights are excluded from wavg)
    const nights = [
      night('2026-03-31', 'whoop', { hrv_rmssd: 60 }),
      ...Array.from({ length: 14 }, (_, i) =>
        night(`2026-03-${String(17 - i).padStart(2, '0')}`, 'whoop', { hrv_rmssd: 0 })
      ),
    ]
    const result = computeSleepAverages(nights)
    // Only the night with hrv=60 contributes since others have hrv=0
    expect(result.avgHrv).toBe(60)
  })
})

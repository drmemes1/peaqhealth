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

// ─── report-pdf.tsx smoke test ────────────────────────────────────────────────

jest.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => String(children ?? ''),
  View: ({ children }: { children: React.ReactNode }) => children,
  Image: () => null,
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  Font: { register: jest.fn() },
}))

import React from 'react'
import { buildReportDocument } from './report-pdf'
import type { ReportData } from './report-data'

const minimalData: ReportData = {
  fullName: 'Test Patient', email: 'test@example.com',
  score: 62, baseScore: 66, sleepSub: 18, bloodSub: 32, oralSub: 16,
  modifierTotal: -4,
  modifiersApplied: [{ id: 'm1', panels: ['oral', 'blood'], direction: 'penalty', points: 4, label: 'Oral-systemic inflammation', rationale: 'Elevated P. gingivalis alongside hs-CRP >1.0.' }],
  engineVersion: '8.1', calculatedAt: '2026-03-31T00:00:00Z',
  labs: { ldl_mgdl: 79, hdl_mgdl: 48, hs_crp_mgl: 1.18, lpa_mgdl: 44.88, lab_name: 'LabCorp' },
  labName: 'LabCorp', collectionDate: '2026-03-15',
  sleepAverages: { trackedNights: 23, provider: 'whoop', avgHrv: 27.2, avgEfficiency: 90.1, avgDeepPct: 28.9, avgRemPct: 27.1, avgSpo2: 97.3, avgTotalHours: 7.1, lastSyncDate: '2026-03-30' },
  shannonDiversity: 2.32, nitrateReducerPct: 13.0, periodontopathogenPct: 9.0, osaTaxaPct: 10.0,
  neuroSignalPct: null, metabolicSignalPct: null, proliferativeSignalPct: null,
  rawOtu: { 'Porphyromonas gingivalis': 9.0, 'Fusobacterium nucleatum': 10.0, 'Neisseria subflava': 8.0 },
  reportDate: '2026-03-01', oralScoreSnapshot: null,
  ageRange: '40_49', exerciseLevel: 'moderate', smokingStatus: 'never',
  brushingFreq: 'once_daily', flossingFreq: 'never', mouthwashType: 'none',
  lastDentalVisit: 'over_one_year', knownHypertension: false, knownDiabetes: false,
}

describe('buildReportDocument', () => {
  it('returns a truthy element without throwing for complete data', () => {
    expect(() => buildReportDocument(minimalData, null)).not.toThrow()
    expect(buildReportDocument(minimalData, null)).toBeTruthy()
  })

  it('handles null oral data without throwing', () => {
    const nullOral: ReportData = {
      ...minimalData,
      shannonDiversity: null, nitrateReducerPct: null, periodontopathogenPct: null,
      osaTaxaPct: null, rawOtu: null, reportDate: null,
    }
    expect(() => buildReportDocument(nullOral, null)).not.toThrow()
  })

  it('handles no sleep data without throwing', () => {
    const noSleep: ReportData = {
      ...minimalData,
      sleepAverages: { trackedNights: 0, provider: '', avgHrv: 0, avgEfficiency: 0, avgDeepPct: 0, avgRemPct: 0, avgSpo2: 0, avgTotalHours: 0, lastSyncDate: null },
    }
    expect(() => buildReportDocument(noSleep, null)).not.toThrow()
  })
})

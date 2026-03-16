export type Flag = 'good' | 'watch' | 'attention' | 'pending'

export interface SleepFlagData {
  deepPct: number
  hrv: number
  spo2Dips: number
  remPct: number
  efficiency: number
}

export interface BloodFlagData {
  hsCRP: number
  vitaminD: number
  apoB: number
  ldlHdlRatio: number
  hba1c: number
  lpa: number
  triglycerides: number
}

export interface OralFlagData {
  shannonDiversity: number
  nitrateReducersPct: number
  periodontPathPct: number
  osaTaxaPct: number
}

export function sleepFlags(d: SleepFlagData): Record<string, Flag> {
  return {
    deep:       d.deepPct >= 17 ? 'good' : 'watch',
    hrv:        d.hrv >= 50 ? 'good' : d.hrv >= 35 ? 'watch' : 'attention',
    spo2Dips:   d.spo2Dips <= 2 ? 'good' : d.spo2Dips <= 5 ? 'watch' : 'attention',
    rem:        d.remPct >= 18 ? 'good' : 'watch',
    efficiency: d.efficiency >= 85 ? 'good' : 'watch',
  }
}

export function bloodFlags(d: BloodFlagData): Record<string, Flag> {
  return {
    hsCRP:     d.hsCRP < 0.5 ? 'good' : d.hsCRP < 2.0 ? 'watch' : 'attention',
    vitaminD:  d.vitaminD >= 30 && d.vitaminD <= 60 ? 'good' : d.vitaminD >= 20 ? 'watch' : 'attention',
    apoB:      d.apoB < 90 ? 'good' : d.apoB < 120 ? 'watch' : 'attention',
    ldlHdl:    d.ldlHdlRatio < 2.0 ? 'good' : d.ldlHdlRatio < 3.0 ? 'watch' : 'attention',
    hba1c:     d.hba1c < 5.4 ? 'good' : d.hba1c < 5.7 ? 'watch' : 'attention',
    lpa:       d.lpa < 30 ? 'good' : d.lpa < 50 ? 'watch' : 'attention',
    tg:        d.triglycerides < 150 ? 'good' : d.triglycerides < 200 ? 'watch' : 'attention',
  }
}

export function oralFlags(d: OralFlagData): Record<string, Flag> {
  return {
    shannon:   d.shannonDiversity >= 3.0 ? 'good' : d.shannonDiversity >= 2.0 ? 'watch' : 'attention',
    nitrate:   d.nitrateReducersPct >= 5 ? 'good' : d.nitrateReducersPct >= 2 ? 'watch' : 'attention',
    periodont: d.periodontPathPct < 0.5 ? 'good' : d.periodontPathPct < 1.5 ? 'watch' : 'attention',
    osa:       d.osaTaxaPct < 1.0 ? 'good' : d.osaTaxaPct < 2.0 ? 'watch' : 'attention',
  }
}

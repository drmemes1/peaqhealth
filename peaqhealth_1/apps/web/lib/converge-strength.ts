export function computeConvergeStrength(coverage: {
  oral: { percent: number }
  blood: { percent: number }
  sleep: { percent: number }
}): number {
  const panels = [coverage.oral.percent, coverage.blood.percent, coverage.sleep.percent]
  const complete = panels.filter(p => p >= 80).length
  const partial = panels.filter(p => p > 0 && p < 80).reduce((s, p) => s + p / 100, 0)

  if (complete === 3) return 100
  if (complete === 2) return Math.round(60 + partial * 20)
  if (complete === 1) return Math.round(25 + partial * 15)
  return Math.round(partial * 25)
}

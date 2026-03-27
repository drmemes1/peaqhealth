import { parseOralMicrobiome } from './oral-parser'
import { MOCK_ORAL_OPTIMAL, MOCK_ORAL_AVERAGE, MOCK_ORAL_DYSBIOTIC, MOCK_ORAL_MOUTHWASH } from './oral-mock-data'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗ ${name}: ${(e as Error).message}`)
    failed++
  }
}

function expect_val(val: unknown) {
  return {
    toBeGreaterThanOrEqual: (n: number) => { if ((val as number) < n) throw new Error(`${val} < ${n}`) },
    toBeLessThanOrEqual: (n: number) => { if ((val as number) > n) throw new Error(`${val} > ${n}`) },
    toBeGreaterThan: (n: number) => { if ((val as number) <= n) throw new Error(`${val} <= ${n}`) },
    toBeLessThan: (n: number) => { if ((val as number) >= n) throw new Error(`${val} >= ${n}`) },
    toBe: (v: unknown) => { if (val !== v) throw new Error(`${val} !== ${v}`) },
    toEqual: (v: unknown) => { if (JSON.stringify(val) !== JSON.stringify(v)) throw new Error(`${JSON.stringify(val)} !== ${JSON.stringify(v)}`) },
  }
}

console.log('\n=== oral-parser tests ===\n')

console.log('optimal profile:')
const opt = parseOralMicrobiome(MOCK_ORAL_OPTIMAL)
test('scores ≥20/25', () => expect_val(opt.total).toBeGreaterThanOrEqual(20))
test('nitrate > 10%', () => expect_val(opt.nitrateReducerPct).toBeGreaterThan(10))
test('P. gingivalis < 0.1%', () => expect_val(opt.pGingivalisPct).toBeLessThan(0.1))
test('mouthwash not detected', () => expect_val(opt.mouthwashDetected).toBe(false))
test('has positive findings', () => expect_val(opt.findings.some(f => f.priority === 'POSITIVE')).toBe(true))

console.log('\naverage profile:')
const avg = parseOralMicrobiome(MOCK_ORAL_AVERAGE)
test('scores 8–16/25', () => { expect_val(avg.total).toBeGreaterThanOrEqual(8); expect_val(avg.total).toBeLessThanOrEqual(16) })
test('has p-gingivalis-elevated finding', () => expect_val(avg.findings.some(f => f.id === 'p-gingivalis-elevated')).toBe(true))

console.log('\ndysbiotic profile:')
const dys = parseOralMicrobiome(MOCK_ORAL_DYSBIOTIC)
test('scores ≤5/25', () => expect_val(dys.total).toBeLessThanOrEqual(5))
test('has CRITICAL finding', () => expect_val(dys.findings.some(f => f.priority === 'CRITICAL')).toBe(true))
test('P. gingivalis > 1%', () => expect_val(dys.pGingivalisPct).toBeGreaterThan(1.0))
test('mouthwash detected', () => expect_val(dys.mouthwashDetected).toBe(true))

console.log('\nmouthwash profile:')
const mw = parseOralMicrobiome(MOCK_ORAL_MOUTHWASH)
test('mouthwash detected', () => expect_val(mw.mouthwashDetected).toBe(true))
test('nitrate < 3%', () => expect_val(mw.nitrateReducerPct).toBeLessThan(3))
test('first finding is mouthwash-detected', () => expect_val(mw.findings[0].id).toBe('mouthwash-detected'))

console.log('\nwatch signals:')
test('systemic inflammation signal > 0 for dysbiotic', () => expect_val(dys.watchSignals.systemicInflammationSignal).toBeGreaterThan(0))
test('gut-oral axis signal > 0 for dysbiotic', () => expect_val(dys.watchSignals.gutOralAxisSignal).toBeGreaterThan(0))

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)

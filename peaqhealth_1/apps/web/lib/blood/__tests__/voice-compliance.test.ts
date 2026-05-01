/**
 * Voice-compliance test — runs every populated MarkerDescriptor through
 * checkCopyForToneViolations from tone-guard.ts. Fails CI if any forbidden
 * phrase appears in user-facing fields.
 *
 * [PLACEHOLDER — needs clinical review] markers are exempt: they're
 * explicitly stub copy by design, will be replaced with reviewed content
 * before launch, and never reach a real user.
 */

import { BLOOD_MARKER_REGISTRY } from "../markerRegistry"
import { checkCopyForToneViolations } from "../../tone-guard"

const PLACEHOLDER_TAG = "[PLACEHOLDER — needs clinical review]"

function shouldSkip(s: string | undefined): boolean {
  if (!s) return true
  return s.includes(PLACEHOLDER_TAG)
}

describe("voice compliance — descriptors flagged by tone-guard", () => {
  for (const m of BLOOD_MARKER_REGISTRY) {
    if (!m.descriptor) continue
    describe(`${m.id}`, () => {
      const d = m.descriptor!

      test("reflection has no forbidden phrases", () => {
        if (shouldSkip(d.reflection)) return
        expect(checkCopyForToneViolations(d.reflection)).toEqual([])
      })

      test("whatItIs has no forbidden phrases", () => {
        if (shouldSkip(d.whatItIs)) return
        expect(checkCopyForToneViolations(d.whatItIs)).toEqual([])
      })

      test("raisesAndLowers.raises has no forbidden phrases", () => {
        if (shouldSkip(d.raisesAndLowers.raises)) return
        expect(checkCopyForToneViolations(d.raisesAndLowers.raises)).toEqual([])
      })

      test("raisesAndLowers.lowers has no forbidden phrases", () => {
        if (shouldSkip(d.raisesAndLowers.lowers)) return
        expect(checkCopyForToneViolations(d.raisesAndLowers.lowers)).toEqual([])
      })

      if (d.limitations !== undefined) {
        test("limitations has no forbidden phrases", () => {
          if (shouldSkip(d.limitations)) return
          expect(checkCopyForToneViolations(d.limitations!)).toEqual([])
        })
      }
    })
  }
})

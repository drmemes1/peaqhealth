export interface HalitosisModifier {
  id: string
  label: string
  type: "cap" | "bonus"
  value: number
  fired: boolean
  citation: string
}

export interface ModifierInput {
  mouthBreathingConfirmed: boolean
  dryMouthSeverity: number | null  // 1-5 scale from user_symptoms
  osaPattern: boolean
  gerdSymptoms: boolean
  xerogenicMedications: boolean
  tongueScraping: string | null  // "never" | "occasionally" | "most_days" | "every_morning"
  stressHigh: boolean
  sleepQualityLow: boolean
  badBreathSelf: string | null  // "fresh" | "morning_only" | "worry_daytime" | "partner_noted" | "chronic"
}

export function computeModifiers(input: ModifierInput): { modifiers: HalitosisModifier[]; effectiveCap: number; bonusTotal: number } {
  const modifiers: HalitosisModifier[] = []
  const caps: number[] = []

  // 1. Mouth breathing
  const mbFired = input.mouthBreathingConfirmed
  modifiers.push({ id: "mouth_breathing", label: "Mouth breathing", type: "cap", value: 75, fired: mbFired, citation: "Kikuchi2025" })
  if (mbFired) caps.push(75)

  // 2. Dry mouth
  const dmFired = input.dryMouthSeverity != null && input.dryMouthSeverity >= 3
  modifiers.push({ id: "dry_mouth", label: "Dry mouth", type: "cap", value: 70, fired: dmFired, citation: "Makeeva2021" })
  if (dmFired) caps.push(70)

  // 3. OSA pattern
  const osaFired = input.osaPattern
  modifiers.push({ id: "osa_pattern", label: "Sleep-disordered breathing", type: "cap", value: 65, fired: osaFired, citation: "Iranitalab2026" })
  if (osaFired) caps.push(65)

  // 4. GERD
  const gerdFired = input.gerdSymptoms
  modifiers.push({ id: "gerd", label: "Acid reflux", type: "cap", value: 70, fired: gerdFired, citation: "Struch2008" })
  if (gerdFired) caps.push(70)

  // 5. Xerogenic medications
  const xeroFired = input.xerogenicMedications
  modifiers.push({ id: "xerogenic_meds", label: "Dry-mouth medications", type: "cap", value: 70, fired: xeroFired, citation: "Makeeva2021" })
  if (xeroFired) caps.push(70)

  // 6. Tongue scraping bonus
  const tsFired = input.tongueScraping === "every_morning" || input.tongueScraping === "most_days"
  modifiers.push({ id: "tongue_scraping", label: "Tongue scraping", type: "bonus", value: 8, fired: tsFired, citation: "Popa2025" })

  // 7. Stress + sleep
  const stressFired = input.stressHigh && input.sleepQualityLow
  modifiers.push({ id: "stress_sleep", label: "Stress + poor sleep", type: "cap", value: 75, fired: stressFired, citation: "Iranitalab2026" })
  if (stressFired) caps.push(75)

  // Self-report override caps
  if (input.badBreathSelf === "chronic" || input.badBreathSelf === "partner_noted") {
    caps.push(60)
    modifiers.push({ id: "self_report_persistent", label: "Persistent self-reported breath", type: "cap", value: 60, fired: true, citation: "self-report" })
  } else if (input.badBreathSelf === "worry_daytime") {
    caps.push(70)
    modifiers.push({ id: "self_report_daytime", label: "Daytime breath concern", type: "cap", value: 70, fired: true, citation: "self-report" })
  } else if (input.badBreathSelf === "morning_only") {
    caps.push(80)
    modifiers.push({ id: "self_report_morning", label: "Morning breath only", type: "cap", value: 80, fired: true, citation: "self-report" })
  }

  const effectiveCap = caps.length > 0 ? Math.min(...caps) : 100
  const bonusTotal = tsFired ? 8 : 0

  return { modifiers, effectiveCap, bonusTotal }
}

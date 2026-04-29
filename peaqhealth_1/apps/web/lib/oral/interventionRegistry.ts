/**
 * Oravi Oral Intervention Registry
 * ================================
 *
 * Single source of truth for all oral microbiome interventions.
 * Used by the oral panel UI, narrative engine, and detail pages.
 *
 * ARCHITECTURE
 * ------------
 * Each intervention is a pure data object with:
 *   - triggers:   bacterial conditions that make this relevant (any-of)
 *   - gates:      user behavior conditions that make this actionable (all-of)
 *   - exclusions: disqualifying conditions (any-of) — optional
 *   - alternativeAffirm: what to show when triggered but user is doing it
 *   - escalation: what to show when user is doing it but marker stays bad
 *
 * The evaluator (separate file, future PR) walks every intervention
 * and classifies state:
 *   ACTIONABLE: triggered + gates pass + no exclusions   → surface
 *   AFFIRM:     triggered + user already doing it        → "keep it up"
 *   HIDDEN:     not triggered, or excluded               → don't show
 *   ESCALATE:   triggered + already doing + marker bad   → next step
 *
 * UNIT CONVENTION
 * ---------------
 * All bacterial trigger thresholds are expressed in PERCENTAGES (e.g. 1.0
 * means 1.0%), matching the oral_kit_orders.*_pct column scale that the
 * upload parser writes (see app/api/admin/oral-upload/route.ts). This is
 * intentional: the registry talks the same language as the user-facing UI.
 *
 * NOTE: lib/oral/thresholds.ts uses fraction-scale values (e.g.
 * fusobacterium typical_max: 0.005 = 0.5%). The two scales need to be
 * reconciled in a follow-up. See ADR-0012 "Threshold-alignment audit".
 */

export type EvidenceTier = 'strong' | 'moderate' | 'emerging'

export type InterventionCategory =
  | 'behavioral'
  | 'dietary'
  | 'product'
  | 'probiotic'
  | 'professional'

export type ComparisonOp = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not_in'

export type ConditionSource = 'bacteria' | 'questionnaire' | 'symptom' | 'computed'

export type Condition = {
  field: string
  source: ConditionSource
  op: ComparisonOp
  value: string | number | boolean | null | (string | number)[]
}

export type ConditionGroup = {
  anyOf?: Condition[]
  allOf?: Condition[]
}

export type InterventionAlternative = {
  title: string
  body: string
}

export type InterventionEscalation = {
  title: string
  body: string
  nextInterventionIds?: string[]
}

export type Intervention = {
  id: string
  title: string
  shortTitle?: string
  category: InterventionCategory
  evidenceTier: EvidenceTier

  triggers: ConditionGroup
  gates?: ConditionGroup
  exclusions?: ConditionGroup

  alternativeAffirm?: InterventionAlternative
  escalation?: InterventionEscalation

  rationale: string
  steps: string[]

  whatToTrack?: string
  expectedWeeks?: number
  retestMarker?: string

  citations: string[]
}

// ── Helper builders ──
const bacteria = (field: string, op: ComparisonOp, value: number | string): Condition =>
  ({ field, source: 'bacteria', op, value })

const q = (field: string, op: ComparisonOp, value: Condition['value']): Condition =>
  ({ field, source: 'questionnaire', op, value })

const symptom = (field: string, op: ComparisonOp, value: Condition['value']): Condition =>
  ({ field, source: 'symptom', op, value })

// ── Seed registry (3 interventions) ──

export const INTERVENTIONS: Intervention[] = [
  {
    id: 'address_mouth_breathing',
    title: 'Address nighttime mouth breathing',
    shortTitle: 'Fix mouth breathing',
    category: 'behavioral',
    evidenceTier: 'strong',

    triggers: {
      anyOf: [
        bacteria('fusobacterium_pct', '>', 1.0),
        bacteria('peptostreptococcus_pct', '>', 1.0),
        bacteria('haemophilus_pct', '<', 5.0),
      ],
    },

    gates: {
      anyOf: [
        q('mouthBreathing', '=', true),
        q('mouthBreathingWhen', 'in', ['night', 'day_and_night']),
        symptom('dry_mouth_morning', '>=', 3),
        q('snoringReported', '=', true),
      ],
    },

    exclusions: {
      anyOf: [
        q('nasalObstruction', '=', 'chronic_severe'),
        q('cpap_or_mad_in_use', '=', true),
      ],
    },

    alternativeAffirm: {
      title: "You're not mouth-breathing — good",
      body: "Nasal breathing preserves the oral microbiome's moisture and aerobic balance. Keep it up.",
    },

    escalation: {
      title: "Structural cause likely — behavioral fixes won't be enough",
      body: "Your mouth breathing is severe or paired with nasal obstruction. Behavioral interventions (mouth tape, Buteyko) won't work if anatomy forces mouth breathing. An ENT consult is the right next step.",
    },

    rationale:
      'Nighttime mouth breathing dries the oral cavity and shifts the environment toward anaerobes. This directly affects the bacteria your nitric oxide and inflammatory pathways depend on.',

    steps: [
      'Try mouth taping at night — 3M micropore tape or purpose-made strips',
      'Only tape if your nasal passage is clear; congestion rules this out',
      'Nasal breathing retraining during the day (Buteyko method)',
      'A humidifier in the bedroom helps on dry winter nights',
    ],

    whatToTrack:
      'Morning dry-mouth score should drop alongside bacterial rebalancing. Aerobic/anaerobic ratio is the cleanest marker.',
    expectedWeeks: 8,
    retestMarker: 'haemophilus_pct',

    citations: ['Lee 2017', 'Moeller 2014'],
  },

  {
    id: 'add_dietary_nitrate',
    title: 'Eat more nitrate-rich foods',
    shortTitle: 'Add leafy greens / beetroot',
    category: 'dietary',
    evidenceTier: 'strong',

    triggers: {
      anyOf: [bacteria('neisseria_pct', '<', 10)],
    },

    gates: {
      allOf: [q('dietaryNitrateFrequency', 'in', ['rarely', 'few_times_month', 'weekly'])],
    },

    alternativeAffirm: {
      title: 'Your nitrate intake is already strong',
      body: 'Keep it up — your dietary pattern is feeding the bacteria your cardiovascular health depends on.',
    },

    escalation: {
      title: 'Something else is suppressing your NR bacteria',
      body:
        "You're eating plenty of nitrate-rich foods, but your nitrate-reducing community is still low. This usually means an active suppressor — antiseptic mouthwash, smoking, or chronic dry mouth.",
    },

    rationale:
      "Your nitrate-reducing bacteria depend on substrate. If there's no dietary nitrate coming in, the pathway stays quiet even when the bacteria are present. Leafy greens and beets are the fuel.",

    steps: [
      'Add one serving of leafy greens daily — arugula, spinach, romaine',
      'Or 250ml beetroot juice 3–5× per week',
      "Beet greens count too — don't throw them out",
      'Timing matters: chew thoroughly, give bacteria time to work',
    ],

    whatToTrack:
      'Retest Neisseria at 8 weeks. Pair with BP tracking if possible — dietary nitrate response shows up as measurable systolic drop in responders.',
    expectedWeeks: 8,
    retestMarker: 'neisseria_pct',

    citations: ['Kapil 2015', 'Hobbs 2012', 'Bondonno 2018'],
  },

  {
    id: 'home_sleep_study',
    title: 'Home sleep apnea test',
    shortTitle: 'Home sleep study',
    category: 'professional',
    evidenceTier: 'strong',

    triggers: {
      anyOf: [
        bacteria('peptostreptococcus_pct', '>', 2),
        bacteria('haemophilus_pct', '<', 5.0),
        bacteria('fusobacterium_pct', '>', 1.5),
      ],
    },

    gates: {
      anyOf: [
        q('osaWitnessed', '=', true),
        q('snoringReported', '=', true),
        q('mouthBreathing', '=', true),
        symptom('morning_headache_freq', '>=', 3),
        symptom('daytime_fatigue_freq', '>=', 3),
      ],
    },

    exclusions: {
      anyOf: [
        q('cpap_or_mad_in_use', '=', true),
        q('prior_sleep_study_diagnosis', '=', 'osa_treated'),
      ],
    },

    rationale:
      'Your oral bacteria match a published OSA classifier signature (Chen 2022). Combined with your reported symptoms, a home sleep study is inexpensive and definitive. AHI > 5 changes the whole treatment pathway.',

    steps: [
      'Ask your primary care doctor for a home sleep test (HST) prescription',
      'Or use direct-to-consumer providers (Lofta, WatchPAT) — about $200',
      'Results come back in 1–2 weeks',
      "If AHI > 5, you'll be routed to a sleep medicine specialist",
    ],

    whatToTrack:
      'The AHI number itself. Bacterial signature will normalize 3–6 months after effective treatment starts.',
    expectedWeeks: 4,

    citations: ['Chen 2022', 'Wu 2022'],
  },
]

/** Lookup helper used by future component layers. */
export const getInterventionById = (id: string): Intervention | undefined =>
  INTERVENTIONS.find(i => i.id === id)

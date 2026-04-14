// ─── Types ───────────────────────────────────────────────────────────────────

export type ConnectionPriority = 1 | 2 | 3
export type ConnectionDirection = 'unfavorable' | 'favorable' | 'exploratory'
export type Panel = 'oral' | 'blood' | 'wearable' | 'lifestyle'

export interface ConnectionLine {
  fires: true
  rule_id: string
  priority: ConnectionPriority
  headline: string
  expanded: string
  action_nudge: string
  linked_panels: Panel[]
  direction: ConnectionDirection
}

export interface NoConnection { fires: false }
export type ConnectionResult = ConnectionLine | NoConnection

export interface ConnectionInput {
  age: number
  sex: 'male' | 'female' | null
  neisseria_pct: number | null
  porphyromonas_pct: number | null
  fusobacterium_pct: number | null
  peptostreptococcus_pct: number | null
  p_melaninogenica_pct: number | null
  veillonella_pct: number | null
  strep_mutans_pct: number | null
  solobacterium_pct: number | null
  protective_pct: number | null
  pathogen_inv_pct: number | null
  shannon_pct: number | null
  oma_pct: number | null
  oral_days_since_test: number | null
  ldl: number | null
  hs_crp: number | null
  hba1c: number | null
  glucose: number | null
  lpa: number | null
  vitamin_d: number | null
  mpv: number | null
  wbc: number | null
  rdw: number | null
  pheno_age: number | null
  blood_days_since_draw: number | null
  rhr_avg: number | null
  rhr_expected: number | null
  hrv_rmssd_avg: number | null
  hrv_nights: number | null
  hrv_percentile: number | null
  deep_sleep_min: number | null
  rem_min: number | null
  sleep_duration_hrs: number | null
  sleep_efficiency_pct: number | null
  sleep_regularity_sd: number | null
  wearable_nights: number | null
  mouthwash_type: string | null
  nasal_obstruction: boolean | null
  sinus_history: string | null
  known_conditions: string[] | null
  oma_pct_prev: number | null
  pheno_age_prev: number | null
  hs_crp_prev: number | null
  rhr_avg_prev: number | null
  sleep_duration_prev: number | null
  testosterone: number | null
  creatinine: number | null
}

// ─── Marker-to-Rule Mapping ──────────────────────────────────────────────────

export const MARKER_RULES: Record<string, string[]> = {
  'ldl':              ['1A', '1C', '17A'],
  'hs_crp':           ['1B', '1C', '2A', '2C', '3A', '3B', '15A', '17A', '18C'],
  'hba1c':            ['1E', '12A', '18A', '18B'],
  'glucose':          ['12B'],
  'vitamin_d':        ['16A', '16B'],
  'lpa':              ['17A'],
  'pheno_age':        ['15A', '15B'],
  'good_bacteria':    ['1C', '5A', '5B', '6A', '14A', '8D', '20B'],
  'harmful_bacteria': ['2A', '2B', '2C', '9A', '10A', '20B'],
  'cavity_risk':      ['7A', '12A'],
  'breath_health':    ['11A'],
  'diversity':        ['8A', '8B', '8D'],
  'inflammation_risk':['1B', '2A', '14A', '17A', '22A'],
  'deep_sleep':       ['3A', '3B', '4A', '16B', '19C'],
  'rem':              ['13B'],
  'duration':         ['3A', '3C', '15A', '18A', '18C', '19A'],
  'recovery_hrv':     ['2B', '3C', '9B', '8D', '18A', '18B', '18C'],
  'consistency':      ['3A', '3C', '19B'],
  'cholesterol':      ['1A', '17A'],
  'inflammation':     ['1B', '2A', '3A', '14A', '18C'],
  'blood_sugar':      ['1E', '12A', '12B', '18A', '18B', '19B'],
  'heart_health':     ['1A', '1D', '17A'],
  'cellular_health':  ['15A', '19A', '21A', '22A', '22B'],
  'vitamin_levels':   ['16A', '16B'],
  'creatinine':       ['20A', '20B'],
  'testosterone':     ['19C'],
}

// ─── QC Gates ────────────────────────────────────────────────────────────────

const RULE_PANELS: Record<string, Panel[]> = {
  '1A': ['oral','blood'], '1B': ['oral','blood'], '1C': ['oral','blood'],
  '1D': ['oral','wearable'], '1E': ['oral','blood'],
  '2A': ['oral','blood'], '2B': ['oral','wearable'], '2C': ['oral','blood'],
  '3A': ['wearable','blood'], '3B': ['wearable','blood'], '3C': ['wearable'],
  '4A': ['oral','wearable'],
  '5A': ['oral','wearable'], '5B': ['oral','wearable'],
  '6A': ['oral'], '7A': ['oral'],
  '8A': ['oral','blood'], '8B': ['oral','blood'], '8C': ['wearable'],
  '9A': ['oral'], '9B': ['oral','wearable'],
  '10A': ['oral','blood'],
  '11A': ['oral'],
  '12A': ['oral','blood'], '12B': ['oral','blood'],
  '13A': ['oral','wearable'], '13B': ['lifestyle','wearable'],
  '14A': ['lifestyle','oral','blood'],
  '15A': ['blood','wearable'], '15B': ['blood','oral'],
  '16A': ['blood','oral'], '16B': ['blood','wearable'],
  '17A': ['oral','blood','wearable'],
  '8D': ['oral','wearable'],
  '18A': ['wearable','blood'], '18B': ['wearable','blood'], '18C': ['wearable','blood'],
  '19A': ['wearable','blood'], '19B': ['wearable','blood'], '19C': ['wearable','blood'],
  '20A': ['oral','blood'], '20B': ['oral','blood'],
  '21A': ['oral','blood'], '22A': ['oral','blood'], '22B': ['oral','blood','wearable'],
}

function passesQCGates(rule_id: string, input: ConnectionInput): boolean {
  const panels = RULE_PANELS[rule_id] ?? []
  if (panels.includes('blood') && (input.blood_days_since_draw === null || input.blood_days_since_draw > 180)) return false
  if (panels.includes('oral') && (input.oral_days_since_test === null || input.oral_days_since_test > 180)) return false
  if (panels.includes('wearable') && (input.wearable_nights === null || input.wearable_nights < 14)) return false
  if (input.hs_crp !== null && input.hs_crp > 10.0 && panels.includes('blood')) return false
  if (['2B','3C','9B','8D','18B'].includes(rule_id) && (input.hrv_nights === null || input.hrv_nights < 14)) return false
  if (['1D','3C','5A','5B','18A','18C'].includes(rule_id) && (input.wearable_nights === null || input.wearable_nights < 7)) return false
  return true
}

// ─── Rule Checker Helpers ────────────────────────────────────────────────────

const NO_FIRE: NoConnection = { fires: false }

function line(
  rule_id: string,
  priority: ConnectionPriority,
  direction: ConnectionDirection,
  panels: Panel[],
  headline: string,
  expanded: string,
  action_nudge: string,
): ConnectionLine {
  return { fires: true, rule_id, priority, headline, expanded, action_nudge, linked_panels: panels, direction }
}

// ─── Individual Rule Checkers ────────────────────────────────────────────────

function checkRule1A(d: ConnectionInput): ConnectionResult {
  if (d.neisseria_pct !== null && d.neisseria_pct < 5 && d.ldl !== null && d.ldl > 130) {
    return line('1A', 1, 'unfavorable', ['oral','blood'],
      'Your oral bacteria may be making this harder to manage.',
      'The bacteria that help produce nitric oxide in your body are running low. Nitric oxide keeps blood vessels flexible and helps manage cholesterol transport. When this pathway weakens, LDL particles have a harder time being cleared efficiently. This is one of the connections only Peaq can see — your oral panel and blood panel are telling the same story.',
      'Check if you are using antiseptic mouthwash daily. That alone can wipe out the bacteria driving this connection.',
    )
  }
  return NO_FIRE
}

function checkRule1B(d: ConnectionInput): ConnectionResult {
  if (d.neisseria_pct !== null && d.neisseria_pct < 5 && d.hs_crp !== null && d.hs_crp > 3.0) {
    return line('1B', 1, 'unfavorable', ['oral','blood'],
      'Your oral microbiome and inflammation markers are connected here.',
      'The bacteria responsible for nitric oxide production are depleted. At the same time, your inflammation marker is elevated. These are not two separate problems — they share a biological pathway. When nitric oxide drops, blood vessels stiffen, blood pressure rises, and systemic inflammation increases. Your CRP is reflecting what your oral panel is already showing.',
      'The oral side is the most actionable. Removing antiseptic mouthwash, adding nitrate-rich vegetables, and considering a hydroxyapatite rinse can start rebuilding these bacteria within weeks.',
    )
  }
  return NO_FIRE
}

function checkRule1C(d: ConnectionInput): ConnectionResult {
  if (d.neisseria_pct !== null && d.neisseria_pct > 10 && d.hs_crp !== null && d.hs_crp < 1.0) {
    return line('1C', 2, 'favorable', ['oral','blood'],
      'Your oral health and inflammation levels are working together.',
      'The bacteria that produce nitric oxide are present in healthy numbers, and your systemic inflammation is low. When these two panels align, it is a strong signal of cardiovascular resilience.',
      'Maintain your current oral care routine. Retest in 6 months to confirm stability.',
    )
  }
  return NO_FIRE
}

function checkRule1D(d: ConnectionInput): ConnectionResult {
  if (d.neisseria_pct !== null && d.neisseria_pct < 5 && d.rhr_avg !== null && d.rhr_expected !== null && d.rhr_avg > d.rhr_expected + 8) {
    return line('1D', 1, 'unfavorable', ['oral','wearable'],
      'Your resting heart rate may be connected to what is happening in your mouth.',
      'Nitric oxide helps blood vessels relax. When the bacteria that produce it are depleted, the heart works harder to push blood through stiffer vessels — which shows up as a higher resting heart rate. Most people think resting heart rate is purely a fitness metric. It is. But it is also downstream of your oral microbiome through the nitric oxide pathway.',
      'Two fronts: rebuild the oral bacteria (stop antiseptic mouthwash, eat more leafy greens and beets) and support cardiovascular fitness (consistent zone 2 exercise). These work on the same problem from two directions.',
    )
  }
  return NO_FIRE
}

function checkRule1E(d: ConnectionInput): ConnectionResult {
  if (d.neisseria_pct !== null && d.neisseria_pct < 5 && d.hba1c !== null && d.hba1c > 5.6) {
    return line('1E', 1, 'unfavorable', ['oral','blood'],
      'Your oral bacteria and blood sugar control may be influencing each other.',
      'Research found that people with higher levels of nitrate-reducing oral bacteria had better insulin sensitivity. When these bacteria decline, nitric oxide production falls — and NO plays a direct role in how the body handles glucose. A large study also found that people using antiseptic mouthwash twice daily had a 55% higher risk of developing prediabetes, likely through this exact pathway.',
      'The oral microbiome is the most overlooked factor in metabolic health. Rebuilding nitrate-reducing bacteria through diet and mouthwash changes may support the same glucose pathways your doctor is watching.',
    )
  }
  return NO_FIRE
}

function checkRule2A(d: ConnectionInput): ConnectionResult {
  if (d.porphyromonas_pct !== null && d.porphyromonas_pct > 1.0 && d.hs_crp !== null && d.hs_crp > 3.0) {
    return line('2A', 1, 'unfavorable', ['oral','blood'],
      'The bacteria linked to gum disease may be driving your inflammation higher.',
      'Porphyromonas is one of the primary bacteria behind chronic gum inflammation. When elevated, it does not just affect your mouth — it triggers an immune response that raises inflammation throughout your body. CRP is a direct measure of that systemic inflammation. This is a connection your doctor cannot see from blood work alone, and your dentist cannot see from a cleaning. Peaq sees both sides.',
      'Schedule a periodontal evaluation with your dentist and mention that your oral microbiome test showed elevated pathogen levels. Consistent flossing, interdental cleaning, and avoiding alcohol-based mouthwash matter more than any supplement here.',
    )
  }
  return NO_FIRE
}

function checkRule2B(d: ConnectionInput): ConnectionResult {
  if (d.porphyromonas_pct !== null && d.porphyromonas_pct > 1.0 && d.hrv_percentile !== null && d.hrv_percentile < 25) {
    return line('2B', 1, 'unfavorable', ['oral','wearable'],
      'This recovery metric is linked to what we found in your oral panel.',
      'When inflammatory bacteria are elevated in your mouth, the immune system stays in a low-grade alert state. That chronic activation suppresses the parasympathetic nervous system — the "rest and recover" side — which shows up as lower heart rate variability. HRV is one of the strongest real-time signals of recovery. Right now, your oral health may be holding it back.',
      'Addressing oral pathogens is the upstream fix. Once periodontal bacteria are managed, HRV often improves within weeks — even without changing exercise or sleep routine.',
    )
  }
  return NO_FIRE
}

function checkRule2C(d: ConnectionInput): ConnectionResult {
  if (d.porphyromonas_pct !== null && d.porphyromonas_pct < 0.3 && d.hs_crp !== null && d.hs_crp < 1.0) {
    return line('2C', 2, 'favorable', ['oral','blood'],
      'Your oral health is contributing to low inflammation throughout your body.',
      'Pathogen levels in your mouth are well controlled, and your systemic inflammation reflects it. Managing oral bacteria is one of the most effective ways to keep whole-body inflammation low — and your profile shows this working.',
      'Protect this. Continue your oral care routine and retest in 6 months.',
    )
  }
  return NO_FIRE
}

function checkRule3A(d: ConnectionInput): ConnectionResult {
  if (
    ((d.sleep_duration_hrs !== null && d.sleep_duration_hrs < 6) || (d.sleep_regularity_sd !== null && d.sleep_regularity_sd > 45))
    && d.hs_crp !== null && d.hs_crp > 3.0
  ) {
    return line('3A', 1, 'unfavorable', ['wearable','blood'],
      'Inflammation and irregular sleep are compounding each other in your profile.',
      'When you consistently sleep less than six hours, or your sleep schedule is highly variable, your body\'s inflammatory response ramps up. CRP — one of the nine markers in your blood age — is directly affected. A controlled study showed that just 10 days of restricted sleep elevated CRP in otherwise healthy people. Your sleep pattern is not just affecting how you feel — it is actively aging your blood panel.',
      'Sleep consistency matters as much as duration. Anchor your bedtime within a 30-minute window for two weeks. Regularity alone reduces inflammation even without sleeping longer.',
    )
  }
  return NO_FIRE
}

function checkRule3B(d: ConnectionInput): ConnectionResult {
  if (
    d.sleep_duration_hrs !== null && d.sleep_duration_hrs >= 7 && d.sleep_duration_hrs <= 8
    && d.sleep_regularity_sd !== null && d.sleep_regularity_sd < 30
    && d.hs_crp !== null && d.hs_crp < 1.0
  ) {
    return line('3B', 2, 'favorable', ['wearable','blood'],
      'Your sleep pattern is helping keep inflammation in check.',
      'Consistent, adequate sleep is one of the strongest natural anti-inflammatory signals your body has. Your sleep data and CRP are both in favorable ranges — this means your sleep is actively contributing to a younger blood age.',
      'Protect your sleep schedule. It is doing more for your longevity than most supplements could.',
    )
  }
  return NO_FIRE
}

function checkRule3C(d: ConnectionInput): ConnectionResult {
  if (
    ((d.sleep_duration_hrs !== null && d.sleep_duration_hrs < 6) || (d.sleep_regularity_sd !== null && d.sleep_regularity_sd > 45))
    && d.rhr_avg !== null && d.rhr_expected !== null && d.rhr_avg > d.rhr_expected + 8
  ) {
    return line('3C', 1, 'unfavorable', ['wearable'],
      'Your sleep and heart rate are both signaling the same thing.',
      'Chronic sleep debt raises resting heart rate by keeping your sympathetic nervous system running hotter than it should. This is not a coincidence — your body is in a sustained stress state, and both metrics reflect it.',
      'When sleep normalizes, resting heart rate typically drops within one to two weeks. Start by setting a consistent bedtime, even on weekends.',
    )
  }
  return NO_FIRE
}

function checkRule4A(d: ConnectionInput): ConnectionResult {
  if (d.neisseria_pct !== null && d.neisseria_pct < 5 && d.sleep_efficiency_pct !== null && d.sleep_efficiency_pct < 80) {
    return line('4A', 3, 'exploratory', ['oral','wearable'],
      'We are watching a possible connection between your oral bacteria and sleep quality.',
      'Nitric oxide helps blood vessels relax, which is especially important during deep sleep when your body does its heaviest repair work. Your nitrate-reducing bacteria are low, and your sleep efficiency suggests your body may not be getting the recovery it needs. This connection is still emerging in the research — Peaq is tracking it because we can see both signals simultaneously. No other platform has this view.',
      'Focus on the oral side first — it is more actionable. Stop antiseptic mouthwash, add nitrate-rich foods. If sleep efficiency improves alongside your next oral retest, that is a signal worth paying attention to.',
    )
  }
  return NO_FIRE
}

function checkRule5A(d: ConnectionInput): ConnectionResult {
  if (d.oma_pct !== null && d.oma_pct > 70 && d.rhr_avg !== null && d.rhr_expected !== null && d.rhr_avg < d.rhr_expected - 5) {
    return line('5A', 2, 'favorable', ['oral','wearable'],
      'Your oral health and cardiovascular fitness are reinforcing each other.',
      'A strong oral microbiome produces more nitric oxide, which supports better blood flow and more efficient heart function. Your low resting heart rate reflects cardiovascular fitness, and your oral panel suggests the NO pathway is working in your favor. This is the positive feedback loop Peaq is designed to surface.',
      'Maintain your routine. Retest oral in 6 months to confirm stability.',
    )
  }
  return NO_FIRE
}

function checkRule5B(d: ConnectionInput): ConnectionResult {
  if (d.oma_pct !== null && d.oma_pct < 30 && d.rhr_avg !== null && d.rhr_expected !== null && d.rhr_avg > d.rhr_expected + 10) {
    return line('5B', 1, 'unfavorable', ['oral','wearable'],
      'Your oral microbiome and cardiovascular metrics may be pulling each other down.',
      'When the oral microbiome is out of balance, nitric oxide production drops. Blood vessels become stiffer, the heart works harder, and resting heart rate reflects the extra effort. This is not just about your mouth or just about your heart — both are linked through the same pathway.',
      'Two fronts: oral care (stop antiseptic rinses, nitrate-rich diet) and cardiovascular fitness (consistent zone 2 cardio, 150 minutes per week).',
    )
  }
  return NO_FIRE
}

function checkRule6A(d: ConnectionInput): ConnectionResult {
  if (
    ((d.p_melaninogenica_pct !== null && d.p_melaninogenica_pct > 5) || (d.veillonella_pct !== null && d.veillonella_pct > 5))
    && d.neisseria_pct !== null && d.neisseria_pct < 8
  ) {
    return line('6A', 1, 'unfavorable', ['oral'],
      'Some bacteria in your mouth are competing against the ones your body needs most.',
      'Your mouth has two types of bacteria that process nitrate from food — but they do it differently. The beneficial ones (Neisseria, Rothia) turn nitrate into nitric oxide, which protects your heart and blood vessels. The competing ones (certain Prevotella and Veillonella species) divert that nitrate into a dead-end pathway — it never becomes nitric oxide. Right now, the competing bacteria are more abundant than the beneficial ones. The nitrate from your spinach and beets is not doing what it should.',
      'A nitrate-rich diet combined with stopping antiseptic mouthwash can shift the balance within weeks. A 2025 study showed erythritol plus nitrate specifically increased the abundance of the bacteria you want more of.',
    )
  }
  return NO_FIRE
}

function checkRule7A(d: ConnectionInput): ConnectionResult {
  if (d.strep_mutans_pct !== null && d.strep_mutans_pct > 0.5 && d.neisseria_pct !== null && d.neisseria_pct < 5) {
    return line('7A', 1, 'unfavorable', ['oral'],
      'The bacteria causing cavity risk are thriving while your protective bacteria are depleted.',
      'Antiseptic mouthwash kills bacteria indiscriminately — but not equally. The protective species that compete with cavity-causing bacteria get wiped out too. Ironically, daily mouthwash can create conditions where cavity bacteria face less competition and expand. Your profile shows exactly this pattern.',
      'Stop antiseptic mouthwash. Switch to a hydroxyapatite rinse (blocks bacterial adhesion without killing bacteria) and xylitol gum after meals (specifically targets cavity-causing species without disrupting the rest of the microbiome). Retest in 6 weeks.',
    )
  }
  return NO_FIRE
}

function checkRule8A(d: ConnectionInput): ConnectionResult {
  if (
    d.oma_pct !== null && d.oma_pct_prev !== null && (d.oma_pct - d.oma_pct_prev) >= 10
    && d.pheno_age !== null && d.pheno_age_prev !== null && (d.pheno_age_prev - d.pheno_age) >= 1.0
  ) {
    return line('8A', 2, 'favorable', ['oral','blood'],
      'Your oral health improved — and your blood age followed.',
      'Between your last two tests, your oral microbiome shifted toward a healthier balance, and your blood-based biological age dropped. This is the connection at the heart of what Peaq measures. When one panel improves, the others often follow.',
      'Whatever you changed between tests, keep doing it.',
    )
  }
  return NO_FIRE
}

function checkRule8B(d: ConnectionInput): ConnectionResult {
  if (
    d.oma_pct !== null && d.oma_pct_prev !== null && (d.oma_pct_prev - d.oma_pct) >= 10
    && d.hs_crp !== null && d.hs_crp_prev !== null && (d.hs_crp - d.hs_crp_prev) >= 1.0
  ) {
    return line('8B', 1, 'unfavorable', ['oral','blood'],
      'Your oral health declined — and your inflammation increased.',
      'Between your last two tests, the balance of bacteria in your mouth shifted away from protective species, and your inflammation marker went up. Something changed — a new mouthwash, antibiotics, a dietary shift, or increased stress. Identifying what changed is the first step.',
      'Review what changed in the weeks before your tests. Common culprits: new mouthwash, antibiotics, dietary changes, extended illness. Consider retesting oral in 6 weeks to see if the trend reverses.',
    )
  }
  return NO_FIRE
}

function checkRule8C(d: ConnectionInput): ConnectionResult {
  if (
    d.sleep_duration_hrs !== null && d.sleep_duration_prev !== null
    && d.sleep_duration_prev < 7
    && d.sleep_duration_hrs >= 7 && d.sleep_duration_hrs <= 8
    && d.rhr_avg !== null && d.rhr_avg_prev !== null
    && (d.rhr_avg_prev - d.rhr_avg) >= 3
  ) {
    return line('8C', 2, 'favorable', ['wearable'],
      'Better sleep is already showing up in your heart rate.',
      '',
      'This is momentum. Keep the sleep schedule consistent and watch for this to compound over the next month.',
    )
  }
  return NO_FIRE
}

function checkRule9A(d: ConnectionInput): ConnectionResult {
  if (
    ((d.porphyromonas_pct !== null && d.porphyromonas_pct > 0.75) || (d.fusobacterium_pct !== null && d.fusobacterium_pct > 0.75))
    && d.age >= 45
  ) {
    return line('9A', 1, 'unfavorable', ['oral'],
      'Research is watching a connection between these bacteria and long-term brain health.',
      'Periodontal pathogens — including the species elevated in your oral panel — have been detected in brain tissue in research studies on Alzheimer\'s disease. The relationship appears bidirectional: these bacteria promote neuroinflammation, while cognitive decline later impairs self-care, accelerating the cycle. Oral infection may occur decades before any neurological symptoms. This is an emerging area — Peaq surfaces it because we can see both signals simultaneously, and early action is always more effective.',
      'Discuss your oral microbiome findings with your dentist and your primary care physician, particularly if you have family history of neurodegenerative conditions. Addressing periodontal pathogens now is the most evidence-aligned action available.',
    )
  }
  return NO_FIRE
}

function checkRule9B(d: ConnectionInput): ConnectionResult {
  if (d.porphyromonas_pct !== null && d.porphyromonas_pct > 0.75 && d.hrv_percentile !== null && d.hrv_percentile < 25) {
    return line('9B', 1, 'unfavorable', ['oral','wearable'],
      'Chronic oral inflammation may be affecting how well your nervous system recovers.',
      'When inflammatory oral bacteria are persistently elevated, the immune system stays activated. This chronic activation suppresses the vagus nerve\'s anti-inflammatory function — one of the pathways that both regulates HRV and protects against neuroinflammation. Low HRV and elevated oral pathogens appearing together is a pattern Peaq watches closely.',
      'Managing the oral pathogen burden is the upstream intervention. A periodontal evaluation, consistent flossing, and potentially L. reuteri probiotic therapy have RCT evidence for reducing Porphyromonas counts.',
    )
  }
  return NO_FIRE
}

function checkRule10A(d: ConnectionInput): ConnectionResult {
  if (
    d.porphyromonas_pct !== null && d.porphyromonas_pct > 1.0
    && d.hs_crp !== null && d.hs_crp > 3.0
    && d.known_conditions !== null
    && d.known_conditions.some(c => c === 'autoimmune' || c === 'joint_pain')
  ) {
    return line('10A', 1, 'unfavorable', ['oral','blood'],
      'The bacteria elevated in your oral panel have a known connection to joint inflammation.',
      'Porphyromonas gingivalis carries a unique enzyme that modifies proteins in a way that can trigger an immune response affecting joints. RA patients are significantly more likely to have elevated periodontal pathogens — and treating the oral infection reduces inflammatory markers that directly affect joint disease. This is a two-way relationship your rheumatologist and dentist rarely discuss together. Peaq connects both sides.',
      'Mention your oral microbiome findings to both your dentist and your physician. Periodontal treatment has clinical evidence for reducing systemic inflammatory markers in people with joint conditions.',
    )
  }
  return NO_FIRE
}

function checkRule11A(d: ConnectionInput): ConnectionResult {
  if (
    ((d.fusobacterium_pct !== null && d.fusobacterium_pct > 3) || (d.solobacterium_pct !== null && d.solobacterium_pct > 3))
    && d.porphyromonas_pct !== null && d.porphyromonas_pct > 0.75
  ) {
    return line('11A', 1, 'unfavorable', ['oral'],
      'The bacteria affecting breath health are the same ones linked to broader oral dysbiosis.',
      'The species producing odor compounds in your mouth are also among the species linked to gum inflammation. These are not separate problems — they are different expressions of the same imbalance in your oral ecosystem. Addressing one tends to improve the other.',
      'The most effective intervention is rebuilding the protective species that naturally suppress anaerobic overgrowth. Stop antiseptic mouthwash, increase nitrate-rich foods, consider tongue scraping daily. These work faster on breath-related bacteria than on periodontal pathogens — you may notice improvement within one to two weeks.',
    )
  }
  return NO_FIRE
}

function checkRule12A(d: ConnectionInput): ConnectionResult {
  if (d.strep_mutans_pct !== null && d.strep_mutans_pct > 0.5 && d.hba1c !== null && d.hba1c > 5.6) {
    return line('12A', 1, 'unfavorable', ['oral','blood'],
      'Elevated cavity bacteria and blood sugar control may be influencing each other.',
      'Streptococcus mutans — the primary cavity-associated bacterium elevated in your oral panel — thrives in high-sugar environments and produces acids that worsen the oral environment. At the same time, elevated blood sugar creates conditions that suppress protective oral bacteria and promote pathogen growth. These two findings are reinforcing each other.',
      'Reducing dietary sugar frequency (not just quantity) directly starves S. mutans. Xylitol specifically inhibits this species. Improving blood sugar control reduces the sugar availability in saliva that feeds cavity bacteria. Both interventions work on both problems simultaneously.',
    )
  }
  return NO_FIRE
}

function checkRule12B(d: ConnectionInput): ConnectionResult {
  if (d.p_melaninogenica_pct !== null && d.p_melaninogenica_pct > 5 && d.glucose !== null && d.glucose > 100) {
    return line('12B', 1, 'unfavorable', ['oral','blood'],
      'Certain bacteria in your mouth may be reducing the benefit of the vegetables you eat for blood sugar.',
      'DNRA bacteria in your oral cavity divert dietary nitrate away from the nitric oxide pathway. Nitric oxide plays a direct role in insulin sensitivity — it helps muscle cells take up glucose efficiently. When the oral pathway is blocked, the metabolic benefit of nitrate-rich foods is reduced, and blood sugar control can suffer.',
      'The most actionable step is dietary: increase nitrate-rich vegetables while stopping antiseptic mouthwash. This combination shifts the oral ecosystem toward true nitrate reducers and restores the NO pathway that supports glucose metabolism.',
    )
  }
  return NO_FIRE
}

function checkRule13A(d: ConnectionInput): ConnectionResult {
  if (d.peptostreptococcus_pct !== null && d.peptostreptococcus_pct > 2 && d.sleep_efficiency_pct !== null && d.sleep_efficiency_pct < 80) {
    return line('13A', 1, 'unfavorable', ['oral','wearable'],
      'Bacteria in your oral panel are associated with disrupted breathing during sleep.',
      'Two completely independent data sources — a saliva sample and your wearable — are pointing at a similar pattern. The oral taxa elevated in your panel are among the species most consistently found in people with sleep-disordered breathing. Your sleep efficiency data suggests your sleep may not be as restorative as it should be. Peaq cannot diagnose sleep apnea — but it can tell you when the signals warrant further investigation.',
      'Mention this finding to your doctor and describe any symptoms — snoring, waking unrefreshed, morning headaches, daytime fatigue. A home sleep test is inexpensive and would confirm or rule out airway disruption. If you have a history of sinus issues or nasal obstruction, that is especially relevant context to share.',
    )
  }
  return NO_FIRE
}

function checkRule13B(d: ConnectionInput): ConnectionResult {
  if (d.nasal_obstruction === null) return NO_FIRE
  if (
    (d.nasal_obstruction === true || (d.sinus_history !== null && d.sinus_history.includes('surgery')))
    && d.rem_min !== null && d.rem_min < 60
  ) {
    return line('13B', 1, 'unfavorable', ['lifestyle','wearable'],
      'Your history of nasal issues may be affecting your sleep architecture.',
      'Nasal obstruction promotes mouth breathing during sleep, which increases airway resistance and can fragment sleep architecture — particularly REM, the stage most dependent on stable airway muscle tone. Your REM average is below the optimal range, and your history of sinus issues creates a biologically plausible connection.',
      'An ENT evaluation is the right next step, particularly if nasal obstruction feels subjectively worse at night. Nasal strips or a saline rinse before bed are low-risk interventions worth trying in the meantime.',
    )
  }
  return NO_FIRE
}

function checkRule14A(d: ConnectionInput): ConnectionResult {
  if (!d.mouthwash_type) return NO_FIRE
  if (
    d.mouthwash_type === 'antiseptic'
    && d.neisseria_pct !== null && d.neisseria_pct < 5
    && ((d.ldl !== null && d.ldl > 130) || (d.hs_crp !== null && d.hs_crp > 1.0) || (d.rhr_avg !== null && d.rhr_expected !== null && d.rhr_avg > d.rhr_expected + 5))
  ) {
    return line('14A', 1, 'unfavorable', ['lifestyle','oral','blood'],
      'A daily habit may be contributing to several of the patterns we are seeing across your panels.',
      'Antiseptic mouthwash — particularly products containing alcohol or chlorhexidine — suppresses the bacteria that produce nitric oxide in your mouth. These bacteria are already depleted in your oral panel. At the same time, your cardiovascular markers are outside the optimal range. These findings are connected: the nitric oxide pathway that your mouthwash is disrupting is the same pathway that regulates blood vessels, inflammation, and cardiovascular function.',
      'This is the single highest-leverage free intervention on your profile. Switch to a fluoride-only rinse (alcohol-free, no chlorhexidine) or no mouthwash. The bacteria begin recovering within days. A 10-day beetroot juice protocol accelerates recovery significantly.',
    )
  }
  return NO_FIRE
}

function checkRule15A(d: ConnectionInput): ConnectionResult {
  if (
    d.pheno_age !== null && d.age > 0 && (d.pheno_age - d.age) > 3
    && d.sleep_regularity_sd !== null && d.sleep_regularity_sd > 45
  ) {
    return line('15A', 1, 'unfavorable', ['blood','wearable'],
      'Your blood age is older than expected, and your sleep pattern may be contributing.',
      'Several of the nine markers in your blood age calculation respond directly to sleep quality and consistency. When sleep is irregular, inflammatory markers rise, immune cell counts shift, and red blood cell metrics worsen — all of which feed directly into the biological age calculation. Your sleep schedule variation is in the range where these effects are measurable.',
      'Improving sleep regularity — anchoring bedtime within a 30-minute window — is the most accessible way to start moving the blood age markers in the right direction. The effect on CRP is visible within 2–4 weeks.',
    )
  }
  return NO_FIRE
}

function checkRule15B(d: ConnectionInput): ConnectionResult {
  if (
    d.pheno_age !== null && d.age > 0 && (d.age - d.pheno_age) > 3
    && d.oma_pct !== null && d.oma_pct > 65
  ) {
    return line('15B', 2, 'favorable', ['blood','oral'],
      'Your oral health is likely contributing to your younger blood age.',
      'The oral microbiome influences several of the markers that go into the blood age calculation — particularly inflammation markers like CRP. When the oral ecosystem is balanced, systemic inflammation stays lower, and blood markers trend younger. Your data shows both panels in a favorable state simultaneously. This alignment is not common and is worth protecting.',
      'Whatever you are doing for oral care is working. Retest in 6 months. Consider sharing your findings with your dentist — this is the kind of data most practices have never seen from a patient.',
    )
  }
  return NO_FIRE
}

function checkRule16A(d: ConnectionInput): ConnectionResult {
  if (d.vitamin_d !== null && d.vitamin_d < 30 && d.porphyromonas_pct !== null && d.porphyromonas_pct > 0.5) {
    return line('16A', 2, 'unfavorable', ['blood','oral'],
      'Low vitamin D may be reducing your mouth\'s ability to fight harmful bacteria.',
      'Vitamin D plays a direct role in the immune response within oral tissues. When levels are low, the mouth\'s local immune defense against periodontal pathogens is weakened — allowing bacteria like Porphyromonas to establish and persist more easily. Your oral panel and your vitamin D level are telling a connected story.',
      'Getting vitamin D into the optimal range (50–80 ng/mL) supports immune function throughout the body, including the oral immune response. Discuss supplementation levels with your doctor — most people require 2,000–5,000 IU daily to maintain optimal levels.',
    )
  }
  return NO_FIRE
}

function checkRule16B(d: ConnectionInput): ConnectionResult {
  if (
    d.vitamin_d !== null && d.vitamin_d < 30
    && ((d.deep_sleep_min !== null && d.deep_sleep_min < 60) || (d.sleep_efficiency_pct !== null && d.sleep_efficiency_pct < 80))
  ) {
    return line('16B', 3, 'unfavorable', ['blood','wearable'],
      'Low vitamin D is associated with reduced deep sleep in multiple studies.',
      'Vitamin D receptors in the brain play a role in regulating sleep architecture, particularly deep sleep. Studies have consistently found that people with vitamin D deficiency have shorter, less restorative sleep — and that supplementation improves objective sleep quality. Your low vitamin D and reduced deep sleep may be part of the same pattern.',
      'Optimize vitamin D first (supplement to achieve 50–80 ng/mL) and recheck sleep metrics after 8–12 weeks. This is one of the most underappreciated sleep interventions, and it costs less than most sleep supplements.',
    )
  }
  return NO_FIRE
}

function checkRule17A(d: ConnectionInput): ConnectionResult {
  if (
    d.neisseria_pct !== null && d.neisseria_pct < 5
    && ((d.ldl !== null && d.ldl > 130) || (d.hs_crp !== null && d.hs_crp > 3.0))
    && ((d.rhr_avg !== null && d.rhr_expected !== null && d.rhr_avg > d.rhr_expected + 8) || (d.hrv_percentile !== null && d.hrv_percentile < 25))
  ) {
    return line('17A', 1, 'unfavorable', ['oral','blood','wearable'],
      'Three separate signals are pointing at the same pattern — your cardiovascular system is under more strain than any single test would show.',
      'Your oral bacteria, your blood markers, and your heart rate data are each showing a signal that, alone, might be worth monitoring. Together, they are pointing at the same underlying issue: the nitric oxide pathway is compromised, systemic inflammation is elevated, and your cardiovascular system is working harder than it should be. No single panel can see this — it is only visible when all three are measured simultaneously.',
      'This combination warrants a conversation with your doctor — not urgently, but intentionally. Bring your Peaq data. The oral intervention (stopping antiseptic mouthwash, starting beetroot protocol) is free and fast-acting on the upstream driver. The blood panel warrants discussion about LDL management. The heart rate trend is worth monitoring weekly.',
    )
  }
  return NO_FIRE
}

function checkRule8D(d: ConnectionInput): ConnectionResult {
  if (
    d.hrv_rmssd_avg !== null && d.rhr_avg_prev !== null
    && d.oma_pct !== null && d.oma_pct_prev !== null
    && (d.oma_pct - d.oma_pct_prev) >= 8
    // HRV trend: use rhr_avg_prev as proxy for previous HRV baseline (simplified)
  ) {
    return line('8D', 2, 'favorable', ['oral','wearable'],
      'Your recovery and oral health are both trending in the right direction.',
      'Between your recent tests, your oral microbiome shifted toward healthier bacteria and your heart rate variability improved. These two changes often travel together — a healthier oral ecosystem reduces systemic inflammation, which allows the nervous system to recover more efficiently.',
      'This is momentum worth protecting. Continue your current oral care and sleep routine.',
    )
  }
  return NO_FIRE
}

function checkRule18A(d: ConnectionInput): ConnectionResult {
  if (d.rhr_avg !== null && d.rhr_avg > 75 && d.hba1c !== null && d.hba1c > 5.6) {
    return line('18A', 1, 'unfavorable', ['wearable','blood'],
      'Your resting heart rate and blood sugar are both elevated — these often share a root cause.',
      'An elevated resting heart rate and rising HbA1c can both reflect insulin resistance and autonomic stress. When the body struggles to manage glucose efficiently, the cardiovascular system compensates by working harder at rest. This is not two separate problems — it is one metabolic pattern showing up in two places.',
      'Zone 2 cardio (brisk walking, easy cycling) 150 minutes per week directly improves both insulin sensitivity and resting heart rate. Discuss HbA1c management with your doctor.',
    )
  }
  return NO_FIRE
}

function checkRule18B(d: ConnectionInput): ConnectionResult {
  if (d.hrv_rmssd_avg !== null && d.hrv_rmssd_avg < 20 && d.hba1c !== null && d.hba1c > 5.7) {
    return line('18B', 1, 'unfavorable', ['wearable','blood'],
      'Low recovery capacity and elevated blood sugar suggest your autonomic nervous system is under strain.',
      'HRV below 20ms combined with HbA1c above 5.7% points to autonomic dysfunction — the nervous system that regulates both heart rate variability and glucose metabolism is not recovering well. This pattern is common in early metabolic syndrome and responds to intervention.',
      'Prioritize sleep consistency and stress reduction alongside metabolic management. HRV is one of the first metrics to improve when the autonomic system gets relief.',
    )
  }
  return NO_FIRE
}

function checkRule18C(d: ConnectionInput): ConnectionResult {
  if (d.rhr_avg !== null && d.rhr_avg > 75 && d.hs_crp !== null && d.hs_crp > 3.0) {
    return line('18C', 1, 'unfavorable', ['wearable','blood'],
      'Elevated heart rate and inflammation are reinforcing each other.',
      'When systemic inflammation is high, blood vessels stiffen and the heart works harder — raising resting heart rate. At the same time, a chronically elevated heart rate itself promotes inflammation through sustained sympathetic activation. Breaking this cycle requires addressing both sides.',
      'Anti-inflammatory diet changes (reduce processed foods, increase omega-3s) combined with regular aerobic exercise can break this feedback loop within weeks.',
    )
  }
  return NO_FIRE
}

function checkRule19A(d: ConnectionInput): ConnectionResult {
  if (d.sleep_duration_hrs !== null && d.sleep_duration_hrs < 6 && d.wbc !== null && d.wbc > 10.0) {
    return line('19A', 1, 'unfavorable', ['wearable','blood'],
      'Short sleep and elevated white blood cells may be connected.',
      'Chronic sleep restriction activates the immune system in a way that raises white blood cell counts — your body is in a sustained alert state. This immune activation also accelerates cellular aging and increases cardiovascular risk over time.',
      'Extending sleep to 7+ hours is the most direct intervention. WBC typically normalizes within weeks of consistent adequate sleep.',
    )
  }
  return NO_FIRE
}

function checkRule19B(d: ConnectionInput): ConnectionResult {
  if (
    d.sleep_regularity_sd !== null && d.sleep_regularity_sd > 45
    && ((d.glucose !== null && d.glucose > 100) || (d.hba1c !== null && d.hba1c > 5.6))
  ) {
    return line('19B', 1, 'unfavorable', ['wearable','blood'],
      'Irregular sleep timing is associated with poorer blood sugar control.',
      'When your sleep schedule varies by more than 45 minutes night to night, your circadian rhythm loses its anchor. Glucose metabolism is tightly linked to circadian timing — your body expects to process food at consistent times. Irregular sleep disrupts this, leading to higher fasting glucose and poorer HbA1c.',
      'Anchor your bedtime within a 30-minute window — even on weekends. Circadian consistency improves glucose control independently of sleep duration.',
    )
  }
  return NO_FIRE
}

function checkRule19C(d: ConnectionInput): ConnectionResult {
  if (
    d.deep_sleep_min !== null && d.deep_sleep_min < 45
    && d.testosterone !== null && d.testosterone < 300
    && d.sex === 'male'
  ) {
    return line('19C', 1, 'unfavorable', ['wearable','blood'],
      'Low deep sleep and low testosterone often share the same cause.',
      'The majority of daily testosterone production occurs during deep sleep. When deep sleep is consistently below 45 minutes, testosterone production is directly impaired. This creates a cycle — low testosterone further degrades sleep quality. Your wearable and blood data are both reflecting this pattern.',
      'Prioritize deep sleep: consistent bedtime, cool room temperature, limit alcohol. If testosterone remains low after 8 weeks of improved sleep, discuss with your doctor.',
    )
  }
  return NO_FIRE
}

function checkRule20A(d: ConnectionInput): ConnectionResult {
  if (
    d.pathogen_inv_pct !== null && d.pathogen_inv_pct < 20
    && d.creatinine !== null
    && ((d.sex === 'male' && d.creatinine > 1.2) || (d.sex === 'female' && d.creatinine > 1.0))
  ) {
    return line('20A', 1, 'unfavorable', ['oral','blood'],
      'Oral inflammation and kidney stress may be connected in your profile.',
      'Chronic oral pathogen burden drives systemic inflammation, which over time can affect kidney function. Elevated creatinine alongside high oral pathogens suggests the inflammatory load from your mouth may be reaching your kidneys. This connection is well-established in nephrology literature.',
      'Address the oral pathogen burden first — it is the upstream driver. Discuss your creatinine with your doctor, and mention your oral microbiome findings.',
    )
  }
  return NO_FIRE
}

function checkRule20B(d: ConnectionInput): ConnectionResult {
  if (
    d.pathogen_inv_pct !== null && d.pathogen_inv_pct > 70
    && d.creatinine !== null
    && ((d.sex === 'male' && d.creatinine <= 1.2) || (d.sex === 'female' && d.creatinine <= 1.0) || d.sex === null)
  ) {
    return line('20B', 2, 'favorable', ['oral','blood'],
      'Your oral health and kidney markers are both in a favorable range.',
      'Low oral pathogen burden means less systemic inflammatory load — and your kidney markers reflect that. When the mouth is healthy, the downstream organs that filter inflammation stay healthier too.',
      'Maintain your oral care routine. This is the kind of alignment that protects long-term organ function.',
    )
  }
  return NO_FIRE
}

function checkRule21A(d: ConnectionInput): ConnectionResult {
  if (d.rdw !== null && d.rdw > 14.5 && d.pathogen_inv_pct !== null && d.pathogen_inv_pct < 25) {
    return line('21A', 1, 'unfavorable', ['oral','blood'],
      'Red blood cell variation and oral inflammation may be linked.',
      'Elevated RDW (red cell distribution width) reflects chronic inflammation and oxidative stress at the cellular level. When oral pathogens are also elevated, the systemic inflammatory burden compounds — your bone marrow produces red blood cells of inconsistent size because the inflammatory environment disrupts normal production.',
      'Addressing oral pathogens reduces the systemic inflammatory load that drives RDW elevation. A periodontal evaluation is the right starting point.',
    )
  }
  return NO_FIRE
}

function checkRule22A(d: ConnectionInput): ConnectionResult {
  if (d.wbc !== null && d.wbc > 10.0 && d.pathogen_inv_pct !== null && d.pathogen_inv_pct < 20) {
    return line('22A', 1, 'unfavorable', ['oral','blood'],
      'Your white blood cell count and oral pathogen burden are both elevated.',
      'Elevated WBC is a direct signal that your immune system is actively fighting something. When oral pathogens are also elevated, the mouth is a likely source of that immune activation. Chronic oral infection drives persistent WBC elevation — which itself accelerates aging and cardiovascular risk.',
      'A periodontal evaluation and consistent oral hygiene are the most direct interventions. WBC often normalizes within months of managing oral pathogen burden.',
    )
  }
  return NO_FIRE
}

function checkRule22B(d: ConnectionInput): ConnectionResult {
  if (
    d.wbc !== null && d.wbc >= 4.0 && d.wbc <= 10.0
    && d.pathogen_inv_pct !== null && d.pathogen_inv_pct > 60
    && d.sleep_duration_hrs !== null && d.sleep_duration_hrs >= 6.5
  ) {
    return line('22B', 2, 'favorable', ['oral','blood','wearable'],
      'Your immune system, oral health, and sleep are all working together.',
      'Normal white blood cell count, low oral pathogen burden, and adequate sleep duration is a strong combination. Your immune system is not being chronically activated by oral infection, and your sleep is supporting normal immune regulation.',
      'Protect this alignment. It is the foundation of healthy aging.',
    )
  }
  return NO_FIRE
}

// ─── Rule Dispatch Table ─────────────────────────────────────────────────────

const RULE_CHECKERS: Record<string, (input: ConnectionInput) => ConnectionResult> = {
  '1A': checkRule1A,
  '1B': checkRule1B,
  '1C': checkRule1C,
  '1D': checkRule1D,
  '1E': checkRule1E,
  '2A': checkRule2A,
  '2B': checkRule2B,
  '2C': checkRule2C,
  '3A': checkRule3A,
  '3B': checkRule3B,
  '3C': checkRule3C,
  '4A': checkRule4A,
  '5A': checkRule5A,
  '5B': checkRule5B,
  '6A': checkRule6A,
  '7A': checkRule7A,
  '8A': checkRule8A,
  '8B': checkRule8B,
  '8C': checkRule8C,
  '9A': checkRule9A,
  '9B': checkRule9B,
  '10A': checkRule10A,
  '11A': checkRule11A,
  '12A': checkRule12A,
  '12B': checkRule12B,
  '13A': checkRule13A,
  '13B': checkRule13B,
  '14A': checkRule14A,
  '15A': checkRule15A,
  '15B': checkRule15B,
  '16A': checkRule16A,
  '16B': checkRule16B,
  '17A': checkRule17A,
  '8D': checkRule8D,
  '18A': checkRule18A, '18B': checkRule18B, '18C': checkRule18C,
  '19A': checkRule19A, '19B': checkRule19B, '19C': checkRule19C,
  '20A': checkRule20A, '20B': checkRule20B,
  '21A': checkRule21A, '22A': checkRule22A, '22B': checkRule22B,
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

export function evaluateConnection(marker_id: string, input: ConnectionInput): ConnectionLine[] {
  const ruleIds = MARKER_RULES[marker_id]
  if (!ruleIds) return []

  const results: ConnectionLine[] = []
  for (const ruleId of ruleIds) {
    if (!passesQCGates(ruleId, input)) continue
    const checker = RULE_CHECKERS[ruleId]
    if (!checker) continue
    const result = checker(input)
    if (result.fires) results.push(result)
  }

  results.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    if (a.linked_panels.length !== b.linked_panels.length) return b.linked_panels.length - a.linked_panels.length
    const aHasOral = a.linked_panels.includes('oral') ? 1 : 0
    const bHasOral = b.linked_panels.includes('oral') ? 1 : 0
    return bHasOral - aHasOral
  })

  return results
}

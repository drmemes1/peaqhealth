export type QuestionType = "choice" | "multi" | "number" | "number_pair"

export interface QuestionOption {
  value: string
  label: string
  sub?: string
}

export interface QuestionDef {
  id: string
  section: string
  sectionLabel: string
  type: QuestionType
  dbCol: string
  dbTable?: "lifestyle_records" | "user_symptoms"
  question: string
  helper: string
  tag: "new" | "rewrite" | "keep"
  options?: QuestionOption[]
  numberConfig?: {
    min: number; max: number; step?: number; unit: string
    imperialUnit?: string; metricUnit?: string
    pairFields?: { field1: string; field2: string; suffix1: string; suffix2: string }
  }
  unitToggle?: boolean
  explanation: {
    label: string
    body: string
  } | null
  conditionalOn?: { field: string; notEquals: string }
}

const TOTAL = 42

export const V2_QUESTIONS: QuestionDef[] = [
  // ═══ §1 BASICS (5) ═══
  {
    id: "q1", section: "§1 · Basics", sectionLabel: "Basics",
    type: "number", dbCol: "age_range", tag: "keep",
    question: "How old are you?",
    helper: "Age shifts your target ranges — especially for heart and bone markers. We use this for baseline comparisons.",
    numberConfig: { min: 13, max: 120, unit: "years" },
    explanation: { label: "What this means for your insights", body: "We'll use age-appropriate reference ranges for cardiovascular, metabolic, and oral bacterial markers. Some thresholds shift in your 40s — we'll flag these when you cross them." },
  },
  {
    id: "q2", section: "§1 · Basics", sectionLabel: "Basics",
    type: "choice", dbCol: "biological_sex", tag: "keep",
    question: "What's your biological sex?",
    helper: "Reference ranges for hormones, cardiovascular markers, and some oral bacteria differ between male and female biology.",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "intersex", label: "Intersex" },
      { value: "prefer_not_to_say", label: "Prefer not to say" },
    ],
    explanation: { label: "What this means for your insights", body: "We'll apply sex-specific reference ranges for hormones, lipids, and iron. If you're on testosterone or estrogen therapy, let us know in the medications section — it changes the interpretation." },
  },
  {
    id: "q3", section: "§1 · Basics", sectionLabel: "Basics",
    type: "number_pair", dbCol: "height_cm", tag: "rewrite",
    question: "What's your height?",
    helper: "We use this with your weight to compute BMI — one of several airway-risk factors.",
    unitToggle: true,
    numberConfig: { min: 100, max: 250, unit: "cm", imperialUnit: "ft / in", metricUnit: "cm", pairFields: { field1: "height_ft", field2: "height_in", suffix1: "ft", suffix2: "in" } },
    explanation: { label: "Coming back for more", body: "Height plus weight gives us your BMI. We'll use it alongside your neck and breathing answers to flag airway risk — not a diagnosis, just a flag for screening." },
  },
  {
    id: "q4", section: "§1 · Basics", sectionLabel: "Basics",
    type: "number", dbCol: "weight_kg", tag: "rewrite",
    question: "What's your weight?",
    helper: "Be honest — we're not judging. Accurate numbers help us calibrate your results.",
    unitToggle: true,
    numberConfig: { min: 30, max: 300, unit: "kg", imperialUnit: "lbs", metricUnit: "kg" },
    explanation: { label: "What this unlocks", body: "Your BMI helps contextualize airway risk, metabolic markers, and cardiovascular signals. BMI over 30 independently increases airway risk; we'll note where your number sits." },
  },
  {
    id: "q5", section: "§1 · Basics", sectionLabel: "Basics",
    type: "choice", dbCol: "neck_circumference_self", tag: "new",
    question: "How would you describe your neck?",
    helper: "Neck size is an independent airway risk factor — a rough self-assessment is useful even without a tape measure.",
    options: [
      { value: "thin", label: "Thin / slender" },
      { value: "normal", label: "Average" },
      { value: "thicker", label: "Thicker / stocky" },
      { value: "not_sure", label: "Not sure" },
    ],
    explanation: { label: "Why we ask", body: "Thicker necks correlate with airway narrowing during sleep — independent of BMI. We use this alongside your weight and breathing answers to build the airway picture." },
  },

  // ═══ §2 SLEEP (7) ═══
  {
    id: "q6", section: "§2 · Sleep", sectionLabel: "Sleep",
    type: "choice", dbCol: "sleep_duration", tag: "keep",
    question: "How many hours do you sleep most nights?",
    helper: "Your typical pattern — not last weekend's wedding, not your toddler's 3am teething.",
    options: [
      { value: "less_than_5", label: "Less than 5 hours" },
      { value: "5_6", label: "5–6 hours" },
      { value: "6_7", label: "6–7 hours" },
      { value: "7_8", label: "7–8 hours" },
      { value: "8_9", label: "8–9 hours" },
      { value: "more_than_9", label: "More than 9 hours" },
    ],
    explanation: { label: "What this means for your insights", body: "We'll cross-reference sleep duration with your oral inflammation markers and blood glucose. Short sleep + oral inflammation often shows up as daytime fog." },
  },
  {
    id: "q7", section: "§2 · Sleep", sectionLabel: "Sleep",
    type: "choice", dbCol: "sleep_latency", tag: "keep",
    question: "How long does it usually take you to fall asleep?",
    helper: "From lights-out to drifting off.",
    options: [
      { value: "lt10", label: "Less than 10 minutes" },
      { value: "10_20", label: "10–20 minutes" },
      { value: "20_45", label: "20–45 minutes" },
      { value: "gt45", label: "More than 45 minutes" },
    ],
    explanation: { label: "What this means", body: "10–20 minutes is the sweet spot. Falling asleep in under 5 minutes often indicates chronic sleep debt. Taking over 30 minutes regularly can indicate elevated cortisol or caffeine timing issues." },
  },
  {
    id: "q8", section: "§2 · Sleep", sectionLabel: "Sleep",
    type: "choice", dbCol: "sleep_consistency", tag: "new",
    question: "How consistent is your bedtime?",
    helper: "Consistency often predicts health outcomes better than duration alone.",
    options: [
      { value: "very_consistent", label: "Very consistent", sub: "within 30 min" },
      { value: "fairly_consistent", label: "Fairly consistent", sub: "within 1 hr" },
      { value: "varies_1_2hrs", label: "Varies by 1–2 hours" },
      { value: "all_over", label: "All over the place" },
    ],
    explanation: { label: "Why this matters", body: "Circadian consistency drives HRV, cortisol rhythm, and even oral bacterial cycles. We'll factor this into any recovery interpretation." },
  },
  {
    id: "q9", section: "§2 · Sleep", sectionLabel: "Sleep",
    type: "choice", dbCol: "non_restorative_sleep", tag: "keep",
    question: "Do you wake up feeling unrefreshed?",
    helper: "Even after a full night's sleep.",
    options: [
      { value: "rarely", label: "Rarely or never" },
      { value: "occasionally", label: "Occasionally" },
      { value: "most_mornings", label: "Most mornings" },
      { value: "every_morning", label: "Every morning" },
    ],
    explanation: { label: "What this means", body: "Non-restorative sleep is a classic airway signal — often paired with mouth breathing or disrupted sleep architecture. We'll cross-reference with your oral bacteria for corroboration." },
  },
  {
    id: "q10", section: "§2 · Sleep", sectionLabel: "Sleep",
    type: "choice", dbCol: "daytime_fatigue", tag: "keep",
    question: "How often do you feel excessively sleepy during the day?",
    helper: "Not just tired — sleepy, like you could fall asleep right now.",
    options: [
      { value: "never", label: "Never" },
      { value: "rarely", label: "Rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" },
      { value: "daily", label: "Almost every day" },
    ],
    explanation: { label: "What this means", body: "Daytime sleepiness alongside mouth breathing or short sleep duration compounds the signal. We'll track this as part of your cognitive-morning cluster." },
  },
  {
    id: "q11", section: "§2 · Sleep", sectionLabel: "Sleep",
    type: "choice", dbCol: "night_wakings", tag: "keep",
    question: "How many nights per week do you wake up and struggle to fall back asleep?",
    helper: "Brief bathroom trips don't count unless you then lie awake for 20+ minutes.",
    options: [
      { value: "none", label: "Rarely or never" },
      { value: "1_2", label: "1–2 nights" },
      { value: "3_4", label: "3–4 nights" },
      { value: "5_plus", label: "5+ nights" },
    ],
    explanation: { label: "What this means", body: "Frequent wakings fragment sleep architecture even when total hours look adequate. A wearable would show whether your deep sleep and REM percentages are affected." },
  },
  {
    id: "q12", section: "§2 · Sleep", sectionLabel: "Sleep",
    type: "choice", dbCol: "daytime_cognitive_fog", tag: "keep",
    question: "How often do you feel mentally cloudy or struggle to focus during the day?",
    helper: "Cognitive fog is one of the earliest signals of disrupted sleep — often before you feel tired.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Most days" },
      { value: "daily", label: "Every day" },
    ],
    explanation: { label: "What this means", body: "Cognitive fog often clusters with non-restorative sleep and morning headaches. Together they form a pattern that usually improves when airway issues are addressed." },
  },

  // ═══ §3 AIRWAY (9) ═══
  {
    id: "q13", section: "§3 · Airway", sectionLabel: "Airway",
    type: "choice", dbCol: "snoring_frequency", tag: "rewrite",
    question: "How often do you snore?",
    helper: "If you live alone and don't know, select \"not sure\" — your data will tell us.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasionally", label: "Occasionally", sub: "<2 nights/wk" },
      { value: "frequently", label: "Frequently", sub: "3–5 nights/wk" },
      { value: "every_night", label: "Every night" },
      { value: "diagnosed_osa", label: "Diagnosed with sleep apnea" },
      { value: "not_sure", label: "Not sure" },
    ],
    explanation: { label: "What this tells us", body: "Snoring frequency is a primary screening signal. We'll cross-check with your oral bacterial signatures — certain species track with nighttime breathing patterns in research (Chen 2022)." },
  },
  {
    id: "q14", section: "§3 · Airway", sectionLabel: "Airway",
    type: "multi", dbCol: "cpap_or_mad_in_use", tag: "new",
    question: "Do you currently use anything for airway support at night?",
    helper: "Select all that apply.",
    options: [
      { value: "cpap_bipap", label: "CPAP or BiPAP machine" },
      { value: "mad", label: "Mandibular advancement device (MAD)" },
      { value: "mouth_tape", label: "Mouth tape" },
      { value: "nasal_strips", label: "Nasal strips (Breathe Right, etc.)" },
      { value: "nasal_dilator", label: "Nasal dilator" },
      { value: "none", label: "Nothing" },
    ],
    explanation: { label: "Why this matters for your recommendations", body: "If you already use CPAP or a MAD, we won't suggest a sleep study even if your bacteria flag risk — you're already being treated. We'll instead track how your oral signature responds to treatment." },
  },
  {
    id: "q15", section: "§3 · Airway", sectionLabel: "Airway",
    type: "choice", dbCol: "osa_witnessed", tag: "keep",
    question: "Has someone told you that you stop breathing, gasp, or choke in your sleep?",
    helper: "Partner, family member, or roommate observation.",
    options: [
      { value: "never", label: "Never" },
      { value: "rarely", label: "Once or twice" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
    ],
    explanation: { label: "What this means", body: "Witnessed breathing interruptions are the single strongest self-reported signal for nighttime breathing disruption. We'll cross-check with your oral bacteria for two-source confirmation." },
  },
  {
    id: "q16", section: "§3 · Airway", sectionLabel: "Airway",
    type: "choice", dbCol: "mouth_breathing", tag: "keep",
    question: "Do you breathe through your mouth?",
    helper: "During the day, at night, or both.",
    options: [
      { value: "rarely", label: "Rarely — nasal breathing most of the time" },
      { value: "sometimes", label: "Sometimes, when congested" },
      { value: "often", label: "Often, especially at night" },
      { value: "confirmed", label: "Yes — confirmed by dentist or partner" },
    ],
    explanation: { label: "What this means", body: "Mouth breathing shifts your oral bacteria toward aerobic species and dries the gumline. Your oral data will confirm or complicate this — it's one of the clearest cross-panel signals we track." },
  },
  {
    id: "q17", section: "§3 · Airway", sectionLabel: "Airway",
    type: "choice", dbCol: "dry_mouth_morning", dbTable: "user_symptoms", tag: "new",
    question: "Do you wake up with a dry mouth or sore throat?",
    helper: "Even if only occasionally — this is diagnostic, not an inconvenience.",
    options: [
      { value: "1", label: "Never" },
      { value: "2", label: "Occasionally" },
      { value: "4", label: "Most mornings" },
      { value: "5", label: "Every morning" },
    ],
    explanation: { label: "What this tells us", body: "Dry mouth most mornings is high-confidence mouth breathing evidence — we'll pair it with your aerobic/anaerobic bacterial ratio for two-source confirmation." },
  },
  {
    id: "q18", section: "§3 · Airway", sectionLabel: "Airway",
    type: "choice", dbCol: "nasal_obstruction", tag: "keep",
    question: "How often is your nose blocked or stuffy?",
    helper: "Chronic nasal obstruction is the upstream cause of many mouth-breathing patterns.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasional", label: "Occasionally" },
      { value: "often", label: "Often" },
      { value: "chronic", label: "Chronically — it's always somewhat blocked" },
    ],
    explanation: { label: "What this means", body: "Chronic nasal obstruction forces mouth breathing as compensation. If your oral bacteria also show the aerobic shift, the nasal airway is the root cause to address." },
  },
  {
    id: "q19", section: "§3 · Airway", sectionLabel: "Airway",
    type: "choice", dbCol: "morning_headaches", tag: "keep",
    question: "How often do you wake up with a headache?",
    helper: "Morning headaches that resolve within an hour of waking are the most significant.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
      { value: "daily", label: "Most mornings" },
    ],
    explanation: { label: "What this means", body: "Morning headaches cluster with non-restorative sleep, cognitive fog, and mouth breathing. They're part of the cognitive-morning signal pattern we track." },
  },
  {
    id: "q20", section: "§3 · Airway", sectionLabel: "Airway",
    type: "choice", dbCol: "bruxism_night", tag: "keep",
    question: "Do you grind or clench your teeth at night?",
    helper: "Signs: jaw soreness in the morning, worn tooth surfaces, or a partner hears grinding.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
      { value: "night_guard", label: "Yes — I wear a night guard" },
    ],
    explanation: { label: "What this means", body: "Bruxism often tracks with sympathetic nervous system activation during sleep. Combined with jaw fatigue and morning headaches, it forms a bruxism triad we'll watch for." },
  },
  {
    id: "q21", section: "§3 · Airway", sectionLabel: "Airway",
    type: "choice", dbCol: "ent_assessment_history", tag: "new",
    question: "Have you ever seen an ENT specialist for your sinuses or airway?",
    helper: "Ear, nose, and throat doctor — for sinus issues, nasal polyps, deviated septum, or airway evaluation.",
    options: [
      { value: "never", label: "Never" },
      { value: "consultation_only", label: "Consultation only" },
      { value: "imaging_done", label: "Had imaging (CT scan, etc.)" },
      { value: "surgery_past", label: "Had surgery" },
      { value: "surgery_planned", label: "Surgery planned" },
    ],
    explanation: { label: "Why we ask", body: "Prior ENT evaluation — especially imaging or surgery — tells us whether your nasal airway has a structural component. This changes whether we suggest nasal strips vs. an ENT referral." },
  },

  // ═══ §4 ORAL HYGIENE (8) ═══
  {
    id: "q22", section: "§4 · Oral hygiene", sectionLabel: "Oral hygiene",
    type: "choice", dbCol: "mouthwash_type_v2", tag: "new",
    question: "What kind of mouthwash do you use?",
    helper: "This is the single biggest modifiable factor affecting your oral bacteria. Be specific.",
    options: [
      { value: "none", label: "None", sub: "best for NR bacteria" },
      { value: "fluoride_only", label: "Fluoride rinse only", sub: "ACT, Colgate Phos-Flur" },
      { value: "antiseptic_listerine_cpc", label: "Antiseptic (Listerine, Scope, CPC)" },
      { value: "chlorhexidine_prescribed", label: "Chlorhexidine", sub: "prescribed by dentist" },
      { value: "natural_herbal", label: "Natural / herbal", sub: "Tom's, Desert Essence" },
      { value: "saltwater_saline", label: "Saltwater / saline rinse" },
      { value: "other", label: "Other" },
    ],
    explanation: { label: "Why this is a big one", body: "Antiseptic mouthwashes suppress Neisseria by 60–90% within hours. If your NR bacteria are low in your results, this is almost certainly why. We'll flag a \"stop antiseptic mouthwash\" recommendation if your data matches." },
  },
  {
    id: "q23", section: "§4 · Oral hygiene", sectionLabel: "Oral hygiene",
    type: "choice", dbCol: "mouthwash_frequency", tag: "new",
    question: "How often do you use mouthwash?",
    helper: "Frequency determines how persistent the effect is on your oral bacteria.",
    options: [
      { value: "never", label: "Never" },
      { value: "few_times_month", label: "A few times a month" },
      { value: "weekly", label: "Weekly" },
      { value: "daily", label: "Daily" },
      { value: "multiple_daily", label: "Multiple times a day" },
    ],
    explanation: { label: "What this means", body: "Daily antiseptic use keeps your NR bacteria in a chronically suppressed state. Even stopping for 2 weeks typically shows Neisseria recovery on the next test." },
  },
  {
    id: "q24", section: "§4 · Oral hygiene", sectionLabel: "Oral hygiene",
    type: "choice", dbCol: "flossing_freq", tag: "keep",
    question: "How often do you floss?",
    helper: "Honest answer — no judgment. This directly affects your gum bacteria.",
    options: [
      { value: "never", label: "Never" },
      { value: "rarely", label: "Rarely" },
      { value: "few_weekly", label: "A few times a week" },
      { value: "daily", label: "Daily" },
      { value: "twice_daily", label: "Twice daily" },
    ],
    explanation: { label: "What this means", body: "Flossing frequency directly maps to your gum bacteria levels. Daily flossers with elevated gum bacteria tell a different story than non-flossers — it suggests the issue may be deeper than home care can reach." },
  },
  {
    id: "q25", section: "§4 · Oral hygiene", sectionLabel: "Oral hygiene",
    type: "choice", dbCol: "toothbrush_type", tag: "new",
    question: "What kind of toothbrush do you use?",
    helper: "Electric toothbrushes (especially sonic) remove more plaque than manual ones in controlled studies.",
    options: [
      { value: "manual", label: "Manual" },
      { value: "electric_oscillating", label: "Electric (oscillating)", sub: "Oral-B style" },
      { value: "electric_sonic", label: "Electric (sonic)", sub: "Sonicare, Quip" },
      { value: "water_flosser_only", label: "Water flosser only" },
    ],
    explanation: { label: "What this means", body: "Electric sonic brushes reduce plaque by 21% more than manual in meta-analyses. If your gum bacteria are elevated despite good habits, upgrading your brush is a low-friction lever." },
  },
  {
    id: "q26", section: "§4 · Oral hygiene", sectionLabel: "Oral hygiene",
    type: "choice", dbCol: "tongue_scraping_freq", tag: "new",
    question: "Do you scrape your tongue?",
    helper: "Copper or stainless steel scraper, used from back to front of the tongue.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasionally", label: "Occasionally" },
      { value: "most_days", label: "Most days" },
      { value: "every_morning", label: "Every morning" },
    ],
    explanation: { label: "Why we ask", body: "Tongue scraping is the single biggest lever for bad breath bacteria. If your Solobacterium or Prevotella are elevated, we'll recommend this first — it outperforms any mouthwash." },
  },
  {
    id: "q27", section: "§4 · Oral hygiene", sectionLabel: "Oral hygiene",
    type: "choice", dbCol: "whitening_frequency", tag: "keep",
    question: "How often do you use peroxide-based whitening products?",
    helper: "Whitening strips, trays, or LED systems — not whitening toothpaste.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasionally", label: "Occasionally (a few times a year)" },
      { value: "monthly", label: "Monthly" },
      { value: "daily_toothpaste", label: "Daily (whitening toothpaste)" },
      { value: "professional", label: "Professional treatments" },
    ],
    explanation: { label: "Why we ask", body: "Peroxide whitening produces hydrogen peroxide — which can shift your oral bacteria toward aerobic species. If your aerobic shift looks like mouth breathing but you use peroxide, the whitening is the more likely explanation." },
  },
  {
    id: "q28", section: "§4 · Oral hygiene", sectionLabel: "Oral hygiene",
    type: "multi", dbCol: "oral_probiotic_in_use", tag: "new",
    question: "Do you take any oral probiotics?",
    helper: "These are the lozenge/mint kind meant to colonize your mouth — different from gut probiotics.",
    options: [
      { value: "none", label: "No" },
      { value: "k12", label: "S. salivarius K12", sub: "BLIS, Prodentis" },
      { value: "m18", label: "S. salivarius M18" },
      { value: "reuteri", label: "L. reuteri", sub: "BioGaia Prodentis" },
      { value: "other_oral_probiotic", label: "Other oral probiotic" },
      { value: "not_sure", label: "Not sure what's in it" },
    ],
    explanation: { label: "Why this matters", body: "If you're already taking K12 or L. reuteri, we won't recommend starting it. If your results show opportunity AND you're not taking one, we'll suggest the specific strain that matches your bacterial pattern." },
  },
  {
    id: "q29", section: "§4 · Oral hygiene", sectionLabel: "Oral hygiene",
    type: "choice", dbCol: "last_dental_cleaning_months", tag: "new",
    question: "When was your last professional dental cleaning?",
    helper: "Regular cleanings reset bacterial load. Timing matters for interpreting your results.",
    options: [
      { value: "3", label: "Within 3 months" },
      { value: "6", label: "3–6 months ago" },
      { value: "12", label: "6–12 months ago" },
      { value: "24", label: "1–2 years ago" },
      { value: "36", label: "More than 2 years ago" },
    ],
    explanation: { label: "What this means", body: "If you were cleaned recently, your bacteria may be at a temporary low point. If it's been over a year, elevated bacteria may respond strongly to a professional cleaning — a quick intervention with measurable results." },
  },

  // ═══ §5 SYMPTOMS (5) ═══
  {
    id: "q30", section: "§5 · Symptoms", sectionLabel: "Symptoms",
    type: "choice", dbCol: "bleeding_gums", dbTable: "user_symptoms", tag: "new",
    question: "How often do your gums bleed when you brush or floss?",
    helper: "Bleeding is a direct clinical sign — not just \"something that happens.\"",
    options: [
      { value: "1", label: "Never" },
      { value: "2", label: "Occasionally, when I floss rarely" },
      { value: "3", label: "Often, even when I floss regularly" },
      { value: "4", label: "Every time" },
      { value: "0", label: "Not sure — I don't floss enough to notice" },
    ],
    explanation: { label: "What this means", body: "Bleeding gums even with regular flossing escalates the concern level. If your Porphyromonas or Fusobacterium are elevated, this symptom alongside the bacteria suggests a periodontal exam — not just better home care." },
  },
  {
    id: "q31", section: "§5 · Symptoms", sectionLabel: "Symptoms",
    type: "choice", dbCol: "tooth_sensitivity", dbTable: "user_symptoms", tag: "new",
    question: "Do you experience tooth sensitivity to hot, cold, or sweet foods?",
    helper: "Sensitivity often reflects enamel wear, gum recession, or acid exposure.",
    options: [
      { value: "1", label: "Never" },
      { value: "2", label: "Occasionally" },
      { value: "3", label: "Frequently" },
      { value: "5", label: "Constant — it affects what I eat" },
    ],
    explanation: { label: "What this means", body: "Tooth sensitivity combined with acidic oral pH or elevated cavity bacteria tells a more specific story than either alone. We'll cross-reference with your pH balance data." },
  },
  {
    id: "q32", section: "§5 · Symptoms", sectionLabel: "Symptoms",
    type: "choice", dbCol: "bad_breath_self", dbTable: "user_symptoms", tag: "new",
    question: "How would you describe your breath?",
    helper: "Honest answer — bad breath is almost always bacterial, not personal.",
    options: [
      { value: "1", label: "Fresh all day" },
      { value: "2", label: "Fine usually, morning breath is the only issue" },
      { value: "3", label: "I worry about it during the day" },
      { value: "4", label: "Partner / friends have mentioned it" },
      { value: "5", label: "Chronic issue I've tried to fix" },
    ],
    explanation: { label: "What this means", body: "Morning-only bad breath is usually overnight VSC buildup — treatable with tongue scraping. If you've been told by others, your Solobacterium moorei or Prevotella levels are probably elevated and we'll target those directly." },
  },
  {
    id: "q33", section: "§5 · Symptoms", sectionLabel: "Symptoms",
    type: "choice", dbCol: "gum_recession", dbTable: "user_symptoms", tag: "new",
    question: "Have you noticed your gums pulling back from your teeth?",
    helper: "Teeth looking \"longer\" than they used to, or sensitivity at the gumline.",
    options: [
      { value: "false", label: "No" },
      { value: "true", label: "Yes — I've noticed some recession" },
      { value: "not_sure", label: "Not sure" },
    ],
    explanation: { label: "What this means", body: "Gum recession exposes root surfaces, which are more vulnerable to decay and sensitivity. If your gum bacteria are also elevated, it confirms active tissue changes worth addressing with your dentist." },
  },
  {
    id: "q34", section: "§5 · Symptoms", sectionLabel: "Symptoms",
    type: "choice", dbCol: "jaw_pain_tmj", dbTable: "user_symptoms", tag: "new",
    question: "Do you experience jaw pain, clicking, or difficulty opening your mouth wide?",
    helper: "TMJ symptoms often cluster with bruxism and sleep disruption.",
    options: [
      { value: "false", label: "No" },
      { value: "true", label: "Yes — occasionally or frequently" },
    ],
    explanation: { label: "What this means", body: "Jaw pain or clicking combined with bruxism and morning headaches forms the bruxism triad. Together they point to sympathetic nervous system activation during sleep." },
  },

  // ═══ §6 DIET (4) ═══
  {
    id: "q35", section: "§6 · Diet", sectionLabel: "Diet",
    type: "choice", dbCol: "dietary_nitrate_frequency", tag: "keep",
    question: "How often do you eat leafy greens or nitrate-rich vegetables?",
    helper: "Arugula, spinach, beets, beet greens, chard. Think servings, not handfuls.",
    options: [
      { value: "rarely", label: "Rarely or never" },
      { value: "few_times_month", label: "A few times a month" },
      { value: "several_weekly", label: "A few times a week" },
      { value: "daily", label: "Daily" },
      { value: "multiple_daily", label: "Multiple servings daily" },
    ],
    explanation: { label: "What this unlocks", body: "We'll cross-reference with your Neisseria levels. If both are light, leafy greens become a top recommendation. If you eat them daily but Neisseria is still low, something else is suppressing them." },
  },
  {
    id: "q36", section: "§6 · Diet", sectionLabel: "Diet",
    type: "choice", dbCol: "sugar_intake", tag: "keep",
    question: "How often do you consume sugary foods or drinks?",
    helper: "Candy, pastries, soda, juice, sweetened coffee. Frequency matters more than amount.",
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "occasionally", label: "Occasionally (few times a week)" },
      { value: "often", label: "Often (daily)" },
      { value: "multiple_daily", label: "Multiple times daily" },
      { value: "every_meal", label: "With most meals and snacks" },
    ],
    explanation: { label: "What this means", body: "Sugar frequency creates repeated acid attacks — each exposure is a 20-minute pH drop that cavity bacteria thrive in. We'll pair this with your S. mutans levels." },
  },
  {
    id: "q37", section: "§6 · Diet", sectionLabel: "Diet",
    type: "choice", dbCol: "xylitol_use", tag: "new",
    question: "Do you use xylitol gum or mints?",
    helper: "Xylitol is a sugar alcohol that S. mutans can't metabolize — it starves cavity bacteria.",
    options: [
      { value: "never", label: "Never" },
      { value: "rarely", label: "Rarely" },
      { value: "occasionally", label: "Occasionally" },
      { value: "daily_multiple", label: "Daily (multiple pieces)" },
    ],
    explanation: { label: "What this means", body: "Xylitol at 6+ grams/day (about 5 pieces of gum) consistently reduces S. mutans in controlled trials. If your cavity bacteria are elevated and you're not using xylitol, it's one of the easiest interventions." },
  },
  {
    id: "q38_placeholder", section: "§6 · Diet", sectionLabel: "Diet",
    type: "choice", dbCol: "gerd_nocturnal", tag: "keep",
    question: "Do you experience acid reflux or heartburn, especially at night?",
    helper: "Nocturnal reflux changes oral pH and can shift acid-producing bacteria.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
      { value: "nightly", label: "Most nights" },
    ],
    explanation: { label: "What this means", body: "Nocturnal acid reflux bathes your oral cavity in stomach acid, shifting pH and potentially elevating acid-tolerant bacteria like Lactobacillus. We'll cross-reference with your pH balance." },
  },

  // ═══ §7 MEDICATIONS (2) ═══
  {
    id: "q39", section: "§7 · Medications", sectionLabel: "Medications",
    type: "multi", dbCol: "medications_v2", tag: "rewrite",
    question: "Are you currently taking any of the following?",
    helper: "Select all that apply. Many medications affect oral bacteria — this sharpens our interpretation.",
    options: [
      { value: "none", label: "None of these" },
      { value: "ppi", label: "PPI", sub: "Prilosec, Nexium, Prevacid" },
      { value: "h2_blocker", label: "H2 blocker", sub: "Pepcid, Zantac" },
      { value: "antihistamine_daily", label: "Daily antihistamine", sub: "Zyrtec, Claritin, Allegra" },
      { value: "ssri_snri", label: "SSRI / SNRI", sub: "any antidepressant" },
      { value: "beta_blocker", label: "Beta blocker" },
      { value: "statin", label: "Statin" },
      { value: "metformin", label: "Metformin" },
      { value: "hormonal_contraception", label: "Hormonal contraception" },
      { value: "hormone_therapy", label: "Testosterone / estrogen therapy" },
      { value: "other", label: "Something else", sub: "we'll ask" },
    ],
    explanation: { label: "Why we expanded this", body: "The old question only asked about PPIs. But antihistamines, SSRIs, and beta blockers all cause dry mouth — which shifts oral bacteria independent of any other cause. Knowing your full medication picture lets us distinguish cause from symptom." },
  },
  {
    id: "q40", section: "§7 · Medications", sectionLabel: "Medications",
    type: "choice", dbCol: "medication_frequency", tag: "new",
    question: "How long have you been on these medications?",
    helper: "This helps distinguish short-term effects from chronic patterns.",
    conditionalOn: { field: "medications_v2", notEquals: "none" },
    options: [
      { value: "daily_long_term", label: "Daily, long-term (6+ months)" },
      { value: "daily_short_term", label: "Daily, started recently (<6 months)" },
      { value: "as_needed", label: "As needed (not daily)" },
      { value: "started_recently", label: "Just started (last few weeks)" },
    ],
    explanation: { label: "What this means", body: "Long-term medication use creates stable effects on your oral bacteria. Recently started medications may cause temporary disruption that looks like — but isn't — a permanent pattern." },
  },

  // ═══ §8 SUBSTANCES (2) ═══
  {
    id: "q41", section: "§8 · Substances", sectionLabel: "Substances",
    type: "choice", dbCol: "smoking_status", tag: "keep",
    question: "Do you smoke, vape, or use other tobacco products?",
    helper: "No judgment — this is the strongest modifiable factor for your oral microbiome.",
    options: [
      { value: "never", label: "Never" },
      { value: "former", label: "Former smoker (quit 6+ months ago)" },
      { value: "current_social", label: "Social smoker (occasional)" },
      { value: "current_daily", label: "Daily smoker" },
      { value: "vape_daily", label: "Daily vaper" },
      { value: "other_tobacco", label: "Other tobacco (chew, snus, hookah)" },
    ],
    explanation: { label: "What this means", body: "Smoking simultaneously suppresses nitrate-reducing bacteria AND feeds gum inflammation bacteria — a dual hit. Even vaping shows oral microbiome disruption in emerging research. Any reduction helps." },
  },
  {
    id: "q42", section: "§8 · Substances", sectionLabel: "Substances",
    type: "choice", dbCol: "antibiotics_window", tag: "keep",
    question: "When did you last take antibiotics?",
    helper: "Antibiotics disrupt your oral microbiome for weeks to months. Timing matters.",
    options: [
      { value: "within_1_month", label: "Within the last month" },
      { value: "within_3_months", label: "1–3 months ago" },
      { value: "within_6_months", label: "3–6 months ago" },
      { value: "within_year", label: "6–12 months ago" },
      { value: "over_year", label: "More than a year ago" },
      { value: "none", label: "Can't remember / never" },
    ],
    explanation: { label: "What this means", body: "Recent antibiotics temporarily suppress diversity and specific species. If your results show low diversity with recent antibiotic use, we'll flag it as transient — not a permanent state — and suggest recovery-supporting actions." },
  },

  // ═══ NR-α additions (ADR-0019) ═══
  // Two NR-pathway-specific lifestyle inputs. Stored alongside the existing
  // dietary_nitrate_frequency (q35) and tongue_scraping_freq (q26) — those
  // capture habit detail; these capture the binned signal the NR confounder
  // logic actually consumes (low/moderate/high; never/occasional/daily). See
  // ADR-0019 for why both pairs coexist in this slice.
  {
    id: "q43", section: "§6 · Diet", sectionLabel: "Diet",
    type: "choice", dbCol: "dietary_nitrate_intake", tag: "new",
    question: "How often do you eat leafy greens, beets, or other nitrate-rich foods?",
    helper: "Includes spinach, arugula, kale, beets, beet juice, celery, and similar. These foods are the substrate your oral bacteria use to produce nitric oxide.",
    options: [
      { value: "low", label: "Rarely (less than weekly)" },
      { value: "moderate", label: "Few times per week" },
      { value: "high", label: "Most days" },
    ],
    explanation: { label: "Why we ask", body: "Even a robust nitrate-reducing community produces little nitric oxide without dietary substrate. Clinical trials use ~6.4 mmol nitrate (≈400 mg/day) — roughly two cups of arugula or one beet." },
  },
  {
    id: "q44", section: "§4 · Oral hygiene", sectionLabel: "Oral hygiene",
    type: "choice", dbCol: "tongue_scraping", tag: "new",
    question: "Do you scrape your tongue?",
    helper: "Tongue scraping mechanically removes some of the bacteria responsible for converting dietary nitrate to nitric oxide. Frequency matters.",
    options: [
      { value: "never", label: "Never" },
      { value: "occasional", label: "Occasionally (a few times per week or less)" },
      { value: "daily", label: "Daily (or multiple times per day)" },
    ],
    explanation: { label: "Why we ask", body: "The nitrate-reducing community lives mostly on the back of the tongue. Daily scraping can suppress it; if your NR scores are low, easing off scraping is one of the fastest levers." },
  },
]

export function getV2QuestionCount(): number {
  return TOTAL
}

export function getNewQuestionIds(): string[] {
  return V2_QUESTIONS.filter(q => q.tag === "new").map(q => q.id)
}

export function getV1AnsweredFields(existingRecord: Record<string, unknown>): Set<string> {
  const answered = new Set<string>()
  for (const q of V2_QUESTIONS) {
    if (q.tag === "keep" || q.tag === "rewrite") {
      const val = existingRecord[q.dbCol]
      if (val != null && val !== "" && val !== "none") answered.add(q.id)
    }
  }
  return answered
}

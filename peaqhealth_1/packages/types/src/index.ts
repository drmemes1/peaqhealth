// ─── Re-export score engine types ────────────────────────────────────────────
export type {
  SleepInputs,
  BloodInputs,
  OralInputs,
  LifestyleInputs,
  PeaqScoreResult,
  LabFreshness,
  ExerciseLevel,
  BrushingFreq,
  FlossingFreq,
  DentalVisit,
  MouthwashType,
  SmokingStatus,
  SleepDuration,
  SleepLatency,
  SleepQualSelf,
  DaytimeFatigue,
} from '@peaq/score-engine'

// ─── User / Auth ──────────────────────────────────────────────────────────────

export interface PeaqUser {
  id: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
  updatedAt: string
}

// ─── Wearable connection (Junction) ──────────────────────────────────────────

export type WearableProvider =
  | 'apple_health'
  | 'oura'
  | 'whoop'
  | 'garmin'
  | 'fitbit'
  | 'polar'

export type ConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error'

export interface WearableConnection {
  id: string
  userId: string
  provider: WearableProvider
  junctionUserId: string
  status: ConnectionStatus
  connectedAt: string
  lastSyncAt?: string
  retroNights?: number   // nights found on first retroactive scan
}

// ─── Lab results ─────────────────────────────────────────────────────────────

export type LabSource = 'upload_pdf' | 'junction_parser' | 'manual_entry'
export type LabFreshnessUI = 'fresh' | 'aging' | 'stale' | 'expired' | 'none'

export interface LabResult {
  id: string
  userId: string
  source: LabSource
  labName?: string          // "Quest Diagnostics", "LabCorp", etc.
  collectionDate: string    // ISO date
  uploadedAt: string

  // Parsed marker values (all optional — parser may not find all)
  hsCRP_mgL?: number
  vitaminD_ngmL?: number
  apoB_mgdL?: number
  ldl_mgdL?: number
  hdl_mgdL?: number
  triglycerides_mgdL?: number
  lpa_mgdL?: number
  glucose_mgdL?: number
  hba1c_pct?: number
  esr_mmhr?: number
  homocysteine_umolL?: number
  ferritin_ngmL?: number

  // Junction parser job tracking
  junctionParserJobId?: string
  parserStatus?: 'pending' | 'complete' | 'failed'
  rawPdfStoragePath?: string
}

// ─── Oral kit ────────────────────────────────────────────────────────────────

export type KitStatus =
  | 'ordered'
  | 'shipped'
  | 'delivered'
  | 'registered'
  | 'in_transit_to_lab'
  | 'processing'
  | 'results_ready'

export interface OralKitOrder {
  id: string
  userId: string
  orderedAt: string
  status: KitStatus
  trackingNumber?: string
  zymoReportId?: string

  // Results (populated when status = 'results_ready')
  shannonDiversity?: number
  nitrateReducersPct?: number
  periodontopathogenPct?: number
  osaTaxaPct?: number
  collectionDate?: string
}

// ─── Lifestyle questionnaire ──────────────────────────────────────────────────

export interface LifestyleRecord {
  id: string
  userId: string
  answeredAt: string
  updatedAt: string

  exerciseLevel: string
  brushingFreq: string
  flossingFreq: string
  mouthwashType: string
  lastDentalVisit: string
  smokingStatus: string
  knownHypertension: boolean
  knownDiabetes: boolean
  sleepDuration: string
  sleepLatency: string
  sleepQualSelf: string
  daytimeFatigue: string
  nightWakings: string
  sleepMedication: string
}

// ─── Score snapshot ───────────────────────────────────────────────────────────

export interface ScoreSnapshot {
  id: string
  userId: string
  calculatedAt: string
  engineVersion: string

  score: number
  category: 'optimal' | 'good' | 'moderate' | 'attention'

  // Panel sub-scores
  sleepSub: number
  sleepSource: 'wearable' | 'questionnaire' | 'none'
  bloodSub: number
  oralSub: number
  lifestyleSub: number
  interactionPool: number

  // Source IDs (for audit trail)
  labResultId?: string
  oralKitId?: string
  wearableConnectionId?: string
  lifestyleRecordId?: string

  // Freshness
  labFreshness: LabFreshnessUI
}

// ─── Onboarding state ────────────────────────────────────────────────────────

export type OnboardingStep =
  | 'welcome'
  | 'create_account'
  | 'connect_wearable'
  | 'blood_labs'
  | 'oral_kit'
  | 'lifestyle'
  | 'score_reveal'
  | 'complete'

export interface OnboardingState {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  wearableConnected: boolean
  bloodConnected: boolean
  oralOrdered: boolean
  lifestyleAnswered: boolean
}

// ─── API response wrappers ───────────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiError {
  ok: false
  error: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

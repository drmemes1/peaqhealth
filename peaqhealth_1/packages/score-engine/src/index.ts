export {
  calculatePeaqScore,
  computeLabFreshness,
  estimateSleepFromQuestionnaire,
} from './engine'

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
} from './engine'

export { parseOralMicrobiome } from './oral-parser'
export type { ZymoReport, OralScore, OralFinding, SpeciesFinding } from './oral-parser'

export { scoreOralAgainstNHANES } from './oral-nhanes-scorer'
export type { OralNHANESInput, OralNHANESScore, MetricResult, SequencingSource } from './oral-nhanes-scorer'

export { calcPeaqAge, calcOMA } from './peaqAge'
export type {
  PeaqAgeInputs, PeaqAgeResult, PeaqAgeBand,
  BloodworkInputs as PeaqBloodworkInputs,
  FitnessInputs as PeaqFitnessInputs,
  SleepInputs as PeaqSleepInputs,
  OMAInputs, OMAResult,
} from './peaqAge'

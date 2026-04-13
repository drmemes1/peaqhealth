export type OnboardingStep =
  | "welcome"
  | "lifestyle"
  | "wearable"
  | "blood"
  | "oral"
  | "score"
  | "done";

export const STEPS: OnboardingStep[] = [
  "welcome",
  "lifestyle",
  "wearable",
  "blood",
  "oral",
  "score",
  "done",
];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: "Welcome",
  lifestyle: "Lifestyle",
  wearable: "Wearable",
  blood: "Blood labs",
  oral: "Oral kit",
  score: "Your score",
  done: "Done",
};

export type PanelStatus = "pending" | "active" | "skipped";

export interface PanelStates {
  sleep: PanelStatus;
  blood: PanelStatus;
  oral: PanelStatus;
  lifestyle: PanelStatus;
}

export type WearableProvider = "apple_watch" | "oura" | "whoop" | "garmin";

export interface DetectedMarker {
  name: string;
  value: number;
  unit: string;
}

export interface LifestyleAnswers {
  // Demographics
  ageRange: string;
  biologicalSex: string;
  exerciseLevel: string;
  brushingFreq: string;
  flossingFreq: string;
  mouthwashType: string;
  lastDentalVisit: string;
  smokingStatus: string;
  knownHypertension: boolean;
  knownDiabetes: boolean;
  sleepDuration: string;
  sleepLatency: string;
  sleepQualSelf: string;
  nightWakings: string;
  daytimeFatigue: string;
  // Medical history
  hypertensionDx: string;
  onBPMeds: string;
  onStatins: string;
  familyHistoryCVD: string;
  // Nutrition
  fermentedFoodsFrequency: string;
  vegetableServings: string;
  fruitServings: string;
  processedFood: string;
  sugaryDrinks: string;
  // Alcohol
  alcoholDrinks: string;
  // Stress
  stressLevel: string;
  // V5
  hsCrpAvailable: string;
}

export interface OnboardingData {
  wearableProvider: WearableProvider | null;
  wearableConnected: boolean;
  bloodUploaded: boolean;
  bloodMarkers: DetectedMarker[];
  oralOrdered: boolean;
  lifestyleCompleted: boolean;
  lifestyleAnswers: LifestyleAnswers | null;
}

export const INITIAL_DATA: OnboardingData = {
  wearableProvider: null,
  wearableConnected: false,
  bloodUploaded: false,
  bloodMarkers: [],
  oralOrdered: false,
  lifestyleCompleted: false,
  lifestyleAnswers: null,
};

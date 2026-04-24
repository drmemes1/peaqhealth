export const CATEGORY_TOPICS: Record<string, string[]> = {
  // Oral
  bacterial_diversity: ["oral-microbiome", "methodology", "foundational", "community-types"],
  nitric_oxide_pathway: ["nitric-oxide", "cardiovascular", "blood-pressure", "dietary-nitrate"],
  gum_health_bacteria: ["periodontitis", "cross-panel-evidence", "cardiovascular"],
  cavity_bacteria: ["caries", "pH", "intervention"],
  cavity_protectors: ["caries", "pH", "arginine"],
  nighttime_breathing: ["sleep-disordered-breathing", "cross-panel-evidence"],
  halitosis: ["veillonella", "oral-microbiome"],

  // Blood
  heart_lipids: ["cardiovascular", "cross-panel-evidence"],
  metabolic: ["cardiovascular", "cross-sectional"],
  inflammation: ["periodontitis", "cardiovascular", "cross-panel-evidence"],

  // Sleep
  breathing_pattern: ["sleep-disordered-breathing", "cross-panel-evidence"],
  sleep_duration: ["sleep-tracking"],
  recovery_stress: ["cardiovascular"],

  // Cross-panel
  oral_cardiovascular: ["cross-panel-evidence", "cardiovascular", "nitric-oxide"],
  sleep_oral_breathing: ["cross-panel-evidence", "sleep-disordered-breathing"],
  oral_metabolic: ["cross-panel-evidence", "cardiovascular", "caries"],
}

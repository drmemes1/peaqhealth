interface IXChip {
  key: string
  label: string
}

const IX_LIST: IXChip[] = [
  { key: "sleepInflammation", label: "Sleep × CRP" },
  { key: "spo2Lipid",         label: "SpO2 × Lipids" },
  { key: "dualInflammatory",  label: "ESR + CRP dual" },
  { key: "hrvHomocysteine",   label: "HRV × Homocysteine" },
  { key: "periodontCRP",      label: "Oral path × CRP" },
  { key: "osaTaxaSpO2",       label: "OSA taxa × SpO2" },
  { key: "lowNitrateCRP",     label: "Nitrate × CRP" },
  { key: "lowDiversitySleep", label: "Diversity × Sleep" },
  { key: "familyCVDApoB",     label: "Family CVD × ApoB" },
  { key: "highStressCRP",     label: "Stress × CRP" },
  { key: "poorNutritionTrig", label: "Nutrition × TG" },
  { key: "highHRPoorSleep",   label: "High HR × Sleep" },
  { key: "alcoholPoorSleep",  label: "Alcohol × Sleep" },
  { key: "poorSleepOralQ",    label: "Sleep Q × Oral" },
  { key: "poorExerciseSmoking", label: "Sedentary × Smoking" },
]

interface IXChipsProps {
  oralActive: boolean
  interactions: Record<string, boolean>
}

export function IXChips({ interactions }: IXChipsProps) {
  // Only show interactions that actually fired
  const fired = IX_LIST.filter(chip => interactions[chip.key] === true)

  if (fired.length === 0) {
    return (
      <p style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: 11,
        color: "var(--ink-30)",
        margin: 0,
      }}>
        No interactions detected with current data
      </p>
    )
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {fired.map(chip => (
        <span
          key={chip.key}
          style={{
            fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
            fontSize: 10,
            padding: "4px 10px",
            borderRadius: 3,
            background: "#FEE2E2",
            color: "#991B1B",
          }}
        >
          {chip.label}
        </span>
      ))}
    </div>
  )
}

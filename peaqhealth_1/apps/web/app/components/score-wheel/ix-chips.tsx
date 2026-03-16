interface IXChip {
  key: string
  label: string
  requiresOral: boolean
}

const IX_LIST: IXChip[] = [
  { key: "sleepInflammation", label: "Sleep × CRP",        requiresOral: false },
  { key: "spo2Lipid",         label: "SpO2 × Lipids",      requiresOral: false },
  { key: "dualInflammatory",  label: "ESR + CRP dual",     requiresOral: false },
  { key: "hrvHomocysteine",   label: "HRV × Homocysteine", requiresOral: false },
  { key: "periodontCRP",      label: "Oral path × CRP",    requiresOral: true  },
  { key: "osaTaxaSpO2",       label: "OSA taxa × SpO2",    requiresOral: true  },
  { key: "lowNitrateCRP",     label: "Nitrate × CRP",      requiresOral: true  },
  { key: "lowDiversitySleep", label: "Diversity × Sleep",  requiresOral: true  },
]

interface IXChipsProps {
  oralActive: boolean
  interactions: Record<string, boolean>
}

export function IXChips({ oralActive, interactions }: IXChipsProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {IX_LIST.map(chip => {
        const locked = chip.requiresOral && !oralActive
        const fired = !locked && interactions[chip.key] === false
        return (
          <span
            key={chip.key}
            style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 10,
              padding: "4px 10px",
              borderRadius: 3,
              ...(locked
                ? { background: "var(--warm-50)", color: "var(--ink-30)", border: "0.5px dashed var(--ink-12)" }
                : fired
                ? { background: "#FEE2E2", color: "#991B1B" }
                : { background: "#EAF3DE", color: "#2D6A4F" }),
            }}
          >
            {chip.label}{!locked ? (fired ? " — fired" : " — clear") : ""}
          </span>
        )
      })}
    </div>
  )
}

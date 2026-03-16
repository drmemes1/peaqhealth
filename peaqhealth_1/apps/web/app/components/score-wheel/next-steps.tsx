interface NextStep { bold: string; rest: string }

interface NextStepsProps {
  sleepConnected: boolean
  hasBlood: boolean
  oralActive: boolean
  sleepHrv?: number
  sleepDeepPct?: number
  labFreshness: string
  bloodMonthsOld?: number
}

export function NextSteps({ sleepConnected, hasBlood, oralActive, sleepHrv, sleepDeepPct, labFreshness, bloodMonthsOld }: NextStepsProps) {
  const steps: NextStep[] = []

  if (sleepConnected && sleepHrv !== undefined && sleepHrv < 50) {
    steps.push({ bold: "Prioritise sleep timing consistency.", rest: " HRV responds strongly to consistent sleep and wake times — a 30-minute variance reduction shifts RMSSD by 5–8 ms over 4 weeks." })
  }
  if (sleepDeepPct !== undefined && sleepDeepPct < 17) {
    steps.push({ bold: "Temperature for deep sleep.", rest: " Core temperature drop drives slow-wave entry. A cooler room (65–68°F) is the highest-evidence environmental lever for increasing SWS." })
  }
  if (!oralActive) {
    steps.push({ bold: "Complete your oral kit.", rest: " 25 points and 4 interaction terms pending. The oral panel bridges sleep, cardiovascular, and metabolic health in a single test." })
  } else {
    steps.push({ bold: "Retest oral in 90 days.", rest: " Shannon diversity responds to fibre intake and sleep quality within 6–8 weeks." })
  }
  if (labFreshness === "stale" && bloodMonthsOld) {
    steps.push({ bold: `Retest blood soon.`, rest: ` ApoB and Lp(a) are stable markers. Request HbA1c at the same draw to track glycaemic trend alongside sleep improvements.` })
  } else if (!hasBlood) {
    steps.push({ bold: "Upload recent lab results", rest: " to unlock your blood panel and 28 additional points." })
  }
  if (steps.length === 0) {
    steps.push({ bold: "Your profile is complete.", rest: " Keep syncing your wearable daily and retest labs in 90 days." })
  }

  return (
    <div style={{ background: "var(--ink)", borderRadius: 4, padding: 26 }}>
      <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 25, fontWeight: 300, color: "white", margin: "0 0 24px" }}>
        What to focus on <em style={{ color: "var(--gold)", fontStyle: "italic" }}>next.</em>
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 16 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, color: "var(--gold)", flexShrink: 0, width: 18 }}>{i + 1}</span>
            <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              <strong style={{ color: "white", fontWeight: 500 }}>{step.bold}</strong>{step.rest}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

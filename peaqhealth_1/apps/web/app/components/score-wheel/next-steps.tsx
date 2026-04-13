// LEGACY: Sub-component of score-wheel — used only for users without a V5 snapshot.
// Remove after V5 migration confirmed (all users have score_version = 'v5').

interface FocusItem {
  panel: "sleep" | "blood" | "oral"
  text: string
  pts: number
}

const PANEL_COLOR: Record<FocusItem["panel"], string> = {
  sleep: "#185FA5",
  blood: "#A32D2D",
  oral:  "#3B6D11",
}

interface NextStepsProps {
  sleepConnected: boolean
  hasBlood: boolean
  oralActive: boolean
  bloodLdl?: number
  bloodHsCrp?: number
  bloodVitaminD?: number
  bloodGlucose?: number
  bloodHba1c?: number
}

export function NextSteps({
  sleepConnected, hasBlood, oralActive,
  bloodLdl, bloodHsCrp, bloodVitaminD, bloodGlucose, bloodHba1c,
}: NextStepsProps) {
  const items: FocusItem[] = []

  // ── Missing panels (highest impact) ──────────────────────────────────────
  if (!sleepConnected)
    items.push({ panel: "sleep", text: "Connect a wearable to unlock sleep scoring — worth up to 27 pts", pts: 27 })

  if (!oralActive)
    items.push({ panel: "oral", text: "Order your oral microbiome kit — worth up to 27 pts", pts: 27 })

  // ── Out-of-range blood markers ────────────────────────────────────────────
  if (hasBlood && bloodLdl !== undefined && bloodLdl > 130)
    items.push({ panel: "blood", text: `LDL at ${bloodLdl} mg/dL — consider dietary changes or discuss statins with your doctor`, pts: 4 })

  if (hasBlood && bloodHsCrp !== undefined && bloodHsCrp > 2)
    items.push({ panel: "blood", text: `hsCRP at ${bloodHsCrp} mg/L — elevated inflammation, review diet and stress`, pts: 3 })

  if (hasBlood && bloodGlucose !== undefined && bloodGlucose > 99)
    items.push({ panel: "blood", text: `Fasting glucose at ${bloodGlucose} mg/dL — prediabetic range, reduce refined carbs`, pts: 3 })

  if (hasBlood && bloodVitaminD !== undefined && bloodVitaminD > 0 && bloodVitaminD < 30)
    items.push({ panel: "blood", text: `Vitamin D at ${bloodVitaminD} ng/mL — below optimal, consider supplementation`, pts: 2 })

  // ── Missing high-value blood markers ─────────────────────────────────────
  if (hasBlood && !bloodHsCrp)
    items.push({ panel: "blood", text: "Add hsCRP to your next blood panel — key inflammation marker worth ~3 pts", pts: 3 })

  if (hasBlood && !bloodHba1c)
    items.push({ panel: "blood", text: "Add HbA1c to your next panel — metabolic health marker worth ~3 pts", pts: 3 })

  if (hasBlood && !bloodVitaminD)
    items.push({ panel: "blood", text: "Add Vitamin D to your next panel — worth up to 2 pts", pts: 2 })

  if (!hasBlood)
    items.push({ panel: "blood", text: "Upload your most recent blood panel to unlock blood scoring — worth up to 33 pts", pts: 33 })

  // Sort highest pts first, take top 3
  items.sort((a, b) => b.pts - a.pts)
  const top = items.slice(0, 3)

  if (top.length === 0) return null

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>
          What to focus on <em style={{ fontStyle: "italic", color: "var(--gold)" }}>next.</em>
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {top.map((item, i) => (
          <div
            key={i}
            style={{
              background: "var(--off-white)",
              border: "0.5px solid var(--ink-12)",
              borderLeft: `3px solid ${PANEL_COLOR[item.panel]}`,
              borderRadius: 8,
              padding: 16,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{
                display: "block",
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: PANEL_COLOR[item.panel],
                marginBottom: 5,
              }}>
                {item.panel}
              </span>
              <p style={{
                fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--ink)",
                margin: 0,
              }}>
                {item.text}
              </p>
            </div>
            <span style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: 11,
              color: "#C49A3C",
              flexShrink: 0,
              paddingTop: 1,
            }}>
              +{item.pts} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

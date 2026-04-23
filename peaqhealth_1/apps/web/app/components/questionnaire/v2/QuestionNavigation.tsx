"use client"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function QuestionNavigation({ onBack, onNext, onSave, isFirst, isLast, canProceed }: {
  onBack: () => void
  onNext: () => void
  onSave: () => void
  isFirst: boolean
  isLast: boolean
  canProceed: boolean
}) {
  const btnBase: React.CSSProperties = {
    padding: "12px 24px", background: "transparent",
    border: "1px solid #D6D3C8", borderRadius: 10,
    fontFamily: sans, fontSize: 12, fontWeight: 600,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: "#8C897F", cursor: "pointer", transition: "all 0.15s",
  }

  return (
    <div style={{
      marginTop: "auto", paddingTop: 24, borderTop: "1px solid #D6D3C8",
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
    }}>
      <button
        onClick={onBack}
        disabled={isFirst}
        style={{ ...btnBase, opacity: isFirst ? 0.4 : 1, cursor: isFirst ? "not-allowed" : "pointer" }}
      >
        ← Back
      </button>
      <span
        onClick={onSave}
        style={{
          fontFamily: sans, fontSize: 11, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "#8C897F", fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Save &amp; continue later
      </span>
      <button
        onClick={onNext}
        style={{
          ...btnBase,
          background: canProceed ? "#2C2A24" : "#B0A896",
          color: "#EDEAE1",
          borderColor: canProceed ? "#2C2A24" : "#B0A896",
          cursor: canProceed ? "pointer" : "not-allowed",
        }}
      >
        {isLast ? "Finish →" : "Next →"}
      </button>
    </div>
  )
}

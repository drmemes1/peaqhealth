"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function QuestionScreen({ sectionName, questionNumber, totalQuestions, tag, children }: {
  sectionName: string
  questionNumber: number
  totalQuestions: number
  tag?: "new" | "rewrite" | "keep"
  children: React.ReactNode
}) {
  const pct = (questionNumber / totalQuestions) * 100

  const tagStyles: Record<string, { bg: string; color: string; label: string }> = {
    new: { bg: "rgba(74,100,133,0.15)", color: "#4A6485", label: "NEW" },
    rewrite: { bg: "rgba(184,147,90,0.15)", color: "#B8935A", label: "REWRITE" },
    keep: { bg: "rgba(74,122,74,0.1)", color: "#4A7A4A", label: "KEEP" },
  }

  return (
    <div style={{
      background: "#FAFAF8", border: "1px solid #D6D3C8",
      borderRadius: 20, padding: "36px 36px 28px",
      minHeight: 460, display: "flex", flexDirection: "column",
    }}>
      {/* Meta label */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
        color: "#8C897F", fontWeight: 500, marginBottom: 24, fontFamily: sans,
      }}>
        <span style={{ color: "#B8935A", fontWeight: 600 }}>{sectionName}</span>
        <span>{questionNumber} / {totalQuestions}</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#E6E2D4", borderRadius: 2, overflow: "hidden", marginBottom: 28 }}>
        <div style={{ height: "100%", background: "#2C2A24", borderRadius: 2, width: `${pct}%`, transition: "width 0.3s" }} />
      </div>

      {/* Question number + tag */}
      <div style={{
        fontFamily: serif, fontStyle: "italic", fontSize: 13,
        color: "#8C897F", marginBottom: 4, letterSpacing: "0.04em",
      }}>
        Question {questionNumber}
        {tag && (
          <span style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 6,
            fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
            fontWeight: 600, fontStyle: "normal", marginLeft: 8, verticalAlign: "middle",
            background: tagStyles[tag]?.bg, color: tagStyles[tag]?.color,
          }}>
            {tagStyles[tag]?.label}
          </span>
        )}
      </div>

      {/* Content slot */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  )
}

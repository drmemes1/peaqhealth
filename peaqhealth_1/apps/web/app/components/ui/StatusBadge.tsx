import React from "react"

export type Status = "optimal" | "good" | "watch" | "attention"

const STYLES: Record<Status, { bg: string; text: string; border: string }> = {
  optimal:   { bg: "var(--status-optimal-bg)",   text: "var(--status-optimal-text)",   border: "var(--status-optimal-border)" },
  good:      { bg: "var(--status-good-bg)",      text: "var(--status-good-text)",      border: "var(--status-good-border)" },
  watch:     { bg: "var(--status-watch-bg)",      text: "var(--status-watch-text)",     border: "var(--status-watch-border)" },
  attention: { bg: "var(--status-attention-bg)",  text: "var(--status-attention-text)",  border: "var(--status-attention-border)" },
}

const LABELS: Record<Status, string> = {
  optimal: "Optimal",
  good: "Good",
  watch: "Watch",
  attention: "Attention",
}

export function StatusBadge({ status }: { status: Status }) {
  const s = STYLES[status]
  return (
    <span style={{
      display: "inline-block",
      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: "0.04em",
      color: s.text,
      backgroundColor: s.bg,
      border: `0.5px solid ${s.border}20`,
      padding: "2px 8px",
      borderRadius: 4,
      lineHeight: 1.4,
    }}>
      {LABELS[status]}
    </span>
  )
}

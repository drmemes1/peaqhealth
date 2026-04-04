import React from "react"

export type Panel = "sleep" | "blood" | "oral"

const PANEL_TOKENS: Record<Panel, { bg: string; text: string; border: string }> = {
  sleep: { bg: "var(--panel-sleep-bg)", text: "var(--panel-sleep-text)", border: "var(--panel-sleep-border)" },
  blood: { bg: "var(--panel-blood-bg)", text: "var(--panel-blood-text)", border: "var(--panel-blood-border)" },
  oral:  { bg: "var(--panel-oral-bg)",  text: "var(--panel-oral-text)",  border: "var(--panel-oral-border)" },
}

const DOT_COLORS: Record<Panel, string> = {
  sleep: "#4A7FB5",
  blood: "#C0392B",
  oral:  "#2D6A4F",
}

export function PanelChip({ panel, label }: { panel: Panel; label?: string }) {
  const t = PANEL_TOKENS[panel]
  const displayLabel = label ?? panel.charAt(0).toUpperCase() + panel.slice(1)
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: t.text,
      backgroundColor: t.bg,
      border: `0.5px solid ${t.border}25`,
      padding: "2px 8px 2px 6px",
      borderRadius: 4,
      lineHeight: 1.4,
    }}>
      <span style={{
        width: 5,
        height: 5,
        borderRadius: "50%",
        backgroundColor: DOT_COLORS[panel],
        flexShrink: 0,
      }} />
      {displayLabel}
    </span>
  )
}

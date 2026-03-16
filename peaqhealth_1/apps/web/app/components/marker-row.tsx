import type { Flag } from "@peaq/score-engine/flags"

const FLAG_STYLES: Record<Flag, { bg: string; text: string; label: string }> = {
  good:      { bg: "#EAF3DE", text: "#2D6A4F", label: "Good" },
  watch:     { bg: "#FEF3C7", text: "#92400E", label: "Watch" },
  attention: { bg: "#FEE2E2", text: "#991B1B", label: "Attention" },
  pending:   { bg: "#F7F5F0", text: "rgba(20,20,16,0.6)", label: "Pending" },
}

interface MarkerRowProps {
  name: string
  sub: string
  value: number | null
  unit: string
  flag: Flag
  max?: number
  color: string
  trackColor: string
  mounted?: boolean
}

export function MarkerRow({ name, sub, value, unit, flag, max, color, trackColor, mounted = false }: MarkerRowProps) {
  const isPending = flag === "pending" || value === null
  const flagStyle = FLAG_STYLES[flag]
  const barPct = max && value !== null ? Math.min(value / max, 1) * 100 : 0

  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{
        borderBottom: "0.5px solid var(--ink-06)",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {/* Col 1: name + sub */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="font-body text-[13px]" style={{ color: "var(--ink)" }}>{name}</p>
        <p className="font-body text-[11px]" style={{ color: "var(--ink-60)" }}>{sub}</p>
      </div>

      {/* Col 2: mini bar */}
      <div style={{ flex: 1, minWidth: 60 }}>
        <div style={{ height: 4, borderRadius: 2, background: trackColor, position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: mounted ? `${barPct}%` : "0%",
            background: isPending ? "transparent" : color,
            transition: "width 600ms ease 400ms",
            borderRadius: 2,
          }} />
        </div>
      </div>

      {/* Col 3: value + unit */}
      <div style={{ width: 80, textAlign: "right" }}>
        <span
          className="font-body text-[14px]"
          style={{ color: isPending ? "var(--ink-30)" : (flag === "good" ? color : flag === "attention" ? "#991B1B" : "#92400E") }}
        >
          {isPending ? "—" : value}
        </span>
        <span className="font-body text-[10px] ml-1" style={{ color: "var(--ink-30)" }}>{unit}</span>
      </div>

      {/* Col 4: flag badge */}
      <div style={{ width: 70, textAlign: "right" }}>
        <span
          className="font-body text-[9px] uppercase tracking-[0.05em] px-2 py-0.5 rounded"
          style={{ background: flagStyle.bg, color: flagStyle.text }}
        >
          {flagStyle.label}
        </span>
      </div>
    </div>
  )
}

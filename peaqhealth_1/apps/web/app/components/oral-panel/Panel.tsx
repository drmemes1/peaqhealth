"use client"

import type { ReactNode } from "react"
import DistributionViz, { type DistributionVizProps } from "./DistributionViz"

export type PanelStatus = "strong" | "watch" | "attention"

const STATUS_VARS: Record<PanelStatus, string> = {
  strong: "var(--status-strong)",
  watch: "var(--status-watch)",
  attention: "var(--status-attention)",
}

export interface PanelProps {
  /** Small uppercase label above the title — e.g. "Heart · cardiovascular support". */
  eyebrow?: string
  /** The display title — e.g. "Nitric oxide production". */
  title: string
  /** The headline metric. Pre-formatted (include % or units in the string). */
  value?: string | number
  /** Subtitle for the metric — e.g. "nitrate-reducing bacteria". */
  unit?: string
  /** Status family. Drives the pill color. */
  status?: PanelStatus
  /** Status pill text — e.g. "Strong" or "Immature · strong". */
  statusLabel?: string
  /** Long-form explanation paragraph. */
  body?: string | ReactNode
  /** Optional distribution viz rendered between body and children. */
  distribution?: DistributionVizProps
  /** Layout density. `compact` is for grid usage. */
  variant?: "default" | "compact"
  /** Additional content rendered after the body. */
  children?: ReactNode
}

/**
 * Panel — the workhorse oral-panel card. Renders a single data display
 * such as "Nitric oxide production", "Haemophilus parainfluenzae", or a
 * composite index card.
 *
 * Use Panel for any first-class data surface. For smaller stat tiles in a
 * snapshot row, use QuickStat instead. For action-oriented content,
 * use InterventionCard.
 */
export default function Panel({
  eyebrow,
  title,
  value,
  unit,
  status,
  statusLabel,
  body,
  distribution,
  variant = "default",
  children,
}: PanelProps) {
  const isCompact = variant === "compact"
  const padding = isCompact ? "22px 24px" : "28px 30px"
  const valueClass = isCompact ? "metric-medium" : "metric-large"

  return (
    <article
      className="oravi-panel"
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hairline)",
        borderRadius: 6,
        padding,
      }}
    >
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div> : null}
          <h3 className="font-display" style={{
            fontWeight: 700,
            fontSize: isCompact ? 18 : 22,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: 0,
          }}>
            {title}
          </h3>
        </div>
        {status && statusLabel ? (
          <StatusPill status={status} label={statusLabel} />
        ) : null}
      </header>

      {value != null ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <span className={valueClass} style={{ color: "var(--ink)" }}>{value}</span>
          {unit ? <span className="metric-unit">{unit}</span> : null}
        </div>
      ) : null}

      {body ? (
        <div className="body-small" style={{ marginTop: 16, color: "var(--ink-soft)" }}>
          {body}
        </div>
      ) : null}

      {distribution ? (
        <div style={{ marginTop: 18 }}>
          <DistributionViz {...distribution} />
        </div>
      ) : null}

      {children ? <div style={{ marginTop: 16 }}>{children}</div> : null}

      <style jsx>{`
        @media (max-width: 640px) {
          .oravi-panel {
            padding: 22px 24px !important;
          }
        }
      `}</style>
    </article>
  )
}

function StatusPill({ status, label }: { status: PanelStatus; label: string }) {
  return (
    <span
      role="status"
      style={{
        fontFamily: "var(--font-manrope), sans-serif",
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: STATUS_VARS[status],
        background: `color-mix(in srgb, ${STATUS_VARS[status]} 12%, transparent)`,
        padding: "4px 10px",
        borderRadius: 4,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

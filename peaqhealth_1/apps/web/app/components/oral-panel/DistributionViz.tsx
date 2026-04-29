"use client"

export interface DistributionVizLabels {
  left: string
  center: string
  right: string
}

export interface DistributionVizProps {
  /** Where the user sits on the 0–100 axis. Values outside the range are clamped with an indicator. */
  position: number
  /** The healthy band overlay, expressed in 0–100 units. */
  healthyZone?: { from: number; to: number }
  /** Optional axis labels rendered below the track. */
  labels?: DistributionVizLabels
  /** Override the default screen-reader description. */
  ariaLabel?: string
}

/**
 * DistributionViz — slim horizontal track showing where a user value
 * sits relative to a healthy range.
 *
 * Use inside a Panel below the headline metric, or inline in narrative
 * sections to anchor a comparative claim. Out-of-range positions render
 * the marker pinned to the edge with a small ▸ / ◂ indicator.
 *
 * Status colors are not used here — DistributionViz is a placement
 * primitive, the parent Panel carries the status pill if needed.
 */
export default function DistributionViz({
  position,
  healthyZone,
  labels,
  ariaLabel,
}: DistributionVizProps) {
  const clamped = Math.max(0, Math.min(100, position))
  const isLow = position < 0
  const isHigh = position > 100
  const offset = clamped // already in percent
  const description = ariaLabel ?? buildDefaultAria(position, healthyZone)

  return (
    <div>
      <div
        role="img"
        aria-label={description}
        style={{
          position: "relative",
          height: 14,
          paddingTop: 4, // space for the marker shadow
          paddingBottom: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 4,
            height: 6,
            background: "var(--paper-deeper)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          {healthyZone ? (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: `${healthyZone.from}%`,
                width: `${Math.max(0, healthyZone.to - healthyZone.from)}%`,
                top: 0,
                bottom: 0,
                background: "rgba(107, 143, 115, 0.18)",
              }}
            />
          ) : null}
        </div>
        <div
          tabIndex={0}
          aria-label={description}
          style={{
            position: "absolute",
            left: `${offset}%`,
            top: -1,
            transform: "translateX(-50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--ink)",
            border: "2px solid var(--cream)",
            boxShadow: "0 0 0 1px var(--ink)",
            outline: "none",
          }}
          onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 1px var(--ink), 0 0 0 4px var(--gold-pale)" }}
          onBlur={e => { e.currentTarget.style.boxShadow = "0 0 0 1px var(--ink)" }}
        />
        {(isLow || isHigh) ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: isLow ? `calc(${offset}% + 12px)` : `calc(${offset}% - 12px)`,
              top: -1,
              transform: "translateX(-50%)",
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ink-soft)",
              lineHeight: "14px",
            }}
          >
            {isLow ? "◂" : "▸"}
          </span>
        ) : null}
      </div>

      {labels ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            marginTop: 8,
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 500,
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-soft-2)",
          }}
        >
          <span style={{ textAlign: "left" }}>{labels.left}</span>
          <span style={{ textAlign: "center" }}>{labels.center}</span>
          <span style={{ textAlign: "right" }}>{labels.right}</span>
        </div>
      ) : null}
    </div>
  )
}

function buildDefaultAria(position: number, healthy?: { from: number; to: number }): string {
  const inRange = healthy ? position >= healthy.from && position <= healthy.to : null
  const range = healthy ? `Healthy range ${healthy.from}–${healthy.to}.` : ""
  const where = inRange === true ? "Inside healthy range." : inRange === false ? "Outside healthy range." : ""
  return `Position ${position}. ${range} ${where}`.trim()
}

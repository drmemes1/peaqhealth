/**
 * Dotted-sphere divider used between editorial sections.
 * Single SVG, no animation — sets a calm rhythm between sections.
 */
export function Divider() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "72px 0",
      }}
      aria-hidden
    >
      <svg width="64" height="16" viewBox="0 0 64 16" fill="none" role="img">
        <circle cx="6"  cy="8" r="1.4" fill="var(--gold)" opacity="0.4" />
        <circle cx="20" cy="8" r="1.4" fill="var(--gold)" opacity="0.6" />
        <circle cx="32" cy="8" r="2.2" fill="var(--gold)" />
        <circle cx="44" cy="8" r="1.4" fill="var(--gold)" opacity="0.6" />
        <circle cx="58" cy="8" r="1.4" fill="var(--gold)" opacity="0.4" />
      </svg>
    </div>
  )
}

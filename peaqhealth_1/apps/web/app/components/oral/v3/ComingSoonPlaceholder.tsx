/**
 * Section placeholder used while the underlying scoring algorithm is in
 * development. Same structural footprint as a live section, with reduced
 * visual weight so users can see the page evolving without thinking the
 * page is broken.
 */

const SANS = "var(--font-body)"
const SERIF = "var(--font-display)"

export function ComingSoonPlaceholder({
  title,
  description,
  eyebrow,
}: {
  title: string
  description: string
  eyebrow?: string
}) {
  return (
    <section
      style={{
        background: "var(--off-white)",
        border: "0.5px dashed var(--ink-12)",
        borderRadius: 14,
        padding: "26px 28px",
        marginBottom: 16,
        opacity: 0.92,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span
          style={{
            fontFamily: SANS,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "var(--gold)",
          }}
        >
          {eyebrow ?? "Coming soon"}
        </span>
        <span
          style={{
            fontFamily: SANS,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            background: "var(--gold-dim)",
            color: "var(--gold)",
            padding: "3px 8px",
            borderRadius: 999,
          }}
        >
          In development
        </span>
      </div>
      <h2
        style={{
          fontFamily: SERIF,
          fontSize: 22,
          fontWeight: 600,
          color: "var(--ink)",
          margin: "0 0 8px",
          letterSpacing: "-0.018em",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 14,
          color: "var(--ink-60)",
          margin: 0,
          lineHeight: 1.55,
          maxWidth: 720,
        }}
      >
        {description}
      </p>
    </section>
  )
}

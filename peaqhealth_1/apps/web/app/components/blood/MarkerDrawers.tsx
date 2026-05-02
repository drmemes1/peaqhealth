/**
 * Drawer set for the marker detail page:
 *   • What this measurement reflects        (descriptor.whatItIs)
 *   • What raises and lowers it             (descriptor.raisesAndLowers)
 *   • What this number alone does not capture (descriptor.limitations)
 *   • References                             (descriptor.references)
 *
 * Markers without a descriptor render placeholder copy — every section
 * is always present so the drawer set is consistent across markers.
 */
import { getMarkerById } from "../../../lib/blood/markerRegistry"

const PLACEHOLDER = "[PLACEHOLDER — needs clinical review]"

function Drawer({ title, body }: { title: string; body: string }) {
  return (
    <details
      style={{
        background: "white",
        border: "0.5px solid var(--ink-12, rgba(20,20,16,0.12))",
        borderRadius: 10,
        marginBottom: 10,
        padding: "0 16px",
      }}
    >
      <summary
        style={{
          fontFamily: "var(--font-body), 'Instrument Sans', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: "var(--ink, #141410)",
          padding: "16px 0",
          cursor: "pointer",
          listStyle: "none",
        }}
      >
        {title}
      </summary>
      <p
        style={{
          fontFamily: "var(--font-body), 'Instrument Sans', sans-serif",
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--ink-70, rgba(20,20,16,0.75))",
          margin: "0 0 18px",
          whiteSpace: "pre-wrap",
        }}
      >
        {body}
      </p>
    </details>
  )
}

export function MarkerDrawers({ markerId }: { markerId: string }) {
  const m = getMarkerById(markerId)
  const d = m?.descriptor

  const whatItIs = d?.whatItIs ?? PLACEHOLDER
  const raises = d?.raisesAndLowers.raises ?? PLACEHOLDER
  const lowers = d?.raisesAndLowers.lowers ?? PLACEHOLDER
  const limitations = d?.limitations ?? PLACEHOLDER
  const references = d?.references ?? PLACEHOLDER

  return (
    <section>
      <Drawer title="What this measurement reflects" body={whatItIs} />
      <Drawer
        title="What raises and lowers it"
        body={`What's associated with higher levels:\n${raises}\n\nWhat's associated with lower levels:\n${lowers}`}
      />
      <Drawer title="What this number alone does not capture" body={limitations} />
      <Drawer title="References" body={references} />
    </section>
  )
}

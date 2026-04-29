"use client"

import Link from "next/link"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const DOORS = [
  { href: "/explore", eyebrow: "Bacterial library", title: "Browse all species", desc: "What each bacterium does, in plain language." },
  { href: "/science", eyebrow: "How we score", title: "Methodology", desc: "Every formula, every threshold, every citation." },
  { href: "/science", eyebrow: "Oravi science", title: "The evidence base", desc: "Peer-reviewed research that grounds every claim." },
  { href: "/learn", eyebrow: "Articles", title: "Read more", desc: "Curated reading on the topics that matter to you." },
]

export function DeepDiveDoors({ speciesCount }: { speciesCount: number }) {
  const doors = DOORS.map(d => d.eyebrow === "Bacterial library" ? { ...d, title: `Browse all ${speciesCount} species` } : d)

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {doors.map(door => (
        <Link key={door.eyebrow} href={door.href} style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{
            background: "#F6F3EB", border: "1px solid #D6D3C8", borderRadius: 14,
            padding: "26px 24px 28px", position: "relative", cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#F0EBDB"; e.currentTarget.style.borderColor = "#B8935A" }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F6F3EB"; e.currentTarget.style.borderColor = "#D6D3C8" }}
          >
            <div style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#B8935A", fontWeight: 600, marginBottom: 10 }}>{door.eyebrow}</div>
            <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.2, marginBottom: 6 }}>{door.title}</div>
            <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 13, color: "#6B6860", lineHeight: 1.5 }}>{door.desc}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

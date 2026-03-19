"use client"
import { useState } from "react"
import { haptics } from "@/lib/haptics"
import { IXChips } from "./ix-chips"

interface PanelCardProps {
  label: string
  color: string
  trackColor: string
  score: number
  max: number
  active: boolean
  locked: boolean
  desc: string
  staleBadge?: string
  mounted: boolean
  highlighted?: boolean
}

function PanelCard({ label, color, trackColor, score, max, active, locked, desc, staleBadge, mounted, highlighted }: PanelCardProps) {
  const [hovered, setHovered] = useState(false)
  const barPct = active ? (score / max) * 100 : 0

  return (
    <div
      onMouseEnter={() => { setHovered(true) }}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => haptics.light()}
      style={{
        background: "white",
        border: `0.5px solid ${highlighted ? color + "66" : hovered && active ? "rgba(20,20,16,0.20)" : "var(--ink-12)"}`,
        borderTop: `2px solid ${locked ? "transparent" : active ? color : color + "44"}`,
        borderRadius: 4,
        padding: "14px 16px",
        opacity: locked ? 0.52 : 1,
        transform: hovered && active ? "translateY(-2px)" : "none",
        boxShadow: hovered && active ? "0 4px 16px rgba(20,20,16,0.06)" : "none",
        transition: "transform 0.2s cubic-bezier(.16,1,.3,1), border-color 0.2s ease, box-shadow 0.2s ease",
        cursor: active ? "default" : "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-60)" }}>{label}</span>
        {staleBadge && (
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "var(--amber-bg)", color: "var(--amber)" }}>{staleBadge}</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 300, color: active ? color : "var(--ink-30)" }}>
          {active ? score : "—"}
        </span>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--ink-30)" }}>/ {max}</span>
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: trackColor, margin: "6px 0 8px", overflow: "hidden" }}>
        {active ? (
          <div style={{
            height: "100%", width: mounted ? `${barPct}%` : "0%",
            background: color, borderRadius: 2,
            transition: "width 1.4s cubic-bezier(.16,1,.3,1) 400ms",
          }} />
        ) : (
          <div style={{
            height: "100%", width: "100%",
            backgroundImage: `repeating-linear-gradient(90deg, ${color}22 0, ${color}22 6px, transparent 6px, transparent 14px)`,
          }} />
        )}
      </div>
      <p style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--ink-60)", margin: 0 }}>{desc}</p>
    </div>
  )
}

interface PanelGridProps {
  displaySleep: number
  displayBlood: number
  displayOral: number
  displayIx: number
  sleepConnected: boolean
  labFreshness: string
  oralActive: boolean
  ixPool: number
  interactions: Record<string, boolean>
  sleepDesc: string
  bloodDesc: string
  oralDesc: string
  staleBadge?: string
  mounted: boolean
  hoveredRing: string | null
}

export function PanelGrid({
  displaySleep, displayBlood, displayOral, displayIx,
  sleepConnected, labFreshness, oralActive, ixPool, interactions,
  sleepDesc, bloodDesc, oralDesc, staleBadge,
  mounted, hoveredRing,
}: PanelGridProps) {
  const hasBlood = labFreshness !== "none" && labFreshness !== "expired"
  const bloodLocked = labFreshness === "none" || labFreshness === "expired"

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Panel breakdown</h3>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)" }}>Score composition</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <PanelCard label="Sleep" color="var(--sleep-c)" trackColor="var(--sleep-bg)" score={displaySleep} max={27} active={sleepConnected} locked={!sleepConnected} desc={sleepDesc} mounted={mounted} highlighted={hoveredRing === "sleep"} />
        <PanelCard label="Blood" color="var(--blood-c)" trackColor="var(--blood-bg)" score={displayBlood} max={33} active={hasBlood} locked={bloodLocked} desc={bloodDesc} staleBadge={staleBadge} mounted={mounted} highlighted={hoveredRing === "blood"} />
        <PanelCard label="Oral Microbiome" color="var(--oral-c)" trackColor="var(--oral-bg)" score={displayOral} max={27} active={oralActive} locked={!oralActive} desc={oralDesc} mounted={mounted} highlighted={hoveredRing === "oral"} />
        {/* IX card — 4th cell in 2×2 grid */}
        <div
          style={{
            background: "white",
            border: `0.5px solid ${hoveredRing === "ix" ? "rgba(184,134,11,0.4)" : "var(--ink-12)"}`,
            borderTop: "2px solid var(--gold)",
            borderRadius: 4,
            padding: "14px 16px",
            transition: "border-color 0.2s ease",
          }}
        >
          <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-60)" }}>Interactions</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "4px 0 6px" }}>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 300, color: "var(--gold)" }}>{displayIx}</span>
            <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--ink-30)" }}>/ 15</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "var(--warm-100)", marginBottom: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: mounted ? `${(ixPool / 15) * 100}%` : "0%", background: "var(--gold)", borderRadius: 2, transition: "width 1.4s cubic-bezier(.16,1,.3,1) 400ms" }} />
          </div>
          <IXChips oralActive={oralActive} interactions={interactions} />
        </div>
      </div>
    </div>
  )
}

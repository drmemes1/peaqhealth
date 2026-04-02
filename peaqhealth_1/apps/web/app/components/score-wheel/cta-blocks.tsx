"use client"
import React from "react"
import { useRouter } from "next/navigation"
import { haptics } from "@/lib/haptics"

interface CTABlockProps {
  color: string
  title: React.ReactNode
  points: string
  features: string[]
  buttonLabel: string
  href: string
}

function CTABlock({ color, title, points, features, buttonLabel, href }: CTABlockProps) {
  const router = useRouter()
  return (
    <div style={{ borderRadius: 4, overflow: "hidden" }}>
      <div style={{ background: color, padding: "16px 20px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 300, color: "var(--white)", margin: 0 }}>{title}</h3>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>{points} available</span>
      </div>
      <div style={{ background: "var(--white)", border: "0.5px solid var(--ink-12)", borderTop: "none", borderRadius: "0 0 4px 4px", padding: "16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", marginBottom: 16 }}>
          {features.map(f => (
            <div key={f} style={{ display: "flex", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, fontWeight: 500, color, flexShrink: 0 }}>→</span>
              <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, color: "var(--ink-60)" }}>{f}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => { haptics.medium(); router.push(href) }}
          onTouchStart={() => haptics.medium()}
          style={{ width: "100%", background: color, color: "var(--white)", fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", padding: "12px", borderRadius: 2, cursor: "pointer", border: "none" }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

interface CTABlocksProps {
  sleepConnected: boolean
  labFreshness: string
  oralActive: boolean
}

export function CTABlocks({ sleepConnected, labFreshness, oralActive }: CTABlocksProps) {
  const bloodMissing = labFreshness === "none" || labFreshness === "expired"
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!sleepConnected && (
        <CTABlock
          color="var(--sleep-c)"
          title={<>Unlock your <em style={{ fontStyle: "italic" }}>sleep panel.</em></>}
          points="+27 pts"
          features={["Deep sleep % — slow-wave and metabolic recovery","HRV RMSSD — autonomic recovery","SpO2 dips — sleep-breathing and OSA signal","REM % — cognitive processing","Unlocks 7 cross-panel interaction terms","7-night minimum to unlock"]}
          buttonLabel="Connect wearable — Oura, WHOOP, Garmin"
          href="/settings#wearables"
        />
      )}
      {bloodMissing && (
        <CTABlock
          color="var(--blood-c)"
          title={<>Unlock your <em style={{ fontStyle: "italic" }}>blood panel.</em></>}
          points="+33 pts"
          features={["hsCRP — inflammatory status","ApoB — primary atherogenic marker","Vitamin D — immune and metabolic","Lp(a) — genetic cardiovascular risk","LDL:HDL ratio and triglycerides","Lab freshness tracked over time"]}
          buttonLabel="Upload lab results"
          href="/settings/labs"
        />
      )}
      {!oralActive && (
        <CTABlock
          color="var(--oral-c)"
          title={<>Complete your <em style={{ fontStyle: "italic" }}>Peaq profile.</em></>}
          points="+27 pts"
          features={["Shannon diversity from 16S sequencing","Nitrate-reducing bacteria — NO pathway","Periodontal pathogen burden","OSA-associated taxa","4 cross-panel terms unlocked","Results in 10–14 days"]}
          buttonLabel="Order oral microbiome kit — $129"
          href="/shop"
        />
      )}
    </div>
  )
}

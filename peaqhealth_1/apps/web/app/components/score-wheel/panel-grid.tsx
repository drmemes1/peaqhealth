"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { haptics } from "@/lib/haptics"

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
        background: "#fff",
        border: `0.5px solid ${highlighted ? color + "66" : "rgba(0,0,0,0.06)"}`,
        borderRadius: 12,
        padding: "14px 13px",
        opacity: locked ? 0.52 : 1,
        transform: hovered && active ? "translateY(-3px)" : "none",
        boxShadow: hovered && active
          ? `0 8px 24px rgba(0,0,0,0.08), 0 0 0 1.5px ${color}`
          : "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "pointer",
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

function SyncingCard({ provider }: { provider?: string }) {
  const deviceName =
    provider === "whoop"  ? "WHOOP" :
    provider === "oura"   ? "Oura Ring" :
    provider === "garmin" ? "Garmin" :
    "your wearable"

  return (
    <div style={{
      background: "#fff",
      border: "0.5px solid rgba(0,0,0,0.06)",
      borderRadius: 12,
      padding: "14px 13px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minHeight: 110,
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--sleep-c)",
        animation: "sleep-pulse 2s ease infinite",
      }} />
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 15,
        fontWeight: 400,
        color: "var(--color-text-primary, var(--ink))",
        margin: 0,
        textAlign: "center",
      }}>
        Syncing your sleep data
      </p>
      <p style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: 12,
        color: "var(--color-text-tertiary, var(--ink-30))",
        margin: 0,
        textAlign: "center",
      }}>
        Pulling 30 nights from {deviceName}…
      </p>
    </div>
  )
}

function EmptyPanelCard({ panel, oralOrdered = false }: {
  panel: 'sleep' | 'blood' | 'oral'
  oralOrdered?: boolean
}) {
  const config = {
    sleep: {
      color: '#4A7FB5',
      label: 'SLEEP',
      headline: 'Connect a wearable',
      why_short: 'Nightly HRV, deep sleep, and efficiency data.',
      cta: 'Connect WHOOP or Oura',
      ctaHref: '/settings#wearables',
      stat1: { label: 'Updates', value: 'Every night' },
      stat2: { label: 'Key signal', value: 'HRV + Deep sleep' },
    },
    blood: {
      color: '#C0392B',
      label: 'BLOOD',
      headline: 'Upload your labs',
      why_short: 'Lp(a), hsCRP, ApoB, glucose, and more.',
      cta: 'Upload labs',
      ctaHref: '/dashboard/blood',
      stat1: { label: 'Markers tracked', value: '33' },
      stat2: { label: 'Key signal', value: 'Lp(a) + hsCRP' },
    },
    oral: {
      color: '#2D6A4F',
      label: 'ORAL MICROBIOME',
      headline: oralOrdered ? 'Kit processing' : 'Order your oral kit',
      why_short: '16S rRNA sequencing.',
      cta: oralOrdered ? 'View kit status' : 'Order oral kit',
      ctaHref: oralOrdered ? '/dashboard/oral' : '/shop',
      stat1: { label: 'Technology', value: '16S rRNA' },
      stat2: { label: 'Key signal', value: 'P. gingivalis + Nitrate reducers' },
    },
  }[panel]

  return (
    <div style={{
      border: `0.5px solid rgba(0,0,0,0.06)`,
      borderRadius: 12,
      padding: '14px 13px',
      background: '#fff',
      opacity: 0.85,
    }}>
      <div style={{
        fontSize: '10px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: config.color,
        marginBottom: '8px',
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontWeight: 500,
      }}>
        {config.label}
      </div>
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: '34px',
        fontWeight: 300,
        color: 'var(--ink-30)',
        marginBottom: '4px',
        lineHeight: 1,
      }}>
        —
      </div>
      <div style={{
        height: '3px',
        background: 'var(--ink-08)',
        borderRadius: '2px',
        marginBottom: '10px',
      }} />
      <div style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--ink)',
        marginBottom: '4px',
      }}>
        {config.headline}
      </div>
      <div style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: '12px',
        color: 'var(--ink-40)',
        lineHeight: 1.6,
        marginBottom: '12px',
      }}>
        {config.why_short}
      </div>
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '14px',
        paddingTop: '8px',
        borderTop: '0.5px solid var(--ink-08)',
      }}>
        {[config.stat1, config.stat2].map(stat => (
          <div key={stat.label}>
            <div style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: '9px',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              color: 'var(--ink-30)',
              marginBottom: '2px',
            }}>
              {stat.label}
            </div>
            <div style={{
              fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
              fontSize: '12px',
              color: 'var(--ink-60)',
              fontWeight: 500,
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
      <a
        href={config.ctaHref}
        style={{
          fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
          display: 'inline-block',
          fontSize: '12px',
          fontWeight: 500,
          color: config.color,
          textDecoration: 'none',
          borderBottom: `1px solid ${config.color}40`,
          paddingBottom: '1px',
        }}
      >
        {config.cta} →
      </a>
    </div>
  )
}

function CompletePictureBanner({ missingPanels }: { missingPanels: ('sleep' | 'blood' | 'oral')[] }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const d = localStorage.getItem('peaq-complete-banner-dismissed')
    if (d) setDismissed(true)
  }, [])

  if (dismissed || missingPanels.length === 0) return null

  const getMessage = () => {
    if (missingPanels.includes('oral') && missingPanels.includes('blood')) {
      return 'Blood and oral together reveal cross-panel signals — like how your periodontal bacteria may be affecting your cardiovascular markers — that neither can show alone.'
    }
    if (missingPanels.includes('oral')) {
      return 'Your oral microbiome is the one panel that connects directly to your blood and sleep data — P. gingivalis burden affects both Lp(a) and HRV through known biological pathways.'
    }
    if (missingPanels.includes('blood')) {
      return 'Blood biomarkers give your Peaq score its cardiovascular context — without them, the cross-panel signals between sleep and oral health have nothing to anchor to.'
    }
    if (missingPanels.includes('sleep')) {
      return 'Sleep updates your score every night and is the only longitudinal panel — without it, your score is a snapshot rather than a living signal.'
    }
    return 'Adding your missing panels will unlock cross-panel insights that no single panel can reveal alone.'
  }

  const font = "var(--font-body, 'Instrument Sans', sans-serif)"

  return (
    <div style={{
      margin: '0 0 12px',
      padding: '14px 18px',
      background: 'var(--white)',
      border: '0.5px solid var(--ink-12)',
      borderLeft: '3px solid #B8860B',
      borderRadius: 4,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '16px',
    }}>
      <div>
        <div style={{
          fontFamily: font,
          fontSize: '10px',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
          color: '#B8860B',
          fontWeight: 500,
          marginBottom: '5px',
        }}>
          Complete your picture
        </div>
        <div style={{
          fontFamily: font,
          fontSize: '12px',
          color: 'var(--ink-60)',
          lineHeight: 1.65,
          marginBottom: '10px',
        }}>
          {getMessage()}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
          {missingPanels.includes('sleep') && (
            <a href="/settings#wearables" style={{ fontFamily: font, fontSize: '12px', color: '#4A7FB5', fontWeight: 500, textDecoration: 'none' }}>
              Connect wearable →
            </a>
          )}
          {missingPanels.includes('blood') && (
            <a href="/dashboard/blood" style={{ fontFamily: font, fontSize: '12px', color: '#C0392B', fontWeight: 500, textDecoration: 'none' }}>
              Upload labs →
            </a>
          )}
          {missingPanels.includes('oral') && (
            <a href="/shop" style={{ fontFamily: font, fontSize: '12px', color: '#2D6A4F', fontWeight: 500, textDecoration: 'none' }}>
              Order oral kit →
            </a>
          )}
        </div>
      </div>
      <button
        onClick={() => {
          localStorage.setItem('peaq-complete-banner-dismissed', 'true')
          setDismissed(true)
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--ink-20)',
          fontSize: '18px',
          cursor: 'pointer',
          flexShrink: 0,
          padding: '0 4px',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}

function WhyAllThree() {
  const [open, setOpen] = useState(false)
  const font = "var(--font-body, 'Instrument Sans', sans-serif)"

  return (
    <div style={{ marginTop: '10px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: font,
          fontSize: '12px',
          color: 'var(--ink-30)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {open ? '−' : '+'} Why all three panels?
      </button>

      {open && (
        <div style={{
          marginTop: '10px',
          padding: '14px 18px',
          background: 'var(--ink-02, rgba(20,20,16,0.02))',
          borderRadius: 4,
          border: '0.5px solid var(--ink-08)',
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '15px',
            color: 'var(--ink)',
            marginBottom: '12px',
            lineHeight: 1.4,
          }}>
            Blood, sleep, and oral health are not independent systems.
          </div>

          {[
            {
              connection: 'Oral → Blood',
              color: '#2D6A4F',
              text: 'P. gingivalis and T. denticola produce enzymes that enter the bloodstream and contribute to arterial inflammation — directly affecting hsCRP and cardiovascular risk markers.',
            },
            {
              connection: 'Oral → Sleep',
              color: '#2D6A4F',
              text: 'Oral nitrate-reducing bacteria convert dietary nitrate into nitric oxide — a molecule essential for vascular relaxation and autonomic balance. Low nitrate reducers are associated with reduced HRV.',
            },
            {
              connection: 'Sleep → Blood',
              color: '#4A7FB5',
              text: 'Poor sleep architecture (low deep sleep, low HRV) drives cortisol elevation, insulin resistance, and systemic inflammation — all measurable in blood biomarkers.',
            },
            {
              connection: 'All three together',
              color: '#B8860B',
              text: 'The cross-panel modifier system detects when signals from multiple panels compound — like elevated periodontal burden + low HRV + elevated Lp(a) — and adjusts your score to reflect the biological reality that these risks multiply, not add.',
            },
          ].map(item => (
            <div key={item.connection} style={{
              marginBottom: '10px',
              paddingLeft: '10px',
              borderLeft: `2px solid ${item.color}`,
            }}>
              <div style={{
                fontFamily: font,
                fontSize: '10px',
                fontWeight: 500,
                color: item.color,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                marginBottom: '3px',
              }}>
                {item.connection}
              </div>
              <div style={{
                fontFamily: font,
                fontSize: '12px',
                color: 'var(--ink-60)',
                lineHeight: 1.6,
              }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface PanelGridProps {
  displaySleep: number
  displayBlood: number
  displayOral: number
  displayLifestyle: number
  sleepConnected: boolean
  isSyncing?: boolean
  wearableProvider?: string
  labFreshness: string
  oralActive: boolean
  lifestyleActive: boolean
  lifestyleSub: number
  sleepDesc: string
  bloodDesc: string
  oralDesc: string
  staleBadge?: string
  mounted: boolean
  hoveredRing: string | null
  interactionsFired?: string[]
  oralKitStatus?: string
}

export function PanelGrid({
  displaySleep, displayBlood, displayOral,
  sleepConnected, isSyncing, wearableProvider, labFreshness, oralActive,
  sleepDesc, bloodDesc, oralDesc, staleBadge,
  mounted, hoveredRing, oralKitStatus,
}: PanelGridProps) {
  const hasBlood = labFreshness !== "none" && labFreshness !== "expired"

  const missingPanels: ('sleep' | 'blood' | 'oral')[] = []
  if (!sleepConnected && !isSyncing) missingPanels.push('sleep')
  if (!hasBlood) missingPanels.push('blood')
  if (!oralActive) missingPanels.push('oral')

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 300, color: "var(--ink)", margin: 0 }}>Panel breakdown</h3>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-30)" }}>Score composition</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
        {isSyncing
          ? <SyncingCard provider={wearableProvider} />
          : sleepConnected
            ? <Link href="/dashboard/sleep" style={{ textDecoration: "none", color: "inherit", display: "block", borderRadius: 8, transition: "transform 0.2s ease, box-shadow 0.2s ease" }} onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08), 0 0 0 1.5px var(--panel-sleep-border, #185FA5)" }} onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = "" }}>
                <PanelCard label="Sleep" color="var(--sleep-c)" trackColor="var(--sleep-bg)" score={Math.round(displaySleep)} max={30} active={sleepConnected} locked={false} desc={sleepDesc} mounted={mounted} highlighted={hoveredRing === "sleep"} />
              </Link>
            : <EmptyPanelCard panel="sleep" />
        }
        {hasBlood
          ? <Link href="/dashboard/blood" style={{ textDecoration: "none", color: "inherit", display: "block", borderRadius: 8, transition: "transform 0.2s ease, box-shadow 0.2s ease" }} onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08), 0 0 0 1.5px var(--panel-blood-border, #A32D2D)" }} onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = "" }}>
              <PanelCard label="Blood" color="var(--blood-c)" trackColor="var(--blood-bg)" score={Math.round(displayBlood)} max={40} active={true} locked={false} desc={bloodDesc} staleBadge={staleBadge} mounted={mounted} highlighted={hoveredRing === "blood"} />
            </Link>
          : <EmptyPanelCard panel="blood" />
        }
        {oralActive
          ? <Link href="/dashboard/oral" style={{ textDecoration: "none", color: "inherit", display: "block", borderRadius: 8, transition: "transform 0.2s ease, box-shadow 0.2s ease" }} onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08), 0 0 0 1.5px var(--panel-oral-border, #3B6D11)" }} onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ""; el.style.boxShadow = "" }}>
              <PanelCard label="Oral Microbiome" color="var(--oral-c)" trackColor="var(--oral-bg)" score={Math.round(displayOral)} max={30} active={true} locked={false} desc={oralDesc} mounted={mounted} highlighted={hoveredRing === "oral"} />
            </Link>
          : <EmptyPanelCard panel="oral" oralOrdered={oralKitStatus === "ordered"} />
        }
      </div>
      <CompletePictureBanner missingPanels={missingPanels} />
      <WhyAllThree />
    </div>
  )
}

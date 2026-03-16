"use client"
import { useEffect, useRef, useState } from "react"
import { haptics } from "@/lib/haptics"

interface RingLayer {
  r: number
  circumference: number
  color: string
  trackColor: string
  fillPct: number
  pending: boolean
  animDelay: number
  ringKey: string
  glowColor: string
}

interface ScoreRingProps {
  rings: RingLayer[]
  score: number
  displayScore: number
  onRingHover: (key: string | null) => void
  hoveredRing: string | null
  scorePulse: boolean
}

export function ScoreRingComponent({
  rings,
  score,
  displayScore,
  onRingHover,
  hoveredRing,
  scorePulse,
}: ScoreRingProps) {
  const ringRef = useRef<HTMLDivElement>(null)
  const scoreNumRef = useRef<HTMLSpanElement>(null)
  const arcRefs = useRef<Map<string, SVGCircleElement>>(new Map())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Trigger arc animations
    rings.forEach((ring) => {
      const el = arcRefs.current.get(ring.ringKey)
      if (!el || ring.pending) return
      el.style.strokeDashoffset = String(ring.circumference)
      const id = setTimeout(() => {
        el.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)"
        el.style.strokeDashoffset = String(ring.circumference * (1 - ring.fillPct))
        // Haptic on ring complete
        setTimeout(() => haptics.ringComplete(), 1800)
      }, ring.animDelay)
      return () => clearTimeout(id)
    })
  }, [])

  // 3D mouse tilt (desktop)
  useEffect(() => {
    const el = ringRef.current
    if (!el) return
    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (rect.width / 2)
      const dy = (e.clientY - cy) / (rect.height / 2)
      el.style.transform = `perspective(600px) rotateX(${-dy * 8}deg) rotateY(${dx * 8}deg)`
      // Magnetic score number follow
      const sn = scoreNumRef.current
      if (sn) {
        const sr = sn.getBoundingClientRect()
        const sdx = (e.clientX - (sr.left + sr.width / 2)) * 0.04
        const sdy = (e.clientY - (sr.top + sr.height / 2)) * 0.04
        sn.style.transform = `translate(${sdx}px, ${sdy}px)`
        sn.style.transition = "transform 0.1s linear"
      }
    }
    const handleMouseLeave = () => {
      el.style.transition = "transform 0.6s cubic-bezier(.16,1,.3,1)"
      el.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg)"
      const sn = scoreNumRef.current
      if (sn) {
        sn.style.transition = "transform 0.5s cubic-bezier(.16,1,.3,1)"
        sn.style.transform = "translate(0,0)"
      }
    }
    const handleMouseEnter = () => {
      el.style.transition = "transform 0.1s linear"
    }
    window.addEventListener("mousemove", handleMouseMove)
    el.addEventListener("mouseleave", handleMouseLeave)
    el.addEventListener("mouseenter", handleMouseEnter)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      el.removeEventListener("mouseleave", handleMouseLeave)
      el.removeEventListener("mouseenter", handleMouseEnter)
    }
  }, [])

  // Gyroscope tilt (mobile)
  useEffect(() => {
    if (typeof window === "undefined" || !window.DeviceOrientationEvent) return
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const el = ringRef.current
      if (!el) return
      const gamma = Math.max(-30, Math.min(30, e.gamma || 0))
      const beta = Math.max(-20, Math.min(20, (e.beta || 0) - 45))
      el.style.transform = `perspective(600px) rotateX(${-(beta / 20) * 8}deg) rotateY(${(gamma / 30) * 10}deg)`
    }
    const setup = async () => {
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function") {
        const perm = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()
        if (perm !== "granted") return
      }
      window.addEventListener("deviceorientation", handleOrientation)
    }
    setup()
    return () => window.removeEventListener("deviceorientation", handleOrientation)
  }, [])

  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      <div
        ref={ringRef}
        style={{ transformStyle: "preserve-3d", willChange: "transform", width: "100%", height: "100%" }}
      >
        <svg viewBox="0 0 220 220" width={220} height={220} style={{ transform: "rotate(-90deg)", display: "block" }}>
          {rings.map((ring) => {
            const isHovered = hoveredRing === ring.ringKey
            return (
              <g key={ring.ringKey}>
                {/* Track */}
                <circle cx={110} cy={110} r={ring.r} fill="none" stroke={ring.trackColor} strokeWidth={8} />
                {/* Pending dashes or fill arc */}
                {ring.pending ? (
                  <circle
                    cx={110} cy={110} r={ring.r}
                    fill="none" stroke={ring.color} strokeWidth={8}
                    strokeLinecap="round" strokeDasharray="5 7"
                    opacity={0.25}
                    style={{ filter: isHovered ? `drop-shadow(0 0 6px ${ring.glowColor})` : "none", transition: "filter 0.2s ease" }}
                    onMouseEnter={() => onRingHover(ring.ringKey)}
                    onMouseLeave={() => onRingHover(null)}
                  />
                ) : (
                  <circle
                    ref={(el) => { if (el) arcRefs.current.set(ring.ringKey, el) }}
                    cx={110} cy={110} r={ring.r}
                    fill="none" stroke={ring.color} strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={ring.circumference}
                    strokeDashoffset={ring.circumference}
                    style={{
                      filter: isHovered ? `drop-shadow(0 0 6px ${ring.glowColor})` : "none",
                      transition: "filter 0.2s ease",
                    }}
                    onMouseEnter={() => onRingHover(ring.ringKey)}
                    onMouseLeave={() => onRingHover(null)}
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Center score */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <span
          ref={scoreNumRef}
          className={scorePulse ? "score-pulse" : ""}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 70, fontWeight: 300, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--ink)", display: "block" }}
        >
          {displayScore}
        </span>
        <span style={{ fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-60)", marginTop: 2 }}>
          of 100
        </span>
      </div>
    </div>
  )
}

"use client"
import { useEffect, useRef, useState } from "react"

interface InsightCardProps {
  title: string
  body: string
  tag: string
  accentColor: string
  tagBg: string
  tagColor: string
  iconPath?: string
  muted?: boolean
}

export function InsightCard({ title, body, tag, accentColor, tagBg, tagColor, muted = false }: InsightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        background: "white",
        border: "0.5px solid var(--ink-12)",
        borderRadius: 4,
        borderLeft: `3px solid ${accentColor}`,
        padding: "16px 18px",
        opacity: visible ? (muted ? 0.6 : 1) : 0,
        transform: visible ? "none" : "translateY(14px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      <p className="font-display text-[17px] font-normal mb-1.5" style={{ color: "var(--ink)" }}>{title}</p>
      <p className="font-body text-[13px] leading-[1.7] mb-3" style={{ color: "var(--ink-60)" }}>{body}</p>
      <span
        className="font-body text-[9px] uppercase tracking-[0.05em] px-2 py-0.5 rounded"
        style={{ background: tagBg, color: tagColor }}
      >
        {tag}
      </span>
    </div>
  )
}

"use client"
import { useEffect, useRef } from "react"
import { haptics } from "@/lib/haptics"

export function useCountUp(
  target: number,
  duration: number,
  delay: number,
  setter: (n: number) => void
) {
  const prevRef = useRef(0)
  useEffect(() => {
    let raf: number
    const start = performance.now() + delay
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const step = (now: number) => {
      if (now < start) { raf = requestAnimationFrame(step); return }
      const p = Math.min((now - start) / duration, 1)
      const val = Math.round(target * ease(p))
      // haptic tick every 10 units
      if (Math.floor(val / 10) !== Math.floor(prevRef.current / 10)) {
        haptics.tick()
      }
      prevRef.current = val
      setter(val)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, delay])
}

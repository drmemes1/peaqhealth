const s = { fill: "none", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

export function DiversityIcon({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 20 20" {...s} stroke={color}><circle cx="10" cy="10" r="7" /><path d="M7 10l2 2 4-4" /></svg>
}
export function NitricOxideIcon({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 20 20" {...s} stroke={color}><circle cx="10" cy="10" r="3" /><path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.05 5.05l1.41 1.41M13.54 13.54l1.41 1.41M5.05 14.95l1.41-1.41M13.54 6.46l1.41-1.41" /></svg>
}
export function GumHealthIcon({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 20 20" {...s} stroke={color}><path d="M10 3l6 4v5c0 3.5-2.5 5-6 6-3.5-1-6-2.5-6-6V7l6-4z" /></svg>
}
export function CavityRiskIcon({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 20 20" {...s} stroke={color}><rect x="5" y="8" width="10" height="8" rx="2" /><path d="M8 8V6a2 2 0 014 0v2" /></svg>
}
export function CavityProtectorIcon({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 20 20" {...s} stroke={color}><path d="M10 3l6 4v5c0 3.5-2.5 5-6 6-3.5-1-6-2.5-6-6V7l6-4z" /><path d="M10 8v4M8 10h4" /></svg>
}
export function BreathingIcon({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 20 20" {...s} stroke={color}><path d="M3 7c2-2 4 2 7 0s5-2 7 0M3 11c2-2 4 2 7 0s5-2 7 0M3 15c2-2 4 2 7 0s5-2 7 0" /></svg>
}

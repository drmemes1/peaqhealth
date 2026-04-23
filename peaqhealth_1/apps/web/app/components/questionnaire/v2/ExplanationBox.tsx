"use client"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function ExplanationBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      margin: "16px 0 20px",
      padding: "16px 18px",
      background: "#E8DCC8",
      borderLeft: "3px solid #B8935A",
      borderRadius: "0 4px 4px 0",
      animation: "fadeIn 0.35s",
    }}>
      <div style={{
        fontFamily: serif, fontSize: 12, color: "#B8935A",
        marginBottom: 6, letterSpacing: "0.02em", fontWeight: 500,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: sans, fontSize: 15, lineHeight: 1.55, color: "#4A4740",
      }}>
        {children}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}

const serif = "var(--font-manrope), system-ui, sans-serif"

interface Props {
  children: React.ReactNode
}

export function NarrativeCard({ children }: Props) {
  return (
    <div style={{
      background: "linear-gradient(to right, #FDFAF2, #FAFAF8)",
      border: "1px solid #E8E6E0",
      borderLeft: "3px solid #B8860B",
      borderRadius: 10,
      padding: "18px 22px",
      marginBottom: 24,
    }}>
      <div className="narrative-card-body" style={{
        fontFamily: serif, fontSize: 16, lineHeight: 1.6,
        fontStyle: "italic", color: "#3D3B35",
      }}>
        {children}
      </div>
      <style>{`
        .narrative-card-body .pullquote {
          color: #B8860B;
          font-style: normal;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

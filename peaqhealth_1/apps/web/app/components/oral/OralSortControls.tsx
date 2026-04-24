"use client"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export type OralSort = "status" | "category" | "az"
export type OralFilter = "all" | "attention" | "watch" | "strong"

function Btn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: sans, fontSize: 10, fontWeight: 500,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "6px 12px", borderRadius: 4, border: "none", cursor: "pointer",
      background: active ? "#2C2A24" : "transparent",
      color: active ? "#F5F3EE" : "#8C897F",
      transition: "all 0.15s",
    }}>
      {label}
    </button>
  )
}

export function OralSortControls({ sort, filter, onSort, onFilter }: {
  sort: OralSort; filter: OralFilter
  onSort: (s: OralSort) => void; onFilter: (f: OralFilter) => void
}) {
  return (
    <div className="oral-sort-bar" style={{
      position: "sticky", top: 0, zIndex: 10,
      background: "#F5F3EE", borderBottom: "1px solid #E8E4D8",
      padding: "10px 0", marginBottom: 20,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      flexWrap: "wrap", gap: 8,
    }}>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <span style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4 }}>Sort</span>
        <Btn label="Status" active={sort === "status"} onClick={() => onSort("status")} />
        <Btn label="Category" active={sort === "category"} onClick={() => onSort("category")} />
        <Btn label="A–Z" active={sort === "az"} onClick={() => onSort("az")} />
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <span style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4 }}>Show</span>
        <Btn label="All" active={filter === "all"} onClick={() => onFilter("all")} />
        <Btn label="Needs attention" active={filter === "attention"} onClick={() => onFilter("attention")} />
        <Btn label="Watch" active={filter === "watch"} onClick={() => onFilter("watch")} />
        <Btn label="Strong" active={filter === "strong"} onClick={() => onFilter("strong")} />
      </div>
    </div>
  )
}

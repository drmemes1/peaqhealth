"use client"

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Dot,
} from "recharts"

interface HistoryPoint {
  locked_at:      string
  total_score:    number | null
  blood_score:    number | null
  collection_date: string | null
  ldl_mgdl:       number | null
  hdl_mgdl:       number | null
  hs_crp_mgl:     number | null
  vitamin_d_ngml:  number | null
}

interface ScoreHistoryChartProps {
  data: HistoryPoint[]
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistoryPoint }> }) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload
  const score = pt.total_score ?? 0
  const blood = pt.blood_score ?? 0

  return (
    <div style={{
      background: "white",
      border: "0.5px solid var(--ink-12)",
      borderRadius: 4,
      padding: "10px 14px",
      fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
      fontSize: 12,
      color: "var(--ink)",
      boxShadow: "0 4px 16px rgba(20,20,16,0.06)",
      minWidth: 160,
    }}>
      <p style={{ margin: "0 0 6px", fontWeight: 600, color: "var(--gold)" }}>
        {formatMonthYear(pt.locked_at)}
      </p>
      <p style={{ margin: "0 0 2px", color: "var(--ink-60)" }}>
        Score: <span style={{ color: "var(--ink)", fontWeight: 600 }}>{Math.round(score)}</span>
      </p>
      <p style={{ margin: 0, color: "var(--ink-60)" }}>
        Blood: <span style={{ color: "var(--ink)" }}>{Math.round(blood)}/33</span>
      </p>
    </div>
  )
}

export function ScoreHistoryChart({ data }: ScoreHistoryChartProps) {
  if (data.length < 2) {
    return (
      <p style={{
        fontFamily: "var(--font-body, 'Instrument Sans', sans-serif)",
        fontSize: 13,
        color: "var(--ink-30)",
        textAlign: "center",
        padding: "24px 0",
        margin: 0,
        fontStyle: "italic",
      }}>
        Upload labs again in the future to track your progress over time.
      </p>
    )
  }

  const chartData = data.map((pt) => ({
    ...pt,
    label: formatMonthYear(pt.locked_at),
    score: pt.total_score ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: -24, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 12,
            fill: "rgba(20,20,16,0.4)",
          }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 12,
            fill: "rgba(20,20,16,0.4)",
          }}
          axisLine={false}
          tickLine={false}
          tickCount={5}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--ink-12)", strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#B8860B"
          strokeWidth={1.5}
          dot={<Dot r={3} fill="#B8860B" stroke="white" strokeWidth={1.5} />}
          activeDot={{ r: 5, fill: "#B8860B", stroke: "white", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

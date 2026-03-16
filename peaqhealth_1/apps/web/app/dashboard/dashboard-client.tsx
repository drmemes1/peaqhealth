"use client"

import { Nav } from "../components/nav"
import { ScoreWheel, type ScoreWheelProps } from "../components/score-wheel"

export function DashboardClient(props: ScoreWheelProps) {
  return (
    <div className="min-h-svh bg-off-white">
      <Nav />
      <main className="mx-auto max-w-[720px] px-6 py-10">
        <ScoreWheel {...props} />
      </main>
    </div>
  )
}

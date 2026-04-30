"use client"

import Link from "next/link"
import type { DoseResponseResult } from "../../../lib/oral/nitrateDoseResponse"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

interface Props {
  result: DoseResponseResult
}

export function NitrateOpportunityCard({ result }: Props) {
  if (result.predictedSbpDropMidpoint < 1.0) return null

  return (
    <div style={{
      background: "#FAFAF8", border: "1px solid #D6D3C8",
      borderRadius: 14, padding: "20px 22px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, background: "radial-gradient(circle, rgba(74,122,74,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative" }}>
        <span style={{
          fontFamily: sans, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#4A7A4A",
          display: "block", marginBottom: 8,
        }}>
          Clinical prediction · {result.confidenceLevel === "high" ? "Grade-A evidence" : result.confidenceLevel === "moderate" ? "Moderate evidence" : "Emerging estimate"}
        </span>

        <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: "#2C2A24", margin: "0 0 10px", lineHeight: 1.25 }}>
          An opportunity in your data
        </h3>

        <p style={{ fontFamily: serif, fontSize: 15, color: "#4A4740", lineHeight: 1.6, margin: "0 0 14px" }}>
          {result.narrativeText}
        </p>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: serif, fontSize: 32, fontWeight: 500, color: "#4A7A4A", lineHeight: 1 }}>
            {result.predictedSbpDropLow}–{result.predictedSbpDropHigh}
          </span>
          <span style={{ fontFamily: sans, fontSize: 11, color: "#8C897F" }}>
            mmHg · predicted systolic BP reduction · 6–8 weeks
          </span>
        </div>

        <p style={{ fontFamily: sans, fontSize: 10, color: "#8C897F", margin: "0 0 12px", fontStyle: "italic" }}>
          Based on Norouzzadeh 2025 meta-analysis (75 RCTs, n=1,823) and Willmott 2023 on oral bacterial capacity.
        </p>

        <Link href="/dashboard/oral" style={{
          fontFamily: sans, fontSize: 11, fontWeight: 500, color: "#B8935A", textDecoration: "none",
        }}>
          See the full prediction →
        </Link>
      </div>
    </div>
  )
}

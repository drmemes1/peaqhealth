"use client"

import type { UserPanelContext } from "../../../../lib/user-context"
import { WhatThisMeans } from "../../ui/WhatThisMeans"

const serif = "var(--font-manrope), system-ui, sans-serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function CrossPanelConnection({ ctx }: { ctx: UserPanelContext }) {
  const o = ctx.oralKit
  const hasBlood = ctx.hasBloodPanel
  const hasSleep = ctx.hasWearable

  const oralStatus = o && o.nitricOxideTotal >= 20 ? "strong" : "watch"

  return (
    <div style={{ background: "linear-gradient(135deg, var(--paper) 0%, #F6F3EB 100%)", border: "1px solid #D6D3C8", borderRadius: 20, padding: "40px 44px" }}>
      <div style={{ position: "relative", height: 160, margin: "16px 0 28px" }}>
        <svg viewBox="0 0 1100 160" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <defs>
            <linearGradient id="conn-a" x1="0" x2="1"><stop offset="0%" stopColor="#4A7A4A" stopOpacity={0.6} /><stop offset="100%" stopColor="#B8935A" stopOpacity={0.6} /></linearGradient>
            <linearGradient id="conn-p" x1="0" x2="1"><stop offset="0%" stopColor="#8C897F" stopOpacity={0.3} /><stop offset="100%" stopColor="#8C897F" stopOpacity={0.3} /></linearGradient>
          </defs>
          <path d="M 220 80 Q 400 20, 580 80" fill="none" stroke={hasBlood ? "url(#conn-a)" : "url(#conn-p)"} strokeWidth={hasBlood ? 2 : 1.5} strokeDasharray={hasBlood ? "none" : "4,4"} />
          <path d="M 580 80 Q 740 120, 880 80" fill="none" stroke={hasSleep ? "url(#conn-a)" : "url(#conn-p)"} strokeWidth={hasSleep ? 2 : 1.5} strokeDasharray={hasSleep ? "none" : "4,4"} />
        </svg>

        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center", gap: 24 }}>
          <div style={{ background: "var(--paper)", border: "1px solid #D6D3C8", borderLeft: `3px solid ${oralStatus === "strong" ? "#4A7A4A" : "#B8923C"}`, borderRadius: 14, padding: "18px 22px", zIndex: 2 }}>
            <div style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8C897F", fontWeight: 600, marginBottom: 6 }}>Oral · NR pathway</div>
            <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Heart-protective bacteria</div>
            <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: oralStatus === "strong" ? "#3A613A" : "#8A6B22", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: oralStatus === "strong" ? "#4A7A4A" : "#B8923C" }} />
              {o ? `${o.nitricOxideTotal.toFixed(1)}% composite` : "Pending"}
            </div>
          </div>

          <div style={{ background: hasBlood ? "var(--paper)" : "transparent", border: `1px ${hasBlood ? "solid" : "dashed"} #D6D3C8`, borderLeft: hasBlood ? "3px solid #B8923C" : undefined, borderRadius: 14, padding: "18px 22px", opacity: hasBlood ? 1 : 0.65, zIndex: 2 }}>
            <div style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8C897F", fontWeight: 600, marginBottom: 6 }}>Blood · Cardio</div>
            <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, marginBottom: 8 }}>LDL · Blood pressure</div>
            <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: "#8C897F" }}>
              {hasBlood ? `LDL ${ctx.bloodPanel?.ldl ?? "—"} mg/dL` : "Awaiting upload"}
            </div>
          </div>

          <div style={{ background: hasSleep ? "var(--paper)" : "transparent", border: `1px ${hasSleep ? "solid" : "dashed"} #D6D3C8`, borderRadius: 14, padding: "18px 22px", opacity: hasSleep ? 1 : 0.65, zIndex: 2 }}>
            <div style={{ fontFamily: sans, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#8C897F", fontWeight: 600, marginBottom: 6 }}>Sleep · Airway</div>
            <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, marginBottom: 8 }}>HRV · SpO₂</div>
            <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, color: "#8C897F" }}>
              {hasSleep ? `HRV ${ctx.sleepData?.hrvRmssd?.toFixed(0) ?? "—"} ms` : "Connect a wearable"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <WhatThisMeans variant="mechanism" citation="Vanhatalo 2018, Norouzzadeh 2025">
          {o ? <>Your oral nitrate-reducing bacteria — Neisseria {(o.neisseriaPct ?? 0).toFixed(1)}%, Rothia {(o.rothiaPct ?? 0).toFixed(1)}% — convert dietary nitrate into nitric oxide, the molecule that regulates blood pressure and vessel flexibility. </> : "Your oral data will reveal your nitrate-reducing community. "}
          <strong style={{ fontStyle: "normal", fontWeight: 600, color: "#2C2A24" }}>
            {!hasBlood && !hasSleep ? "Adding a blood panel and wearable would complete the cross-panel picture." :
             !hasBlood ? "Adding a blood panel would show the downstream effect on your LDL and BP." :
             !hasSleep ? "Connecting a wearable would show whether your HRV reflects this NO support." :
             "All three panels are connected — your oral, blood, and sleep data tell a unified story."}
          </strong>
        </WhatThisMeans>
      </div>
    </div>
  )
}

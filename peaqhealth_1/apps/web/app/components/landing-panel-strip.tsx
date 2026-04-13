"use client"

import { useEffect, useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

const SHOW_PANELS = 3200
const MERGE_HOLD  = 2800
const CYCLE_MS    = SHOW_PANELS + MERGE_HOLD + 900 + 400

export function LandingPanelStrip({ wearableOff = false, onToggle }: { wearableOff?: boolean; onToggle?: () => void }) {
  const [merged, setMerged] = useState(false)

  useEffect(() => {
    const tick = () => {
      setMerged(true)
      setTimeout(() => setMerged(false), MERGE_HOLD)
    }
    const delay = setTimeout(() => {
      tick()
      interval = setInterval(tick, CYCLE_MS)
    }, 1200 + SHOW_PANELS)
    let interval: ReturnType<typeof setInterval>
    return () => { clearTimeout(delay); clearInterval(interval) }
  }, [])

  const cls = `hp-stage${merged ? " hp-merged" : ""}`

  return (
    <div>
      <div className={cls}>
        {/* ── Sleep card (left) ──────────────────────────────── */}
        <div className="hp-wrap hp-wrap-sleep">
          <div className="hp-card">
            <div className="hp-header">
              <span className="hp-dot" style={{ background: "#4A7FB5" }} />
              <span className="hp-name">Sleep</span>
            </div>
            <div className="hp-bars">
              <Bar label="Deep" color="#4A7FB5" anim="hpb1" w="86%" />
              <Bar label="REM"  color="#4A7FB5" anim="hpb2" w="56%" o={0.75} />
              <Bar label="HRV"  color="#4A7FB5" anim="hpb3" w="40%" o={0.55} />
              <Bar label="RHR"  color="#4A7FB5" anim="hpb4" w="78%" o={0.85} />
            </div>
            <span className="hp-chip hp-chip-positive">Positive</span>
            {onToggle && (
              <button className="hp-toggle" onClick={onToggle}>
                <span className="hp-track">
                  <span className="hp-thumb" style={{ left: wearableOff ? 2 : 12, background: wearableOff ? "rgba(250,250,248,0.4)" : "#B8860B" }} />
                </span>
                <span className="hp-toggle-label">{wearableOff ? "Off" : "On"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Blood / Peaq+ Age card (center) ────────────────── */}
        <div className="hp-wrap hp-wrap-blood">
          <div className="hp-card hp-card-blood">
            {/* Blood face */}
            <div className="hp-face hp-face-blood">
              <div className="hp-header">
                <span className="hp-dot" style={{ background: "#C0392B" }} />
                <span className="hp-name">Blood</span>
              </div>
              <div className="hp-bars">
                <Bar label="LDL"   color="#C0392B" anim="hpb5" w="72%" />
                <Bar label="HbA1c" color="#C0392B" anim="hpb6" w="90%" o={0.9} />
                <Bar label="CRP"   color="#C0392B" anim="hpb7" w="32%" o={0.6} />
                <Bar label="MPV"   color="#C0392B" anim="hpb8" w="54%" o={0.7} />
              </div>
              <span className="hp-chip hp-chip-attention">Attention</span>
            </div>
            {/* Peaq+ Age face */}
            <div className="hp-face hp-face-peaq">
              <span className="hp-peaq-eyebrow">Peaq Age</span>
              <div>
                <span className="hp-peaq-number" style={{ fontFamily: serif }}>33</span>
                <span className="hp-peaq-unit" style={{ fontFamily: serif }}> yrs</span>
              </div>
              <span className="hp-peaq-name" style={{ fontFamily: serif }}>Peaq+ Age</span>
              <div className="hp-peaq-rule" />
              <span className="hp-peaq-desc">A proprietary score combining blood, oral microbiome &amp; sleep</span>
            </div>
          </div>
        </div>

        {/* ── Oral card (right) ──────────────────────────────── */}
        <div className="hp-wrap hp-wrap-oral">
          <div className="hp-card">
            <div className="hp-header">
              <span className="hp-dot" style={{ background: "#2D6A4F" }} />
              <span className="hp-name">Oral microbiome</span>
            </div>
            <div className="hp-bars">
              <Bar label="Protect"   color="#2D6A4F" anim="hpb9"  w="50%" o={0.75} />
              <Bar label="Pathogen"  color="#2D6A4F" anim="hpb10" w="66%" o={0.55} />
              <Bar label="Diversity" color="#2D6A4F" anim="hpb11" w="72%" />
            </div>
            <span className="hp-chip hp-chip-watch">Watch</span>
          </div>
        </div>
      </div>

      <p style={{
        textAlign: "center", marginTop: 18,
        fontFamily: sans, fontSize: 10,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(250,250,248,0.27)",
      }}>
        Sample &middot; Your numbers will be different
      </p>

      <style>{`
        /* ── Stage ──────────────────────────────────────────── */
        .hp-stage {
          position: relative;
          width: 100%;
          height: 210px;
          display: flex;
          align-items: center;
          justify-content: center;
          --card-w: 200px;
          --spread: 280px;
        }
        @media (max-width: 640px) {
          .hp-stage {
            --card-w: 135px;
            --spread: 150px;
            height: 190px;
          }
        }

        /* ── Card wrappers ─────────────────────────────────── */
        .hp-wrap {
          position: absolute;
          transition: transform 0.9s cubic-bezier(0.4,0,0.2,1),
                      opacity 0.7s ease;
        }
        .hp-wrap-sleep { transform: translateX(calc(-1 * var(--spread))); }
        .hp-wrap-blood { transform: translateX(0); }
        .hp-wrap-oral  { transform: translateX(var(--spread)); }

        .hp-merged .hp-wrap-sleep { transform: translateX(-12px); opacity: 0; }
        .hp-merged .hp-wrap-blood { transform: translateX(0); }
        .hp-merged .hp-wrap-oral  { transform: translateX(12px); opacity: 0; }

        /* ── Card ──────────────────────────────────────────── */
        .hp-card {
          background: rgba(250,250,248,0.08);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 0.5px solid rgba(250,250,248,0.13);
          border-radius: 14px;
          padding: 20px 18px 18px;
          width: var(--card-w);
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        /* Blood card glow on merge */
        .hp-card-blood {
          transition: border-color 0.8s ease, box-shadow 0.8s ease;
        }
        .hp-merged .hp-card-blood {
          border-color: rgba(184,134,11,0.45);
          box-shadow: 0 0 28px 4px rgba(184,134,11,0.08), 0 12px 48px rgba(0,0,0,0.4);
        }
        .hp-merged .hp-card-blood::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(184,134,11,0.9), transparent);
        }

        /* ── Dual-face (blood ↔ Peaq+) ─────────────────────── */
        .hp-face {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .hp-face-peaq {
          position: absolute;
          inset: 20px 18px 18px;
          opacity: 0;
          transform: scale(0.92);
        }
        .hp-merged .hp-face-blood { opacity: 0; transform: scale(0.92); }
        .hp-merged .hp-face-peaq  { opacity: 1; transform: scale(1); }

        /* ── Card internals ────────────────────────────────── */
        .hp-header { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
        .hp-dot { width: 7px; height: 7px; border-radius: 50%; }
        .hp-name {
          font-family: ${sans};
          font-size: 10px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(250,250,248,0.48);
        }

        .hp-bars { width: 100%; display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
        .hp-bar-row { display: flex; align-items: center; gap: 7px; }
        .hp-bar-lbl {
          font-family: ${sans};
          font-size: 9px; color: rgba(250,250,248,0.3);
          width: 42px; text-align: right; flex-shrink: 0;
        }
        @media (max-width: 640px) { .hp-bar-lbl { width: 32px; font-size: 7px; } }
        .hp-bar-track { flex: 1; height: 3px; background: rgba(250,250,248,0.07); border-radius: 2px; overflow: hidden; }
        .hp-bar-fill { height: 100%; border-radius: 2px; }

        .hp-chip {
          font-family: ${sans};
          font-size: 10px; font-weight: 500;
          letter-spacing: 0.09em; text-transform: uppercase;
          padding: 4px 14px; border-radius: 20px;
        }
        @media (max-width: 640px) { .hp-chip { font-size: 8px; padding: 3px 10px; } }
        .hp-chip-positive  { background: rgba(45,106,79,0.18);  color: #5DBE8A; border: 0.5px solid rgba(45,106,79,0.35); }
        .hp-chip-attention { background: rgba(192,57,43,0.15);  color: #E07B72; border: 0.5px solid rgba(192,57,43,0.3); }
        .hp-chip-watch     { background: rgba(184,134,11,0.13); color: #D4A835; border: 0.5px solid rgba(184,134,11,0.3); }

        /* ── Peaq+ Age face ────────────────────────────────── */
        .hp-peaq-eyebrow {
          font-family: ${sans};
          font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(184,134,11,0.65); font-weight: 500; margin-bottom: 4px;
        }
        .hp-peaq-number { font-size: 62px; font-weight: 300; color: #FAFAF8; line-height: 1; letter-spacing: -1px; }
        .hp-peaq-unit   { font-size: 18px; font-weight: 300; color: rgba(250,250,248,0.38); }
        .hp-peaq-name   { font-size: 20px; font-style: italic; font-weight: 300; color: #B8860B; margin-top: 4px; }
        .hp-peaq-rule   { width: 70%; height: 0.5px; background: rgba(250,250,248,0.1); margin: 12px 0 8px; }
        .hp-peaq-desc   {
          font-family: ${sans};
          font-size: 10px; font-weight: 300;
          color: rgba(250,250,248,0.35); text-align: center; line-height: 1.5; max-width: 145px;
        }
        @media (max-width: 640px) {
          .hp-peaq-number { font-size: 44px; }
          .hp-peaq-name   { font-size: 16px; }
          .hp-peaq-unit   { font-size: 14px; }
          .hp-peaq-desc   { font-size: 8px; }
        }

        /* ── Toggle (inside Sleep card) ────────────────────── */
        .hp-toggle {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 8px; padding: 3px 8px;
          border-radius: 999px; border: none;
          background: rgba(250,250,248,0.10);
          cursor: pointer;
        }
        .hp-track {
          width: 22px; height: 12px; border-radius: 6px;
          background: rgba(250,250,248,0.18);
          position: relative; flex-shrink: 0;
        }
        .hp-thumb {
          position: absolute; top: 2px;
          width: 8px; height: 8px; border-radius: 4px;
          transition: left 250ms cubic-bezier(0.4,0,0.2,1), background 250ms ease;
        }
        .hp-toggle-label {
          font-family: ${sans};
          font-size: 7px; letter-spacing: 1px; text-transform: uppercase;
          color: rgba(250,250,248,0.6);
        }

        /* ── Bar breathing keyframes ───────────────────────── */
        @keyframes hpb1{0%,100%{width:86%;}50%{width:93%;}}
        @keyframes hpb2{0%,100%{width:56%;}50%{width:65%;}}
        @keyframes hpb3{0%,100%{width:40%;}50%{width:50%;}}
        @keyframes hpb4{0%,100%{width:78%;}50%{width:86%;}}
        @keyframes hpb5{0%,100%{width:72%;}50%{width:80%;}}
        @keyframes hpb6{0%,100%{width:90%;}50%{width:95%;}}
        @keyframes hpb7{0%,100%{width:32%;}50%{width:42%;}}
        @keyframes hpb8{0%,100%{width:54%;}50%{width:62%;}}
        @keyframes hpb9{0%,100%{width:50%;}50%{width:60%;}}
        @keyframes hpb10{0%,100%{width:66%;}50%{width:76%;}}
        @keyframes hpb11{0%,100%{width:72%;}50%{width:82%;}}
      `}</style>
    </div>
  )
}

function Bar({ label, color, anim, w, o }: {
  label: string; color: string; anim: string; w: string; o?: number
}) {
  return (
    <div className="hp-bar-row">
      <div className="hp-bar-lbl">{label}</div>
      <div className="hp-bar-track">
        <div
          className="hp-bar-fill"
          style={{
            background: color,
            width: w,
            opacity: o ?? 1,
            animation: `${anim} ${3 + Math.random() * 2}s ease-in-out infinite`,
          }}
        />
      </div>
    </div>
  )
}

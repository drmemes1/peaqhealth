"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans  = "'Instrument Sans', system-ui, sans-serif"

const SHOW_PANELS = 3200
const MERGE_HOLD  = 3800
const CYCLE_MS    = SHOW_PANELS + MERGE_HOLD + 900 + 500

// ── Number-stepping sequences (slow drift, feels like computation) ──────────
const PEAQ_STEPS   = [28, 30, 32, 35, 37, 36, 34, 33]
const CHRONO_STEPS = [31, 32, 33, 32, 31, 32]

const BAR_VARIANTS = [
  { blood: "49%", oral: "15%", sleep: "33%", cp: "3%" },
  { blood: "51%", oral: "14%", sleep: "32%", cp: "3%" },
  { blood: "48%", oral: "16%", sleep: "33%", cp: "3%" },
  { blood: "50%", oral: "15%", sleep: "32%", cp: "3%" },
  { blood: "49%", oral: "15%", sleep: "33%", cp: "3%" },
]

// ── Bar chart row ──────────────────────────────────────────────────────────
function Bar({ label, color, anim, w, o }: {
  label: string; color: string; anim: string; w: string; o?: number
}) {
  return (
    <div className="hp-bar-row">
      <div className="hp-bar-lbl">{label}</div>
      <div className="hp-bar-track">
        <div className="hp-bar-fill" style={{ background: color, width: w, opacity: o ?? 1, animation: `${anim} ${3 + Math.random() * 2}s ease-in-out infinite` }} />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function LandingPanelStrip({ wearableOff = false, onToggle }: { wearableOff?: boolean; onToggle?: () => void }) {
  const [merged, setMerged] = useState(false)

  // DOM refs for imperative number stepping
  const peaqRef   = useRef<HTMLSpanElement>(null)
  const chronoRef = useRef<HTMLSpanElement>(null)
  const segRefs   = useRef<Record<string, HTMLDivElement | null>>({})
  const timers    = useRef<ReturnType<typeof setInterval>[]>([])

  // ── Merge/unmerge cycle ──────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      setMerged(true)
      setTimeout(() => setMerged(false), MERGE_HOLD)
    }
    const delay = setTimeout(() => {
      tick()
      interval = setInterval(tick, CYCLE_MS)
    }, 1400 + SHOW_PANELS)
    let interval: ReturnType<typeof setInterval>
    return () => { clearTimeout(delay); clearInterval(interval) }
  }, [])

  // ── Start/stop animations on merge state ─────────────────────────────────
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearInterval)
    timers.current = []
  }, [])

  useEffect(() => {
    if (merged) {
      const t = setTimeout(() => {
        startStepper(peaqRef.current, PEAQ_STEPS, 580, timers)
        startStepper(chronoRef.current, CHRONO_STEPS, 820, timers)
        startBarPulse(segRefs.current, timers)
      }, 550)
      return () => { clearTimeout(t); clearTimers() }
    }
    clearTimers()
    if (peaqRef.current) { peaqRef.current.textContent = "33"; peaqRef.current.style.opacity = "1" }
    if (chronoRef.current) { chronoRef.current.textContent = "32"; chronoRef.current.style.opacity = "1" }
    resetBars(segRefs.current)
  }, [merged, clearTimers])

  const cls = `hp-stage${merged ? " hp-merged" : ""}`

  return (
    <div>
      <div className={cls}>
        {/* ── Sleep (left) ──────────────────────────────────────── */}
        <div className="hp-wrap hp-wrap-sleep">
          <div className="hp-card">
            <div className="hp-header"><span className="hp-dot" style={{ background: "#4A7FB5" }} /><span className="hp-name">Sleep</span></div>
            <div className="hp-bars">
              <Bar label="Deep" color="#4A7FB5" anim="hpb1" w="86%" />
              <Bar label="REM"  color="#4A7FB5" anim="hpb2" w="56%" o={0.75} />
              <Bar label="HRV"  color="#4A7FB5" anim="hpb3" w="40%" o={0.55} />
              <Bar label="RHR"  color="#4A7FB5" anim="hpb4" w="78%" o={0.85} />
            </div>
            <span className="hp-chip hp-chip-pos">Positive</span>
            {onToggle && (
              <button className="hp-toggle" onClick={onToggle}>
                <span className="hp-track"><span className="hp-thumb" style={{ left: wearableOff ? 2 : 12, background: wearableOff ? "rgba(250,250,248,0.4)" : "#B8860B" }} /></span>
                <span className="hp-tgl-lbl">{wearableOff ? "Off" : "On"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Blood → Peaq+ Age (center, expands on merge) ──────── */}
        <div className="hp-wrap hp-wrap-blood">
          <div className="hp-card hp-card-blood">
            {/* Blood face */}
            <div className="hp-face hp-face-blood">
              <div className="hp-header"><span className="hp-dot" style={{ background: "#C0392B" }} /><span className="hp-name">Blood</span></div>
              <div className="hp-bars">
                <Bar label="LDL"   color="#C0392B" anim="hpb5" w="72%" />
                <Bar label="HbA1c" color="#C0392B" anim="hpb6" w="90%" o={0.9} />
                <Bar label="CRP"   color="#C0392B" anim="hpb7" w="32%" o={0.6} />
                <Bar label="MPV"   color="#C0392B" anim="hpb8" w="54%" o={0.7} />
              </div>
              <span className="hp-chip hp-chip-att">Attention</span>
            </div>

            {/* Peaq+ Age face */}
            <div className="hp-face hp-face-peaq">
              {/* Top: 3-column layout */}
              <div className="pf-top">
                <div className="pf-col">
                  <span className="pf-eyebrow">Peaq+ Age</span>
                  <div className="pf-num-row">
                    <span className="pf-number" ref={peaqRef} style={{ fontFamily: serif }}>33</span>
                    <span className="pf-unit" style={{ fontFamily: serif }}>yrs</span>
                  </div>
                  <span className="pf-name" style={{ fontFamily: serif }}>Peaq+ Age</span>
                </div>
                <div className="pf-vr" />
                <div className="pf-col">
                  <span className="pf-stat-lbl">Chronological</span>
                  <div className="pf-chrono" style={{ fontFamily: serif }}><span ref={chronoRef}>32</span> yrs</div>
                  <span className="pf-stat-lbl" style={{ marginTop: 8 }}>Peaq vs chrono</span>
                  <span className="pf-delta" style={{ fontFamily: serif }}>+1.4 yrs</span>
                </div>
                <div className="pf-vr" />
                <div className="pf-col">
                  <span className="pf-stat-lbl">6-month target</span>
                  <span className="pf-target" style={{ fontFamily: serif }}>32&ndash;33 yrs</span>
                  <span className="pf-stat-lbl" style={{ marginTop: 8 }}>Status</span>
                  <span className="pf-status-pill">Actionable</span>
                </div>
              </div>

              {/* Glowing interconnect: Sleep ── Blood ── Oral */}
              <div className="pf-interconnect">
                <svg width="100%" height="36" viewBox="0 0 480 36" preserveAspectRatio="xMidYMid meet" overflow="visible">
                  <defs>
                    <filter id="gl-s" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <filter id="gl-o" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <filter id="gl-r" x="-100%" y="-400%" width="300%" height="900%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <linearGradient id="gr-sb" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#4A7FB5" stopOpacity="0.8"/><stop offset="100%" stopColor="#C0392B" stopOpacity="0.8"/></linearGradient>
                    <linearGradient id="gr-ob" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stopColor="#2D6A4F" stopOpacity="0.8"/><stop offset="100%" stopColor="#C0392B" stopOpacity="0.8"/></linearGradient>
                  </defs>
                  <line x1="40" y1="18" x2="440" y2="18" stroke="rgba(250,250,248,0.06)" strokeWidth="1"/>
                  <line x1="40" y1="18" x2="240" y2="18" stroke="url(#gr-sb)" strokeWidth="1.5" opacity="0.8" strokeDasharray="4 5"><animate attributeName="stroke-dashoffset" from="0" to="-18" dur="2.2s" repeatCount="indefinite"/></line>
                  <line x1="440" y1="18" x2="240" y2="18" stroke="url(#gr-ob)" strokeWidth="1.5" opacity="0.8" strokeDasharray="4 5"><animate attributeName="stroke-dashoffset" from="0" to="18" dur="2.6s" repeatCount="indefinite"/></line>
                  {/* Sleep node */}
                  <circle cx="40" cy="18" r="5" fill="#4A7FB5" opacity="0.85" filter="url(#gl-s)"><animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite"/><animate attributeName="r" values="4;6;4" dur="2.2s" repeatCount="indefinite"/></circle>
                  <text x="40" y="8" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="rgba(74,127,181,0.75)" letterSpacing="0.08em">SLEEP</text>
                  {/* Blood node */}
                  <circle cx="240" cy="18" r="7" fill="#C0392B" opacity="0.9" filter="url(#gl-r)"><animate attributeName="opacity" values="0.7;1;0.7" dur="1.8s" repeatCount="indefinite"/><animate attributeName="r" values="6;9;6" dur="1.8s" repeatCount="indefinite"/></circle>
                  <text x="240" y="8" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="rgba(192,57,43,0.9)" letterSpacing="0.08em">BLOOD</text>
                  {/* Oral node */}
                  <circle cx="440" cy="18" r="5" fill="#2D6A4F" opacity="0.85" filter="url(#gl-o)"><animate attributeName="opacity" values="0.6;1;0.6" dur="2.6s" repeatCount="indefinite"/><animate attributeName="r" values="4;6;4" dur="2.6s" repeatCount="indefinite"/></circle>
                  <text x="440" y="8" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="7" fill="rgba(45,106,79,0.75)" letterSpacing="0.08em">ORAL</text>
                  {/* Travelling particles */}
                  <circle r="2.5" fill="#4A7FB5" opacity="0.9" filter="url(#gl-s)"><animateMotion dur="2.2s" repeatCount="indefinite" path="M40,18 L240,18"/></circle>
                  <circle r="2.5" fill="#2D6A4F" opacity="0.9" filter="url(#gl-o)"><animateMotion dur="2.6s" repeatCount="indefinite" path="M440,18 L240,18"/></circle>
                </svg>
              </div>

              {/* Score composition bar */}
              <div className="pf-sources">
                <span className="pf-src-label">Score composition</span>
                <div className="pf-src-bar">
                  <div ref={el => { segRefs.current.blood = el }} className="pf-seg pf-seg-blood" style={{ width: "49%" }} />
                  <div ref={el => { segRefs.current.oral  = el }} className="pf-seg pf-seg-oral"  style={{ width: "15%" }} />
                  <div ref={el => { segRefs.current.sleep = el }} className="pf-seg pf-seg-sleep" style={{ width: "33%" }} />
                  <div ref={el => { segRefs.current.cp    = el }} className="pf-seg pf-seg-cp"    style={{ width: "3%" }} />
                </div>
                <div className="pf-legend">
                  <span className="pf-leg"><span className="pf-leg-dot" style={{ background: "#C0392B" }} />Blood 49%</span>
                  <span className="pf-leg"><span className="pf-leg-dot" style={{ background: "#2D6A4F" }} />Oral 15%</span>
                  <span className="pf-leg"><span className="pf-leg-dot" style={{ background: "#4A7FB5" }} />Sleep + VO&#x2082; 33%</span>
                  <span className="pf-leg"><span className="pf-leg-dot" style={{ background: "#D4A017" }} />Cross-panel 3%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Oral (right) ──────────────────────────────────────── */}
        <div className="hp-wrap hp-wrap-oral">
          <div className="hp-card">
            <div className="hp-header"><span className="hp-dot" style={{ background: "#2D6A4F" }} /><span className="hp-name">Oral microbiome</span></div>
            <div className="hp-bars">
              <Bar label="Protect"   color="#2D6A4F" anim="hpb9"  w="50%" o={0.75} />
              <Bar label="Pathogen"  color="#2D6A4F" anim="hpb10" w="66%" o={0.55} />
              <Bar label="Diversity" color="#2D6A4F" anim="hpb11" w="72%" />
            </div>
            <span className="hp-chip hp-chip-watch">Watch</span>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", marginTop: 20, fontFamily: sans, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(250,250,248,0.27)" }}>
        Sample &middot; Your numbers will be different
      </p>

      <style>{`
        .hp-stage{position:relative;width:100%;height:270px;display:flex;align-items:center;justify-content:center;overflow:visible;
          --card-w:clamp(105px, 28vw, 200px);
          --card-h:clamp(160px, 24vw, 190px);
          --spread:clamp(115px, 30vw, 300px);
          --expanded-w:min(520px, calc(100vw - 48px));
        }
        @media(max-width:420px){.hp-stage{height:240px;}}

        .hp-wrap{position:absolute;transition:transform .9s cubic-bezier(.4,0,.2,1),opacity .7s ease;}
        .hp-wrap-sleep{transform:translateX(calc(-1 * var(--spread)));}
        .hp-wrap-blood{transform:translateX(0);}
        .hp-wrap-oral{transform:translateX(var(--spread));}
        .hp-merged .hp-wrap-sleep{transform:translateX(-10px);opacity:0;}
        .hp-merged .hp-wrap-blood{transform:translateX(0);}
        .hp-merged .hp-wrap-oral{transform:translateX(10px);opacity:0;}

        .hp-card{background:rgba(250,250,248,.08);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:.5px solid rgba(250,250,248,.13);border-radius:14px;padding:20px 18px 18px;width:var(--card-w);min-height:var(--card-h);display:flex;flex-direction:column;align-items:center;position:relative;overflow:hidden;}

        .hp-card-blood{transition:width .85s cubic-bezier(.4,0,.2,1),min-height .85s cubic-bezier(.4,0,.2,1),border-color .7s ease,box-shadow .7s ease;}
        .hp-merged .hp-card-blood{width:var(--expanded-w);min-height:245px;border-color:rgba(184,134,11,.5);box-shadow:0 0 48px 8px rgba(184,134,11,.08),0 20px 60px rgba(0,0,0,.55);}
        .hp-merged .hp-card-blood::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(184,134,11,1),transparent);}

        .hp-face{width:100%;display:flex;flex-direction:column;align-items:center;transition:opacity .55s ease,transform .55s ease;}
        .hp-face-peaq{position:absolute;top:18px;left:18px;right:18px;bottom:14px;opacity:0;transform:scale(.95);align-items:flex-start;overflow:hidden;}
        .hp-merged .hp-face-blood{opacity:0;transform:scale(.95);}
        .hp-merged .hp-face-peaq{opacity:1;transform:scale(1);}

        .hp-header{display:flex;align-items:center;gap:6px;margin-bottom:12px;}
        .hp-dot{width:7px;height:7px;border-radius:50%;}
        .hp-name{font-family:${sans};font-size:clamp(7px, 1.4vw, 10px);font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:rgba(250,250,248,.48);}
        .hp-bars{width:100%;display:flex;flex-direction:column;gap:5px;margin-bottom:12px;flex:1;justify-content:center;}
        .hp-bar-row{display:flex;align-items:center;gap:7px;}
        .hp-bar-lbl{font-family:${sans};font-size:clamp(6px, 1.2vw, 9px);color:rgba(250,250,248,.3);width:clamp(24px, 6vw, 42px);text-align:right;flex-shrink:0;}
        .hp-bar-track{flex:1;height:3px;background:rgba(250,250,248,.07);border-radius:2px;overflow:hidden;}
        .hp-bar-fill{height:100%;border-radius:2px;}

        .hp-chip{font-family:${sans};font-size:clamp(7px, 1.3vw, 10px);font-weight:500;letter-spacing:.09em;text-transform:uppercase;padding:clamp(2px, .5vw, 4px) clamp(8px, 1.8vw, 14px);border-radius:20px;}
        .hp-chip-pos{background:rgba(45,106,79,.18);color:#5DBE8A;border:.5px solid rgba(45,106,79,.35);}
        .hp-chip-att{background:rgba(192,57,43,.15);color:#E07B72;border:.5px solid rgba(192,57,43,.3);}
        .hp-chip-watch{background:rgba(184,134,11,.13);color:#D4A835;border:.5px solid rgba(184,134,11,.3);}

        /* ── Peaq+ face internals ──────────────────────────────── */
        .pf-top{display:flex;align-items:stretch;width:100%;gap:0;margin-bottom:10px;}
        .pf-col{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:4px 12px;text-align:center;}
        @media(max-width:420px){.pf-col{padding:4px 6px;}}
        .pf-vr{width:.5px;background:rgba(250,250,248,.1);flex-shrink:0;margin:2px 0;}
        .pf-eyebrow{font-family:${sans};font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:rgba(184,134,11,.7);font-weight:500;margin-bottom:2px;}
        .pf-num-row{display:flex;align-items:baseline;gap:5px;justify-content:center;}
        .pf-number{font-size:58px;font-weight:300;color:#FAFAF8;line-height:1;letter-spacing:-1px;transition:opacity .15s ease;}
        .pf-unit{font-size:17px;font-weight:300;color:rgba(250,250,248,.35);}
        .pf-name{font-size:18px;font-style:italic;font-weight:300;color:#B8860B;margin-top:3px;}
        @media(max-width:680px){.pf-number{font-size:40px;}.pf-name{font-size:14px;}.pf-unit{font-size:13px;}}

        .pf-stat-lbl{font-family:${sans};font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:rgba(250,250,248,.3);}
        @media(max-width:680px){.pf-stat-lbl{font-size:7px;}}
        .pf-chrono{font-size:28px;font-weight:300;color:rgba(250,250,248,.55);line-height:1.1;}
        .pf-chrono span{transition:opacity .15s ease;}
        .pf-delta{font-size:20px;font-weight:400;color:rgba(184,134,11,.9);line-height:1.1;}
        .pf-target{font-size:18px;font-weight:400;color:#5DBE8A;line-height:1.1;}
        .pf-status-pill{font-family:${sans};font-size:10px;font-weight:500;letter-spacing:.06em;padding:3px 12px;border-radius:20px;background:rgba(45,106,79,.18);color:#5DBE8A;border:.5px solid rgba(45,106,79,.35);}
        @media(max-width:680px){.pf-chrono{font-size:20px;}.pf-delta{font-size:15px;}.pf-target{font-size:14px;}.pf-status-pill{font-size:8px;padding:2px 8px;}}

        .pf-rule{width:100%;height:.5px;background:rgba(250,250,248,.09);margin:8px 0;flex-shrink:0;}

        .pf-sources{width:100%;}
        .pf-src-label{font-family:${sans};font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(250,250,248,.28);margin-bottom:5px;display:block;}
        .pf-src-bar{display:flex;width:100%;height:5px;border-radius:3px;overflow:hidden;gap:1px;margin-bottom:5px;}
        .pf-seg{height:100%;transition:width 1.2s ease-in-out;}
        .pf-interconnect{width:100%;margin:4px 0 2px;}
        .pf-seg-blood{background:#C0392B;opacity:.85;}
        .pf-seg-oral{background:#2D6A4F;opacity:.85;}
        .pf-seg-sleep{background:#4A7FB5;opacity:.5;}
        .pf-seg-cp{background:#D4A017;opacity:1;}

        .pf-legend{display:flex;gap:10px;flex-wrap:wrap;}
        .pf-leg{display:flex;align-items:center;gap:4px;font-family:${sans};font-size:9px;color:rgba(250,250,248,.36);}
        .pf-leg-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
        @media(max-width:680px){.pf-legend{gap:6px;}.pf-leg{font-size:7px;}}


        .hp-toggle{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:3px 8px;border-radius:999px;border:none;background:rgba(250,250,248,.1);cursor:pointer;}
        .hp-track{width:22px;height:12px;border-radius:6px;background:rgba(250,250,248,.18);position:relative;flex-shrink:0;}
        .hp-thumb{position:absolute;top:2px;width:8px;height:8px;border-radius:4px;transition:left 250ms cubic-bezier(.4,0,.2,1),background 250ms ease;}
        .hp-tgl-lbl{font-family:${sans};font-size:7px;letter-spacing:1px;text-transform:uppercase;color:rgba(250,250,248,.6);}

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

// ── Imperative animation helpers ───────────────────────────────────────────

function startStepper(
  el: HTMLSpanElement | null,
  steps: number[],
  intervalMs: number,
  timers: React.RefObject<ReturnType<typeof setInterval>[]>,
) {
  if (!el) return
  let i = 0
  el.textContent = String(steps[0])
  const id = setInterval(() => {
    i++
    if (i >= steps.length) { clearInterval(id); el.textContent = String(steps[steps.length - 1]); el.style.opacity = "1"; return }
    el.style.opacity = "0.5"
    setTimeout(() => { el.textContent = String(steps[i]); el.style.opacity = "1" }, 100)
  }, intervalMs)
  timers.current.push(id)
}

function startBarPulse(
  segs: Record<string, HTMLDivElement | null>,
  timers: React.RefObject<ReturnType<typeof setInterval>[]>,
) {
  let idx = 0
  applyBarVariant(segs, BAR_VARIANTS[0])
  const id = setInterval(() => {
    idx = (idx + 1) % BAR_VARIANTS.length
    applyBarVariant(segs, BAR_VARIANTS[idx])
  }, 1100)
  timers.current.push(id)
}

function applyBarVariant(segs: Record<string, HTMLDivElement | null>, v: typeof BAR_VARIANTS[number]) {
  if (segs.blood) segs.blood.style.width = v.blood
  if (segs.oral)  segs.oral.style.width  = v.oral
  if (segs.sleep) segs.sleep.style.width = v.sleep
  if (segs.cp)    segs.cp.style.width    = v.cp
}

function resetBars(segs: Record<string, HTMLDivElement | null>) {
  applyBarVariant(segs, BAR_VARIANTS[0])
}

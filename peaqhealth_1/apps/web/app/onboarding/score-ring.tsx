"use client";

import { useEffect, useState } from "react";

interface ArcProps {
  color: string;
  startAngle: number;
  endAngle: number;
  radius: number;
  strokeWidth: number;
  dashed?: boolean;
  animate?: boolean;
  delay?: number;
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const startRad = ((startDeg - 90) * Math.PI) / 180;
  const endRad = ((endDeg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function Arc({ color, startAngle, endAngle, radius, strokeWidth, dashed, animate, delay = 0 }: ArcProps) {
  const cx = 100, cy = 100;
  const pathLen = ((endAngle - startAngle) / 360) * 2 * Math.PI * radius;
  const [offset, setOffset] = useState(animate ? pathLen : 0);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setOffset(0), delay);
    return () => clearTimeout(t);
  }, [animate, delay, pathLen]);

  return (
    <path
      d={describeArc(cx, cy, radius, startAngle, endAngle)}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dashed ? "4 6" : `${pathLen}`}
      strokeDashoffset={dashed ? 0 : offset}
      style={{ transition: dashed ? "none" : "stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94)" }}
      opacity={dashed ? 0.3 : 1}
    />
  );
}

interface ScoreRingProps {
  score?: number;
  sleep?: { pts: number; max: number; active: boolean };
  blood?: { pts: number; max: number; active: boolean };
  oral?: { pts: number; max: number; active: boolean };
  lifestyle?: { pts: number; max: number; active: boolean };
  size?: number;
  animate?: boolean;
  preview?: boolean;
}

const PANEL_COLORS = {
  sleep: "#185FA5",
  blood: "#A32D2D",
  oral: "#3B6D11",
  lifestyle: "#C49A3C",
};

export function ScoreRing({
  score,
  sleep = { pts: 0, max: 27, active: false },
  blood = { pts: 0, max: 33, active: false },
  oral = { pts: 0, max: 27, active: false },
  lifestyle = { pts: 0, max: 13, active: false },
  size = 200,
  animate = false,
  preview = false,
}: ScoreRingProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const targetScore = score ?? 0;

  useEffect(() => {
    if (!animate || targetScore === 0) { setDisplayScore(targetScore); return; }
    let start: number | null = null;
    const duration = 1500;
    function step(ts: number) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * targetScore));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [animate, targetScore]);

  const gap = 4;
  const totalDeg = 360 - gap * 4;
  const panels = [
    { key: "sleep" as const, ...sleep, color: PANEL_COLORS.sleep },
    { key: "blood" as const, ...blood, color: PANEL_COLORS.blood },
    { key: "oral" as const, ...oral, color: PANEL_COLORS.oral },
    { key: "lifestyle" as const, ...lifestyle, color: PANEL_COLORS.lifestyle },
  ];
  const totalMax = panels.reduce((s, p) => s + p.max, 0);

  let cursor = 0;
  const arcs = panels.map((p, i) => {
    const sweep = (p.max / totalMax) * totalDeg;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end + gap;
    return { ...p, startAngle: start, endAngle: end, delay: i * 200 };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        {/* Background track */}
        {arcs.map((a) => (
          <Arc
            key={`bg-${a.key}`}
            color={a.color}
            startAngle={a.startAngle}
            endAngle={a.endAngle}
            radius={85}
            strokeWidth={6}
            dashed={true}
          />
        ))}
        {/* Filled arcs */}
        {arcs.map((a) => {
          if (preview) {
            return (
              <Arc
                key={`fg-${a.key}`}
                color={a.color}
                startAngle={a.startAngle}
                endAngle={a.startAngle + (a.endAngle - a.startAngle) * 0.6}
                radius={85}
                strokeWidth={6}
                animate={animate}
                delay={a.delay}
              />
            );
          }
          if (!a.active) return null;
          const fillPct = a.max > 0 ? a.pts / a.max : 0;
          const fillEnd = a.startAngle + (a.endAngle - a.startAngle) * fillPct;
          if (fillPct <= 0) return null;
          return (
            <Arc
              key={`fg-${a.key}`}
              color={a.color}
              startAngle={a.startAngle}
              endAngle={fillEnd}
              radius={85}
              strokeWidth={6}
              animate={animate}
              delay={a.delay}
            />
          );
        })}
      </svg>
      {/* Center score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-light text-ink leading-none">
          {animate ? displayScore : (score ?? "—")}
        </span>
        {score !== undefined && (
          <span className="font-body text-[10px] uppercase tracking-widest text-ink/40 mt-1">
            peaq score
          </span>
        )}
      </div>
    </div>
  );
}

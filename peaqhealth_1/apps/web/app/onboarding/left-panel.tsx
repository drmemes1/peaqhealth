"use client";

import { LogoSvg } from "../components/logo-svg";
import { STEPS, STEP_LABELS, type OnboardingStep, type PanelStates, type PanelStatus } from "./types";

const PANEL_CONFIG: { key: keyof PanelStates; label: string; color: string; pts: string }[] = [
  { key: "sleep", label: "Sleep", color: "#4A7FB5", pts: "27 pts" },
  { key: "blood", label: "Blood", color: "#C0392B", pts: "33 pts" },
  { key: "oral",  label: "Oral",  color: "#2D6A4F", pts: "27 pts" },
  { key: "lifestyle", label: "Lifestyle", color: "#B8860B", pts: "13 pts" },
];

function StatusBadge({ status }: { status: PanelStatus }) {
  if (status === "active") {
    return (
      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/90">
        Active
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/30">
        Skipped
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/20">
      Pending
    </span>
  );
}

interface LeftPanelProps {
  currentStep: OnboardingStep;
  panels: PanelStates;
}

export function LeftPanel({ currentStep, panels }: LeftPanelProps) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div className="sticky top-0 flex h-svh w-full flex-col justify-between bg-ink p-8 lg:w-80 lg:min-w-80">
      {/* Logo */}
      <div>
        <LogoSvg size={48} color="rgba(250,250,248,0.9)" />
      </div>

      {/* Step dots */}
      <nav className="flex flex-col gap-0">
        {STEPS.map((step, i) => {
          const isCurrent = step === currentStep;
          const isDone = i < currentIndex;
          const isLast = i === STEPS.length - 1;
          return (
            <div key={step} className="flex flex-col">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center" style={{ width: 12, height: 12 }}>
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full" style={{ border: "1.5px solid var(--gold)" }} />
                  )}
                  <div className="rounded-full transition-all duration-300" style={{
                    width: isCurrent ? 6 : 8,
                    height: isCurrent ? 6 : 8,
                    background: isCurrent ? "white" : isDone ? "var(--gold)" : "transparent",
                    border: isDone ? "none" : isCurrent ? "none" : "0.5px solid rgba(250,250,248,0.3)",
                  }} />
                </div>
                <span className="font-body text-[10px] uppercase tracking-widest transition-colors" style={{
                  color: isCurrent ? "white" : isDone ? "rgba(250,250,248,0.4)" : "rgba(250,250,248,0.2)"
                }}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {!isLast && (
                <div className="ml-[5.5px] h-4 w-px" style={{ background: "rgba(250,250,248,0.1)" }} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Panel status badges */}
      <div className="flex flex-col gap-2.5">
        <span className="font-body text-[10px] uppercase tracking-widest text-white/25 mb-1">
          Panels
        </span>
        {PANEL_CONFIG.map((p) => (
          <div key={p.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: p.color,
                  opacity: panels[p.key] === "active" ? 1 : 0.3,
                }}
              />
              <span className={`font-body text-xs ${
                panels[p.key] === "active" ? "text-white/70" : "text-white/30"
              }`}>
                {p.label}
                <span className="ml-1.5 text-white/20">{p.pts}</span>
              </span>
            </div>
            <StatusBadge status={panels[p.key]} />
          </div>
        ))}
      </div>
    </div>
  );
}

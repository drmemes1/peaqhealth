"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "../components/nav";
import { ScoreRing } from "../onboarding/score-ring";
import type { PeaqScoreResult } from "@peaq/score-engine";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface PanelData {
  sleep: { pts: number; max: number; active: boolean; source: string };
  blood: { pts: number; max: number; active: boolean; freshness: string };
  oral: { pts: number; max: number; active: boolean };
  lifestyle: { pts: number; max: number; active: boolean };
  ix: { pts: number; max: number; active: boolean };
}

interface DashboardProps {
  profile: Profile;
  scoreResult: PeaqScoreResult;
  panels: PanelData;
  pendingPanels: string[];
  insights: { icon: string; title: string; body: string; tag: string }[];
}

// ─── Category messages ───────────────────────────────────────────────────────

const CATEGORY_MSG: Record<string, string> = {
  optimal: "Exceptional. Keep doing what you're doing.",
  good: "Looking good. Room to optimise.",
  moderate: "Solid foundation. A few areas need attention.",
  attention: "We've captured your baseline. Let's build from here.",
};

// ─── Panel card colors ──────────────────────────────────────────────────────

const PANEL_COLORS: Record<string, string> = {
  sleep: "#4A7FB5",
  blood: "#C0392B",
  oral: "#2D6A4F",
  lifestyle: "#B8860B",
};

// ─── Progress bar component ─────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full bg-ink/5 mt-2">
      <div
        className="h-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ─── Panel card component ───────────────────────────────────────────────────

function PanelCard({ label, pts, max, active, color, badge, link }: {
  label: string; pts: number; max: number; active: boolean;
  color: string; badge?: string; link?: { href: string; text: string };
}) {
  return (
    <div className="flex flex-col bg-white transition-all duration-150"
         style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, borderTop: `2px solid ${color}` }}
         onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `2px solid ${color}`; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
         onMouseLeave={() => {}}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }} />
            <span className="font-body text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--ink-60)" }}>{label}</span>
          </div>
          {badge && (
            <span className="font-body text-[9px] uppercase tracking-widest px-1.5 py-0.5"
                  style={{ background: "var(--ink-06)", color: "var(--ink-30)" }}>{badge}</span>
          )}
        </div>
        {active ? (
          <>
            <span className="font-display text-2xl font-light" style={{ color: "var(--ink)" }}>
              {pts}<span className="text-sm" style={{ color: "var(--ink-30)" }}>/{max}</span>
            </span>
            <ProgressBar value={pts} max={max} color={color} />
          </>
        ) : (
          <span className="font-body text-[10px] uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>Pending</span>
        )}
        {link && (
          <Link href={link.href} className="block mt-3 font-body text-[10px] uppercase tracking-widest transition-colors"
                style={{ color: "var(--gold)" }}>{link.text}</Link>
        )}
      </div>
    </div>
  );
}

// ─── Pending banner component ───────────────────────────────────────────────

function PendingBanner({ text, pts, href }: { text: string; pts?: number; href?: string }) {
  const inner = (
    <div className="flex items-center justify-between px-4 py-3 transition-colors"
         style={{ borderLeft: "3px solid var(--gold)", background: "var(--gold-dim)", border: "0.5px solid var(--ink-12)", borderLeftWidth: 3, borderLeftColor: "var(--gold)" }}>
      <span className="font-body text-sm" style={{ color: "var(--ink-60)" }}>{text}</span>
      <span className="font-body text-[10px] uppercase tracking-widest" style={{ color: "var(--gold)" }}>
        {pts ? `Unlock ${pts} pts →` : "Unlock →"}
      </span>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ─── Insight card ───────────────────────────────────────────────────────────

function InsightCard({ icon, title, body, tag }: { icon: string; title: string; body: string; tag: string }) {
  return (
    <div className="bg-white p-4"
         style={{ border: "0.5px solid var(--ink-12)", borderLeft: "2px solid var(--gold)", borderRadius: 4 }}>
      <div className="flex items-start gap-3">
        <span className="text-base shrink-0">{icon}</span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-base font-light" style={{ color: "var(--ink)" }}>{title}</span>
          <p className="font-body text-xs leading-relaxed" style={{ color: "var(--ink-60)" }}>{body}</p>
          <span className="mt-1 self-start font-body text-[9px] uppercase tracking-widest px-1.5 py-0.5"
                style={{ background: "var(--ink-06)", color: "var(--ink-30)" }}>{tag}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Client ──────────────────────────────────────────────────

export function DashboardClient({ profile, scoreResult, panels, pendingPanels, insights }: DashboardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const initials = [profile.first_name?.[0], profile.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="min-h-svh bg-off-white">
      {/* ── Top nav ── */}
      <Nav initials={initials} />

      {/* ── Content ── */}
      <main className="mx-auto max-w-[680px] px-6 py-10 flex flex-col gap-10">
        {/* Hero — Score ring */}
        <section className="flex flex-col items-center gap-4">
          <ScoreRing
            score={scoreResult.score}
            sleep={{ pts: panels.sleep.pts, max: panels.sleep.max, active: panels.sleep.active }}
            blood={{ pts: panels.blood.pts, max: panels.blood.max, active: panels.blood.active }}
            oral={{ pts: panels.oral.pts, max: panels.oral.max, active: panels.oral.active }}
            ix={{ pts: panels.ix.pts, max: panels.ix.max, active: panels.ix.active }}
            size={200}
            animate={mounted}
          />
          <div className="text-center mt-2">
            <p className="font-display text-sm font-light italic" style={{ color: "var(--gold)" }}>
              {CATEGORY_MSG[scoreResult.category] ?? CATEGORY_MSG.moderate}
            </p>
          </div>
        </section>

        {/* Panel breakdown grid */}
        <section>
          <h3 className="font-body text-[10px] uppercase tracking-widest text-ink/30 mb-3">
            Panel breakdown
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <PanelCard
              label="Sleep"
              pts={panels.sleep.pts}
              max={panels.sleep.max}
              active={panels.sleep.active}
              color={PANEL_COLORS.sleep!}
              badge={panels.sleep.active ? panels.sleep.source : undefined}
            />
            <PanelCard
              label="Blood"
              pts={panels.blood.pts}
              max={panels.blood.max}
              active={panels.blood.active}
              color={PANEL_COLORS.blood!}
              badge={panels.blood.active && panels.blood.freshness !== "fresh" ? panels.blood.freshness : undefined}
            />
            <PanelCard
              label="Oral"
              pts={panels.oral.pts}
              max={panels.oral.max}
              active={panels.oral.active}
              color={PANEL_COLORS.oral!}
            />
            <PanelCard
              label="Lifestyle"
              pts={panels.lifestyle.pts}
              max={panels.lifestyle.max}
              active={panels.lifestyle.active}
              color={PANEL_COLORS.lifestyle!}
              link={{ href: "/settings/lifestyle", text: "Update answers" }}
            />
          </div>
        </section>

        {/* Pending banners */}
        {pendingPanels.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-body text-[10px] uppercase tracking-widest text-ink/30 mb-1">
              Unlock more points
            </h3>
            {pendingPanels.includes("sleep") && <PendingBanner text="Connect a wearable" pts={28} />}
            {pendingPanels.includes("blood") && <PendingBanner text="Upload lab results" pts={28} />}
            {pendingPanels.includes("oral") && <PendingBanner text="Order oral kit" pts={25} />}
            {pendingPanels.includes("lifestyle") && <PendingBanner text="Complete lifestyle questions" pts={10} href="/settings/lifestyle" />}
          </section>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="font-body text-[10px] uppercase tracking-widest text-ink/30 mb-1">
              Insights
            </h3>
            {insights.map((ins, i) => (
              <InsightCard key={i} {...ins} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

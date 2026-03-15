"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "../components/logo";
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

function PanelCard({
  label,
  pts,
  max,
  active,
  color,
  badge,
  link,
}: {
  label: string;
  pts: number;
  max: number;
  active: boolean;
  color: string;
  badge?: string | undefined;
  link?: { href: string; text: string } | undefined;
}) {
  return (
    <div className={`border p-4 transition-all ${active ? "border-ink/10 bg-white" : "border-ink/5 bg-ink/[0.02]"}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
          />
          <span className="font-body text-xs font-medium text-ink">{label}</span>
        </div>
        {badge && (
          <span className="font-body text-[10px] uppercase tracking-widest text-ink/30 bg-ink/5 px-1.5 py-0.5">
            {badge}
          </span>
        )}
      </div>
      {active ? (
        <>
          <span className="font-display text-2xl font-light text-ink">
            {pts}<span className="text-ink/30 text-sm">/{max}</span>
          </span>
          <ProgressBar value={pts} max={max} color={color} />
        </>
      ) : (
        <span className="font-body text-[10px] uppercase tracking-widest text-ink/25">
          Locked
        </span>
      )}
      {link && (
        <Link
          href={link.href}
          className="block mt-2 font-body text-[10px] uppercase tracking-widest text-gold hover:text-ink transition-colors"
        >
          {link.text}
        </Link>
      )}
    </div>
  );
}

// ─── Pending banner component ───────────────────────────────────────────────

function PendingBanner({ text, href }: { text: string; href?: string }) {
  const inner = (
    <div className="flex items-center justify-between border border-gold/20 bg-gold/5 px-4 py-3">
      <span className="font-body text-sm text-ink/70">{text}</span>
      <span className="font-body text-[10px] uppercase tracking-widest text-gold">Unlock →</span>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ─── Insight card ───────────────────────────────────────────────────────────

function InsightCard({ icon, title, body, tag }: { icon: string; title: string; body: string; tag: string }) {
  return (
    <div className="border border-ink/10 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0">{icon}</span>
        <div className="flex flex-col gap-1">
          <span className="font-body text-sm font-medium text-ink">{title}</span>
          <p className="font-body text-xs text-ink/50 leading-relaxed">{body}</p>
          <span className="mt-1 inline-block self-start font-body text-[10px] uppercase tracking-widest text-ink/25 bg-ink/5 px-1.5 py-0.5">
            {tag}
          </span>
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

  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-svh bg-off-white">
      {/* ── Top nav ── */}
      <nav className="sticky top-0 z-50 border-b border-ink/8 bg-off-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[680px] items-center justify-between px-6">
          <Logo height={22} className="mix-blend-multiply" style={{ filter: 'brightness(0)' }} />
          <div className="flex items-center gap-4">
            <span className="hidden sm:block font-body text-[10px] uppercase tracking-widest text-ink/30">
              Last updated: {today}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-off-white font-body text-xs font-medium">
              {initials}
            </div>
          </div>
        </div>
      </nav>

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
          <div className="text-center">
            <p className="font-body text-sm text-ink/50">
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
            {pendingPanels.includes("sleep") && (
              <PendingBanner text="Connect a wearable → unlock 28 pts" />
            )}
            {pendingPanels.includes("blood") && (
              <PendingBanner text="Upload lab results → unlock 28 pts" />
            )}
            {pendingPanels.includes("oral") && (
              <PendingBanner text="Order oral kit → unlock 25 pts" />
            )}
            {pendingPanels.includes("lifestyle") && (
              <PendingBanner
                text="Complete lifestyle questions → unlock 10 pts"
                href="/settings/lifestyle"
              />
            )}
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

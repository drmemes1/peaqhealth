"use client"

import { CappuccinoCard, Strong, Gold } from "../../components/panels/CappuccinoCard"

const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"
const serif = "var(--font-manrope), system-ui, sans-serif"

function DropIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round">
      <path d="M12 3c-4 5-7 8-7 11a7 7 0 0014 0c0-3-3-6-7-11z" />
    </svg>
  )
}
function ToothIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3c-2 0-4 2-4 5 0 4 2 7 3 10 .5 1.5 1 3 2 3s1.5-1 2-2.5c.3-.8.6-1.5 2-1.5s1.7.7 2 1.5c.5 1.5 1 2.5 2 2.5s1.5-1.5 2-3c1-3 3-6 3-10 0-3-2-5-4-5-1.5 0-2.5.5-3 1.5-.3.6-.8 1-2 1s-1.7-.4-2-1C8.5 3.5 8.5 3 7 3z" />
    </svg>
  )
}
function ShieldIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 4v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V7l7-4z" />
    </svg>
  )
}

function f(v: number | null, d = 2): string { return v == null ? "—" : v.toFixed(d) }

type Status = "good" | "watch" | "concern" | "pending"

export function CavityEnvironmentSection({ kit }: {
  kit: {
    ph_balance_api: number | null
    ph_balance_category: string | null
    cariogenic_load_pct: number | null
    cariogenic_load_category: string | null
    protective_ratio: number | null
    protective_ratio_category: string | null
    s_mutans_pct: number | null
    s_sobrinus_pct: number | null
    scardovia_pct: number | null
    lactobacillus_pct: number | null
    s_sanguinis_pct: number | null
    s_gordonii_pct: number | null
    neisseria_pct: number | null
    veillonella_pct: number | null
    actinomyces_pct: number | null
  }
}) {
  if (kit.ph_balance_api == null) return null

  const phStatus: Status = kit.ph_balance_category === "well_buffered" ? "good" : kit.ph_balance_category === "mildly_acidogenic" ? "watch" : "concern"
  const cliStatus: Status = kit.cariogenic_load_category === "minimal" || kit.cariogenic_load_category === "low" ? "good" : kit.cariogenic_load_category === "elevated" ? "watch" : "concern"
  const prStatus: Status = kit.protective_ratio_category === "strong" || kit.protective_ratio_category === "very_strong" || kit.protective_ratio_category === "no_cavity_makers" ? "good" : kit.protective_ratio_category === "moderate" ? "watch" : "concern"

  const phVal = kit.ph_balance_api
  const cliVal = kit.cariogenic_load_pct ?? 0
  const prVal = kit.protective_ratio

  return (
    <div style={{ gridColumn: "1 / -1", marginBottom: 16 }}>
      {/* Section header */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8860B", display: "block", marginBottom: 6 }}>
          YOUR CAVITY ENVIRONMENT
        </span>
        <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 500, color: "#2C2A24", margin: "0 0 6px" }}>
          How your mouth&rsquo;s ecosystem is set up
        </h3>
        <p style={{ fontFamily: sans, fontSize: 13, color: "#7A7870", lineHeight: 1.5, margin: 0, maxWidth: 600 }}>
          Bacterial counts matter less than the environment they live in. These three numbers show your mouth&rsquo;s balance.
        </p>
      </div>

      {/* 3 cappuccino cards */}
      <div className="env-cards-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        {/* pH */}
        <CappuccinoCard
          compact
          status={phStatus}
          icon={<DropIcon color={phStatus === "good" ? "#1A8C4E" : "#B8860B"} />}
          title={phStatus === "good" ? "Well-buffered" : "Leaning acidic"}
          question="Is your mouth acidic or alkaline between meals?"
          value={phVal.toFixed(2)}
          unit="ratio"
          pill={phStatus === "good" ? "WELL-BUFFERED" : "WATCH"}
          scaleItems={[
            { label: "<0.25 Buffered", isTarget: true, isUser: phVal <= 0.25 },
            { label: "0.25–0.45 Mild", status: "watch" },
            { label: ">0.65 Acidic", status: "concern" },
          ]}
          sources="Acid-producing vs acid-neutralizing bacteria"
          explain={<>
            Your acid-neutralizing bacteria outnumber your acid-makers by roughly <Strong>{Math.round(1 / (phVal || 0.01))} to 1</Strong>. This keeps your oral environment on the alkaline side between meals — the opposite of what you&rsquo;d see in someone with frequent cavities. Your protective bacteria (Actinomyces {f(kit.actinomyces_pct)}%, S. sanguinis {f(kit.s_sanguinis_pct)}%) are <Gold>keeping your enamel safe</Gold> from acid attacks.
          </>}
        />

        {/* Cavity bacteria */}
        <CappuccinoCard
          compact
          status={cliStatus}
          icon={<ToothIcon color={cliStatus === "good" ? "#1A8C4E" : "#B8860B"} />}
          title="Cavity-making bacteria"
          question="How much of your community produces acid from sugar?"
          value={cliVal.toFixed(2)}
          unit="%"
          pill={cliStatus === "good" ? "LOW" : cliStatus === "watch" ? "SLIGHTLY ELEVATED" : "ELEVATED"}
          scaleItems={[
            { label: "<0.5% Target", isTarget: true },
            { label: `${cliVal.toFixed(2)}% You`, status: cliStatus, isUser: true },
            { label: ">1.5% High", status: "concern" },
          ]}
          sources="S. mutans + S. sobrinus + Scardovia + Lactobacillus"
          explain={<>
            S. mutans ({f(kit.s_mutans_pct)}%) and S. sobrinus ({f(kit.s_sobrinus_pct)}%) are {cliStatus === "good" ? "both low" : "slightly above the under-0.5% target when summed"}.
            {(kit.lactobacillus_pct ?? 0) < 0.01 && <> <Strong>Lactobacillus is effectively absent</Strong> — a positive signal.</>}
            {cliStatus !== "good" && <> Your count is slightly elevated, but <Gold>context matters</Gold>: your buffering and protective bacteria are both doing their job.</>}
          </>}
        />

        {/* Protective ratio */}
        <CappuccinoCard
          compact
          status={prStatus}
          icon={<ShieldIcon color={prStatus === "good" ? "#1A8C4E" : prStatus === "watch" ? "#B8860B" : "#9A9894"} />}
          title="Your defensive bacteria"
          question="How outnumbered are the cavity-makers by protectors?"
          value={prVal != null ? prVal.toFixed(1) : "—"}
          unit="×"
          pill={prStatus === "good" ? "STRONG DEFENSE" : prStatus === "watch" ? "MODERATE" : "WEAK"}
          scaleItems={[
            { label: "<2× Weak", status: "concern" },
            { label: `${prVal != null ? prVal.toFixed(1) : "—"}× You`, status: prStatus, isUser: true },
            { label: "5–15× Ideal", isTarget: true },
          ]}
          sources="S. sanguinis + S. gordonii vs S. mutans + S. sobrinus"
          explain={<>
            Your protective bacteria outnumber the cavity-makers <Strong>{prVal != null ? prVal.toFixed(1) : "—"} to 1</Strong>. {prVal != null && prVal >= 5 ? "You're in the ideal range." : "The ideal is 5–10×, so you're slightly below but still in strong defensive territory."}
            {" "}S. sanguinis ({f(kit.s_sanguinis_pct)}%) is your lead defender — it produces hydrogen peroxide that&rsquo;s directly hostile to S. mutans, and the two species <Gold>compete for the same tooth-surface real estate</Gold>.
          </>}
        />
      </div>

      {/* Synthesis card */}
      <div style={{
        background: "#FAF8F2", border: "1px solid #E8E4D8", borderRadius: 12,
        padding: "20px 24px",
      }}>
        <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8860B", display: "block", marginBottom: 10 }}>
          WHAT THESE THREE SHOW TOGETHER
        </span>
        <p style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", lineHeight: 1.7, color: "#3D3B35", margin: 0, maxWidth: 700 }}>
          Your mouth runs <Strong>well-buffered</Strong> (acidity {phVal.toFixed(2)}) with <Strong>{prVal != null ? prVal.toFixed(1) : "—"}× more protective bacteria than cavity-makers</Strong>.
          {phStatus === "good" && (prStatus === "good" || prStatus === "watch") && " That's the combination that keeps enamel safe."}
          {cliStatus !== "good" && <> Your cavity-causing bacteria sit slightly above the 0.5% target at {cliVal.toFixed(2)}%, but <Gold>the environment they live in is defending against them</Gold> — your buffering and protective balance are doing their job.</>}
          {cliStatus === "good" && <> Your cavity-causing bacteria are low at {cliVal.toFixed(2)}% — <Gold>your environment and your counts are both strong</Gold>.</>}
        </p>
      </div>

      <style>{`
        @media (max-width: 960px) { .env-cards-row { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 640px) { .env-cards-row { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}

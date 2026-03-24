import { LogoSvg } from "./components/logo-svg";
import { WaitlistForm } from "./waitlist-form";

const panels = [
  { label: "Sleep",     pts: 27, color: "var(--sleep-c)" },
  { label: "Blood",     pts: 33, color: "var(--blood-c)" },
  { label: "Oral",      pts: 27, color: "var(--oral-c)"  },
  { label: "Lifestyle", pts: 13, color: "var(--gold)"    },
] as const;

export default function Home() {
  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-between bg-off-white selection:bg-gold selection:text-white"
      style={{ padding: "48px 24px 40px" }}
    >
      {/* Logo — centered, large, blended into cream */}
      <div
        className="fade-up flex flex-col items-center gap-6"
        style={{ animationDelay: "0ms" }}
      >
        <LogoSvg size={108} color="var(--ink)" />
        <span
          className="font-body text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--gold)" }}
        >
          Coming soon · 2026
        </span>
      </div>

      {/* Hero */}
      <main className="flex w-full max-w-lg flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-6">
          <h1
            className="fade-up font-display font-light leading-[1.08] tracking-[-0.02em]"
            style={{
              fontSize: "clamp(48px, 7.5vw, 76px)",
              color: "var(--ink)",
              animationDelay: "120ms",
            }}
          >
            Reach for the peaq.
            <br />
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>
              Your body, measured.
            </em>
          </h1>

          <p
            className="fade-up font-body text-sm leading-[1.75] tracking-wide"
            style={{
              color: "var(--ink-60)",
              animationDelay: "260ms",
              maxWidth: 340,
            }}
          >
            Sleep · Blood · Oral microbiome · Lifestyle&nbsp;&mdash;
            <br />
            one score, recalculated nightly.
          </p>
        </div>

        {/* Waitlist */}
        <div className="fade-up w-full" style={{ animationDelay: "400ms" }}>
          <WaitlistForm />
        </div>

        <p
          className="fade-up font-body text-[10px] tracking-widest uppercase"
          style={{ color: "var(--ink-30)", animationDelay: "520ms" }}
        >
          For informational purposes only
        </p>
      </main>

      {/* Panel score row */}
      <footer
        className="fade-up w-full"
        style={{ animationDelay: "560ms", maxWidth: 520 }}
      >
        {/* Thin rule */}
        <div
          style={{
            borderTop: "0.5px solid var(--ink-12)",
            marginBottom: 24,
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {panels.map((p) => (
            <div
              key={p.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "16px 8px",
                background: "var(--warm-50)",
                border: "0.5px solid var(--ink-06)",
              }}
            >
              <span
                className="font-body uppercase tracking-[0.14em]"
                style={{ fontSize: 9, color: p.color, letterSpacing: "0.14em" }}
              >
                {p.label}
              </span>
              <span
                className="font-display font-light"
                style={{ fontSize: 28, lineHeight: 1, color: "var(--ink)" }}
              >
                {p.pts}
              </span>
              <span
                className="font-body"
                style={{ fontSize: 9, color: "var(--ink-30)", letterSpacing: "0.06em" }}
              >
                pts
              </span>
            </div>
          ))}
        </div>

        <p
          className="font-body text-center"
          style={{
            fontSize: 10,
            color: "var(--ink-30)",
            letterSpacing: "0.06em",
            marginTop: 14,
          }}
        >
          100 points total
        </p>
      </footer>
    </div>
  );
}

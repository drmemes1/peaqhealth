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
      style={{ padding: "32px 40px 40px" }}
    >
      {/* Logo — absolute top-left, blends into cream */}
      <div
        className="fade-up"
        style={{
          position: "absolute",
          top: 32,
          left: 40,
          animationDelay: "0ms",
        }}
      >
        <LogoSvg size={96} color="var(--ink)" />
      </div>

      {/* Eyebrow */}
      <div className="fade-up w-full flex justify-center pt-2" style={{ animationDelay: "0ms" }}>
        <span
          className="font-body text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--gold)" }}
        >
          Coming soon · 2026
        </span>
      </div>

      {/* Hero */}
      <main className="flex w-full max-w-lg flex-col items-center text-center" style={{ gap: 36 }}>
        <div className="flex flex-col items-center" style={{ gap: 16 }}>
          <h1
            className="fade-up font-display font-light"
            style={{
              animationDelay: "100ms",
              margin: 0,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "clamp(46px, 6.5vw, 72px)",
                color: "var(--ink)",
                whiteSpace: "nowrap",
              }}
            >
              Reach for the peaq.
            </span>
            <em
              style={{
                display: "block",
                fontSize: "clamp(46px, 6.5vw, 72px)",
                color: "var(--gold)",
                fontStyle: "italic",
                whiteSpace: "nowrap",
              }}
            >
              Your body, measured.
            </em>
          </h1>

          <p
            className="fade-up font-body text-sm leading-relaxed"
            style={{
              color: "var(--ink-60)",
              animationDelay: "220ms",
              maxWidth: 380,
              letterSpacing: "0.02em",
            }}
          >
            Sleep · Blood · Oral microbiome · Lifestyle&nbsp;&mdash; one score, recalculated nightly.
          </p>
        </div>

        <div className="fade-up w-full" style={{ animationDelay: "360ms", maxWidth: 480 }}>
          <WaitlistForm />
        </div>

        <p
          className="fade-up font-body text-[10px] tracking-widest uppercase"
          style={{ color: "var(--ink-30)", animationDelay: "460ms" }}
        >
          For informational purposes only
        </p>
      </main>

      {/* Panel score row */}
      <footer className="fade-up w-full" style={{ animationDelay: "520ms", maxWidth: 560 }}>
        <div style={{ borderTop: "0.5px solid var(--ink-12)", marginBottom: 20 }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          {panels.map((p) => (
            <div
              key={p.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                padding: "14px 8px",
                background: "var(--warm-50)",
                border: "0.5px solid var(--ink-06)",
              }}
            >
              <span
                className="font-body uppercase"
                style={{ fontSize: 9, letterSpacing: "0.14em", color: p.color }}
              >
                {p.label}
              </span>
              <span
                className="font-display font-light"
                style={{ fontSize: 26, lineHeight: 1, color: "var(--ink)" }}
              >
                {p.pts}
              </span>
              <span
                className="font-body"
                style={{ fontSize: 9, letterSpacing: "0.06em", color: "var(--ink-30)" }}
              >
                pts
              </span>
            </div>
          ))}
        </div>

        <p
          className="font-body text-center"
          style={{ fontSize: 10, color: "var(--ink-30)", letterSpacing: "0.06em", marginTop: 12 }}
        >
          100 points total
        </p>
      </footer>
    </div>
  );
}

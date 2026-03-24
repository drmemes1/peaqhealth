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
      className="relative flex min-h-svh flex-col bg-off-white selection:bg-gold selection:text-white"
      style={{ padding: "32px 40px 40px" }}
    >
      {/* Header — logo top-left, eyebrow top-right */}
      <header
        className="fade-up flex w-full items-start justify-between"
        style={{ animationDelay: "0ms", marginBottom: "auto" }}
      >
        <LogoSvg size={96} color="var(--ink)" />

        <span
          className="font-body text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "var(--gold)", paddingTop: 8 }}
        >
          Coming soon · 2026
        </span>
      </header>

      {/* Hero — vertically centered in remaining space */}
      <main
        className="flex w-full flex-col items-center text-center"
        style={{ paddingTop: 64, paddingBottom: 64 }}
      >
        <div className="flex flex-col items-center" style={{ gap: 20, maxWidth: 600 }}>
          <h1
            className="fade-up font-display font-light tracking-[-0.02em]"
            style={{
              fontSize: "clamp(50px, 7vw, 78px)",
              lineHeight: 1.1,
              color: "var(--ink)",
              animationDelay: "100ms",
              margin: 0,
            }}
          >
            Reach for the peaq.
            <br />
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>
              Your body, measured.
            </em>
          </h1>

          <p
            className="fade-up font-body text-sm leading-relaxed tracking-wide"
            style={{
              color: "var(--ink-60)",
              animationDelay: "220ms",
              maxWidth: 360,
              margin: "4px 0 0",
            }}
          >
            Sleep · Blood · Oral microbiome · Lifestyle&nbsp;&mdash; one score, recalculated nightly.
          </p>
        </div>

        <div
          className="fade-up w-full"
          style={{ animationDelay: "360ms", maxWidth: 480, marginTop: 40 }}
        >
          <WaitlistForm />
        </div>

        <p
          className="fade-up font-body text-[10px] tracking-widest uppercase"
          style={{ color: "var(--ink-30)", animationDelay: "480ms", marginTop: 20 }}
        >
          For informational purposes only
        </p>
      </main>

      {/* Panel score row — pinned to bottom */}
      <footer
        className="fade-up w-full"
        style={{ animationDelay: "520ms", marginTop: "auto" }}
      >
        <div style={{ borderTop: "0.5px solid var(--ink-12)", marginBottom: 20 }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            maxWidth: 560,
            margin: "0 auto",
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

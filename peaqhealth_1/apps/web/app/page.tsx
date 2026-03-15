import Image from "next/image";
import { WaitlistForm } from "./waitlist-form";

const panels = [
  { label: "Sleep", pts: 28 },
  { label: "Blood", pts: 28 },
  { label: "Oral", pts: 25 },
] as const;

export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-between bg-off-white px-6 py-10 selection:bg-gold selection:text-white">
      {/* Fixed logo top-left */}
      <div className="fixed top-0 left-0 z-50 pt-5 pl-6">
        <Image
          src="/peaq.png"
          alt="Peaq"
          width={80}
          height={28}
          style={{ filter: "brightness(0)", width: "auto", height: 28 }}
          priority
        />
      </div>

      {/* Coming soon eyebrow */}
      <div className="w-full flex justify-center pt-2">
        <span
          className="fade-up font-body text-[10px] uppercase tracking-[0.15em]"
          style={{ color: "var(--gold)", animationDelay: "0ms" }}
        >
          Coming soon · 2026
        </span>
      </div>

      {/* Hero */}
      <main className="flex w-full max-w-xl flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <h1
            className="fade-up font-display font-light leading-[1.05] tracking-[-0.02em]"
            style={{
              fontSize: "clamp(52px, 8vw, 80px)",
              color: "var(--ink)",
              animationDelay: "100ms",
            }}
          >
            Reach for the peaq.<br />
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Your body, measured.</em>
          </h1>
          <p
            className="fade-up max-w-sm font-body text-sm leading-relaxed tracking-wide"
            style={{ color: "var(--ink-60)", animationDelay: "250ms" }}
          >
            Sleep&nbsp;&middot;&nbsp;Blood&nbsp;&middot;&nbsp;Oral microbiome&nbsp;&mdash; one score, updated nightly.
          </p>
        </div>

        <div className="fade-up w-full" style={{ animationDelay: "400ms" }}>
          <WaitlistForm />
        </div>

        <p
          className="fade-up font-body text-[10px] tracking-widest uppercase"
          style={{ color: "var(--ink-30)", animationDelay: "550ms" }}
        >
          For informational purposes only
        </p>
      </main>

      {/* Panel pills */}
      <footer
        className="fade-up flex w-full max-w-3xl items-center justify-center gap-4 pt-10"
        style={{ animationDelay: "550ms" }}
      >
        {panels.map((p) => (
          <span
            key={p.label}
            className="inline-flex items-center gap-2 px-4 py-2 font-body text-xs uppercase tracking-[0.12em]"
            style={{
              border: "0.5px solid var(--ink-12)",
              background: "var(--warm-50)",
              color: "var(--ink-60)",
            }}
          >
            {p.label}
            <span className="font-display text-sm font-medium" style={{ color: "var(--gold)" }}>
              {p.pts}
              <span style={{ color: "var(--ink-30)" }}>pts</span>
            </span>
          </span>
        ))}
      </footer>
    </div>
  );
}

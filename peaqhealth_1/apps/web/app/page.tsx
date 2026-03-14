import Image from "next/image";
import { WaitlistForm } from "./waitlist-form";

const panels = [
  { label: "Sleep", pts: 28 },
  { label: "Blood", pts: 28 },
  { label: "Oral", pts: 25 },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-between bg-off-white px-6 py-10 selection:bg-gold selection:text-white">
      {/* ── Logo ── */}
      <div className="fixed top-0 left-0 z-50 p-6">
        <Image
          src="/peaq.png"
          alt="Peaq"
          width={80}
          height={28}
          style={{ filter: 'brightness(0)' }}
        />
      </div>

      {/* ── Hero ── */}
      <main className="flex w-full max-w-xl flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <h1 className="font-display text-5xl font-light leading-[1.1] tracking-tight text-ink sm:text-6xl md:text-7xl">
            Your body, measured.
          </h1>
          <p className="max-w-sm font-body text-base leading-relaxed tracking-wide text-ink/55">
            Sleep&nbsp;&middot;&nbsp;Blood&nbsp;&middot;&nbsp;Oral
            microbiome&nbsp;&mdash; one score, updated nightly.
          </p>
        </div>

        <WaitlistForm />

        <p className="font-body text-xs tracking-widest text-ink/30 uppercase">
          Launching 2026&ensp;&middot;&ensp;For informational purposes only
        </p>
      </main>

      {/* ── Panel pills ── */}
      <footer className="flex w-full max-w-3xl items-center justify-center gap-4 pt-10">
        {panels.map((p) => (
          <span
            key={p.label}
            className="inline-flex items-center gap-2 border border-ink/10 px-4 py-2
                       font-body text-xs uppercase tracking-[0.12em] text-ink/50"
          >
            {p.label}
            <span className="font-display text-sm font-medium text-gold">
              {p.pts}
              <span className="text-ink/25">pts</span>
            </span>
          </span>
        ))}
      </footer>
    </div>
  );
}

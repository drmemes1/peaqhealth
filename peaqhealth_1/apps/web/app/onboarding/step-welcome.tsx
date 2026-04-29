"use client";

interface Props {
  onNext: () => void;
}

export function StepWelcome({ onNext }: Props) {
  return (
    <div className="flex flex-col items-center gap-10 text-center">
      <div className="flex flex-col items-center gap-5">
        <h1 className="font-display text-5xl font-light leading-[1.1] tracking-tight text-ink sm:text-6xl">
          Reach for the peaq.
        </h1>
        <p className="max-w-sm font-body text-base leading-relaxed text-ink/50">
          We&apos;ll connect your wearable, upload blood labs, and sequence your
          oral microbiome — then combine everything into your biological age.
        </p>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 64, fontWeight: 300, color: "var(--ink)", lineHeight: 1, opacity: 0.15 }}>
          Oravi Age
        </span>
      </div>

      <button
        onClick={onNext}
        className="h-12 w-full max-w-xs bg-ink font-body text-sm font-medium uppercase
                   tracking-[0.15em] text-off-white transition-colors hover:bg-gold"
      >
        Get started
      </button>
    </div>
  );
}

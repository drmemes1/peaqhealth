"use client";

import { useState } from "react";
import { Nav } from "../components/nav";
import { createClient } from "@/lib/supabase/client";

// ── Products ──────────────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    id: "oral-kit",
    name: "Oral Microbiome Kit",
    price: "$179",
    category: "Oral Health",
    badge: "FEATURED",
    icon: "◎",
    shortDesc:
      "DNA sequencing profiles your oral microbiome across bacterial diversity, gum health bacteria, and heart-healthy bacteria. Unlocks the OMA panel. Results in 10–14 days.",
    scoreImpact: "Unlocks OMA",
    scoreColor: "var(--oral-c)",
    ship: "Ships in 2–3 days · Results in 10–14 days",
  },
  {
    id: "longevity-supplements",
    name: "Longevity Supplements",
    price: "$49/mo",
    category: "Supplements",
    icon: "⊕",
    shortDesc:
      "Evidence-based supplement stack for cellular health, NAD+ support, inflammation control, and metabolic resilience. Subscription, cancel anytime.",
    scoreImpact: "+Lifestyle score",
    scoreColor: "var(--gold)",
  },
  {
    id: "mouth-tape",
    name: "Mouth Tape",
    price: "$24",
    category: "Sleep",
    icon: "◻",
    shortDesc:
      "Promotes nasal breathing during sleep. Reduces snoring, morning oral dryness, and supports SpO2 stability. 30 strips. Not for nasal congestion or sleep apnea.",
    scoreImpact: "+Sleep score",
    scoreColor: "var(--sleep-c)",
    ship: "Ships in 2–3 days",
    pairsWell: "Nose Tape",
  },
  {
    id: "sleep-mask",
    name: "Sleep Mask",
    price: "$44",
    category: "Sleep",
    icon: "◑",
    shortDesc:
      "100% blackout contoured mask. Silk exterior, foam-padded interior. Complete darkness reduces cortisol and improves sleep onset latency. Handwash cold.",
    scoreImpact: "+Sleep score",
    scoreColor: "var(--sleep-c)",
    ship: "Ships in 2–3 days",
  },
  {
    id: "nose-tape",
    name: "Nose Tape",
    price: "$18",
    category: "Sleep",
    icon: "∿",
    shortDesc:
      "Increases nasal airflow by 31% (Thorax 1996). Reduces mouth breathing and SpO2 dips during sleep. Clinical-grade adhesive, gentle removal. 30 strips per pack.",
    scoreImpact: "+Sleep score",
    scoreColor: "var(--sleep-c)",
    ship: "Ships in 2–3 days",
    pairsWell: "Mouth Tape",
  },
  {
    id: "tongue-scraper",
    name: "Tongue Scraper",
    price: "$22",
    category: "Oral Health",
    icon: "—",
    shortDesc:
      "Surgical-grade stainless steel. Reduces oral bacterial load by up to 75% (J Periodontol 2004). Use before brushing to remove VSCs and reduce pathogen burden.",
    scoreImpact: "+Oral score",
    scoreColor: "var(--oral-c)",
    ship: "Ships in 2–3 days",
  },
  {
    id: "blood-panel",
    name: "Blood Panel Add-on",
    price: "$129",
    category: "Blood",
    icon: "◈",
    shortDesc:
      "Expanded biomarker panel covering lipids, inflammation, hormones, and metabolic markers. Unlocks blood panel and longevity insights. At-home or clinic draw.",
    scoreImpact: "Unlocks PhenoAge",
    scoreColor: "var(--blood-c)",
    ship: "At-home kit or clinic draw",
  },
] as const;

type Product = typeof PRODUCTS[number];

const CATEGORIES = ["All", "Sleep", "Oral Health", "Blood", "Supplements"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Sleep: "var(--sleep-c)",
  "Oral Health": "var(--oral-c)",
  Blood: "var(--blood-c)",
  Supplements: "var(--gold)",
};

// ── Notify Me Form (per product) ──────────────────────────────────────────────

function NotifyForm({ productId, source }: { productId: string; source: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = createClient();
    await sb
      .from("waitlist")
      .upsert({ email, source }, { onConflict: "email" });
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <p className="font-display text-sm italic" style={{ color: "var(--gold)" }}>
        We&apos;ll notify you.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-body text-[10px] uppercase tracking-[0.08em] px-4 py-2.5 transition-opacity hover:opacity-80"
        style={{ background: "var(--ink)", color: "var(--white)" }}
      >
        Notify me
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-9 border px-3 font-body text-xs outline-none transition-colors"
        style={{ borderColor: "var(--ink-30)", color: "var(--ink)", background: "var(--white)" }}
        onFocus={e => (e.target.style.borderColor = "var(--ink)")}
        onBlur={e => (e.target.style.borderColor = "var(--ink-30)")}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 h-9 font-body text-[10px] uppercase tracking-[0.08em] transition-opacity disabled:opacity-50 hover:opacity-80"
          style={{ background: "var(--ink)", color: "var(--white)" }}
        >
          {loading ? "Saving…" : "Notify me"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 px-3 font-body text-[10px] uppercase tracking-[0.08em] border transition-colors hover:border-ink"
          style={{ borderColor: "var(--ink-12)", color: "var(--ink-30)" }}
        >
          ✕
        </button>
      </div>
    </form>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const catColor = CATEGORY_COLORS[product.category] ?? "var(--ink-60)";

  return (
    <div
      className="flex flex-col transition-colors duration-150"
      style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, background: "var(--white)" }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "var(--ink-30)")}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "var(--ink-12)")}
    >
      {/* Image placeholder */}
      <div
        className="flex items-center justify-center h-36 text-4xl"
        style={{ background: "var(--warm-50)", borderBottom: "0.5px solid var(--ink-06)" }}
      >
        <span style={{ color: catColor, opacity: 0.45, fontFamily: "monospace", fontSize: 40 }}>
          {product.icon}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2.5 p-5 flex-1">
        {/* Category + badge */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-body text-[9px] uppercase tracking-[0.1em] px-2 py-0.5"
            style={{ background: catColor + "18", color: catColor }}
          >
            {product.category}
          </span>
          {"badge" in product && product.badge && (
            <span
              className="font-body text-[9px] uppercase tracking-[0.1em] px-2 py-0.5"
              style={{ color: "var(--gold)", border: "0.5px solid var(--gold)" }}
            >
              {product.badge}
            </span>
          )}
        </div>

        <h3 className="font-display text-xl font-light leading-tight" style={{ color: "var(--ink)" }}>
          {product.name}
        </h3>

        <p className="font-body text-xs leading-relaxed flex-1" style={{ color: "var(--ink-60)" }}>
          {product.shortDesc}
        </p>

        {"pairsWell" in product && product.pairsWell && (
          <p className="font-body text-[10px]" style={{ color: "var(--ink-30)" }}>
            Pairs well with{" "}
            <span style={{ color: "var(--gold)" }}>{product.pairsWell}</span>
          </p>
        )}

        {product.scoreImpact && (
          <span
            className="self-start font-body text-[9px] uppercase tracking-[0.08em] px-2 py-0.5"
            style={{ background: product.scoreColor + "18", color: product.scoreColor }}
          >
            {product.scoreImpact}
          </span>
        )}

        {/* Price + CTA */}
        <div
          className="flex items-end justify-between mt-1 pt-3 gap-3"
          style={{ borderTop: "0.5px solid var(--ink-06)" }}
        >
          <div>
            <span className="font-display text-2xl font-light" style={{ color: "var(--ink)" }}>
              {product.price}
            </span>
            {"ship" in product && product.ship && (
              <p className="font-body text-[9px] mt-0.5" style={{ color: "var(--ink-30)" }}>
                {product.ship}
              </p>
            )}
          </div>
          <NotifyForm productId={product.id} source={`shop-${product.id}`} />
        </div>
      </div>
    </div>
  );
}

// ── Starter Kit Bundle ────────────────────────────────────────────────────────

function StarterKitBundle() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = createClient();
    await sb
      .from("waitlist")
      .upsert({ email, source: "shop-starter-kit" }, { onConflict: "email" });
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <section
      className="mx-auto max-w-[1200px] px-6 pb-20"
    >
      <div
        className="relative overflow-hidden p-10 md:p-14"
        style={{
          background: "var(--ink)",
          borderRadius: 4,
        }}
      >
        {/* Decorative accent */}
        <div
          className="absolute top-0 left-0 h-0.5 w-32"
          style={{ background: "var(--gold)" }}
        />

        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Left: copy */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span
                className="font-body text-[9px] uppercase tracking-[0.12em] px-2 py-0.5"
                style={{ color: "var(--gold)", border: "0.5px solid var(--gold)" }}
              >
                Bundle
              </span>
              <span
                className="font-body text-[9px] uppercase tracking-[0.12em] px-2 py-0.5"
                style={{ background: "rgba(250,250,248,0.08)", color: "rgba(250,250,248,0.5)" }}
              >
                Best value
              </span>
            </div>

            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight" style={{ color: "var(--off-white)" }}>
              Cnvrg Starter Kit
            </h2>

            <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(250,250,248,0.55)" }}>
              Everything you need to begin measuring what matters. Oral Microbiome Kit, Tongue Scraper,
              Mouth Tape, Nose Tape, and Sleep Mask, curated for your first 30 days.
            </p>

            {/* Included items */}
            <ul className="flex flex-col gap-1.5 mt-1">
              {[
                { label: "Oral Microbiome Kit", val: "$179" },
                { label: "Tongue Scraper", val: "$22" },
                { label: "Mouth Tape", val: "$24" },
                { label: "Nose Tape", val: "$18" },
                { label: "Sleep Mask", val: "$44" },
              ].map(item => (
                <li key={item.label} className="flex items-center justify-between">
                  <span className="font-body text-xs" style={{ color: "rgba(250,250,248,0.55)" }}>
                    {item.label}
                  </span>
                  <span className="font-body text-xs" style={{ color: "rgba(250,250,248,0.3)" }}>
                    {item.val}
                  </span>
                </li>
              ))}
              <li
                className="flex items-center justify-between pt-2 mt-1"
                style={{ borderTop: "0.5px solid rgba(250,250,248,0.1)" }}
              >
                <span className="font-body text-xs uppercase tracking-widest" style={{ color: "rgba(250,250,248,0.3)" }}>
                  Retail total
                </span>
                <span className="font-body text-xs line-through" style={{ color: "rgba(250,250,248,0.25)" }}>
                  $287
                </span>
              </li>
            </ul>
          </div>

          {/* Right: price + CTA */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="font-body text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: "rgba(250,250,248,0.4)" }}>
                Bundle price
              </p>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-6xl font-light" style={{ color: "var(--off-white)" }}>
                  $239
                </span>
                <span className="font-body text-sm" style={{ color: "var(--gold)" }}>
                  Save $48
                </span>
              </div>
            </div>

            {!submitted ? (
              !open ? (
                <button
                  onClick={() => setOpen(true)}
                  className="h-12 max-w-xs font-body text-xs uppercase tracking-[0.1em] transition-opacity hover:opacity-85"
                  style={{ background: "var(--gold)", color: "var(--ink)" }}
                >
                  Notify me when ready →
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-xs">
                  <p className="font-body text-xs leading-relaxed" style={{ color: "rgba(250,250,248,0.45)" }}>
                    Enter your email and we&apos;ll notify you the moment this bundle is available.
                  </p>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-10 border px-3 font-body text-sm outline-none transition-colors"
                    style={{
                      borderColor: "rgba(250,250,248,0.2)",
                      background: "rgba(250,250,248,0.06)",
                      color: "var(--off-white)",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(250,250,248,0.2)")}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-10 font-body text-xs uppercase tracking-[0.1em] transition-opacity disabled:opacity-50 hover:opacity-85"
                      style={{ background: "var(--gold)", color: "var(--ink)" }}
                    >
                      {loading ? "Saving…" : "Notify me"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="h-10 px-3 font-body text-xs border transition-colors"
                      style={{ borderColor: "rgba(250,250,248,0.15)", color: "rgba(250,250,248,0.3)" }}
                    >
                      ✕
                    </button>
                  </div>
                </form>
              )
            ) : (
              <p className="font-display text-xl italic" style={{ color: "var(--gold)" }}>
                You&apos;re on the list. We&apos;ll be in touch.
              </p>
            )}

            <p className="font-body text-[10px]" style={{ color: "rgba(250,250,248,0.2)" }}>
              No checkout yet · Email capture only · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main Shop Page ────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [category, setCategory] = useState<string>("All");

  const filtered =
    category === "All"
      ? PRODUCTS
      : PRODUCTS.filter(p => p.category === category);

  return (
    <div className="min-h-svh" style={{ background: "var(--off-white)" }}>
      <Nav />

      {/* Page header */}
      <div className="mx-auto max-w-[1200px] px-6 pt-12 pb-10">
        <span
          className="font-body text-[10px] uppercase tracking-[0.15em] fade-up"
          style={{ color: "var(--gold)", animationDelay: "0ms" }}
        >
          The Cnvrg Edit
        </span>
        <h1
          className="font-display text-[44px] font-light leading-[1.1] mt-1 fade-up"
          style={{ color: "var(--ink)", animationDelay: "80ms" }}
        >
          Evidence-based tools.
        </h1>
        <p
          className="font-body text-sm mt-2 fade-up"
          style={{ color: "var(--ink-60)", animationDelay: "160ms" }}
        >
          Every product is selected for its measurable impact on your health panels.
          All CTAs capture email. Checkout coming soon.
        </p>
        <div
          className="h-px mt-6 fade-up"
          style={{ background: "var(--ink-12)", animationDelay: "220ms" }}
        />
      </div>

      {/* Sidebar + grid layout */}
      <div className="mx-auto max-w-[1200px] px-6 pb-16">
        <div className="flex gap-10 items-start">

          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col gap-1 w-44 shrink-0 sticky top-20">
            <p
              className="font-body text-[9px] uppercase tracking-[0.12em] mb-2"
              style={{ color: "var(--ink-30)" }}
            >
              Category
            </p>
            {CATEGORIES.map(cat => {
              const active = category === cat;
              const color = CATEGORY_COLORS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="flex items-center gap-2.5 text-left px-0 py-1.5 font-body text-xs transition-colors"
                  style={{ color: active ? "var(--ink)" : "var(--ink-30)" }}
                >
                  {color && (
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0 transition-opacity"
                      style={{
                        background: color,
                        opacity: active ? 1 : 0.35,
                      }}
                    />
                  )}
                  {!color && (
                    <span className="h-1.5 w-1.5 shrink-0" />
                  )}
                  {cat}
                  {active && (
                    <span
                      className="ml-auto font-body text-[9px]"
                      style={{ color: "var(--ink-30)" }}
                    >
                      {filtered.length}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Mobile-style divider */}
            <div className="mt-4 h-px" style={{ background: "var(--ink-06)" }} />

            <p
              className="font-body text-[9px] leading-relaxed mt-4"
              style={{ color: "var(--ink-30)" }}
            >
              No checkout yet.
              <br />
              All CTAs capture
              <br />
              email only.
            </p>
          </aside>

          {/* Mobile category pills */}
          <div className="lg:hidden flex gap-2 flex-wrap mb-6 w-full">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="font-body text-[10px] uppercase tracking-[0.08em] px-4 py-2 transition-colors duration-150"
                style={{
                  background: category === cat ? "var(--ink)" : "var(--warm-50)",
                  color: category === cat ? "var(--white)" : "var(--ink-60)",
                  border:
                    category === cat
                      ? "0.5px solid var(--ink)"
                      : "0.5px solid var(--ink-12)",
                  borderRadius: 2,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="font-body text-sm py-12" style={{ color: "var(--ink-30)" }}>
                No products in this category yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Starter Kit Bundle */}
      <StarterKitBundle />
    </div>
  );
}

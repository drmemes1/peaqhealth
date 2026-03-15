"use client";

import { useState, useEffect, useRef } from "react";
import { Nav } from "../components/nav";
import { CartPanel, type CartItem, type CartProduct } from "../components/cart";

// ── Products ──────────────────────────────────────────────────────────────────

const PRODUCTS: (CartProduct & {
  badge?: string;
  badgeColor?: string;
  description: string;
  shortDesc: string;
  ship?: string;
  scoreImpact?: string;
  scoreColor?: string;
  pairsWell?: string;
  icon: string;
})[] = [
  {
    id: "oral-kit",
    name: "Peaq Oral Microbiome Kit",
    price: 129,
    category: "Oral Health",
    badge: "FEATURED",
    badgeColor: "var(--gold)",
    icon: "◎",
    shortDesc: "16S sequencing via Zymo Research. Unlocks 25 pts + 4 cross-panel interactions.",
    description: "The flagship Peaq test. Using 16S rRNA sequencing via Zymo Research, this kit profiles your oral microbiome across Shannon diversity, nitrate-reducing bacteria, periodontal pathogens, and OSA-associated taxa. Results in 10–14 days.",
    ship: "Ships in 2–3 days · Results in 10–14 days",
    scoreImpact: "+25 pts",
    scoreColor: "var(--oral-c)",
  },
  {
    id: "tongue-scraper",
    name: "Tongue Scraper",
    price: 18,
    category: "Oral Health",
    icon: "—",
    shortDesc: "Surgical-grade stainless steel. Reduces oral bacterial load by up to 75%.",
    description: "Surgical-grade stainless steel tongue scraper. Reduces oral bacterial load by up to 75% (J Periodontol 2004). Simple. Effective. Use before brushing to remove volatile sulfur compounds and reduce pathogen burden.",
    ship: "Ships in 2–3 days",
    scoreImpact: "+Oral score",
    scoreColor: "var(--oral-c)",
  },
  {
    id: "nasal-strips",
    name: "Nasal Strips",
    price: 24,
    category: "Sleep",
    icon: "∿",
    shortDesc: "Increases nasal airflow by 31%. Reduces mouth breathing and SpO2 dips.",
    description: "Increases nasal airflow by 31% (Thorax 1996). Reduces mouth breathing and SpO2 dips during sleep. Clinical-grade adhesive, gentle removal. 30 strips per pack.",
    ship: "Ships in 2–3 days",
    pairsWell: "Mouth Tape",
    scoreImpact: "+Sleep score",
    scoreColor: "var(--sleep-c)",
  },
  {
    id: "mouth-tape",
    name: "Mouth Tape",
    price: 22,
    category: "Sleep",
    icon: "◻",
    shortDesc: "Promotes nasal breathing. Reduces snoring and oral dryness.",
    description: "Promotes nasal breathing during sleep. Reduces snoring, morning oral dryness, and supports SpO2 stability. 30 strips. Note: Not recommended if you have nasal congestion or sleep apnea.",
    ship: "Ships in 2–3 days",
    pairsWell: "Nasal Strips",
    scoreImpact: "+Sleep score",
    scoreColor: "var(--sleep-c)",
  },
  {
    id: "sleep-mask",
    name: "Sleep Mask",
    price: 48,
    category: "Sleep",
    icon: "◑",
    shortDesc: "100% blackout. Silk exterior, foam-padded. Reduces cortisol, improves onset.",
    description: "100% blackout contoured sleep mask. Silk exterior, foam-padded interior to avoid pressure on eyes. Complete darkness reduces cortisol and improves sleep onset latency. Handwash cold.",
    ship: "Ships in 2–3 days",
    scoreImpact: "+Sleep score",
    scoreColor: "var(--sleep-c)",
  },
  {
    id: "xylitol-mints",
    name: "Xylitol Mints",
    price: 16,
    category: "Oral Health",
    icon: "○",
    shortDesc: "Inhibits S. mutans. Reduces cariogenic bacteria. ADA accepted. 100 pack.",
    description: "Xylitol inhibits Streptococcus mutans and reduces cariogenic bacterial counts. Use after meals when brushing isn't possible. ADA accepted. 100 mints per pack, approximately 1g xylitol each.",
    ship: "Ships in 2–3 days",
    scoreImpact: "+Oral score",
    scoreColor: "var(--oral-c)",
  },
  {
    id: "water-flosser",
    name: "Water Flosser",
    price: 64,
    category: "Oral Health",
    icon: "⌇",
    shortDesc: "Removes subgingival biofilm. More effective than string floss for gum health.",
    description: "Reduces periodontal pathogen burden by removing subgingival biofilm. Clinically shown to be more effective than string floss for reducing gingival inflammation (J Clin Periodontol 2013). Compatible with all Peaq oral targets.",
    ship: "Ships in 3–5 days",
    scoreImpact: "+Oral score",
    scoreColor: "var(--oral-c)",
  },
  {
    id: "sleep-oral-bundle",
    name: "Sleep + Oral Bundle",
    price: 189,
    category: "Kits",
    badge: "BEST VALUE",
    badgeColor: "var(--ink)",
    icon: "⊞",
    shortDesc: "Oral Microbiome Kit + Mouth Tape + Nasal Strips + Tongue Scraper. Save $34.",
    description: "Everything you need to improve your Peaq oral and sleep scores. Includes: Oral Microbiome Kit ($129) + Mouth Tape ($22) + Nasal Strips ($24) + Tongue Scraper ($18). Save $34 vs buying separately.",
    ship: "Ships in 2–3 days",
    scoreImpact: "+53 pts",
    scoreColor: "var(--gold)",
  },
];

const CATEGORIES = ["All", "Sleep", "Oral Health", "Kits"];

const CATEGORY_COLORS: Record<string, string> = {
  Sleep: "var(--sleep-c)",
  "Oral Health": "var(--oral-c)",
  Kits: "var(--gold)",
};

// ── Scroll-reveal hook ────────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onAdd,
  onClick,
}: {
  product: typeof PRODUCTS[0];
  onAdd: () => void;
  onClick: () => void;
}) {
  const ref = useReveal();
  const catColor = CATEGORY_COLORS[product.category] ?? "var(--ink-60)";
  const isFeatured = product.id === "oral-kit";

  return (
    <div
      ref={ref}
      className="reveal-card flex flex-col bg-white cursor-pointer transition-all duration-150"
      style={{
        border: "0.5px solid var(--ink-12)",
        borderRadius: 4,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-30)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ink-12)"; }}
      onClick={onClick}
    >
      {/* Image placeholder */}
      <div
        className="flex items-center justify-center h-40 text-4xl"
        style={{ background: "var(--warm-50)", borderBottom: "0.5px solid var(--ink-06)" }}
      >
        <span style={{ color: catColor, opacity: 0.5, fontFamily: "monospace" }}>{product.icon}</span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        {/* Category + badge */}
        <div className="flex items-center justify-between">
          <span
            className="font-body text-[9px] uppercase tracking-[0.1em] px-2 py-0.5"
            style={{ background: catColor + "18", color: catColor }}
          >
            {product.category}
          </span>
          {product.badge && (
            <span
              className="font-body text-[9px] uppercase tracking-[0.1em] px-2 py-0.5"
              style={{ color: product.badgeColor, border: `0.5px solid ${product.badgeColor}` }}
            >
              {product.badge}
            </span>
          )}
        </div>

        <h3 className="font-display text-lg font-light leading-tight" style={{ color: "var(--ink)" }}>
          {product.name}
        </h3>

        <p className="font-body text-xs leading-relaxed flex-1" style={{ color: "var(--ink-60)" }}>
          {product.shortDesc}
        </p>

        {/* Score impact */}
        {product.scoreImpact && (
          <span
            className="self-start font-body text-[9px] uppercase tracking-[0.08em] px-2 py-0.5"
            style={{ background: product.scoreColor + "18", color: product.scoreColor }}
          >
            {product.scoreImpact}
          </span>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-2 pt-3" style={{ borderTop: "0.5px solid var(--ink-06)" }}>
          <span className="font-display text-xl font-light" style={{ color: "var(--ink)" }}>
            ${product.price}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onAdd(); }}
            className="font-body text-[10px] uppercase tracking-[0.08em] px-4 py-2 transition-opacity hover:opacity-80"
            style={{
              background: isFeatured ? "var(--oral-c)" : "var(--ink)",
              color: "white",
            }}
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Modal ─────────────────────────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: typeof PRODUCTS[0] | null;
  onClose: () => void;
  onAdd: (p: CartProduct) => void;
}) {
  if (!product) return null;
  const catColor = CATEGORY_COLORS[product.category] ?? "var(--ink-60)";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto bg-off-white p-8 flex flex-col gap-5"
        style={{ border: "0.5px solid var(--ink-12)", borderRadius: 4, maxHeight: "85vh", overflowY: "auto" }}
      >
        <div className="flex items-start justify-between">
          <span className="font-body text-[9px] uppercase tracking-[0.1em] px-2 py-0.5"
            style={{ background: catColor + "18", color: catColor }}>{product.category}</span>
          <button onClick={onClose} className="font-body text-xs uppercase tracking-widest" style={{ color: "var(--ink-30)" }}>Close</button>
        </div>

        <div className="flex items-center justify-center h-32 text-5xl" style={{ background: "var(--warm-50)" }}>
          <span style={{ color: catColor, opacity: 0.4, fontFamily: "monospace" }}>{product.icon}</span>
        </div>

        <div>
          <h2 className="font-display text-3xl font-light" style={{ color: "var(--ink)" }}>{product.name}</h2>
          <p className="mt-3 font-body text-sm leading-relaxed" style={{ color: "var(--ink-60)" }}>{product.description}</p>
        </div>

        {product.ship && (
          <p className="font-body text-xs" style={{ color: "var(--ink-30)" }}>{product.ship}</p>
        )}

        {product.pairsWell && (
          <p className="font-body text-xs" style={{ color: "var(--ink-60)" }}>
            Pairs well with: <span style={{ color: "var(--gold)" }}>{product.pairsWell}</span>
          </p>
        )}

        <div className="flex items-center justify-between pt-4" style={{ borderTop: "0.5px solid var(--ink-12)" }}>
          <span className="font-display text-2xl font-light" style={{ color: "var(--ink)" }}>${product.price}</span>
          <button
            onClick={() => { onAdd(product); onClose(); }}
            className="font-body text-[10px] uppercase tracking-[0.08em] px-6 py-3 transition-opacity hover:opacity-80"
            style={{ background: "var(--ink)", color: "white" }}
          >
            Add to cart
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Shop Page ────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [category, setCategory] = useState("All");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof PRODUCTS[0] | null>(null);

  const filtered = category === "All" ? PRODUCTS : PRODUCTS.filter(p => p.category === category);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  function addToCart(product: CartProduct) {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function updateQty(id: string, qty: number) {
    setCartItems(prev => prev.map(i => i.product.id === id ? { ...i, quantity: qty } : i));
  }

  function removeItem(id: string) {
    setCartItems(prev => prev.filter(i => i.product.id !== id));
  }

  return (
    <div className="min-h-svh bg-off-white">
      <Nav cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />

      {/* Page header */}
      <div className="mx-auto max-w-[1200px] px-6 pt-12 pb-8">
        <span className="font-body text-[10px] uppercase tracking-[0.15em] fade-up" style={{ color: "var(--gold)", animationDelay: "0ms" }}>
          The Peaq Edit
        </span>
        <h1 className="font-display text-[42px] font-light leading-[1.1] mt-1 fade-up" style={{ color: "var(--ink)", animationDelay: "80ms" }}>
          Evidence-based tools.
        </h1>
        <p className="font-body text-sm mt-2 fade-up" style={{ color: "var(--ink-60)", animationDelay: "160ms" }}>
          For sleep, oral health, and recovery.
        </p>
        <div className="h-px mt-6 fade-up" style={{ background: "var(--ink-12)", animationDelay: "220ms" }} />
      </div>

      {/* Category filters */}
      <div className="mx-auto max-w-[1200px] px-6 pb-8">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="font-body text-[10px] uppercase tracking-[0.08em] px-4 py-2 transition-all duration-150"
              style={{
                background: category === cat ? "var(--ink)" : "var(--warm-50)",
                color: category === cat ? "white" : "var(--ink-60)",
                border: category === cat ? "0.5px solid var(--ink)" : "0.5px solid var(--ink-12)",
                borderRadius: 2,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="mx-auto max-w-[1200px] px-6 pb-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onAdd={() => addToCart(p)}
              onClick={() => setSelectedProduct(p)}
            />
          ))}
        </div>
      </div>

      {/* Product modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={addToCart}
      />

      {/* Cart */}
      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQty={updateQty}
        onRemove={removeItem}
      />

      {/* Reveal animation styles */}
      <style>{`
        .reveal-card { opacity: 0; transform: translateY(14px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .reveal-card.visible { opacity: 1; transform: none; }
      `}</style>
    </div>
  );
}

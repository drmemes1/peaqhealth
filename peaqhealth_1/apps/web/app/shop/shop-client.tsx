"use client"

import { useState } from "react"
import { AuthLayout } from "../components/auth-layout"
import { createClient } from "@/lib/supabase/client"

// ── Font constants ───────────────────────────────────────────────────────────

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "-apple-system, BlinkMacSystemFont, sans-serif"

// ── Products ─────────────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    id: "oral-kit",
    name: "Oral Microbiome Kit",
    price: "$179",
    category: "Oral Health",
    badge: "FEATURED",
    icon: "◎",
    shortDesc:
      "16S rRNA sequencing profiles your oral microbiome across diversity, pathogens, and nitrate-reducing bacteria. Unlocks 27 pts. Results in 10–14 days.",
    scoreImpact: "+27 pts",
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
      "Expanded biomarker panel covering lipids, inflammation, hormones, and metabolic markers. Unlocks 33 pts and longevity insights. At-home or clinic draw.",
    scoreImpact: "+33 pts",
    scoreColor: "var(--blood-c)",
    ship: "At-home kit or clinic draw",
  },
] as const

type Product = (typeof PRODUCTS)[number]

const CATEGORIES = ["All", "Sleep", "Oral Health", "Blood", "Supplements"] as const

const CATEGORY_COLORS: Record<string, string> = {
  Sleep: "var(--sleep-c)",
  "Oral Health": "var(--oral-c)",
  Blood: "var(--blood-c)",
  Supplements: "var(--gold)",
}

// ── Notify Me Form (per product) ─────────────────────────────────────────────

function NotifyForm({ productId, source }: { productId: string; source: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const sb = createClient()
    await sb
      .from("waitlist")
      .upsert({ email, source }, { onConflict: "email" })
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <p style={{ fontFamily: serif, fontSize: 13, fontStyle: "italic", color: "#C49A3C" }}>
        We&apos;ll notify you.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          fontFamily: sans,
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          background: "#C49A3C",
          color: "#fff",
          padding: "6px 13px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
        }}
      >
        Notify me
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{
          fontFamily: sans,
          fontSize: 12,
          height: 32,
          border: "0.5px solid rgba(0,0,0,0.12)",
          borderRadius: 6,
          padding: "0 10px",
          outline: "none",
          color: "#1a1a18",
          background: "#fff",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#1a1a18")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.12)")}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 1,
            fontFamily: sans,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            background: "#C49A3C",
            color: "#fff",
            padding: "6px 13px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Saving\u2026" : "Notify me"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            fontFamily: sans,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "6px 10px",
            borderRadius: 6,
            border: "0.5px solid rgba(0,0,0,0.06)",
            background: "transparent",
            color: "rgba(0,0,0,0.3)",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    </form>
  )
}

// ── Wearable Recommendation Card ─────────────────────────────────────────────

function WearableRecommendationCard() {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <span
        style={{
          fontFamily: sans,
          fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#C49A3C",
          border: "0.5px solid #C49A3C",
          background: "var(--off-white, #F6F4EF)",
          padding: "3px 8px",
          borderRadius: 4,
          display: "inline-block",
          marginBottom: 12,
        }}
      >
        Recommended for you
      </span>
      <h3 style={{ fontFamily: serif, fontSize: 18, color: "#1a1a18", margin: "0 0 8px" }}>
        Connect a Wearable
      </h3>
      <p style={{ fontFamily: sans, fontSize: 11, color: "#555", lineHeight: 1.6, margin: "0 0 16px" }}>
        Adding a wearable unlocks your Sleep panel — the third signal in your Peaq Resilience Index.
      </p>
      <p style={{ fontFamily: sans, fontSize: 9, color: "#bbb", margin: 0 }}>
        Apple Watch, Oura, Whoop, Garmin, and more supported
      </p>
    </div>
  )
}

// ── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const [hovered, setHovered] = useState(false)
  const catColor = CATEGORY_COLORS[product.category] ?? "var(--ink-60)"

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        border: "0.5px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
        padding: 20,
        transition: "transform 150ms ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* Category + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            fontFamily: sans,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            padding: "2px 8px",
            background: catColor + "18",
            color: catColor,
            borderRadius: 4,
          }}
        >
          {product.category}
        </span>
        {"badge" in product && product.badge && (
          <span
            style={{
              fontFamily: sans,
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              padding: "2px 8px",
              color: "#C49A3C",
              border: "0.5px solid #C49A3C",
              borderRadius: 4,
            }}
          >
            {product.badge}
          </span>
        )}
      </div>

      {/* Product name */}
      <h3 style={{ fontFamily: serif, fontSize: 18, color: "#1a1a18", margin: "0 0 8px", fontWeight: 400 }}>
        {product.name}
      </h3>

      {/* Description */}
      <p style={{ fontFamily: sans, fontSize: 11, color: "#555", lineHeight: 1.6, margin: "0 0 10px", flex: 1 }}>
        {product.shortDesc}
      </p>

      {"pairsWell" in product && product.pairsWell && (
        <p style={{ fontFamily: sans, fontSize: 10, color: "rgba(0,0,0,0.3)", margin: "0 0 8px" }}>
          Pairs well with{" "}
          <span style={{ color: "#C49A3C" }}>{product.pairsWell}</span>
        </p>
      )}

      {product.scoreImpact && (
        <span
          style={{
            alignSelf: "flex-start",
            fontFamily: sans,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "2px 8px",
            background: product.scoreColor + "18",
            color: product.scoreColor,
            borderRadius: 4,
            marginBottom: 10,
          }}
        >
          {product.scoreImpact}
        </span>
      )}

      {/* Price + CTA */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          marginTop: "auto",
          paddingTop: 12,
          borderTop: "0.5px solid rgba(0,0,0,0.06)",
        }}
      >
        <div>
          <span style={{ fontFamily: sans, fontSize: 13, color: "#1a1a18", fontWeight: 500 }}>
            {product.price}
          </span>
          {"ship" in product && product.ship && (
            <p style={{ fontFamily: sans, fontSize: 9, color: "rgba(0,0,0,0.3)", marginTop: 2 }}>
              {product.ship}
            </p>
          )}
        </div>
        <NotifyForm productId={product.id} source={`shop-${product.id}`} />
      </div>
    </div>
  )
}

// ── Starter Kit Bundle ───────────────────────────────────────────────────────

function StarterKitBundle() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const sb = createClient()
    await sb
      .from("waitlist")
      .upsert({ email, source: "shop-starter-kit" }, { onConflict: "email" })
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 60px" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "40px",
          background: "#1a1a18",
          borderRadius: 12,
        }}
      >
        {/* Decorative accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: 2,
            width: 128,
            background: "#C49A3C",
          }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
          {/* Left: copy */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontFamily: sans,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  padding: "2px 8px",
                  color: "#C49A3C",
                  border: "0.5px solid #C49A3C",
                  borderRadius: 4,
                }}
              >
                Bundle
              </span>
              <span
                style={{
                  fontFamily: sans,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  padding: "2px 8px",
                  background: "rgba(250,250,248,0.08)",
                  color: "rgba(250,250,248,0.5)",
                  borderRadius: 4,
                }}
              >
                Best value
              </span>
            </div>

            <h2 style={{ fontFamily: serif, fontSize: 40, fontWeight: 300, lineHeight: 1.1, color: "#fafaf8", margin: 0 }}>
              Peaq Starter Kit
            </h2>

            <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: "rgba(250,250,248,0.55)", margin: 0 }}>
              Everything you need to begin measuring what matters. Oral Microbiome Kit, Tongue Scraper,
              Mouth Tape, Nose Tape, and Sleep Mask — curated for your first 30 days.
            </p>

            {/* Included items */}
            <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Oral Microbiome Kit", val: "$179" },
                { label: "Tongue Scraper", val: "$22" },
                { label: "Mouth Tape", val: "$24" },
                { label: "Nose Tape", val: "$18" },
                { label: "Sleep Mask", val: "$44" },
              ].map((item) => (
                <li key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: sans, fontSize: 12, color: "rgba(250,250,248,0.55)" }}>
                    {item.label}
                  </span>
                  <span style={{ fontFamily: sans, fontSize: 12, color: "rgba(250,250,248,0.3)" }}>
                    {item.val}
                  </span>
                </li>
              ))}
              <li
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  marginTop: 4,
                  borderTop: "0.5px solid rgba(250,250,248,0.1)",
                }}
              >
                <span style={{ fontFamily: sans, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(250,250,248,0.3)" }}>
                  Retail total
                </span>
                <span style={{ fontFamily: sans, fontSize: 12, textDecoration: "line-through", color: "rgba(250,250,248,0.25)" }}>
                  $287
                </span>
              </li>
            </ul>
          </div>

          {/* Right: price + CTA */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <p style={{ fontFamily: sans, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4, color: "rgba(250,250,248,0.4)" }}>
                Bundle price
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontFamily: serif, fontSize: 56, fontWeight: 300, color: "#fafaf8" }}>
                  $239
                </span>
                <span style={{ fontFamily: sans, fontSize: 14, color: "#C49A3C" }}>
                  Save $48
                </span>
              </div>
            </div>

            {!submitted ? (
              !open ? (
                <button
                  onClick={() => setOpen(true)}
                  style={{
                    height: 48,
                    maxWidth: 280,
                    fontFamily: sans,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    background: "#C49A3C",
                    color: "#1a1a18",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Notify me when ready →
                </button>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 280 }}>
                  <p style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.6, color: "rgba(250,250,248,0.45)", margin: 0 }}>
                    Enter your email and we&apos;ll notify you the moment this bundle is available.
                  </p>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      fontFamily: sans,
                      fontSize: 14,
                      height: 40,
                      border: "0.5px solid rgba(250,250,248,0.2)",
                      borderRadius: 6,
                      padding: "0 12px",
                      outline: "none",
                      background: "rgba(250,250,248,0.06)",
                      color: "#fafaf8",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C49A3C")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(250,250,248,0.2)")}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        flex: 1,
                        height: 40,
                        fontFamily: sans,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        background: "#C49A3C",
                        color: "#1a1a18",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      {loading ? "Saving\u2026" : "Notify me"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      style={{
                        height: 40,
                        padding: "0 12px",
                        fontFamily: sans,
                        fontSize: 12,
                        border: "0.5px solid rgba(250,250,248,0.15)",
                        borderRadius: 6,
                        background: "transparent",
                        color: "rgba(250,250,248,0.3)",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </form>
              )
            ) : (
              <p style={{ fontFamily: serif, fontSize: 20, fontStyle: "italic", color: "#C49A3C", margin: 0 }}>
                You&apos;re on the list. We&apos;ll be in touch.
              </p>
            )}

            <p style={{ fontFamily: sans, fontSize: 10, color: "rgba(250,250,248,0.2)", margin: 0 }}>
              No checkout yet · Email capture only · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Main Shop Client ─────────────────────────────────────────────────────────

interface ShopClientProps {
  initials: string
  hasWearable: boolean
}

export function ShopClient({ initials, hasWearable }: ShopClientProps) {
  const [category, setCategory] = useState<string>("All")

  const filtered =
    category === "All"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === category)

  return (
    <AuthLayout pageId="shop" initials={initials}>
      <div style={{ padding: "32px 24px 0" }}>
        {/* Page header */}
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 24 }}>
          <span
            style={{
              fontFamily: sans,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "#C49A3C",
            }}
          >
            The Peaq Edit
          </span>
          <h1
            style={{
              fontFamily: serif,
              fontSize: 44,
              fontWeight: 300,
              lineHeight: 1.1,
              color: "#1a1a18",
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            Evidence-based tools.
          </h1>
          <p
            style={{
              fontFamily: sans,
              fontSize: 14,
              color: "#555",
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            Every product is selected for its measurable impact on your Peaq Resilience Index.
            All CTAs capture email — checkout coming soon.
          </p>
          <div
            style={{
              height: 1,
              background: "rgba(0,0,0,0.06)",
              marginTop: 20,
            }}
          />
        </div>

        {/* Category filter pills */}
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  fontFamily: sans,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "6px 14px",
                  borderRadius: 6,
                  border:
                    category === cat
                      ? "0.5px solid #1a1a18"
                      : "0.5px solid rgba(0,0,0,0.06)",
                  background: category === cat ? "#1a1a18" : "#fff",
                  color: category === cat ? "#fff" : "#555",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {!hasWearable && <WearableRecommendationCard />}
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p style={{ fontFamily: sans, fontSize: 14, color: "rgba(0,0,0,0.3)", padding: "48px 0" }}>
              No products in this category yet.
            </p>
          )}
        </div>

        {/* Starter Kit Bundle */}
        <StarterKitBundle />
      </div>
    </AuthLayout>
  )
}

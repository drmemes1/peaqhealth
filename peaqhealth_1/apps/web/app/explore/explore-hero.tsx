"use client"

import Link from "next/link"

const serif = "'Cormorant Garamond', Georgia, serif"
const sans = "'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif"

export function ExploreHero() {
  return (
    <>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "88px 0 48px" }}>
        <span style={{
          fontFamily: sans, fontSize: 11, letterSpacing: "2px",
          textTransform: "uppercase", color: "#9A7200",
          display: "block", marginBottom: 20,
        }}>
          CDC NHANES Study &middot; 9,660 Americans
        </span>
        <h1 style={{
          fontFamily: serif, fontSize: 52, fontWeight: 400,
          color: "#141410", lineHeight: 1.15,
          margin: "0 0 20px",
        }}>
          Your oral bacteria show up<br />in your <em style={{ fontStyle: "italic", color: "#9A7200" }}>blood.</em>
        </h1>
        <p style={{
          fontFamily: sans, fontSize: 15, color: "rgba(20,20,16,0.5)",
          lineHeight: 1.7, maxWidth: 540, margin: "0 auto",
        }}>
          The bacteria in your mouth track with markers in your bloodstream. A single diversity score does not. This library walks through what each organism does, what it has been associated with, and what&rsquo;s actually known about shifting it.
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 16, marginBottom: 64, maxWidth: 560, marginLeft: "auto", marginRight: "auto",
      }}>
        <div style={{
          background: "#fff", borderRadius: 10, padding: "28px 24px",
          border: "0.5px solid rgba(20,20,16,0.08)", textAlign: "center",
        }}>
          <div style={{ fontFamily: serif, fontSize: 48, fontWeight: 300, color: "#141410", lineHeight: 1, marginBottom: 8 }}>
            9,848
          </div>
          <div style={{ fontFamily: sans, fontSize: 12, color: "rgba(20,20,16,0.5)", lineHeight: 1.4 }}>
            People in the dataset
          </div>
        </div>
        <div style={{
          background: "#fff", borderRadius: 10, padding: "28px 24px",
          border: "0.5px solid rgba(20,20,16,0.08)", textAlign: "center",
        }}>
          <div style={{ fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.55)", lineHeight: 1.6, padding: "8px 0" }}>
            Specific bacteria showed signals across the dataset. Diversity score alone did not.
          </div>
        </div>
      </div>
    </>
  )
}

export function WhySpecificBacteria() {
  return (
    <div style={{ marginBottom: 56 }}>
      <h2 style={{
        fontFamily: serif, fontSize: 32, fontWeight: 400,
        color: "#141410", margin: "0 0 20px", lineHeight: 1.2,
      }}>
        Why specific bacteria, not a single score
      </h2>
      <div style={{ fontFamily: sans, fontSize: 15, color: "rgba(20,20,16,0.6)", lineHeight: 1.75, maxWidth: 620 }}>
        <p style={{ margin: "0 0 16px" }}>
          Most oral health products give you one number &mdash; a diversity score, a grade, a 0&ndash;100.
        </p>
        <p style={{ margin: "0 0 16px" }}>
          When the CDC&rsquo;s national dataset was tested against blood markers in nearly 10,000 Americans, the diversity score showed no significant connection. Specific bacteria did. Some are involved in how your body uses dietary nitrate. Some are <em>associated with</em> higher inflammation markers. Some have been recovered from arterial plaque in published studies.
        </p>
        <p style={{ margin: 0 }}>
          Your mouth is a community of dozens of organisms, and the balance is what shows up in the research. That&rsquo;s why this library is organized by organism, not by score.
        </p>
      </div>
    </div>
  )
}

export function HowToRead() {
  const pills: { color: string; bg: string; label: string; desc: string }[] = [
    { color: "#C0392B", bg: "rgba(192,57,43,0.08)", label: "Disease-associated", desc: "Research links higher levels with gum disease and systemic inflammation" },
    { color: "#2D6A4F", bg: "rgba(45,106,79,0.08)", label: "Health-associated", desc: "Research links higher levels with healthier markers" },
    { color: "#1A7A6A", bg: "rgba(26,122,106,0.08)", label: "Nitrate-reducing", desc: "Convert dietary nitrate into nitric oxide, a molecule your blood vessels use" },
    { color: "#9A7200", bg: "rgba(184,134,11,0.08)", label: "Cavity-associated", desc: "Research links these to tooth decay" },
    { color: "#6B6860", bg: "rgba(20,20,16,0.05)", label: "Context-dependent", desc: "The role shifts with the surrounding community" },
  ]

  return (
    <div style={{ marginBottom: 56 }}>
      <h2 style={{
        fontFamily: serif, fontSize: 32, fontWeight: 400,
        color: "#141410", margin: "0 0 20px", lineHeight: 1.2,
      }}>
        How to read this library
      </h2>
      <div style={{ fontFamily: sans, fontSize: 15, color: "rgba(20,20,16,0.6)", lineHeight: 1.75, maxWidth: 620 }}>
        <p style={{ margin: "0 0 16px" }}>
          Each bacterium has its own page. On it you&rsquo;ll find what the bacterium is, what population research has associated it with, what the literature suggests about shifting it, and what&rsquo;s still uncertain.
        </p>
        <p style={{ margin: "0 0 20px" }}>
          The categories below describe what the <em>research</em> says about each group. They are not statements about your individual results.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {pills.map(p => (
          <div key={p.label} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{
              fontFamily: sans, fontSize: 11, letterSpacing: "0.5px",
              textTransform: "uppercase", fontWeight: 600,
              background: p.bg, color: p.color,
              borderRadius: 4, padding: "4px 10px",
              whiteSpace: "nowrap", flexShrink: 0, marginTop: 2,
            }}>
              {p.label}
            </span>
            <span style={{ fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.55)", lineHeight: 1.5 }}>
              {p.desc}
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.5)", lineHeight: 1.7, maxWidth: 620 }}>
        A bacterium being in the &ldquo;disease-associated&rdquo; group does not mean any amount of it is bad. Most of these organisms are part of a healthy mouth at low levels. What the research focuses on is balance, and how persistent any imbalance is over time. Your oral panel and a medical professional can help you make sense of what you see in your own results.
      </p>
    </div>
  )
}

export function CardiovascularCallout() {
  return (
    <div style={{
      background: "#141410", borderRadius: 14, padding: "44px 40px",
      marginBottom: 56, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0, width: "50%", height: "100%",
        background: "radial-gradient(ellipse at 100% 50%, rgba(154,114,0,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <h3 style={{
          fontFamily: serif, fontSize: 26, fontWeight: 400,
          color: "#fff", margin: "0 0 20px", lineHeight: 1.3,
        }}>
          Why your mouth shows up in your bloodwork.
        </h3>

        <div style={{ fontFamily: sans, fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.75, maxWidth: 580 }}>
          <p style={{ margin: "0 0 16px" }}>
            Vegetables are associated with lower blood pressure partly because the bacteria on your tongue convert their nitrate into nitric oxide &mdash; a molecule your blood vessels use to stay flexible. Without the right bacteria, the conversion runs less efficiently.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            Bacteria from your gums enter your bloodstream briefly every time you eat or brush. Population research has linked persistent gum inflammation with higher inflammation markers in blood, and oral bacteria have been recovered from arterial plaque, brain tissue, and other distant sites in published studies.
          </p>
          <p style={{ margin: "0 0 20px" }}>
            Your mouth is the upstream signal. Your blood and sleep are downstream. This library is the connection between what&rsquo;s in your mouth and what shows up in your numbers.
          </p>
        </div>

        <p style={{
          fontFamily: sans, fontSize: 11, fontStyle: "italic",
          color: "rgba(255,255,255,0.3)", lineHeight: 1.6, margin: 0,
        }}>
          This information is for wellness purposes only and is not a medical assessment. Always consult a medical professional about any health concerns.
        </p>
      </div>
    </div>
  )
}

export function WhereYouSit({ userBacteria }: { userBacteria: { name: string; percentile: number | null }[] | null }) {
  if (!userBacteria) {
    return (
      <div style={{
        background: "rgba(154,114,0,0.04)", borderRadius: 14,
        padding: "44px 40px", marginBottom: 56, textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: serif, fontSize: 32, fontWeight: 400,
          color: "#141410", margin: "0 0 12px",
        }}>
          Where will you sit?
        </h2>
        <p style={{
          fontFamily: sans, fontSize: 15, color: "rgba(20,20,16,0.5)",
          lineHeight: 1.7, maxWidth: 480, margin: "0 auto 24px",
        }}>
          Order a kit, send it in, and you&rsquo;ll see where each of your bacteria sits in the CDC dataset of nearly 10,000 Americans &mdash; alongside what&rsquo;s known about that range.
        </p>
        <Link href="/shop" className="explore-cta" style={{
          fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
          textTransform: "uppercase", textDecoration: "none",
          color: "#9A7200", border: "1px solid #9A7200",
          borderRadius: 6, padding: "12px 28px",
          display: "inline-block",
          transition: "background 200ms ease, color 200ms ease",
        }}>
          Order a kit &rarr;
        </Link>
      </div>
    )
  }

  return (
    <div style={{
      background: "#141410", borderRadius: 14,
      padding: "44px 40px", marginBottom: 56,
    }}>
      <h2 style={{
        fontFamily: serif, fontSize: 28, fontWeight: 400,
        color: "#fff", margin: "0 0 8px",
      }}>
        Where you sit in the dataset
      </h2>
      <p style={{
        fontFamily: sans, fontSize: 13, color: "rgba(255,255,255,0.4)",
        margin: "0 0 28px",
      }}>
        Your bacteria, against the 9,848 Americans in the CDC dataset.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
        {userBacteria.map(b => (
          <div key={b.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: serif, fontSize: 16, fontStyle: "italic", color: "#fff" }}>
              {b.name}
            </span>
            {b.percentile != null ? (
              <span style={{
                fontFamily: sans, fontSize: 12, fontWeight: 500,
                color: "#9A7200",
              }}>
                {b.percentile}th percentile
              </span>
            ) : (
              <span style={{
                fontFamily: sans, fontSize: 11,
                color: "rgba(255,255,255,0.25)",
              }}>
                below detection
              </span>
            )}
          </div>
        ))}
      </div>

      <p style={{
        fontFamily: sans, fontSize: 12, color: "rgba(255,255,255,0.3)",
        margin: "0 0 24px",
      }}>
        Tap any bacterium to see what&rsquo;s known about that range.
      </p>

      <Link href="/dashboard/oral" className="ranking-cta" style={{
        fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
        textTransform: "uppercase", textDecoration: "none",
        color: "#9A7200", border: "1px solid rgba(154,114,0,0.4)",
        borderRadius: 6, padding: "10px 24px",
        display: "inline-block",
        transition: "background 200ms ease, color 200ms ease, border-color 200ms ease",
      }}>
        View my full oral panel &rarr;
      </Link>
    </div>
  )
}

export function ExploreMethodology() {
  return (
    <>
      <div style={{ marginBottom: 48 }}>
        <h2 style={{
          fontFamily: serif, fontSize: 32, fontWeight: 400,
          color: "#141410", margin: "0 0 28px",
        }}>
          How this library was built
        </h2>

        <div className="method-cols" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 32, marginBottom: 40,
        }}>
          {[
            { ord: "01", title: "The dataset", body: "The CDC\u2019s NHANES survey sequenced the mouth bacteria of 9,660 Americans between 2009 and 2012, using the same 16S rRNA technology your kit uses. It remains the largest nationally representative oral microbiome study in the U.S." },
            { ord: "02", title: "The analysis", body: "Oral microbiome data was linked to blood marker files for 9,848 participants, and correlations were tested between specific bacteria and markers across inflammation, lipids, blood sugar, and blood pressure." },
            { ord: "03", title: "The library", body: "For each bacterium with a meaningful signal in the data or a substantial body of research behind it, we synthesized the published literature into a page. Every claim is cited. The library is updated as new evidence appears." },
          ].map(c => (
            <div key={c.title} style={{ position: "relative" }}>
              <span style={{
                fontFamily: serif, fontSize: 48, fontWeight: 300,
                color: "rgba(20,20,16,0.05)",
                position: "absolute", top: -8, left: 0,
                lineHeight: 1, pointerEvents: "none",
              }}>
                {c.ord}
              </span>
              <div style={{
                fontFamily: sans, fontSize: 11, fontWeight: 600,
                color: "#141410", marginBottom: 8,
                letterSpacing: "0.3px",
                position: "relative", zIndex: 1, paddingTop: 4,
              }}>
                {c.title}
              </div>
              <p style={{
                fontFamily: sans, fontSize: 12,
                color: "rgba(20,20,16,0.45)", lineHeight: 1.65,
                margin: 0, position: "relative", zIndex: 1,
              }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>

        <div style={{
          borderTop: "1px solid rgba(20,20,16,0.06)",
          paddingTop: 28, marginBottom: 40,
        }}>
          <h3 style={{
            fontFamily: sans, fontSize: 14, fontWeight: 600,
            color: "#141410", margin: "0 0 12px",
          }}>
            Honest framing
          </h3>
          <p style={{
            fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.5)",
            lineHeight: 1.7, maxWidth: 600, margin: 0,
          }}>
            What you&rsquo;ll see in this library are associations from population research. They are not predictions about your individual future. Effect sizes in this kind of research are small (correlations in the 0.03&ndash;0.09 range are typical for population-level microbiome studies), and a high or low number for any single bacterium is one signal among many. A medical professional can help you understand what your results mean for you.
          </p>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{
        textAlign: "center", padding: "40px 0 88px",
        borderTop: "0.5px solid rgba(20,20,16,0.06)",
      }}>
        <h2 style={{
          fontFamily: serif, fontSize: 32, fontWeight: 400,
          color: "#141410", margin: "0 0 24px",
        }}>
          See where your bacteria sit.
        </h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/shop" className="explore-cta" style={{
            fontFamily: sans, fontSize: 11, letterSpacing: "1.5px",
            textTransform: "uppercase", textDecoration: "none",
            color: "#fff", background: "#9A7200", border: "1px solid #9A7200",
            borderRadius: 6, padding: "12px 28px",
            display: "inline-block",
            transition: "opacity 200ms ease",
          }}>
            Order a kit &rarr;
          </Link>
        </div>

        <p style={{
          fontFamily: sans, fontSize: 11,
          color: "rgba(20,20,16,0.3)", lineHeight: 1.6,
          marginTop: 32,
        }}>
          Analysis: Cnvrg Health &middot; Dataset: NHANES 2009&ndash;2012 &middot;
          Spearman rank correlations on log-transformed genus relative abundances
        </p>
      </div>
    </>
  )
}

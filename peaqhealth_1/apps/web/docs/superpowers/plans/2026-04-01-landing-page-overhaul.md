# Landing Page Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign oravi.com landing page to feature both app screenshots in a staggered hero, add a science pathway section, replace text-only insight quotes with a real product showcase, and add stat chips to the panel cards.

**Architecture:** All changes are in `app/page.tsx` (server component, inline styles) and `app/components/landing-panels-science.tsx` (client component, same style pattern). New CSS rules go in `app/globals.css`. No new files, no new components.

**Tech Stack:** Next.js 15 App Router, TypeScript, inline React CSS, Tailwind v4 (used minimally via class names like `fade-up`, `hero-mockup`).

---

## File Map

| File | What changes |
|------|-------------|
| `app/page.tsx` | Hero right column (staggered phones), new science hook section, new "Inside the app" section, remove "What Oravi reveals", upgrade "How it works" steps |
| `app/components/landing-panels-science.tsx` | Add `stat` field to panels array + render stat chip |
| `app/globals.css` | Phone mockup dark-mode blend override, mobile stack rule for app showcase grid |

---

### Task 1: Hero — replace single phone with staggered duo

**Files:**
- Modify: `app/page.tsx:165-191`

The right column currently has one `<img>`. Replace it with two absolutely-positioned images (Sleep panel behind, Insights in front). The container switches from `display: flex` + `alignItems: center` to `position: relative` only (children are absolute).

- [ ] **Step 1: Open `app/page.tsx` and locate the right column div (line 166)**

It starts with:
```tsx
{/* Right — phone mockup, fills column, bleeds top/bottom */}
<div className="fade-up hero-mockup" style={{
  position: "relative",
  height: "100vh",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  paddingTop: "80px",
  backgroundColor: "#FAFAF8",
  animationDelay: "400ms",
}}>
  <img
    src="/images/dashboard-preview.png"
    alt="Oravi dashboard"
    style={{
      height: "95%",
      width: "auto",
      maxWidth: "none",
      display: "block",
      marginRight: -20,
      filter: "drop-shadow(-8px 0 40px rgba(20,20,16,0.12))",
      imageRendering: "crisp-edges",
      mixBlendMode: "multiply",
    }}
  />
</div>
```

- [ ] **Step 2: Replace that entire block with the staggered duo**

```tsx
{/* Right — staggered duo phone mockups */}
<div className="fade-up hero-mockup" style={{
  position: "relative",
  height: "100vh",
  overflow: "hidden",
  backgroundColor: "#FAFAF8",
  animationDelay: "400ms",
}}>
  {/* Back phone — Sleep panel */}
  <img
    className="phone-mockup"
    src="/images/preview-sleep.png"
    alt="Oravi sleep panel"
    style={{
      position: "absolute",
      height: "78%",
      width: "auto",
      right: 100,
      top: "6%",
      zIndex: 1,
      opacity: 0.88,
      mixBlendMode: "multiply" as const,
      imageRendering: "crisp-edges" as const,
      filter: "drop-shadow(-4px 0 20px rgba(20,20,16,0.08))",
    }}
  />
  {/* Front phone — Insights */}
  <img
    className="phone-mockup"
    src="/images/dashboard-preview.png"
    alt="Oravi dashboard"
    style={{
      position: "absolute",
      height: "88%",
      width: "auto",
      right: -20,
      top: "5%",
      zIndex: 2,
      mixBlendMode: "multiply" as const,
      imageRendering: "crisp-edges" as const,
      filter: "drop-shadow(-8px 0 40px rgba(20,20,16,0.12))",
    }}
  />
</div>
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/igorkhabensky/peaq/peaqhealth_1/apps/web
npm run build
```

Expected: no TypeScript errors, build completes.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: hero staggered duo phones — Sleep panel behind, Insights in front"
```

---

### Task 2: Science hook section (new section between hero and panels)

**Files:**
- Modify: `app/page.tsx:195` (the `<hr />` between hero and `<LandingPanelsAndScience />`)

Insert a new `<section>` and a second `<hr />` so the order becomes: `<hr />` → science hook → `<hr />` → `<LandingPanelsAndScience />`.

- [ ] **Step 1: Locate the existing `<hr style={rule} />` at line ~195 in `app/page.tsx`**

It reads:
```tsx
      <hr style={rule} />

      {/* ══ SECTIONS 2 + 4 — Interactive panels + science (shared state) ═══ */}
      <LandingPanelsAndScience />
```

- [ ] **Step 2: Replace that block with hr + science hook + hr + panels**

```tsx
      <hr style={rule} />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — SCIENCE HOOK
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ ...wrap, paddingTop: 80, paddingBottom: 80 }}>
        <p style={eyebrow}>The pathway</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 64,
          alignItems: "center",
        }}>
          {/* Left — key stat */}
          <div>
            <p style={{
              fontFamily: serif,
              fontSize: "clamp(64px, 8vw, 96px)",
              fontWeight: 400,
              lineHeight: 1,
              color: GOLD,
              margin: "0 0 16px",
            }}>
              100%
            </p>
            <p style={{
              fontFamily: sans,
              fontSize: 16,
              lineHeight: 1.65,
              color: INK_60,
              maxWidth: 340,
              margin: "0 0 12px",
            }}>
              of coronary artery plaques studied contained{" "}
              <em>P. gingivalis</em> DNA — an oral bacterium.
            </p>
            <p style={{
              fontFamily: sans,
              fontSize: 11,
              fontStyle: "italic",
              color: INK_40,
              margin: 0,
            }}>
              — J. Am. Coll. Cardiol., 2023
            </p>
          </div>

          {/* Right — pathway SVG */}
          <div>
            <svg
              viewBox="0 0 470 80"
              style={{ width: "100%", maxWidth: 500, overflow: "visible" }}
              aria-label="Pathway: oral bacteria to cardiac tissue"
            >
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="rgba(20,20,16,0.2)" />
                </marker>
              </defs>
              {/* Connecting lines */}
              <line x1="83" y1="40" x2="143" y2="40" stroke="rgba(20,20,16,0.2)" strokeWidth="1.5" markerEnd="url(#arrow)" />
              <line x1="203" y1="40" x2="263" y2="40" stroke="rgba(20,20,16,0.2)" strokeWidth="1.5" markerEnd="url(#arrow)" />
              <line x1="323" y1="40" x2="383" y2="40" stroke="rgba(20,20,16,0.2)" strokeWidth="1.5" markerEnd="url(#arrow)" />
              {/* Node 1 — Oral */}
              <circle cx="55" cy="40" r="28" fill="#EAF3DE" />
              <text x="55" y="38" textAnchor="middle" fontSize="8" fontWeight="600" fill="#2D6A4F" fontFamily="Instrument Sans, system-ui, sans-serif">Oral</text>
              <text x="55" y="49" textAnchor="middle" fontSize="7" fill="#2D6A4F" fontFamily="Instrument Sans, system-ui, sans-serif">bacteria</text>
              {/* Node 2 — Bloodstream */}
              <circle cx="175" cy="40" r="28" fill="#FDECEA" />
              <text x="175" y="38" textAnchor="middle" fontSize="8" fontWeight="600" fill="#C0392B" fontFamily="Instrument Sans, system-ui, sans-serif">Blood-</text>
              <text x="175" y="49" textAnchor="middle" fontSize="7" fill="#C0392B" fontFamily="Instrument Sans, system-ui, sans-serif">stream</text>
              {/* Node 3 — Inflammation */}
              <circle cx="295" cy="40" r="28" fill="#FEF3C7" />
              <text x="295" y="38" textAnchor="middle" fontSize="8" fontWeight="600" fill="#B8860B" fontFamily="Instrument Sans, system-ui, sans-serif">Systemic</text>
              <text x="295" y="49" textAnchor="middle" fontSize="7" fill="#B8860B" fontFamily="Instrument Sans, system-ui, sans-serif">inflam.</text>
              {/* Node 4 — Cardiac */}
              <circle cx="415" cy="40" r="28" fill="rgba(20,20,16,0.06)" />
              <text x="415" y="38" textAnchor="middle" fontSize="8" fontWeight="600" fill="#141410" fontFamily="Instrument Sans, system-ui, sans-serif">Cardiac</text>
              <text x="415" y="49" textAnchor="middle" fontSize="7" fill="rgba(20,20,16,0.5)" fontFamily="Instrument Sans, system-ui, sans-serif">tissue</text>
            </svg>
            <p style={{
              fontFamily: sans,
              fontSize: 12,
              color: INK_40,
              marginTop: 20,
              lineHeight: 1.6,
            }}>
              The same species that cause gum disease cross into the
              bloodstream, trigger systemic inflammation, and have been
              found embedded in coronary artery plaque.
            </p>
          </div>
        </div>
      </section>

      <hr style={rule} />

      {/* ══ SECTIONS 3 + 5 — Interactive panels + science (shared state) ═══ */}
      <LandingPanelsAndScience />
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/igorkhabensky/peaq/peaqhealth_1/apps/web
npm run build
```

Expected: clean build. If you see "Unknown SVG attribute" warnings these are harmless in Next.js.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: science hook section — pathway SVG + 100% coronary stat"
```

---

### Task 3: Panel stat chips in three-panels section

**Files:**
- Modify: `app/components/landing-panels-science.tsx:40-44` (panels array)
- Modify: `app/components/landing-panels-science.tsx:101-108` (lines render loop)

- [ ] **Step 1: Update the `panels` array at line 40 in `landing-panels-science.tsx`**

Replace:
```ts
const panels = [
  { key: "oral",  label: "Oral Microbiome", color: ORAL,  lines: ["16S rRNA sequencing", "Species-level resolution"] },
  { key: "blood", label: "Blood",           color: BLOOD, lines: ["40+ biomarkers", "from any lab"] },
  { key: "sleep", label: "Sleep",           color: SLEEP, lines: ["Nightly wearable", "HRV, deep sleep, SpO\u2082"] },
] as const
```

With:
```ts
const panels = [
  { key: "oral",  label: "Oral Microbiome", color: ORAL,  lines: ["16S rRNA sequencing", "Species-level resolution"], stat: "100+ species tracked" },
  { key: "blood", label: "Blood",           color: BLOOD, lines: ["40+ biomarkers", "from any lab"],                  stat: "LabCorp · Quest · any lab" },
  { key: "sleep", label: "Sleep",           color: SLEEP, lines: ["Nightly wearable", "HRV, deep sleep, SpO\u2082"],  stat: "WHOOP · Oura · Apple Health" },
] as const
```

- [ ] **Step 2: Add stat chip rendering after the lines map (line ~108)**

The current lines map block:
```tsx
{p.lines.map(l => (
  <p key={l} style={{
    fontFamily: sans, fontSize: 15, color: INK_60,
    lineHeight: 1.7, margin: "2px 0",
  }}>
    {l}
  </p>
))}
```

Add the chip immediately after the closing `})}`:
```tsx
{p.lines.map(l => (
  <p key={l} style={{
    fontFamily: sans, fontSize: 15, color: INK_60,
    lineHeight: 1.7, margin: "2px 0",
  }}>
    {l}
  </p>
))}
<span style={{
  display: "inline-block",
  marginTop: 10,
  fontSize: 10,
  fontWeight: 500,
  fontFamily: sans,
  color: p.color,
  background: p.color + "18",
  padding: "3px 8px",
  borderRadius: 3,
  letterSpacing: "0.03em",
}}>
  {p.stat}
</span>
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/igorkhabensky/peaq/peaqhealth_1/apps/web
npm run build
```

Expected: clean build. TypeScript will infer the `stat` field from the `as const` array automatically.

- [ ] **Step 4: Commit**

```bash
git add app/components/landing-panels-science.tsx
git commit -m "feat: panel stat chips — LabCorp/Quest, WHOOP/Oura, species count"
```

---

### Task 4: "Inside the app" section — replace "What Oravi reveals"

**Files:**
- Modify: `app/page.tsx` — remove lines ~202–290 (the "What Oravi reveals" section), insert new section

The "What Oravi reveals" section starts at the comment:
```tsx
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — CROSS-PANEL INSIGHT
```
and ends at the closing `</section>` before the next `<hr style={rule} />`.

- [ ] **Step 1: Remove the entire "What Oravi reveals" section from `app/page.tsx`**

Delete from:
```tsx
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — CROSS-PANEL INSIGHT
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{ ...wrap, paddingTop: 96, paddingBottom: 96 }}>
        <p style={eyebrow}>What Oravi reveals</p>
        ...
      </section>
```

Up to and including the closing `</section>` tag and the blank line after it (but NOT the `<hr style={rule} />` that follows — keep that).

- [ ] **Step 2: Insert the "Inside the app" section in its place**

Paste this immediately where the removed section was (before the `<hr style={rule} />`):

```tsx
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — INSIDE THE APP
          ══════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: "var(--warm-50)",
        paddingTop: 96,
        paddingBottom: 96,
      }}>
        <div style={{ ...wrap }}>
          <p style={eyebrow}>Inside the app</p>
          <h2 style={{
            fontFamily: serif,
            fontSize: "clamp(24px, 2.5vw, 36px)",
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            margin: "0 0 56px",
            maxWidth: 480,
          }}>
            This is what you actually see.
          </h2>

          <div className="app-showcase-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "start",
          }}>
            {/* Left — Insights view */}
            <div>
              <img
                className="phone-mockup"
                src="/images/dashboard-preview.png"
                alt="Oravi Insights dashboard"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  height: "auto",
                  display: "block",
                  mixBlendMode: "multiply" as const,
                  imageRendering: "crisp-edges" as const,
                  filter: "drop-shadow(-6px 6px 32px rgba(20,20,16,0.12))",
                  marginBottom: 28,
                }}
              />
              <p style={{
                fontFamily: sans, fontSize: 10, fontWeight: 600,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: ORAL, margin: "0 0 8px",
              }}>
                AI Insights
              </p>
              <p style={{
                fontFamily: serif, fontSize: 20, fontWeight: 400,
                color: INK, margin: "0 0 12px", lineHeight: 1.3,
              }}>
                Cross-panel signals, updated daily
              </p>
              <p style={{
                fontFamily: sans, fontSize: 14, color: INK_60,
                lineHeight: 1.7, maxWidth: 340, margin: 0,
              }}>
                Oravi&apos;s AI reads across your oral, blood, and sleep data to
                surface connections no single panel can see. Every insight
                links to the underlying science.
              </p>
            </div>

            {/* Right — Sleep panel */}
            <div>
              <img
                className="phone-mockup"
                src="/images/preview-sleep.png"
                alt="Oravi sleep panel"
                style={{
                  width: "100%",
                  maxWidth: 320,
                  height: "auto",
                  display: "block",
                  mixBlendMode: "multiply" as const,
                  imageRendering: "crisp-edges" as const,
                  filter: "drop-shadow(-6px 6px 32px rgba(20,20,16,0.12))",
                  marginBottom: 28,
                }}
              />
              <p style={{
                fontFamily: sans, fontSize: 10, fontWeight: 600,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
                color: SLEEP, margin: "0 0 8px",
              }}>
                Sleep Panel
              </p>
              <p style={{
                fontFamily: serif, fontSize: 20, fontWeight: 400,
                color: INK, margin: "0 0 12px", lineHeight: 1.3,
              }}>
                Clinical thresholds, not just ranges
              </p>
              <p style={{
                fontFamily: sans, fontSize: 14, color: INK_60,
                lineHeight: 1.7, maxWidth: 340, margin: 0,
              }}>
                Deep sleep, HRV, SpO₂, REM — each metric measured against a
                clinical target, not a population average. When something needs
                attention, you&apos;ll know.
              </p>
            </div>
          </div>
        </div>
      </section>
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/igorkhabensky/peaq/peaqhealth_1/apps/web
npm run build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: inside-the-app section with both phone screenshots, remove text-quote section"
```

---

### Task 5: How it works — add oral kit image to step 1, gold pill to step 4

**Files:**
- Modify: `app/page.tsx` — the "How it works" section, steps array and render

- [ ] **Step 1: Find the steps array in `app/page.tsx`**

It looks like:
```tsx
{([
  { num: "1", title: "Order your kit",          text: "Oral microbiome swab \u2014 16S rRNA sequencing at species-level resolution. Results in 2\u20133 weeks." },
  { num: "2", title: "Upload your labs",        text: "LabCorp, Quest, or any standard bloodwork. 40+ biomarkers tracked." },
  { num: "3", title: "Connect your wearable",   text: "WHOOP or Oura. Syncs nightly. Apple Health coming soon." },
  { num: "4", title: "Get your Oravi score",     text: "A single number \u2014 recalculated as your data updates. With the cross-panel signals that change how you understand your health." },
] as const).map(s => (
```

- [ ] **Step 2: Add `img` and `pill` fields to the steps array**

Replace the steps array with:
```tsx
{([
  { num: "1", title: "Order your kit",        text: "Oral microbiome swab \u2014 16S rRNA sequencing at species-level resolution. Results in 2\u20133 weeks.", img: "/images/oralkit.png" as string | undefined, pill: undefined as string | undefined },
  { num: "2", title: "Upload your labs",      text: "LabCorp, Quest, or any standard bloodwork. 40+ biomarkers tracked.", img: undefined, pill: undefined },
  { num: "3", title: "Connect your wearable", text: "WHOOP or Oura. Syncs nightly. Apple Health coming soon.", img: undefined, pill: undefined },
  { num: "4", title: "Get your Oravi score",   text: "A single number \u2014 recalculated as your data updates. With the cross-panel signals that change how you understand your health.", img: undefined, pill: "Oravi score" as string | undefined },
]).map(s => (
```

- [ ] **Step 3: Update the step row render to use `img` and `pill`**

The current row render:
```tsx
<div key={s.num} style={{
  display: "flex", alignItems: "flex-start", gap: 32,
  padding: "32px 0",
  borderBottom: `0.5px solid ${INK_08}`,
}}>
  <span style={{
    fontFamily: serif, fontSize: 32, fontWeight: 400,
    color: "rgba(20,20,16,0.15)", lineHeight: 1,
    width: 32, flexShrink: 0, marginTop: 2,
  }}>
    {s.num}
  </span>
  <div>
    <p style={{
      fontFamily: sans, fontSize: 15, fontWeight: 500,
      color: INK, margin: "0 0 6px",
    }}>
      {s.title}
    </p>
    <p style={{
      fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.55)",
      lineHeight: 1.7, margin: 0,
    }}>
      {s.text}
    </p>
  </div>
</div>
```

Replace with:
```tsx
<div key={s.num} style={{
  display: "flex", alignItems: "flex-start", gap: 32,
  padding: "32px 0",
  borderBottom: `0.5px solid ${INK_08}`,
}}>
  <span style={{
    fontFamily: serif, fontSize: 32, fontWeight: 400,
    color: "rgba(20,20,16,0.15)", lineHeight: 1,
    width: 32, flexShrink: 0, marginTop: 2,
  }}>
    {s.num}
  </span>
  <div style={{ flex: 1 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
      <p style={{
        fontFamily: sans, fontSize: 15, fontWeight: 500,
        color: INK, margin: 0,
      }}>
        {s.title}
      </p>
      {s.pill && (
        <span style={{
          fontSize: 11, fontWeight: 500, fontFamily: sans,
          background: "rgba(154,114,0,0.10)", color: GOLD,
          padding: "3px 10px", borderRadius: 20,
        }}>
          {s.pill}
        </span>
      )}
    </div>
    <p style={{
      fontFamily: sans, fontSize: 14, color: "rgba(20,20,16,0.55)",
      lineHeight: 1.7, margin: 0,
    }}>
      {s.text}
    </p>
  </div>
  {s.img && (
    <img
      src={s.img}
      alt=""
      aria-hidden="true"
      style={{
        height: 64, width: "auto", opacity: 0.85,
        mixBlendMode: "multiply" as const, flexShrink: 0,
      }}
    />
  )}
</div>
```

- [ ] **Step 4: Verify build passes**

```bash
cd /Users/igorkhabensky/peaq/peaqhealth_1/apps/web
npm run build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: how-it-works — oral kit image on step 1, score pill on step 4"
```

---

### Task 6: Dark mode + mobile responsive CSS

**Files:**
- Modify: `app/globals.css` — append two new rule blocks

- [ ] **Step 1: Open `app/globals.css` and append at the end**

```css
/* Phone mockup images — dark mode: multiply blend darkens further, switch to normal */
[data-theme="dark"] .phone-mockup {
  mix-blend-mode: normal;
  opacity: 0.88;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .phone-mockup {
    mix-blend-mode: normal;
    opacity: 0.88;
  }
}

/* Inside-the-app showcase grid — stack on mobile */
@media (max-width: 768px) {
  .app-showcase-grid {
    grid-template-columns: 1fr !important;
    gap: 48px !important;
  }
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/igorkhabensky/peaq/peaqhealth_1/apps/web
npm run build
```

Expected: clean build.

- [ ] **Step 3: Visual smoke test**

```bash
cd /Users/igorkhabensky/peaq/peaqhealth_1/apps/web
npm run dev
```

Open http://localhost:3000. Check:
- Hero: two phones visible, Sleep panel behind/left, Insights in front/right, no white box around either phone
- Science hook: big "100%" in gold, SVG pathway with 4 nodes
- Three panels: stat chips visible under each panel description
- Inside the app: two phones side by side, large, with labels below
- How it works: oral kit image on step 1 row; "Oravi score" gold pill on step 4

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: dark mode phone blend fix, mobile stack for app showcase grid"
```

---

### Task 7: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
git push
```

Expected: all 6 commits pushed to `main`, Vercel auto-deploys.

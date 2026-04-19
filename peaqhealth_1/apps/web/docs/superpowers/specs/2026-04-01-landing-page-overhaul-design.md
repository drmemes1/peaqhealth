# Landing Page Overhaul Design

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this spec task-by-task.

**Goal:** Redesign peaqhealth.me landing page to better showcase the product through real app screenshots, establish the science hook before the product pitch, and remove section repetition.

**Approach:** Semi-overhaul — keep existing components and copy, replace two sections, add two new sections, upgrade hero and three-panels. All changes in `apps/web/app/page.tsx` and `apps/web/app/components/landing-panels-science.tsx`.

**Design tokens (do not change):** `#FAFAF8` cream bg, `#141410` ink, `#9A7200` gold, `#2D6A4F` oral green, `#C0392B` blood red, `#4A7FB5` sleep blue. Fonts: Cormorant Garamond (serif), Instrument Sans (sans).

---

## Section 1 — Hero (upgrade)

**Current:** 2-col grid, left copy + single phone (Insights view) on right.

**New:** Same 2-col grid. Right column gets **two phone screenshots** in a staggered composition:
- Sleep panel phone (`/images/preview-sleep.png`) — behind, offset left and up ~24px, `z-index: 1`, `opacity: 0.88`
- Insights phone (`/images/dashboard-preview.png`) — front/center, `z-index: 2`, full opacity

Both images use `mixBlendMode: "multiply"` and the right column has `backgroundColor: "#FAFAF8"` so the white phone backgrounds disappear into the page.

**Right column container styles:**
```tsx
{
  position: "relative",
  height: "100vh",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  paddingTop: "80px",
  backgroundColor: "#FAFAF8",
}
```

**Back phone (Sleep panel):**
```tsx
<img
  src="/images/preview-sleep.png"
  alt="Cnvrg sleep panel"
  style={{
    position: "absolute",
    height: "78%",
    width: "auto",
    right: 100,
    top: "6%",
    zIndex: 1,
    opacity: 0.88,
    mixBlendMode: "multiply",
    imageRendering: "crisp-edges",
    filter: "drop-shadow(-4px 0 20px rgba(20,20,16,0.08))",
  }}
/>
```

**Front phone (Insights):**
```tsx
<img
  src="/images/dashboard-preview.png"
  alt="Cnvrg Health dashboard"
  style={{
    position: "absolute",
    height: "88%",
    width: "auto",
    right: -20,
    top: "5%",
    zIndex: 2,
    mixBlendMode: "multiply",
    imageRendering: "crisp-edges",
    filter: "drop-shadow(-8px 0 40px rgba(20,20,16,0.12))",
  }}
/>
```

**Copy (left column) — unchanged.** Logo remains absolute-positioned inside the hero section at `top: 32, left: "10%"`.

**Files to check:** Verify `/images/preview-sleep.png` exists in `public/images/`. If it does not, copy `/Users/igorkhabensky/peaq/previewed (1).png` to `public/images/preview-sleep.png`.

---

## Section 2 — Science Hook (new section, inserted after hero)

A new `<section>` inserted between the hero `</section>` and the `<LandingPanelsAndScience />` component.

**Purpose:** Establish *why* the product exists before explaining *what* it does. Visual pathway showing the oral-cardiovascular connection backed by one key citation.

**Layout:** Full-width, `paddingTop: 80, paddingBottom: 80`, max-width 1080 centered. Two columns on desktop (`grid-template-columns: "1fr 1fr"`), stacked on mobile.

**Left column — the stat:**
```
Large serif number: "100%"
Label: "of coronary artery plaques studied contained P. gingivalis DNA"
Source line: "— J. Am. Coll. Cardiol., 2023"
```
Typography: number at `fontSize: "clamp(64px, 8vw, 96px)"`, `color: GOLD`, `fontFamily: serif`. Label at `fontSize: 16`, `color: INK_60`. Source at `fontSize: 11`, `color: INK_40`, `fontStyle: "italic"`.

**Right column — the pathway diagram (inline SVG):**
Four nodes connected by arrows: `Oral bacteria` → `Bloodstream` → `Systemic inflammation` → `Cardiac tissue`

Render as a horizontal SVG row of labeled circles with connecting arrows. Use the panel colors: oral green for node 1, blood red for nodes 2–3, a muted dark for node 4.

SVG structure (approximate — implement as inline SVG in TSX):
- 4 circles, `r=28`, spaced ~120px apart, on a single horizontal line
- Text label below each circle (10px, sans, INK_60)
- Connecting arrows between circles (`stroke: INK_20`, `strokeWidth: 1`)
- Circle fills: `#EAF3DE` (oral), `#FDECEA` (blood), `#FDECEA` (inflammation), `rgba(20,20,16,0.06)` (cardiac)
- Short text label inside each circle (SVG `<text>` element, `fontSize: 9`, `fontWeight: 600`): "Oral", "Blood", "Inflam.", "Cardiac"
- SVG viewBox should scale responsively

The section eyebrow label: `"The pathway"` in the standard eyebrow style.

**Eyebrow + stat + citation are in `page.tsx`.** This is a server component — no client-side JS needed.

---

## Section 3 — Three Panels (upgrade, inside `landing-panels-science.tsx`)

**What changes:** The panel description text for each panel gains one concrete data point shown as a small inline stat chip below the description lines.

Current panel data:
```ts
{ key: "oral",  lines: ["16S rRNA sequencing", "Species-level resolution"] }
{ key: "blood", lines: ["40+ biomarkers", "from any lab"] }
{ key: "sleep", lines: ["Nightly wearable", "HRV, deep sleep, SpO₂"] }
```

Add a `stat` field to each panel:
```ts
{ key: "oral",  stat: "100+ species tracked" }
{ key: "blood", stat: "LabCorp · Quest · any lab" }
{ key: "sleep", stat: "WHOOP · Oura · Apple Health" }
```

Render the stat below the description lines in a small badge style: `fontSize: 10`, `fontWeight: 500`, `color: panel.color`, `background: panel.color + "15"` (15% opacity), `padding: "3px 8px"`, `borderRadius: 3`, `display: "inline-block"`, `marginTop: 8`.

**No structural changes to the tabs/selector interaction.** Keep all existing state logic.

---

## Section 4 — Inside the App (new section, replaces "What Cnvrg reveals")

**Remove** the existing "What Cnvrg reveals" section (the two quote cards + three stat blocks) from `page.tsx` entirely.

**Insert** a new section in its place.

**Layout:** Full-width section, `paddingTop: 96, paddingBottom: 96`, `background: "var(--warm-50)"` (slightly off-white to distinguish from surrounding sections). Max-width 1080 centered.

**Eyebrow:** `"Inside the app"`

**Headline:** `"This is what you actually see"` — serif, `fontSize: "clamp(24px, 2.5vw, 36px)"`, `fontWeight: 400`

**Two-column phone showcase:** `display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, marginTop: 56, alignItems: "start"`

**Left phone — Insights view:**
- Image: `/images/dashboard-preview.png`
- `height: 480, width: "auto", mixBlendMode: "multiply", imageRendering: "crisp-edges"`
- Below image: eyebrow label `"AI Insights"` in oral green, then heading `"Cross-panel signals, updated daily"`, then body copy: `"Cnvrg's AI reads across your oral, blood, and sleep data to surface connections no single panel can see. Every insight links to the underlying science."`

**Right phone — Sleep panel:**
- Image: `/images/preview-sleep.png`
- Same image styles
- Below image: eyebrow label `"Sleep Panel"` in sleep blue, then heading `"Clinical thresholds, not just ranges"`, then body copy: `"Deep sleep, HRV, SpO₂, REM — each metric measured against a clinical target, not a population average. When something needs attention, you'll know."`

Both phone images use `mixBlendMode: "multiply"` with the section background matching so white bleeds away cleanly. The section background `var(--warm-50)` = `#F7F5F0` provides the blend surface.

**Mobile:** Stack vertically. The CSS class `.hero-mockup` is already hidden on mobile — these images need a different class or no class. Use a simple responsive approach: `@media (max-width: 768px)` in globals.css to stack the 2-col grid.

---

## Section 5 — Science Citations (unchanged)

No changes. This section is rendered inside `LandingPanelsAndScience` component.

---

## Section 6 — How It Works (upgrade)

In the existing 4-step list in `page.tsx`, add a small image to step 1 and step 4:

**Step 1 "Order your kit":** Add `<img src="/images/oralkit.png" ... />` to the right of the step content. Style: `height: 64, width: "auto", opacity: 0.85, mixBlendMode: "multiply"`. Wrap the step row in `display: "flex", justifyContent: "space-between", alignItems: "center"`.

**Step 4 "Get your Cnvrg score":** Add a small inline pill showing `"Cnvrg score"` in gold — `fontSize: 11, background: "rgba(154,114,0,0.1)", color: GOLD, padding: "4px 10px", borderRadius: 20, fontWeight: 500` — next to the step title. This is text-only, no image.

Steps 2 and 3 remain text-only.

---

## Section 7 — Built by Clinicians (unchanged)

No changes.

---

## Section 8 — Final CTA (unchanged)

No changes.

---

## Files changed

| File | Change |
|------|--------|
| `app/page.tsx` | Hero upgrade (staggered phones), new science hook section, new "Inside the app" section, remove "What Cnvrg reveals", upgrade "How it works" step 1 + 4 |
| `app/components/landing-panels-science.tsx` | Add `stat` field to panel data + stat chip rendering |
| `public/images/preview-sleep.png` | Copy from `/Users/igorkhabensky/peaq/previewed (1).png` if not already present |
| `app/globals.css` | Add responsive rule to stack the "Inside the app" 2-col grid on mobile |

---

## Dark mode

All new sections use existing CSS variables (`--warm-50`, `--ink`, `--ink-60`, etc.) which already have dark mode overrides in `globals.css`. The `mixBlendMode: "multiply"` on phone images works in light mode only — in dark mode, multiply blend darkens images further. Add a dark-mode override: in dark mode, set `mixBlendMode: "normal"` and use `filter: "drop-shadow(...)"` only, with `opacity: 0.9`. Detect with `[data-theme="dark"] img.phone-mockup` in `globals.css`.

Apply `className="phone-mockup"` to all 4 phone `<img>` elements (hero back, hero front, inside-app left, inside-app right) so the CSS override targets them all.

```css
/* globals.css addition */
[data-theme="dark"] .phone-mockup,
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .phone-mockup {
    mix-blend-mode: normal;
    opacity: 0.88;
  }
}
```

---

## What is NOT changing

- All copy (headlines, subheads, body text) — unchanged unless noted
- Navigation, logo, footer
- Science citations section content
- "Built by clinicians" section
- "Final CTA" section
- Design tokens, fonts, color palette
- Mobile hero hiding (`.hero-mockup { display: none }` on mobile stays)

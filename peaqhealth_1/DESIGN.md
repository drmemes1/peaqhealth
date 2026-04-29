# DESIGN.md — Oravi
**Version 2.0 — Synthesized from Oravi identity + Apple, Linear, Framer, Notion design systems**

> This is the single source of truth for all Oravi UI. Read this entire file before touching any component. Every decision here is intentional. Deviate only with explicit justification.

---

## 1. Philosophy & Atmosphere

Oravi is **clinical luxury** — the rarest combination in digital health. It has the scientific credibility of a medical instrument and the aesthetic restraint of a premium object. It never motivates. It never celebrates. It measures, reports, and illuminates.

**The core tension that drives every design decision:**
> *Density without overwhelm. Precision without coldness. Premium without pretension.*

Borrow from the best:
- **Apple**: Controlled drama. Vast negative space. Every element earns its place or disappears.
- **Linear**: Data rows so precise they feel machined. Interactions that are instantaneous and satisfying.
- **Framer**: Motion that feels inevitable, not decorative. Things arrive with purpose.
- **Notion**: Warm minimalism. Serif type that makes data feel considered, not clinical.

The interface should feel like a **beautifully designed medical report** — not an app, not a dashboard, not a wellness platform. When someone opens Oravi, they should feel they are looking at something serious and rare.

---

## 2. Logo & Brand Mark

### The Mark

The Oravi logo has two components:

**Peaks mark** — Three mountain peaks rendered as thin continuous line strokes (`stroke-width` ~1.5–2px, `fill: none`). The leftmost and rightmost peaks are smooth triangles. The **middle peak** contains an embedded EKG/heartbeat spike — the stroke line briefly drops sharply then spikes up before reaching the apex. This heartbeat-in-a-mountain is the single most distinctive element of the brand. It must be reproduced faithfully as an SVG path — never simplified or omitted.

**Wordmark** — "peaq" in a custom thin geometric lowercase typeface. The "e" has a diagonal slash through its counter. Letters are circular and open. This is a custom logotype — do not attempt to replicate with any web font including Cormorant Garant.

### Usage

| Context | Treatment |
|---------|-----------|
| Dark sidebar | `peaq_logo.png` as `<img>`, ~36px wide, centered, CSS `filter: invert(1) brightness(2)` to render white on dark bg |
| Light header / app bar | `peaq_logo.png` as `<img>`, natural color (dark mark on light bg) |
| Favicon / app icon | `peaq_logo.png` cropped to mark only |
| Loading screen | `peaq_logo.png`, natural color |

### File Reference

```
Asset: peaq_logo.png
Location: /assets/images/oravi.png (or equivalent in project)
Format: PNG with transparent background
```

### Rendering on Dark Backgrounds (sidebar)

The logo is dark ink on transparent. To display on the dark `#16150F` sidebar:
```css
.sidebar-logo img {
  filter: invert(1) brightness(1.8);
  width: 36px;
  height: auto;
  margin-bottom: 16px;
}
```

### Rules

- **Always** use `peaq_logo.png` — never recreate with code, SVG paths, or text
- **Never** substitute with a letter "p", initials, or any font-based logo
- **Never** recolor in gold, panel colors, or gradients — use CSS `filter` for dark/light variants only
- **Never** add a background box or container behind the logo in the sidebar
- **Never** stretch or distort — always `height: auto` with fixed width
- **Never** display at less than 28px wide
- The wordmark "peaq" is part of the logo file — do not add separate text next to it

---

## 3. Color System

### Core Palette

```css
/* Backgrounds */
--cream:         #F6F4EF;   /* Page background — warm, never pure white */
--card:          #FFFFFF;   /* Card / panel surfaces */
--dark:          #16150F;   /* Sidebar, dark sections, cross-panel card */

/* Text */
--ink:           #1a1a18;   /* Primary — slightly warm, never pure black */
--ink2:          #8C8A82;   /* Secondary — labels, metadata */
--ink3:          #BBBBBB;   /* Tertiary — placeholders, units, dividers */

/* Gold — the only accent */
--gold:          #C49A3C;   /* Active states, CTAs, score, cross-panel */
--gold-dim:      rgba(196,154,60,0.12);  /* Active nav background */
--gold-glow:     rgba(196,154,60,0.06);  /* Subtle hover tint on dark */

/* Borders */
--border:        rgba(0,0,0,0.06);      /* Default — barely visible */
--border-md:     rgba(0,0,0,0.10);      /* Medium — buttons, active states */
--border-dark:   rgba(255,255,255,0.07); /* On dark backgrounds */
```

### Panel Colors — Each panel owns exactly one color

```css
--sleep:  #185FA5;  /* Blue  — all sleep panel elements */
--blood:  #A32D2D;  /* Red   — all blood panel elements */
--oral:   #3B6D11;  /* Green — all oral microbiome elements */
```

### Status Colors

```css
--opt-bg:   #EAF3DE;  --opt-tx:   #27500A;  /* Optimal */
--good-bg:  #E1F5EE;  --good-tx:  #085041;  /* Good */
--watch-bg: #FAEEDA;  --watch-tx: #633806;  /* Watch */
--attn-bg:  #FCEBEB;  --attn-tx:  #791F1F;  /* Attention */
```

### Color Rules — Non-negotiable

- **Never** use purple, violet, teal, or any bright gradient
- **Never** use pure white `#ffffff` as a page background — always `--cream`
- **Gold is scarce** — active nav, primary CTA, score accent, cross-panel values only
- **No box-shadow on cards** — elevation comes from white card on cream background
- **Dark sections** are always `#16150F` — never pure black, never dark grey
- Panel colors are **fixed** — Sleep is always blue, Blood always red, Oral always green. Never swap.

---

## 4. Typography

### Typefaces

```css
/* Display — scores, headings, taglines, panel names */
font-family: 'Cormorant Garant', Georgia, serif;

/* UI — everything else */
font-family: -apple-system, BlinkMacSystemFont, sans-serif;
```

**Import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap" rel="stylesheet">
```

### Type Scale

| Element | Font | Size | Weight | Line-height | Letter-spacing |
|---------|------|------|--------|-------------|----------------|
| PRI Score | Cormorant Garant | 80–96px | 300 | 1 | -0.5px |
| Hero greeting | Cormorant Garant | 20px | 400 | 1.2 | 0 |
| Panel name | Cormorant Garant | 16px | 400 | 1 | 0 |
| Tagline italic | Cormorant Garant | 14px | 400 | 1.4 | 0 |
| Chip score | Cormorant Garant | 20px | 400 | 1 | 0 |
| Section label | -apple-system | 9px | 400 | 1 | 2px + uppercase |
| Biomarker name | -apple-system | 12px | 400 | 1.3 | 0 |
| Biomarker sublabel | -apple-system | 10px | 400 | 1.3 | 0 |
| Biomarker value | -apple-system | 13px | 500 | 1 | 0 |
| Biomarker unit | -apple-system | 10px | 400 | 1 | 0 |
| Status badge | -apple-system | 9px | 500 | 1 | 0.3px |
| Insight body | -apple-system | 11px | 400 | 1.55 | 0 |
| Button | -apple-system | 9px | 400 | 1 | 1.5px + uppercase |
| Topbar subtitle | -apple-system | 10px | 400 | 1 | 0.5px |

### Typography Philosophy

**Compression within, expansion between** (Apple): Type blocks are tightly set — tight line-heights at display sizes — while the surrounding space is generous. This creates tension between density and openness that signals premium craft.

**Serif warmth** (Notion): Cormorant Garant is used for anything that needs to feel considered and human. It signals the data was curated by someone who cares, not generated by a machine.

**Weight 300 for the score** — lighter than regular at 80px+. More refined. Less aggressive. The number should feel inevitable, not shouted.

**Never use:** Inter, Roboto, Arial, Space Grotesk, or any system sans-serif for headings.

---

## 5. Spacing & Layout

### Spatial Tokens

```css
--space-xs:   4px;
--space-sm:   8px;
--space-md:   12px;
--space-lg:   16px;
--space-xl:   24px;
--space-2xl:  32px;
--space-3xl:  48px;
```

### Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│  Sticky horizontal nav (h-16, cream bg, backdrop blur)   │
│  [logo]  Dashboard  Panels▾  Shop  Science  Settings     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  main content (max-width: 760px, centered)               │
│  [hero / score wheel / peaks]                            │
│  [panel sections]                                        │
│  [insights]                                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Panel Dividers

`bm-section` background = `--cream`. Each `panel-block` background = `--card` (white). `margin-bottom: 6px` between panel blocks. The cream strip IS the divider. Never use a border, hr, or line.

---

## 6. Motion & Animation

*(Framer motion-first + Linear instant-feel)*

### Speed Tiers

```css
--dur-instant:   80ms;   /* Hover states, active */
--dur-fast:      150ms;  /* Row reveals, badge in */
--dur-mid:       250ms;  /* Panel open, drawer */
--dur-slow:      400ms;  /* Page load stagger */
--dur-cinematic: 700ms;  /* Score count-up, peaks draw */
```

### Easing

```css
--ease-out:    cubic-bezier(0.0, 0.0, 0.2, 1);    /* Entering */
--ease-inout:  cubic-bezier(0.4, 0.0, 0.2, 1);    /* Transitioning */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Chips, badges */
```

### Page Load Sequence

Stagger in this order (each 60ms after previous):
1. Nav bar — opacity 0→1, `250ms`
2. Stat chips — `translateY(12px)→0` + opacity, staggered 60ms each, spring easing
3. Peaks SVG strokes — draw via `stroke-dasharray`, `700ms ease-out`, delay 300ms
4. Score number — count up 0→[user's actual PRI score], `700ms easeOut`, delay 300ms
5. Biomarker rows — `translateY(8px)→0` + opacity, 40ms apart
6. Insights section — opacity 0→1, last

### Micro-interactions

```css
/* Biomarker row hover — instant, no lift */
.bm-row { transition: background 80ms ease; }
.bm-row:hover { background: rgba(0,0,0,0.013); }

/* Stat chip hover — spring lift */
.chip { transition: transform 150ms cubic-bezier(0.34,1.56,0.64,1); }
.chip:hover { transform: translateY(-2px); }

/* Nav icon */
.s-icon { transition: background 150ms ease, color 150ms ease; }

/* Primary button */
.btn-gold:hover { opacity: 0.88; }
.btn-gold:active { opacity: 0.76; transform: scale(0.98); }

/* Secondary button */
.btn-outline:hover { background: rgba(0,0,0,0.03); }
```

### Peaks Draw Animation

```css
.peak-stroke {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawPeak 700ms cubic-bezier(0.0,0.0,0.2,1) forwards;
  animation-delay: 300ms;
}
@keyframes drawPeak { to { stroke-dashoffset: 0; } }

.peak-fill {
  opacity: 0;
  animation: peakFill 500ms ease forwards;
  animation-delay: 600ms;
}
@keyframes peakFill { to { opacity: 1; } }
```

### Motion Rules

- Never animate `border-color`, `font-size`, or `all`
- Never bounce data rows — spring only on chips and buttons
- Never animate right sidebar content (it's reference data)
- Nothing slower than 400ms on interactive elements
- Motion must have purpose — if you can't explain why it moves, remove it

---

## 7. Components

### Navigation Bar

```css
position: sticky; top: env(safe-area-inset-top, 0px); z-index: 50;
background: var(--off-white); opacity: 0.92; backdrop-filter: blur(12px);
border-bottom: 0.5px solid var(--border);
height: 64px; max-width: 1200px; margin: 0 auto; padding: 0 24px;
display: flex; align-items: center; justify-content: space-between;
```

**Left:** Logo — `peaq_logo_transparent.png` via Next.js `<Image>`, ~75px wide, natural color on light bg. On dark bg: `filter: invert(1)`.

**Center:** Navigation links — -apple-system 13px uppercase, 0.08em tracking.
- Dashboard, Panels (dropdown with Sleep/Blood/Oral/Cross-Panel), Shop, Science, Settings
- Active: gold color `#C49A3C` + underline (0.5px thickness, 4px offset)
- Inactive: ink color, opacity 0.5

**Panels dropdown:** Absolute positioned, white bg, 10px border-radius, 160px min-width.
- Items: Sleep (blue `#185FA5` dot), Blood (red `#A32D2D` dot), Oral (green `#3B6D11` dot), Cross-Panel (gold `#C49A3C` dot)
- Transition: `opacity 0.18s ease, transform 0.18s ease`

**Right:** Date display (hidden on mobile) + cart button with badge.

### Panel Stat Chips

```css
background: var(--cream);
border: 0.5px solid var(--border);
border-radius: 8px; padding: 8px 12px;
display: flex; align-items: center; gap: 8px; flex: 1;
transition: transform 150ms cubic-bezier(0.34,1.56,0.64,1);
```

### Peaks SVG

`viewBox="0 0 420 185"`, `overflow: visible` on `<svg>`. Mountain silhouette bg path. Baseline rule. Three upward triangles (panel colors). Inverted gold triangle (cross-panel). Score label + panel label below each.

Peak height formula: `(score / max) x 130px`

### Biomarker Rows

Grid: `grid-template-columns: 1fr 56px 74px 78px`
Padding: `10px 24px`
Border-bottom: `0.5px solid rgba(0,0,0,0.03)`
Hover: `rgba(0,0,0,0.013)`

Panel header: sticky, white bg, z-index 2. Dot + panel name (Cormorant Garant 16px panel color) + score meta + "View all ->" gold.

Sparklines: `48x20px` SVG polyline, 1.5px stroke, panel color, no fill.

Status badges: `9px, 500, 3px 8px padding, 4px radius, 0.3px letter-spacing`

### Buttons

**Primary (gold):** `background: #C49A3C; color: #fff; border-radius: 6px; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 13px`

**Secondary:** `background: transparent; color: #8C8A82; border: 0.5px solid rgba(0,0,0,0.10); border-radius: 6px; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 13px`

### Right Sidebar

Top (white): insights — 3 items with panel-colored tag + 11px body text.

Bottom (dark `#16150F`): cross-panel signals — total in Cormorant Garant 42px gold + modifier items with rationale + hallmark chips.

---

## 8. Scoring

**Oravi Resilience Index (PRI)** — never "score", "health score", or "wellness score".

```
PRI = Sleep(24/30) + Blood(34/40) + Oral(10/30) + cross-panel(-4) = 64
```

Score bands: 80-100 (all hallmarks well), 65-79 (early signals), 50-64 (multiple hallmarks), <50 (clinician flag).

Scientific anchoring: Inflammaging (hallmark #11) + Dysbiosis (hallmark #12) from Lopez-Otin et al., Cell 2023.

**Never** claim the score predicts longevity or lifespan.

---

## 9. Copy & Voice

| Do | Don't |
|----|-------|
| "HRV of 27ms sits in the lowest quartile for men 40-44" | "Your HRV is low" |
| "P. gingivalis elevates OxPL-ApoB" | "Your oral health needs attention" |
| "This modifier is genetic — not modifiable" | "Don't worry about this" |
| Cite specific biomarker + mechanism | Speak in generalities |
| "Attention" | "Needs improvement" |

Never use: amazing, great job, keep it up, wellness, holistic, journey, optimize, improve your health.

Primary tagline: **"Three signals. One measure of resilience."**

---

## 10. Mobile (Expo)

Same tokens. Web app uses horizontal sticky nav; Expo app uses bottom tab bar (5 tabs: Dashboard, Oral, Sleep, Cross-Panel, Profile — gold `#C49A3C` active tint). Dark login screen. Single-column layout. Peaks full-width SVG. Biomarker rows unchanged. Chip layout TBD — confirm with design before implementing.

---

## 11. What NOT To Do

**Typography:** No Inter/Roboto/Arial for headings. No Cormorant Garant for long body text. No bold section labels.

**Color:** No purple/violet/teal. No gradient card backgrounds. No white page background. No box-shadow on cards. No glassmorphism. No swapping panel colors.

**Components:** No circular score gauge. No rounded pill panel headers. No hr between panels (use cream gap). No external icon CDN. No emoji. Always "PRI" not "Score". **Never replace the logo mark with a letter "p" or any text** — always use the SVG peaks+EKG mark. Never recolor the logo in gold or panel colors.

**Motion:** No bounce on data rows. No `transition: all`. No decorative motion without purpose. Nothing > 400ms on interactive elements.

**Copy:** No motivational language. No longevity prediction claims. No generic wellness framing.

---

## 12. Claude Code Implementation Notes

1. Always use `var(--token)` CSS custom properties, never hardcoded hex
2. Icons are always inline SVG — never CDN, never `<img>`
3. Panel dividers: `bm-section { background: var(--cream) }` + `panel-block { background: var(--card); margin-bottom: 6px }`
4. Peaks SVG needs `overflow: visible` — labels extend outside viewBox
5. Page load animations use `animation-delay` staggering in CSS — not JS
6. Scrollbars: `3px width`, `rgba(0,0,0,0.1)` thumb, `border-radius: 2px`, transparent track
7. Sticky panel headers need explicit `background: var(--card)` or they go transparent on scroll
8. Right sidebar: `display: flex; flex-direction: column` — insights `flex-shrink: 0`, cross-panel `flex: 1; overflow-y: auto`
9. Use Cormorant Garant weight 300 (not 400) for the large score number
10. Never recreate the triad visualization unless explicitly asked — peaks are the primary hero

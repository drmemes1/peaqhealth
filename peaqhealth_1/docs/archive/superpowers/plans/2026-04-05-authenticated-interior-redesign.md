# Authenticated Interior Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign every authenticated page (/dashboard, /panels, /science, /shop, /settings) with a shared AuthLayout shell, new dashboard hero with peaks SVG, clinical range visualizations, and consistent design language per DESIGN.md.

**Architecture:** Create a single `AuthLayout` component (sidebar + topbar) that wraps all authenticated routes via a shared layout.tsx. Rebuild dashboard-client.tsx from scratch with new hero section, biomarker rows with range bars, and right sidebar. Rewrite /panels, /science, /shop, /settings pages to use AuthLayout and match the spec.

**Tech Stack:** Next.js 14 App Router, React Server Components + Client Components, Supabase auth, inline styles (existing pattern), CSS custom properties from globals.css.

---

## File Structure

### New Files
- `app/components/auth-layout.tsx` — Shared shell: sidebar + topbar + content area
- `app/components/auth-sidebar.tsx` — Refactored sidebar (extracted from dashboard-sidebar.tsx)
- `app/components/auth-topbar.tsx` — Refactored topbar (page-aware title/greeting)
- `app/components/biomarker-row.tsx` — New biomarker row with range visualization + info expand
- `app/components/range-track.tsx` — Clinical zone spectrum track component
- `app/components/dashboard-hero.tsx` — Hero section: stat chips + peaks SVG + PRI score block
- `app/components/dashboard-biomarkers.tsx` — Biomarker sections with panel headers + collapse
- `app/components/dashboard-right-sidebar.tsx` — Top Insights + Cross-Panel Signals
- `app/panels/[panel]/page.tsx` — Dynamic panel detail pages (sleep/blood/oral)
- `app/(authenticated)/layout.tsx` — Route group layout wrapping all auth pages

### Modified Files
- `app/dashboard/layout.tsx` — Remove, replaced by (authenticated) group layout
- `app/dashboard/page.tsx` — Keep server data fetching, pass to new client components
- `app/dashboard/dashboard-client.tsx` — Full rewrite using new components
- `app/panels/page.tsx` — Full rewrite with AuthLayout
- `app/science/page.tsx` — Full rewrite with AuthLayout
- `app/shop/page.tsx` — Full rewrite with AuthLayout
- `app/settings/layout.tsx` — Replace Nav with AuthLayout
- `app/settings/settings-client.tsx` — Restyle to match spec
- `app/globals.css` — Add keyframe animations for page load sequence

### Removed/Deprecated
- `app/components/dashboard-sidebar.tsx` — Replaced by auth-sidebar.tsx
- `app/components/dashboard-topbar.tsx` — Replaced by auth-topbar.tsx
- `app/components/nav.tsx` — No longer used (panels/shop/science/settings now use AuthLayout)

---

## Task 1: AuthLayout Shell — Sidebar + Topbar

**Files:**
- Create: `app/components/auth-sidebar.tsx`
- Create: `app/components/auth-topbar.tsx`
- Create: `app/components/auth-layout.tsx`

### Description

Build the shared authenticated shell that wraps every post-login page. The sidebar is 62px wide, fixed, full height, #16150F background. The topbar is 52px tall, white, with page-aware content.

- [ ] **Step 1: Create auth-sidebar.tsx**

Refactor from existing dashboard-sidebar.tsx. Key changes:
- Keep the 5 inline SVG nav icons (Dashboard, Panels, Science, Shop, Settings)
- Settings icon pinned above avatar (with spacer between main icons and settings)
- Avatar: 34x34px circle, rgba(196,154,60,0.18) bg, Cormorant Garant 14px gold initials
- Logo: peaq_logo.png with filter invert(1) brightness(1.8), 36px wide
- Hover states: bg rgba(255,255,255,0.07), color rgba(255,255,255,0.6), 150ms ease
- Active states: bg rgba(196,154,60,0.12), color #C49A3C
- Animation: sidebarIconIn 250ms stagger

- [ ] **Step 2: Create auth-topbar.tsx**

Page-aware topbar. Props: `{ pageId, firstName?, lastSyncAt?, wearableProvider?, onSync?, syncing?, children? }`

Left side behavior:
- Dashboard: "Good morning, [first name]." in Cormorant Garant 19px + sync subtitle 10px #bbb
- Other pages: page name in Cormorant Garant 19px

Right side: Export button (secondary) + "+ Add Data" button (gold primary)
- Both: 9px uppercase letter-spacing 1.5px, border-radius 6px, padding 6px 13px

- [ ] **Step 3: Create auth-layout.tsx**

Client component wrapping sidebar + topbar + children:
```
<div style={{ minHeight: "100vh", background: "#F6F4EF" }}>
  <AuthSidebar initials={initials} />
  <AuthTopbar pageId={pageId} ... />
  <main style={{ marginLeft: 62, paddingTop: 52 }}>
    {children}
  </main>
</div>
```

- [ ] **Step 4: Wire AuthLayout into dashboard-client.tsx**

Replace inline sidebar/topbar usage with `<AuthLayout>`. Verify dashboard still renders.

- [ ] **Step 5: Commit**

```
feat: create shared AuthLayout shell with sidebar + topbar
```

---

## Task 2: Dashboard Hero Section — Stat Chips + Peaks SVG + PRI Block

**Files:**
- Create: `app/components/dashboard-hero.tsx`
- Modify: `app/dashboard/dashboard-client.tsx`

### Description

Build the hero section that replaces the score wheel. Contains three stat chips, peaks SVG visualization, and PRI score block.

- [ ] **Step 1: Create dashboard-hero.tsx**

Props from ScoreWheelProps: breakdown, score, modifier_total, sleepConnected, oralActive, bloodData, modifiers_applied.

**Three stat chips row:**
- Each: cream bg (#F6F4EF), 0.5px border, border-radius 8px, padding 8px 12px, flex: 1
- Contents: 6px colored dot + 9px uppercase label + Cormorant Garant 20px score (panel color) + 2px progress bar (score/max ratio)
- Hover: translateY(-2px) 150ms
- Sleep chip: color #185FA5, score/30
- Blood chip: color #A32D2D, score/40
- Oral chip: color #3B6D11, score/30

**Peaks SVG (viewBox="0 0 420 185"):**
- Background mountain silhouette: faint path rgba(200,205,216,0.28)→rgba(200,205,216,0.05)
- Baseline: 0.5px rgba(0,0,0,0.07) horizontal rule
- Three peaks proportional to score:
  - peak height = (score / max) * 130px
  - Sleep: #185FA5, Blood: #A32D2D, Oral: #3B6D11
  - Gradient fill: panel color 22%→4% top to bottom
  - Outline stroke: 0.8px panel color
  - Score number: Cormorant Garant 15px above apex
  - Label: 7px uppercase below baseline, /max: 6.5px #bbb below
  - Animation: stroke-dasharray draw 700ms ease-out delay 300ms, fill fade delay 600ms
- Cross-panel inverted triangle (bottom right):
  - Dashed stroke #C49A3C 0.7px dasharray 3,2.5
  - Gold gradient fill 0%→18%
  - Modifier value: Cormorant Garant 13px gold
  - "CROSS-PANEL" 6.5px uppercase gold

**PRI score block (right of peaks):**
- "ORAVI RESILIENCE INDEX" — 9px uppercase #bbb letter-spacing 2px
- Score: Cormorant Garant 80px weight 300 #1a1a18 (count-up animation)
- Tagline: Cormorant Garant italic 14px #bbb — "Three signals. One measure of " + gold "resilience."
- Sub: 10px #bbb "68 base · −4 cross-panel"
- Cross-panel pill: bg #16150F, border-radius 20px, padding 5px 12px, 5px gold dot + "CROSS-PANEL" 8px + value 15px gold

- [ ] **Step 2: Wire hero into dashboard-client.tsx**

Replace `<ScoreWheel>` with `<DashboardHero>`. Pass through the same props.

- [ ] **Step 3: Add page load animations to globals.css**

Staggered CSS animations:
1. Sidebar icons: opacity 0→1, 250ms
2. Topbar: translateY(-8px)→0, 250ms
3. Chips: translateY(12px)→0 + opacity, spring, 60ms stagger
4. Peaks draw: stroke-dasharray 700ms, delay 300ms
5. Score count-up: 0→score, 700ms easeOut, delay 300ms

- [ ] **Step 4: Commit**

```
feat: dashboard hero with stat chips, peaks SVG, PRI score block
```

---

## Task 3: Range Track + Biomarker Row Components

**Files:**
- Create: `app/components/range-track.tsx`
- Create: `app/components/biomarker-row.tsx`

### Description

Build the new clinical range visualization and biomarker row that replace progress bars across all pages.

- [ ] **Step 1: Create range-track.tsx**

Spectrum track with clinical zones:
```
[LOW] ──●── [OPTIMAL] ──────── [ELEVATED] ── [HIGH]
```

Props: `{ zones, value, panelColor, animate?, delay? }`

Zone fills:
- Optimal: rgba(59,130,100,0.15)
- Watch: rgba(250,174,0,0.15)
- Attention: rgba(220,60,60,0.12)

Dot: 8px circle, panel color, positioned at user's value
- Animate: translateX from left edge → position, 600ms ease-out
- Hover: scale 1→1.3→1, 200ms spring

Below track: value in 11px bold + unit + "optimal: [range]" in 9px #bbb

- [ ] **Step 2: Create biomarker-row.tsx**

Props: `{ name, value, unit, flag, zones, panelColor, optimal, info?, animDelay? }`

Grid layout: `grid-template-columns: 1fr 56px 74px 78px`
- Col 1: marker name (12px) + info button
- Col 2: value (13px bold) + unit
- Col 3: range track
- Col 4: status badge

Padding: 10px 24px, border-bottom: 0.5px solid rgba(0,0,0,0.03)
Hover: rgba(0,0,0,0.013) background, 80ms ease

**Info button (i):** 14px circle, border 0.5px #bbb, color #bbb
- Hover: border + color → #C49A3C, 150ms
- Click: expand inline card below row
  - White card, border 0.5px rgba(0,0,0,0.06), border-radius 8px, padding 12px 16px
  - What this marker measures (11px #555)
  - Why Oravi tests for it (11px #555)
  - Optimal range (10px #bbb)
  - Your value + trend
  - Animate: height 0→auto + opacity 0→1, 200ms ease

- [ ] **Step 3: Commit**

```
feat: range track spectrum + biomarker row with info expand
```

---

## Task 4: Dashboard Biomarker Sections

**Files:**
- Create: `app/components/dashboard-biomarkers.tsx`
- Modify: `app/dashboard/dashboard-client.tsx`

### Description

Build the biomarker section with panel headers, using new biomarker-row and range-track components.

- [ ] **Step 1: Create dashboard-biomarkers.tsx**

Props: ScoreWheelProps (reuse existing type)

Background: #F6F4EF (cream)
Each panel-block: white (#fff), margin-bottom 6px (cream gap IS the divider)

**Panel header (sticky top 0, z-index 2, white bg):**
- Left: 6px colored dot + panel name Cormorant Garant 16px
- Center: score/max · source · date — 10px #bbb
- Right: "View all →" — 10px gold (links to /panels/[panel])

**Biomarker rows:** Use `<BiomarkerRow>` for each marker. Pull zone definitions from existing BLOOD_ZONES, SLEEP_ZONES, ORAL_ZONES in score-wheel/index.tsx and marker-row.tsx.

**Collapse untested markers:**
- Hide "not tested" rows behind toggle at panel bottom
- Toggle: "Show [N] untested markers" — 9px gold
- Expand: 200ms ease

**Animation:** Rows enter with translateY(8px)→0 + opacity, 40ms stagger

- [ ] **Step 2: Wire into dashboard-client.tsx**

Place `<DashboardBiomarkers>` after the InterruptCard, replacing ScoreWheel's built-in biomarker rendering.

- [ ] **Step 3: Commit**

```
feat: dashboard biomarker sections with sticky headers and collapse
```

---

## Task 5: Dashboard Right Sidebar

**Files:**
- Create: `app/components/dashboard-right-sidebar.tsx`
- Modify: `app/dashboard/dashboard-client.tsx`

### Description

Extract and refine the right sidebar from dashboard-client.tsx.

- [ ] **Step 1: Create dashboard-right-sidebar.tsx**

Props: `{ modifiers, modifierTotal, score, panels }`

**Top section (white, flex-shrink 0):**
- "TOP INSIGHTS" — 9px uppercase #bbb letter-spacing 2px
- 3 items: panel tag (8px uppercase bold panel color) + body (11px #555 line-height 1.55)
- Use real modifier data

**Bottom section (#16150F, flex 1, overflow-y auto):**
- "CROSS-PANEL SIGNALS" — 9px uppercase rgba(255,255,255,0.28)
- Modifier total: Cormorant Garant 42px gold
- Subtitle: 10px rgba(255,255,255,0.28)
- Each modifier item:
  - Points: 12px weight 500, red #E24B4A for negative
  - Label: 11px rgba(255,255,255,0.62)
  - Rationale: 10px rgba(255,255,255,0.28) line-height 1.5, padding-left 32px
- Hallmark chips: 8px uppercase, border-radius 20px, border 0.5px, panel colors at opacity

- [ ] **Step 2: Wire into dashboard-client.tsx**

Replace inline right sidebar JSX with `<DashboardRightSidebar>`.

Body layout: grid 1fr | 284px (already exists, keep it).

- [ ] **Step 3: Add animation**

Right sidebar: opacity 0→1, last in sequence (animation-delay longest).

- [ ] **Step 4: Commit**

```
feat: extract dashboard right sidebar component
```

---

## Task 6: Dashboard Full Assembly

**Files:**
- Modify: `app/dashboard/dashboard-client.tsx`
- Modify: `app/globals.css`

### Description

Assemble all dashboard pieces and verify the full page load animation sequence.

- [ ] **Step 1: Rewrite dashboard-client.tsx**

Remove ScoreWheel import. Compose:
```
<AuthLayout pageId="dashboard" ...>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 284px", ... }}>
    <div> {/* center column */}
      <DashboardHero ... />
      {showInterrupt && <InterruptCard ... />}
      <DashboardBiomarkers ... />
      {labHistory.length >= 2 && <ScoreHistoryChart ... />}
    </div>
    <DashboardRightSidebar ... />
  </div>
</AuthLayout>
```

Keep: sync polling, interrupt card logic, reconnect banner.
Remove: ScoreWheel, ring references.

- [ ] **Step 2: Verify page load animation sequence**

Confirm stagger order:
1. Sidebar icons: 250ms
2. Topbar: translateY(-8px)→0, 250ms
3. Chips: translateY(12px)→0, spring, 60ms stagger
4. Peaks draw: 700ms, delay 300ms
5. Score count-up: 700ms, delay 300ms
6. Biomarker rows: translateY(8px)→0, 40ms stagger
7. Right sidebar: opacity 0→1, last

- [ ] **Step 3: Commit**

```
feat: assemble complete dashboard redesign
```

---

## Task 7: /panels — Panel Detail Pages

**Files:**
- Create: `app/panels/[panel]/page.tsx`
- Modify: `app/panels/page.tsx`

### Description

Create dedicated full-page views for each panel (sleep, blood, oral).

- [ ] **Step 1: Rewrite app/panels/page.tsx**

Use AuthLayout. Show overview of 3 panels with cards linking to /panels/sleep, /panels/blood, /panels/oral. Same card design but inside AuthLayout (no Nav component).

- [ ] **Step 2: Create app/panels/[panel]/page.tsx**

Server component with auth check. Fetch panel data from Supabase (same queries as dashboard/page.tsx but panel-specific).

Layout:
- Header: 3px top border in panel color
- Panel name: Cormorant Garant 32px panel color
- Score: Cormorant Garant 64px weight 300
- Last updated: 10px #bbb
- "View full report →" gold link top right

Full biomarker list using `<BiomarkerRow>` — ALL markers, not just top 4.
Same range visualization, same info buttons.

Trend chart section:
- Simple SVG line chart, panel color line, cream background
- Score over last 90 days, dot markers for each data point
- Cormorant Garant labels for date and score

- [ ] **Step 3: Commit**

```
feat: panel detail pages with full biomarker lists and trend charts
```

---

## Task 8: /science — Science Page Redesign

**Files:**
- Modify: `app/science/page.tsx`

### Description

Rewrite science page to use AuthLayout with three hallmark sections.

- [ ] **Step 1: Rewrite science page**

Use AuthLayout with pageId="science".

Three sections — one per hallmark:
- Hallmark badge: "Hallmark #11" etc., 8px uppercase, panel color border + bg, border-radius 20px
- Heading: Cormorant Garant 28px #1a1a18
- Body: 13px #555 line-height 1.7, max-width 640px
- Citation: 9px #bbb italic "Source: Author et al., Journal, Year"
- Which Oravi markers measure this hallmark — small chips in panel color

If hasWearable = false: gold-bordered banner at top of sleep/HRV section:
"You're viewing this without a wearable connected. HRV and sleep stage data requires WHOOP or Oura."
Dismissible with x button.

Keep existing citation data — just restyle the presentation.

- [ ] **Step 2: Commit**

```
feat: science page redesign with hallmark sections
```

---

## Task 9: /shop — Shop Page Redesign

**Files:**
- Modify: `app/shop/page.tsx`

### Description

Rewrite shop page to use AuthLayout with clean product grid.

- [ ] **Step 1: Rewrite shop page**

Use AuthLayout with pageId="shop".

Clean product grid on cream background. White cards, no gradients, no shadows.

Each product card:
- White bg, 0.5px border, border-radius 12px
- Product name: Cormorant Garant 18px #1a1a18
- Description: 11px #555 line-height 1.6
- Price: 13px #1a1a18 font-weight 500
- CTA: gold primary button "Add to cart"
- Hover: translateY(-2px) 150ms spring

If hasWearable = false:
- Pin wearable product to top of grid
- Gold "Recommended for you" badge
- Copy: "Adding a wearable unlocks your Sleep panel..."

Keep existing NotifyForm and product data. Just restyle.

- [ ] **Step 2: Commit**

```
feat: shop page redesign with AuthLayout
```

---

## Task 10: /settings — Settings Page Redesign

**Files:**
- Modify: `app/settings/layout.tsx`
- Modify: `app/settings/settings-client.tsx`

### Description

Restyle settings to use AuthLayout and match the spec.

- [ ] **Step 1: Update settings layout.tsx**

Replace `<Nav />` with AuthLayout. Remove inline background styles.

- [ ] **Step 2: Restyle settings-client.tsx**

Section layout: left labels (120px, 10px uppercase #bbb) + right content (flex 1)

Sections:
1. Profile — name, email, avatar initials
2. Data Sources — connection status per panel
3. Notifications — simple toggles (gold active state)
4. Account — danger zone (delete, sign out)

Section cards: white bg, 0.5px border, border-radius 12px, padding 20px 24px, margin-bottom 6px (cream gap divider)

Keep all existing functionality (save profile, wearable manager, export, delete account).

- [ ] **Step 3: Commit**

```
feat: settings page redesign with AuthLayout
```

---

## Task 11: Route Group Layout + Cleanup

**Files:**
- Modify: `app/dashboard/layout.tsx`
- Modify: All route layouts to share auth check

### Description

Ensure all authenticated routes share the auth check and AuthLayout.

- [ ] **Step 1: Update route layouts**

Each authenticated route layout does auth check (redirect to /login if no user). Since Next.js route groups can share layouts, verify each route properly checks auth.

For routes that were previously public (/panels, /shop, /science): add auth check in their page.tsx or create layout.tsx files.

- [ ] **Step 2: Clean up deprecated components**

Once all pages use AuthLayout:
- Remove old `dashboard-sidebar.tsx` and `dashboard-topbar.tsx` (if no longer imported)
- Remove `nav.tsx` (if no longer imported by any page)

- [ ] **Step 3: Commit**

```
chore: clean up deprecated nav components, unify auth checks
```

---

## Task 12: Final Audit

**Files:** All modified files

### Description

Screenshot every page, audit against DESIGN.md, flag any issues.

- [ ] **Step 1: Audit checklist**

Verify on every page:
- No purple, teal, or bright gradients
- No box-shadow on any card
- peaq_logo.png with CSS filter — never a letter "p"
- Cream (#F6F4EF) page backgrounds
- Panel dividers are cream gaps, not borders or hr
- "Oravi Resilience Index" everywhere, never "Score" alone
- Cormorant Garant for all headings — never Inter
- 0.5px borders everywhere — never 1px
- Inline SVG icons — never CDN
- Scrollbars: 3px, rgba(0,0,0,0.1) thumb

- [ ] **Step 2: List all files modified**

- [ ] **Step 3: Flag anything not implemented and explain why**

- [ ] **Step 4: Final commit**

```
fix: audit pass — design consistency across authenticated interior
```

═══════════════════════════════════════════════════════════════════
ORAVI — BRAND GUIDELINES
Version 1.0 · March 2026
═══════════════════════════════════════════════════════════════════

─── BRAND ESSENCE ─────────────────────────────────────────────────

Name:        Oravi
Tagline:     Reach for the peaq.
Sub-tagline: Sleep · Blood · Oral microbiome — one score, updated nightly.

Voice:       Calm authority. Clinical precision without cold detachment.
             Speaks like a brilliant friend who happens to be a doctor —
             confident, evidence-based, never alarmist.

Personality: Luxury wellness meets hard science.
             Think: The Economist meets Whoop meets a Michelin-starred
             tasting menu. Understated confidence. No hype.

Positioning: The only platform that bridges sleep architecture,
             cardiovascular biomarkers, and oral microbiome into
             a single, evidence-based daily score.

─── LOGO ──────────────────────────────────────────────────────────

Wordmark:    "peaq" — all lowercase, always
             Set in Cormorant Garamond, weight 400 (Regular)
             Never bold, never all-caps, never with a tagline attached

Symbol:      Mountain peak motif — represents peak performance,
             altitude, aspiration, and the literal letters p-e-a-q

Clear space: Minimum padding equal to the height of the "p"
             on all sides

Don'ts:
  × Never stretch or distort the logo
  × Never add drop shadows
  × Never place on busy backgrounds without overlay
  × Never use in colors other than ink, white, or gold
  × Never add TM or ® symbols in early stage

Logo on dark:   Use white version (filter: brightness(0) invert)
Logo on light:  Use ink version (filter: brightness(0))
Logo on gold:   Use white version

─── COLOR PALETTE ─────────────────────────────────────────────────

PRIMARY

  Off-white      #FAFAF8     Primary background — warm, not clinical
  Ink            #141410     Primary text — near-black with warmth
  Gold           #B8860B     Accent, CTA buttons, score highlights

WARM NEUTRALS

  Warm-50        #F7F5F0     Secondary backgrounds, card surfaces
  Warm-100       #EDE9E0     Borders, dividers, inactive states
  Warm-200       #DDD8CC     Stronger borders, disabled states

INK OPACITIES

  Ink-80         rgba(20,20,16,0.80)   Secondary text
  Ink-60         rgba(20,20,16,0.60)   Tertiary text, labels
  Ink-30         rgba(20,20,16,0.30)   Placeholder text, hints
  Ink-12         rgba(20,20,16,0.12)   Subtle borders
  Ink-06         rgba(20,20,16,0.06)   Hover states, zebra rows

GOLD VARIANTS

  Gold-dim       rgba(184,134,11,0.15) Gold backgrounds, badges
  Gold-light     #F5E6B8              Light gold fills

PANEL COLORS (data visualization only)

  Sleep          #4A7FB5     Blue — calm, restorative
  Sleep-bg       #EBF2FA     Sleep panel backgrounds
  Blood          #C0392B     Red — vital, urgent attention
  Blood-bg       #FDECEA     Blood panel backgrounds
  Oral           #2D6A4F     Green — growth, microbiome
  Oral-bg        #EAF3DE     Oral panel backgrounds

STATUS COLORS

  Green          #2D6A4F     Optimal, good results
  Green-bg       #EAF3DE
  Amber          #92400E     Warning, aging data
  Amber-bg       #FEF3C7
  Red            #991B1B     Attention needed
  Red-bg         #FEE2E2

COLOR USAGE RULES:
  - Off-white is the default page background, never pure white
  - Gold is used sparingly — CTAs, score numbers, key highlights only
  - Panel colors only appear in data contexts (rings, cards, tags)
  - Never use more than 2 panel colors in the same UI element
  - Status colors (green/amber/red) are for data flags only,
    not for decorative purposes

─── TYPOGRAPHY ────────────────────────────────────────────────────

DISPLAY FONT: Cormorant Garamond
  Source:    Google Fonts
  Weights:   300 (Light), 400 (Regular), 500 (Medium)
  Styles:    Regular + Italic
  Used for:  Logo, headlines, score numbers, panel titles,
             hero text, pull quotes

  Sizing:
    Hero headline:    48–72px, weight 300
    Page titles:      32–42px, weight 300
    Section titles:   22–28px, weight 400
    Score numbers:    64–96px, weight 300
    Panel scores:     28–40px, weight 300

  Italic usage:
    Italic (em tags) used for emphasis words in headlines
    Always in gold color when italic: color: var(--gold)
    Example: "Looking <em>really good.</em>"
    Never use italic for body text

BODY FONT: Instrument Sans
  Source:    Google Fonts
  Weights:   300 (Light), 400 (Regular), 500 (Medium)
  Used for:  All body text, labels, buttons, navigation,
             form fields, metadata, captions

  Sizing:
    Body text:        13–14px, weight 400
    Labels/eyebrows:  10–11px, weight 500, letter-spacing 0.06–0.1em
    Buttons:          11–12px, weight 500, letter-spacing 0.06–0.08em
    Captions:         10–11px, weight 400
    Form inputs:      14px, weight 400

TYPOGRAPHIC RULES:
  - Eyebrow labels: ALWAYS uppercase, letter-spacing 0.1em
    Example: "ORAVI · 2026"
  - Button text: ALWAYS uppercase, letter-spacing 0.06–0.08em
  - Headlines: NEVER uppercase, sentence case only
  - Body: Never justify text, always left-align
  - Line height: 1.6 for body, 1.1–1.15 for display
  - Maximum line length: ~65 characters for readability

─── SPACING & LAYOUT ──────────────────────────────────────────────

Grid:        Max-width 680px centered for app content
             Max-width 1200px for marketing pages
             24–48px horizontal padding depending on viewport

Spacing scale (multiples of 4px):
  4px    xs — icon gaps, tight inline spacing
  8px    sm — between related elements
  12px   md — card internal padding
  16px   base — standard element spacing
  24px   lg — section sub-spacing
  32px   xl — between sections
  44px   2xl — major section breaks
  64px   3xl — hero sections

Borders:
  Default:   0.5px solid var(--ink-12)  — deliberately thin, refined
  Focus:     0.5px solid var(--ink)
  Cards:     0.5px solid var(--ink-12), border-radius 3–4px
  Buttons:   border-radius 2–3px — slightly rounded, not pill shape

Shadows:
  Used sparingly — prefer borders over shadows
  When needed: 0 0 0 2px rgba(panel-color, 0.15) for focus rings only

─── COMPONENTS ────────────────────────────────────────────────────

BUTTONS

  Primary (ink):
    Background: var(--ink) / #141410
    Text: white, uppercase, letter-spacing 0.08em
    Padding: 12–13px vertical, full width in forms
    Border-radius: 2–3px
    Hover: opacity 0.85

  Primary (gold):
    Background: var(--gold) / #B8860B
    Same as above
    Used for: score reveals, premium actions, "order kit"

  Panel CTAs:
    Sleep CTA:  background var(--sleep-c)
    Blood CTA:  background var(--blood-c)
    Oral CTA:   background var(--oral-c)

  Secondary:
    Background: transparent
    Border: 0.5px solid var(--ink-12)
    Text: var(--ink-60)
    Hover: border-color var(--ink-30), color var(--ink)

CARDS
  Background: white (#FFFFFF)
  Border: 0.5px solid var(--ink-12)
  Border-radius: 4px
  Padding: 14–16px
  Top accent bar: 2px solid [panel color] — used on panel breakdown cards

SCORE RING
  4 concentric SVG arcs:
    Outer:  Sleep   r=96  stroke #4A7FB5  8px wide
    2nd:    Blood   r=84  stroke #C0392B  8px wide
    3rd:    Oral    r=72  stroke #2D6A4F  8px wide
    Inner:  IX      r=60  stroke #B8860B  8px wide
  Pending panels: dashed stroke, 30% opacity
  Animation: stroke-dashoffset transition, 1.6–2.2s cubic-bezier(.16,1,.3,1)
  Background tracks: panel-bg colors at same radii

FLAGS / BADGES
  Good/Optimal:  green-bg + green text
  Watch/Aging:   amber-bg + amber text
  Attention:     red-bg + red text
  Pending:       warm-50 + ink-60 text
  Font: 9–10px, weight 500, uppercase, letter-spacing 0.05em
  Padding: 2px 6–7px, border-radius 2px

INSIGHT CARDS
  Left border: 2px solid [relevant panel color]
  Cross-panel insights: 2px solid var(--gold)
  Fade-up animation on scroll intersection
  Tag pill at bottom: panel-bg + panel color text

NAVIGATION
  Height: 56px
  Background: rgba(250,250,248,0.92) with backdrop-filter blur(12px)
  Border-bottom: 0.5px solid var(--ink-12)
  Logo: Cormorant Garamond 20–22px
  Position: sticky top-0

─── MOTION & ANIMATION ────────────────────────────────────────────

Principles:
  - Purposeful, never decorative
  - Fast in, slow out (ease-out cubic-bezier)
  - Data reveals should feel meaningful, not flashy

Standard transitions:
  Hover states:    0.15s ease
  Page elements:   0.4s ease (opacity + translateY)
  Score ring fill: 1.6–2.2s cubic-bezier(.16,1,.3,1) — the "wow" moment
  Count-up numbers: 1.2–1.6s cubic-bezier with easing

Fade-up entry animation:
  from: opacity 0, translateY(12–14px)
  to:   opacity 1, translateY(0)
  Stagger: 60–80ms between sequential elements

Score count-up:
  Cubic ease-out: 1 - Math.pow(1-p, 3)
  Duration: 1400ms for total score, 900ms for panel scores
  Start from 0 or previous value

─── IMAGERY & ICONOGRAPHY ─────────────────────────────────────────

Photography style:
  - Minimal, high contrast
  - Natural light, organic textures
  - Mountain/nature themes (aspirational, peak performance)
  - Never stock photo clichés (no stethoscopes, no blue DNA)
  - Dark, moody hero images with overlay work well

Icons:
  - SVG inline, hand-crafted minimal style
  - Stroke-based, 1.2px stroke width
  - 16×16px standard size
  - Never filled unless specifically for status indicators
  - Color matches panel or ink-60 for neutral

Data visualization:
  - Score ring is the hero visualization — never replace with charts
  - Progress bars: 3px height, border-radius 2px, smooth fill
  - Historical chart (when built): minimal line chart, gold color

─── VOICE & COPY ──────────────────────────────────────────────────

Tone:
  - Precise without being cold
  - Evidence-based without being academic
  - Encouraging without being cheerleader-ish
  - Direct — no filler words

Headlines:
  - Short, declarative: "Reach for the peaq."
  - Use italics (gold) for the key word: "Looking <em>good.</em>"
  - Never use exclamation marks

Data copy:
  - Always cite the study: "Park 2019 · n=247,696"
  - State the effect size: "14% lower CVD risk"
  - Never say "studies show" without a specific citation

Score categories:
  85–100:  Optimal
  65–84:   Good
  45–64:   Moderate
  0–44:    Attention

Category messages:
  Optimal:   "Peak condition."
  Good:      "Looking good. Room to optimise."
  Moderate:  "Solid foundation. Key levers identified."
  Attention: "Your body is asking for attention."

Pending states:
  Never say "No data" — say "Pending" or "X pts available"
  Always show the upside: "Unlock 28 pts →"
  Make it feel like opportunity, not failure

Legal copy (always include):
  "For informational purposes only. Oravi does not provide
   medical advice. Always consult a licensed healthcare
   provider regarding your results."

─── LEGAL & COMPLIANCE NOTES ──────────────────────────────────────

  - Structure/function claims only for any supplements
  - Never use the word "diagnose" or "treat"
  - Always include the medical disclaimer
  - "Associated with" not "causes" when citing research
  - Healthcare attorney review required before taking
    real customer money

─── WHAT ORAVI IS NOT ──────────────────────────────────────────────

  × Not a medical device
  × Not a diagnostic tool
  × Not a replacement for a doctor
  × Not a fitness app (Whoop/Fitbit territory)
  × Not a supplement brand
  × Not clinical/cold/sterile
  × Not hype-driven wellness ("transform your life!")
  × Not purple gradients and Inter font

─── WHAT ORAVI IS ──────────────────────────────────────────────────

  ✓ A precision health intelligence platform
  ✓ Evidence-based, peer-reviewed science behind every number
  ✓ Beautiful enough to look forward to opening daily
  ✓ The connective tissue between your wearable, your labs,
    and your oral health — three signals nobody else combines
  ✓ A score that gets smarter as you add more data
  ✓ Luxury editorial aesthetic — feels like a premium product

═══════════════════════════════════════════════════════════════════
ORAVI · oravi.com · Confidential · March 2026
═══════════════════════════════════════════════════════════════════

# ADR-0011: Oravi brand foundation

Date: 2026-04-28
Status: Accepted (visual changes flagged for review)

## Context

The product is being rebranded from Cnvrg → Oravi (separate PR in
flight). Ahead of the upcoming oral-panel redesign, we need the
typography, color tokens, and shell chrome to land first so that the
component-library PR can build on stable foundations rather than
inventing tokens of its own.

## Decision

### Typography

- **Manrope** is the new display family for headings and data
  (metrics, eyebrows, nav). Loaded via `next/font/google`, exposes
  `--font-manrope`.
- **Instrument Sans** stays as the body family. Loaded via
  `next/font/google`, exposes `--font-instrument-sans`. Body default
  uses this variable directly.
- **Cormorant Garamond** is **kept** loaded for now. A `grep`
  audit found 166 inline references to it across the codebase. A
  separate cleanup PR will remove those uses; this PR does not change
  any of them.
- `h1, h2, h3` now globally use Manrope (via the `--font-manrope`
  variable). Existing inline-styled headings using
  `var(--font-display)` continue to render Cormorant until each call
  site is migrated.
- Typography utility classes (`.heading-display`, `.heading-section`,
  `.lede`, `.eyebrow`, `.eyebrow-subtle`, `.metric-large`,
  `.metric-medium`, `.metric-unit`, `.body-text`, `.body-small`,
  `.tagline`, `.font-display`) are added in `globals.css` for the
  upcoming component library.

### Color tokens

New oravi-spec tokens live in `globals.css`:

| Token | Value | Purpose |
|---|---|---|
| `--cream` | `#EDEAE1` | App-shell surface (was `#F5F3EE` in tokens.css; updated, see below) |
| `--cream-warm` | `#F0EBDB` | Slightly warmer surface tint |
| `--paper` | `#FAFAF8` | Card surface |
| `--paper-warm` | `#F6F3EB` | Card surface (warm) |
| `--paper-deeper` | `#F2EDE0` | Recessed surface |
| `--ink-soft` | `#2C2A24` | Secondary ink |
| `--ink-soft-2` | `#5A574E` | Tertiary ink |
| `--gold-deep` | `#9A7848` | Active gold |
| `--gold-pale` | `rgba(184,147,90,0.10)` | Gold wash |
| `--gold-line` | `rgba(184,147,90,0.35)` | Gold hairline |
| `--hairline` | `rgba(26,24,21,0.12)` | Standard divider |
| `--hairline-strong` | `rgba(26,24,21,0.20)` | Stronger divider |
| `--c-heart`, `--c-remin`, `--c-commensal`, `--c-context`, `--c-cavity`, `--c-orange`, `--c-red` | per spec | Bacterial category palette for `CompositionBar` (next PR) |
| `--status-strong` | `#6B8F73` | New three-tier status — joins watch & attention |
| `--status-watch` | `#B8893A` | Updated value |
| `--status-attention` | `#A85F3A` | Updated value |
| `--link-accent` | `#4A6485` | Cross-panel signal accent (sleep-dusk) |
| `--link-accent-pale` | `rgba(74,100,133,0.08)` | Cross-panel surface |

### Visual changes flagged for review

Two existing tokens were repointed to the oravi spec; these are real
visual changes and warrant manual review:

1. **`--gold` was `#C49A3C`, now `#B8935A`.** Reference count in the
   codebase: ~224 sites (Tailwind utilities, inline styles, status
   pills, accent borders). The new gold is warmer and a touch
   desaturated. Since this is the brand accent that appears on
   essentially every screen, expect a uniform shift everywhere gold
   appears.
2. **`--color-accent-gold` was `#C49A3C`, now `#B8935A`.** This is the
   tokens.css alias used by Tailwind `text-accent-gold` and similar.
   Updated in lockstep so the two tokens stay aligned. Without this,
   half the gold accents would change color and half wouldn't.
3. **`--cream` was `#F5F3EE`, now `#EDEAE1`.** `var(--cream)` is
   defined but not directly referenced by any source file
   (`grep var(--cream)` returns 0 results), so this is a no-op at
   runtime. It exists so the value matches the oravi spec for any
   future consumer.

### Backward-compatibility

The following existing tokens are retained as aliases / kept at
their existing values:

- `--off-white`, `--warm-50`, `--warm-100`, `--warm-200` — repo-wide
  surface tokens used in many places.
- `--peaq-bg`, `--peaq-bg-secondary`, `--peaq-bg-card`, `--peaq-bg-muted`
  — semantic aliases used in newer components.
- `--status-optimal`, `--status-good` — kept; the new
  `--status-strong` is **additive**, not a replacement.
- `--ink`, `--ink-80` etc. — kept; oravi adds `--ink-soft` and
  `--ink-soft-2` as separate names rather than retagging `--ink`.
- The legacy `--font-display: "Cormorant Garamond"` variable remains
  bound to Cormorant. The new `.font-display` utility class points to
  Manrope; consumers should migrate when they touch a file.

### Top nav (app shell)

Updated `apps/web/app/components/nav.tsx`:

- Background `var(--cream)`, bottom border `1px solid var(--hairline)`.
- 16px / 32px desktop padding; 14px / 20px on mobile.
- Brand cluster: `OraviMark` (28px) + Manrope-700 lowercase
  "oravi" wordmark.
- Nav items: Manrope-500 12px uppercase letter-spacing 0.06em.
  Active = ink color + 1px gold underline; idle = `--ink-soft-2`.
- `<640px` hides nav links (mobile drawer is a future PR).

### Brand mark

`apps/web/app/components/OraviMark.tsx` renders `/brand/oravi-mark.svg`
when present and falls back to an inline 8-dot SVG circle on `onError`.
This unblocks landing the nav before the SVG asset PR ships.

## Why this pairing

- **Manrope** is geometric, monospace-tabular for digits, and reads
  cleanly at the `metric-large` 44px size used in the upcoming
  component library. Its 700 weight has the structural feel oravi's
  brand wants without the warmth of a serif.
- **Instrument Sans** at body sizes is humanist enough to read for
  long paragraphs and contrasts with Manrope at headings, which keeps
  hierarchy obvious without a third family.
- Cormorant served the prior brand identity. Removing it is a
  separate cleanup; landing two fonts in parallel during the
  transition is the lower-risk path.

## Brand mark concept

The dotted-circle fallback is a microbial reference — the visual
metaphor for the oral microbiome's community of organisms. The final
SVG asset is expected to express this idea more deliberately; the
fallback exists so this PR doesn't block on it.

## What this ADR does NOT cover

- Removal of the Cormorant font (separate cleanup PR).
- Migration of the 166 inline `var(--font-display)` references.
- The component library itself (next PR).
- The mobile drawer / hamburger menu (future).
- The final `oravi-mark.svg` asset (separate PR).

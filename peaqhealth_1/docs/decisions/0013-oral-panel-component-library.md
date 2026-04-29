# ADR-0013: Oral panel component library

Date: 2026-04-29
Status: Accepted (visual review pending; no production wiring yet)

## Context

The upcoming oral panel redesign needs a focused set of presentational
primitives. Doing the components first — with no data wiring, no
production routes, and no page assembly — keeps each one reviewable
on its own merits and lets us prove the design tokens from ADR-0011
hold up at component scale before we invest in page-assembly work.

## Decision

Eight components live at `apps/web/app/components/oral-panel/`,
exposed via a barrel index. A showcase route at
`/design-system/oral-components` renders every component with realistic
example props for design and engineering review. The route is
`noindex` and not linked from anywhere user-facing.

### Why a separate location

There is an existing components directory at
`apps/web/app/components/panels/oral/` that powers the current
`/dashboard/oral` route. The new components live at a separate path
(`oral-panel/`) so the old and new can coexist during the migration.
Page assembly (a future PR) will swap routing/imports to the new
components; until then nothing in the live product references the
new directory. This deliberately avoids the
"refactor-everything-in-one-PR" failure mode.

### The eight components

| Component | Purpose | When NOT to use |
|---|---|---|
| **Panel** | Workhorse data card: eyebrow, title, value, status pill, body, optional distribution viz, optional children. `default` and `compact` variants. | If the surface needs steps and a meta footer (use InterventionCard). If it's a snapshot stat (use QuickStat). |
| **QuickStat** | Compact stat tile with eyebrow, value, optional sub-line. | When status, body copy, or a viz is needed. Use Panel. |
| **CompositionBar** | 7-category bacterial breakdown as a stacked horizontal bar plus legend. | For non-bacterial data. The 7 keys are tied to the `--c-*` palette. |
| **SignalChain** | Cross-source pattern reasoning visualized as flex-equal cells with gold connector arrows. | For action recommendations (use InterventionCard). For a single cross-panel paragraph (use ConnectionCard). |
| **InterventionCard** | Renders a registry intervention. `standard`, `escalation`, and affirmation modes. | For non-actionable narrative. |
| **ConnectionCard** | Cross-panel synthesis card with sleep-dusk accent. Inline `ConnectionCard.Biomarker` for biomarker emphasis. | When the content is action-oriented (use InterventionCard). |
| **DistributionViz** | Slim placement track with optional healthy zone, labels, out-of-range indicators. | As a standalone status indicator. Status colors live on the parent Panel. |
| **TrajectoryPanel** | Past samples + recommended retest as a horizontal timeline. | For multi-metric historical data. |

### Why InterventionCard consumes registry data directly

The card accepts a full `Intervention` object rather than individual
props. This is on purpose:

- **No transformation layer.** Anything renderable on the card is a
  property on the registry entry. UI changes don't require schema
  changes; schema changes propagate to the UI without a mapping layer.
- **No prop drilling.** Page-level code passes the registry entry once
  and the card decides what to render based on its variant prop.
- **Trivially testable.** Unit tests can compose intervention fixtures
  and assert rendered output without mocking or shimming a transform.

The trade-off is that the card's contract is locked to the registry
schema. If the schema changes, the card must change — but ADR-0012
already accepted that schema as the source of truth, and the card
honoring it is the point.

### Why ConnectionCard uses `--link-accent` rather than gold

Two card families want to be visually distinct because they mean
different things:

- **Action recommendations** (InterventionCard) — gold left border,
  gold eyebrow. Gold = "this is something to do."
- **Cross-panel synthesis** (ConnectionCard) — sleep-dusk
  (`--link-accent`) left border and eyebrow. Link-accent = "this is a
  connection across data sources."

Mixing the two would dilute both. A user scanning the page should be
able to tell at a glance which surfaces describe state and which
prescribe action.

### Variant patterns

- **Panel.variant**: `default` | `compact`. Compact reduces padding
  and uses `.metric-medium` instead of `.metric-large`. Use compact
  in dense grids; use default everywhere else.
- **InterventionCard.variant**: `standard` | `escalation`. Standard
  renders title/rationale/steps/meta. Escalation renders the
  `intervention.escalation` block (different border color, different
  eyebrow copy). If `variant='escalation'` but the intervention has
  no escalation field, the component renders nothing and warns in dev.
- **InterventionCard.showAffirmation**: a softer treatment that
  renders `intervention.alternativeAffirm` ("you're already doing this
  — good"). Wins over `variant` when both are set.

### CompositionBar future-proofing

The component accepts an optional `onCategoryClick` handler. When
provided, segments become buttons with focus rings and hover states;
without it, the bar is a static `role="img"`. This lets us land the
visual now and enable click-through without a contract change in the
future. The current props mark it future-proof, not "feature-flagged
on" — the page-assembly PR is free to leave it static.

### Mockup references

The reference mockups (`oravi-oral-with-blood.html`,
`oravi-oral-without-blood.html`) live in `/docs/design/` once
committed. The component visuals follow those mockups; the showcase
route exists so visual deviation is reviewable in isolation.

## What this PR does NOT do

- Does not assemble the new oral panel page.
- Does not wire any component to user data.
- Does not modify the existing `/dashboard/oral` route.
- Does not modify `apps/web/app/components/panels/oral/`. Both
  directories coexist.
- Does not change scoring, parser, or DB logic.
- Does not build cross-panel synthesis logic or a narrative engine.
- Does not extend the intervention registry beyond the three seed
  entries from PR 242.

## Accessibility notes

- Status pills always carry text labels; color is never the only
  signal.
- DistributionViz markers are focusable (`tabIndex=0`) with a
  descriptive `aria-label` derived from `position` + `healthyZone`.
- CompositionBar segments become real `<button>`s with `aria-label`s
  when `onCategoryClick` is provided; otherwise the bar is a single
  `role="img"`.
- SignalChain is wrapped in `role="list"` with `role="listitem"`
  children so the cross-source reasoning is navigable by a screen
  reader as a list.
- InterventionCard steps render in a `role="list"` with custom-styled
  bullets; the bullet circles are `aria-hidden`.
- All bullet/swatch decorations are marked `aria-hidden="true"`.
- All status colors meet AA contrast against their backgrounds (the
  status pill uses a 12 % alpha background tint so the foreground
  stays at full token brightness).

## Future work

- Page assembly PR consuming this library.
- Wiring PR connecting components to user data.
- Cleanup PR migrating `panels/oral/` consumers and deleting the
  legacy directory once nothing references it.
- Optional: enable `CompositionBar.onCategoryClick` once the
  drill-down design is finalized.

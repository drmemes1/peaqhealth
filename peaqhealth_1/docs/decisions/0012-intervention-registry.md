# ADR-0012: Intervention registry — schema and seed

Date: 2026-04-28
Status: Accepted (3 seed interventions; thresholds flagged for human review)

## Context

The upcoming oral-panel redesign treats intervention recommendations
as a structured, registry-driven concern rather than scattered
inline copy. Before we build the UI that consumes interventions, we
need:

1. A schema commitment (so UI, narrative engine, and detail pages
   share one shape).
2. Enough seed data that the component library (next PR) can render
   real cases instead of fixture stubs.

## Decision

Create `apps/web/lib/oral/interventionRegistry.ts` with the schema
described in ADR-0012 §"Schema" below and seed it with three
interventions. The evaluator (the function that, given a user,
classifies each registry entry as ACTIONABLE / AFFIRM / HIDDEN /
ESCALATE) is intentionally **not** in this PR — it'll arrive once
the seed registry has been clinically reviewed.

## Schema

Five lifecycle states are derivable from the data:

```
                triggers fire?  gates pass?  doing it?  marker bad?
  ACTIONABLE          ✓             ✓            ✗           —
  AFFIRM              ✓             —            ✓           ✗
  ESCALATE            ✓             —            ✓           ✓
  HIDDEN              ✗             —            —           —
  HIDDEN (excluded)   ✓ (any)       —            —           — + exclusion fires
```

A single `Intervention` carries:

- `triggers` — bacterial state that makes the intervention relevant
  (any-of). E.g. `haemophilus_pct < 5.0` for "address mouth breathing".
- `gates` — user-behavior state required for the intervention to be
  actionable (any-of OR all-of). E.g. `mouthBreathing = true`.
- `exclusions` — disqualifying state (any-of). E.g. an existing CPAP.
- `alternativeAffirm` — copy shown when triggers fire but the user is
  already doing the right thing.
- `escalation` — copy shown when the user is doing it but the marker
  hasn't moved; usually points to a next intervention id.
- `rationale` — one paragraph why.
- `steps` — concrete actions, each renderable as a list item.
- `whatToTrack`, `expectedWeeks`, `retestMarker` — feedback loop.
- `citations` — short refs into the clinical evidence base.

Helpers `bacteria()`, `q()`, `symptom()` produce `Condition` rows
with the right `source` enum so the seed entries stay readable.

## Why the evaluator is its own concern

The evaluator needs:

- Resolution from a `Condition.field` to the actual user value (the
  `bacteria` source maps to `oral_kit_orders.*_pct` columns,
  `questionnaire` maps to lifestyle / questionnaire records, etc.).
- A consistent unit convention across all bacterial sources (see
  threshold-alignment audit below).
- A prior-state model to detect "doing it" vs "just started".
- Tie-breaking when multiple interventions overlap.

All of those are real product decisions. Making them inline alongside
the schema would conflate the data definition with the policy of how
data is read. Splitting now keeps the schema reviewable in isolation.

## The 3 seed interventions and why these specifically

Every other intervention from the design discussions sits behind one
of these three categories of evidence. We seed the strongest example
in each:

1. **`address_mouth_breathing`** (behavioral, strong) — the highest-yield
   modifiable factor that maps cleanly to oral microbiome shifts.
   Carries the full structural shape: triggers, gates, exclusions,
   `alternativeAffirm`, `escalation`. This is the fixture that
   `InterventionCard` will render in the component-library showcase.
2. **`add_dietary_nitrate`** (dietary, strong) — substrate-driven
   pathway. Demonstrates `gates.allOf` (vs `anyOf`) and the
   "you're already doing this" affirmation flow.
3. **`home_sleep_study`** (professional, strong) — exercises the
   `professional` category and shows the registry can recommend an
   action that requires a third party (PCP / DTC sleep test
   provider).

## Threshold-alignment audit (REQUIRED REVIEW)

The brief asks me to cross-check registry trigger thresholds against
`apps/web/lib/oral/thresholds.ts`. Two material discrepancies:

### Discrepancy 1 — unit scale mismatch

- **Registry** (this PR): all bacterial trigger numbers are
  **percentage scale** (e.g. `haemophilus_pct < 5.0` means "less
  than 5.0 %"). The parser writes `oral_kit_orders.*_pct` columns
  in this scale (Igor's Streptococcus = 25.33, etc.), so this is the
  natural language for the rest of the codebase.
- **`thresholds.ts`** (existing): bacterial values are
  **fraction scale** (e.g. `haemophilus: typical_min: 0.03,
  typical_max: 0.15` → "between 3 % and 15 %"). The same number `0.03`
  could mean 0.03 % or 3 % depending on which side you read. The two
  scales differ by 100×.

The two need to be reconciled. **Recommendation**: migrate
`thresholds.ts` to percentage scale and add a one-time CHANGELOG
entry. This PR doesn't change `thresholds.ts` — that's a focused
follow-up.

### Discrepancy 2 — flag boundaries vs trigger sensitivities

Even after normalizing scales, registry triggers fire earlier than
`thresholds.ts` flags in two cases:

| Bacterium | thresholds.ts (% scale) | Registry trigger | Difference |
|---|---|---|---|
| haemophilus | typical_min 3 %, flag_low 3 % | `< 5.0 %` | Registry triggers at typical_min, not flag_low |
| neisseria | typical_min 10 %, flag_low 5 % | `< 10 %` | Registry triggers at typical_min, not flag_low |
| fusobacterium | typical_max 0.5 %, flag_high 1.5 % | `> 1.0 %` and `> 1.5 %` | Registry's `> 1.0` fires before flag_high |
| peptostreptococcus | (not in thresholds.ts) | `> 1.0 %` and `> 2 %` | New entry; thresholds.ts has no row |

This isn't necessarily wrong — interventions may *intentionally*
trigger before the user is "flagged" so the action is preventive
rather than reactive. But the system should make that intent
explicit. **Open question for human review**: do registry triggers
fire at `typical_min` (preventive) or at `flag_low` (reactive)? Pick
one, document, propagate.

The brief is explicit: "do not silently change either side." This
ADR is the surface where the discrepancy is named; the decision is
the user's.

## What this PR does NOT do

- Build the evaluator function (separate PR).
- Wire interventions into any UI surface (the component library
  consumes the schema; assembly is in the page-redesign PR after that).
- Add the other 13 interventions discussed in design. Each will land
  with a citation review in its own PR.
- Reconcile `thresholds.ts` scale or boundaries (separate PR — see
  above).
- Modify the parser, scoring, or any DB schema.

## How future interventions get added

1. Identify the gap (a bacterial pattern with no registered
   intervention).
2. Locate the supporting evidence in
   `docs/clinical-evidence-base/`. If absent, add it first; do not
   coin clinical claims in the registry.
3. Open a PR adding one entry per intervention. Each PR includes
   citations, the trigger thresholds, gates, exclusions, and (ideally)
   an `alternativeAffirm` and `escalation`.
4. The reviewer checks: (a) thresholds match the cited evidence, (b)
   gates are actionable, (c) exclusions don't accidentally hide the
   intervention from people who need it, (d) it doesn't duplicate an
   existing entry.

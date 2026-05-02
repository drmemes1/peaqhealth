# ADR-0022 — Oral microbiome page foundation (PR-γ1)

**Status:** Accepted
**Date:** 2026-05-02

## Context

Two evidence-driven scoring algorithms shipped in the prior cycle —
caries v3 (PRs 244-248, ADRs 0014/0015/0016/0018) and NR-α / NR-β1
(PRs 249-250, ADR-0019/0021) — but no UI surface in `apps/web` reads
the resulting columns on `oral_kit_orders`. The live `/dashboard/oral`
page (treemap, PRs 234-235) consumes only v2 fields
(`ph_balance_api`, `protective_ratio`, etc.). Beyond it, three earlier
abandoned implementations sat in the same directory:
`oral-panel-client.tsx` (staggered 2-column), `oral-panel-v4.tsx`
(plain-language v4), and `CavityEnvironmentSection.tsx` /
`OralTileSection.tsx` (ancillary dead components). None had been
deleted.

Igor's kit (`c033fbae-ab5a-42a5-ace4-f1ac09995338`) is fully classified
in production: `caries_risk_category = compensated_active_risk`,
`nr_risk_category = optimal`. PR-γ1 is the first UI to render that
classification.

## Decision

Build the v3 oral page in an editorial format (hero + section-per-
algorithm + drawers) that grows in place as more algorithms ship. Each
section is its own component; placeholders signal the page's evolution
for algorithms still in development (gum, halitosis, biofilm, cross-
panel synthesis with blood/sleep).

### Page architecture

```
OralPageHero            — eyebrow + H1 + dynamic lede + tagline
SnapshotSection         — three quick stats + composition bar (5 segments)
CariesSection           — risk headline + CLI/CSI/pH cards + flag/confounder badges
NRSection               — two-axis (Capacity + NO Signature) + paradox callout
ComingSoonPlaceholder × — gum / halitosis / biofilm (always); cross-panel (conditional)
TrajectorySection       — "this is your baseline" + 6-month re-test window
ActionsSection          — top 3-4 actions from confounders + risk fallbacks
CompositionDrawer       — top 15 species table
MethodologyDrawer       — 16S + caries v3 + NR-α explainer
ReferencesDrawer        — citation list
```

### Single data loader

`lib/oral/v3/page-data.ts` is the only DB boundary. It returns a
discriminated union (`no_kit | processing | ready`) so the page
renders fallbacks distinctly without sections deciding for themselves.
Sections never query.

### Composition-bar categorization

Five categories drive the bar — `buffering`, `nr_favorable`,
`cariogenic`, `context_dependent`, `unclassified` — backed by a
species-level override map and a genus-level fallback in
`lib/oral/v3/composition-categories.ts`. Multi-species OTU keys (e.g.
`Neisseria mucosa-perflava-subflava`) are split on `-` and matched
against any alternative.

Categories grow as new algorithms ship. Existing classifications stay
stable.

### Two-axis NR display (honest)

NR Capacity (biomass) and NO Signature (Vanhatalo composition pattern)
surface as separate cards. They are not collapsed into one number —
the disagreement between them is the most actionable signal NR-α
produces. The paradox flag (substantial biomass, unfavorable
composition) renders as a distinct callout above the cards when true.
The NO Signature card carries an italic footnote calling out that its
thresholds are derived from reported abundances rather than directly
published predictor cutoffs.

### Conditional sections

Cross-panel placeholders (`Cross-panel synthesis`, `Sleep × oral
signal chains`) render only when the underlying upstream data is
absent (`!has_blood_data`, `!has_sleep_data`). Once those panels
exist, the placeholders go away naturally.

### Dynamic lede

`lib/oral/v3/lede-generator.ts` writes the hero copy from caries +
NR risk categories, with branches for each realistic combination plus
partial-classification fallbacks. The voice describes what we observe
and never overpromises.

## Discovery output (Part 0)

**Live entry point:** `app/dashboard/oral/page.tsx` →
`oral-panel-treemap.tsx` (treemap). v2-data only.

**Dead code in the dir:**

- `oral-panel-client.tsx` — staggered 2-column panel, replaced by treemap on Apr 30
- `oral-panel-v4.tsx` — earlier "plain language v4", abandoned in March
- `CavityEnvironmentSection.tsx` — only consumed by `oral-panel-client`
- `OralTileSection.tsx` — `<TileGrid panel="oral">` shim, never imported
- `app/components/panels/oral/{Treemap,PositionSidebar,CrossPanelConnection,InterpretationCards,TrajectorySection,DeepDiveDoors}.tsx` — only consumed by treemap
- `app/components/oral/{EcoCard,SignalCard,HeroLine,ExploreHint,OralSortControls}.tsx` — only consumed by abandoned v4
- Legacy `computeHalitosisScore` block in `lib/oral/halitosisScore.ts` — only consumed by abandoned v4

**Preserved:** `app/dashboard/oral/[classification]/page.tsx` — marker
detail subroute (out of scope).

**Disposition:** all dead files deleted (git history is the safety
net). No `*-legacy.tsx` shims — they would clutter the directory and
reduce confidence the new code is the canonical surface.

## Validation

Igor's kit renders correctly:
- Hero lede: "active pressure / nitric oxide pathway is strong" branch
- Caries section: "Active challenge, held in check" with three
  metric cards (CLI 0.745 elevated, CSI 100 robust, API 0.055 well
  buffered) and a "Synergy active" flag badge
- NR section: "Optimal nitric oxide pathway" with two cards
  (Capacity 54.4 robust, NO Signature 2.04 favorable) and no paradox
  callout
- Composition bar: five segments with species coverage proportional
  to detected abundances; clicks deep-link `/explore?category=...`
  via the `COMPOSITION_TO_FILTER` map

## Future work

| Algorithm | Effect on this page |
|---|---|
| Gum stability (PR-Δ) | Replaces `ComingSoonPlaceholder("Gum stability")` with a section, adds `periodontal` + `red_complex` composition categories |
| Halitosis (PR-Ε) | Replaces halitosis placeholder, adds `vsc_producing` category |
| Biofilm maturity | Replaces biofilm placeholder; surfaces early/late colonizer ratio |
| Translocation indicator | Composite section, no new placeholder needed |
| Inflammatory pattern | Composite section |
| Blood cross-panel (PR-Z) | Removes "Cross-panel synthesis" placeholder when `has_blood_data` |
| Sleep cross-panel (PR-H) | Removes "Sleep × oral" placeholder when `has_sleep_data` |
| Questionnaire signal-chain inference engine | Powers richer Actions surface |

## Non-goals

- No algorithm changes — `caries-v3.ts` and `nr-v1.ts` are read-only
- No parser changes
- No new scoring modules
- No marker-detail page changes (`[classification]/`)
- No blood-page changes (parallel work)

## References

- ADR-0014 — caries v3 scoring foundation
- ADR-0019 — NR scoring architecture (two-axis honest framing)
- ADR-0021 — NR-β1 pipeline integration
- Vanhatalo A, et al. 2018, Free Radic Biol Med — composition signature
- Liddle B, et al. 2020 — ADS-active commensals

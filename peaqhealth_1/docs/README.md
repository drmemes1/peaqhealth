# Peaq Docs — Master Index

Home base for all Peaq documentation. Start here when you need to find or update anything.

**Last updated:** 2026-04-24

---

## Making changes?

**Start with [UPDATE_RUNBOOK.md](./UPDATE_RUNBOOK.md).** It tells you exactly where to go for any kind of change, with step-by-step workflows for the most common updates.

---

## Insight Module (the core product)

| File | Purpose | Edit when… |
|---|---|---|
| [INSIGHTS.md](./INSIGHTS.md) | Connection rules engine — what to fire | Adding/changing cross-panel connections or thresholds |
| [INSIGHT_COMPOSITION_GUIDE.md](./INSIGHT_COMPOSITION_GUIDE.md) | How to write user-facing content — voice, style, evidence, borderline phrasing | Brand voice changes, new citation rules, borderline phrasing updates |
| [CONNECTION_LINE_PATTERN.md](./CONNECTION_LINE_PATTERN.md) | Implementation pattern for connection line evaluation | Changing how `evaluateConnection` works in code |
| [UPDATE_RUNBOOK.md](./UPDATE_RUNBOOK.md) | How to update any of the above | First stop for any change |

## Clinical Evidence

| File | Purpose | Edit when… |
|---|---|---|
| [clinical-evidence-base.md](./clinical-evidence-base.md) | Source of truth for clinical claims | Adding a new cited mechanism |
| [clinical-evidence-base-halitosis.md](./clinical-evidence-base-halitosis.md) | Halitosis-specific evidence (extends main) | Halitosis-specific additions |
| [HRV.md](./HRV.md) | HRV evidence base + formula reference | Formula or HRV-specific evidence changes |

## Brand & Design

| File | Purpose |
|---|---|
| [BRAND.md](../BRAND.md) | Brand identity and positioning |
| [DESIGN.md](../DESIGN.md) | Design system v2.0 |

## Ops & Compliance

| File | Purpose |
|---|---|
| [PHI_FLOW.md](./PHI_FLOW.md) | PHI data flow audit (pre-HIPAA phase) |
| [db-field-usage-audit.md](./db-field-usage-audit.md) | DB column usage audit |
| [saliva-collection-protocol.md](./saliva-collection-protocol.md) | Sample collection SOP |
| [QUESTIONNAIRE_CROSS_REFERENCE.md](./QUESTIONNAIRE_CROSS_REFERENCE.md) | Questionnaire → product field mapping |

## Source-of-Truth Prompts (live in code)

Some prompts are authoritative in code, not docs:

| Prompt | Location | Version |
|---|---|---|
| Oral narrative system prompt | `apps/web/app/api/oral/narrative/route.ts` | v9 |
| Insight generation system prompt | `apps/web/app/api/labs/insight/route.ts` | (see file) |

When updating these, bump the version in the code comment and note it in the relevant doc's change log.

## Archive

Historical implementation docs live in [docs/archive/](./archive/). Not maintained.

---

## Quick "where do I go?" reference

- **Editing an insight connection?** → INSIGHTS.md
- **Editing how insights read?** → INSIGHT_COMPOSITION_GUIDE.md
- **Editing a prompt that lives in code?** → Update the route file, bump version, note in the doc's change log
- **Adding a new clinical mechanism?** → clinical-evidence-base.md first, then INSIGHTS.md
- **Not sure?** → UPDATE_RUNBOOK.md, or ask before creating a new .md file

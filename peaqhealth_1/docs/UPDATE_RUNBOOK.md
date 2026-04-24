# How to Update the Insight Module

**Purpose:** This runbook tells you exactly where to go when you want to update, add, or change anything about the insight module. Use it as your first stop.

**Rule of thumb:** If you can't find where something belongs in under 30 seconds, stop and ask. Adding content to the wrong file is how drift starts.

---

## How to use this runbook

When you want to make a change, you have two entry points:

**Entry point 1 — You know what you want to change:**
Tell Claude Code: "Read `docs/UPDATE_RUNBOOK.md` and help me [your change]. Follow the steps in the runbook exactly."
Claude Code will open this runbook, find the matching row in the decision table, and execute the steps.

**Entry point 2 — You're not sure what you want or where it goes:**
Start a chat with Claude (the main assistant, not Claude Code). Describe the change in your own words, even if it's messy. Claude will help you figure out what files to touch and produce the Claude Code prompt to execute it.

**The three layers:**
1. Claude (chat) — strategy and translation
2. This runbook — source of truth for where things go
3. Claude Code — execution

---

## Quick decision table

| What you want to change | Go here | Also update |
|---|---|---|
| A cross-panel connection (add, retire, change trigger) | `INSIGHTS.md` | Change log |
| A threshold (cutoff values, ranges) | `INSIGHTS.md` + relevant code file | Change log + `clinical-evidence-base.md` if new citation |
| How an insight reads (word choice, tone, sentence structure) | `INSIGHT_COMPOSITION_GUIDE.md` Section 1 or 2 | Change log |
| A citation rule (what sources count, how to cite) | `INSIGHT_COMPOSITION_GUIDE.md` Section 3 | Change log |
| Borderline value phrasing | `INSIGHT_COMPOSITION_GUIDE.md` Section 4 | — |
| Borderline value threshold logic | `INSIGHTS.md` | Change log |
| A new clinical mechanism | `clinical-evidence-base.md` FIRST → then `INSIGHTS.md` | Both change logs |
| A new banned term or disease word | `INSIGHT_COMPOSITION_GUIDE.md` Section 1 | Change log |
| The oral narrative system prompt | `apps/web/app/api/oral/narrative/route.ts` (inline) | Bump version in code comment + note in `INSIGHTS.md` change log |
| The insight generation system prompt | `apps/web/app/api/labs/insight/route.ts` (inline) | Bump version in code comment + note in `INSIGHTS.md` change log |
| HRV formula or evidence | `HRV.md` | — |
| A connection line pattern | `CONNECTION_LINE_PATTERN.md` + code | — |
| Halitosis-specific evidence | `clinical-evidence-base-halitosis.md` | — |
| Brand voice or positioning | `BRAND.md` | May cascade → `INSIGHT_COMPOSITION_GUIDE.md` |
| Design system | `DESIGN.md` | — |
| PHI flow change | `PHI_FLOW.md` | — |
| DB schema / field usage | `db-field-usage-audit.md` | — |
| Lab collection protocol | `saliva-collection-protocol.md` | — |
| Questionnaire field mapping | `QUESTIONNAIRE_CROSS_REFERENCE.md` | — |

---

## The five most common updates — step by step

### 1. Adding a new cross-panel connection

Example: "Fire an insight when low oral Shannon diversity + elevated hsCRP appear together."

1. Check `clinical-evidence-base.md` — is the mechanism cited? If not, add it with PMID/citation first.
2. Open `INSIGHTS.md` — add the connection: trigger conditions, approved mechanism reference, severity.
3. If new phrasing is needed, update `INSIGHT_COMPOSITION_GUIDE.md`. Most connections reuse existing voice rules.
4. Regenerate insights for a test user whose data triggers the new connection. Review with Igor or Narod.
5. Change log entry in `INSIGHTS.md`.

### 2. Changing how insights sound

Example: "Insights are too clinical — warm them up."

1. Open `INSIGHT_COMPOSITION_GUIDE.md` Section 1. Add the rule with bad + good examples. Be specific.
2. Update the system prompt in `apps/web/app/api/labs/insight/route.ts` to reflect the new rule. Bump prompt version.
3. Regenerate insights for two test users with different data profiles. Compare before/after.
4. Change log entry in `INSIGHT_COMPOSITION_GUIDE.md`.

### 3. Adding a new clinical mechanism

Example: "New paper on Prevotella copri → insulin resistance."

1. `clinical-evidence-base.md` FIRST — add mechanism with full citation (PMID, journal, year, effect size).
2. Open `INSIGHTS.md` — add/extend connection referencing the new mechanism by name.
3. If phrasing requirements are specific, add to `INSIGHT_COMPOSITION_GUIDE.md` Section 3.
4. Update approved mechanism list in `apps/web/app/api/labs/insight/route.ts`.
5. Change logs in all three files.

### 4. Updating a threshold

Example: "Borderline hsCRP should be 1.0–3.0 mg/L, not 2.0–3.0."

1. Check evidence — citation for the new threshold? Note in `clinical-evidence-base.md`.
2. `INSIGHTS.md` — update the threshold, bump version.
3. Check code — thresholds may live in `connections.ts`, `peaqAge.ts`. Update there too. Doc and code must match.
4. Change log in `INSIGHTS.md`.

### 5. Retiring an insight or connection

Example: "The Lp(a) + sleep insight isn't clinically defensible — kill it."

1. Do NOT delete from `INSIGHTS.md`. Move to a "Retired Connections" section at the bottom with date + rationale.
2. Remove trigger logic from the code.
3. Remove mechanism references from the system prompt if no longer used elsewhere.
4. Change log in `INSIGHTS.md`.

---

## Ground rules

1. **Evidence base is the gate.** No mechanism goes into an insight without living in `clinical-evidence-base.md` first.
2. **Connection rules (what) vs. composition (how) are separate.** What to fire → `INSIGHTS.md`. How to write it → `INSIGHT_COMPOSITION_GUIDE.md`.
3. **Code and docs must match.** If a rule lives in both docs and `route.ts`, they must agree. Update both in the same commit.
4. **Every edit gets a change log entry.** Date, version bump, one-line description. No exceptions.
5. **Flag conflicts, don't resolve them silently.** Use `<!-- CONFLICT: ... -->` and surface to Igor/Narod.
6. **Don't create new .md files without a reason.** Can it live as a section in an existing file? Usually yes.
7. **Version everything that matters.** Bump on substance changes, not typos.

---

## When you're not sure where something goes

Ask in this order:

1. Is this a clinical claim? → `clinical-evidence-base.md`
2. Is this about when to fire an insight? → `INSIGHTS.md`
3. Is this about how an insight reads? → `INSIGHT_COMPOSITION_GUIDE.md`
4. Is this a prompt the model uses directly? → The `route.ts` file + note version in the relevant doc
5. Still not sure? → Ask before creating a new file.

---

## Quarterly maintenance

Once a quarter, 30 minutes:

- **Drift check:** `grep -rn "INSIGHTS.md\|INSIGHT_COMPOSITION_GUIDE" .` — any broken links?
- **Version sync:** do code prompt versions match the docs?
- **Change log review:** read the last quarter of entries. Anything retired that should be removed? Anything still flagged as CONFLICT?
- **Archive pass:** anything in `/docs` not touched in 6+ months and not referenced? Archive it.

---

## Improving this runbook

**When Claude Code gets confused or asks a question this runbook should have answered, come back and update the runbook.** One new row or worked example. Takes 5 minutes. Over time this becomes exhaustive and the system runs itself.

---

## Change Log

- `2026-04-24 — v1.0 — Initial runbook created alongside doc restructure.`

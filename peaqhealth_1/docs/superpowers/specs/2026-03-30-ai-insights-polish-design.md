# AI Insights Polish — Design Spec
**Date:** 2026-03-30  
**Status:** Approved

## Overview

Four targeted improvements to make AI insights across the Peaq Health platform consistent, individually tailored, and premium without being pushy or giving medical advice. Uses "consider" / "this has shown" / "research has linked" framing throughout.

---

## Fix 1 — Oral panel: priority label remapping

**File:** `app/dashboard/oral/oral-panel-client.tsx`

The findings section renders raw internal priority labels (`CRITICAL`, `HIGH`) directly on screen. These are alarmist and clinical. Replace with warm, observational descriptors.

**Mapping:**

| Internal label | Display label |
|---|---|
| `CRITICAL` | `Notable signal` |
| `HIGH` | `Worth discussing` |
| `MEDIUM` | `Worth monitoring` |
| `LOW` | `Interesting pattern` |
| `POSITIVE` | `Strong signal` |

**Implementation:** Add a `PRIORITY_DISPLAY` map in `oral-panel-client.tsx` and replace `{f.priority}` with `{PRIORITY_DISPLAY[f.priority] ?? f.priority}` in the findings render. No logic changes — display only.

---

## Fix 2 — Oral panel: AI-generated narrative (new endpoint)

### New file: `app/api/oral/narrative/route.ts`

Mirrors `app/api/trends/sleep-narrative/route.ts` in architecture.

**Data inputs fetched:**
- `oral_kit_orders`: `shannon_diversity`, `oral_score_snapshot` (nitrateReducerPct, periodontalBurden, osaBurden, pGingivalisPct), `collection_date`, `ordered_at`
- `score_snapshots`: `blood_sub`, `modifiers_applied` (cross-panel context)
- `sleep_data` (last 7 nights): avg HRV, avg efficiency
- `lifestyle_records`: `age_range`, `sex`, `mouthwash_type`

**Caching:** New `oral_narratives` table, keyed on `user_id + collection_date`. If `collection_date` is null, fall back to the date portion of `ordered_at`. Stale threshold: 7 days. If cache hit and age < 7 days, return cached. Regenerate only when a new kit is processed.

**Output schema:**
```json
{
  "headline": "6–10 words, specific to this user's oral data, warm",
  "narrative": "2–3 sentences. Actual numbers. Cross-panel connection if data supports it.",
  "positive_signal": "One genuine strength with number — or null",
  "watch_signal": "One thing worth monitoring, framed with curiosity — or null"
}
```

**AI model:** `gpt-4.1-mini` (same as other narrative endpoints), temperature 0.65, max_tokens 400, `store: false`.

**System prompt voice rules:**
- Warm, direct, like a knowledgeable friend
- Specific — use actual numbers
- Never alarming — observational and curious
- "Consider" for actions, not "you should"
- "Research has shown" / "this has been linked to" for mechanism language — never "causes"
- If mouthwash detected: mention once, gently — "antiseptic mouthwash can suppress nitrate-reducing bacteria"
- Never cite raw burden percentages — use qualitative descriptors only (mildly elevated, within target, etc.)
- Never mention disease, diagnosis, or treatment
- Never say "you should" — "consider" or "worth exploring" only
- Cross-panel connection to HRV/blood only when data supports it; never forced

**Approved biological relationships:**
- Oral nitrate-reducing bacteria → nitric oxide availability (not "cardiovascular protection" directly)
- Periodontal burden → systemic inflammation / hsCRP
- Shannon diversity → microbiome resilience

**Fallback:** If API fails or returns invalid JSON, the oral panel falls back to the existing hardcoded `generateOralNarrative()` function. No hard error shown to user.

### UI changes: `app/dashboard/oral/oral-panel-client.tsx`

- Remove the `generateOralNarrative()` call from the render
- Add a `useEffect` that fetches `/api/oral/narrative` on mount
- Show a skeleton (italic placeholder text, Cormorant Garamond) while loading
- On success: render an AI narrative card above the metric cards — same structure as the sleep narrative card on Trends:
  - Headline (italic, 15–16px, Cormorant Garamond)
  - Narrative body (12px, Instrument Sans, line-height 1.65)
  - Positive signal pill (green) + watch signal pill (amber), if present
- On error / null response: fall back to `generateOralNarrative()` silently

### New Supabase table: `oral_narratives`

```sql
create table oral_narratives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  collection_date date not null,
  generated_at timestamptz not null default now(),
  headline text,
  narrative text,
  positive_signal text,
  watch_signal text,
  oral_context jsonb,
  blood_context jsonb,
  sleep_context jsonb,
  raw_response jsonb,
  unique (user_id, collection_date)
);
```

---

## Fix 3 — Sleep narrative: age & sex context

**File:** `app/api/trends/sleep-narrative/route.ts`

The `lifestyle_records` query already runs in this endpoint (fetches `exercise_level`, `stress_level`, `age_range`, `mouthwash_type`). Add `sex` to the select.

**Changes to user prompt:** Add two lines after exercise/stress:
```
- User age range: {age_range ?? "not provided"}
- User sex: {sex ?? "not provided"}
```

**Changes to system prompt:** Add one rule:
> "If age range is provided, contextualize HRV relative to their age group. A 43ms HRV is within range for a 40–50 year old; the same number is below target for a 25–35 year old. Never invent age-specific thresholds — only reference the ones provided in the user prompt."

The age-adjusted HRV thresholds are already computed in the score engine (`lib/score/recalculate.ts`) and can be referenced for context. Pass the age-adjusted target into the prompt alongside the raw HRV:

```
- Avg HRV: 43.2 ms (age-adjusted target for 40–50: 48ms)
```

This requires reading the age_range from lifestyle_records and mapping it to the score engine's HRV thresholds to compute the target before building the prompt.

---

## Fix 4 — Blood insights: voice tightening

**File:** `app/api/labs/insight/route.ts`

Three additions to `SYSTEM_PROMPT`:

**1. Add to approved language section:**
```
- Use "consider" for action suggestions: "consider increasing leafy greens" not "you should eat more vegetables"
- Use "this has shown" or "research has shown" for mechanism references
- Use "this has been linked to" when referencing biological relationships
```

**2. Add to BANNED LANGUAGE section:**
```
- "could be beneficial and is worth" — pick one: either "is beneficial" or "is worth exploring", never both
- "may be worth considering" — use "worth considering" directly (one hedge maximum)
- If the same value appears in two cards, use identical language both times — never describe HRV as "strong" in card 1 and "above average" in card 2
```

**3. Add consistency anchor rule:**
```
CONSISTENCY RULE: If you reference the same biomarker or metric in more than one card, use identical descriptive language for it in every card. Inconsistent labeling of the same value undermines trust.
```

---

## Files changed summary

| File | Change type |
|---|---|
| `app/dashboard/oral/oral-panel-client.tsx` | Edit — label remap + fetch AI narrative |
| `app/api/oral/narrative/route.ts` | New — oral narrative endpoint |
| `app/api/trends/sleep-narrative/route.ts` | Edit — add age/sex to prompt |
| `app/api/labs/insight/route.ts` | Edit — tighten voice rules |
| Supabase migration | New table `oral_narratives` |

---

## Non-goals

- No changes to scoring logic
- No changes to the weekly snapshot
- No changes to the dashboard page itself
- No refactoring of existing narrative endpoints (blood/sleep) beyond the targeted prompt edits

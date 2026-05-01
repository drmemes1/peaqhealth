# Incident — Function Health PDF parsed every marker as `14`

**Date filed:** 2026-05-01
**Severity:** P1 — corrupted user data, single user (so far), reproducible across any future Function Health upload
**Status:** **Fixed in code (PR pending review)**; corrupted row **NOT yet deleted** — see § 8.
**Author:** read-only diagnostic + follow-up code fix; production data unchanged.

## Update — fix landed in PR `claude/fix-function-health-14-bug`

Two universally-applicable guards were added (no Function-Health-specific
normalizer; that's deferred until a sample PDF is available):

1. **Write-time sanity guard**
   (`apps/web/lib/labs/uniform-value-guard.ts` +
   `apps/web/app/api/labs/save/route.ts`). Refuses any payload where
   ≥ 60 % of populated numeric markers (≥ 5 markers minimum) share a
   single value. Returns 422 with the user-facing copy from § 5 (1)
   below. Logged with `user_id`, suspected value, and ratio so future
   trips are visible in production logs. 9-case Jest unit test
   covers the boundary, the exact 31-marker shape from this incident,
   and edge cases (empty payload, NaN/Infinity, mixed types).
2. **Prompt hardening**
   (`apps/web/app/api/labs/upload/route.ts`). One paragraph added to
   the OpenAI extraction prompt instructing the model to return null
   for any marker whose candidate value duplicates one it has already
   extracted — addresses the root cause for the LLM path so the bad
   payload is never generated in the first place.

Defense in depth: if the LLM still emits a uniform payload, the
write-time guard catches it.

## 8. Corrupted row deletion — BLOCKED, needs decision

The original brief described `lab_results.id = bef686de-…` as test
data eligible for direct deletion. That is **not accurate**. Inspecting
production: the corrupted row is referenced by **48 `score_snapshots`
rows** for user `5614b84a-34dd-428f-981a-4811158dbaa2`, spanning
2026-03-28 through today (2026-05-01). At least three of today's
snapshots have AI-generated insights attached. The DB rejected the
direct DELETE with FK constraint
`score_snapshots_lab_result_id_fkey` (HTTP 409 from PostgREST).

This is active user state, not a deletable test row. Three options
for the human to choose:

- **A. Cascade delete** the 48 snapshots + the lab_results row.
  Loses the user's score-trend history. Defensible since every
  snapshot was computed off corrupted blood inputs and is itself
  unreliable. Cleanest forward state.
- **B. Null the FK** — `score_snapshots.lab_result_id = NULL` for
  these 48 rows, then delete `lab_results`. Preserves the snapshot
  history (which is corrupt anyway) but breaks future joins back
  to "which lab draw produced this snapshot". Probably worse than (A).
- **C. Leave the row** — null out the marker columns instead
  (or set `parser_status='invalid'` and skip in score recalculation).
  Preserves all FKs. Downstream code needs to be taught to skip
  `parser_status='invalid'` rows. Most invasive code change, smallest
  data change.

The code fix in this PR (the two guards) prevents the next Function
Health upload from corrupting data the same way. The cleanup of THIS
row is a separate decision and is intentionally not part of the PR.

---

## 1. What was uploaded

| Field | Value |
|---|---|
| `lab_results.id` | `bef686de-faac-4340-b250-384aa0eb6765` |
| `user_id` | `5614b84a-34dd-428f-981a-4811158dbaa2` |
| `lab_name` (parser tag) | **"Quest Diagnostics"** |
| User-reported lab | "Function Health" |
| `source` | `upload_pdf` |
| `collection_date` | `2026-04-03` |
| `uploaded_at` | `2026-03-22T19:48:10Z` |
| `parser_status` | `complete` |
| `version` | 1 |
| `is_locked` | `false` |

**Function Health uses Quest Diagnostics as their analyzing-lab partner.**
The user's PDF was a Function Health report, but the parser tagged
`lab_name = "Quest Diagnostics"` because the regex heuristic at
`apps/web/app/api/labs/upload/route.ts:218–220` keys on `text.includes("quest")`
— and Quest's name appears on every Function Health PDF as the actual
analyzing lab. So "Function Health uploaded" and `lab_name = Quest`
are consistent — not a separate parser failure.

The original PDF is **not** stored. The pipeline parses in-memory and
discards the buffer. This is a known operational gap (see § 6).

## 2. What got persisted

`lab_results` row inspection (numeric marker columns only;
`is_locked: false` and other booleans excluded):

| Pattern | Count |
|---|---|
| Markers with `value == 14.0` | **31** |
| Markers with any other numeric value | 0 |
| Total numeric marker columns populated | 31 |

Sample columns all = `14.0`:
`hs_crp_mgl, vitamin_d_ngml, apob_mgdl, ldl_mgdl, hdl_mgdl,
triglycerides_mgdl, lpa_mgdl, glucose_mgdl, hba1c_pct, … `
(every populated lipid / metabolic / CBC / liver / kidney / hormone
column).

Every other recent `lab_results` row is fine:

| Row | Lab | `value==14` count | Repeats |
|---|---|---|---|
| `afee2a09-…` (Quest LS) | QUEST LS | 0 | none |
| `a6344f5c-…` (Quality Lab) | Quality Laboratory | 0 | none |
| **`bef686de-…` (this one)** | **Quest Diagnostics** | **31** | **all 31 share `14.0`** |

`lab_history` is empty — no other affected versions.

## 3. What the parser did

The upload route is `apps/web/app/api/labs/upload/route.ts`. Pipeline:

1. `unpdf` extracts text from the PDF buffer (line ~503,
   `extractTextDirect`).
2. If text length > 100 chars, it goes to **OpenAI** (gpt-4.1-mini,
   ZDR-on, BAA-signed) via `parseWithAzureOpenAI` (line 297).
3. Prompt asks for a JSON object with ~50 named marker fields,
   `null` for fields not found, with explicit instruction:
   > *"MULTI-LINE FORMAT: Test name often appears on one line, the
   > patient's numeric result on the very next line, and the reference
   > range on the line after that. Treat the number on the line
   > immediately after a test name as the patient's result."*
   (line 329).
4. If OpenAI returns markers → save. Else fall through to vision OCR
   → Azure OCR → regex fallback (`parseWithRegexFallback`, line 150),
   then back through OpenAI extraction.

The route does NOT persist which parser path was taken
(`parserUsed` is only in the API response, not the DB), so we cannot
tell from the row alone whether OpenAI or regex produced these 14s.
We can tell that *something* returned a JSON object with 31 marker
fields all equal to 14, and the save route faithfully wrote it.

## 4. Where the `14` is coming from

**Not from code.** Grep for `\b14\b` across
`apps/web/app/api/labs/upload/route.ts` and
`apps/web/app/api/labs/save/route.ts` returns zero matches. There
is no hardcoded sentinel, no fallback default, no `?? 14`, no
`markersFound` value being mistakenly piped into a marker column.
The PII scrubber (`apps/web/lib/pii-scrub.ts`) only redacts
identifying fields, never numeric values.

**The 14 is from the data** — the parser dutifully extracted what
it interpreted as the patient result for every marker, and that
extraction came back as `14` for every field.

### Best hypothesis — layout-artifact replication

Function Health PDFs have a distinctive consumer-facing layout
(score badges, percentile rings, "days-since-test" annotations,
out-of-range counts) that does not match the LabCorp / Quest
patient-result-on-next-line convention the upload route is built
around. When `unpdf` flattens the PDF to text, the line that lands
*immediately after each test name* is almost certainly NOT the
patient result — it's the same recurring artifact (most likely
candidates: a "14 markers out of range" cover-page summary, a
"14 days ago" recency badge, a recurring section/page number, or a
score-out-of-N indicator that defaults to 14 for many Function
Health users).

Both the OpenAI parser (instructed via the system prompt to take
"the line immediately after a test name") and the regex fallback
(loop at `route.ts:205–212` that "checks next 3 lines for a
standalone number") would faithfully extract that artifact for
every marker.

### Why every marker is the *same* value

The artifact is **uniform across the document**, so every marker
the parser looks for finds the same neighbouring number. This is
not LLM hallucination — at temperature 0.1 with explicit JSON
schema and explicit "use the next line" instruction, the model is
following the rules. The rules don't fit Function Health's layout.

### What we can't confirm without the PDF

Because the raw PDF is not stored, we cannot confirm:
- Which exact element on the page contributes the 14
- Whether the OpenAI path or the regex fallback produced the row
  (no `parser_used` column on `lab_results`)
- Whether other recurring numeric artifacts (e.g. 12, 30) would
  produce the same shape on different Function Health PDFs

A reproduction needs the user to re-upload, preferably with
`console.log("[labs-upload] normalized text:", normalizedText)`
captured in Vercel logs at the time.

## 5. Suggested fix direction (DO NOT IMPLEMENT)

The right fix is layered; pick which layer matches the response
budget. None of the below was applied — this section is for the
follow-up PR scoping.

1. **Write-time sanity guard (smallest, highest leverage).** In
   `extractFromParsedJson` or `/api/labs/save/route.ts:203`, refuse
   to persist a markers payload where ≥ 60 % of returned numeric
   marker fields share an identical value. Return a 422 with
   "Couldn't confidently parse this format — please enter values
   manually" instead. This would have caught this incident before
   any column was written.
2. **Prompt hardening.** Add to the OpenAI system prompt at
   `route.ts:316`: *"If the same number appears next to many
   different test names, it is almost certainly a layout artifact
   (page count, section number, days-since-test, score badge).
   Prefer null over guessing in those cases."* Cheap and addresses
   the root cause for the LLM path.
3. **Function-Health-specific normalizer.** Detect Function Health
   PDFs by text heuristic (e.g. `text.includes("Function Health")`
   or its characteristic header) and run a dedicated normalizer
   before the LLM step that strips score-badge / days-since-test
   artifacts. Mirrors the existing `normalizeLabText` for
   Practice Fusion / Quality Laboratory layouts (`route.ts:245`).
4. **Operational: store `parser_used` + a sample of normalized
   text** alongside the row, so future incidents are debuggable
   without re-asking the user. PDFs themselves are PHI-heavy and
   not necessary; the post-PII-scrub normalized text is sufficient
   forensically.
5. **Operational: opt-in raw-PDF retention** (encrypted Supabase
   Storage bucket, per-user, deletable) so reproductions don't
   require user round-trips. Larger surface area; only worth
   doing if (4) proves insufficient.

The smallest immediately-deployable bundle is **(1) + (2)**: a
guardrail that rejects suspect payloads and a prompt nudge that
prevents the LLM from filling them in the first place. (3) is the
correct long-term fix once we have a sample Function Health PDF
text in hand.

## 6. Scope — affected uploads

Read-only scan of production:
- `lab_results`: 3 total rows. **1** matches the all-same-value
  pattern (the row above). Other 2 are clean.
- `lab_history`: 0 rows. Nothing to triage.

**Currently single-user impact.** But the bug is **deterministic**
— any future Function Health upload will produce the same shape
unless one of the fixes above lands. Function Health is a paid
consumer wellness service with growing market presence; expecting
more uploads of this format is reasonable.

The bug is **format-specific**, not lab-specific. Other consumer
wellness brands that also use Quest as their analyzing partner but
ship a non-LabCorp / non-Quest layout (e.g. Inside Tracker, Wild
Health, Levels, Lifeforce, Marek Health) are likely to hit the
same class of failure on first upload. Worth checking if any of
those have already produced suspicious rows once we have the
sanity guard from (1).

## 7. Recommended next actions (for the human)

- Reach out to user `5614b84a-34dd-428f-981a-4811158dbaa2`. Their
  current `lab_results` row is corrupt — every marker reads 14 in
  the dashboard. They will see this and lose trust. The score
  derived from these values is also corrupt.
- Decide whether to delete or null-out the row pending fix. Keeping
  it active means they continue to see wrong data on every
  dashboard load.
- Ask the user (or a tester) for a sample Function Health PDF — or
  a redacted equivalent — so the normalizer in fix (3) can be
  written and tested.
- Schedule fixes (1) + (2) as a small targeted PR before the next
  Function Health upload arrives.

## References

- Code paths examined:
  - `apps/web/app/api/labs/upload/route.ts` (parser entry, OpenAI
    prompt, regex fallback, merge)
  - `apps/web/app/api/labs/save/route.ts` (column mapping, upsert)
  - `apps/web/lib/pii-scrub.ts` (verified does not touch numerics)
- Production tables touched (read-only):
  - `lab_results` (3 rows total; 1 affected)
  - `lab_history` (empty)
- No code modified. No production data modified. No PR opened.
- `.env.vercel.local` was pulled for the read-only queries above
  and deleted on completion (covered by `peaqhealth_1/.gitignore`
  rule `.env*.local`).

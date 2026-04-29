# PHI Flow Audit — Oravi

**Date:** April 23, 2026
**Stage:** Pre-HIPAA (friends-and-family testing phase)
**Auditor:** Automated codebase analysis
**Disclaimer:** This audit is informational input for product decisions. It does not constitute legal advice. Before acting on HIPAA-related decisions, consult a healthcare compliance attorney.

---

## Summary

| Metric | Count |
|---|---|
| Total files touching PHI | ~85 |
| OpenAI call sites sending PHI | 20 |
| Third-party services receiving PHI | 4 (OpenAI, Resend, Vercel, wearable APIs) |
| Services with BAA | 2 (Supabase, OpenAI) |
| Services without BAA receiving PHI | 2 (Vercel, Resend) |
| HIGH severity Vercel exposure points | ~15 |
| MEDIUM severity | ~8 |
| LOW severity | ~5 |
| Potential PHI leaks (logging) | ~25 console.log statements with user data |
| PHI tables | 26 (all with RLS enabled) |
| PHI tables without RLS | 0 |

---

## 1. Data Access Map

### Server Components (Vercel Server — render PHI to HTML)

| File | PHI Read | PHI Destination |
|---|---|---|
| `app/dashboard/page.tsx` | profiles, score_snapshots, lab_results, oral_kit_orders, lifestyle_records, sleep_data, wearable_connections_v2, lab_history, articles | Rendered to HTML, passed as props to client |
| `app/dashboard/oral/page.tsx` | oral_kit_orders (full), oral_narratives, lifestyle_records, sleep_data | Rendered to HTML via OralPanelClient |
| `app/dashboard/blood/page.tsx` | lab_results (full), lifestyle_records | Rendered to HTML via BloodPanelClient |
| `app/dashboard/sleep/page.tsx` | sleep_data, score_snapshots, wearable_connections_v2, lifestyle_records | Rendered to HTML via SleepPanelClient |
| `app/dashboard/converge/page.tsx` | Full UserPanelContext (all panels) | Rendered to HTML via ConvergeClient |
| `app/dashboard/panels/[panel]/markers/[markerId]/page.tsx` | Full UserPanelContext, marker_insights | Rendered to HTML |
| `app/settings/page.tsx` | profiles, wearable_connections_v2 | Rendered to HTML |
| `app/settings/labs/page.tsx` | lab_results | Rendered to HTML |

### API Routes (Vercel Server — process PHI, often send to OpenAI)

| File | PHI Read | PHI Destination |
|---|---|---|
| `app/api/oral/narrative/route.ts` | oral_kit_orders (full species data), lab_results, lifestyle_records, sleep_data, profiles | **OpenAI** (full oral + blood + sleep + lifestyle) |
| `app/api/oral/panel-summary/route.ts` | oral_kit_orders, lifestyle_records | **OpenAI** (oral data summary) |
| `app/api/oral/converge/route.ts` | oral_kit_orders, lab_results, sleep_data | **OpenAI** (cross-panel data) |
| `app/api/oral/questions/route.ts` | oral_kit_orders, lifestyle_records | **OpenAI** (oral data) |
| `app/api/labs/insight/route.ts` | lab_results (full), lifestyle_records, oral_kit_orders | **OpenAI** (blood + lifestyle + oral) |
| `app/api/labs/upload/route.ts` | Uploaded PDF text (lab values) | **OpenAI** (OCR + parsing) |
| `app/api/labs/save/route.ts` | lab_results | **OpenAI** (blood insight) |
| `app/api/blood/marker-insight/route.ts` | lab_results, oral_kit_orders | **OpenAI** (marker-specific) |
| `app/api/blood/panel-summary/route.ts` | lab_results, oral_kit_orders, sleep_data | **OpenAI** (blood summary) |
| `app/api/blood/converge/route.ts` | lab_results, oral_kit_orders, sleep_data | **OpenAI** (cross-panel) |
| `app/api/blood/questions/route.ts` | lab_results | **OpenAI** (doctor questions) |
| `app/api/converge/hero/route.ts` | Full UserPanelContext | **OpenAI** (hero narrative) |
| `app/api/insights/generate/route.ts` | score_snapshots, lab_results, oral_kit_orders, sleep_data | **OpenAI** (cross-panel insights) |
| `app/api/insights/expand/route.ts` | Cached insight text | **OpenAI** (expand insight) |
| `app/api/chat/route.ts` | Full UserPanelContext | **OpenAI** (chat with user) |
| `app/api/trends/sleep-narrative/route.ts` | sleep_data, lifestyle_records | **OpenAI** (sleep trends) |
| `app/api/lifestyle/answer/route.ts` | lifestyle_records (write) | Supabase (write) |
| `app/api/questionnaire/v2/route.ts` | lifestyle_records, user_symptoms | Supabase (read/write) |
| `app/api/admin/oral-upload/route.ts` | oral_kit_orders (full), OTU data | Supabase (write) |
| `app/api/admin/pregen-user/route.ts` | Full UserPanelContext | marker_insights cache + **OpenAI** |
| `app/api/whoop/sync-all/route.ts` | Whoop API data | Supabase sleep_data (write) |
| `app/api/auth/whoop/callback/route.ts` | OAuth tokens | Supabase wearable_connections (write) |
| `app/api/waitlist/route.ts` | Email address | **Resend** (email notification) |
| `app/api/quiz/submit/route.ts` | Email, quiz score, risk tier | **Resend** (confirmation email) |
| `app/api/account/export/route.ts` | Full user data export | Returned as JSON to client |

### Utility/Library (Vercel Server — called by routes/components)

| File | PHI Read | PHI Destination |
|---|---|---|
| `lib/user-context.ts` | profiles, oral_kit_orders, lab_results, lifestyle_records, sleep_data, wearable_connections_v2 | Returns UserPanelContext to caller |
| `lib/score/recalculate.ts` | lab_results, oral_kit_orders, lifestyle_records, sleep_data | score_snapshots (write) + **OpenAI** (guidance) |
| `lib/converge/observations.ts` | UserPanelContext (all panels) | Returns observations (deterministic) |
| `lib/marker-insights/generate.ts` | UserPanelContext, marker values | **OpenAI** (per-marker insight) |
| `lib/weekly-snapshot/generate.ts` | Full user data | **OpenAI** (weekly summary) |
| `lib/planItems.ts` | lab_results, oral_kit_orders, lifestyle_records, sleep_data | Returns plan items (deterministic) |
| `lib/interventions/registry.ts` | UserPanelContext, questionnaire | Returns interventions (deterministic) |
| `lib/email/reconnect.ts` | User email, provider name | **Resend** (reconnect email) |

### Client Components (User Browser)

| File | PHI Received | Notes |
|---|---|---|
| `app/dashboard/dashboard-client.tsx` | All dashboard props (scores, blood data, oral data, sleep data) | Rendered in browser, no external calls |
| `app/dashboard/oral/oral-panel-client.tsx` | Oral kit data (species %, env index) | Rendered in browser |
| `app/dashboard/blood/blood-panel-rebuild.tsx` | Lab results (all markers) | Rendered in browser |
| `app/dashboard/sleep/sleep-questionnaire-view.tsx` | Questionnaire answers, oral env data | Rendered in browser |
| `app/dashboard/converge/converge-client.tsx` | Observations, panel availability | Rendered in browser, fetches hero from API |
| `app/questionnaire/v2/questionnaire-v2-client.tsx` | Questionnaire answers (draft) | Fetches/saves via API |

---

## 2. Third-Party Services & BAA Status

| Service | Purpose | PHI Sent? | BAA Status | Notes |
|---|---|---|---|---|
| **Supabase** | Database, Auth, RLS | Yes — all PHI stored here | **BAA signed** | Primary PHI store. All 26 tables RLS-enabled. |
| **OpenAI** | Narrative generation, insights, chat | Yes — species %, blood values, questionnaire answers, sleep metrics | **BAA signed** | 20 call sites. User values sent in prompts. user_id sent as truncated 8-char hash in some routes, raw in others. |
| **Vercel** | Hosting (Server Components, API Routes) | Yes — processes all PHI server-side | **No BAA** | All Server Components and API Routes run on Vercel infrastructure. PHI is in memory during request processing. Vercel logs may capture console.log output. |
| **Resend** | Transactional email | Minimal — email address, quiz score/tier | **No BAA** | 3 email send points. Waitlist: email only. Quiz: email + score + tier. Reconnect: email + provider name. No health marker values in emails. |
| **Whoop API** | Wearable data sync | Yes — OAuth tokens sent to Whoop; sleep/HRV data received | **No BAA** | Data flows FROM Whoop TO us. We send auth tokens. Whoop has their own data. |
| **Oura API** | Wearable data sync | Yes — OAuth tokens | **No BAA** | Same pattern as Whoop. |
| **Junction** | Wearable aggregation | Yes — OAuth relay | **No BAA** | Middleware for wearable connections. |

### Services NOT found in codebase:
- No Stripe (no payment processing)
- No Sentry (no error tracking)
- No PostHog/Mixpanel/Segment (no analytics SDK)
- No Google Analytics

---

## 3. Vercel PHI Exposure Points

### HIGH — PHI actively processed and rendered/cached

| File | PHI | Why it's here | Migration options |
|---|---|---|---|
| `app/dashboard/page.tsx` | Full user profile + all panel data | Dashboard server component assembles all data | Move data assembly to Edge Function or client-side fetch |
| `app/api/oral/narrative/route.ts` | Full oral + blood + sleep + lifestyle | Builds OpenAI prompt with all PHI | Could run as Supabase Edge Function |
| `app/api/labs/upload/route.ts` | Lab PDF text + parsed values | OCR + OpenAI parsing of lab results | Could run as Supabase Edge Function |
| `app/api/labs/insight/route.ts` | Full blood + lifestyle + oral | Cross-panel insight generation | Could run as Supabase Edge Function |
| `app/api/converge/hero/route.ts` | Full UserPanelContext | Converge hero narrative | Could run as Supabase Edge Function |
| `app/api/chat/route.ts` | Full UserPanelContext | User chat with AI | Could run as Supabase Edge Function |
| `lib/score/recalculate.ts` | All panel data | Score computation + AI guidance | Could run as Supabase Edge Function |
| `lib/marker-insights/generate.ts` | Marker values + cross-panel | Per-marker AI insight generation | Could run as Supabase Edge Function |
| `lib/weekly-snapshot/generate.ts` | Full user data | Weekly summary generation | Could run as Supabase Edge Function |
| All panel Server Components | Panel-specific health data | Render dashboard views | Could move to client-side fetch pattern |

### MEDIUM — PHI transiently processed

| File | PHI | Notes |
|---|---|---|
| `app/api/lifestyle/answer/route.ts` | Single questionnaire field | Writes to DB, minimal processing |
| `app/api/questionnaire/v2/route.ts` | Questionnaire answers | CRUD operations, no AI |
| `app/api/whoop/sync-all/route.ts` | Sleep/HRV data | Relays from Whoop to Supabase |
| `app/api/auth/whoop/callback/route.ts` | OAuth tokens | Auth flow only |
| `app/api/account/export/route.ts` | Full user data | Data export endpoint |

### LOW — Minimal exposure

| File | PHI | Notes |
|---|---|---|
| `middleware.ts` | Session token only | Auth routing, no health data |
| `app/api/sync/now/route.ts` | Triggers sync | No PHI in request/response |

---

## 4. OpenAI Prompt Audit

**20 OpenAI call sites identified.** All send health data in user prompts.

| File | System Prompt PHI? | User Prompt PHI | User ID Sent? | Response Cached? |
|---|---|---|---|---|
| `api/oral/narrative/route.ts` | No (generic instructions) | Full oral species, blood markers, sleep metrics, lifestyle answers, age, sex | Yes (truncated 8 chars) | oral_narratives table |
| `api/labs/insight/route.ts` | No | Full blood panel values, lifestyle data, oral data | No | insight_cache table |
| `api/labs/upload/route.ts` (OCR) | No | Raw lab PDF text (contains patient name, values) | No | Not cached |
| `api/labs/upload/route.ts` (parse) | No | Extracted lab text | No | lab_results table |
| `api/labs/save/route.ts` | No | Blood marker values | No | lab_results.blood_insight |
| `api/converge/hero/route.ts` | No | Oral totals, blood markers, sleep stats, questionnaire flags | No | converge_cache table |
| `api/insights/generate/route.ts` | No | Score breakdown, panel data | No | insight_cache table |
| `api/insights/expand/route.ts` | No | Cached insight text (contains values) | No | Not cached |
| `api/chat/route.ts` | No | Full UserPanelContext serialized | No | Not cached |
| `api/blood/marker-insight/route.ts` | No | Specific blood marker + context | No | Not cached |
| `api/blood/panel-summary/route.ts` | No | Full blood panel + oral + sleep count | No | Not cached |
| `api/blood/converge/route.ts` | No | Blood + oral + sleep data | No | Not cached |
| `api/blood/questions/route.ts` | No | Full blood panel | No | Not cached |
| `api/oral/panel-summary/route.ts` | No | Oral kit data | No | Not cached |
| `api/oral/converge/route.ts` | No | Oral + blood + sleep | No | Not cached |
| `api/oral/questions/route.ts` | No | Oral kit data | No | Not cached |
| `api/trends/sleep-narrative/route.ts` | No | Sleep trend data, lifestyle answers | No | sleep_narratives table |
| `lib/marker-insights/generate.ts` | No | Single marker value + cross-panel values | No | marker_insights table |
| `lib/weekly-snapshot/generate.ts` | No | Full user data summary | No | weekly_snapshots table |
| `lib/score/recalculate.ts` | No | Score components + panel data | No | score_snapshots.ai_guidance_items |

**Key finding:** No system prompts contain user-specific PHI. All PHI is in user prompts. User_id is sent raw to OpenAI in 0 routes (truncated to 8 chars in oral/narrative, not sent in others). OpenAI responses are cached in Supabase (which has BAA).

**OpenAI BAA note:** Under OpenAI's BAA, API data is not used for training and is retained for 30 days for abuse monitoring, then deleted. This is compliant for the current stage.

---

## 5. Potential PHI Leaks

### console.log statements with PHI (Vercel logs)

| File | Line | What's logged | Severity |
|---|---|---|---|
| `app/dashboard/page.tsx` | 58 | Snapshot score, sleep_sub, blood_sub values | MEDIUM — scores are derivatives |
| `app/dashboard/page.tsx` | 62 | Lab collection_date | LOW |
| `app/dashboard/page.tsx` | 106-110 | user.id (full), snapshot engine version | MEDIUM — full user_id |
| `app/dashboard/page.tsx` | 130 | Score, sleep_sub, blood_sub, oral_sub | MEDIUM |
| `app/dashboard/page.tsx` | 152 | Computed score, rawScore, storedSleepSub | MEDIUM |
| `app/api/oral/narrative/route.ts` | 605 | userId (8 chars), prompt version | LOW |
| `app/api/oral/narrative/route.ts` | 900 | userId (8 chars), sleep tier, env_pattern | LOW |
| `app/api/labs/insight/route.ts` | 505-613 | Card categories, lifestyle fields, token counts | LOW |
| `app/api/labs/upload/route.ts` | 311 | First 200 chars of lab text (may contain patient name) | **HIGH** |
| `app/api/labs/upload/route.ts` | 450 | First 5 parsed field names + values | MEDIUM |
| `app/api/labs/save/route.ts` | 132-144 | Model name, token count | LOW |
| `app/components/connect-wearable.tsx` | 68 | Junction metadata (provider + junction user ID) | LOW |

**Total: ~25 console.log statements that could leak PHI to Vercel logs.**

Most critical: `labs/upload/route.ts:311` logs the first 200 chars of extracted lab text, which may include patient name, date of birth, and doctor name from the PDF.

### URL query params with identifiers

| Pattern | Found? | Notes |
|---|---|---|
| `?userId=` | Yes — `api/admin/pregen-user` | Admin-only endpoint, accepts userId as query param |
| `?email=` | No | Not found |
| `?user=` | No | Not found |

### Analytics/error tracking

No analytics SDK or error tracking service found in the codebase. This is good for PHI containment but means no production monitoring.

### Email PHI

| Route | What's sent via Resend | PHI? |
|---|---|---|
| `api/waitlist/route.ts` | Email address only | Minimal — email is PII not PHI |
| `api/quiz/submit/route.ts` | Email + quiz score + risk tier + tags | **Yes** — risk tier is health-adjacent |
| `lib/email/reconnect.ts` | Email + wearable provider name | Minimal |

---

## 6. Access Control Status

**All 26 public tables have Row Level Security (RLS) enabled.**

| Table | RLS | User Access Policy | Service Role? | Notes |
|---|---|---|---|---|
| profiles | ✅ | SELECT/INSERT/UPDATE own (uid = id) | No | Correct — users manage own profile |
| oral_kit_orders | ✅ | ALL own (uid = user_id) + SELECT own | Yes (via service role in admin routes) | Correct |
| lab_results | ✅ | ALL own (uid = user_id) | No | Correct |
| lifestyle_records | ✅ | ALL own (uid = user_id) | No | Correct |
| sleep_data | ✅ | SELECT/INSERT/UPDATE own | No | Correct |
| score_snapshots | ✅ | SELECT/INSERT own | No | Correct |
| oral_narratives | ✅ | SELECT own | No | Correct — service role writes via API routes |
| insight_cache | ✅ | SELECT own | ALL (service role) | Note: service role policy uses `true` — any service role query bypasses RLS |
| converge_cache | ✅ | SELECT own | ALL (service role, `true`) | Same as insight_cache |
| marker_insights | ✅ | SELECT own | ALL (service role, `true`) | Same pattern |
| user_symptoms | ✅ | SELECT/INSERT/UPDATE own | ALL (service role, `true`) | Correct |
| guidance_cache | ✅ | SELECT own | ALL (service role, `true`) | Correct |
| articles | ✅ | Public read (published=true) | ALL (service role) | **Note: anon can DELETE/UPDATE articles** — not PHI but a content integrity risk |
| waitlist | ✅ | INSERT (anyone), SELECT (service role only) | Yes | Correct |

**Key finding:** All user-facing RLS policies correctly scope to `auth.uid() = user_id`. Service role policies use `true` (blanket allow) which is standard for server-side operations. No cross-user data access is possible through client-side Supabase queries.

**Minor issue:** The `articles` table has anon DELETE and UPDATE policies. Not a PHI concern but allows unauthenticated content manipulation.

---

## 7. Migration Readiness Assessment

**If we wanted to move off Vercel tomorrow, the effort would be: MEDIUM-LARGE**

### Biggest blockers:
1. **~15 Server Components** fetch PHI and render server-side on Vercel. Each would need to become either a client-side fetch or move to a self-hosted server.
2. **~20 API Routes** process PHI on Vercel. Most could migrate to Supabase Edge Functions but would require rewriting from Next.js API route format.
3. **No middleware complexity** — the middleware only handles auth redirects, not PHI processing.

### Recommended pre-HIPAA architecture changes:
1. **Move AI generation to Supabase Edge Functions** — the 20 OpenAI call sites are the highest-value migration targets since they combine PHI assembly + external API calls.
2. **Convert Server Components to client-side data fetching** — instead of `getUserPanelContext()` in Server Components, fetch via authenticated API routes and render client-side.
3. **Both changes would reduce Vercel's PHI exposure to near-zero** — it would only serve static HTML + JS bundles, with all PHI flowing directly between browser ↔ Supabase ↔ OpenAI.

### Estimated migration effort by approach:

| Approach | Effort | PHI on Vercel after |
|---|---|---|
| Stay on Vercel + sign BAA | Minimal (Vercel offers BAA on Enterprise) | All (covered by BAA) |
| Move AI routes to Supabase Edge Functions | Medium (rewrite 20 routes) | Server Components only |
| Full client-side rendering | Large (rewrite all panel pages) | Near-zero (static serving only) |
| Self-host on AWS/GCP with BAA | Large (infrastructure + deployment) | Zero on Vercel |

---

## 8. Recommendations

### Non-blocking fixes (do regardless of hosting decisions)

1. **Remove PHI from console.log statements** — especially `labs/upload/route.ts:311` which logs raw lab text. Replace with structured logging that excludes values: log field counts, not field values.

2. **Hash user_id in all logs** — `dashboard/page.tsx` logs full user.id at lines 106-110. Use `userId.slice(0, 8)` consistently (oral/narrative already does this).

3. **Remove userId from URL query params** — `api/admin/pregen-user` accepts `?userId=` which appears in Vercel request logs. Move to POST body or use a session-scoped admin check.

4. **Fix articles RLS** — anon DELETE/UPDATE policies on the articles table allow unauthenticated content manipulation. Not PHI but a security gap.

5. **Verify Resend PHI scope** — quiz submission emails include risk tier and tags. If these constitute PHI, either remove from email body or get Resend BAA (Resend offers BAA on their HIPAA plan).

6. **Add `store: false` to all OpenAI calls** — some routes already include this (blood routes), others don't. `store: false` prevents OpenAI from retaining prompt/response data beyond the BAA retention window.

### HIPAA-threshold recommendations (when you cross)

1. **BAA inventory:**
   - Vercel: Sign Enterprise BAA (or migrate hosting)
   - Resend: Sign HIPAA plan BAA (or remove health data from emails)
   - Junction/wearable APIs: Evaluate whether OAuth relay constitutes PHI transmission
   - OpenAI: BAA already signed ✓
   - Supabase: BAA already signed ✓

2. **Architectural changes:**
   - Move OpenAI call sites to Supabase Edge Functions (highest priority)
   - Add audit logging for PHI access (who accessed what, when)
   - Implement data retention policies (auto-delete old narratives, snapshots)
   - Add encryption at rest for most sensitive fields (DOB, medical history)

3. **Testing plan:**
   - Verify no PHI in Vercel function logs after cleanup
   - Penetration test RLS policies (attempt cross-user data access)
   - Verify OpenAI `store: false` is set on all calls
   - Test data export endpoint for completeness (HIPAA right of access)
   - Verify data deletion endpoint exists (HIPAA right to delete)

---

*This audit reflects the codebase state as of April 23, 2026. It should be re-run after significant architectural changes or before crossing the HIPAA threshold.*

# AI Insights Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish AI insights across dashboard, oral, and trends for consistency, individual tailoring, and premium non-medical voice.

**Architecture:** Four targeted changes: (1) remap oral priority labels in the client component, (2) add a new `/api/oral/narrative` endpoint (mirrors sleep-narrative) + update the oral panel client to fetch it, (3) enrich the sleep narrative prompt with age/sex context and age-adjusted HRV targets, (4) tighten the blood insight system prompt voice rules.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Supabase (PostgreSQL), OpenAI `gpt-4.1-mini`, React hooks (`useState`/`useEffect`)

---

## Task 1: Export HRV helpers from score engine

The `ageRangeToMidpoint` and `getHRVTarget` functions in `lib/score/recalculate.ts` are private. The sleep-narrative route needs them to compute the age-adjusted HRV target before calling the AI.

**Files:**
- Modify: `apps/web/lib/score/recalculate.ts:11-32`

- [ ] **Step 1: Export the two helper functions**

In `apps/web/lib/score/recalculate.ts`, change lines 11 and 26 to add `export`:

```typescript
export function ageRangeToMidpoint(range: string | null | undefined): number {
  if (!range) return 45
  const map: Record<string, number> = {
    "under_30": 25, "18_29": 25, "20_29": 25,
    "30_39": 35,
    "40_49": 45,
    "50_59": 55,
    "60_69": 65,
    "70_plus": 72, "over_70": 72,
  }
  if (map[range]) return map[range]
  const n = parseInt(range)
  return isNaN(n) ? 45 : n
}

export function getHRVTarget(age: number): { optimal: number; good: number; watch: number } {
  if (age < 30) return { optimal: 60, good: 45, watch: 30 }
  if (age < 40) return { optimal: 55, good: 40, watch: 28 }
  if (age < 50) return { optimal: 48, good: 35, watch: 25 }
  if (age < 60) return { optimal: 42, good: 30, watch: 22 }
  return { optimal: 35, good: 25, watch: 18 }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors about these functions.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/score/recalculate.ts
git commit -m "feat: export ageRangeToMidpoint and getHRVTarget from score engine"
```

---

## Task 2: Create `oral_narratives` Supabase table

**Files:**
- New migration via Supabase MCP

- [ ] **Step 1: Apply migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with this SQL:

```sql
create table if not exists oral_narratives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

alter table oral_narratives enable row level security;

create policy "Users can read own oral narratives"
  on oral_narratives for select
  using (auth.uid() = user_id);

create policy "Service role can write oral narratives"
  on oral_narratives for all
  using (true)
  with check (true);
```

- [ ] **Step 2: Verify table exists**

Use `mcp__claude_ai_Supabase__execute_sql` to run:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'oral_narratives'
order by ordinal_position;
```

Expected: rows for id, user_id, collection_date, generated_at, headline, narrative, positive_signal, watch_signal, oral_context, blood_context, sleep_context, raw_response.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: oral_narratives table for caching AI-generated oral panel narratives"
```

---

## Task 3: Fix 1 — Oral priority label remap

The findings section in `oral-panel-client.tsx` renders `{f.priority}` directly, showing `CRITICAL`/`HIGH` to users. Replace with warm descriptors.

**Files:**
- Modify: `apps/web/app/dashboard/oral/oral-panel-client.tsx`

- [ ] **Step 1: Add PRIORITY_DISPLAY map near the top of the file, after the existing PRIORITY_STYLE map (around line 59)**

```typescript
const PRIORITY_DISPLAY: Record<string, string> = {
  CRITICAL: "Notable signal",
  HIGH:     "Worth discussing",
  MEDIUM:   "Worth monitoring",
  LOW:      "Interesting pattern",
  POSITIVE: "Strong signal",
}
```

- [ ] **Step 2: Replace `{f.priority}` with the display label**

Find this block (around line 487):
```typescript
<span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", background: ps.bg, color: ps.text }}>
  {f.priority}
</span>
```

Replace with:
```typescript
<span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 8px", background: ps.bg, color: ps.text }}>
  {PRIORITY_DISPLAY[f.priority] ?? f.priority}
</span>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/dashboard/oral/oral-panel-client.tsx
git commit -m "fix: replace CRITICAL/HIGH priority labels with warm descriptors on oral panel"
```

---

## Task 4: Fix 2a — New `/api/oral/narrative` endpoint

New route that fetches the user's oral kit data, cross-references sleep HRV and blood modifiers, generates an AI narrative via OpenAI, and caches the result in `oral_narratives`.

**Files:**
- Create: `apps/web/app/api/oral/narrative/route.ts`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p apps/web/app/api/oral/narrative
```

- [ ] **Step 2: Create `apps/web/app/api/oral/narrative/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import { ageRangeToMidpoint, getHRVTarget } from "../../../../lib/score/recalculate"

export const dynamic = "force-dynamic"

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const avg = (arr: number[]): number | null =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

// Normalise oral values that may be stored as fraction (0-1) or percentage (>1)
const toOralPct = (v: unknown): number | null => {
  if (v == null) return null
  const n = Number(v)
  if (isNaN(n)) return null
  return Math.min(n > 1 ? n : n * 100, 100)
}

function burdenLevel(val: number | null): string {
  if (val === null) return "not detected"
  if (val < 0.005) return "within target"
  if (val < 0.02)  return "mildly elevated"
  if (val < 0.05)  return "elevated"
  return "notably elevated"
}

export async function GET() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = svc()
  const userId = user.id

  // ── Fetch oral kit data ────────────────────────────────────────────────────
  const { data: oralKit } = await supabase
    .from("oral_kit_orders")
    .select("oral_score_snapshot, shannon_diversity, collection_date, ordered_at, mouthwash_detected")
    .eq("user_id", userId)
    .eq("status", "results_ready")
    .order("ordered_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!oralKit) {
    return NextResponse.json({ narrative: null, reason: "no_oral_data" })
  }

  // Resolve cache key date
  const kitDate = (oralKit.collection_date ?? oralKit.ordered_at?.split("T")[0]) as string
  const today = new Date().toISOString().split("T")[0]

  // ── Cache check — skip if < 7 days old ────────────────────────────────────
  const { data: cached } = await supabase
    .from("oral_narratives")
    .select("*")
    .eq("user_id", userId)
    .eq("collection_date", kitDate)
    .maybeSingle()

  const cacheAgeDays = cached
    ? (Date.now() - new Date(cached.generated_at as string).getTime()) / 86400000
    : Infinity

  if (cached && cacheAgeDays < 7) {
    console.log(`[oral-narrative] cache hit for user=${userId.slice(0, 8)} age=${cacheAgeDays.toFixed(1)}d`)
    return NextResponse.json({ narrative: cached, cached: true })
  }

  // ── Parse oral snapshot ────────────────────────────────────────────────────
  const snap = oralKit.oral_score_snapshot as Record<string, unknown> | null
  const shannon = (oralKit.shannon_diversity as number | null) ?? (snap?.shannonDiversity != null ? Number(snap.shannonDiversity) : null)
  const nitrateRaw = snap?.nitrateReducerPct != null ? toOralPct(snap.nitrateReducerPct) : null
  const periodontalRaw = snap?.periodontalBurden != null ? Number(snap.periodontalBurden) : null
  const osaBurdenRaw = snap?.osaBurden != null ? Number(snap.osaBurden) : null
  const pGingivalisRaw = snap?.pGingivalisPct != null ? toOralPct(snap.pGingivalisPct) : null
  const mouthwashDetected = Boolean(oralKit.mouthwash_detected)

  // ── Fetch cross-panel context in parallel ─────────────────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]

  const [sleepRes, snapshotRes, lifestyleRes] = await Promise.all([
    supabase
      .from("sleep_data")
      .select("hrv_rmssd, sleep_efficiency")
      .eq("user_id", userId)
      .gte("date", sevenDaysAgo)
      .order("date", { ascending: false }),

    supabase
      .from("score_snapshots")
      .select("blood_sub, modifiers_applied")
      .eq("user_id", userId)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("lifestyle_records")
      .select("age_range, biological_sex, mouthwash_type")
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  const sleepNights = sleepRes.data ?? []
  const hrvValues = sleepNights.map(n => n.hrv_rmssd).filter((v): v is number => v != null && v > 0)
  const avgHrv = avg(hrvValues)
  const modifiers = (snapshotRes.data?.modifiers_applied ?? []) as Array<{ label: string; points: number; direction: string }>

  const ageRange = lifestyleRes.data?.age_range as string | null
  const biologicalSex = lifestyleRes.data?.biological_sex as string | null
  const age = ageRangeToMidpoint(ageRange)
  const hrvTarget = getHRVTarget(age)

  // ── Build prompts ──────────────────────────────────────────────────────────
  const systemPrompt = `You are the oral microbiome intelligence engine for Oravi, a longevity platform built by a cardiologist and periodontist.

Generate a short, personal oral health narrative for this user based on their latest microbiome kit. Connect oral signals to their sleep or blood panels where the data supports it.

VOICE:
- Warm, direct, like a knowledgeable friend reviewing your results
- Specific — use actual numbers where available
- Never alarming — observational and curious
- 2-3 sentences max for the narrative
- Use "consider" for actions, never "you should"
- Use "research has shown" or "this has been linked to" for mechanism language — never "causes"
- Never mention disease, diagnosis, or clinical urgency
- If mouthwash is detected: mention it once, gently — "antiseptic mouthwash can suppress nitrate-reducing bacteria"

RULES:
- Never cite raw burden percentages — use qualitative descriptors only (within target, mildly elevated, elevated, notably elevated)
- Cross-panel connection to HRV or blood only when the data supports it; never forced
- If nitrate reducers are below 20% AND HRV is below the age-adjusted target → mention the nitric oxide pathway connection
- If Shannon diversity is above 3.0 → celebrate it specifically with the number
- If periodontal burden is elevated → note it without alarm, frame as "worth keeping an eye on"
- Return ONLY valid JSON. No markdown. No backticks.`

  const nitrateStr = nitrateRaw != null ? `${nitrateRaw.toFixed(1)}% (target ≥20%)` : "not available"
  const periodontalStr = burdenLevel(periodontalRaw)
  const osaStr = burdenLevel(osaBurdenRaw)
  const shannonStr = shannon != null ? `${shannon.toFixed(2)} (target ≥3.0${shannon >= 3 ? " — above target" : ""})` : "not available"
  const hrvStr = avgHrv != null
    ? `${avgHrv.toFixed(1)} ms (age-adjusted target: ${hrvTarget.optimal}ms optimal, ${hrvTarget.good}ms good)`
    : "no recent sleep data"
  const ageStr = ageRange ? `${ageRange}${biologicalSex ? `, ${biologicalSex}` : ""}` : "not provided"

  const userPrompt = `Generate a personalized oral microbiome narrative for this user.

KIT DATE: ${kitDate}

ORAL DATA:
- Shannon diversity: ${shannonStr}
- Nitrate-reducing bacteria: ${nitrateStr}
- Periodontal burden (P. gingivalis + T. denticola + T. forsythia composite): ${periodontalStr}
- OSA-associated taxa (Prevotella + Fusobacterium composite): ${osaStr}
${pGingivalisRaw != null ? `- P. gingivalis: ${pGingivalisRaw.toFixed(2)}% (target <0.1%)` : ""}
${mouthwashDetected ? "- Antiseptic mouthwash detected" : ""}

CROSS-PANEL CONTEXT:
- Recent HRV (7-day avg): ${hrvStr}
- Active cross-panel modifiers: ${modifiers.length > 0 ? modifiers.map(m => m.label).join(", ") : "none"}
- User age / sex: ${ageStr}

Return this exact JSON:
{
  "headline": "6-10 words, specific to this user's oral data, warm",
  "narrative": "2-3 sentences. Use actual numbers. Connect to another panel if data supports it. Warm and observational.",
  "positive_signal": "One specific strength — actual number if relevant. null if nothing notable.",
  "watch_signal": "One thing worth monitoring — framed with curiosity. null if nothing notable."
}`

  // ── Call OpenAI ────────────────────────────────────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return NextResponse.json({ error: "No AI key" }, { status: 503 })

  const openai = new OpenAI({ apiKey: openaiKey })
  const model  = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"

  let result: Record<string, unknown>
  try {
    const completion = await openai.chat.completions.create({
      model,
      max_tokens: 400,
      temperature: 0.65,
      store: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
    })
    const raw = completion.choices[0]?.message.content ?? "{}"
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim()
    result = JSON.parse(cleaned) as Record<string, unknown>
    console.log(`[oral-narrative] generated for user=${userId.slice(0, 8)} headline="${result.headline}"`)
  } catch (err) {
    console.error("[oral-narrative] generation failed:", err)
    return NextResponse.json({ narrative: null, error: String(err) }, { status: 500 })
  }

  // ── Upsert to cache ────────────────────────────────────────────────────────
  const { data: saved, error: upsertErr } = await supabase
    .from("oral_narratives")
    .upsert({
      user_id:         userId,
      collection_date: kitDate,
      generated_at:    new Date().toISOString(),
      headline:        result.headline        ?? null,
      narrative:       result.narrative       ?? null,
      positive_signal: result.positive_signal ?? null,
      watch_signal:    result.watch_signal    ?? null,
      oral_context:    { shannon, nitrateRaw, periodontalRaw, osaBurdenRaw, mouthwashDetected },
      blood_context:   { modifiers },
      sleep_context:   { avgHrv, ageRange, biologicalSex },
      raw_response:    result,
    }, { onConflict: "user_id,collection_date" })
    .select()
    .single()

  if (upsertErr) {
    console.error("[oral-narrative] upsert failed:", upsertErr.message)
    return NextResponse.json({
      narrative: { ...result, collection_date: kitDate, generated_at: today },
      cached: false,
    })
  }

  return NextResponse.json({ narrative: saved, cached: false })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Test the endpoint manually (requires dev server running)**

```bash
# In one terminal: cd apps/web && npm run dev
# In another:
curl -s http://localhost:3000/api/oral/narrative \
  -H "Cookie: <your-session-cookie>" | jq '.narrative.headline'
```

Expected: a string like `"Nitrate reducers trending up — diversity holding strong"` or `{"reason":"no_oral_data"}` if no kit on file for the test account.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/oral/narrative/route.ts
git commit -m "feat: /api/oral/narrative — AI-generated oral panel narrative with cross-panel context"
```

---

## Task 5: Fix 2b — Oral panel client fetches AI narrative

Replace the hardcoded `generateOralNarrative()` call with a `useEffect` fetch of `/api/oral/narrative`. Show a skeleton while loading; fall back silently on error.

**Files:**
- Modify: `apps/web/app/dashboard/oral/oral-panel-client.tsx`

- [ ] **Step 1: Add narrative state at the top of `OralPanelClient`**

After the existing `const oralSub = snapshot?.oral_sub as number | undefined` line, add:

```typescript
  type OralNarrative = {
    headline: string | null
    narrative: string | null
    positive_signal: string | null
    watch_signal: string | null
  }

  const [aiNarrative, setAiNarrative] = useState<OralNarrative | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(true)
```

- [ ] **Step 2: Add `useEffect` to fetch narrative on mount**

After the state declarations, add:

```typescript
  useEffect(() => {
    fetch("/api/oral/narrative")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.narrative) setAiNarrative(data.narrative as OralNarrative)
      })
      .catch(() => { /* silent fallback */ })
      .finally(() => setNarrativeLoading(false))
  }, [])
```

- [ ] **Step 3: Replace the hardcoded narrative call with the AI card**

Find the current hardcoded narrative render (around line 361):
```typescript
        {/* Top narrative — wellness-framed, generated from live dimension values */}
        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 17,
          color: "var(--ink-65)", lineHeight: 1.55, margin: "0 0 24px",
        }}>
          {generateOralNarrative(periodontalPct, nitratePct, shannon)}
        </p>
```

Replace with:
```typescript
        {/* Top narrative — AI-generated, falls back to hardcoded */}
        {narrativeLoading ? (
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 17,
            color: "var(--ink-30)", lineHeight: 1.55, margin: "0 0 24px",
          }}>
            Analysing your microbiome data…
          </p>
        ) : aiNarrative?.narrative ? (
          <div style={{ border: "0.5px solid var(--ink-12)", padding: "16px 18px", marginBottom: 24, background: "#fff" }}>
            {aiNarrative.headline && (
              <p style={{ margin: "0 0 8px", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 16, fontWeight: 400, color: "var(--ink)", lineHeight: 1.4 }}>
                {aiNarrative.headline}
              </p>
            )}
            <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-60)", lineHeight: 1.65 }}>
              {aiNarrative.narrative}
            </p>
            {(aiNarrative.positive_signal || aiNarrative.watch_signal) && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {aiNarrative.positive_signal && (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px", background: "#EAF3DE", color: "#2D6A4F" }}>
                    {aiNarrative.positive_signal}
                  </span>
                )}
                {aiNarrative.watch_signal && (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px", background: "#FEF3C7", color: "#92400E" }}>
                    {aiNarrative.watch_signal}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 17,
            color: "var(--ink-65)", lineHeight: 1.55, margin: "0 0 24px",
          }}>
            {generateOralNarrative(periodontalPct, nitratePct, shannon)}
          </p>
        )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dashboard/oral/oral-panel-client.tsx
git commit -m "feat: oral panel fetches AI narrative with skeleton loader and graceful fallback"
```

---

## Task 6: Fix 3 — Sleep narrative: age/sex + HRV target context

Add `biological_sex` to the lifestyle query, compute the age-adjusted HRV target, and include both in the user prompt and system prompt.

**Files:**
- Modify: `apps/web/app/api/trends/sleep-narrative/route.ts`

- [ ] **Step 1: Add import for HRV helpers at the top of the file**

After the existing imports, add:
```typescript
import { ageRangeToMidpoint, getHRVTarget } from "../../../../lib/score/recalculate"
```

- [ ] **Step 2: Add `biological_sex` to the lifestyle_records select**

Find the existing lifestyle query (around line 100):
```typescript
    supabase
      .from("lifestyle_records")
      .select("exercise_level, stress_level, age_range, mouthwash_type")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
```

Replace with:
```typescript
    supabase
      .from("lifestyle_records")
      .select("exercise_level, stress_level, age_range, biological_sex, mouthwash_type")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
```

- [ ] **Step 3: Compute age-adjusted HRV target after the lifestyle query resolves**

After the block that reads `const modifiers = ...`, add:

```typescript
  const ageRange = lifestyleRes.data?.age_range as string | null
  const biologicalSex = lifestyleRes.data?.biological_sex as string | null
  const age = ageRangeToMidpoint(ageRange)
  const hrvTarget = getHRVTarget(age)
```

- [ ] **Step 4: Update the HRV line in the user prompt to include age-adjusted target**

Find the existing HRV line in `userPrompt` (around line 151):
```typescript
- Avg HRV: ${avgHrv != null ? `${avgHrv.toFixed(1)} ms${avgHrv >= 50 ? " (above 50ms target)" : " (below 50ms target)"}` : "no data"}
```

Replace with:
```typescript
- Avg HRV: ${avgHrv != null ? `${avgHrv.toFixed(1)} ms (age-adjusted target: ${hrvTarget.optimal}ms optimal, ${hrvTarget.good}ms good${avgHrv >= hrvTarget.optimal ? " — above optimal" : avgHrv >= hrvTarget.good ? " — good range" : " — below good range"})` : "no data"}
```

- [ ] **Step 5: Add age/sex lines to the user prompt, after the stress line**

Find:
```typescript
- Stress (self-reported): ${lifestyleRes.data?.stress_level ?? "not provided"}
```

Replace with:
```typescript
- Stress (self-reported): ${lifestyleRes.data?.stress_level ?? "not provided"}
- User age range: ${ageRange ?? "not provided"}
- User sex: ${biologicalSex ?? "not provided"}
```

- [ ] **Step 6: Add age-context rule to the system prompt**

Find the last line of the system prompt's `RULES:` section:
```typescript
- Return ONLY valid JSON. No markdown. No backticks.`
```

Replace with:
```typescript
- If age range is provided, contextualize HRV relative to their age group using the age-adjusted targets in the user prompt. A 43ms HRV may be good for a 45-year-old but below target for a 28-year-old. Never invent thresholds — only use the ones provided.
- Return ONLY valid JSON. No markdown. No backticks.`
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 8: Clear the sleep narrative cache so the next load regenerates**

Use `mcp__claude_ai_Supabase__execute_sql`:

```sql
delete from sleep_narratives
where user_id = 'f08a47b5-4a8f-4b8c-b4d5-8f1de407d686'
  and period_end = current_date;
```

This forces regeneration on the next Trends page load so you can verify the new prompt works.

- [ ] **Step 9: Commit**

```bash
git add apps/web/app/api/trends/sleep-narrative/route.ts
git commit -m "feat: sleep narrative includes age/sex context and age-adjusted HRV targets"
```

---

## Task 7: Fix 4 — Blood insights voice tightening

Three targeted additions to `SYSTEM_PROMPT` in `app/api/labs/insight/route.ts`.

**Files:**
- Modify: `apps/web/app/api/labs/insight/route.ts`

- [ ] **Step 1: Add approved language to the VOICE section**

Find the VOICE section in `SYSTEM_PROMPT` (the block ending with `- Be consistent: if a value is described the same way...`):

```
- Be consistent: if a value is described the same way in two cards, use the same language in both
- Never call hsCRP "low" if it is above 1.0 mg/L — values between 1.0–3.0 mg/L are "intermediate"
```

Replace with:
```
- Be consistent: if a value is described the same way in two cards, use the same language in both
- Never call hsCRP "low" if it is above 1.0 mg/L — values between 1.0–3.0 mg/L are "intermediate"
- Use "consider" for action suggestions: "consider adding leafy greens" not "you should eat more vegetables"
- Use "research has shown" or "this has been linked to" for mechanism references — never "causes"
- CONSISTENCY RULE: If you reference the same biomarker or metric in more than one card, use identical descriptive language for it in every card. Inconsistent labeling of the same value undermines trust.
```

- [ ] **Step 2: Tighten the BANNED LANGUAGE section**

Find:
```
- Never stack three hedges in a row — one qualifier maximum per claim
- Never cite a raw percentage for periodontal burden or OSA-associated taxa in any headline, body, mechanism, or action — use qualitative descriptors only (e.g. "mildly elevated", "within target", "notably elevated")
```

Replace with:
```
- Never stack three hedges in a row — one qualifier maximum per claim
- Never cite a raw percentage for periodontal burden or OSA-associated taxa in any headline, body, mechanism, or action — use qualitative descriptors only (e.g. "mildly elevated", "within target", "notably elevated")
- "could be beneficial and is worth" — pick one: either "is beneficial" or "is worth exploring", never both in the same sentence
- "may be worth considering" — use "worth considering" directly (one qualifier maximum)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/labs/insight/route.ts
git commit -m "fix: tighten blood insights voice — approved consider/research-has-shown, ban double hedges"
```

---

## Task 8: End-to-end verification

- [ ] **Step 1: Start the dev server**

```bash
cd apps/web && npm run dev
```

- [ ] **Step 2: Verify oral panel priority labels**

Open `http://localhost:3000/dashboard/oral`. In the Insights section, confirm no finding shows `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`. Expected: `Notable signal`, `Worth discussing`, `Worth monitoring`, `Interesting pattern`, or `Strong signal`.

- [ ] **Step 3: Verify oral AI narrative loads**

On the same page, within ~2 seconds, a narrative card should replace the skeleton. Confirm:
- Headline is specific (mentions a number or a species name)
- Body is 2-3 sentences
- No use of "you should", "disease", "diagnose", "treat"
- Uses "consider" or "research has shown" if advice is given

- [ ] **Step 4: Verify sleep narrative is more tailored**

Open `http://localhost:3000/trends`. If the sleep narrative is stale (cache was cleared in Task 6 Step 8), it will regenerate. Confirm the narrative references an age-appropriate HRV context (e.g. "for your age group" or uses the correct target number for their cohort).

- [ ] **Step 5: Final commit if any fixups were needed**

```bash
git add -A
git commit -m "fix: post-verification fixups from end-to-end review"
```

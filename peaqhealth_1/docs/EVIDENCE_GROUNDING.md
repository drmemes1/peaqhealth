# Evidence Grounding System

**Version:** 1.0
**Date:** April 2026
**Purpose:** Constrain AI narrative claims to verified research from
the evidence_library, while keeping user-facing output as clean
conversational prose with NO visible citations.

---

## How It Works

The evidence_library is **invisible scaffolding**. It constrains what
OpenAI can claim, but users never see citations in their narratives.

### Flow

1. **Retrieve**: Before each OpenAI call, `getRelevantEvidence()` pulls
   ~6 studies from evidence_library filtered by panel + topic tags
2. **Inject**: `buildEvidencePromptSection()` formats findings as
   "VERIFIED FINDINGS" in the system prompt, with explicit instructions
   to never name studies in output
3. **Generate**: OpenAI writes conversational prose informed by the
   findings but without naming sources
4. **Strip**: `stripInlineCitations()` catches any hallucinated
   author-year references and removes them
5. **Log**: If citations leaked through, log to
   `narrative_hallucination_log` for monitoring

### Four defenses against hallucination

1. **Tell**: System prompt explicitly says "do not name studies"
2. **Constrain**: Only verified findings are provided as facts
3. **Strip**: Post-generation regex catches any leaked citations
4. **Log**: Hallucination log tracks how often the model leaks

---

## Tag-Based Retrieval

Studies are matched to narrative categories via `CATEGORY_TOPICS`:

```
nitric_oxide_pathway → ['nitric-oxide', 'cardiovascular', 'blood-pressure']
gum_health_bacteria  → ['periodontitis', 'cross-panel-evidence']
cavity_bacteria      → ['caries', 'pH', 'intervention']
```

When generating a narrative for "nitric_oxide_pathway", the system
queries evidence_library for studies tagged with any of those topics,
filtered by `public_facing = true` and `internal_confidence >= medium`.

---

## Adding a New Study

1. Insert into `evidence_library` with appropriate tags, panels, and
   confidence level
2. That's it — retrieval automatically picks it up if tags match a
   narrative category
3. No code changes needed unless you're adding a new category

---

## The Citation Stripper

Catches these patterns in post-generation output:
- "Smith et al. 2023" / "Smith 2023"
- "(Goh 2019)"
- "JAMA 2025" / "NEJM 2024"
- "NHANES" / "Hisayama" / other named datasets

When caught:
- DEV: console.warn with details
- PROD: log to narrative_hallucination_log
- Always: serve the cleaned version to users

---

## Future: Vector RAG

When evidence_library grows beyond ~500 studies, tag-based filtering
won't scale. The migration path:

1. Add embedding column to evidence_library
2. Generate embeddings for each study's primary_finding
3. Replace `getRelevantEvidence()` internals with vector similarity
4. Keep the same interface — no downstream changes needed

The current tag-based system is the right choice for 58 studies.

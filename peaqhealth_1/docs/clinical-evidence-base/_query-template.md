# Standard Query Template — v1

## How to use

1. Copy the prompt below
2. Paste into Open Evidence (preferred) or Perplexity
3. Replace `[BACTERIUM]` with the genus or species name
4. Run the query
5. Copy the entire response
6. Save to `docs/clinical-evidence-base/genera/[lowercase-name].md`
7. Add the standard frontmatter at the top
8. Commit with message: `Evidence base: [Bacterium] genus profile`

Do not edit the response. Save it verbatim. Preserve provenance.

## The prompt

```
I'm building a consumer oral health product that reports 16S rRNA 
sequencing results (Zymo L7, salivary samples) to users. I need a 
comprehensive clinical profile of [BACTERIUM] in the oral cavity.

Please cover these sections with specific citations:

1. **Ecological Role** — Metabolic function, classification as 
   commensal/pathogenic/context-dependent, primary niche (saliva, 
   tongue dorsum, subgingival, supragingival), and known interactions 
   with other oral bacteria.

2. **Healthy Abundance Ranges in Salivary 16S** — Typical % ranges 
   in healthy adults from 16S studies. Note variation by age, sex, 
   geography, and sequencing method (V1-V3 vs V3-V4 vs full-length) 
   if available.

3. **Clinical Associations** — Conditions linked to elevated or 
   reduced abundance. Include effect sizes and study designs where 
   available. Distinguish between salivary and subgingival findings.

4. **Systemic Connections** — Oral-systemic links (cardiovascular, 
   neurological, metabolic, pregnancy). Include mechanism and 
   evidence strength.

5. **Interventions** — What modulates abundance (probiotics, diet, 
   hygiene practices, antibiotics). Include timeframes and effect 
   sizes.

6. **Species-Level Nuance** — Whether species-level distinction 
   matters clinically within this genus. Note any species that are 
   health-associated vs disease-associated within the same genus. 
   Note sequencing limitations for species resolution.

7. **Uncertainty and Caveats** — What's not well established. Where 
   literature disagrees. Common misconceptions. Limitations of 
   current evidence.

8. **Product Implications** — What's defensible to claim in a 
   consumer product. What should be avoided. Regulatory 
   considerations for structure/function claims.

Focus on the oral cavity. Prioritize systematic reviews and 
meta-analyses where available. Include full citations.
```

## Notes on tools

**Open Evidence** is preferred when available. Deeper clinical synthesis, better citation handling, structured peer-reviewed output.

**Perplexity** is acceptable as fallback. Faster and free, slightly less depth on clinical specifics.

If using both: Open Evidence first, then ask Perplexity "anything significant published 2024-2025 that this missed?" as a recency check. Add any new findings as a follow-up section.

## Frontmatter to add to each file

After saving the response, add this block at the top of the markdown file:

```yaml
---
bacterium: [Genus name]
query_date: YYYY-MM-DD
query_template_version: v1
source: [OpenEvidence | Perplexity | Both]
---
```

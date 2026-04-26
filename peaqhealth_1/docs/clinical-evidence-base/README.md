# Clinical Evidence Base

Structured repository of peer-reviewed evidence that grounds every clinical claim Cnvrg makes to users. Each file contains the raw output from a clinical literature synthesis query, preserved verbatim for provenance.

## Folder structure

```
docs/clinical-evidence-base/
  README.md              ← You are here
  coverage.md            ← Tracks which files exist and which are pending
  _query-template.md     ← Standard prompt for generating evidence files
  _example.md            ← Reference showing expected format
  genera/                ← One file per genus (e.g., streptococcus.md)
  indices/               ← One file per clinical index (e.g., shannon-diversity.md)
  methodology/           ← Sequencing, database, and interpretation methodology
  interactions/          ← Multi-organism patterns (e.g., red-complex.md)
  _meta/                 ← Meta-documents about the evidence base itself
```

## File format

Each evidence file has two parts:

**The frontmatter** — structured metadata at the top:

```yaml
---
bacterium: Genus name
query_date: YYYY-MM-DD
query_template_version: v1
source: OpenEvidence | Perplexity | Both
---
```

**The body** — typically the raw response from the query, unedited. The raw form is the source of truth and audit trail.

## How content is generated

Files are populated manually by running the standard query template (see `_query-template.md`) through clinical literature synthesis tools (Open Evidence preferred, Perplexity acceptable).

The raw response is saved verbatim. Do not edit content to "improve" it — preserving the original form maintains provenance and makes updates trackable.

## How content is used

Evidence files are the source for:
- `lib/oral/bacteriaTaxonomy.ts` (categories, display info)
- The chatbot's bacterial knowledge module
- Detail page content
- The science page rewrite
- ADR justifications for clinical decisions

Structured derivatives (e.g., JSON extracts) are generated from these markdown sources, never written by hand.

## Coverage status

See `coverage.md` for which bacteria/indices have been documented and which are pending.

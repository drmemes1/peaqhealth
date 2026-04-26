# Placeholder Species Audit — 2026-04-25

## Executive Summary

Igor's L7 OTU data contains 55 placeholder species entries (sp+digits or genus-only) totaling ~15.4% of total abundance. For clinically tracked genera, the impact is concentrated in **Porphyromonas** (87% of signal hidden in placeholders) and **Streptococcus** (16% hidden). Critically, Porphyromonas sp13375 — the single largest placeholder at 1.88% — cannot be assumed pathogenic. The genus contains both health-associated commensals (P. catoniae, P. pasteri) and periodontal pathogens (P. gingivalis, P. endodontalis). Naive genus aggregation into `porphyromonas_pct` would inflate the gum health composite incorrectly. The parser fix should preserve species-level resolution for mixed-role genera and only aggregate placeholders into a separate commensal-pool bucket.

Narod's data is a pre-parsed summary (24 named species, no placeholders) — the placeholder bug only applies to L7-parsed samples. There is no pilot.3 in the database.

---

## 1. Igor (Pilot.1) — Per-Genus Breakdown

### Porphyromonas — Total: 2.18%

| Category | Abundance | Entries |
|----------|-----------|---------|
| **NAMED PATHOGENIC** | 0.19% | P. endodontalis (0.19%) |
| **NAMED COMMENSAL** | 0.09% | P. catoniae (0.03%), P. catoniae-sp13380 (0.05%) |
| **PLACEHOLDER OPAQUE** | 1.90% | sp13375 (1.88%), sp13380 (0.02%) |
| **Total** | **2.18%** | 5 entries |

**Key finding:** P. gingivalis is ABSENT from Igor's sample. The entire Porphyromonas signal is dominated by sp13375 (1.88%), which is opaque — we cannot determine if it's pathogenic or commensal from the OTU ID alone. The named pathogen (P. endodontalis) is only 0.19%. The named commensal (P. catoniae) appears twice: once as a standalone entry and once in a hyphenated form (catoniae-sp13380), suggesting the database links sp13380 to the P. catoniae cluster.

**Current DB column:** `porphyromonas_pct = 0.28%` (named entries only).
**If naively aggregated:** `porphyromonas_pct = 2.18%` — a 678% increase, most of it from a single opaque placeholder.

### Streptococcus — Total: 25.33%

| Category | Abundance | Entries |
|----------|-----------|---------|
| **NAMED COMMENSAL** | 20.32% | S. salivarius-vestibularis (15.28%), S. sanguinis (1.90%), S. parasanguinis (1.78%), S. cristatus (0.49%), S. oralis-parasanguinis (0.47%), S. gordonii (0.41%), S. infantis-sanguinis (0.33%) |
| **NAMED CARIOGENIC** | 0.51% | S. mutans (0.27%), S. sobrinus (0.24%) |
| **NAMED MIXED** | 0.18% | S. anginosus (0.06%), S. anginosus-constellatus-intermedius (0.06%), S. intermedius (0.05%) |
| **PLACEHOLDER (genus-only)** | 3.98% | 1 entry: Streptococcus;s__NA |
| **Total** | **25.33%** | 12 entries |

**Key finding:** The single placeholder is a genus-level entry with no species assignment (s__NA). Since Streptococcus is overwhelmingly commensal in this sample (80% is S. salivarius + S. sanguinis + S. parasanguinis), the 3.98% placeholder likely represents additional commensal streptococci the classifier couldn't resolve to species. This is the largest single placeholder entry across all genera.

**Current DB column:** `streptococcus_total_pct = 21.35%` (named only).
**If naively aggregated:** `25.33%`. Impact on scoring: streptococcus_total_pct is not used in any pathogen composite (it's a denominator/context metric), so this aggregation is safe.

### Fusobacterium — Total: 2.63%

| Category | Abundance | Entries |
|----------|-----------|---------|
| **NAMED PATHOGENIC** | 1.49% | F. periodonticum (1.49%) |
| **NAMED MIXED** | 1.10% | F. nucleatum (0.85%), F. canifelinum-nucleatum (0.25%) |
| **NAMED OTHER** | 0.05% | F. necrophorum (0.05%) |
| **PLACEHOLDER** | 0.00% | None |
| **Total** | **2.63%** | 4 entries |

**Key finding:** No placeholders. All Fusobacterium entries are named to species. Current DB value is correct.

### Prevotella — Total: 7.08%

| Category | Abundance | Entries |
|----------|-----------|---------|
| **NAMED COMMENSAL** | 5.37% | P. melaninogenica (2.33%), P. pallens (1.52%), P. histicola-jejuni (0.90%), P. salivae (0.55%), P. nanceiensis (0.32%), P. oris (0.35%), P. oulorum (0.14%), P. pleuritidis (0.12%), P. shahii (0.10%), P. loescheii (0.10%) |
| **NAMED PATHOGENIC** | 0.20% | P. intermedia (0.20%) |
| **NAMED OTHER** | 0.13% | P. dentalis (0.04%), P. denticola (0.03%), P. maculosa (0.03%), P. saccharolytica (0.02%), P. buccae (0.02%) |
| **PLACEHOLDER** | 0.00% | None |
| **Total** | **7.08%** | 17 entries |

**Key finding:** No placeholders. All Prevotella entries are named. Current DB values are correct.

### Tannerella — Total: 0.07%

| Category | Abundance | Entries |
|----------|-----------|---------|
| **NAMED PATHOGENIC** | 0.05% | T. forsythia (0.05%) |
| **PLACEHOLDER OPAQUE** | 0.02% | sp13426 (0.02%) |
| **Total** | **0.07%** | 2 entries |

**Key finding:** Small genus overall. The placeholder (sp13426) is tiny at 0.02%. T. forsythia (the sole red-complex Tannerella species) is properly named. Impact of aggregation: negligible.

### Treponema — Total: 0.09%

| Category | Abundance | Entries |
|----------|-----------|---------|
| **NAMED MIXED** | 0.06% | T. vincentii (0.06%) |
| **NAMED PATHOGENIC** | 0.03% | T. socranskii (0.03%) |
| **PLACEHOLDER** | 0.00% | None |
| **Total** | **0.09%** | 2 entries |

**Key finding:** No placeholders. T. denticola (red complex) is absent. All entries named.

---

## 2. Narod (Pilot.2) — No Placeholders

Narod's `raw_otu_table` contains 24 pre-parsed named species in summary format (e.g., "Porphyromonas gingivalis": 0.0105). No L7 taxonomy strings, no `__meta.entries`, no placeholder species. This data was likely imported from a Zymo summary report rather than the raw L7 OTU table.

The placeholder aggregation bug does not apply to Narod's sample.

**There is no pilot.3 in the database.**

---

## 3. Reference Database Identification

### Evidence from taxonomy strings

Igor's L7 output uses the format: `k__Bacteria;p__Firmicutes;c__Bacilli;o__Lactobacillales;f__Streptococcaceae;g__Streptococcus;s__salivarius-vestibularis`

Key indicators:
- **Prefix notation** (`k__`, `p__`, etc.): Consistent with Greengenes-style formatting
- **Hyphenated species** (`salivarius-vestibularis`, `canifelinum-nucleatum`): Indicates the classifier found ambiguous assignment between two species and reports both
- **sp+5-digit numbers** (sp13375, sp13380, sp13426): NOT HOMD HOT numbers (which are 3-digit, e.g., HOT-279). NOT Greengenes OTU IDs. These are likely **Zymo internal reference IDs** from their proprietary curated database

### Likely database

Zymo Research's full-length 16S sequencing service uses a **proprietary curated database** built on NCBI taxonomy with Zymo-specific OTU identifiers. The Greengenes-style prefix notation suggests their pipeline was originally built on Greengenes but has been extended with custom reference sequences.

The sp-numbers appear to be stable internal identifiers — the same sp13380 appears both standalone (`Porphyromonas sp13380`) and as a hyphenated qualifier (`Porphyromonas catoniae-sp13380`), indicating the database links this OTU to the P. catoniae cluster but cannot resolve it with full confidence.

### Database limitations

1. **Not eHOMD**: The numbering scheme doesn't match eHOMD HOT taxonomy
2. **Not public Greengenes**: Greengenes (v13_8) doesn't use sp+5-digit IDs
3. **Proprietary**: We cannot look up sp13375 in any public database to determine its likely species identity
4. **Modern species**: P. pasteri (described 2015) does not appear in Igor's data — either absent from his sample or not in the reference database

---

## 4. Placeholder Spot-Checks

### Porphyromonas sp13375 — The dominant placeholder

- **Full taxonomy:** `k__Bacteria;p__Bacteroidetes;c__Bacteroidia;o__Bacteroidales;f__Porphyromonadaceae;g__Porphyromonas;s__sp13375`
- **Abundance:** 1.88% — the single largest Porphyromonas entry and 86% of the genus total
- **Database status:** Zymo internal ID. Not resolvable via public databases
- **Clinical role:** Unknown. Could be P. catoniae (commensal), P. pasteri (commensal), P. gingivalis (pathogen), or an unnamed phylotype
- **Note:** The classifier DID resolve P. endodontalis, P. catoniae, and the catoniae-sp13380 hybrid — meaning sp13375 is genuinely distinct from those, not just a lower-confidence call of a known species

### Porphyromonas sp13380

- **Full taxonomy:** `k__Bacteria;...;g__Porphyromonas;s__sp13380`
- **Abundance:** 0.02%
- **Note:** Also appears as `P. catoniae-sp13380` (0.05%), suggesting the database recognizes overlap with P. catoniae. The standalone sp13380 entry may represent a sequence variant that falls just outside the P. catoniae assignment threshold

### Streptococcus NA (genus-only)

- **Full taxonomy:** `k__Bacteria;p__Firmicutes;c__Bacilli;o__Lactobacillales;f__Streptococcaceae;g__Streptococcus;s__NA`
- **Abundance:** 3.98%
- **Note:** Species field is null (s__NA), meaning the classifier resolved to genus but could not assign species. In a sample dominated by commensal streptococci (S. salivarius 15.3%, S. sanguinis 1.9%), this likely represents additional commensal diversity the full-length 16S couldn't resolve

### Tannerella sp13426

- **Full taxonomy:** `k__Bacteria;...;g__Tannerella;s__sp13426`
- **Abundance:** 0.02%
- **Note:** Could be T. forsythia (pathogen) or an unnamed Tannerella phylotype. At 0.02%, clinically insignificant either way

### Actinomyces sp4769

- **Full taxonomy:** `k__Bacteria;...;g__Actinomyces;s__sp4769`
- **Abundance:** 0.32%
- **Note:** Actinomyces is overwhelmingly commensal in the oral cavity. This placeholder likely represents A. naeslundii or A. oris, both health-associated

---

## 5. Cross-Genus Pattern Analysis

### Placeholder-to-named ratio by genus

| Genus | Total % | Placeholder % | Placeholder ratio | Named species role |
|-------|---------|--------------|-------------------|-------------------|
| **Streptococcus** | 25.33 | 3.98 (16%) | 1:5.4 | Mostly commensal |
| **Porphyromonas** | 2.18 | 1.90 (87%) | 6.8:1 | Mixed (pathogen + commensal) |
| **Actinomyces** | 7.38 | 0.32 (4%) | 1:22 | Commensal |
| **Aggregatibacter** | 1.84 | 0.20 (11%) | 1:8.4 | Mixed (pathogen) |
| **Tannerella** | 0.07 | 0.02 (30%) | 1:2.4 | Pathogenic |
| **Fusobacterium** | 2.63 | 0.00 (0%) | — | Mixed |
| **Prevotella** | 7.08 | 0.00 (0%) | — | Mostly commensal |
| **Treponema** | 0.09 | 0.00 (0%) | — | Pathogenic |

### Key observations

1. **Porphyromonas is the outlier.** It's the only tracked genus where placeholders dominate (87%). For every other genus, named species represent >70% of signal.

2. **Fusobacterium, Prevotella, and Treponema have zero placeholders.** The Zymo classifier resolves these well at species level.

3. **Streptococcus has the largest absolute placeholder** (3.98%), but it's a small fraction (16%) of the genus total and Streptococcus is overwhelmingly commensal. Safe to aggregate.

4. **Aggregatibacter** has a small placeholder (0.20% of 1.84%). Aggregatibacter is primarily pathogenic in oral contexts (A. actinomycetemcomitans). This warrants caution but the absolute magnitude is small.

5. **The pattern is NOT uniform.** This is genus-specific, not a systemic pipeline problem. The Zymo classifier performs well for most genera.

---

## 6. Recommendations

### R1: Do NOT naively aggregate Porphyromonas placeholders into `porphyromonas_pct`

The current parser fix (PR α) would change `porphyromonas_pct` from 0.28% to 2.18%. This is technically correct at genus level but clinically misleading. The 2.18% would feed directly into the gum health composite (`gumHealthTotal = fu + ag + ca + po + ta + tr + pi`), inflating it by ~1.9 percentage points. Since P. gingivalis is absent and the dominant entry is an opaque placeholder, this inflation is not evidence of periodontal pathogen burden.

**Recommendation:** Split Porphyromonas into two buckets:
- `porphyromonas_gingivalis_pct` — only P. gingivalis (currently 0%, correct)
- `porphyromonas_pct` — genus total including placeholders (for treemap display)

The gum health composite should use `porphyromonas_gingivalis_pct`, not the genus total.

### R2: Safe to aggregate for Streptococcus, Actinomyces, and other commensal-dominant genera

For genera where the clinical role is uniformly commensal or where placeholders are small, naive genus aggregation is safe:
- **Streptococcus**: 3.98% placeholder is safe to add to total (context metric, not pathogen signal)
- **Actinomyces**: 0.32% placeholder is safe (commensal genus)
- **Aggregatibacter**: 0.20% placeholder — cautious aggregation acceptable given small magnitude

### R3: Tannerella needs no special handling

T. forsythia is the only oral Tannerella species of clinical significance. The placeholder (sp13426, 0.02%) is negligible. Current handling (species-level via SPECIES_COLUMNS) is correct.

### R4: The reference database is a known limitation but not actionable now

The Zymo proprietary database with sp+5-digit IDs cannot be cross-referenced against public databases. We cannot determine what sp13375 actually is without either:
- Asking Zymo for their reference mapping
- Re-analyzing the raw sequences against eHOMD

This is a future improvement, not a blocker for the current fix.

### R5: Recommended parser fix architecture

The next PR should:
1. **Add a species-specific column for P. gingivalis** (`p_gingivalis_pct`) — only P. gingivalis maps here
2. **Keep `porphyromonas_pct` as genus total** (including placeholders) — used for treemap display
3. **Update gum health composite** to use `p_gingivalis_pct` instead of `porphyromonas_pct`
4. **Aggregate placeholders into genus columns** for all other tracked genera (Streptococcus, Actinomyces, Aggregatibacter, etc.)
5. **Bump parser version to v4** with a note about the aggregation change

This preserves species-level clinical precision for the genus that needs it (Porphyromonas) while fixing the undercounting bug for all other genera.

---

## Appendix: Complete placeholder inventory (Igor)

55 placeholder entries totaling ~15.4% of sample:

| Genus | Species | Abundance % |
|-------|---------|------------|
| Streptococcus | (genus-only, s__NA) | 3.976 |
| NA | sp33423 | 1.922 |
| Porphyromonas | sp13375 | 1.875 |
| NA | sp66100 | 1.163 |
| Alloprevotella | sp13492 | 0.904 |
| Leptotrichia-Streptobacillus | (genus-only) | 0.645 |
| *Saccharimonas | sp65962 | 0.370 |
| Actinomyces | sp4769 | 0.319 |
| Leptotrichia | sp37521-wadei | 0.315 |
| Abiotrophia | sp28088 | 0.312 |
| Actinobacillus | sp62066 | 0.270 |
| NA | sp65941 | 0.254 |
| NA | sp37035 | 0.250 |
| Leptotrichia | sp37518 | 0.226 |
| Aggregatibacter | sp62087 | 0.196 |
| NA | sp4816 | 0.173 |
| NA | sp13879 | 0.169 |
| NA | sp66034 | 0.134 |
| NA | sp4820 | 0.133 |
| NA | sp66108 | 0.118 |
| NA | sp66013 | 0.117 |
| NA | sp19816 | 0.111 |
| *Saccharimonas | sp65946 | 0.101 |
| Bergeyella | sp16471 | 0.099 |
| Peptococcus | sp34118 | 0.096 |
| NA | sp66127 | 0.096 |
| Leptotrichia | sp37519 | 0.089 |
| NA | sp31630 | 0.083 |
| Capnocytophaga | sp16514 | 0.082 |
| Megasphaera | sp36947 | 0.076 |
| NA | sp13865 | 0.066 |
| Selenomonas | sp37072 | 0.057 |
| NA | sp35348 | 0.056 |
| NA | sp35352 | 0.054 |
| Capnocytophaga | sp16511 | 0.052 |
| Alloprevotella | sp13491 | 0.049 |
| Alloprevotella | sp13514 | 0.049 |
| Selenomonas | sp37070 | 0.043 |
| Johnsonella | sp32278 | 0.041 |
| Capnocytophaga | sp16520 | 0.039 |
| NA | sp13899 | 0.038 |
| Oribacterium | sp33063 | 0.034 |
| NA | sp50027 | 0.028 |
| Porphyromonas | sp13380 | 0.023 |
| Capnocytophaga | sp16491 | 0.022 |
| Tannerella | sp13426 | 0.021 |
| NA | sp13876 | 0.020 |
| NA | sp4819 | 0.017 |
| Alloprevotella | sp13512-sp13517 | 0.017 |
| NA | sp37040 | 0.017 |
| NA | sp50030 | 0.017 |
| Fretibacterium | sp67092 | 0.017 |
| Bergeyella | sp16466 | 0.016 |
| NA | sp46933 | 0.015 |
| *Saccharimonas | sp65955 | 0.015 |

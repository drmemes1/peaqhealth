# HRV (Heart Rate Variability) — Peaq Health Reference Document

**Version:** 1.0  
**Date:** April 2026  
**Status:** Pre-Bale call draft — open questions flagged in Section 9  
**Audience:** Formula decisions, Claude Code implementation, scientific review

---

## Section 1 — Evidence Base: Why HRV Is in the Formula

### 1.1 Mortality Evidence

HRV (measured as RMSSD) is an independent predictor of all-cause mortality with strong prospective evidence:

| Study | N | Finding |
|-------|---|---------|
| Shaffer & Ginsberg, Neurosci Biobehav Rev 2022 | 38,008 (meta, 32 studies) | Lowest RMSSD quartile → 56% increased all-cause mortality |
| Fang et al., Clin Res Cardiol 2020 | CVD populations | HR = 2.27 for all-cause death in low-HRV group |
| ELSA-Brasil cohort, Eur J Prev Cardiol 2025 | 13,739 | HRV and RHR are **independent** predictors after mutual adjustment — non-overlapping signal |
| Tsuji et al., Circulation 1994 | 2,501 | Each 1-SD decrease in RMSSD → HR 1.47 for cardiac death |

### 1.2 Independence from RHR

The ELSA-Brasil 2025 finding is the critical justification for including both HRV and RHR in the formula. After full mutual adjustment (age, sex, BMI, smoking, diabetes, hypertension, physical activity), both remained significant independent predictors. They capture non-overlapping autonomic signal:

- **RHR** reflects predominantly sympathetic tone and metabolic demand
- **HRV (RMSSD)** reflects predominantly parasympathetic (vagal) tone and autonomic flexibility

A user can have a "good" RHR (55 bpm) and poor HRV (18ms) — common in overtrained athletes. A user can have an average RHR (68 bpm) and excellent HRV (62ms) — common in meditators and stress-resilient individuals. The formula captures both.

### 1.3 Mechanistic Pathway

RMSSD reflects high-frequency vagal modulation of the sinoatrial node. Higher vagal tone → greater beat-to-beat variability → lower RMSSD aging rate. Proposed mechanisms linking low HRV to mortality:

1. Autonomic imbalance → increased susceptibility to arrhythmia
2. Reduced baroreflex sensitivity → impaired cardiovascular regulation
3. Sympathetic dominance → chronic low-grade inflammation (elevated CRP, IL-6)
4. Impaired parasympathetic anti-inflammatory reflex (Tracey 2002 — vagal anti-inflammatory pathway)

Pathway 3 is directly relevant to the Peaq cross-panel model: oral dysbiosis → systemic inflammation → suppressed vagal tone → low HRV. This is the Gabby finding (Neisseria 2.7%, HRV 32ms, expected ~47ms for 32F).

### 1.4 Weight Justification: 8%

8% reflects:
- Strong mortality evidence (56% increased risk in lowest quartile — larger effect than sleep regularity)
- Universal wearable availability (WHOOP, Oura, Apple all expose RMSSD natively)
- Independence from RHR (justifies inclusion alongside the 11% RHR component)
- Conservatism relative to VO₂ max (13% in the JSX version) given HRV's higher day-to-day noise

---

## Section 2 — Measurement Specification

### 2.1 Which Metric: RMSSD

**Use RMSSD exclusively. Not SDNN, not pNN50, not LF/HF ratio, not frequency domain.**

RMSSD (Root Mean Square of Successive Differences) is:
- The standard metric for parasympathetic HRV in consumer wearables
- Less sensitive to respiration rate artifacts than frequency domain measures
- What WHOOP, Oura, and Apple Health all natively compute and expose
- The metric used in all cited mortality studies

Unit: **milliseconds (ms)**. Store as `hrv_rmssd DECIMAL(6,2)` in the database.

### 2.2 Measurement Window

- **Source:** Overnight measurement only — not daytime spot checks, not 5-minute morning readings
- **WHOOP:** Provides nightly average RMSSD during sleep; this is what we use
- **Oura:** Provides nightly average HRV; verify this is overnight RMSSD, not a derived score
- **Apple Health:** HRV samples during sleep — average nightly samples, not daytime readings

**Do NOT use:**
- WHOOP daytime recovery HRV readings (not directly comparable to overnight)
- Oura "HRV balance" score (a derived score, not raw RMSSD)
- Any single spot reading (too noisy)

### 2.3 Rolling Window

- **Window:** 30-night rolling average
- **Minimum for formula contribution:** 20 nights (see Section 4 — Outlier Protection)
- **Collection:** Store each night individually in `wearable_sleep_data`; compute rolling statistics in `recalculate.ts`

---

## Section 3 — Age/Sex Normalization

### 3.1 Reference Population

**Primary source:** Pinheiro et al., Global Heart 2020 (n=14,838)  
URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC7583712/

This is the largest published RMSSD reference dataset with age/sex stratification. Values are overnight RMSSD in ms.

### 3.2 Reference Table (Pinheiro 2020 — Median RMSSD by Age Decade and Sex)

| Age decade | Female median (ms) | Female IQR | Male median (ms) | Male IQR |
|------------|-------------------|------------|-----------------|----------|
| 18-29 | 52 | 38-71 | 47 | 34-65 |
| 30-39 | 47 | 34-64 | 43 | 31-60 |
| 40-49 | 39 | 28-55 | 36 | 26-51 |
| 50-59 | 31 | 22-44 | 29 | 21-42 |
| 60-69 | 24 | 17-35 | 23 | 16-33 |
| 70+ | 19 | 13-27 | 18 | 13-26 |

*Note: These are approximate medians from Pinheiro 2020 Table 2. Verify exact values against the paper before final implementation. IQR used for outlier clipping (Section 4.3).*

### 3.3 Normalization Method: Percentile, Not Z-score

Convert raw RMSSD to a percentile within the user's age/sex decade using linear interpolation between the published IQR bounds. This is more robust than z-score for a non-normally distributed variable like RMSSD.

```
Approximate percentile mapping:
  RMSSD < P25 (lower IQR bound): percentile = 25 * (RMSSD / P25)
  P25 <= RMSSD <= P75: percentile = 25 + 50 * ((RMSSD - P25) / (P75 - P25))
  RMSSD > P75: percentile = 75 + 25 * ((RMSSD - P75) / (P95 - P75))
  Cap at 1st and 99th percentile
```

*If more granular percentile tables become available (e.g. from Bale call or additional literature), replace with full percentile interpolation.*

### 3.4 HRV Delta Calculation

```typescript
// hrv_delta = -(hrv_percentile - 50) * scaling_factor, capped +/-6 years
// Scaling factor: 0.12 (more conservative than RHR's 0.10 due to higher noise)
// At 10th percentile: delta = -(10-50) * 0.12 = +4.8 years (accelerated)
// At 90th percentile: delta = -(90-50) * 0.12 = -4.8 years (optimized)
const hrv_delta = capVal(-(hrv_percentile - 50) * 0.12, 6);
```

**Rationale for +/-6 cap:** Same as RHR. A single autonomic metric should not contribute more than 6 years to the composite in either direction.

---

## Section 4 — Outlier Protection

### 4.1 Minimum Nights Gate

**Require >= 20 nights before HRV contributes to the Peaq Age formula.**

Below 20 nights:
- HRV is displayed on the dashboard as informational only
- Show asterisk label: *"HRV signal building (X/20 nights)"*
- HRV's 8% weight redistributes proportionally to RHR and sleep components:
  - RHR gets: 8% x (11/20) = +4.4% -> total RHR weight ~ 15.4%
  - Sleep duration gets: 8% x (5/20) = +2.0% -> total ~ 7%
  - Sleep regularity gets: 8% x (4/20) = +1.6% -> total ~ 5.6%
  - *Exact redistribution uses the same proportional scaling as hasBW/hasOMA*

**Why 20 nights:** Below 20 nights, the rolling median is not statistically stable enough to represent the user's baseline. At 20+ nights, extreme outlier nights represent <5% of the window.

### 4.2 Rolling Median (Not Mean)

Once >= 20 nights are available, compute the **median RMSSD** over the 30-night window, not the mean.

**Why median:** The median is resistant to outliers by definition. A single night at 18ms when the baseline is 45ms shifts the median by ~1ms; it would shift the mean by ~5ms. One bad night (illness, alcohol, travel stress) should not penalize the user's Peaq Age for 30 days.

```typescript
function rollingMedianRMSSD(nights: number[]): number {
  const sorted = [...nights].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
```

### 4.3 IQR Clipping

Before computing the median, remove nights where RMSSD is anomalously low using the user's own 30-night distribution:

```typescript
function iqrClip(nights: number[]): number[] {
  const sorted = [...nights].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const floor = q1 - 2.5 * iqr;
  // Only clip extreme low outliers (not high -- high HRV is always favorable)
  return nights.filter(n => n >= floor);
}
```

**Example:** User's 30-night distribution: Q1=35ms, Q3=48ms, IQR=13ms  
Clip floor = 35 - (2.5 x 13) = 2.5ms  
Only nights below 2.5ms get removed — extremely conservative, catches only truly anomalous readings (hardware error, extremely sick night).

**Why 2.5x IQR:** Standard Tukey fence is 1.5x. We use 2.5x because we want to preserve legitimate low-HRV nights (real stress, real illness) and only remove measurement artifacts or catastrophic outliers. The point is not to improve the user's score — it's to remove noise.

### 4.4 Worked Example (Gabriella)

30-night RMSSD data: mean=32.3ms, range 21-42ms, all within IQR (no clipping needed)  
Expected for 32F: median ~47ms (30-39 age decade, female)  
Percentile: approximately 20th (RMSSD 32ms vs IQR 34-64ms for 30-39F)  
HRV delta = -(20-50) x 0.12 = +3.6 years  
Weight: 8% -> contribution = 0.08 x 3.6 = +0.29 years to Peaq Age

*Note: HRV delta is explicitly NOT currently included in the V5 Peaq Age formula as implemented in Phase 1. It will be added in the next formula version. The Gabriella calculation above shows how it would behave.*

---

## Section 5 — Female-Specific Adjustments

### 5.1 Menstrual Cycle Phase Effect

RMSSD varies systematically across the menstrual cycle:

| Phase | Days | RMSSD change vs follicular |
|-------|------|---------------------------|
| Follicular | 1-14 | Baseline |
| Ovulation | ~14 | +2 to +5ms (LH surge -> vagal activation) |
| Luteal | 15-28 | **-5 to -10ms** (progesterone -> sympathetic shift) |

Source: Bai et al., Front Physiol 2022; Shaffer & Ginsberg meta-analysis subgroup analysis.

**Implication:** A female user measured primarily in her luteal phase will have a systematically lower 30-night median RMSSD than one measured in the follicular phase — not because of biological aging, but because of normal hormonal variation. This would incorrectly penalize her Peaq Age.

### 5.2 Proposed Phase Correction (v5.1 — not in current implementation)

If cycle phase data is available from the lifestyle questionnaire (last period date):

```
corrected_RMSSD = raw_RMSSD + phase_correction
where phase_correction:
  Follicular: +0ms
  Ovulatory:  -3ms (adjustment already elevated, bring toward baseline)
  Luteal:     +6ms (correct for the progesterone suppression)
  Unknown:    +0ms (no correction)
```

**Implementation gate:** Requires `last_period_date` or `cycle_phase` in `lifestyle_records`. This field is not in the current schema. Flag as Phase 3 addition.

**Display:** When cycle correction is active, show "HRV adjusted for cycle phase" tooltip on the HRV metric in the dashboard.

### 5.3 Menopause / Perimenopause

Post-menopausal females show RMSSD values closer to same-age males (estrogen withdrawal reduces the female HRV advantage). Pinheiro 2020 likely captures this in the 60+ age decade. No explicit correction needed if using age-decade normalization — the reference population includes post-menopausal women. Flag for Bale call: does she recommend separate pre/post-menopausal reference tables?

---

## Section 6 — Trend Modifier

### 6.1 Rationale

A user at the 30th percentile for RMSSD but improving +15% over 90 days is in a fundamentally different biological trajectory than a user at the same percentile but declining. The current formula captures absolute level only. The trend modifier rewards genuine biological improvement in real time.

### 6.2 Calculation

```typescript
// Requires >= 90 days of HRV data to compute trend
// Slope = linear regression of median_RMSSD vs time (days)
// Significance: p < 0.10 (permissive -- effect is small anyway)

function hrvTrendModifier(nights: DatedRMSSD[]): number {
  if (nights.length < 90) return 0; // Not enough data
  
  const slope = linearRegressionSlope(nights); // ms/day
  const pValue = slopeSignificance(nights);
  
  if (pValue > 0.10) return 0; // Not significant
  
  // Convert slope to annual trend
  const annualChange = slope * 365; // ms/year
  
  // Cap modifier at +/-0.2 years
  if (annualChange > 3) return -0.2;  // Improving >3ms/yr -> -0.2 yrs
  if (annualChange > 1.5) return -0.1; // Improving >1.5ms/yr -> -0.1 yrs
  if (annualChange < -3) return +0.2;  // Declining >3ms/yr -> +0.2 yrs
  if (annualChange < -1.5) return +0.1; // Declining >1.5ms/yr -> +0.1 yrs
  return 0;
}
```

**Why +/-0.2 year cap:** Small enough to not meaningfully distort the formula, large enough to be motivationally visible to the user. The trend modifier is a signal of direction, not a dominant factor.

### 6.3 Display

Show trend arrow on HRV metric in dashboard:
- Up arrow: Improving (+3ms/yr or more) -> green arrow
- Right arrow: Stable -> neutral
- Down arrow: Declining -> amber arrow (not red — declining HRV is a flag, not an alarm)

---

## Section 7 — Cross-Panel Interactions Involving HRV

### 7.1 Current Interactions (V5 as Implemented)

The V5 Peaq Age formula cross-panel interactions (I1, I2, I3) currently reference RHR, not HRV:

- **I2:** OMA x Fitness — fires when OMA > 70th pct AND RHR < (expectedRHR - 5) -> -0.2 yrs

### 7.2 Proposed HRV Cross-Panel Extensions

**I2 extension — Oral x HRV coherence:**

The mechanistic pathway is clearer with HRV than with RHR:
Neisseria depletion -> reduced NO production -> increased sympathetic tone -> reduced parasympathetic (HRV)

Proposed update to I2:
```
I2 fires when:
  OMA > 70th percentile (good oral microbiome) 
  AND HRV > 60th percentile for age/sex
  -> -0.2 yrs (coherent favorable state across oral + autonomic)

OR:
  OMA < 30th percentile (dysbiotic)
  AND HRV < 30th percentile for age/sex
  -> +0.2 yrs (coherent unfavorable state -- both signals converging)
```

*Note: Currently I2 is favorable-only (-0.2 yrs). The addition of the unfavorable direction (+0.2 yrs for OMA x HRV convergence) should be discussed — it increases the formula's sensitivity to the oral-autonomic pathway but adds complexity.*

**I4 proposal — Blood x HRV (inflammatory autonomic suppression):**

hs-CRP > 3.0 mg/L + HRV < 25th percentile for age/sex -> +0.3 yrs  
hs-CRP < 1.0 mg/L + HRV > 70th percentile -> -0.2 yrs

Mechanistic basis: IL-6 and TNF-alpha directly suppress vagal tone (Irwin & Cole 2011). Elevated systemic inflammation and low HRV are not independent — they form a positive feedback loop. Detecting their co-occurrence adds information beyond either signal alone.

*Status: Proposed, not implemented. Gate on hs-CRP availability (same as I1, I3).*

### 7.3 The Gabby Case

Gabriella's HRV (32ms) is at approximately the 20th percentile for a 32-year-old female (expected median ~47ms, Pinheiro 2020). Her Neisseria combined abundance is ~8% — at approximately the 10th percentile for nitrate reducers.

The Oral x HRV pathway fits: depleted nitrate-reducing bacteria -> impaired endothelial NO synthesis -> elevated sympathetic tone -> suppressed RMSSD. This is the connection the OpenAI narrative layer should surface for users like her.

If the beetroot protocol restores Neisseria from 8% to 20%+ (Vanhatalo 2018: +351% in 10 days), HRV should rise toward 40-45ms within 2-4 weeks — visible on her Oura Ring before the 6-week OMA retest confirms the microbiome change.

---

## Section 8 — What HRV Is NOT in This Formula

**HRV in Peaq Age is not:**
- A recovery score (that's WHOOP's interpretation layer)
- A readiness score (that's Oura's interpretation layer)
- A stress indicator (though stressed people tend to have lower HRV)
- A direct measure of fitness (VO2 max is the fitness metric — HRV overlaps partially but measures autonomic function, not cardiorespiratory capacity)
- A daily metric (we use the 30-night rolling median — it does not change day-to-day)

**Why this matters for user communication:**

Users will say "my recovery was 85% today but my HRV component shows attention — why?" The answer: WHOOP's recovery score uses a different algorithm (proprietary), includes strain from the previous day, and is optimized for short-term athletic decisions. Peaq's HRV component uses only the objective RMSSD measurement normalized to population norms for biological age assessment. A 35-year-old with RMSSD of 28ms has a low HRV component regardless of what WHOOP says their recovery is.

---

## Section 9 — Open Questions for Bale Call

### Formula questions:

1. Does she recommend a different reference dataset than Pinheiro 2020 for RMSSD age/sex norms? Specifically: does she have access to the UK Biobank HRV data at scale?

2. Her view on HRV as a biological age *input* vs a *health monitoring signal* — does she think RMSSD belongs in a composite biological age formula alongside PhenoAge, or is she more comfortable with it as a separate display metric?

3. Sex-specific normalization beyond the age/sex table — does she recommend separate pre/post-menopausal reference populations for female users?

4. The oral-autonomic pathway (Neisseria -> NO -> HRV): does she validate this as a mechanism strong enough to justify a cross-panel interaction term? This would strengthen I2/I4 considerably if she does.

5. DunedinPACE vs PhenoAge for young adult calibration — she may have a strong view on this. If she recommends DunedinPACE for under-40 users, that changes the blood panel at 48% weight.

### Implementation questions:

6. What p-value threshold is appropriate for the HRV trend modifier? We used p < 0.10 (permissive). She may prefer p < 0.05 (standard) even at the cost of needing more data.

7. The luteal phase correction (+6ms) — does she have a published estimate, or should we use the Bai 2022 range (5-10ms) and apply the midpoint?

8. For the I4 interaction (Blood x HRV): what hs-CRP threshold is she comfortable with for the "high inflammation + low HRV" convergence signal? We proposed >3.0 mg/L. She may prefer >2.0 mg/L given the autonomic literature.

### Strategic questions:

9. Does she have unpublished data from her own lab that would strengthen or weaken any of these positions?

10. Would she be willing to be acknowledged as a scientific advisor in the Peaq Health methodology documentation?

---

## Section 10 — Changelog

| Version | Date | Change | Reason |
|---------|------|--------|--------|
| 1.0 | April 2026 | Initial document | Pre-Bale call specification |

---

## Appendix A — Implementation Checklist for Claude Code

When implementing HRV in the Peaq Age formula (post-Bale call):

- [ ] Add `hrv_rmssd` rolling median to `recalculate.ts` inputs (already stored in `wearable_sleep_data`)
- [ ] Implement `rollingMedianRMSSD()` with IQR clipping
- [ ] Implement `hrv_nights_count` check — gate at 20 nights
- [ ] Implement `rmssdToPercentile(rmssd, age, sex)` using Pinheiro 2020 table
- [ ] Implement `hrv_delta` = -(percentile - 50) x 0.12, capped +/-6
- [ ] Add `has_hrv: boolean` to weight redistribution logic (same pattern as `hasBW`, `hasOMA`)
- [ ] Update `PeaqAgeResult` type to include `hrvPct`, `hrvDelta`, `hrvNights`, `hrvAsterisked`
- [ ] Update `score_snapshots` migration: add `hrv_percentile`, `hrv_delta`, `hrv_nights`, `hrv_asterisked`
- [ ] Update dashboard HRV display: asterisk if < 20 nights, trend arrow if >= 90 days
- [ ] Update AI prompt context: include HRV percentile and whether asterisked
- [ ] Update science page: add HRV to weight table and evidence section
- [ ] Unit tests: Gabriella (32F, 32ms -> ~20th pct -> +0.29yr contribution), night gate, IQR clip

## Appendix B — Reference List

1. Shaffer F, Ginsberg JP. An Overview of Heart Rate Variability Metrics and Norms. Front Public Health. 2022. https://pubmed.ncbi.nlm.nih.gov/36243195/
2. Fang SC et al. Heart Rate Variability and All-cause Mortality in Patients with Coronary Artery Disease. Clin Res Cardiol. 2020. https://pubmed.ncbi.nlm.nih.gov/31558032/
3. ELSA-Brasil cohort. RHR and HRV as Independent Predictors of Mortality. Eur J Prev Cardiol. 2025. https://pubmed.ncbi.nlm.nih.gov/40180141/
4. Tsuji H et al. Impact of Reduced Heart Rate Variability on Risk for Cardiac Events. Circulation. 1994. PMID: 8087064
5. Pinheiro I et al. Heart Rate Variability Reference Values in a Large Population-based Sample. Global Heart. 2020. https://pmc.ncbi.nlm.nih.gov/articles/PMC7583712/
6. Bai X et al. HRV During the Menstrual Cycle. Front Physiol. 2022. PMID: 35692454
7. Vanhatalo A et al. Nitrate-rich vegetables increase plasma nitrate and nitrite concentrations and lower blood pressure in healthy adults. J Nutr. 2018. PMID: 29659968
8. Irwin MR, Cole SW. Reciprocal regulation of the neural and innate immune systems. Nat Rev Immunol. 2011. PMID: 21935334
9. Tracey KJ. The inflammatory reflex. Nature. 2002. PMID: 12490954
10. Adibi S et al. hs-CRP and Sleep Architecture Interactions. Nutrients. 2026. https://pmc.ncbi.nlm.nih.gov/articles/PMC12844810/

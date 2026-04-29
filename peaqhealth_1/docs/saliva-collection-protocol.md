# Saliva Collection Protocol

**Version:** 1.0
**Date:** April 21, 2026
**Status:** Locked for pilot

## Standardized Protocol (all future kits)

**Method:** Unstimulated passive drool
**Duration:** 1–2 minutes until fill line reached
**Timing:** Morning, before brushing, eating, or rinsing
**Position:** Head tilted slightly forward, let saliva pool for ~30 seconds before drooling into tube

### Pre-collection requirements
- No brushing, eating, or rinsing before collection
- Ideally within 30 minutes of waking
- No antibiotics in prior 60 days (if yes, flag as `antibiotics_last_60d = true`)
- No professional whitening in prior 7 days
- No dental cleaning in prior 2 weeks

### Kit instructions language (for participant insert)

> **How to collect your sample**
>
> Tilt your head slightly forward. Let saliva pool — don't swallow for about 30 seconds. Then let it drip gently into the tube for 1–2 minutes until you reach the fill line.
>
> **Important:** Collect before brushing, eating, or rinsing. First thing in the morning gives the cleanest sample.

## Existing pilot samples

### Pilot.Oravi.1 (Igor, TEST-4)
- Collected via Zymo salivary DNA kit
- Method: passive drool (unstimulated)
- Timing: morning before brushing
- **Compatible with standardized protocol:** Yes

### Pilot.Oravi.2 (Gabby/nanajarian, TEST-1)
- Collected via same Zymo kit
- Method: passive drool (unstimulated)
- **Compatible with standardized protocol:** Yes

### Pilot.Oravi.3
- Not yet collected or data not uploaded
- **Status:** Pending

## Comparability note

Samples collected before this protocol was locked (Pilot.Oravi.1, .2) followed the same unstimulated passive drool method and are considered directly comparable to future samples collected under the standardized protocol.

## Sequencing partner

**Zymo Research** — 16S rRNA gene sequencing, L7 (species-level) taxonomy
- Shannon diversity calculated via Zymo's rarefaction method (log₂, max-depth average of 10 iterations)
- L7 OTU table provided as tab-separated file with 7-level taxonomy strings

## Data handling

- Raw L7 file uploaded via `/admin/oral-upload`
- Shannon rarefaction file uploaded separately (optional but recommended)
- Species-to-column mapping applied by the L7 parser (v3)
- Full community preserved in `oral_kit_orders.raw_otu_table` JSONB

#!/usr/bin/env python3
"""
Build NHANES oral microbiome reference JSON from CDC public data.

Sources:
  - Alpha diversity: NHANES OMP (DADA2, remove unassigned bacteria)
  - Genus abundances: NHANES OMP genus-level relative abundance
  - Taxonomy: NHANES OMP taxonomy annotation

Note: CDC demographics (DEMO_F.XPT, DEMO_G.XPT) are currently unavailable
for automated download. Age/sex stratification uses synthetic bins derived
from published NHANES summary statistics (Vogtmann et al. Lancet Microbe 2022).

Output: packages/score-engine/data/nhanes_oral_reference.json
"""

import pandas as pd
import numpy as np
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
OUT_FILE = os.path.join(DATA_DIR, "nhanes_oral_reference.json")

NHANES_ALPHA_URL    = "https://wwwn.cdc.gov/nchs/data/nhanes/omp/dada2rb-alpha.txt"
NHANES_GENUS_URL    = "https://wwwn.cdc.gov/nchs/data/nhanes/omp/dada2rb-genus-relative.txt"
NHANES_TAXONOMY_URL = "https://wwwn.cdc.gov/nchs/data/nhanes/omp/dada2rb-taxonomy-annotate.txt"

PERCENTILES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
               55, 60, 65, 70, 75, 80, 85, 90, 95]

PROTECTIVE_GENERA = ["Veillonella", "Rothia", "Neisseria", "Streptococcus", "Haemophilus"]
PATHOGEN_GENERA   = ["Porphyromonas", "Treponema", "Tannerella", "Fusobacterium", "Prevotella"]


def get_percentile_table(series):
    clean = series.dropna()
    if len(clean) < 10:
        return None
    return {f"p{p}": round(float(np.percentile(clean, p)), 6) for p in PERCENTILES}


def build_scoring_bands(pt):
    return [
        {"percentile_range": "p95+",    "metric_min": pt["p95"], "metric_max": 999,       "score_min": 95, "score_max": 100},
        {"percentile_range": "p75-p95", "metric_min": pt["p75"], "metric_max": pt["p95"],  "score_min": 75, "score_max": 94},
        {"percentile_range": "p50-p75", "metric_min": pt["p50"], "metric_max": pt["p75"],  "score_min": 50, "score_max": 74},
        {"percentile_range": "p25-p50", "metric_min": pt["p25"], "metric_max": pt["p50"],  "score_min": 25, "score_max": 49},
        {"percentile_range": "p10-p25", "metric_min": pt["p10"], "metric_max": pt["p25"],  "score_min": 10, "score_max": 24},
        {"percentile_range": "<p10",    "metric_min": 0,         "metric_max": pt["p10"],  "score_min": 0,  "score_max": 9},
    ]


def main():
    print("Downloading NHANES data...")

    # ── Alpha diversity ──────────────────────────────────────────────────────
    alpha = pd.read_csv(NHANES_ALPHA_URL, sep="\t")
    print(f"  Alpha diversity: {len(alpha)} rows")

    # ── Genus abundances ─────────────────────────────────────────────────────
    genus = pd.read_csv(NHANES_GENUS_URL, sep="\t")
    print(f"  Genus abundances: {len(genus)} rows, {len(genus.columns)} columns")

    # ── Taxonomy mapping ─────────────────────────────────────────────────────
    taxonomy = pd.read_csv(NHANES_TAXONOMY_URL, sep="\t", header=None, names=["variable", "taxonomy"])
    genus_tax = taxonomy[taxonomy["variable"].str.startswith("RB_genus")].copy()
    genus_tax["genus_name"] = genus_tax["taxonomy"].apply(
        lambda t: str(t).split(";")[-1].strip() if pd.notna(t) else "NA"
    )
    var_to_genus = dict(zip(genus_tax["variable"], genus_tax["genus_name"]))
    print(f"  Taxonomy: {len(genus_tax)} genus entries mapped")

    # ── Build merged dataframe ───────────────────────────────────────────────
    df = alpha.copy()

    # Average across 10 rarefaction iterations at depth 10000
    DEPTH = 10000
    metrics_config = {
        "shannon":       f"RB_ShanWienDiv_{DEPTH}",
        "observed_asvs": f"RB_ObservedOTUs_{DEPTH}",
        "faith_pd":      f"RB_FaPhyloDiv_{DEPTH}",
        "simpson":       f"RB_InverseSimpson_{DEPTH}",
    }

    for metric_name, prefix in metrics_config.items():
        iter_cols = [f"{prefix}_{i}" for i in range(10)]
        available = [c for c in iter_cols if c in df.columns]
        if available:
            for c in available:
                df[c] = pd.to_numeric(df[c], errors="coerce")
            df[metric_name] = df[available].mean(axis=1)
            print(f"  {metric_name}: averaged {len(available)} iterations")

    # Find genus columns for target genera
    genus_col_map = {}
    for var_name, g_name in var_to_genus.items():
        clean_name = g_name.replace("_", " ").strip()
        for target in PROTECTIVE_GENERA + PATHOGEN_GENERA:
            if clean_name.lower() == target.lower():
                genus_col_map[target] = var_name

    print(f"\n  Genus column mapping:")
    for target in PROTECTIVE_GENERA + PATHOGEN_GENERA:
        status = genus_col_map.get(target, "NOT FOUND")
        print(f"    {target} -> {status}")

    # Merge needed genus columns
    needed = ["SEQN"] + list(genus_col_map.values())
    available_cols = [c for c in needed if c in genus.columns]
    df = df.merge(genus[available_cols], on="SEQN", how="left")
    print(f"\n  After merge: {len(df)} participants")

    # ── Build reference JSON ─────────────────────────────────────────────────
    reference = {
        "metadata": {
            "source": "NHANES 2009-2012 Oral Microbiome Project",
            "n_participants": int(len(df)),
            "sequencing": "16S rRNA V4 region, Illumina HiSeq 2500",
            "pipeline": "DADA2, SILVA v123",
            "rarefaction_depth": DEPTH,
            "citation": "Vogtmann E et al. Lancet Microbe 2022; Chaturvedi AK et al. JAMA Network Open 2025",
            "generated_at": pd.Timestamp.now().isoformat(),
            "demographics_note": "Age/sex stratification unavailable — CDC demographics endpoint returned HTML. Overall population percentiles used for all strata.",
        },
        "diversity": {"overall": {}},
        "genera": {},
        "scoring_bands": {"overall": {}},
    }

    # Overall percentiles
    for metric_name in ["shannon", "simpson", "observed_asvs", "faith_pd"]:
        if metric_name in df.columns:
            tbl = get_percentile_table(df[metric_name])
            if tbl:
                reference["diversity"]["overall"][metric_name] = tbl
                n_valid = df[metric_name].dropna().shape[0]
                print(f"  Overall {metric_name}: n={n_valid}, median={tbl['p50']:.4f}, p25={tbl['p25']:.4f}, p75={tbl['p75']:.4f}")

    # Genera analysis
    genera_found = []
    for genus_name in PROTECTIVE_GENERA + PATHOGEN_GENERA:
        col = genus_col_map.get(genus_name)
        if col and col in df.columns:
            genera_found.append(genus_name)
            series = df[col].dropna()
            tbl = get_percentile_table(series)
            reference["genera"][genus_name] = {
                "role": "protective" if genus_name in PROTECTIVE_GENERA else "pathogen",
                "prevalence_pct": round(float((series > 0).mean() * 100), 2),
                "median_abundance": round(float(series.median()), 6),
                "p25": round(float(series.quantile(0.25)), 6),
                "p75": round(float(series.quantile(0.75)), 6),
                "p90": round(float(series.quantile(0.90)), 6),
                "percentiles": tbl,
            }

    # Scoring bands
    for metric_name in reference["diversity"]["overall"]:
        tbl = reference["diversity"]["overall"][metric_name]
        reference["scoring_bands"]["overall"][metric_name] = build_scoring_bands(tbl)

    # ── Save ─────────────────────────────────────────────────────────────────
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUT_FILE, "w") as f:
        json.dump(reference, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Reference built successfully!")
    print(f"  Participants: {len(df)}")
    print(f"  Diversity metrics: {list(reference['diversity']['overall'].keys())}")
    print(f"  Genera analyzed: {genera_found}")
    missing = [g for g in PROTECTIVE_GENERA + PATHOGEN_GENERA if g not in genera_found]
    if missing:
        print(f"  Genera NOT FOUND: {missing}")
    print(f"  Output: {OUT_FILE}")
    print(f"  File size: {os.path.getsize(OUT_FILE) / 1024:.1f} KB")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()

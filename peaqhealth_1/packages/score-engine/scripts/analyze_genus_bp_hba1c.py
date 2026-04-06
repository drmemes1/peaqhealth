#!/usr/bin/env python3
"""
Genus-level oral microbiome × blood pressure + HbA1c correlation analysis.

Tests:
  1. Nitrate-reducing bacteria (Neisseria, Veillonella, Rothia) vs blood pressure
  2. Periodontal pathogens (Porphyromonas, Fusobacterium, Tannerella) vs blood pressure
  3. All target genera vs HbA1c (glycemic control)
  4. Nitric oxide pathway hypothesis (nitrate reducers → lower systolic BP)

Uses NHANES 2009-2012 data cached locally.
"""

import pandas as pd
import numpy as np
from scipy import stats
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data", "nhanes")

TARGET = [
    "Porphyromonas", "Fusobacterium", "Treponema", "Tannerella", "Prevotella",
    "Veillonella", "Rothia", "Neisseria", "Streptococcus", "Haemophilus",
]


def main():
    # ── Load genus data + taxonomy ───────────────────────────────────────────

    print("Loading data...")
    genus = pd.read_csv(os.path.join(DATA_DIR, "genus_relative.tsv"), sep="\t")
    taxonomy = pd.read_csv(os.path.join(DATA_DIR, "taxonomy.tsv"), sep="\t")

    tax_col_name = taxonomy.columns[0]
    tax_col_taxon = taxonomy.columns[1]
    genus_tax = taxonomy[taxonomy[tax_col_name].str.startswith("RB_genus", na=False)].copy()
    genus_tax["genus_name"] = genus_tax[tax_col_taxon].apply(
        lambda t: str(t).split(";")[-1].strip() if pd.notna(t) else "NA"
    )

    genus_cols = {}
    for target in TARGET:
        matches = genus_tax[genus_tax["genus_name"].str.lower() == target.lower()]
        if len(matches) > 0:
            col_id = matches.iloc[0][tax_col_name]
            if col_id in genus.columns:
                genus_cols[target] = col_id

    print(f"  Genera mapped: {list(genus_cols.keys())}")

    # Build genus dataframe with named columns
    genus_df = genus[["SEQN"] + list(genus_cols.values())].copy()
    genus_df = genus_df.rename(columns={v: k for k, v in genus_cols.items()})
    for g in genus_cols:
        genus_df[g] = pd.to_numeric(genus_df[g], errors="coerce")

    # ── Load blood pressure ──────────────────────────────────────────────────

    bp_path = os.path.join(DATA_DIR, "nhanes_bp.csv")
    bp = pd.read_csv(bp_path)
    print(f"  BP: {len(bp)} rows")

    sys_cols = [c for c in bp.columns if c.startswith("BPXSY") and c[-1].isdigit()]
    dia_cols = [c for c in bp.columns if c.startswith("BPXDI") and c[-1].isdigit()]
    print(f"  Systolic columns: {sys_cols}")
    print(f"  Diastolic columns: {dia_cols}")

    for c in sys_cols + dia_cols:
        bp[c] = pd.to_numeric(bp[c], errors="coerce")
    # Replace 0s with NaN (0 mmHg is not a valid reading)
    for c in dia_cols:
        bp.loc[bp[c] == 0, c] = np.nan

    bp["mean_systolic"] = bp[sys_cols].mean(axis=1)
    bp["mean_diastolic"] = bp[dia_cols].mean(axis=1)

    merged_bp = genus_df.merge(bp[["SEQN", "mean_systolic", "mean_diastolic"]], on="SEQN", how="inner")
    print(f"  Genus + BP merged: {len(merged_bp)} participants")
    print(f"  Valid systolic: {merged_bp['mean_systolic'].notna().sum()}")

    # ── Load HbA1c ───────────────────────────────────────────────────────────

    hba1c_path = os.path.join(DATA_DIR, "nhanes_hba1c.csv")
    hba1c = pd.read_csv(hba1c_path)
    print(f"  HbA1c: {len(hba1c)} rows")

    hba1c_col = [c for c in hba1c.columns if "GH" in c.upper() or "HBA" in c.upper()]
    print(f"  HbA1c column: {hba1c_col}")
    hba1c_field = hba1c_col[0] if hba1c_col else None

    if hba1c_field:
        hba1c[hba1c_field] = pd.to_numeric(hba1c[hba1c_field], errors="coerce")
        merged_hba1c = genus_df.merge(hba1c[["SEQN", hba1c_field]], on="SEQN", how="inner")
        merged_hba1c = merged_hba1c.rename(columns={hba1c_field: "HbA1c"})
        print(f"  Genus + HbA1c merged: {len(merged_hba1c)} participants")
    else:
        merged_hba1c = None
        print("  HbA1c column not found!")

    # ── PART 2: Genus × Blood Pressure ───────────────────────────────────────

    print("\n" + "=" * 60)
    print("ORAL BACTERIA × BLOOD PRESSURE")
    print("=" * 60)

    bp_results = []

    for genus_name in TARGET:
        if genus_name not in merged_bp.columns:
            continue
        for bp_measure in ["mean_systolic", "mean_diastolic"]:
            data = merged_bp[[genus_name, bp_measure]].dropna()
            if len(data) < 100:
                continue
            sp_r, sp_p = stats.spearmanr(data[genus_name].astype(float), data[bp_measure].astype(float))
            pe_r, pe_p = stats.pearsonr(np.log1p(data[genus_name].astype(float)), data[bp_measure].astype(float))

            sig = "***" if sp_p < 0.001 else "**" if sp_p < 0.01 else "*" if sp_p < 0.05 else ""
            label = "systolic" if "systolic" in bp_measure else "diastolic"

            if sp_p < 0.05:
                direction = "higher bacteria = higher BP" if sp_r > 0 else "higher bacteria = lower BP"
                print(f"\n  {genus_name} x {label}: {sig}")
                print(f"    Spearman r={sp_r:+.4f}  p={sp_p:.2e}  N={len(data)}")
                print(f"    Pearson  r={pe_r:+.4f}  p={pe_p:.2e}")
                print(f"    {direction}")

            bp_results.append({
                "genus": genus_name, "measure": label,
                "spearman_r": round(sp_r, 4), "spearman_p": sp_p,
                "pearson_r": round(pe_r, 4), "pearson_p": pe_p,
                "n": len(data), "significant": sp_p < 0.05,
                "direction": "positive" if sp_r > 0 else "negative",
            })

    bp_df = pd.DataFrame(bp_results)
    bp_df.to_csv(os.path.join(DATA_DIR, "genus_bp_correlations.csv"), index=False)

    # ── PART 3: Genus × HbA1c ───────────────────────────────────────────────

    print("\n\n" + "=" * 60)
    print("ORAL BACTERIA × HbA1c")
    print("=" * 60)

    hba1c_results = []

    if merged_hba1c is not None:
        for genus_name in TARGET:
            if genus_name not in merged_hba1c.columns:
                continue
            data = merged_hba1c[[genus_name, "HbA1c"]].dropna()
            if len(data) < 100:
                continue
            sp_r, sp_p = stats.spearmanr(data[genus_name].astype(float), data["HbA1c"].astype(float))
            pe_r, pe_p = stats.pearsonr(np.log1p(data[genus_name].astype(float)), data["HbA1c"].astype(float))

            sig = "***" if sp_p < 0.001 else "**" if sp_p < 0.01 else "*" if sp_p < 0.05 else ""

            if sp_p < 0.05:
                direction = "more bacteria = higher HbA1c" if sp_r > 0 else "more bacteria = lower HbA1c"
                print(f"\n  {genus_name} x HbA1c: {sig}")
                print(f"    Spearman r={sp_r:+.4f}  p={sp_p:.2e}  N={len(data)}")
                print(f"    Pearson  r={pe_r:+.4f}  p={pe_p:.2e}")
                print(f"    {direction}")

            hba1c_results.append({
                "genus": genus_name,
                "spearman_r": round(sp_r, 4), "spearman_p": sp_p,
                "pearson_r": round(pe_r, 4), "pearson_p": pe_p,
                "n": len(data), "significant": sp_p < 0.05,
                "direction": "positive" if sp_r > 0 else "negative",
            })

    hba1c_df = pd.DataFrame(hba1c_results)
    hba1c_df.to_csv(os.path.join(DATA_DIR, "genus_hba1c_correlations.csv"), index=False)

    # ── PART 4: Nitric Oxide Pathway Hypothesis Test ─────────────────────────

    print("\n\n" + "=" * 60)
    print("NITRIC OXIDE PATHWAY TEST")
    print("Hypothesis: Nitrate-reducing bacteria → lower systolic BP")
    print("Mechanism: Oral NO3- → NO2- → NO → vasodilation")
    print("=" * 60)

    for genus_name in ["Neisseria", "Veillonella", "Rothia", "Haemophilus"]:
        if genus_name not in merged_bp.columns:
            print(f"\n  {genus_name}: not in dataset")
            continue
        data = merged_bp[[genus_name, "mean_systolic"]].dropna()
        if len(data) < 100:
            print(f"\n  {genus_name}: insufficient data ({len(data)} rows)")
            continue
        sp_r, sp_p = stats.spearmanr(data[genus_name].astype(float), data["mean_systolic"].astype(float))

        supported = sp_r < 0 and sp_p < 0.05
        if supported:
            status = "SUPPORTED"
        elif sp_p < 0.05:
            status = "NOT SUPPORTED (opposite direction)"
        else:
            status = "NOT SIGNIFICANT"

        print(f"\n  {genus_name} x systolic BP: {status}")
        print(f"    Spearman r={sp_r:+.4f}  p={sp_p:.2e}  N={len(data)}")

    # ── Composite nitrate reducer score ──────────────────────────────────────

    print("\n  --- Composite nitrate reducer test ---")
    nitrate_genera = ["Neisseria", "Veillonella", "Rothia"]
    available = [g for g in nitrate_genera if g in merged_bp.columns]
    if len(available) >= 2:
        # Sum of nitrate reducer abundances
        merged_bp["nitrate_composite"] = merged_bp[available].sum(axis=1)
        data = merged_bp[["nitrate_composite", "mean_systolic"]].dropna()
        sp_r, sp_p = stats.spearmanr(data["nitrate_composite"], data["mean_systolic"])
        supported = sp_r < 0 and sp_p < 0.05
        status = "SUPPORTED" if supported else "NOT SUPPORTED" if sp_p < 0.05 else "NOT SIGNIFICANT"
        print(f"\n  Combined ({'+'.join(available)}) x systolic BP: {status}")
        print(f"    Spearman r={sp_r:+.4f}  p={sp_p:.2e}  N={len(data)}")

    # ── Summary Report ───────────────────────────────────────────────────────

    print("\n\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    sig_bp = bp_df[bp_df["significant"]].sort_values("spearman_p")
    print(f"\nSignificant BP associations: {len(sig_bp)} of {len(bp_df)}")
    if len(sig_bp) > 0:
        for _, row in sig_bp.iterrows():
            print(f"  {row['genus']:16s} x {row['measure']:10s}  "
                  f"r={row['spearman_r']:+.4f}  p={row['spearman_p']:.2e}  "
                  f"n={row['n']}  {row['direction']}")

    sig_hba1c = hba1c_df[hba1c_df["significant"]].sort_values("spearman_p") if len(hba1c_df) > 0 else pd.DataFrame()
    print(f"\nSignificant HbA1c associations: {len(sig_hba1c)} of {len(hba1c_df)}")
    if len(sig_hba1c) > 0:
        for _, row in sig_hba1c.iterrows():
            print(f"  {row['genus']:16s} x HbA1c      "
                  f"r={row['spearman_r']:+.4f}  p={row['spearman_p']:.2e}  "
                  f"n={row['n']}  {row['direction']}")

    print(f"\nResults saved to:")
    print(f"  {os.path.join(DATA_DIR, 'genus_bp_correlations.csv')}")
    print(f"  {os.path.join(DATA_DIR, 'genus_hba1c_correlations.csv')}")


if __name__ == "__main__":
    main()

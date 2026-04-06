#!/usr/bin/env python3
"""
Genus-level oral microbiome × blood marker correlation analysis.

Uses NHANES 2009-2012 data (already cached locally) to test whether
specific oral bacteria correlate with systemic blood markers — validating
the cross-panel signals that Peaq reports.

Output: packages/score-engine/data/nhanes/genus_blood_correlations.csv
"""

import pandas as pd
import numpy as np
from scipy import stats
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data", "nhanes")

# ── Target genera ────────────────────────────────────────────────────────────

TARGET = [
    "Porphyromonas",  # gum disease, cardiovascular
    "Fusobacterium",  # periodontal, colorectal cancer
    "Treponema",      # periodontal pathogen
    "Tannerella",     # red complex pathogen
    "Prevotella",     # periodontal, systemic
    "Veillonella",    # nitric oxide, cardioprotective
    "Rothia",         # protective, anti-inflammatory
    "Neisseria",      # nitrate reducer
    "Streptococcus",  # mixed
    "Haemophilus",    # protective
]


def main():
    # ── STEP 1: Load cached data ─────────────────────────────────────────────

    print("Loading cached NHANES data...")

    genus = pd.read_csv(os.path.join(DATA_DIR, "genus_relative.tsv"), sep="\t")
    print(f"  Genus: {len(genus)} rows, {len(genus.columns)} columns")

    taxonomy = pd.read_csv(os.path.join(DATA_DIR, "taxonomy.tsv"), sep="\t")
    print(f"  Taxonomy: {len(taxonomy)} rows")
    print(f"  Taxonomy columns: {taxonomy.columns.tolist()}")

    # Load blood marker files
    blood_files = {
        "crp_f":     "nhanes_crp_f.csv",
        "crp_g":     "nhanes_crp_g.csv",
        "chol_f":    "nhanes_chol_f.csv",
        "chol_g":    "nhanes_chol_g.csv",
        "hdl_f":     "nhanes_hdl_f.csv",
        "hdl_g":     "nhanes_hdl_g.csv",
        "trig_f":    "nhanes_trig_f.csv",
        "trig_g":    "nhanes_trig_g.csv",
        "glucose_f": "nhanes_glucose_f.csv",
        "glucose_g": "nhanes_glucose_g.csv",
    }

    blood_dfs = {}
    for name, fname in blood_files.items():
        path = os.path.join(DATA_DIR, fname)
        if os.path.exists(path):
            df = pd.read_csv(path)
            if len(df) > 0:
                blood_dfs[name] = df
                marker_cols = [c for c in df.columns if c.startswith("LBX") or c.startswith("LBD")]
                print(f"  {name}: {len(df)} rows, markers: {marker_cols}")

    # ── STEP 2: Find target genera columns ───────────────────────────────────

    print("\nFinding target genera in taxonomy...")

    # The taxonomy file has columns: "Name" and "Taxonomy in SILVA v123"
    tax_col_name = taxonomy.columns[0]   # "Name"
    tax_col_taxon = taxonomy.columns[1]  # "Taxonomy in SILVA v123"

    # Filter to genus-level entries
    genus_tax = taxonomy[taxonomy[tax_col_name].str.startswith("RB_genus", na=False)].copy()
    # Extract genus name from taxonomy string (last field after semicolon)
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
                print(f"  {target} -> {col_id}")
            else:
                print(f"  {target} -> {col_id} (NOT IN genus data)")
        else:
            print(f"  {target} -> NOT FOUND in taxonomy")

    # ── STEP 3: Merge genus + blood on SEQN ──────────────────────────────────

    print("\nMerging genus + blood data...")

    merged = genus[["SEQN"] + list(genus_cols.values())].copy()
    rename_map = {v: k for k, v in genus_cols.items()}
    merged = merged.rename(columns=rename_map)

    # Convert genus columns to numeric
    for g in genus_cols:
        merged[g] = pd.to_numeric(merged[g], errors="coerce")

    # CRP (both cycles)
    crp_frames = []
    for key in ["crp_f", "crp_g"]:
        if key in blood_dfs:
            df = blood_dfs[key]
            crp_col = [c for c in df.columns if "CRP" in c.upper()]
            if crp_col:
                crp_frames.append(df[["SEQN", crp_col[0]]].rename(columns={crp_col[0]: "hsCRP"}))
    if crp_frames:
        crp_all = pd.concat(crp_frames, ignore_index=True)
        crp_all["hsCRP"] = pd.to_numeric(crp_all["hsCRP"], errors="coerce")
        merged = merged.merge(crp_all, on="SEQN", how="left")
        print(f"  Merged CRP: {merged['hsCRP'].notna().sum()} values")

    # HDL (both cycles)
    hdl_frames = []
    for key in ["hdl_f", "hdl_g"]:
        if key in blood_dfs:
            df = blood_dfs[key]
            hdl_col = [c for c in df.columns if "LBDHDD" == c]
            if hdl_col:
                hdl_frames.append(df[["SEQN", hdl_col[0]]].rename(columns={hdl_col[0]: "HDL"}))
    if hdl_frames:
        hdl_all = pd.concat(hdl_frames, ignore_index=True)
        hdl_all["HDL"] = pd.to_numeric(hdl_all["HDL"], errors="coerce")
        merged = merged.merge(hdl_all, on="SEQN", how="left")
        print(f"  Merged HDL: {merged['HDL'].notna().sum()} values")

    # Triglycerides + LDL (both cycles, fasting subsample)
    trig_frames = []
    for key in ["trig_f", "trig_g"]:
        if key in blood_dfs:
            df = blood_dfs[key]
            cols_keep = ["SEQN"]
            renames = {}
            if "LBXTR" in df.columns:
                cols_keep.append("LBXTR")
                renames["LBXTR"] = "Triglycerides"
            if "LBDLDL" in df.columns:
                cols_keep.append("LBDLDL")
                renames["LBDLDL"] = "LDL"
            if len(cols_keep) > 1:
                trig_frames.append(df[cols_keep].rename(columns=renames))
    if trig_frames:
        trig_all = pd.concat(trig_frames, ignore_index=True)
        for c in ["Triglycerides", "LDL"]:
            if c in trig_all.columns:
                trig_all[c] = pd.to_numeric(trig_all[c], errors="coerce")
        merged = merged.merge(trig_all, on="SEQN", how="left")
        for c in ["Triglycerides", "LDL"]:
            if c in merged.columns:
                print(f"  Merged {c}: {merged[c].notna().sum()} values")

    # Glucose (both cycles, fasting subsample)
    glu_frames = []
    for key in ["glucose_f", "glucose_g"]:
        if key in blood_dfs:
            df = blood_dfs[key]
            if "LBXGLU" in df.columns:
                glu_frames.append(df[["SEQN", "LBXGLU"]].rename(columns={"LBXGLU": "Glucose"}))
    if glu_frames:
        glu_all = pd.concat(glu_frames, ignore_index=True)
        glu_all["Glucose"] = pd.to_numeric(glu_all["Glucose"], errors="coerce")
        merged = merged.merge(glu_all, on="SEQN", how="left")
        print(f"  Merged Glucose: {merged['Glucose'].notna().sum()} values")

    # Total cholesterol (both cycles)
    chol_frames = []
    for key in ["chol_f", "chol_g"]:
        if key in blood_dfs:
            df = blood_dfs[key]
            if "LBXTC" in df.columns:
                chol_frames.append(df[["SEQN", "LBXTC"]].rename(columns={"LBXTC": "TotalChol"}))
    if chol_frames:
        chol_all = pd.concat(chol_frames, ignore_index=True)
        chol_all["TotalChol"] = pd.to_numeric(chol_all["TotalChol"], errors="coerce")
        merged = merged.merge(chol_all, on="SEQN", how="left")
        print(f"  Merged TotalChol: {merged['TotalChol'].notna().sum()} values")

    blood_marker_cols = [c for c in merged.columns if c in ["hsCRP", "HDL", "LDL", "Triglycerides", "Glucose", "TotalChol"]]
    print(f"\nFinal merged: {len(merged)} participants")
    print(f"Blood markers available: {blood_marker_cols}")

    # ── STEP 4: Run genus × blood marker correlations ────────────────────────

    print("\n" + "=" * 60)
    print("GENUS-LEVEL ORAL-BLOOD CORRELATIONS")
    print("=" * 60)

    results = []

    for genus_name in TARGET:
        if genus_name not in merged.columns:
            continue

        for marker_name in blood_marker_cols:
            data = merged[[genus_name, marker_name]].dropna()
            if len(data) < 100:
                continue

            # Log-transform both (microbiome data is skewed)
            genus_log = np.log1p(data[genus_name].astype(float))
            marker_log = np.log1p(data[marker_name].astype(float))

            pearson_r, pearson_p = stats.pearsonr(genus_log, marker_log)
            spearman_r, spearman_p = stats.spearmanr(
                data[genus_name].astype(float), data[marker_name].astype(float)
            )

            sig = "***" if pearson_p < 0.001 else \
                  "**" if pearson_p < 0.01 else \
                  "*" if pearson_p < 0.05 else ""

            if pearson_p < 0.05 or spearman_p < 0.05:
                direction = "Higher bacteria → higher marker" \
                    if pearson_r > 0 else \
                    "Higher bacteria → lower marker"
                print(f"\n{genus_name} × {marker_name}: {sig}")
                print(f"  Pearson  r={pearson_r:.4f}  p={pearson_p:.2e}")
                print(f"  Spearman r={spearman_r:.4f}  p={spearman_p:.2e}")
                print(f"  N={len(data)}")
                print(f"  Direction: {direction}")

            results.append({
                "genus": genus_name,
                "blood_marker": marker_name,
                "pearson_r": round(pearson_r, 4),
                "pearson_p": pearson_p,
                "spearman_r": round(spearman_r, 4),
                "spearman_p": spearman_p,
                "n": len(data),
                "significant": pearson_p < 0.05,
                "direction": "positive" if pearson_r > 0 else "negative",
            })

    # Save full results
    results_df = pd.DataFrame(results)
    out_path = os.path.join(DATA_DIR, "genus_blood_correlations.csv")
    results_df.to_csv(out_path, index=False)

    # Summary — only significant
    print("\n\n" + "=" * 60)
    print("SIGNIFICANT FINDINGS SUMMARY")
    print("=" * 60)
    sig_df = results_df[results_df["significant"]].sort_values("pearson_p")
    if len(sig_df) > 0:
        for _, row in sig_df.iterrows():
            print(f"  {row['genus']:16s} × {row['blood_marker']:14s}  "
                  f"r={row['pearson_r']:+.4f}  p={row['pearson_p']:.2e}  "
                  f"n={row['n']:5d}  {row['direction']}")
    else:
        print("  No significant correlations found.")

    # ── STEP 5: Specific hypothesis tests ────────────────────────────────────

    hypotheses = [
        ("Porphyromonas", "hsCRP",         "positive", "P. gingivalis burden → inflammation"),
        ("Fusobacterium", "hsCRP",         "positive", "Fusobacterium → systemic inflammation"),
        ("Treponema",     "hsCRP",         "positive", "Treponema → systemic inflammation"),
        ("Veillonella",   "HDL",           "negative", "Veillonella (nitric oxide) → better HDL"),
        ("Porphyromonas", "Triglycerides", "positive", "Gum pathogens → metabolic markers"),
        ("Rothia",        "hsCRP",         "negative", "Protective bacteria → lower inflammation"),
        ("Neisseria",     "hsCRP",         "negative", "Nitrate reducer → lower inflammation"),
        ("Prevotella",    "hsCRP",         "positive", "Prevotella → systemic inflammation"),
        ("Fusobacterium", "Glucose",       "positive", "Fusobacterium → metabolic disruption"),
        ("Porphyromonas", "LDL",           "positive", "P. gingivalis → lipid dysfunction"),
    ]

    print("\n\n" + "=" * 60)
    print("PEAQ HYPOTHESIS TESTS")
    print("=" * 60)

    for genus_name, marker, expected_dir, hypothesis in hypotheses:
        if genus_name not in merged.columns:
            print(f"\n  {hypothesis}")
            print(f"    SKIP — {genus_name} not in dataset")
            continue

        if marker not in merged.columns:
            print(f"\n  {hypothesis}")
            print(f"    SKIP — {marker} not in dataset")
            continue

        data = merged[[genus_name, marker]].dropna()
        if len(data) < 50:
            print(f"\n  {hypothesis}")
            print(f"    SKIP — insufficient data ({len(data)} rows)")
            continue

        spearman_r, spearman_p = stats.spearmanr(
            data[genus_name].astype(float), data[marker].astype(float)
        )

        actual_dir = "positive" if spearman_r > 0 else "negative"
        sig = spearman_p < 0.05
        supported = sig and actual_dir == expected_dir

        if supported:
            status = "SUPPORTED"
        elif sig:
            status = "NOT SUPPORTED (opposite direction)"
        else:
            status = "NOT SIGNIFICANT"

        print(f"\n  {hypothesis}")
        print(f"    {status}")
        print(f"    Spearman r={spearman_r:+.4f}  p={spearman_p:.2e}  N={len(data)}")

    print(f"\n\nAnalysis complete. Results saved to {out_path}")
    print(f"Total correlations tested: {len(results_df)}")
    print(f"Significant (p<0.05): {sig_df.shape[0]}")


if __name__ == "__main__":
    main()

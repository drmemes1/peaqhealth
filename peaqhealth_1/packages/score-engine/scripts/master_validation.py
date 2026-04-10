#!/usr/bin/env python3
"""
Master validation: run all 90 genus x marker Spearman correlations fresh
from raw NHANES data files (10 genera x 9 markers = 90 tests).

PRIMARY analysis: Survey-weighted Spearman (WTMEC2YR) with bootstrap CIs.
SUPPLEMENTAL: Unweighted Spearman with Fisher-z CIs.

Applies Bonferroni and FDR corrections to both.

Outputs:
  - data/nhanes/all_90_tests.csv           (all tests, weighted + unweighted)
  - data/nhanes/master_validation.csv       (significant only)
  - data/nhanes/all_90_tests_weighted.csv   (weighted primary results)
"""

import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests
import os

from survey_utils import weighted_spearman, fisher_z_ci, bootstrap_ci_weighted_spearman

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data", "nhanes")

TARGET = [
    "Porphyromonas", "Fusobacterium", "Treponema", "Tannerella", "Prevotella",
    "Veillonella", "Rothia", "Neisseria", "Streptococcus", "Haemophilus",
]

# Manuscript Table 1 values for comparison (genus, marker, reported_r)
MANUSCRIPT = {
    ("Haemophilus", "HbA1c"):           -0.074,
    ("Haemophilus", "Triglycerides"):    -0.094,
    ("Haemophilus", "Systolic BP"):      -0.047,
    ("Haemophilus", "Diastolic BP"):     -0.030,
    ("Haemophilus", "HDL"):             +0.040,
    ("Haemophilus", "hsCRP"):           -0.044,
    ("Neisseria", "Systolic BP"):       -0.061,
    ("Neisseria", "Diastolic BP"):      -0.048,
    ("Neisseria", "Triglycerides"):     -0.058,
    ("Neisseria", "hsCRP"):            -0.051,
    ("Neisseria", "HbA1c"):            -0.042,
    ("Tannerella", "Diastolic BP"):     +0.052,
    ("Tannerella", "Total Chol"):       +0.056,
    ("Tannerella", "HbA1c"):           +0.050,
    ("Tannerella", "Glucose"):          +0.054,
    ("Tannerella", "Systolic BP"):      +0.041,
    ("Porphyromonas", "hsCRP"):        +0.037,
    ("Porphyromonas", "LDL"):          +0.040,
    ("Fusobacterium", "LDL"):          +0.058,
    ("Fusobacterium", "Glucose"):      +0.038,
    ("Prevotella", "hsCRP"):           +0.035,
    ("Prevotella", "LDL"):             +0.047,
}


def load_genus_data():
    """Load genus relative abundance + taxonomy -> named genus columns."""
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

    df = genus[["SEQN"] + list(genus_cols.values())].copy()
    df = df.rename(columns={v: k for k, v in genus_cols.items()})
    for g in genus_cols:
        df[g] = pd.to_numeric(df[g], errors="coerce")

    print(f"Genus data: {len(df)} participants, {len(genus_cols)} genera mapped")
    return df


def load_blood_markers(genus_df):
    """Load and merge all blood marker files onto genus_df."""
    merged = genus_df.copy()

    def load_merge(files, col_map):
        frames = []
        for fname in files:
            path = os.path.join(DATA_DIR, fname)
            if os.path.exists(path):
                df = pd.read_csv(path)
                if len(df) > 1:
                    cols_keep = ["SEQN"]
                    renames = {}
                    for src, dst in col_map.items():
                        if src in df.columns:
                            cols_keep.append(src)
                            renames[src] = dst
                    if len(cols_keep) > 1:
                        frames.append(df[cols_keep].rename(columns=renames))
        if frames:
            combined = pd.concat(frames, ignore_index=True)
            for c in combined.columns:
                if c != "SEQN":
                    combined[c] = pd.to_numeric(combined[c], errors="coerce")
            return combined
        return None

    for files, col_map in [
        (["nhanes_crp_f.csv", "nhanes_crp_g.csv"], {"LBXCRP": "hsCRP"}),
        (["nhanes_hdl_f.csv", "nhanes_hdl_g.csv"], {"LBDHDD": "HDL"}),
        (["nhanes_trig_f.csv", "nhanes_trig_g.csv"], {"LBXTR": "Triglycerides", "LBDLDL": "LDL"}),
        (["nhanes_glucose_f.csv", "nhanes_glucose_g.csv"], {"LBXGLU": "Glucose"}),
        (["nhanes_chol_f.csv", "nhanes_chol_g.csv"], {"LBXTC": "Total Chol"}),
    ]:
        result = load_merge(files, col_map)
        if result is not None:
            merged = merged.merge(result, on="SEQN", how="left")

    # Blood pressure
    bp_path = os.path.join(DATA_DIR, "nhanes_bp.csv")
    if os.path.exists(bp_path):
        bp = pd.read_csv(bp_path)
        sys_cols = [c for c in bp.columns if c.startswith("BPXSY") and c[-1].isdigit()]
        dia_cols = [c for c in bp.columns if c.startswith("BPXDI") and c[-1].isdigit()]
        for c in sys_cols + dia_cols:
            bp[c] = pd.to_numeric(bp[c], errors="coerce")
        for c in dia_cols:
            bp.loc[bp[c] == 0, c] = np.nan
        bp["Systolic BP"] = bp[sys_cols].mean(axis=1)
        bp["Diastolic BP"] = bp[dia_cols].mean(axis=1)
        merged = merged.merge(bp[["SEQN", "Systolic BP", "Diastolic BP"]], on="SEQN", how="left")

    # HbA1c
    hba1c_path = os.path.join(DATA_DIR, "nhanes_hba1c.csv")
    if os.path.exists(hba1c_path):
        hba1c = pd.read_csv(hba1c_path)
        hba1c_col = [c for c in hba1c.columns if "GH" in c.upper() or "HBA" in c.upper()]
        if hba1c_col:
            hba1c[hba1c_col[0]] = pd.to_numeric(hba1c[hba1c_col[0]], errors="coerce")
            merged = merged.merge(
                hba1c[["SEQN", hba1c_col[0]]].rename(columns={hba1c_col[0]: "HbA1c"}),
                on="SEQN", how="left"
            )

    return merged


def load_survey_design(merged):
    """Load NHANES survey design variables (weights, strata, PSU)."""
    demo_frames = []
    for fname in ["nhanes_demo_f.csv", "nhanes_demo_g.csv"]:
        path = os.path.join(DATA_DIR, fname)
        if os.path.exists(path):
            df = pd.read_csv(path)
            cols = ["SEQN"]
            for c in ["WTMEC2YR", "SDMVSTRA", "SDMVPSU"]:
                if c in df.columns:
                    cols.append(c)
            demo_frames.append(df[cols])
    if demo_frames:
        demo = pd.concat(demo_frames, ignore_index=True)
        for c in ["WTMEC2YR", "SDMVSTRA", "SDMVPSU"]:
            if c in demo.columns:
                demo[c] = pd.to_numeric(demo[c], errors="coerce")
        merged = merged.merge(demo.drop_duplicates("SEQN"), on="SEQN", how="left")
        # Pool 2 cycles: divide weight by 2
        if "WTMEC2YR" in merged.columns:
            merged["WTMEC2YR"] = merged["WTMEC2YR"] / 2.0
    return merged


def main():
    print("=" * 70)
    print("MASTER VALIDATION — 90 genus x marker tests")
    print("PRIMARY: Survey-weighted Spearman (WTMEC2YR)")
    print("SUPPLEMENTAL: Unweighted Spearman")
    print("=" * 70)

    genus_df = load_genus_data()
    merged = load_blood_markers(genus_df)
    merged = load_survey_design(merged)

    has_weights = "WTMEC2YR" in merged.columns
    has_strata = "SDMVSTRA" in merged.columns and "SDMVPSU" in merged.columns
    wt_count = merged["WTMEC2YR"].notna().sum() if has_weights else 0
    print(f"\nSurvey weights available: {has_weights} ({wt_count} participants with WTMEC2YR)")

    markers = ["hsCRP", "HDL", "LDL", "Triglycerides", "Glucose",
               "Total Chol", "Systolic BP", "Diastolic BP", "HbA1c"]
    available_markers = [m for m in markers if m in merged.columns]

    print(f"Markers available: {available_markers}")
    for m in available_markers:
        print(f"  {m}: {merged[m].notna().sum()} non-null")

    # ── Run all 90 tests ────────────────────────────────────────────────────
    all_results = []
    genera_available = [g for g in TARGET if g in merged.columns]

    total = len(genera_available) * len(available_markers)
    done = 0

    for genus_name in genera_available:
        for marker_name in available_markers:
            done += 1
            if done % 15 == 0:
                print(f"  Progress: {done}/{total} tests...")

            data = merged[[genus_name, marker_name]].copy()
            if has_weights:
                data["w"] = merged["WTMEC2YR"]
                if has_strata:
                    data["strata"] = merged["SDMVSTRA"]
                    data["psu"] = merged["SDMVPSU"]

            # Drop NaN in genus + marker
            clean = data.dropna(subset=[genus_name, marker_name])
            n = len(clean)

            result = {
                "genus": genus_name,
                "marker": marker_name,
                "n": n,
            }

            if n < 50:
                result.update({
                    "spearman_r": np.nan, "p_value": np.nan,
                    "direction": "insufficient data",
                    "ci_lo": np.nan, "ci_hi": np.nan,
                    "weighted_r": np.nan, "weighted_p": np.nan,
                    "weighted_ci_lo": np.nan, "weighted_ci_hi": np.nan,
                })
                all_results.append(result)
                continue

            x = clean[genus_name].astype(float).values
            y = clean[marker_name].astype(float).values

            # Unweighted Spearman + Fisher-z CI
            sp_r, sp_p = stats.spearmanr(x, y)
            ci_lo, ci_hi = fisher_z_ci(sp_r, n)
            result["spearman_r"] = round(sp_r, 4)
            result["p_value"] = sp_p
            result["direction"] = "positive" if sp_r > 0 else "negative"
            result["ci_lo"] = round(ci_lo, 4)
            result["ci_hi"] = round(ci_hi, 4)

            # Weighted Spearman + bootstrap CI
            if has_weights:
                w_clean = clean.dropna(subset=["w"])
                w_clean = w_clean[w_clean["w"] > 0]
                if len(w_clean) >= 50:
                    wx = w_clean[genus_name].astype(float).values
                    wy = w_clean[marker_name].astype(float).values
                    ww = w_clean["w"].astype(float).values
                    wr, wp, wn = weighted_spearman(wx, wy, ww)

                    strata_arr = w_clean["strata"].values if has_strata and "strata" in w_clean.columns else None
                    psu_arr = w_clean["psu"].values if has_strata and "psu" in w_clean.columns else None
                    wci_lo, wci_hi = bootstrap_ci_weighted_spearman(
                        wx, wy, ww, n_boot=1000,
                        strata=strata_arr, psu=psu_arr
                    )
                    result["weighted_r"] = round(wr, 4)
                    result["weighted_p"] = wp
                    result["weighted_ci_lo"] = round(wci_lo, 4) if not np.isnan(wci_lo) else np.nan
                    result["weighted_ci_hi"] = round(wci_hi, 4) if not np.isnan(wci_hi) else np.nan
                else:
                    result["weighted_r"] = np.nan
                    result["weighted_p"] = np.nan
                    result["weighted_ci_lo"] = np.nan
                    result["weighted_ci_hi"] = np.nan
            else:
                result["weighted_r"] = np.nan
                result["weighted_p"] = np.nan
                result["weighted_ci_lo"] = np.nan
                result["weighted_ci_hi"] = np.nan

            all_results.append(result)

    all_df = pd.DataFrame(all_results)

    # ── Apply corrections to UNWEIGHTED ────────────────────────────────────
    valid_mask = all_df["p_value"].notna()
    valid_p = all_df.loc[valid_mask, "p_value"].values
    n_tests = len(valid_p)

    print(f"\nTotal tests with valid data: {n_tests}")

    bonf_alpha = 0.05 / n_tests
    all_df["bonferroni_passes"] = False
    all_df.loc[valid_mask, "bonferroni_passes"] = valid_p < bonf_alpha

    fdr_reject, fdr_pvals, _, _ = multipletests(valid_p, alpha=0.05, method="fdr_bh")
    all_df["fdr_adjusted_p"] = np.nan
    all_df.loc[valid_mask, "fdr_adjusted_p"] = fdr_pvals
    all_df["fdr_passes"] = False
    all_df.loc[valid_mask, "fdr_passes"] = fdr_reject

    # ── Apply corrections to WEIGHTED ──────────────────────────────────────
    wvalid_mask = all_df["weighted_p"].notna()
    wvalid_p = all_df.loc[wvalid_mask, "weighted_p"].values
    n_wtests = len(wvalid_p)

    if n_wtests > 0:
        wbonf_alpha = 0.05 / n_wtests
        all_df["w_bonferroni_passes"] = False
        all_df.loc[wvalid_mask, "w_bonferroni_passes"] = wvalid_p < wbonf_alpha

        w_fdr_reject, w_fdr_pvals, _, _ = multipletests(wvalid_p, alpha=0.05, method="fdr_bh")
        all_df["w_fdr_adjusted_p"] = np.nan
        all_df.loc[wvalid_mask, "w_fdr_adjusted_p"] = w_fdr_pvals
        all_df["w_fdr_passes"] = False
        all_df.loc[wvalid_mask, "w_fdr_passes"] = w_fdr_reject

    all_df["sig_005"] = all_df["p_value"] < 0.05
    all_df["in_manuscript"] = all_df.apply(
        lambda r: (r["genus"], r["marker"]) in MANUSCRIPT, axis=1
    )

    # ── Save ───────────────────────────────────────────────────────────────
    all_path = os.path.join(DATA_DIR, "all_90_tests.csv")
    all_df.to_csv(all_path, index=False)
    print(f"\nSaved all {len(all_df)} tests to {all_path}")

    # Also save old filename for backwards compat
    all_df.to_csv(os.path.join(DATA_DIR, "all_60_tests.csv"), index=False)

    sig_df = all_df[all_df["sig_005"]].sort_values("p_value").copy()
    master_path = os.path.join(DATA_DIR, "master_validation.csv")
    sig_df.to_csv(master_path, index=False)
    print(f"Saved {len(sig_df)} significant findings to {master_path}")

    # ── Summary ────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total tests run:              {n_tests}")
    print(f"\nUNWEIGHTED (supplemental):")
    print(f"  Significant at p<0.05:      {all_df['sig_005'].sum()}")
    print(f"  Survive Bonferroni:         {all_df['bonferroni_passes'].sum()}")
    print(f"  Survive FDR (BH):           {all_df['fdr_passes'].sum()}")

    if n_wtests > 0:
        w_sig = (all_df["weighted_p"] < 0.05).sum()
        print(f"\nWEIGHTED (primary, WTMEC2YR):")
        print(f"  Significant at p<0.05:      {w_sig}")
        print(f"  Survive Bonferroni:         {all_df.get('w_bonferroni_passes', pd.Series(False)).sum()}")
        print(f"  Survive FDR (BH):           {all_df.get('w_fdr_passes', pd.Series(False)).sum()}")

    # ── Print comparison table ─────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("TOP FINDINGS — Weighted vs Unweighted")
    print("=" * 70)
    print(f"{'Genus':16s} {'Marker':14s} {'UW r':>7s} {'UW p':>10s} {'W r':>7s} {'W p':>10s} {'W CI':>16s}")
    print("-" * 80)
    for _, row in all_df.sort_values("p_value").head(30).iterrows():
        uw_r = f"{row['spearman_r']:+.4f}" if not np.isnan(row['spearman_r']) else "n/a"
        uw_p = f"{row['p_value']:.2e}" if not np.isnan(row['p_value']) else "n/a"
        w_r = f"{row['weighted_r']:+.4f}" if not np.isnan(row.get('weighted_r', np.nan)) else "n/a"
        w_p = f"{row['weighted_p']:.2e}" if not np.isnan(row.get('weighted_p', np.nan)) else "n/a"
        w_ci = ""
        if not np.isnan(row.get('weighted_ci_lo', np.nan)):
            w_ci = f"({row['weighted_ci_lo']:+.3f},{row['weighted_ci_hi']:+.3f})"
        print(f"{row['genus']:16s} {row['marker']:14s} {uw_r:>7s} {uw_p:>10s} {w_r:>7s} {w_p:>10s} {w_ci:>16s}")


if __name__ == "__main__":
    main()

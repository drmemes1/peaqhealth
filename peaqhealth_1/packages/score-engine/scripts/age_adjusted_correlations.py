#!/usr/bin/env python3
"""
Age/sex/BMI/smoking-adjusted partial Spearman correlations for all
90 genus x marker pairs (10 genera x 9 markers).

Method: Rank both genus abundance and blood marker, then compute
partial correlation controlling for age, sex, BMI, and smoking
status using OLS residualization.

Applies Bonferroni and FDR-BH corrections to adjusted p-values.
Reports Fisher-z 95% CIs on both unadjusted and adjusted r.

Output: packages/score-engine/data/nhanes/age_adjusted_correlations.csv
"""

import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests
import os

from survey_utils import fisher_z_ci

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data", "nhanes")

TARGET = [
    "Porphyromonas", "Fusobacterium", "Treponema", "Tannerella", "Prevotella",
    "Veillonella", "Rothia", "Neisseria", "Streptococcus", "Haemophilus",
]

MARKERS = ["hsCRP", "HDL", "LDL", "Triglycerides", "Glucose",
           "Total Chol", "Systolic BP", "Diastolic BP", "HbA1c"]


def partial_spearman(x, y, covariates):
    """
    Partial Spearman correlation: rank x and y, then partial out covariates
    via OLS residuals, then correlate residuals.

    Returns (r, p, n).
    """
    # Combine into a dataframe and drop NaN
    df = pd.DataFrame({"x": x, "y": y})
    for i, c in enumerate(covariates):
        df[f"cov_{i}"] = c
    df = df.dropna()
    n = len(df)
    if n < 50:
        return np.nan, np.nan, n

    # Rank x and y for Spearman
    rx = df["x"].rank()
    ry = df["y"].rank()

    # Build covariate matrix (with intercept)
    cov_cols = [f"cov_{i}" for i in range(len(covariates))]
    C = df[cov_cols].values
    C = np.column_stack([np.ones(n), C])  # add intercept

    # Residualize ranked x and ranked y on covariates
    try:
        # Use least squares to get residuals
        beta_x = np.linalg.lstsq(C, rx.values, rcond=None)[0]
        resid_x = rx.values - C @ beta_x

        beta_y = np.linalg.lstsq(C, ry.values, rcond=None)[0]
        resid_y = ry.values - C @ beta_y

        # Correlate residuals
        r, p = stats.pearsonr(resid_x, resid_y)
        # Adjust degrees of freedom for number of covariates
        df_adj = n - len(covariates) - 2
        if df_adj > 0:
            t_stat = r * np.sqrt(df_adj / (1 - r**2 + 1e-12))
            p = 2 * stats.t.sf(abs(t_stat), df_adj)
        return r, p, n
    except Exception:
        return np.nan, np.nan, n


def load_genus_data():
    """Load genus relative abundance data with named columns."""
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
    return df


def load_and_merge_markers(genus_df):
    """Load all blood markers and merge onto genus_df."""
    merged = genus_df.copy()

    def concat_cycles(files, col_map):
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
        result = concat_cycles(files, col_map)
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


def load_covariates(merged):
    """Load demographics, BMI, smoking and merge onto dataset."""

    # Demographics: age (RIDAGEYR), sex (RIAGENDR: 1=male, 2=female)
    demo_frames = []
    for fname in ["nhanes_demo_f.csv", "nhanes_demo_g.csv"]:
        path = os.path.join(DATA_DIR, fname)
        if os.path.exists(path):
            df = pd.read_csv(path)
            cols = ["SEQN"]
            if "RIDAGEYR" in df.columns:
                cols.append("RIDAGEYR")
            if "RIAGENDR" in df.columns:
                cols.append("RIAGENDR")
            demo_frames.append(df[cols])
    if demo_frames:
        demo = pd.concat(demo_frames, ignore_index=True)
        demo["RIDAGEYR"] = pd.to_numeric(demo["RIDAGEYR"], errors="coerce")
        # Recode sex: handle both numeric (1=male,2=female) and string ("Male"/"Female")
        def encode_sex(v):
            if pd.isna(v):
                return np.nan
            if isinstance(v, str):
                return 1.0 if v.strip().lower() == "female" else 0.0
            return 1.0 if v == 2 else 0.0
        demo["sex_female"] = demo["RIAGENDR"].apply(encode_sex)
        merged = merged.merge(demo[["SEQN", "RIDAGEYR", "sex_female"]], on="SEQN", how="left")
        print(f"  Age: {merged['RIDAGEYR'].notna().sum()} non-null")

    # BMI (BMXBMI)
    bmx_frames = []
    for fname in ["nhanes_bmx_f.csv", "nhanes_bmx_g.csv"]:
        path = os.path.join(DATA_DIR, fname)
        if os.path.exists(path):
            df = pd.read_csv(path)
            if "BMXBMI" in df.columns:
                bmx_frames.append(df[["SEQN", "BMXBMI"]])
    if bmx_frames:
        bmx = pd.concat(bmx_frames, ignore_index=True)
        bmx["BMXBMI"] = pd.to_numeric(bmx["BMXBMI"], errors="coerce")
        merged = merged.merge(bmx, on="SEQN", how="left")
        print(f"  BMI: {merged['BMXBMI'].notna().sum()} non-null")

    # Smoking: SMQ020 (ever smoked 100 cigs: 1=yes, 2=no), SMQ040 (now: 1=daily, 2=some days, 3=not at all)
    smq_frames = []
    for fname in ["nhanes_smq_f.csv", "nhanes_smq_g.csv"]:
        path = os.path.join(DATA_DIR, fname)
        if os.path.exists(path):
            df = pd.read_csv(path)
            cols = ["SEQN"]
            if "SMQ020" in df.columns:
                cols.append("SMQ020")
            if "SMQ040" in df.columns:
                cols.append("SMQ040")
            if len(cols) > 1:
                smq_frames.append(df[cols])
    if smq_frames:
        smq = pd.concat(smq_frames, ignore_index=True)
        # Do NOT convert to numeric — values are strings ("Yes"/"No", "Every day"/"Not at all")

        # Encode smoking: 0=never, 1=former, 2=current
        # SMQ020 may be "Yes"/"No" strings or 1/2 numeric
        def smoking_status(row):
            ever = row.get("SMQ020")
            current = row.get("SMQ040")
            if pd.isna(ever):
                return np.nan
            # Handle string values
            if isinstance(ever, str):
                ever_yes = ever.strip().lower() == "yes"
            else:
                ever_yes = ever == 1
            if not ever_yes:
                return 0  # never
            # Check current status
            if pd.isna(current):
                return 1  # former (smoked before, no current data)
            if isinstance(current, str):
                current_lower = current.strip().lower()
                if current_lower == "not at all":
                    return 1  # former
                return 2  # current (every day or some days)
            if current == 3:
                return 1  # former
            return 2  # current

        smq["smoking"] = smq.apply(smoking_status, axis=1)
        merged = merged.merge(smq[["SEQN", "smoking"]], on="SEQN", how="left")
        print(f"  Smoking: {merged['smoking'].notna().sum()} non-null")

    return merged


def main():
    print("=" * 70)
    print("AGE-ADJUSTED PARTIAL SPEARMAN CORRELATIONS")
    print("Controlling for: age, sex, BMI, smoking status")
    print("=" * 70)

    genus_df = load_genus_data()
    merged = load_and_merge_markers(genus_df)

    print("\nLoading covariates...")
    merged = load_covariates(merged)

    available_markers = [m for m in MARKERS if m in merged.columns]
    genera_available = [g for g in TARGET if g in merged.columns]
    covariate_cols = ["RIDAGEYR", "sex_female", "BMXBMI", "smoking"]

    print(f"\nGenera: {len(genera_available)}")
    print(f"Markers: {len(available_markers)}")
    print(f"Covariates: {covariate_cols}")

    # Check covariate coverage
    full_cov = merged[covariate_cols].notna().all(axis=1).sum()
    print(f"Participants with all 4 covariates: {full_cov}")

    results = []

    for genus_name in genera_available:
        for marker_name in available_markers:
            # Unadjusted Spearman
            unadj_data = merged[[genus_name, marker_name]].dropna()
            n_unadj = len(unadj_data)
            if n_unadj < 50:
                continue
            unadj_r, unadj_p = stats.spearmanr(
                unadj_data[genus_name].astype(float).values,
                unadj_data[marker_name].astype(float).values,
            )

            # Adjusted partial Spearman
            adj_data = merged[[genus_name, marker_name] + covariate_cols].dropna()
            covs = [adj_data[c].values for c in covariate_cols]
            adj_r, adj_p, n_adj = partial_spearman(
                adj_data[genus_name].astype(float).values,
                adj_data[marker_name].astype(float).values,
                covs,
            )

            unadj_dir = "positive" if unadj_r > 0 else "negative"
            adj_dir = "positive" if adj_r > 0 else "negative" if not np.isnan(adj_r) else "NA"

            survives = not np.isnan(adj_p) and adj_p < 0.05
            direction_consistent = unadj_dir == adj_dir if adj_dir != "NA" else False

            # CIs
            unadj_ci_lo, unadj_ci_hi = fisher_z_ci(unadj_r, n_unadj)
            adj_ci_lo, adj_ci_hi = fisher_z_ci(adj_r, n_adj) if not np.isnan(adj_r) else (np.nan, np.nan)

            results.append({
                "genus": genus_name,
                "marker": marker_name,
                "n_unadjusted": n_unadj,
                "n_adjusted": n_adj,
                "unadjusted_r": round(unadj_r, 4),
                "unadjusted_p": unadj_p,
                "unadj_ci_lo": round(unadj_ci_lo, 4),
                "unadj_ci_hi": round(unadj_ci_hi, 4),
                "adjusted_r": round(adj_r, 4) if not np.isnan(adj_r) else np.nan,
                "adjusted_p": adj_p,
                "adj_ci_lo": round(adj_ci_lo, 4) if not np.isnan(adj_ci_lo) else np.nan,
                "adj_ci_hi": round(adj_ci_hi, 4) if not np.isnan(adj_ci_hi) else np.nan,
                "survives_adjustment": survives,
                "direction_consistent": direction_consistent,
                "unadj_direction": unadj_dir,
                "adj_direction": adj_dir,
            })

    results_df = pd.DataFrame(results)

    # ── Multiple testing correction on ADJUSTED p-values ───────────────────
    adj_valid = results_df["adjusted_p"].notna()
    adj_pvals = results_df.loc[adj_valid, "adjusted_p"].values
    n_adj_tests = len(adj_pvals)

    if n_adj_tests > 0:
        adj_bonf_alpha = 0.05 / n_adj_tests
        results_df["adj_bonferroni_passes"] = False
        results_df.loc[adj_valid, "adj_bonferroni_passes"] = adj_pvals < adj_bonf_alpha

        adj_fdr_reject, adj_fdr_pvals, _, _ = multipletests(adj_pvals, alpha=0.05, method="fdr_bh")
        results_df["adj_fdr_adjusted_p"] = np.nan
        results_df.loc[adj_valid, "adj_fdr_adjusted_p"] = adj_fdr_pvals
        results_df["adj_fdr_passes"] = False
        results_df.loc[adj_valid, "adj_fdr_passes"] = adj_fdr_reject

        print(f"\n  Multiple testing correction on {n_adj_tests} adjusted tests:")
        print(f"    Bonferroni threshold: {adj_bonf_alpha:.6f}")
        print(f"    Survive Bonferroni: {results_df['adj_bonferroni_passes'].sum()}")
        print(f"    Survive FDR-BH:     {results_df['adj_fdr_passes'].sum()}")

    # Save
    out_path = os.path.join(DATA_DIR, "age_adjusted_correlations.csv")
    results_df.to_csv(out_path, index=False)
    print(f"\nSaved {len(results_df)} tests to {out_path}")

    # ── Summary ─────────────────────────────────────────────────────────────
    unadj_sig = results_df[results_df["unadjusted_p"] < 0.05]
    adj_sig = results_df[results_df["survives_adjustment"]]
    lost_sig = unadj_sig[~unadj_sig["survives_adjustment"]]
    dir_changed = results_df[
        (results_df["unadjusted_p"] < 0.05) & (~results_df["direction_consistent"])
    ]

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total tests:                     {len(results_df)}")
    print(f"Unadjusted significant (p<0.05): {len(unadj_sig)}")
    print(f"Survive adjustment (p<0.05):     {len(adj_sig)}")
    print(f"Lost significance:               {len(lost_sig)}")
    print(f"Direction changed:               {len(dir_changed)}")

    # ── Findings that LOST significance ─────────────────────────────────────
    if len(lost_sig) > 0:
        print("\n" + "-" * 70)
        print("LOST SIGNIFICANCE after adjustment:")
        print("-" * 70)
        for _, r in lost_sig.sort_values("unadjusted_p").iterrows():
            print(f"  {r['genus']:16s} × {r['marker']:14s}  "
                  f"unadj r={r['unadjusted_r']:+.4f} p={r['unadjusted_p']:.2e}  →  "
                  f"adj r={r['adjusted_r']:+.4f} p={r['adjusted_p']:.2e}")

    # ── Direction changes ───────────────────────────────────────────────────
    if len(dir_changed) > 0:
        print("\n" + "-" * 70)
        print("DIRECTION CHANGED after adjustment:")
        print("-" * 70)
        for _, r in dir_changed.iterrows():
            print(f"  {r['genus']:16s} × {r['marker']:14s}  "
                  f"{r['unadj_direction']} → {r['adj_direction']}  "
                  f"unadj r={r['unadjusted_r']:+.4f}  adj r={r['adjusted_r']:+.4f}")

    # ── Key manuscript findings ─────────────────────────────────────────────
    print("\n" + "-" * 70)
    print("KEY MANUSCRIPT FINDINGS — adjustment status:")
    print("-" * 70)
    key_findings = [
        ("Haemophilus", "HbA1c"), ("Haemophilus", "Triglycerides"),
        ("Haemophilus", "Systolic BP"), ("Haemophilus", "HDL"),
        ("Neisseria", "Systolic BP"), ("Neisseria", "Diastolic BP"),
        ("Neisseria", "Triglycerides"), ("Neisseria", "hsCRP"),
        ("Neisseria", "HbA1c"),
        ("Tannerella", "Diastolic BP"), ("Tannerella", "Total Chol"),
        ("Tannerella", "HbA1c"), ("Tannerella", "Glucose"),
        ("Tannerella", "Systolic BP"),
        ("Porphyromonas", "hsCRP"), ("Fusobacterium", "LDL"),
        ("Prevotella", "hsCRP"),
        ("Rothia", "HbA1c"), ("Rothia", "Systolic BP"),
    ]
    for g, m in key_findings:
        row = results_df[(results_df["genus"] == g) & (results_df["marker"] == m)]
        if len(row) == 0:
            print(f"  {g:16s} × {m:14s}  NOT FOUND")
            continue
        r = row.iloc[0]
        status = "SURVIVES" if r["survives_adjustment"] else "LOST"
        dir_note = "" if r["direction_consistent"] else " [DIRECTION CHANGED]"
        print(f"  {g:16s} × {m:14s}  {status:8s}  "
              f"unadj={r['unadjusted_r']:+.4f}  adj={r['adjusted_r']:+.4f} "
              f"(p={r['adjusted_p']:.2e}){dir_note}")


if __name__ == "__main__":
    main()

"""
Shared utilities for NHANES survey-weighted analysis.
Provides weighted Spearman correlation, Fisher-z CIs, and bootstrap CIs.
"""

import numpy as np
import pandas as pd
from scipy import stats


def weighted_rank(x, w):
    """Compute weighted ranks. Ties get average weighted rank."""
    order = np.argsort(x)
    x_sorted = x[order]
    w_sorted = w[order]
    cumw = np.cumsum(w_sorted)
    # For ties, assign average of the cumulative weight range
    ranks = np.empty_like(x, dtype=float)
    i = 0
    n = len(x)
    while i < n:
        j = i
        while j < n - 1 and x_sorted[j + 1] == x_sorted[j]:
            j += 1
        # positions i..j are tied
        avg_rank = (cumw[i] + cumw[j]) / 2.0 if i > 0 else (cumw[j]) / 2.0
        if i > 0:
            avg_rank = ((cumw[i - 1] + cumw[j]) / 2.0)
        else:
            avg_rank = cumw[j] / 2.0
        for k in range(i, j + 1):
            ranks[order[k]] = avg_rank
        i = j + 1
    return ranks


def weighted_pearson(x, y, w):
    """Weighted Pearson correlation coefficient."""
    w = w / w.sum()
    mx = np.sum(w * x)
    my = np.sum(w * y)
    dx = x - mx
    dy = y - my
    cov_xy = np.sum(w * dx * dy)
    var_x = np.sum(w * dx ** 2)
    var_y = np.sum(w * dy ** 2)
    denom = np.sqrt(var_x * var_y)
    if denom < 1e-15:
        return 0.0
    return cov_xy / denom


def weighted_spearman(x, y, w):
    """
    Survey-weighted Spearman correlation.
    Computes weighted ranks using WTMEC2YR, then weighted Pearson on ranks.
    """
    mask = np.isfinite(x) & np.isfinite(y) & np.isfinite(w) & (w > 0)
    x, y, w = x[mask], y[mask], w[mask]
    if len(x) < 50:
        return np.nan, np.nan, len(x)
    rx = weighted_rank(x, w)
    ry = weighted_rank(y, w)
    r = weighted_pearson(rx, ry, w)
    # p-value via t-distribution (effective sample size)
    n_eff = (w.sum()) ** 2 / (w ** 2).sum()  # Kish effective sample size
    df = n_eff - 2
    if df <= 0 or abs(r) >= 1:
        return r, 0.0 if abs(r) >= 1 else 1.0, len(x)
    t_stat = r * np.sqrt(df / (1 - r ** 2))
    p = 2 * stats.t.sf(abs(t_stat), df)
    return r, p, len(x)


def fisher_z_ci(r, n, alpha=0.05):
    """95% CI for Spearman r using Fisher z-transformation."""
    if n < 4 or np.isnan(r):
        return np.nan, np.nan
    z = np.arctanh(r)
    se = 1.0 / np.sqrt(n - 3)
    z_crit = stats.norm.ppf(1 - alpha / 2)
    lo = np.tanh(z - z_crit * se)
    hi = np.tanh(z + z_crit * se)
    return lo, hi


def bootstrap_ci_weighted_spearman(x, y, w, n_boot=1000, alpha=0.05, strata=None, psu=None):
    """
    Bootstrap 95% CI for weighted Spearman, optionally respecting
    NHANES stratified cluster design (SDMVSTRA, SDMVPSU).
    """
    mask = np.isfinite(x) & np.isfinite(y) & np.isfinite(w) & (w > 0)
    x, y, w = x[mask], y[mask], w[mask]
    if strata is not None:
        strata = strata[mask]
    if psu is not None:
        psu = psu[mask]

    n = len(x)
    if n < 50:
        return np.nan, np.nan

    boot_rs = []
    rng = np.random.default_rng(42)

    if strata is not None and psu is not None:
        # Cluster bootstrap: resample PSUs within strata
        unique_strata = np.unique(strata)
        for _ in range(n_boot):
            idx = []
            for s in unique_strata:
                s_mask = strata == s
                s_psus = np.unique(psu[s_mask])
                if len(s_psus) < 2:
                    # Only one PSU in stratum, sample with replacement
                    s_idx = np.where(s_mask)[0]
                    boot_idx = rng.choice(s_idx, size=len(s_idx), replace=True)
                    idx.extend(boot_idx)
                else:
                    boot_psus = rng.choice(s_psus, size=len(s_psus), replace=True)
                    for p in boot_psus:
                        p_idx = np.where(s_mask & (psu == p))[0]
                        idx.extend(p_idx)
            idx = np.array(idx)
            if len(idx) < 50:
                continue
            rx = weighted_rank(x[idx], w[idx])
            ry = weighted_rank(y[idx], w[idx])
            boot_rs.append(weighted_pearson(rx, ry, w[idx]))
    else:
        # Simple bootstrap
        for _ in range(n_boot):
            idx = rng.choice(n, size=n, replace=True)
            rx = weighted_rank(x[idx], w[idx])
            ry = weighted_rank(y[idx], w[idx])
            boot_rs.append(weighted_pearson(rx, ry, w[idx]))

    if len(boot_rs) < 10:
        return np.nan, np.nan

    boot_rs = np.array(boot_rs)
    lo = np.percentile(boot_rs, 100 * alpha / 2)
    hi = np.percentile(boot_rs, 100 * (1 - alpha / 2))
    return lo, hi

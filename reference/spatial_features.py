"""Features spatiales — Phase 2.

- Proximité (coordonnées x=lon, y=lat uniquement, sans la cible : aucun risque
  de fuite, calculable globalement) : distance au site le plus proche, densité
  et distances moyennes dans 10 km.
- Agrégats par `grid_id` (contexte local du voisinage) : moyennes/min/max/std
  de variables climat/indices. Ils utilisent les *features* des voisins, donc
  ils DOIVENT être recalculés intra-fold (fit sur train, appliqués à test) :
  voir `fit_grid_aggregates` / `apply_grid_aggregates`. `add_grid_aggregates_global`
  est la variante fuitée (fit sur tout le jeu), réservée à l'audit anti-leakage.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

#: variables de base agrégées par grid_id (mêmes familles que train_agg3).
GRID_BASE_COLS = [
    "wsi_mean", "evapotrans_mean", "LST_celsius_mean", "temps_mean",
    "pr_mean", "ndvi_mean", "bsi_mean", "msi_mean", "ndwi_mean",
]
GRID_AGGS = ["min", "mean", "std", "max"]

#: proximité (calculable globalement, coordonnées seules).
PROXIMITY_COLS = ["nearest_site_dist", "mean_dist_10km", "n_sites_10km", "std_dist_10km"]


def grid_feature_names(base_cols: list[str] | None = None) -> list[str]:
    base_cols = base_cols or GRID_BASE_COLS
    return [f"grid_{c}_{a}" for c in base_cols for a in GRID_AGGS]


def spatial_feature_names(base_cols: list[str] | None = None) -> list[str]:
    return PROXIMITY_COLS + grid_feature_names(base_cols)


def haversine_km(lon1, lat1, lon2, lat2) -> np.ndarray:
    """Distance grand-cercle en km (x=lon, y=lat en degrés)."""
    lon1, lat1, lon2, lat2 = map(lambda a: np.radians(np.asarray(a, dtype=float)), (lon1, lat1, lon2, lat2))
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    h = np.sin(dlat / 2.0) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0) ** 2
    return 2.0 * 6371.0 * np.arcsin(np.sqrt(h))


def pairwise_dist_km(df: pd.DataFrame) -> np.ndarray:
    lon = df["x"].to_numpy(dtype=float)
    lat = df["y"].to_numpy(dtype=float)
    lon1, lon2 = np.meshgrid(lon, lon)
    lat1, lat2 = np.meshgrid(lat, lat)
    return haversine_km(lon1, lat1, lon2, lat2)


def add_proximity_features(df: pd.DataFrame, radius_km: float = 10.0) -> pd.DataFrame:
    """Distances inter-sites depuis x/y uniquement (sans fuite possible)."""
    out = df.copy()
    D = pairwise_dist_km(out)
    np.fill_diagonal(D, np.inf)
    out["nearest_site_dist"] = np.where(
        np.isfinite(D.min(axis=1)), D.min(axis=1) * 1000.0, 0.0  # en mètres, cf. agg3
    )
    within = D <= radius_km
    n = within.sum(axis=1)
    with np.errstate(invalid="ignore"):
        mean_d = np.where(n > 0, (np.where(within, D, 0.0).sum(axis=1) / np.maximum(n, 1)) * 1000.0, 0.0)
        std_d = np.array([
            (row[m] * 1000.0).std() if m.sum() > 1 else 0.0 for row, m in zip(D, within)
        ])
    out["mean_dist_10km"] = mean_d
    out["n_sites_10km"] = n.astype(float)
    out["std_dist_10km"] = std_d
    return out


def fit_grid_aggregates(
    train_df: pd.DataFrame, group_col: str = "grid_id", base_cols: list[str] | None = None
) -> dict:
    """Calcule les stats par grid_id SUR LE TRAIN UNIQUEMENT (anti-leakage)."""
    base_cols = [c for c in (base_cols or GRID_BASE_COLS) if c in train_df.columns]
    stats: dict = {}
    grouped = train_df.groupby(group_col)
    for c in base_cols:
        g = grouped[c]
        stats[c] = {
            "min": g.min(), "mean": g.mean(),
            "std": g.std().fillna(0.0), "max": g.max(),
        }
    stats["_base_cols"] = base_cols
    return stats


def apply_grid_aggregates(
    df: pd.DataFrame, stats: dict, group_col: str = "grid_id",
    fallback: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Applique des stats grid pré-ajustées ; grids inconnus → médiane (fallback/train)."""
    out = df.copy()
    base_cols: list[str] = stats.get("_base_cols", [])
    ref = fallback if fallback is not None else df
    for c in base_cols:
        col_median = float(ref[c].median()) if c in ref.columns else 0.0
        keys = out[group_col].astype(str).to_numpy()
        for agg in GRID_AGGS:
            mapping = {str(k): float(v) for k, v in stats[c][agg].items()}
            vals = np.array([mapping.get(k, np.nan) for k in keys], dtype=float)
            vals = np.where(np.isnan(vals), col_median, vals)
            out[f"grid_{c}_{agg}"] = vals
    return out


def add_grid_aggregates_global(
    df: pd.DataFrame, group_col: str = "grid_id", base_cols: list[str] | None = None
) -> pd.DataFrame:
    """Variante FUITÉE (fit sur tout `df`, train+test mélangés) — audit uniquement."""
    return apply_grid_aggregates(df, fit_grid_aggregates(df, group_col, base_cols), group_col, fallback=df)


def add_grid_aggregates_intrafold(
    train_df: pd.DataFrame, test_df: pd.DataFrame,
    group_col: str = "grid_id", base_cols: list[str] | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Recalcule les agrégats grid intra-fold : fit sur train, appliqués aux deux."""
    stats = fit_grid_aggregates(train_df, group_col, base_cols)
    return (
        apply_grid_aggregates(train_df, stats, group_col, fallback=train_df),
        apply_grid_aggregates(test_df, stats, group_col, fallback=train_df),
    )

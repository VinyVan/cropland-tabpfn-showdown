"""Winner pipeline re-implementation (1st place Zindi cropland-mapping).

Extracted from reference/ensemble.py + reference/spatial_features.py +
reference/config.yaml. No cross-import from reference/ or cropland-mapping/:
this module is self-contained.

Pipeline: ensemble CatBoost/XGBoost/LightGBM, mean of probas, threshold 0.5,
n_estimators=1000, lr=0.06, seed=32. Identity columns (ID, x, y, grid_id,
region, location) excluded from model inputs. Grid aggregates (9 base cols x
min/mean/std/max = 36 features) recomputed intra-fold: fit on train, applied
to train+test (anti-leakage).

Entry points:
  - load_pretrained(models_dir="models") -> PretrainedWinner (demo/inference)
  - train_fold(Xtr, ytr, seed=32, n_estimators=1000, lr=0.06) -> WinnerEnsemble
"""
from __future__ import annotations

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from xgboost import XGBClassifier

SEED = 32
N_ESTIMATORS = 1000
LEARNING_RATE = 0.06
THRESHOLD = 0.5
TARGET = "Cropland"
GROUP_COL = "grid_id"

# Identity columns NEVER given to the model (spatial identity leakage).
EXCLUDE_COLS = ["ID", "x", "y", "grid_id", "region", "location",
                "location_inferred"]

# Grid aggregate bases (same families as train_agg3), from reference config.
GRID_BASE_COLS = [
    "wsi_mean", "evapotrans_mean", "LST_celsius_mean", "temps_mean",
    "pr_mean", "ndvi_mean", "bsi_mean", "msi_mean", "ndwi_mean",
]
GRID_AGGS = ["min", "mean", "std", "max"]


def grid_feature_names(base_cols: list[str] | None = None) -> list[str]:
    base_cols = base_cols or GRID_BASE_COLS
    return [f"grid_{c}_{a}" for c in base_cols for a in GRID_AGGS]


# ----------------------------------------------------------------------------
# Intra-fold grid aggregates (anti-leakage: fit train -> apply both)
# ----------------------------------------------------------------------------

def fit_grid_aggregates(train_df: pd.DataFrame, group_col: str = GROUP_COL,
                        base_cols: list[str] | None = None) -> dict:
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


def apply_grid_aggregates(df: pd.DataFrame, stats: dict,
                          group_col: str = GROUP_COL,
                          fallback: pd.DataFrame | None = None) -> pd.DataFrame:
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


def add_grid_aggregates_intrafold(
    train_df: pd.DataFrame, test_df: pd.DataFrame,
    group_col: str = GROUP_COL, base_cols: list[str] | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    stats = fit_grid_aggregates(train_df, group_col, base_cols)
    return (
        apply_grid_aggregates(train_df, stats, group_col, fallback=train_df),
        apply_grid_aggregates(test_df, stats, group_col, fallback=train_df),
    )


def get_model_feature_columns(df: pd.DataFrame, target: str = TARGET) -> list[str]:
    """Numeric modelable columns, spatial identities excluded."""
    drop = set(EXCLUDE_COLS + [target])
    return [c for c in df.columns
            if c not in drop and pd.api.types.is_numeric_dtype(df[c])]


# ----------------------------------------------------------------------------
# Ensemble: mean proba CatBoost + XGBoost + LightGBM, threshold 0.5
# ----------------------------------------------------------------------------

def build_lgbm(seed: int, n_estimators: int, lr: float, n_jobs: int = -1):
    return LGBMClassifier(n_estimators=n_estimators, learning_rate=lr,
                          random_state=seed, n_jobs=n_jobs, verbose=-1)


def build_xgb(seed: int, n_estimators: int, lr: float, n_jobs: int = -1):
    return XGBClassifier(n_estimators=n_estimators, learning_rate=lr,
                         random_state=seed, n_jobs=n_jobs,
                         eval_metric="logloss", tree_method="hist")


def build_cbm(seed: int, n_estimators: int, lr: float):
    return CatBoostClassifier(iterations=n_estimators, learning_rate=lr,
                              random_seed=seed, verbose=False,
                              allow_writing_files=False)


class WinnerEnsemble:
    """Mean-proba ensemble of fresh CatBoost/XGBoost/LightGBM."""

    def __init__(self, seed: int = SEED, n_estimators: int = N_ESTIMATORS,
                 learning_rate: float = LEARNING_RATE, n_jobs: int = -1):
        self.seed = seed
        self.threshold = THRESHOLD
        self.models = [
            ("lgbm", build_lgbm(seed, n_estimators, learning_rate, n_jobs)),
            ("xgb", build_xgb(seed, n_estimators, learning_rate, n_jobs)),
            ("cbm", build_cbm(seed, n_estimators, learning_rate)),
        ]

    def fit(self, X, y) -> "WinnerEnsemble":
        y = np.asarray(y).astype(int)
        for _, m in self.models:
            m.fit(X, y)
        return self

    def predict_proba(self, X) -> np.ndarray:
        probas = np.mean([m.predict_proba(X)[:, 1] for _, m in self.models], axis=0)
        return np.column_stack([1.0 - probas, probas])

    def predict(self, X, threshold: float = THRESHOLD) -> np.ndarray:
        return (self.predict_proba(X)[:, 1] >= threshold).astype(int)


def train_fold(Xtr, ytr, seed: int = SEED, n_estimators: int = N_ESTIMATORS,
               lr: float = LEARNING_RATE) -> WinnerEnsemble:
    """Train a fresh winner ensemble on one fold (honest retraining)."""
    import random
    random.seed(seed)
    np.random.seed(seed)
    ens = WinnerEnsemble(seed=seed, n_estimators=n_estimators, learning_rate=lr)
    ens.fit(np.asarray(Xtr), np.asarray(ytr).astype(int))
    return ens


# ----------------------------------------------------------------------------
# Pretrained inference (demo / API): models/*.pkl + feature_order.json
# ----------------------------------------------------------------------------

class PretrainedWinner:
    """Winner inference from pretrained pkls (no retraining)."""

    def __init__(self, models: dict, feature_order: list[str],
                 medians: dict | None = None, threshold: float = THRESHOLD):
        self.models = models
        self.feature_order = feature_order
        self.medians = medians or {}
        self.threshold = threshold

    def _frame(self, df: pd.DataFrame) -> np.ndarray:
        out = df.copy()
        for c in self.feature_order:
            if c not in out.columns:
                out[c] = self.medians.get(c, 0.0)
        out = out[self.feature_order]
        for c in out.columns:
            if out[c].isna().any():
                out[c] = out[c].fillna(self.medians.get(c, 0.0))
        return out.to_numpy(dtype=float)

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        X = self._frame(df)
        probas = np.mean(
            [self.models[k].predict_proba(X)[:, 1] for k in ("cbm", "xgb", "lgbm")
             if k in self.models], axis=0)
        return np.column_stack([1.0 - probas, probas])

    def predict(self, df: pd.DataFrame, threshold: float | None = None) -> np.ndarray:
        th = self.threshold if threshold is None else threshold
        return (self.predict_proba(df)[:, 1] >= th).astype(int)


def load_pretrained(models_dir: str | Path = "models") -> PretrainedWinner:
    """Load pretrained winner pkls for demo/API inference."""
    d = Path(models_dir)
    models = {}
    for key, fname in (("cbm", "cbm.pkl"), ("xgb", "xgb.pkl"), ("lgbm", "lgbm.pkl")):
        with open(d / fname, "rb") as f:
            models[key] = pickle.load(f)
    with open(d / "feature_order.json") as f:
        feature_order = json.load(f)
    medians: dict = {}
    med_path = d / "feature_medians.json"
    if med_path.exists():
        with open(med_path) as f:
            medians = json.load(f)
    return PretrainedWinner(models, feature_order, medians)

"""Simple non-winner baseline: sklearn HistGradientBoosting, defaults, seed 32.

Deliberately NO winner artisanat: no grid aggregates, no tuned
n_estimators/lr, plain one-hot for location/region. Same honest protocol
(GroupKFold-5 grid_id) so TabPFN's margin is measured against a plain
strong default too — not only against the tuned 3-GBM ensemble.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier

SEED = 32
TARGET = "Cropland"
DROP = ["ID", "Cropland", "x", "y", "grid_id", "region", "location"]
CATS = ["location", "region"]


def _grid_agg_names() -> set[str]:
    """Winner grid-aggregate columns to EXCLUDE (its artisanat)."""
    try:
        from src import winner as W

        return set(W.grid_feature_names())
    except Exception:
        return set()


def raw_feature_columns(df: pd.DataFrame) -> list[str]:
    """Numeric columns minus identities, spatials, and winner grid aggs."""
    banned = set(DROP) | _grid_agg_names()
    return [c for c in df.columns
            if c not in banned and pd.api.types.is_numeric_dtype(df[c])]


def featurize(df_tr: pd.DataFrame, df_te: pd.DataFrame):
    """One-hot location/region fit on fold-train, test reindexed (no leak)."""
    num = raw_feature_columns(df_tr)
    Xtr_num = df_tr[num].copy()
    Xte_num = df_te[num].copy()
    dtr = pd.get_dummies(df_tr[CATS], dtype=float)
    dte = pd.get_dummies(df_te[CATS], dtype=float).reindex(columns=dtr.columns, fill_value=0.0)
    cols = num + dtr.columns.tolist()
    med = Xtr_num.median(numeric_only=True)
    Xtr = pd.concat([Xtr_num.fillna(med), dtr], axis=1).to_numpy(dtype=float)
    Xte = pd.concat([Xte_num.fillna(med), dte], axis=1).to_numpy(dtype=float)
    ytr = df_tr[TARGET].astype(int).to_numpy()
    yte = df_te[TARGET].astype(int).to_numpy() if TARGET in df_te.columns else None
    return Xtr, ytr, Xte, yte, cols


def build_fold(Xtr, ytr) -> HistGradientBoostingClassifier:
    m = HistGradientBoostingClassifier(random_state=SEED)
    m.fit(Xtr, ytr)
    return m


class SimplePretrained:
    """Picklable full-train model + alignment info for live inference."""

    def __init__(self, model, num_cols, cat_cols, medians):
        self.model = model
        self.num_cols = num_cols
        self.cat_cols = cat_cols
        self.medians = medians

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        X_num = df[self.num_cols].copy() if all(c in df.columns for c in self.num_cols) else None
        if X_num is None:
            raise ValueError("missing numeric columns for simple baseline")
        d = pd.get_dummies(df[CATS], dtype=float).reindex(columns=self.cat_cols, fill_value=0.0)
        med = pd.Series(self.medians)
        X = pd.concat([X_num.fillna(med), d], axis=1).to_numpy(dtype=float)
        return self.model.predict_proba(X)


def train_full(df: pd.DataFrame) -> SimplePretrained:
    num = raw_feature_columns(df)
    X_num = df[num].copy()
    dtr = pd.get_dummies(df[CATS], dtype=float)
    med = X_num.median(numeric_only=True)
    X = pd.concat([X_num.fillna(med), dtr], axis=1).to_numpy(dtype=float)
    y = df[TARGET].astype(int).to_numpy()
    m = HistGradientBoostingClassifier(random_state=SEED)
    m.fit(X, y)
    return SimplePretrained(m, num, dtr.columns.tolist(), med.to_dict())


def save_pretrained(sp: SimplePretrained, models_dir: str | Path):
    import pickle

    models_dir = Path(models_dir)
    with open(models_dir / "simple_hgb.pkl", "wb") as f:
        pickle.dump(sp, f)
    with open(models_dir / "feature_order_simple.json", "w") as f:
        json.dump({"num": sp.num_cols, "cat": sp.cat_cols}, f)


def load_pretrained(models_dir: str | Path = "models") -> SimplePretrained:
    import pickle

    with open(Path(models_dir) / "simple_hgb.pkl", "rb") as f:
        return pickle.load(f)

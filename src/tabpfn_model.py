"""TabPFN-3.5 challenger wrapper.

Uses tabpfn_client.TabPFNClassifier (env TABPFN_API_KEY, preloaded) with a
local sklearn fallback when the API is unavailable. NO extra feature
engineering: raw numeric modelable columns only (identities excluded, like
the winner, but NO grid aggregates / proximity recomputation — that is the
argument: TabPFN gets one pass on raw features, no tuning).
"""
from __future__ import annotations

import os

import numpy as np
import pandas as pd

EXCLUDE_COLS = ["ID", "x", "y", "grid_id", "region", "location",
                "location_inferred"]
TARGET = "Cropland"


def get_tabpfn_features(df: pd.DataFrame, target: str = TARGET) -> list[str]:
    """Raw numeric columns, identities excluded, NO engineered aggregates."""
    drop = set(EXCLUDE_COLS + [target])
    return [c for c in df.columns
            if c not in drop and pd.api.types.is_numeric_dtype(df[c])]


def _make_remote():
    import tabpfn_client
    # Bridge: task env is TABPFN_API_KEY, client expects TABPFN_TOKEN.
    key = os.environ.get("TABPFN_API_KEY") or os.environ.get("TABPFN_TOKEN")
    if key and not os.environ.get("TABPFN_TOKEN"):
        try:
            tabpfn_client.set_access_token(key)
        except Exception:
            os.environ["TABPFN_TOKEN"] = key
    from tabpfn_client import TabPFNClassifier
    return TabPFNClassifier()


def _make_fallback():
    from sklearn.ensemble import HistGradientBoostingClassifier
    return HistGradientBoostingClassifier(random_state=32)


class TabPFNModel:
    """TabPFN-3.5 with local fallback. Same fit/predict API as the winner."""

    def __init__(self):
        self.mode = "unfitted"
        self.model = None

    def fit(self, X, y) -> "TabPFNModel":
        X = np.asarray(X, dtype=float)
        y = np.asarray(y).astype(int)
        if os.environ.get("TABPFN_API_KEY"):
            try:
                clf = _make_remote()
                clf.fit(X, y)
                self.model = clf
                self.mode = "tabpfn-api"
                return self
            except Exception:
                pass
        # Local fallback: no tuning, one pass (honest baseline).
        clf = _make_fallback()
        clf.fit(X, y)
        self.model = clf
        self.mode = "local-fallback-hgb"
        return self

    def predict_proba(self, X) -> np.ndarray:
        return np.asarray(self.model.predict_proba(np.asarray(X, dtype=float)))

    def predict(self, X, threshold: float = 0.5) -> np.ndarray:
        proba = self.predict_proba(X)
        if proba.ndim == 2 and proba.shape[1] == 2:
            return (proba[:, 1] >= threshold).astype(int)
        return np.asarray(self.model.predict(np.asarray(X, dtype=float))).astype(int)


def train_tabpfn(Xtr, ytr) -> TabPFNModel:
    """Train one TabPFN (or fallback) model on a fold."""
    return TabPFNModel().fit(Xtr, ytr)

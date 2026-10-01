"""Ensemble CatBoost + XGBoost + LightGBM — Phase 2.

Moyenne des probas, seuil 0.5. Hyperparamètres depuis configs/config.yaml
(n_estimators=1000, learning_rate=0.06, seed=32). Métriques : accuracy, F1,
IoU, matrice de confusion. sklearn uniquement pour le preprocessing/split.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import GroupKFold, StratifiedKFold
from xgboost import XGBClassifier

from src.config import seed_everything
from src.spatial_features import add_grid_aggregates_intrafold

#: colonnes d'identité à ne JAMAIS donner au modèle (fuite d'identité spatiale).
ID_COLS = ["ID"]
SPATIAL_ID_COLS = ["x", "y", "grid_id", "region", "location", "location_inferred"]


def get_model_feature_columns(
    df: pd.DataFrame, target: str = "Cropland", include_spatial: bool = True,
    spatial_cols: list[str] | None = None,
) -> list[str]:
    """Colonnes numériques modélisables (identités spatiales exclues)."""
    drop = set(ID_COLS + SPATIAL_ID_COLS + [target])
    cols = [
        c for c in df.columns
        if c not in drop and pd.api.types.is_numeric_dtype(df[c])
    ]
    if not include_spatial and spatial_cols:
        cols = [c for c in cols if c not in set(spatial_cols)]
    return cols


def build_lgbm(seed: int, n_estimators: int, lr: float, n_jobs: int = -1) -> LGBMClassifier:
    return LGBMClassifier(
        n_estimators=n_estimators, learning_rate=lr, random_state=seed,
        n_jobs=n_jobs, verbose=-1,
    )


def build_xgb(seed: int, n_estimators: int, lr: float, n_jobs: int = -1) -> XGBClassifier:
    return XGBClassifier(
        n_estimators=n_estimators, learning_rate=lr, random_state=seed,
        n_jobs=n_jobs, eval_metric="logloss", tree_method="hist",
    )


def build_cbm(seed: int, n_estimators: int, lr: float) -> CatBoostClassifier:
    return CatBoostClassifier(
        iterations=n_estimators, learning_rate=lr, random_seed=seed,
        verbose=False, allow_writing_files=False,
    )


class EnsembleGBM:
    """Moyenne des probas CatBoost/XGBoost/LightGBM."""

    def __init__(self, seed: int = 32, n_estimators: int = 1000,
                 learning_rate: float = 0.06, n_jobs: int = -1):
        self.seed = seed
        self.models = [
            ("lgbm", build_lgbm(seed, n_estimators, learning_rate, n_jobs)),
            ("xgb", build_xgb(seed, n_estimators, learning_rate, n_jobs)),
            ("cbm", build_cbm(seed, n_estimators, learning_rate)),
        ]

    def fit(self, X, y) -> "EnsembleGBM":
        y = np.asarray(y).astype(int)
        for _, m in self.models:
            m.fit(X, y)
        return self

    def predict_proba(self, X) -> np.ndarray:
        probas = np.mean([m.predict_proba(X)[:, 1] for _, m in self.models], axis=0)
        return np.column_stack([1.0 - probas, probas])

    def predict(self, X, threshold: float = 0.5) -> np.ndarray:
        return (self.predict_proba(X)[:, 1] >= threshold).astype(int)


def evaluate_metrics(y_true, y_pred) -> dict:
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    denom = tp + fp + fn
    return {
        "n": int(len(y_true)),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "f1": float(f1_score(y_true, y_pred)),
        "iou": float(tp / denom) if denom else 0.0,
        "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
    }


def _split_feature_frames(df_tr: pd.DataFrame, df_te: pd.DataFrame, cfg: dict,
                           feature_cols: list[str], use_intrafold_grid: bool):
    """Ajoute les agrégats grid intra-fold (fit train → appliqués aux deux)."""
    if use_intrafold_grid:
        df_tr, df_te = add_grid_aggregates_intrafold(
            df_tr, df_te, group_col=cfg["group_col"])
    y_tr = df_tr[cfg["target"]].astype(int).to_numpy()
    y_te = df_te[cfg["target"]].astype(int).to_numpy()
    return df_tr[feature_cols].to_numpy(), y_tr, df_te[feature_cols].to_numpy(), y_te


def _fit_predict_fold(X_tr, y_tr, X_te, cfg: dict, n_estimators: int | None = None) -> np.ndarray:
    seed_everything(cfg["seed"])
    e = cfg["ensemble"]
    ens = EnsembleGBM(
        seed=cfg["seed"],
        n_estimators=e["n_estimators"] if n_estimators is None else n_estimators,
        learning_rate=e["learning_rate"], n_jobs=e.get("n_jobs", -1),
    )
    ens.fit(X_tr, y_tr)
    return ens.predict(X_te, threshold=e["threshold"])


def run_group_kfold(df: pd.DataFrame, feature_cols: list[str], cfg: dict,
                    use_intrafold_grid: bool = True,
                    n_estimators: int | None = None) -> dict:
    seed_everything(cfg["seed"])
    gkf = GroupKFold(n_splits=cfg["cv"]["n_splits"])
    groups = df[cfg["group_col"]].to_numpy()
    y_all = df[cfg["target"]].astype(int).to_numpy()
    folds = []
    for i, (tr, te) in enumerate(gkf.split(df, y_all, groups)):
        X_tr, y_tr, X_te, y_te = _split_feature_frames(
            df.iloc[tr], df.iloc[te], cfg, feature_cols, use_intrafold_grid)
        pred = _fit_predict_fold(X_tr, y_tr, X_te, cfg, n_estimators)
        folds.append({"fold": i, **evaluate_metrics(y_te, pred)})
    return {"scheme": f"GroupKFold-5 sur {cfg['group_col']} (ensemble)",
            "folds": folds}


def run_stratified_kfold(df: pd.DataFrame, feature_cols: list[str], cfg: dict,
                         use_intrafold_grid: bool = True,
                         n_estimators: int | None = None) -> dict:
    seed_everything(cfg["seed"])
    skf = StratifiedKFold(n_splits=cfg["cv"]["n_splits"],
                          shuffle=cfg["cv"]["shuffle"], random_state=cfg["seed"])
    y_all = df[cfg["target"]].astype(int).to_numpy()
    folds = []
    for i, (tr, te) in enumerate(skf.split(df, y_all)):
        X_tr, y_tr, X_te, y_te = _split_feature_frames(
            df.iloc[tr], df.iloc[te], cfg, feature_cols, use_intrafold_grid)
        pred = _fit_predict_fold(X_tr, y_tr, X_te, cfg, n_estimators)
        folds.append({"fold": i, **evaluate_metrics(y_te, pred)})
    return {"scheme": "StratifiedKFold-5 (rappel du biais, ensemble)",
            "folds": folds}


def run_inter_region_holdout(df: pd.DataFrame, feature_cols: list[str], cfg: dict,
                             use_intrafold_grid: bool = True,
                             n_estimators: int | None = None) -> dict:
    seed_everything(cfg["seed"])
    loc_col = cfg["location_col"]
    folds = []
    for train_loc in sorted(df[loc_col].unique()):
        test_locs = [loc for loc in sorted(df[loc_col].unique()) if loc != train_loc]
        df_tr = df[df[loc_col] == train_loc]
        df_te = df[df[loc_col].isin(test_locs)]
        X_tr, y_tr, X_te, y_te = _split_feature_frames(
            df_tr, df_te, cfg, feature_cols, use_intrafold_grid)
        pred = _fit_predict_fold(X_tr, y_tr, X_te, cfg, n_estimators)
        folds.append({"fold": f"train={train_loc} → test={','.join(test_locs)}",
                      **evaluate_metrics(y_te, pred)})
    return {"scheme": "Holdout inter-régions (ensemble)", "folds": folds}


def summarize_scheme(scheme_res: dict) -> dict:
    accs = [f["accuracy"] for f in scheme_res["folds"]]
    f1s = [f["f1"] for f in scheme_res["folds"]]
    ious = [f["iou"] for f in scheme_res["folds"]]
    return {
        "scheme": scheme_res["scheme"],
        "accuracy_mean": float(np.mean(accs)), "accuracy_std": float(np.std(accs)),
        "f1_mean": float(np.mean(f1s)), "f1_std": float(np.std(f1s)),
        "iou_mean": float(np.mean(ious)), "iou_std": float(np.std(ious)),
    }


def train_full_ensemble(df: pd.DataFrame, feature_cols: list[str], cfg: dict,
                        n_estimators: int | None = None) -> tuple[EnsembleGBM, dict]:
    """Entraîne l'ensemble sur tout le train (stats grid fitées sur tout le train)."""
    seed_everything(cfg["seed"])
    e = cfg["ensemble"]
    ens = EnsembleGBM(
        seed=cfg["seed"],
        n_estimators=e["n_estimators"] if n_estimators is None else n_estimators,
        learning_rate=e["learning_rate"], n_jobs=e.get("n_jobs", -1),
    )
    stats_holder: dict = {}
    import src.spatial_features as sf
    stats = sf.fit_grid_aggregates(df, group_col=cfg["group_col"])
    stats_holder.update(stats)
    df_full = sf.apply_grid_aggregates(df, stats, group_col=cfg["group_col"], fallback=df)
    ens.fit(df_full[feature_cols].to_numpy(), df[cfg["target"]].astype(int).to_numpy())
    return ens, stats_holder

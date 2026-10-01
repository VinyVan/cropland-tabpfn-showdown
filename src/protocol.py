"""Honest duel protocol: identical splits both sides, seed 32.

Primary: GroupKFold-5 on grid_id (challenge metric = accuracy).
Recall: stratified 80/20 split, seed 32.
Metrics per fold: accuracy / F1 / IoU + train/infer timings.
"""
from __future__ import annotations

import time

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import GroupKFold, train_test_split

SEED = 32
N_SPLITS = 5
TEST_SIZE = 0.2
GROUP_COL = "grid_id"
TARGET = "Cropland"


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


def group_kfold_splits(df, n_splits: int = N_SPLITS,
                       group_col: str = GROUP_COL):
    gkf = GroupKFold(n_splits=n_splits)
    groups = df[group_col].to_numpy()
    y = df[TARGET].astype(int).to_numpy() if TARGET in df.columns else None
    yield from gkf.split(df, y, groups)


def stratified_holdout_split(df, test_size: float = TEST_SIZE,
                             seed: int = SEED):
    y = df[TARGET].astype(int).to_numpy()
    idx = np.arange(len(df))
    tr, te = train_test_split(idx, test_size=test_size, random_state=seed,
                              stratify=y)
    return tr, te


def run_duel_on_splits(df, build_fn, featurize_fn, scheme: str) -> dict:
    """Generic timed duel loop over GroupKFold splits.

    build_fn(Xtr, ytr) -> model with .predict(Xte).
    featurize_fn(df_tr, df_te) -> (Xtr, ytr, Xte, yte) as numpy.
    """
    folds = []
    for i, (tr, te) in enumerate(group_kfold_splits(df)):
        df_tr, df_te = df.iloc[tr], df.iloc[te]
        Xtr, ytr, Xte, yte = featurize_fn(df_tr, df_te)
        t0 = time.perf_counter()
        model = build_fn(Xtr, ytr)
        train_s = time.perf_counter() - t0
        t0 = time.perf_counter()
        pred = np.asarray(model.predict(Xte)).astype(int)
        infer_s = time.perf_counter() - t0
        m = evaluate_metrics(yte, pred)
        folds.append({"fold": i, **m,
                      "train_time_s": round(train_s, 3),
                      "infer_time_s": round(infer_s, 3)})
    return {"scheme": scheme, "folds": folds}


def run_stratified_recall(df, build_fn, featurize_fn) -> dict:
    tr, te = stratified_holdout_split(df)
    df_tr, df_te = df.iloc[tr], df.iloc[te]
    Xtr, ytr, Xte, yte = featurize_fn(df_tr, df_te)
    t0 = time.perf_counter()
    model = build_fn(Xtr, ytr)
    train_s = time.perf_counter() - t0
    t0 = time.perf_counter()
    pred = np.asarray(model.predict(Xte)).astype(int)
    infer_s = time.perf_counter() - t0
    m = evaluate_metrics(yte, pred)
    return {"scheme": "stratified 80/20 seed 32 (recall)",
            "folds": [{**m, "fold": 0,
                       "train_time_s": round(train_s, 3),
                       "infer_time_s": round(infer_s, 3)}]}


def summarize(folds: list[dict]) -> dict:
    accs = [f["accuracy"] for f in folds]
    f1s = [f["f1"] for f in folds]
    ious = [f["iou"] for f in folds]
    tr = [f.get("train_time_s", 0.0) for f in folds]
    inf = [f.get("infer_time_s", 0.0) for f in folds]
    return {
        "acc": round(float(np.mean(accs)), 4),
        "acc_std": round(float(np.std(accs)), 4),
        "f1": round(float(np.mean(f1s)), 4),
        "f1_std": round(float(np.std(f1s)), 4),
        "iou": round(float(np.mean(ious)), 4),
        "iou_std": round(float(np.std(ious)), 4),
        "train_time_s_mean": round(float(np.mean(tr)), 3),
        "infer_time_s_mean": round(float(np.mean(inf)), 3),
        "times": {"train_s": tr, "infer_s": inf},
        "folds": folds,
    }

"""Full duel: retrain both sides per fold -> data/processed/showdown.json.

Winner side: fresh EnsembleGBM per fold (seed 32, n_estimators 1000, lr 0.06),
grid aggregates recomputed intra-fold, identities excluded, ordered per
models/feature_order.json.
TabPFN side: TabPFN-3.5 (API) or local fallback, raw numeric features only.

Output: data/processed/showdown.json
  {winner: {acc, f1, iou, times, folds, ...}, tabpfn: {...},
   stratified_recall: {winner: {...}, tabpfn: {...}},
   meta: {...}}
Sanity: winner GroupKFold acc must land near 0.88 (tolerance 0.05).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src import protocol
from src import winner as W
from src import tabpfn_model as T

SEED = 32
N_ESTIMATORS = 1000
LR = 0.06


def winner_featurize(feature_order):
    def fn(df_tr: pd.DataFrame, df_te: pd.DataFrame):
        dtr, dte = W.add_grid_aggregates_intrafold(df_tr, df_te, W.GROUP_COL)
        for c in feature_order:
            if c not in dtr.columns:
                dtr[c] = np.nan
            if c not in dte.columns:
                dte[c] = np.nan
        med = dtr[feature_order].median(numeric_only=True)
        Xtr = dtr[feature_order].fillna(med).to_numpy(dtype=float)
        Xte = dte[feature_order].fillna(med).to_numpy(dtype=float)
        ytr = dtr[W.TARGET].astype(int).to_numpy()
        yte = dte[W.TARGET].astype(int).to_numpy()
        return Xtr, ytr, Xte, yte
    return fn


def tabpfn_featurize(df_tr: pd.DataFrame, df_te: pd.DataFrame):
    cols = T.get_tabpfn_features(df_tr)
    med = df_tr[cols].median(numeric_only=True)
    Xtr = df_tr[cols].fillna(med).to_numpy(dtype=float)
    Xte = df_te[cols].fillna(med).to_numpy(dtype=float)
    ytr = df_tr[T.TARGET].astype(int).to_numpy()
    yte = df_te[T.TARGET].astype(int).to_numpy()
    return Xtr, ytr, Xte, yte


def main() -> None:
    df = pd.read_parquet(ROOT / "data" / "raw" / "train_feat.parquet")
    with open(ROOT / "models" / "feature_order.json") as f:
        feature_order = json.load(f)

    def build_winner(Xtr, ytr):
        return W.train_fold(Xtr, ytr, seed=SEED,
                            n_estimators=N_ESTIMATORS, lr=LR)

    def build_tabpfn(Xtr, ytr):
        return T.train_tabpfn(Xtr, ytr)

    print("GroupKFold-5 winner ...", flush=True)
    w_gkf = protocol.run_duel_on_splits(
        df, build_winner, winner_featurize(feature_order),
        scheme="GroupKFold-5 grid_id (winner ensemble, retrained)")
    print("GroupKFold-5 tabpfn ...", flush=True)
    t_gkf = protocol.run_duel_on_splits(
        df, build_tabpfn, tabpfn_featurize,
        scheme="GroupKFold-5 grid_id (TabPFN-3.5, retrained)")

    print("Stratified 80/20 recall ...", flush=True)
    w_rec = protocol.run_stratified_recall(
        df, build_winner, winner_featurize(feature_order))
    t_rec = protocol.run_stratified_recall(df, build_tabpfn, tabpfn_featurize)

    tabpfn_modes: list[str] = []
    # Re-run is avoided; infer mode from a tiny probe is unreliable post-hoc.
    # Instead record env presence (API attempted iff key set).
    import os
    api_key_set = bool(os.environ.get("TABPFN_API_KEY"))

    out = {
        "winner": protocol.summarize(w_gkf["folds"]),
        "tabpfn": protocol.summarize(t_gkf["folds"]),
        "stratified_recall": {
            "winner": protocol.summarize(w_rec["folds"]),
            "tabpfn": protocol.summarize(t_rec["folds"]),
        },
        "meta": {
            "seed": SEED, "n_estimators": N_ESTIMATORS, "lr": LR,
            "threshold": 0.5, "n_splits": 5, "group_col": "grid_id",
            "target": "Cropland", "n_rows": int(len(df)),
            "tabpfn_api_key_set": api_key_set,
            "winner_scheme": w_gkf["scheme"], "tabpfn_scheme": t_gkf["scheme"],
        },
    }
    outp = ROOT / "data" / "processed" / "showdown.json"
    outp.parent.mkdir(parents=True, exist_ok=True)
    with open(outp, "w") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {outp}")
    print(f"winner acc={out['winner']['acc']}±{out['winner']['acc_std']} "
          f"f1={out['winner']['f1']} iou={out['winner']['iou']}")
    print(f"tabpfn acc={out['tabpfn']['acc']}±{out['tabpfn']['acc_std']} "
          f"f1={out['tabpfn']['f1']} iou={out['tabpfn']['iou']}")

    acc = out["winner"]["acc"]
    if not (0.83 <= acc <= 0.93):
        print(f"SANITY FAIL: winner GroupKFold acc {acc} not near 0.88 (±0.05)")
        sys.exit(2)
    print("sanity OK: winner acc near 0.88")


if __name__ == "__main__":
    main()

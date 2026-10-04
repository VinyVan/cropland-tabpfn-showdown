"""Run simple baseline: GroupKFold CV (gate) + full-train + test submission.

Outputs: data/processed/simple_baseline.json, models/simple_hgb.pkl,
submission_simple_hgb.csv (official SampleSubmission ID order).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src import protocol as P
from src import simple_baseline as S

TRAIN = ROOT / "data" / "raw" / "train_feat.parquet"
TEST = ROOT / "data" / "raw" / "test_feat.parquet"
SAMPLE = ROOT / "data" / "processed" / "SampleSubmission.csv"

df = pd.read_parquet(TRAIN)
print(f"train {df.shape}", flush=True)


def build_fn(Xtr, ytr):
    return S.build_fold(Xtr, ytr)


def featurize_fn(df_tr, df_te):
    Xtr, ytr, Xte, yte, _cols = S.featurize(df_tr, df_te)
    return Xtr, ytr, Xte, yte


res = P.run_duel_on_splits(df, build_fn, featurize_fn, scheme="GroupKFold-5 grid_id")
summary = P.summarize(res["folds"])
print("GroupKFold:", summary["acc"], "+-", summary["acc_std"],
      "F1", summary["f1"], "IoU", summary["iou"],
      "train_s", summary["train_time_s_mean"], flush=True)
assert 0.70 <= summary["acc"] <= 0.95, f"sanity failed: {summary['acc']}"

out = ROOT / "data" / "processed" / "simple_baseline.json"
json.dump(summary, open(out, "w"), indent=2)

sp = S.train_full(df)
S.save_pretrained(sp, ROOT / "models")
print("saved models/simple_hgb.pkl", flush=True)

tst = pd.read_parquet(TEST)
proba = sp.predict_proba(tst)[:, 1]
pred = (proba >= 0.5).astype(int)
sub = pd.DataFrame({"ID": tst["ID"], "Cropland": pred})
smp = pd.read_csv(SAMPLE)[["ID"]].merge(sub, on="ID", how="left")
assert len(smp) == 600 and smp["Cropland"].notna().all()
smp.to_csv(ROOT / "submission_simple_hgb.csv", index=False)
print("OK submission_simple_hgb.csv", smp["Cropland"].value_counts().to_dict(), flush=True)

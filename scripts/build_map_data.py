"""Build map_points.csv: test coords + per-model labels + agreement.

Joins data/raw/test.csv (ID, translated_lat/lon) — note: test.csv order may
differ from SampleSubmission; join on ID. Models: winner ensemble/lgb/cat/xgb
CSVs + tabpfn CSV from the winner-ref workbench.
"""
from pathlib import Path

import pandas as pd

SHOW = Path("/home/kali/Documents/competitions/cropland-tabpfn-showdown")
REF = Path("/home/kali/Documents/competitions/zindi/geoai-winner-ref")
coords = pd.read_csv(SHOW / "data/raw/test.csv")[["ID", "location", "translated_lat", "translated_lon"]]

files = {
    "ensemble": REF / "submission_winner_ensemble3.csv",
    "lgb": REF / "submission_winner_lgb3.csv",
    "cat": REF / "submission_winner_cat3.csv",
    "xgb": REF / "submission_winner_xgb3.csv",
    "tabpfn": REF / "submission_tabpfn_agg3.csv",
}
pts = coords.copy()
for name, path in files.items():
    d = pd.read_csv(path)
    assert len(d) == 600, (name, len(d))
    pts = pts.merge(d.rename(columns={"Cropland": f"pred_{name}"}), on="ID", how="left")

pred_cols = [f"pred_{n}" for n in files]
assert pts[pred_cols].notna().all().all()
pts["agreement"] = pts[pred_cols].sum(axis=1)  # 0..5 models voting cropland
pts["tabpfn_vs_majority"] = (pts["pred_tabpfn"] == (pts[pred_cols].sum(axis=1) >= 3)).astype(int)
out = SHOW / "data/processed/map_points.csv"
pts.to_csv(out, index=False)
print(f"OK {len(pts)} points -> {out}")
print("agreement distrib:", pts["agreement"].value_counts().sort_index().to_dict())
print("tabpfn==majority:", round(pts["tabpfn_vs_majority"].mean(), 4))

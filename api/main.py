"""Showdown API: FastAPI on port 8001.

GET  /health   -> {"status": "ok", ...}
GET  /metrics  -> data/processed/showdown.json
GET  /sample   -> one example row (data/processed/sample_example.csv)
POST /predict?model=winner|tabpfn  -> JSON row or CSV body -> label + proba.
  Winner uses pretrained pkls (no retraining). TabPFN uses a lazily-trained
  singleton (full train set, raw features) or local fallback.
"""
from __future__ import annotations

import io
import json
import threading
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse

from src import tabpfn_model as T
from src import winner as W

ROOT = Path(__file__).resolve().parents[1]
SHOWDOWN = ROOT / "data" / "processed" / "showdown.json"
SAMPLE_CSV = ROOT / "data" / "processed" / "sample_example.csv"
TRAIN_PARQUET = ROOT / "data" / "raw" / "train_feat.parquet"

app = FastAPI(title="Cropland Showdown API")

_winner = None
_tabpfn = None
_tabpfn_lock = threading.Lock()


def get_winner() -> W.PretrainedWinner:
    global _winner
    if _winner is None:
        _winner = W.load_pretrained(ROOT / "models")
    return _winner


def get_tabpfn() -> T.TabPFNModel:
    global _tabpfn
    if _tabpfn is None:
        with _tabpfn_lock:
            if _tabpfn is None:
                df = pd.read_parquet(TRAIN_PARQUET)
                cols = T.get_tabpfn_features(df)
                med = df[cols].median(numeric_only=True)
                X = df[cols].fillna(med).to_numpy(dtype=float)
                y = df[T.TARGET].astype(int).to_numpy()
                _tabpfn = T.train_tabpfn(X, y)
                _tabpfn.feature_cols = cols
                _tabpfn.feature_meds = med
    return _tabpfn


@app.get("/health")
def health():
    return {"status": "ok", "service": "cropland-showdown"}


@app.get("/metrics")
def metrics():
    with open(SHOWDOWN) as f:
        return json.load(f)


@app.get("/sample")
def sample():
    df = pd.read_csv(SAMPLE_CSV, nrows=1)
    return {"row": df.iloc[0].to_dict(), "columns": df.columns.tolist()}


def _parse_body(body: bytes, content_type: str) -> pd.DataFrame:
    if "text/csv" in content_type or (
        body[:1] in (b"I", b"e", b"x") and b"," in body.split(b"\n", 1)[0]
    ):
        # CSV heuristic: first line looks like a header with commas.
        try:
            return pd.read_csv(io.BytesIO(body))
        except Exception:
            pass
    # JSON: dict (single row), {"row": {...}}, {"rows": [...]}, or list.
    payload = json.loads(body.decode("utf-8") or "{}")
    if isinstance(payload, dict) and "rows" in payload:
        rows = payload["rows"]
    elif isinstance(payload, dict) and "row" in payload:
        rows = [payload["row"]]
    elif isinstance(payload, list):
        rows = payload
    elif isinstance(payload, dict):
        rows = [payload]
    else:
        rows = []
    return pd.DataFrame(rows)


@app.post("/predict")
async def predict(request: Request,
                  model: str = Query(default="winner",
                                     pattern="^(winner|tabpfn)$")):
    body = await request.body()
    ctype = request.headers.get("content-type", "application/json")
    try:
        df = _parse_body(body, ctype)
    except Exception as e:
        return JSONResponse({"error": f"unparseable body: {e}"}, status_code=400)
    if df.empty:
        return JSONResponse({"error": "empty row/CSV"}, status_code=400)

    if model == "winner":
        w = get_winner()
        proba = w.predict_proba(df)[:, 1]
        labels = (proba >= 0.5).astype(int)
    else:
        t = get_tabpfn()
        cols = getattr(t, "feature_cols", None) or T.get_tabpfn_features(df)
        meds = getattr(t, "feature_meds", None)
        X = df.copy()
        for c in cols:
            if c not in X.columns:
                X[c] = float(meds[c]) if meds is not None and c in meds else 0.0
        X = X[cols]
        if meds is not None:
            X = X.fillna(meds)
        else:
            X = X.fillna(0.0)
        proba = t.predict_proba(X.to_numpy(dtype=float))[:, 1]
        labels = (proba >= 0.5).astype(int)

    if len(df) == 1:
        return {"model": model, "label": int(labels[0]),
                "proba": round(float(proba[0]), 4)}
    return {"model": model,
            "results": [{"label": int(l), "proba": round(float(p), 4)}
                        for l, p in zip(labels, proba)]}

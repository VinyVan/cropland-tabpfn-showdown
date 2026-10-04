"""Showdown API: FastAPI on port 8001.

GET  /health   -> {"status": "ok", ...}
GET  /metrics  -> data/processed/showdown.json
GET  /models   -> models/registry.json entries (+ LB scores)
GET  /sample   -> one example row (data/processed/sample_example.csv)
POST /predict?model=<registry-name>  -> JSON row or CSV body -> label + proba.
  Registry-driven: any live entry in models/registry.json is served with
  ZERO code change (add entry + files). Aliases: winner -> ensemble.
  kind=submission_only -> 400 with clear message (still listed in /models).

Live backends:
  live_pretrained (src/winner.py): models/*.pkl, members subset of winner.
  live_api        (src/tabpfn_model.py): lazily-trained singleton or fallback.
"""
from __future__ import annotations

import io
import json
import threading
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse

from src import tabpfn_model as T
from src import winner as W

ROOT = Path(__file__).resolve().parents[1]
SHOWDOWN = ROOT / "data" / "processed" / "showdown.json"
SAMPLE_CSV = ROOT / "data" / "processed" / "sample_example.csv"
TRAIN_PARQUET = ROOT / "data" / "raw" / "train_feat.parquet"
REGISTRY_PATH = ROOT / "models" / "registry.json"

app = FastAPI(title="Cropland Showdown API")

try:  # AG-UI chatbot (optional: disabled if agent deps missing)
    from ag_ui_langgraph import LangGraphAgent, add_langgraph_fastapi_endpoint

    from api.agent.graph import AGENT_NAME, get_graph

    add_langgraph_fastapi_endpoint(
        app,
        LangGraphAgent(name=AGENT_NAME, graph=get_graph(),
                       emit_raw_events=False),
        path="/agui",
    )
    print("[agent] AG-UI endpoint mounted at /agui")
except Exception as e:  # pragma: no cover - agent optional
    print(f"[agent] disabled: {e}")

_winner = None
_tabpfn = None
_tabpfn_lock = threading.Lock()
_registry_cache = None


def load_registry() -> dict:
    global _registry_cache
    if _registry_cache is None:
        with open(REGISTRY_PATH) as f:
            _registry_cache = json.load(f)
    return _registry_cache


def resolve_model(name: str) -> tuple[str, dict | None]:
    """Resolve alias -> (canonical_name, entry or None)."""
    reg = load_registry()
    aliases = reg.get("aliases", {})
    canonical = aliases.get(name, name)
    for e in reg.get("models", []):
        if e.get("name") == canonical:
            return canonical, e
    return canonical, None


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


def winner_proba_for_members(w: W.PretrainedWinner, df: pd.DataFrame,
                             members: list[str]) -> np.ndarray:
    """Mean proba over a subset of winner sub-models (no retraining)."""
    if not members or set(members) == {"cbm", "xgb", "lgbm"}:
        return w.predict_proba(df)[:, 1]
    X = w._frame(df)
    probas = np.mean(
        [w.models[k].predict_proba(X)[:, 1] for k in members if k in w.models],
        axis=0,
    )
    return np.asarray(probas)


@app.get("/health")
def health():
    return {"status": "ok", "service": "cropland-showdown"}


@app.get("/metrics")
def metrics():
    with open(SHOWDOWN) as f:
        return json.load(f)


@app.get("/models")
def list_models():
    reg = load_registry()
    return {"models": reg.get("models", []), "aliases": reg.get("aliases", {})}


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
                  model: str = Query(default="winner")):
    canonical, entry = resolve_model(model)
    if entry is None:
        valid = [e.get("name") for e in load_registry().get("models", [])]
        return JSONResponse(
            {"error": f"unknown model '{model}'. Valid: {valid} (aliases: winner->ensemble)"},
            status_code=404,
        )
    kind = entry.get("kind", "")
    if kind == "submission_only":
        return JSONResponse(
            {"error": f"model '{canonical}' is submission_only (LB scores only, no live inference). See GET /models."},
            status_code=400,
        )
    body = await request.body()
    ctype = request.headers.get("content-type", "application/json")
    try:
        df = _parse_body(body, ctype)
    except Exception as e:
        return JSONResponse({"error": f"unparseable body: {e}"}, status_code=400)
    if df.empty:
        return JSONResponse({"error": "empty row/CSV"}, status_code=400)

    if kind == "live_pretrained":
        w = get_winner()
        members = entry.get("members", []) or []
        try:
            proba = winner_proba_for_members(w, df, members)
        except Exception as e:
            return JSONResponse({"error": f"winner inference failed: {e}"}, status_code=500)
        labels = (np.asarray(proba) >= 0.5).astype(int)
    elif kind == "live_sklearn":
        from src import simple_baseline as S

        try:
            sp = S.load_pretrained(ROOT / "models")
            proba = sp.predict_proba(df)[:, 1]
        except Exception as e:
            return JSONResponse({"error": f"simple inference failed: {e}"}, status_code=500)
        labels = (np.asarray(proba) >= 0.5).astype(int)
    elif kind == "live_api":
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
        labels = (np.asarray(proba) >= 0.5).astype(int)
    else:
        return JSONResponse(
            {"error": f"model '{canonical}' has unsupported kind '{kind}'"},
            status_code=400,
        )

    if len(df) == 1:
        return {"model": canonical, "label": int(labels[0]),
                "proba": round(float(proba[0]), 4)}
    return {"model": canonical,
            "results": [{"label": int(l), "proba": round(float(p), 4)}
                        for l, p in zip(labels, proba)]}

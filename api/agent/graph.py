"""Agri assistant graph: LangGraph + muse-spark-1.3-contributor.

LLM wiring (verified): langchain-openai ChatOpenAI with use_responses_api=True
(plain /chat/completions is NOT supported by this model), base_url
https://opencode.ai/zen/go/v1, key from env OPENCODE_GO_API_KEY, stable
per-process x-opencode-session header (V1 limitation: shared across
conversations; per-thread sessions = future work).
"""
from __future__ import annotations

import json
import os
import uuid
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHOWDOWN_JSON = ROOT / "data" / "processed" / "showdown.json"
LB_JSON = ROOT / "data" / "processed" / "lb_scores.json"
MAP_CSV = ROOT / "data" / "processed" / "map_points.csv"
SAMPLE_CSV = ROOT / "data" / "processed" / "sample_example.csv"

SESSION_ID = os.environ.get("AGUI_SESSION_ID") or f"agri-{uuid.uuid4().hex[:12]}"

SYSTEM = """You are the Agri assistant for the cropland-mapping showdown
(Zindi GeoAI challenge: winner ensemble vs TabPFN-3.5). Answer in the user's
language (French or English). TOOL RULE (mandatory): for ANY question about
scores, models, comparison, map, or predictions, you MUST call the relevant
tool(s) FIRST and answer ONLY from their results — never from memory, never a
generic greeting when the user asks for data. Mapping: compare/scores/leaderboard
-> get_lb_scores AND get_duel_stats; map/parcels/agreement -> get_map_stats;
predict/parcel -> predict_parcel. Always cite the REAL numbers returned. Keep
answers short; the frontend renders your tool data as charts."""

AGENT_NAME = "agri-assistant"


def _tools():
    from langchain_core.tools import tool

    @tool
    def predict_parcel(model: str = "tabpfn", sample_index: int = 0) -> dict:
        """Predict cropland for a sample parcel. model in {ensemble,lgb,cat,xgb,tabpfn} (+winner alias). sample_index picks a demo row."""
        import pandas as pd
        from api import main as M

        canonical, entry = M.resolve_model(model)
        if entry is None:
            return {"error": f"unknown model '{model}'"}
        df = pd.read_csv(SAMPLE_CSV)
        row = df.iloc[[sample_index % len(df)]].reset_index(drop=True)
        kind = entry.get("kind", "")
        if kind == "live_pretrained":
            w = M.get_winner()
            proba = M.winner_proba_for_members(w, row, entry.get("members", []) or [])
        elif kind == "live_api":
            t = M.get_tabpfn()
            cols = getattr(t, "feature_cols", None)
            meds = getattr(t, "feature_meds", None)
            X = row.copy()
            for c in cols:
                if c not in X.columns:
                    X[c] = float(meds[c]) if meds is not None and c in meds else 0.0
            X = X[cols]
            X = X.fillna(meds) if meds is not None else X.fillna(0.0)
            proba = t.predict_proba(X.to_numpy(dtype=float))[:, 1]
        else:
            return {"error": f"model '{canonical}' has no live inference"}
        p = round(float(proba[0]), 4)
        return {"model": canonical, "label": int(p >= 0.5), "proba": p,
                "verdict": "cropland" if p >= 0.5 else "not cropland"}

    @tool
    def get_lb_scores() -> dict:
        """Official Zindi leaderboard scores for our 5 reproducible submissions + user best before."""
        with open(LB_JSON) as f:
            return json.load(f)

    @tool
    def get_duel_stats() -> dict:
        """Local honest-protocol stats: GroupKFold-5 acc/F1/IoU + train/infer times per fold, winner vs TabPFN."""
        with open(SHOWDOWN_JSON) as f:
            d = json.load(f)
        slim = {}
        for k in ("winner", "tabpfn"):
            v = d[k]
            slim[k] = {"acc": v["acc"], "acc_std": v.get("acc_std"),
                       "f1": v["f1"], "iou": v["iou"],
                       "train_time_s_mean": v.get("train_time_s_mean"),
                       "infer_time_s_mean": v.get("infer_time_s_mean"),
                       "folds_acc": [fl.get("accuracy", fl.get("acc")) for fl in v.get("folds", [])] or None}
        return slim

    @tool
    def get_map_stats() -> dict:
        """Map stats: per-model cropland counts over 600 parcels + agreement distribution + TabPFN-vs-majority rate."""
        import pandas as pd

        df = pd.read_csv(MAP_CSV)
        models = ["ensemble", "lgb", "cat", "xgb", "tabpfn"]
        return {
            "n_points": len(df),
            "cropland_counts": {m: int(df[f"pred_{m}"].sum()) for m in models},
            "agreement distrib (n models voting cropland)": df["agreement"].value_counts().sort_index().to_dict(),
            "tabpfn_vs_majority": round(float(df["tabpfn_vs_majority"].mean()), 4),
        }

    return [predict_parcel, get_lb_scores, get_duel_stats, get_map_stats]


@lru_cache(maxsize=1)
def get_graph():
    """Build and compile the assistant graph (cached singleton)."""
    from langchain.agents import create_agent
    from langchain_openai import ChatOpenAI
    from langgraph.checkpoint.memory import InMemorySaver

    llm = ChatOpenAI(
        model="muse-spark-1.3-contributor",
        base_url="https://opencode.ai/zen/go/v1",
        api_key=os.environ.get("OPENCODE_GO_API_KEY"),
        use_responses_api=True,
        default_headers={"x-opencode-session": SESSION_ID,
                         "User-Agent": "sahel-agri-chatbot/1.0"},
        temperature=0.2,
        timeout=300,
        max_retries=1,
    )
    return create_agent(llm, _tools(), system_prompt=SYSTEM,
                        checkpointer=InMemorySaver())

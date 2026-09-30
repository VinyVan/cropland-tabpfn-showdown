# ARCHITECTURE — Projet 2 Showdown

## Stack
Python 3.11 (`tabpfn-client`, `tabpfn`, scikit-learn, pandas, pyarrow, catboost, lightgbm, xgboost, fastapi, uvicorn),
Next.js 14 App Router + TS + Tailwind (`web/`), FR/EN, `data-theme` clair/sombre.

## Arbre
```
docs/CDC.md, ARCHITECTURE.md, VERSIONING.md
data/raw/          # copies train_feat.parquet, test_feat.parquet (+ agg3/climate si besoin, LECTURE SEULE)
data/processed/    # showdown.json, sample_example.csv
models/            # copies cbm/lgbm/xgb.pkl + feature_order.json (inférence gagnant)
src/
  winner.py        # charge pkls + prédit (moyenne probas, seuil 0.5) — EXTRAIT de cropland-mapping, pas d'import croisé
  tabpfn_model.py  # wrapper TabPFN-3.5 (API + fallback)
  protocol.py      # GroupKFold grid_id + stratifié, seed 32, métriques acc/F1/IoU + timings
api/main.py        # /health /metrics(showdown.json) /sample /predict(model=winner|tabpfn)
scripts/run_showdown.py  # le duel complet -> showdown.json
web/               # /, /performances, /methodes, /pourquoi-tabpfn (+ proxy /api/py -> :8001)
requirements.txt, .gitignore, README.md
```

## Non-négociables
- `cropland-mapping/` jamais modifié, jamais importé (copie du code utile dans `src/winner.py`).
- Protocole identique des deux côtés, seed 32, exclusions d'identités spatiales comme le gagnant.
- L'agent ne fait ni git ni lecture `.env*`. Preuve : `run_showdown.py` vert + `tsc`/`build` verts + `/health` 200 + 1 prédiction par modèle.
- Port API : 8001 (8000 = projet 1). Tunnel web : 3001.

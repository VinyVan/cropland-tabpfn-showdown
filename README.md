# Cropland Showdown — Zindi Winner vs TabPFN-3.5

Honest duel, same protocol on both sides: GroupKFold-5 on `grid_id`
(challenge metric: accuracy), seed 32. Next.js 14 web app (FR/EN/DE) +
FastAPI on port **8001**. Built for the PriorLabs Hackathon 3.5.

## 5-min quickstart

```bash
# API (port 8001, preloaded env — never read .env files)
uvicorn api.main:app --port 8001

# Web (sync data first, web tunnel: 3001)
cd web && npm run sync-data && npm run dev
```

Proof: `cd web && npx tsc --noEmit && npm run build`, then
`uvicorn :8001` → `/health` 200, `/models` 6 entries, 6 pages 200.

## Model registry (adding a model = zero code)

`models/registry.json` lists the 6 models served by `api/main.py`:

- `ensemble`, `lgb`, `cat`, `xgb` — `kind=live_pretrained`,
  inference via `models/*.pkl` through `src/winner.py`
  (never retrained; `members` = `cbm/xgb/lgbm` subset).
- `tabpfn` — `kind=live_api` via `src/tabpfn_model.py`.
- `simple` — `kind=live_sklearn` via `src/simple_baseline.py`
  (plain sklearn HistGradientBoosting, defaults, seed 32, no grid aggregates).

Each entry carries `display {fr,en,de}` + `lb_public`/`lb_private`
(copied from `data/processed/lb_scores.json`).

- `GET /models` returns all entries + LB scores.
- `POST /predict?model=<registry-name>` serves every live entry
  (`winner` stays an alias of `ensemble`).
- `kind=submission_only`: listed in `/models`, but `POST /predict`
  answers **400** with a clear message (LB scores only, no inference).

**Adding a model later:** append a registry entry + drop the files
(`models/*.pkl` or a `src/` wrapper), **zero code change** in
`api/main.py`. Never touch the training logic of `src/winner.py`.

## Data sync web

```bash
cd web && npm run sync-data
```

Copies `showdown.json` + `simple_baseline.json` + `lb_scores.json` +
`map_points.csv` from `data/processed/` to `web/data/` (static page
imports) **and** `web/public/data/` (client-side map fetch). The map reads
`web/data/map_points.csv` (600 pts: `translated_lat/lon`, `pred_*`,
`agreement`) served at `/data/map_points.csv`.

Charts in `web/components/charts.tsx` (recharts) read the existing bundles
`web/data/showdown.json` + `web/data/lb_scores.json` via
`web/lib/showdown.ts` / `web/lib/lb.ts` / `web/lib/simple.ts`. Chart colors
via CSS vars (`--tabpfn`, `--winner`, `--sand-strong`, `--chart-grid`)
defined in `web/app/globals.css` (dark-mode aware).

## Pages

`/`, `/performances` (local CV + official Zindi LB table: our 6
reproducible submissions + before), `/methodes`, `/pourquoi-tabpfn` (leads
with LB numbers: TabPFN public **0.8667**, our best), `/carte`
(Leaflet CDN, zero npm deps, 7-mode selector incl. agreement,
544 unanimous / 56 disputed, TabPFN==majority 94.8%), `/assistant`
(LangGraph + AG-UI chatbot, instant charts, floating popup site-wide).

## Demo video

`demo/demo.mp4` (~3 min, English) + `demo/demo_voiced.mp4` (same +
English voiceover). Built from real site footage:
`scripts/demo_shots*.py` (Playwright) → `scripts/demo_assemble.sh`
(ffmpeg scroll clips + xfades). Rebuild after any visual change.

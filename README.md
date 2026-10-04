# Cropland Showdown — Winner Zindi vs TabPFN-3.5

Duel honnête, même protocole des deux côtés : GroupKFold-5 sur `grid_id`
(métrique challenge : accuracy), seed 32. Web app Next.js 14 FR/EN +
FastAPI sur port **8001**.

## 5-min quickstart

```bash
# API (port 8001, env préchargé — ne jamais lire .env)
uvicorn api.main:app --port 8001

# Web (sync data d'abord, tunnel web : 3001)
cd web && npm run sync-data && npm run dev
```

Preuves : `cd web && npx tsc --noEmit && npm run build`, puis
`uvicorn :8001` → `/health` 200, `/models` 5 entrées, 5 pages 200.

## Model registry (ajouter un modèle = zéro code)

`models/registry.json` liste les 5 modèles servis par `api/main.py` :

- `ensemble`, `lgb`, `cat`, `xgb` — `kind=live_pretrained`,
  inférence via `models/*.pkl` à travers `src/winner.py`
  (jamais de retraining ; `members` = sous-ensemble `cbm/xgb/lgbm`).
- `tabpfn` — `kind=live_api` via `src/tabpfn_model.py`.

Chaque entrée porte `display {fr,en}` + `lb_public`/`lb_private`
(recopiés de `data/processed/lb_scores.json`).

- `GET /models` retourne toutes les entrées + scores LB.
- `POST /predict?model=<registry-name>` sert toute entrée live
  (`winner` reste un alias de `ensemble`, `tabpfn` inchangé).
- `kind=submission_only` : listé dans `/models`, mais `POST /predict`
  répond **400** avec un message clair (scores LB seuls, pas d'inférence).

**Ajouter un modèle plus tard :** ajouter une entrée au registre +
déposer les fichiers (`models/*.pkl` ou wrapper `src/`), **zéro
changement de code** dans `api/main.py`. Ne jamais modifier la logique
d'entraînement de `src/winner.py`.

## Data sync web

```bash
cd web && npm run sync-data
```

Copie `showdown.json` + `lb_scores.json` + `map_points.csv` depuis
`data/processed/` vers `web/data/` (import statique des pages) **et**
`web/public/data/` (fetch client de la carte). La carte lit le contenu
de `web/data/map_points.csv` (600 pts : `translated_lat/lon`, `pred_*`,
`agreement`) servi via `/data/map_points.csv`.

Showdown-viz : `/performances` ne consomme **aucun nouveau fichier** —
`web/components/charts.tsx` (recharts) lit les bundles existants
`web/data/showdown.json` + `web/data/lb_scores.json` via
`web/lib/showdown.ts` / `web/lib/lb.ts`. Donc `npm run sync-data`
reste inchangé (aucune extension nécessaire) ; après `npm install
recharts`, relancer `npm run sync-data` pour fraîcheur. Couleurs charts
via CSS vars (`--tabpfn`, `--winner`, `--sand-strong`, `--chart-grid`)
définies dans `web/app/globals.css` (dark-mode aware).

## Pages

`/`, `/performances` (CV local + table LB officielle Zindi : nos 5
soumissions reproductibles + before), `/methodes`, `/pourquoi-tabpfn` (ouvre sur les
chiffres LB : TabPFN public **0.8667**, notre meilleur), `/carte`
(Leaflet CDN, zéro dépendance npm, sélecteur 5 modèles + mode accord,
unanimes 544 / contestés 56, TabPFN==majorité 94.8%).

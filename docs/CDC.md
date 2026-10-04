# CDC — Projet 2 : Cropland Mapping, gagnant Zindi vs TabPFN-3.5

## Idée
Rejouer le challenge Zindi `GeoAI Challenge for Cropland Mapping in Dry Environments` exactement :
le pipeline reproduit depuis le repo de la solution 1ère place (nos soumissions en découlent directement)
contre TabPFN-3.5, même protocole, comparatif chiffré, vraie web app qui raconte performances + méthodes + pourquoi TabPFN.

## Références gagnant (ne pas réinventer, réutiliser)
- Repo source : `~/Documents/projects/cropland-mapping/` — LECTURE SEULE, jamais modifié, jamais habité (on extrait, on ne s'installe pas dedans).
- Pipeline : ensemble CatBoost/XGBoost/LightGBM, moyenne des probas, seuil 0.5, `n_estimators=1000`, `lr=0.06`, `seed=32`, 218 features (identités x/y/grid_id/region/location exclues, agrégats grid intra-fold).
- Scores à battre (même protocole) : GroupKFold-5 `grid_id` → accuracy **0.8801 ± 0.0178**, F1 0.7666, IoU 0.6299. Métrique du challenge : **accuracy**.
- Modèles pré-entraînés réutilisables : `models/{cbm,lgbm,xgb}.pkl` + `feature_order.json` (copie locale, inférence directe).

## Exigences
1. Même protocole honnête pour les deux : GroupKFold-5 sur `grid_id` (métrique principale), split stratifié 80/20 seed 32 en rappel, holdout Fergana↔Orenburg en option transfert.
2. Challenger TabPFN-3.5 via `tabpfn_client` (`TABPFN_API_KEY`, env préchargé) + fallback baseline ; AUCUNE feature engineering ajoutée côté TabPFN (c'est l'argument).
3. Comparatif : accuracy (métrique challenge) + F1 + IoU + temps d'entraînement/inférence par fold → `data/processed/showdown.json`.
4. Web app Next.js 14 + Tailwind FR/EN + FastAPI (même pattern que projet 1) : pages `/` (verdict + duel), `/performances` (tableaux + bar charts + folds), `/methodes` (pipeline gagnant vs TabPFN, schéma), `/pourquoi-tabpfn` (no-tuning, une passe, vitesse, limites honnêtes dont transfert inter-régions).
5. Chiffres servis depuis `showdown.json` uniquement, jamais recalculés à la main. Seed 32 partout côté gagnant.
6. Repo soumettable : README 5-min, `requirements.txt`, démo, `docs/` comme brief.

## Hors scope V1
Pas de nouvelle feature engineering, pas de tuning TabPFN. Soumissions Zindi : 5 effectuées et scorées (voir data/processed/lb_scores.json).

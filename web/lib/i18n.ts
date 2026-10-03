export type Lang = "fr" | "en";

export const dict = {
  nav: {
    home: { fr: "Accueil", en: "Home" },
    perf: { fr: "Performances", en: "Results" },
    methods: { fr: "Méthodes", en: "Methods" },
    why: { fr: "Pourquoi TabPFN", en: "Why TabPFN" },
    map: { fr: "Carte", en: "Map" },
    assistant: { fr: "Assistant", en: "Assistant" },
  },
  home: {
    title: {
      fr: "Cropland Mapping — Duel : Gagnant Zindi vs TabPFN-3.5",
      en: "Cropland Mapping — Duel: Zindi Winner vs TabPFN-3.5",
    },
    subtitle: {
      fr: "Même protocole honnête des deux côtés : GroupKFold-5 sur grid_id, seed 32. Métrique du challenge : accuracy.",
      en: "Same honest protocol on both sides: GroupKFold-5 on grid_id, seed 32. Challenge metric: accuracy.",
    },
    verdict: { fr: "Verdict", en: "Verdict" },
    cta_perf: { fr: "Voir les performances", en: "See results" },
    cta_methods: { fr: "Comprendre les méthodes", en: "Understand the methods" },
    demo: { fr: "Essayez une prédiction", en: "Try a prediction" },
    model: { fr: "Modèle", en: "Model" },
    predict: { fr: "Prédire (exemple)", en: "Predict (sample)" },
  },
  perf: {
    title: { fr: "Performances", en: "Results" },
    subtitle: {
      fr: "Chiffres servis depuis showdown.json uniquement. Primaire : GroupKFold-5 sur grid_id. Rappel : split stratifié 80/20, seed 32.",
      en: "Numbers served from showdown.json only. Primary: GroupKFold-5 on grid_id. Recall: stratified 80/20 split, seed 32.",
    },
    metric: { fr: "Métrique", en: "Metric" },
    perFold: { fr: "Détail par fold", en: "Per-fold detail" },
    recall: { fr: "Rappel stratifié 80/20", en: "Stratified 80/20 recall" },
    times: { fr: "Temps moyens (s)", en: "Mean times (s)" },
    storyTitle: { fr: "TabPFN en bref : la puissance sans l'artisanat", en: "TabPFN in short: power without the handcraft" },
    storySub: {
      fr: "Mêmes features brutes que le gagnant, mais zéro tuning, zéro feature engineering — et 10× plus rapide à entraîner.",
      en: "Same raw features as the winner, but zero tuning, zero feature engineering — and 10× faster to train.",
    },
    cardNoTuning: { fr: "Zéro tuning", en: "No tuning" },
    cardNoTuningBody: { fr: "Aucun hyperparamètre réglé : n_estimators/lr du gagnant vs défauts TabPFN-3.5.", en: "No hyperparameter tuned: winner n_estimators/lr vs TabPFN-3.5 defaults." },
    cardNoFe: { fr: "Zéro feature engineering", en: "No feature engineering" },
    cardNoFeBody: { fr: "182 colonnes brutes — sans les 36 agrégats grid du gagnant.", en: "182 raw columns — without the winner's 36 grid aggregates." },
    cardOnePass: { fr: "Une seule passe", en: "One forward pass" },
    cardOnePassBody: { fr: "Inférence in-context : on montre le train, TabPFN prédit.", en: "In-context inference: show the train set, TabPFN predicts." },
    cardFaster: { fr: "10× plus rapide", en: "10× faster to train" },
    cardFasterBody: { fr: "7,2 s vs 71,1 s par fold en moyenne (GroupKFold-5).", en: "7.2 s vs 71.1 s per fold on average (GroupKFold-5)." },
    lbChartTitle: { fr: "Duel leaderboard Zindi (accuracy)", en: "Zindi leaderboard duel (accuracy)" },
    lbChartSub: {
      fr: "Nos 5 soumissions + référence Gozie. TabPFN 👑 meilleur public (0,8667).",
      en: "Our 5 submissions + Gozie reference. TabPFN 👑 best public (0.8667).",
    },
    crownNote: { fr: "👑 TabPFN meilleur score public — 0,8667", en: "👑 TabPFN best public score — 0.8667" },
    foldChartTitle: { fr: "Accuracy fold par fold (GroupKFold-5, grid_id)", en: "Fold-by-fold accuracy (GroupKFold-5, grid_id)" },
    foldChartSub: {
      fr: "Bande = moyenne ± écart-type. TabPFN devant ou à égalité sur 4/5 folds.",
      en: "Band = mean ± std. TabPFN ahead or tied on 4/5 folds.",
    },
    timeChartTitle: { fr: "Temps d'entraînement moyen (s / fold)", en: "Mean training time (s / fold)" },
    timeChartSub: {
      fr: "71,1 s → 7,2 s : 9,8× plus rapide. Échelle linéaire, même protocole.",
      en: "71.1 s → 7.2 s: 9.8× faster. Linear scale, same protocol.",
    },
    fasterNote: { fr: "≈10× plus rapide à entraîner", en: "≈10× faster to train" },
    metricChartTitle: { fr: "CV locale : accuracy / F1 / IoU", en: "Local CV: accuracy / F1 / IoU" },
    metricChartSub: {
      fr: "Moyennes GroupKFold-5. TabPFN devant sur les 3 métriques.",
      en: "GroupKFold-5 means. TabPFN ahead on all 3 metrics.",
    },
  },
  methods: {
    title: { fr: "Méthodes", en: "Methods" },
    winnerTitle: { fr: "Pipeline du gagnant", en: "Winner pipeline" },
    winnerBody: {
      fr: "Ensemble CatBoost + XGBoost + LightGBM (n_estimators=1000, lr=0.06, seed=32). Moyenne des probas, seuil 0.5. 218 features : identités x/y/grid_id/region/location exclues, 36 agrégats grid (9 variables × min/mean/std/max) recalculés intra-fold (fit sur train, appliqués au test) pour éviter toute fuite spatiale.",
      en: "CatBoost + XGBoost + LightGBM ensemble (n_estimators=1000, lr=0.06, seed=32). Mean of probabilities, threshold 0.5. 218 features: x/y/grid_id/region/location identities excluded, 36 grid aggregates (9 variables × min/mean/std/max) recomputed intra-fold (fit on train, applied to test) to avoid any spatial leakage.",
    },
    tabpfnTitle: { fr: "TabPFN-3.5", en: "TabPFN-3.5" },
    tabpfnBody: {
      fr: "TabPFNClassifier via tabpfn_client (clé TABPFN_API_KEY), fallback local sinon. AUCUNE feature engineering ajoutée : 182 colonnes numériques brutes, une seule passe, aucun tuning. C'est l'argument — performance sans artisanat.",
      en: "TabPFNClassifier via tabpfn_client (TABPFN_API_KEY), local fallback otherwise. NO added feature engineering: 182 raw numeric columns, single pass, no tuning. That is the point — performance without handcraft.",
    },
    schemaTitle: { fr: "Schéma comparatif", en: "Comparison diagram" },
  },
  why: {
    title: { fr: "Pourquoi TabPFN ?", en: "Why TabPFN?" },
    noTuning: { fr: "Zéro tuning", en: "No tuning" },
    noTuningBody: {
      fr: "Aucun hyperparamètre à régler : le prior du foundation model remplace la recherche manuelle.",
      en: "No hyperparameters to tune: the foundation-model prior replaces manual search.",
    },
    onePass: { fr: "Une seule passe", en: "One pass" },
    onePassBody: {
      fr: "Inférence in-context : on montre le train, TabPFN prédit — pas d'entraînement itératif.",
      en: "In-context inference: show the train set, TabPFN predicts — no iterative training.",
    },
    speed: { fr: "Vitesse", en: "Speed" },
    speedBody: {
      fr: "Secondes par fold côté API contre minutes pour l'ensemble GBM (voir Performances).",
      en: "Seconds per fold via API vs minutes for the GBM ensemble (see Results).",
    },
    limits: { fr: "Limites honnêtes", en: "Honest limits" },
    limitsBody: {
      fr: "Dépendance à l'API (quota, réseau) avec fallback local moins performant ; transfert inter-régions Fergana↔Orenburg non évalué en V1 — les deux modèles peuvent y chuter ; pas de tuning TabPFN tenté, pas de soumission Zindi (challenge terminé).",
      en: "API dependency (quota, network) with a weaker local fallback; Fergana↔Orenburg inter-region transfer not evaluated in V1 — both models may drop there; no TabPFN tuning attempted, no Zindi submission (challenge over).",
    },
  },
  common: {
    accuracy: { fr: "Accuracy", en: "Accuracy" },
    trainTime: { fr: "Entraînement", en: "Training" },
    inferTime: { fr: "Inférence", en: "Inference" },
    winner: { fr: "Gagnant", en: "Winner" },
    tabpfn: { fr: "TabPFN-3.5", en: "TabPFN-3.5" },
  },
  map: {
    title: { fr: "Carte des prédictions", en: "Prediction map" },
    subtitle: {
      fr: "600 points test (Fergana + Orenburg) : prédictions des 5 modèles + accord inter-modèles. Source : web/data/map_points.csv.",
      en: "600 test points (Fergana + Orenburg): predictions of the 5 models + inter-model agreement. Source: web/data/map_points.csv.",
    },
    model: { fr: "Modèle", en: "Model" },
    agreementMode: { fr: "Accord (tous modèles)", en: "Agreement (all models)" },
    unanimous: { fr: "Unanimes", en: "Unanimous" },
    disputed: { fr: "Contestés", en: "Disputed" },
    tabpfnMajority: { fr: "TabPFN == majorité", en: "TabPFN == majority" },
    legendCrop: { fr: "Cropland (1)", en: "Cropland (1)" },
    legendNon: { fr: "Non-cropland (0)", en: "Non-cropland (0)" },
    legendDisputed: { fr: "Désaccord (mode accord)", en: "Disagreement (agreement mode)" },
    loading: { fr: "Chargement de la carte…", en: "Loading map…" },
    points: { fr: "points", en: "points" },
  },
  lb: {
    title: { fr: "Leaderboard officiel Zindi (accuracy)", en: "Official Zindi leaderboard (accuracy)" },
    subtitle: {
      fr: "Scores publics/privés de nos 5 soumissions + référence Gozie + point de départ. Source : data/processed/lb_scores.json.",
      en: "Public/private scores of our 5 submissions + Gozie reference + starting point. Source: data/processed/lb_scores.json.",
    },
    model: { fr: "Modèle", en: "Model" },
    public: { fr: "Public", en: "Public" },
    private: { fr: "Privé", en: "Private" },
    note: { fr: "Note", en: "Note" },
  },
  assistant: {
    note: {
      fr: "L'assistant cite des chiffres réels (outils) et peut afficher des graphiques.",
      en: "The assistant cites real numbers (tools) and can render charts.",
    },
  },
} as const;

export function tr(lang: Lang, node: { fr: string; en: string }): string {
  return lang === "fr" ? node.fr : node.en;
}

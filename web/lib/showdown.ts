export interface FoldRow {
  fold: number;
  n: number;
  accuracy: number;
  f1: number;
  iou: number;
  train_time_s: number;
  infer_time_s: number;
}

export interface ModelSummary {
  acc: number;
  acc_std: number;
  f1: number;
  f1_std: number;
  iou: number;
  iou_std: number;
  train_time_s_mean: number;
  infer_time_s_mean: number;
  times: { train_s: number[]; infer_s: number[] };
  folds: FoldRow[];
}

export interface Showdown {
  winner: ModelSummary;
  tabpfn: ModelSummary;
  stratified_recall: { winner: ModelSummary; tabpfn: ModelSummary };
  meta: Record<string, string | number | boolean>;
}

// Bundled copy of data/processed/showdown.json (sync via `npm run sync-data`).
// Served statically so pages never hand-compute numbers.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import bundled from "../data/showdown.json";

export const showdown = bundled as Showdown;

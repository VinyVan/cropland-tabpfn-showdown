import type { ModelSummary } from "./showdown";

// Bundled copy of data/processed/simple_baseline.json (sync via `npm run sync-data`).
// eslint-disable-next-line @typescript-eslint/no-var-requires
import bundled from "../data/simple_baseline.json";

export const simple = bundled as ModelSummary;

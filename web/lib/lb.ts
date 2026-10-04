export interface LbEntry {
  model: string;
  public_score: number;
  private_score: number;
  submission_id: string;
  comment: string;
}

export interface LbScores {
  challenge: string;
  challenge_url: string;
  metric: string;
  ours: LbEntry[];
  reference?: {
    name: string;
    best_public_score: number;
    best_private_score: number;
    public_rank: number;
    private_rank: number;
    note: string;
  };
  user_best_before: {
    public_score: number;
    private_score: number;
  };
}

// Bundled copy of data/processed/lb_scores.json (sync via `npm run sync-data`).
// eslint-disable-next-line @typescript-eslint/no-var-requires
import bundled from "../data/lb_scores.json";

export const lbScores = bundled as LbScores;

export type Team = {
  id: number;
  name: string;
  name_zh: string;
  color: string;
};

export type Line = {
  id: number;
  label: string;
  ntrp: string | null;
  sort_order: number;
};

export type MatchStatus = "scheduled" | "in_progress" | "completed";

export type Match = {
  id: number;
  line_id: number;
  team_a_id: number;
  team_b_id: number;
  pair_a: string | null;
  pair_b: string | null;
  // Combined NTRP rating for each pair. Optional: real Supabase rows don't have
  // these columns yet, so the court view falls back to the line's NTRP range.
  rating_a?: number | null;
  rating_b?: number | null;
  score_a: number;
  score_b: number;
  status: MatchStatus;
  court: string | null;
  round: number;
  updated_at: string;
};

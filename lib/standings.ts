// Tournament results math for the general-user (viewer) side.
//
// Kept separate from the ResultsSidebar component so it can be unit-tested and
// reused. Ranking rule: matches won, then games won as the first tiebreaker;
// if the top teams are still level on BOTH once every match is final, they play
// a one-point match to decide (see needsOnePoint).

import type { Match, Team } from "./types";

export type StandingRow = {
  team: Team;
  matchesWon: number;
  gamesWon: number;
  played: number; // completed matches this team has appeared in
};

/** Per-team matches won and games won. Games count once a match has started;
 *  matches won and "played" count only completed matches. */
export function computeStandings(teams: Team[], matches: Match[]): StandingRow[] {
  return teams.map((team) => {
    let matchesWon = 0;
    let gamesWon = 0;
    let played = 0;
    for (const m of matches) {
      const isA = m.team_a_id === team.id;
      const isB = m.team_b_id === team.id;
      if (!isA && !isB) continue;
      const own = isA ? m.score_a : m.score_b;
      const opp = isA ? m.score_b : m.score_a;
      if (m.status !== "scheduled") gamesWon += own;
      if (m.status === "completed") {
        played += 1;
        if (own > opp) matchesWon += 1;
      }
    }
    return { team, matchesWon, gamesWon, played };
  });
}

/** Rank by matches won, then games won. Stable for equal rows. */
export function rankStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) => b.matchesWon - a.matchesWon || b.gamesWon - a.gamesWon
  );
}

/** The teams sharing the top spot on BOTH matches won and games won. */
export function tiedForTop(ranked: StandingRow[]): StandingRow[] {
  const leader = ranked[0];
  if (!leader) return [];
  return ranked.filter(
    (r) =>
      r.matchesWon === leader.matchesWon && r.gamesWon === leader.gamesWon
  );
}

export type TournamentOutcome = {
  ranked: StandingRow[];
  total: number;
  completed: number;
  allDone: boolean;
  tiedLeaders: StandingRow[];
  needsOnePoint: boolean; // true only when finished AND the top is a dead heat
  champion: StandingRow | null;
};

export function tournamentOutcome(
  teams: Team[],
  matches: Match[]
): TournamentOutcome {
  const ranked = rankStandings(computeStandings(teams, matches));
  const total = matches.length;
  const completed = matches.filter((m) => m.status === "completed").length;
  const allDone = total > 0 && completed === total;
  const tiedLeaders = tiedForTop(ranked);
  const needsOnePoint = allDone && tiedLeaders.length > 1;
  const champion = allDone && !needsOnePoint ? (ranked[0] ?? null) : null;
  return {
    ranked,
    total,
    completed,
    allDone,
    tiedLeaders,
    needsOnePoint,
    champion,
  };
}

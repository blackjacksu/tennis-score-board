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
  tiesWon: number; // head-to-head rounds won outright (e.g. beating a team 5-3)
  tiesLost: number; // rounds lost outright
  tiesDrawn: number; // rounds that ended level (e.g. 4-4), a draw for both teams
};

/** A team's win–loss–tie record over the completed rounds it has played. */
export type TieRecord = { won: number; lost: number; drawn: number };

/**
 * Head-to-head ties won, keyed by team id. Each round is one tie between two
 * teams; whoever takes more of that round's line matches wins the tie — so
 * Red beating Green 5-3 across the round scores Red one tie.
 *
 * Only awarded once every match in the round is final, so a round still in
 * progress never hands out a tie it might not end up deserving. A drawn round
 * (4-4) counts for neither side.
 */
export function computeTieWins(matches: Match[]): Map<number, number> {
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const list = byRound.get(m.round);
    if (list) list.push(m);
    else byRound.set(m.round, [m]);
  }

  const tiesWon = new Map<number, number>();
  for (const list of byRound.values()) {
    if (!list.every((m) => m.status === "completed")) continue;

    const teamIds = [...new Set(list.flatMap((m) => [m.team_a_id, m.team_b_id]))];
    if (teamIds.length !== 2) continue; // not a straight two-team tie

    const [x, y] = teamIds;
    let xWins = 0;
    let yWins = 0;
    for (const m of list) {
      if (m.score_a === m.score_b) continue; // drawn line, counts for neither
      const winner = m.score_a > m.score_b ? m.team_a_id : m.team_b_id;
      if (winner === x) xWins += 1;
      else if (winner === y) yWins += 1;
    }

    if (xWins === yWins) continue; // drawn tie
    const winner = xWins > yWins ? x : y;
    tiesWon.set(winner, (tiesWon.get(winner) ?? 0) + 1);
  }
  return tiesWon;
}

/**
 * Each team's win–loss–tie record across the completed rounds it has played.
 * A round is won by whoever takes more of its line matches; an equal split
 * (e.g. 4-4) is a draw and counts as a tie for BOTH teams — so a drawn round
 * is visible rather than vanishing. Same round/two-team guards as computeTieWins.
 */
export function computeTieRecords(matches: Match[]): Map<number, TieRecord> {
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const list = byRound.get(m.round);
    if (list) list.push(m);
    else byRound.set(m.round, [m]);
  }

  const records = new Map<number, TieRecord>();
  const bump = (id: number, key: keyof TieRecord) => {
    const r = records.get(id) ?? { won: 0, lost: 0, drawn: 0 };
    r[key] += 1;
    records.set(id, r);
  };

  for (const list of byRound.values()) {
    if (!list.every((m) => m.status === "completed")) continue;

    const teamIds = [...new Set(list.flatMap((m) => [m.team_a_id, m.team_b_id]))];
    if (teamIds.length !== 2) continue; // not a straight two-team tie

    const [x, y] = teamIds;
    let xWins = 0;
    let yWins = 0;
    for (const m of list) {
      if (m.score_a === m.score_b) continue; // drawn line, counts for neither
      const winner = m.score_a > m.score_b ? m.team_a_id : m.team_b_id;
      if (winner === x) xWins += 1;
      else if (winner === y) yWins += 1;
    }

    if (xWins === yWins) {
      bump(x, "drawn");
      bump(y, "drawn");
    } else if (xWins > yWins) {
      bump(x, "won");
      bump(y, "lost");
    } else {
      bump(y, "won");
      bump(x, "lost");
    }
  }
  return records;
}

/** Per-team matches won and games won. Games count once a match has started;
 *  matches won and "played" count only completed matches. */
export function computeStandings(teams: Team[], matches: Match[]): StandingRow[] {
  const tieRecords = computeTieRecords(matches);
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
    const rec = tieRecords.get(team.id) ?? { won: 0, lost: 0, drawn: 0 };
    return {
      team,
      matchesWon,
      gamesWon,
      played,
      tiesWon: rec.won,
      tiesLost: rec.lost,
      tiesDrawn: rec.drawn,
    };
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

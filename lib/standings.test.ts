import { describe, it, expect } from "vitest";
import {
  computeStandings,
  rankStandings,
  tournamentOutcome,
} from "./standings";
import { classifySetScore } from "./setScore";
import type { Match, Team } from "./types";

const RED = 1;
const GREEN = 2;
const YELLOW = 3;

const teams: Team[] = [
  { id: RED, name: "Red", name_zh: "紅隊", color: "#ef4444" },
  { id: GREEN, name: "Green", name_zh: "綠隊", color: "#22c55e" },
  { id: YELLOW, name: "Yellow", name_zh: "黃隊", color: "#eab308" },
];

// The real round-robin bracket: 3 ties × 7 lines = 21 matches, in play order.
// Each row is a scheduled match plus the FINAL score we will "report" for it
// (score_a = team_a games, score_b = team_b games).
type Plan = { teamA: number; teamB: number; a: number; b: number };

const plan: Plan[] = [
  // ── Tie 1: Red vs Green (matches 1–7) ──
  { teamA: RED, teamB: GREEN, a: 6, b: 4 }, // Red
  { teamA: RED, teamB: GREEN, a: 6, b: 3 }, // Red
  { teamA: RED, teamB: GREEN, a: 5, b: 7 }, // Green
  { teamA: RED, teamB: GREEN, a: 7, b: 6 }, // Red
  { teamA: RED, teamB: GREEN, a: 6, b: 2 }, // Red
  { teamA: RED, teamB: GREEN, a: 4, b: 6 }, // Green
  { teamA: RED, teamB: GREEN, a: 6, b: 0 }, // Red
  // ── Tie 2: Red vs Yellow (matches 8–14) ──
  { teamA: RED, teamB: YELLOW, a: 6, b: 4 }, // Red
  { teamA: RED, teamB: YELLOW, a: 5, b: 7 }, // Yellow
  { teamA: RED, teamB: YELLOW, a: 6, b: 3 }, // Red
  { teamA: RED, teamB: YELLOW, a: 4, b: 6 }, // Yellow
  { teamA: RED, teamB: YELLOW, a: 7, b: 5 }, // Red
  { teamA: RED, teamB: YELLOW, a: 3, b: 6 }, // Yellow
  { teamA: RED, teamB: YELLOW, a: 6, b: 2 }, // Red
  // ── Tie 3: Green vs Yellow (matches 15–21) ──
  { teamA: GREEN, teamB: YELLOW, a: 6, b: 4 }, // Green
  { teamA: GREEN, teamB: YELLOW, a: 6, b: 3 }, // Green
  { teamA: GREEN, teamB: YELLOW, a: 5, b: 7 }, // Yellow
  { teamA: GREEN, teamB: YELLOW, a: 6, b: 4 }, // Green
  { teamA: GREEN, teamB: YELLOW, a: 4, b: 6 }, // Yellow
  { teamA: GREEN, teamB: YELLOW, a: 6, b: 2 }, // Green
  { teamA: GREEN, teamB: YELLOW, a: 6, b: 7 }, // Yellow
];

/** Fresh set of 21 scheduled (0-0) matches, exactly as the seed leaves them. */
function freshMatches(): Match[] {
  return plan.map((p, i) => ({
    id: i + 1,
    line_id: (i % 7) + 1,
    team_a_id: p.teamA,
    team_b_id: p.teamB,
    pair_a: null,
    pair_b: null,
    score_a: 0,
    score_b: 0,
    status: "scheduled",
    court: null,
    round: Math.floor(i / 7) + 1,
    updated_at: "",
  }));
}

/** Simulate an admin reporting a final score for one match (mutates in place). */
function reportFinal(matches: Match[], index: number): void {
  const p = plan[index];
  matches[index] = {
    ...matches[index],
    score_a: p.a,
    score_b: p.b,
    status: "completed",
  };
}

const BATCH = 6; // finish 6 matches, then the next 6, … until all 21 are played

describe("streamlined tournament run — 21 matches in batches of 6", () => {
  it("every planned score is a legal completed 6-game set", () => {
    for (const p of plan) {
      expect(classifySetScore(p.a, p.b).state).toBe("final");
    }
  });

  it("plays match-by-match in waves of 6 and the viewer result stays consistent", () => {
    const matches = freshMatches();

    // Nothing played yet: viewer shows Live, no champion.
    let out = tournamentOutcome(teams, matches);
    expect(out.completed).toBe(0);
    expect(out.allDone).toBe(false);
    expect(out.champion).toBeNull();

    const batches = [
      [0, 6], // matches 1–6
      [6, 12], // matches 7–12
      [12, 18], // matches 13–18
      [18, 21], // matches 19–21
    ];
    const expectedCompletedAfter = [6, 12, 18, 21];

    batches.forEach(([start, end], b) => {
      for (let i = start; i < end; i++) reportFinal(matches, i);

      out = tournamentOutcome(teams, matches);
      const isLast = b === batches.length - 1;

      // The general-user side reflects exactly the matches finished so far.
      expect(out.completed).toBe(expectedCompletedAfter[b]);
      expect(out.allDone).toBe(isLast);
      // A champion is only crowned once every match is final.
      expect(out.champion === null).toBe(!isLast);
      // Games won only ever count completed matches → total games across teams
      // equals the sum over completed matches.
      const playedGames = matches
        .filter((m) => m.status === "completed")
        .reduce((s, m) => s + m.score_a + m.score_b, 0);
      const tallied = out.ranked.reduce((s, r) => s + r.gamesWon, 0);
      expect(tallied).toBe(playedGames);
    });

    // ── Final result the general users see ──
    expect(out.allDone).toBe(true);
    expect(out.ranked.map((r) => r.team.name)).toEqual(["Red", "Green", "Yellow"]);

    const [red, green, yellow] = out.ranked;
    expect(red).toMatchObject({ matchesWon: 9, gamesWon: 77 });
    expect(green).toMatchObject({ matchesWon: 6, gamesWon: 67 });
    expect(yellow).toMatchObject({ matchesWon: 6, gamesWon: 66 });

    // Red is the outright winner; no one-point match needed.
    expect(out.needsOnePoint).toBe(false);
    expect(out.champion?.team.name).toBe("Red");

    // Sanity: 21 matches → 21 match wins, and every team played 14.
    expect(out.ranked.reduce((s, r) => s + r.matchesWon, 0)).toBe(21);
    for (const r of out.ranked) expect(r.played).toBe(14);
  });
});

describe("results-side ranking + tiebreak rules", () => {
  const mkMatch = (over: Partial<Match>): Match => ({
    id: 0,
    line_id: 1,
    team_a_id: RED,
    team_b_id: GREEN,
    pair_a: null,
    pair_b: null,
    score_a: 0,
    score_b: 0,
    status: "completed",
    court: null,
    round: 1,
    updated_at: "",
    ...over,
  });

  it("ranks by matches won, then games won as the tiebreaker", () => {
    // Red & Green each win their one match, but Green wins more games.
    const matches: Match[] = [
      mkMatch({ id: 1, team_a_id: RED, team_b_id: YELLOW, score_a: 6, score_b: 4 }),
      mkMatch({ id: 2, team_a_id: GREEN, team_b_id: YELLOW, score_a: 7, score_b: 5 }),
    ];
    const ranked = rankStandings(computeStandings(teams, matches));
    expect(ranked[0].team.name).toBe("Green"); // 1 win, 7 games
    expect(ranked[1].team.name).toBe("Red"); //  1 win, 6 games
  });

  it("flags a one-point match when the top is a dead heat and all matches are final", () => {
    // Red and Green each win one match by an identical 6-4 → fully tied.
    const matches: Match[] = [
      mkMatch({ id: 1, team_a_id: RED, team_b_id: YELLOW, score_a: 6, score_b: 4 }),
      mkMatch({ id: 2, team_a_id: GREEN, team_b_id: YELLOW, score_a: 6, score_b: 4 }),
    ];
    const out = tournamentOutcome(teams, matches);
    expect(out.allDone).toBe(true);
    expect(out.needsOnePoint).toBe(true);
    expect(out.champion).toBeNull();
    expect(out.tiedLeaders.map((r) => r.team.name).sort()).toEqual(["Green", "Red"]);
  });

  it("does not crown or call a tiebreak while matches are unfinished", () => {
    const matches: Match[] = [
      mkMatch({ id: 1, team_a_id: RED, team_b_id: GREEN, score_a: 6, score_b: 4 }),
      mkMatch({ id: 2, team_a_id: GREEN, team_b_id: YELLOW, status: "in_progress", score_a: 3, score_b: 2 }),
    ];
    const out = tournamentOutcome(teams, matches);
    expect(out.allDone).toBe(false);
    expect(out.needsOnePoint).toBe(false);
    expect(out.champion).toBeNull();
  });
});

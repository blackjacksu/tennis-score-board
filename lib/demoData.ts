// Demo dataset used when Supabase is not configured with real credentials.
// Lets you preview the scoreboard layout with no database.
//
// 2026 TAA Tennis Event roster (from the registration sheet):
//   49 sign-ups − 2 dropouts (Jady Tsao, Dylon Lo) = 47 registered players,
//   plus Kosho Horage, who hasn't registered yet but is playing Red's Line 3 with
//   Mu-Ting Chien => 48 players, one per slot with nobody doubling up.
//   3 teams (Red / Green / Yellow) × 8 lines = 24 doubles pairs,
//   round-robin ties (Red-Green, Red-Yellow, Green-Yellow) => 24 matches.
//   Team combined-NTRP totals: Red 50.5 · Green 53.0 · Yellow 52.5 — within 2.5
//   points, and the line-vs-line matchups are close (Line 2 all 8.0, Line 3 all
//   7.0, Line 5 all 6.5). Line 8 is the outlier: Red 3.0 against 4.5 apiece.
//   吳杏玫 seeded at NTRP 2.5 and Kosho Horage at 3.5 (neither has a rating on the
//   form); 鄧之彬 at 4.0 as registered.
import type { Line, Match, Team, TeamRoster } from "./types";

export const demoTeams: Team[] = [
  { id: 1, name: "Red", name_zh: "紅隊", color: "#ef4444" },
  { id: 2, name: "Green", name_zh: "綠隊", color: "#22c55e" },
  { id: 3, name: "Yellow", name_zh: "黃隊", color: "#eab308" },
];

// 8 lines, ordered by combined NTRP (Line 1 strongest). Pairs on the same line
// across teams are similar in combined rating so they play matched opponents.
export const demoLines: Line[] = [
  { id: 1, label: "Line 1", ntrp: "8.0–9.0", sort_order: 1 },
  { id: 2, label: "Line 2", ntrp: "8.0", sort_order: 2 },
  { id: 3, label: "Line 3", ntrp: "7.0", sort_order: 3 },
  { id: 4, label: "Line 4", ntrp: "6.5–7.0", sort_order: 4 },
  { id: 5, label: "Line 5", ntrp: "6.5", sort_order: 5 },
  { id: 6, label: "Line 6", ntrp: "5.5–6.0", sort_order: 6 },
  { id: 7, label: "Line 7", ntrp: "5.0–5.5", sort_order: 7 },
  { id: 8, label: "Line 8", ntrp: "3.0–4.5", sort_order: 8 },
];

// Source of truth for who's on each team. Each team fields one doubles pair per
// line (index 0 = Line 1 ... index 7 = Line 8), with each partner's individual
// NTRP. The Teams view reads this directly; pairsByTeam / ratingsByTeam below
// are derived from it so nothing drifts out of sync.
type RawPlayer = { name: string; ntrp: number };
const rawRoster: Record<
  number,
  { captain: string; pairs: [RawPlayer, RawPlayer][] }
> = {
  1: {
    captain: "Willy Su",
    pairs: [
      [{ name: "Richard Lin", ntrp: 4.5 }, { name: "Willy Su", ntrp: 4.0 }],
      [{ name: "Kevin Chiang", ntrp: 4.0 }, { name: "Yi-Chih Wang", ntrp: 4.0 }],
      [{ name: "Mu-Ting Chien", ntrp: 3.5 }, { name: "Kosho Horage", ntrp: 3.5 }],
      [{ name: "Wendy Wang", ntrp: 3.0 }, { name: "楊之安", ntrp: 3.5 }],
      [{ name: "Derrick Chueh", ntrp: 3.5 }, { name: "Tim Chen", ntrp: 3.0 }],
      [{ name: "Chris Lin", ntrp: 3.0 }, { name: "Joshua Lee", ntrp: 3.0 }],
      [{ name: "Andy Chen", ntrp: 2.5 }, { name: "Avery Hsieh", ntrp: 2.5 }],
      [{ name: "Margot Lai", ntrp: 1.5 }, { name: "Grace Shih", ntrp: 1.5 }],
    ],
  },
  2: {
    captain: "Ben Chen",
    pairs: [
      [{ name: "Andrew Liao", ntrp: 4.5 }, { name: "Fred Lin", ntrp: 4.5 }],
      [{ name: "鄧之彬", ntrp: 4.0 }, { name: "Ronald Feng", ntrp: 4.0 }],
      [{ name: "Peichun Su", ntrp: 3.5 }, { name: "Thomas Yan", ntrp: 3.5 }],
      [{ name: "Alice Liu", ntrp: 3.5 }, { name: "Andy Chung", ntrp: 3.5 }],
      [{ name: "Ben Chen", ntrp: 3.5 }, { name: "Tony Peng", ntrp: 3.0 }],
      [{ name: "Andy Lu", ntrp: 3.0 }, { name: "Zane Shao", ntrp: 2.5 }],
      [{ name: "David Fang", ntrp: 3.0 }, { name: "Cody", ntrp: 2.5 }],
      [{ name: "Julie Hsieh", ntrp: 2.5 }, { name: "Jerry Chiu", ntrp: 2.0 }],
    ],
  },
  3: {
    captain: "Yu Cheng",
    pairs: [
      [{ name: "Ching-Yen Shih", ntrp: 4.0 }, { name: "Yu Cheng", ntrp: 4.0 }],
      [{ name: "Hung-Ying Lin", ntrp: 4.0 }, { name: "Vincent Tseng", ntrp: 4.0 }],
      [{ name: "Theo Pai", ntrp: 3.5 }, { name: "Christine Lin", ntrp: 3.5 }],
      [{ name: "Nate Raughley", ntrp: 3.5 }, { name: "Ramon Mangaser", ntrp: 3.5 }],
      [{ name: "Shih-Yen Pan", ntrp: 3.5 }, { name: "Janice Chen", ntrp: 3.0 }],
      [{ name: "Daniel Tiedemann", ntrp: 3.0 }, { name: "Chih-Yu Lee", ntrp: 3.0 }],
      [{ name: "Faye Chang", ntrp: 3.0 }, { name: "吳杏玫", ntrp: 2.5 }],
      [{ name: "Martin Hsieh", ntrp: 2.5 }, { name: "李佩安", ntrp: 2.0 }],
    ],
  },
};

// Structured roster the Teams view consumes: captain + each doubles pair with
// both partners, their individual ratings, and the combined total.
export const demoRoster: TeamRoster[] = demoTeams.map((team) => {
  const raw = rawRoster[team.id];
  return {
    teamId: team.id,
    captainName: raw.captain,
    pairs: raw.pairs.map(([p1, p2], i) => ({
      lineLabel: demoLines[i].label,
      players: [p1, p2] as [RawPlayer, RawPlayer],
      combined: p1.ntrp + p2.ntrp,
    })),
  };
});

// Pair label ("Name / Name") per team per line — derived from the roster.
const pairsByTeam: Record<number, string[]> = Object.fromEntries(
  demoRoster.map((r) => [
    r.teamId,
    r.pairs.map((p) => `${p.players[0].name} / ${p.players[1].name}`),
  ])
);

// Combined pair NTRP per team per line — derived from the roster.
const ratingsByTeam: Record<number, number[]> = Object.fromEntries(
  demoRoster.map((r) => [r.teamId, r.pairs.map((p) => p.combined)])
);

type TieSpec = { round: number; teamA: number; teamB: number };

// Round-robin: every team plays every other team once, across all 8 lines.
const ties: TieSpec[] = [
  { round: 1, teamA: 1, teamB: 2 }, // Red vs Green
  { round: 2, teamA: 1, teamB: 3 }, // Red vs Yellow
  { round: 3, teamA: 2, teamB: 3 }, // Green vs Yellow
];

const UPDATED = "2026-07-23T00:00:00.000Z";

// Demo snapshot: Round 1 (Red vs Green) is underway with all six courts in use
// (Lines 1–6 on Courts 1–6); Line 7 waits for a court. Later rounds stay
// scheduled. Sample live scores keyed by line id so the Court Map has something
// to show. Swap in real Supabase data to go live.
const liveScores: Record<number, [number, number]> = {
  1: [4, 2],
  2: [5, 5],
  3: [3, 6],
  4: [6, 4],
  5: [2, 3],
  6: [7, 6],
};

export const demoMatches: Match[] = ties.flatMap((tie) =>
  demoLines.map((line, i) => {
    const onCourt = tie.round === 1 && line.sort_order <= 6;
    const live = onCourt ? liveScores[line.id] : undefined;
    return {
      id: tie.round * 100 + line.id,
      line_id: line.id,
      team_a_id: tie.teamA,
      team_b_id: tie.teamB,
      pair_a: pairsByTeam[tie.teamA][i],
      pair_b: pairsByTeam[tie.teamB][i],
      rating_a: ratingsByTeam[tie.teamA][i],
      rating_b: ratingsByTeam[tie.teamB][i],
      score_a: live ? live[0] : 0,
      score_b: live ? live[1] : 0,
      status: onCourt ? "in_progress" : "scheduled",
      court: onCourt ? String(line.sort_order) : null,
      round: tie.round,
      updated_at: UPDATED,
    } satisfies Match;
  })
);

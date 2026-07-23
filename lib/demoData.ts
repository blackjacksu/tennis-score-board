// Demo dataset used when Supabase is not configured with real credentials.
// Lets you preview the scoreboard layout with no database.
// 3 teams x 8 lines x 2 players/pair = 48 players; 3 ties = 24 matches.
import type { Line, Match, Team } from "./types";

export const demoTeams: Team[] = [
  { id: 1, name: "Team A", name_zh: "A 隊", color: "#ef4444" },
  { id: 2, name: "Team B", name_zh: "B 隊", color: "#3b82f6" },
  { id: 3, name: "Team C", name_zh: "C 隊", color: "#22c55e" },
];

export const demoLines: Line[] = [
  { id: 1, label: "3.0 - 1", ntrp: "3.0", sort_order: 1 },
  { id: 2, label: "3.0 - 2", ntrp: "3.0", sort_order: 2 },
  { id: 3, label: "3.5 - 1", ntrp: "3.5", sort_order: 3 },
  { id: 4, label: "3.5 - 2", ntrp: "3.5", sort_order: 4 },
  { id: 5, label: "4.0 - 1", ntrp: "4.0", sort_order: 5 },
  { id: 6, label: "4.0 - 2", ntrp: "4.0", sort_order: 6 },
  { id: 7, label: "4.5 - 1", ntrp: "4.5", sort_order: 7 },
  { id: 8, label: "4.5 - 2", ntrp: "4.5", sort_order: 8 },
];

// Each team fields one doubles pair per line (2 players each = 16 players/team).
// The same pair represents that team across every tie it plays. 48 players total.
const pairsByTeam: Record<number, string[]> = {
  1: [
    "Chen / Lin",
    "Wang / Wu",
    "Chang / Liu",
    "Tsai / Yang",
    "Huang / Hsu",
    "Kuo / Ho",
    "Cheng / Chou",
    "Lai / Shen",
  ],
  2: [
    "Smith / Jones",
    "Brown / Davis",
    "Miller / Wilson",
    "Moore / Taylor",
    "Anderson / Thomas",
    "Jackson / White",
    "Harris / Martin",
    "Thompson / Garcia",
  ],
  3: [
    "Kim / Park",
    "Lee / Choi",
    "Jung / Kang",
    "Cho / Yoon",
    "Han / Oh",
    "Seo / Shin",
    "Kwon / Hwang",
    "Song / Bae",
  ],
};

type TieSpec = {
  round: number;
  teamA: number;
  teamB: number;
  // per-line result: [scoreA, scoreB, status, court]
  lines: [number, number, Match["status"], string | null][];
};

const ties: TieSpec[] = [
  {
    round: 1,
    teamA: 1,
    teamB: 2,
    lines: [
      [6, 4, "completed", "1"],
      [3, 6, "completed", "2"],
      [7, 5, "completed", "3"],
      [4, 3, "in_progress", "4"],
      [2, 5, "in_progress", "5"],
      [0, 0, "scheduled", "6"],
      [0, 0, "scheduled", "7"],
      [0, 0, "scheduled", "8"],
    ],
  },
  {
    round: 2,
    teamA: 1,
    teamB: 3,
    lines: [
      [6, 2, "completed", "1"],
      [5, 7, "completed", "2"],
      [3, 4, "in_progress", "3"],
      [6, 6, "in_progress", "4"],
      [0, 0, "scheduled", "5"],
      [0, 0, "scheduled", "6"],
      [0, 0, "scheduled", "7"],
      [0, 0, "scheduled", "8"],
    ],
  },
  {
    round: 3,
    teamA: 2,
    teamB: 3,
    lines: [
      [6, 3, "completed", "1"],
      [1, 2, "in_progress", "2"],
      [0, 0, "scheduled", null],
      [0, 0, "scheduled", null],
      [0, 0, "scheduled", null],
      [0, 0, "scheduled", null],
      [0, 0, "scheduled", null],
      [0, 0, "scheduled", null],
    ],
  },
];

const UPDATED = "2026-07-22T20:00:00.000Z";

export const demoMatches: Match[] = ties.flatMap((tie) =>
  demoLines.map((line, i) => {
    const [scoreA, scoreB, status, court] = tie.lines[i];
    return {
      id: tie.round * 100 + line.id,
      line_id: line.id,
      team_a_id: tie.teamA,
      team_b_id: tie.teamB,
      pair_a: pairsByTeam[tie.teamA][i],
      pair_b: pairsByTeam[tie.teamB][i],
      score_a: scoreA,
      score_b: scoreB,
      status,
      court,
      round: tie.round,
      updated_at: UPDATED,
    } satisfies Match;
  })
);

// Demo dataset used when Supabase is not configured with real credentials.
// Lets you preview the scoreboard layout with no database.
//
// 2026 TAA Tennis Event roster (from the registration sheet):
//   49 sign-ups − 2 dropouts (Jady Tsao, Dylon Lo) = 47 players.
//   3 teams (Red / Green / Yellow) × 8 lines = 24 doubles pairs,
//   round-robin ties (Red-Green, Red-Yellow, Green-Yellow) => 24 matches.
//   Team combined-NTRP totals: Red 52.5 · Green 52.0 · Yellow 52.0 (balanced).
//   24 pairs need 48 slots but there are 47 players, so ONE player doubles up:
//   Willy Su (蘇亭瑋) plays Red's Line 1 AND Line 3 (≈4 matches instead of 2).
//   吳杏玫 seeded at NTRP 2.5 (no rating on the form); 鄧之彬 at 4.0 as registered.
import type { Line, Match, Team } from "./types";

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
  { id: 3, label: "Line 3", ntrp: "7.0–7.5", sort_order: 3 },
  { id: 4, label: "Line 4", ntrp: "6.5–7.0", sort_order: 4 },
  { id: 5, label: "Line 5", ntrp: "6.5", sort_order: 5 },
  { id: 6, label: "Line 6", ntrp: "6.0", sort_order: 6 },
  { id: 7, label: "Line 7", ntrp: "5.0–5.5", sort_order: 7 },
  { id: 8, label: "Line 8", ntrp: "3.0–4.5", sort_order: 8 },
];

// One doubles pair per team per line (index 0 = Line 1 ... index 7 = Line 8).
// Willy Su appears on Red at Line 1 and Line 3 — the double-duty slot.
const pairsByTeam: Record<number, string[]> = {
  1: [
    "Richard Lin / Willy Su",       // 4.5 + 4.0 = 8.5
    "Kevin Chiang / Yi-Chih Wang",  // 4.0 + 4.0 = 8.0
    "Willy Su / Mu-Ting Chien",     // 4.0 + 3.5 = 7.5  (Willy again)
    "Wendy Wang / 楊之安",           // 3.0 + 3.5 = 6.5
    "Derrick Chueh / Tim Chen",     // 3.5 + 3.0 = 6.5
    "Chris Lin / Joshua Lee",       // 3.0 + 3.0 = 6.0
    "Andy Chen / Avery Hsieh",      // 2.5 + 2.5 = 5.0
    "Julie Hsieh / Jerry Chiu",     // 2.5 + 2.0 = 4.5
  ],
  2: [
    "Andrew Liao / Fred Lin",       // 4.5 + 4.5 = 9.0
    "Hung-Ying Lin / Vincent Tseng",// 4.0 + 4.0 = 8.0
    "Theo Pai / Christine Lin",     // 3.5 + 3.5 = 7.0
    "Peichun Su / Alice Liu",       // 3.5 + 3.5 = 7.0
    "Shih-Yen Pan / Janice Chen",   // 3.5 + 3.0 = 6.5
    "Daniel Tiedemann / Chih-Yu Lee",// 3.0 + 3.0 = 6.0
    "Andy Lu / Zane Shao",          // 3.0 + 2.5 = 5.5
    "Margot Lai / Grace Shih",      // 1.5 + 1.5 = 3.0
  ],
  3: [
    "Ching-Yen Shih / Yu Cheng",    // 4.0 + 4.0 = 8.0
    "鄧之彬 / Ronald Feng",          // 4.0 + 4.0 = 8.0
    "Nate Raughley / Ramon Mangaser",// 3.5 + 3.5 = 7.0
    "Thomas Yan / Andy Y.",         // 3.5 + 3.5 = 7.0
    "Ben Chen / Tony Peng",         // 3.5 + 3.0 = 6.5
    "Faye Chang / David Fang",      // 3.0 + 3.0 = 6.0
    "Martin Hsieh / Cody",          // 2.5 + 2.5 = 5.0
    "吳杏玫 / 李佩安",               // 2.5 + 2.0 = 4.5
  ],
};

type TieSpec = { round: number; teamA: number; teamB: number };

// Round-robin: every team plays every other team once, across all 8 lines.
const ties: TieSpec[] = [
  { round: 1, teamA: 1, teamB: 2 }, // Red vs Green
  { round: 2, teamA: 1, teamB: 3 }, // Red vs Yellow
  { round: 3, teamA: 2, teamB: 3 }, // Green vs Yellow
];

const UPDATED = "2026-07-23T00:00:00.000Z";

// All matches start scheduled at 0–0 — scores get reported live during the event.
export const demoMatches: Match[] = ties.flatMap((tie) =>
  demoLines.map((line, i) => ({
    id: tie.round * 100 + line.id,
    line_id: line.id,
    team_a_id: tie.teamA,
    team_b_id: tie.teamB,
    pair_a: pairsByTeam[tie.teamA][i],
    pair_b: pairsByTeam[tie.teamB][i],
    score_a: 0,
    score_b: 0,
    status: "scheduled",
    court: null,
    round: tie.round,
    updated_at: UPDATED,
  }) satisfies Match)
);

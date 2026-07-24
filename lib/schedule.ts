// Match timetable for the live-score page.
//
// Rounds run one after another: every round is a tie between two of the three
// teams, so any two rounds share a team and can never be on court at the same
// time. Within a round the lowest-rated lines go on first and the schedule
// works its way up to the top lines, with the six courts filling in parallel —
// so a round of eight matches runs as a wave of six plus a short wave of two.
//
// Pure and dependency-free (no Date, no timezone), so it is trivial to unit
// test and renders identically on the server and in the browser.

import { COURT_NUMBERS } from "./court";
import type { Line, Match } from "./types";

/** Minutes allotted to a single match. */
export const MATCH_MINUTES = 45;

/** How many matches can be on court at once — one per physical court. */
export const PARALLEL_MATCHES = COURT_NUMBERS.length;

/** First serve: 9:00 AM, as minutes after midnight. */
export const FIRST_SERVE_MINUTES = 9 * 60;

export type TimetableSlot = {
  /** 0-based position in the day. */
  index: number;
  round: number;
  /** Minutes after midnight. */
  startMinutes: number;
  endMinutes: number;
  matches: Match[];
};

/** Combined rating of a match, or null when the rows carry no ratings. */
function ratingOf(match: Match): number | null {
  const { rating_a: a, rating_b: b } = match;
  return a != null && b != null ? a + b : null;
}

/**
 * Order matches weakest-first. Prefers the pairs' actual combined ratings;
 * falls back to line order (lines are numbered strongest-first, so reversing
 * them gives the same low-to-high running order) when a row has no ratings,
 * which is the case for real Supabase rows today.
 */
function weakestFirst(lineById: Map<number, Line>) {
  const order = (m: Match) => lineById.get(m.line_id)?.sort_order ?? 0;
  return (x: Match, y: Match) => {
    const rx = ratingOf(x);
    const ry = ratingOf(y);
    if (rx != null && ry != null && rx !== ry) return rx - ry;
    return order(y) - order(x);
  };
}

/**
 * Lay the whole event out on the clock: rounds in order, weakest lines first
 * within each round, six courts at a time, one 45-minute block per wave.
 */
export function buildTimetable(
  matches: Match[],
  lineById: Map<number, Line>
): TimetableSlot[] {
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const list = byRound.get(m.round);
    if (list) list.push(m);
    else byRound.set(m.round, [m]);
  }

  const slots: TimetableSlot[] = [];
  const rounds = [...byRound.keys()].sort((a, b) => a - b);

  for (const round of rounds) {
    const ordered = [...byRound.get(round)!].sort(weakestFirst(lineById));
    for (let i = 0; i < ordered.length; i += PARALLEL_MATCHES) {
      const index = slots.length;
      const startMinutes = FIRST_SERVE_MINUTES + index * MATCH_MINUTES;
      slots.push({
        index,
        round,
        startMinutes,
        endMinutes: startMinutes + MATCH_MINUTES,
        matches: ordered.slice(i, i + PARALLEL_MATCHES),
      });
    }
  }

  return slots;
}

/** Minutes after midnight as a 12-hour clock time, e.g. 810 -> "1:30 PM". */
export function formatClock(totalMinutes: number): string {
  const m = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m % 60).padStart(2, "0")} ${period}`;
}

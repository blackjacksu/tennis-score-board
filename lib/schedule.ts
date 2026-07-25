// Match timetable for the live-score page, the poster, and the admin board.
//
// One team is the "anchor" and stays on court the whole event (Yellow here).
// Each block the anchor fields six lines split across the six courts: its three
// weakest lines against one opponent on courts 1-3, its next three against the
// other opponent on courts 4-6, working up to the top lines block by block.
// The third tie — the one the anchor isn't in — backfills whatever courts the
// anchor isn't using, so nothing sits idle until the very end. Because any two
// ties share a team, this is the only way to run two ties at once without
// putting one pair on two courts, and it finishes the day earlier than running
// the ties one after another.
//
// A fixture that isn't the canonical three-team round robin (e.g. real Supabase
// data mid-migration, or a single round) falls back to sequential blocks.
//
// Pure and dependency-free (no Date, no timezone), so it is trivial to unit
// test and renders identically on the server and in the browser.

// Explicit .ts extension so the print generators, which Node runs directly with
// type stripping, can import this module without a bundler resolving it.
import { COURT_NUMBERS } from "./court.ts";
import type { Line, Match } from "./types";

/** Minutes allotted to a single match. */
export const MATCH_MINUTES = 40;

/** How many matches can be on court at once — one per physical court. */
export const PARALLEL_MATCHES = COURT_NUMBERS.length;

/** First serve: 9:15 AM, as minutes after midnight. */
export const FIRST_SERVE_MINUTES = 9 * 60 + 15;

/**
 * Team kept on court throughout — Yellow (team id 3). Its two ties run in
 * parallel across the six courts every block. Override via buildTimetable's
 * options; a fixture the anchor isn't in falls back to sequential blocks.
 */
export const ANCHOR_TEAM_ID = 3;

/** A match placed on a specific court within a block. */
export type ScheduledMatch = { match: Match; court: number };

export type TimetableSlot = {
  /** 0-based position in the day. */
  index: number;
  /** Minutes after midnight. */
  startMinutes: number;
  endMinutes: number;
  matches: ScheduledMatch[];
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

/** The two pairs a match occupies, so we never double-book one in a block. */
function pairKeys(m: Match): [string, string] {
  return [`${m.team_a_id}-${m.line_id}`, `${m.team_b_id}-${m.line_id}`];
}

type Tie = { round: number; teams: number[]; matches: Match[] };

/**
 * The team that anchors the courts: in the canonical three-team round robin it
 * is the one team absent from the earliest tie, so it then plays the remaining
 * two ties back to back and can stay on court the whole event. Derived from the
 * fixture — not a fixed id — so the schedule holds up whatever ids the database
 * assigned the teams (a re-seed can move them off 1/2/3). Returns null for
 * anything that isn't three two-team ties, leaving buildTimetable to fall back.
 */
function deriveAnchorTeamId(ties: Tie[]): number | null {
  if (ties.length !== 3 || !ties.every((t) => t.teams.length === 2)) return null;
  const firstTie = new Set(ties[0].teams); // ties are sorted by round
  const everyTeam = [...new Set(ties.flatMap((t) => t.teams))];
  const absentFromFirst = everyTeam.filter((id) => !firstTie.has(id));
  return absentFromFirst.length === 1 ? absentFromFirst[0] : null;
}

function groupTies(matches: Match[]): Tie[] {
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const list = byRound.get(m.round);
    if (list) list.push(m);
    else byRound.set(m.round, [m]);
  }
  return [...byRound.entries()]
    .map(([round, ms]) => ({
      round,
      teams: [...new Set(ms.flatMap((m) => [m.team_a_id, m.team_b_id]))],
      matches: ms,
    }))
    .sort((a, b) => a.round - b.round);
}

function makeSlot(index: number, block: Match[]): TimetableSlot {
  const startMinutes = FIRST_SERVE_MINUTES + index * MATCH_MINUTES;
  return {
    index,
    startMinutes,
    endMinutes: startMinutes + MATCH_MINUTES,
    matches: block.map((match, i) => ({ match, court: COURT_NUMBERS[i] })),
  };
}

/**
 * Lay the whole event out on the clock. Uses the anchor schedule for the
 * canonical three-team round robin, and sequential blocks otherwise.
 */
export function buildTimetable(
  matches: Match[],
  lineById: Map<number, Line>,
  opts: { anchorTeamId?: number } = {}
): TimetableSlot[] {
  if (matches.length === 0) return [];

  const ties = groupTies(matches);
  const anchorId =
    opts.anchorTeamId ?? deriveAnchorTeamId(ties) ?? ANCHOR_TEAM_ID;
  const anchorTies = ties.filter(
    (t) => t.teams.length === 2 && t.teams.includes(anchorId)
  );
  const otherTies = ties.filter((t) => !t.teams.includes(anchorId));

  const canAnchor =
    ties.length === 3 &&
    anchorTies.length === 2 &&
    otherTies.length === 1 &&
    ties.every((t) => t.teams.length === 2);

  if (!canAnchor) return sequentialTimetable(matches, lineById);

  const cmp = weakestFirst(lineById);
  // Track A is the anchor's earlier-round tie (courts 1-3), Track B the later
  // one (courts 4-6); the remaining tie backfills the rest of each block.
  const trackA = [...anchorTies[0].matches].sort(cmp);
  const trackB = [...anchorTies[1].matches].sort(cmp);
  const backfill = [...otherTies[0].matches].sort(cmp);
  const half = Math.floor(PARALLEL_MATCHES / 2);

  const slots: TimetableSlot[] = [];
  while (trackA.length || trackB.length || backfill.length) {
    const used = new Set<string>();
    const block: Match[] = [];

    // Anchor's two ties take the six courts three-and-three; the third tie
    // backfills whatever the anchor left free this block.
    takeN(trackA, half, block, used);
    takeN(trackB, half, block, used);
    takeN(backfill, PARALLEL_MATCHES - block.length, block, used);

    if (block.length === 0) break; // all remaining conflict — shouldn't happen
    slots.push(makeSlot(slots.length, block));
  }

  return slots;
}

// ─────────────────────────── Manual schedule ───────────────────────────
// The anchor algorithm packs the day tightly, but the organisers sometimes ask
// for specific matches at specific times. A manual schedule overrides the
// algorithm for the canonical fixture; anything else still falls back to it.

/** One match in a manual schedule, keyed by round + the line's sort order —
 *  stable identifiers that survive a roster change (the pairs can move, the
 *  round/line grid does not). */
export type ScheduleKey = { round: number; sortOrder: number };
const key = (round: number, sortOrder: number): ScheduleKey => ({ round, sortOrder });

/**
 * Hand-set running order for the 2026 event. Each inner array is one block, in
 * court order (court 1 … N). Organiser requests baked in: the top Green-Yellow
 * matches (lines 1,2,3,5) all play the 10:35 block, and Red-Green closes the day.
 * Every match still plays exactly once and no pair is ever on two courts at once.
 */
export const EVENT_SCHEDULE: ScheduleKey[][] = [
  // Block 0 — Red vs Yellow
  [key(2, 4), key(2, 6), key(2, 7), key(2, 8), key(2, 1), key(2, 2)],
  // Block 1 — Red vs Yellow (3,5) + Green vs Yellow (4,6,7,8)
  [key(2, 3), key(2, 5), key(3, 4), key(3, 6), key(3, 7), key(3, 8)],
  // Block 2 — Green vs Yellow (1,2,3,5) + Red vs Green (4,6)
  [key(3, 1), key(3, 2), key(3, 3), key(3, 5), key(1, 4), key(1, 6)],
  // Block 3 — Red vs Green (1,2,3,5,7,8)
  [key(1, 1), key(1, 2), key(1, 3), key(1, 5), key(1, 7), key(1, 8)],
];

/**
 * Build slots from a manual schedule. Returns null (so the caller falls back to
 * the algorithm) unless the schedule references every match exactly once — which
 * keeps a non-canonical fixture, or a stale schedule, from silently dropping
 * matches.
 */
export function applyManualSchedule(
  matches: Match[],
  lineById: Map<number, Line>,
  schedule: ScheduleKey[][]
): TimetableSlot[] | null {
  const byKey = new Map<string, Match>();
  for (const m of matches) {
    const so = lineById.get(m.line_id)?.sort_order;
    if (so == null) return null;
    byKey.set(`${m.round}-${so}`, m);
  }
  const flat = schedule.flat();
  if (flat.length !== matches.length) return null; // must place them all, once
  const seen = new Set<string>();
  for (const k of flat) {
    const id = `${k.round}-${k.sortOrder}`;
    if (!byKey.has(id) || seen.has(id)) return null;
    seen.add(id);
  }
  return schedule.map((block, index) =>
    makeSlot(
      index,
      block.map((k) => byKey.get(`${k.round}-${k.sortOrder}`)!)
    )
  );
}

/**
 * The schedule the app, admin board and poster all use: the hand-set
 * EVENT_SCHEDULE for the real fixture, otherwise the anchor algorithm.
 */
export function eventTimetable(
  matches: Match[],
  lineById: Map<number, Line>
): TimetableSlot[] {
  return (
    applyManualSchedule(matches, lineById, EVENT_SCHEDULE) ??
    buildTimetable(matches, lineById)
  );
}

/** Move up to `limit` conflict-free matches from `stream` into `block`. */
function takeN(
  stream: Match[],
  limit: number,
  block: Match[],
  used: Set<string>
): void {
  let taken = 0;
  for (
    let i = 0;
    i < stream.length && taken < limit && block.length < PARALLEL_MATCHES;

  ) {
    const m = stream[i];
    if (pairKeys(m).some((k) => used.has(k))) {
      i++;
      continue;
    }
    pairKeys(m).forEach((k) => used.add(k));
    block.push(m);
    stream.splice(i, 1);
    taken++;
  }
}

/**
 * Fallback for fixtures that aren't the three-team round robin: rounds in
 * order, weakest lines first, six courts at a time.
 */
function sequentialTimetable(
  matches: Match[],
  lineById: Map<number, Line>
): TimetableSlot[] {
  const cmp = weakestFirst(lineById);
  const slots: TimetableSlot[] = [];
  for (const tie of groupTies(matches)) {
    const ordered = [...tie.matches].sort(cmp);
    for (let i = 0; i < ordered.length; i += PARALLEL_MATCHES) {
      slots.push(makeSlot(slots.length, ordered.slice(i, i + PARALLEL_MATCHES)));
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

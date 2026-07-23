// Score validation for a standard single tennis set ("6-game set").
//
// A set is won by the first side to reach 6 games with a 2-game margin, or by
// 7-5, or by 7-6 (tiebreak). The most any side can reach is 7.
//
// classifySetScore inspects a games pair (a, b) and reports whether it is a
// completed set ("final"), a legal score still in play ("in_progress"), or
// illegal ("invalid") — e.g. out of range (10-4), negative (11 to -3), or
// unreachable (7-2). Pure and dependency-free, so it is trivial to unit test
// and to reuse inside the admin score action.

export type SetState = "final" | "in_progress" | "invalid";

export interface SetScoreResult {
  state: SetState;
  valid: boolean; // false only when state === "invalid"
  reason?: string; // present only when invalid
}

/** Highest games total either side can reach in a 6-game set (7-5 or 7-6). */
export const MAX_SET_GAMES = 7;

export function classifySetScore(a: number, b: number): SetScoreResult {
  const invalid = (reason: string): SetScoreResult => ({
    state: "invalid",
    valid: false,
    reason,
  });

  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    return invalid("games must be whole numbers");
  }
  if (a < 0 || b < 0) {
    return invalid("games cannot be negative");
  }
  if (a > MAX_SET_GAMES || b > MAX_SET_GAMES) {
    return invalid(`games cannot exceed ${MAX_SET_GAMES} in a 6-game set`);
  }

  const hi = Math.max(a, b);
  const lo = Math.min(a, b);

  // Completed set: 6-0..6-4, or 7-5 / 7-6.
  if (hi === 6 && lo <= 4) return { state: "final", valid: true };
  if (hi === 7 && (lo === 5 || lo === 6)) return { state: "final", valid: true };

  // A 7 in any other shape (7-0..7-4, or 7-7) is unreachable.
  if (hi === 7) return invalid("a 7 is only legal as 7-5 or 7-6");

  // Everything else in range is a legal score still in play:
  // 0-0..5-5, 6-5, and 6-6 (heading to a tiebreak).
  return { state: "in_progress", valid: true };
}

/** Is this a legal score at all (whether the set is finished or still in play)? */
export function isValidSetScore(a: number, b: number): boolean {
  return classifySetScore(a, b).valid;
}

/** Is this a legal *completed* set score (safe to mark the match Final)? */
export function isCompletedSetScore(a: number, b: number): boolean {
  return classifySetScore(a, b).state === "final";
}

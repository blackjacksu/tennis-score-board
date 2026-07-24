// Court assignment helpers, shared by the admin court bar and the court map.
//
// The venue has six physical courts in one row. A match's `court` column is
// free-form text in Postgres, so everything that reads or writes it goes
// through here to keep the admin input and the court map in agreement.

/** Physical courts at the venue, numbered left to right. */
export const COURT_NUMBERS = [1, 2, 3, 4, 5, 6];

export const MIN_COURT = COURT_NUMBERS[0];
export const MAX_COURT = COURT_NUMBERS[COURT_NUMBERS.length - 1];

export type CourtParseResult =
  | { ok: true; court: string | null }
  | { ok: false; reason: string };

/**
 * Parse what an admin typed into a storable court value.
 * An empty string clears the assignment; 1–6 assigns that court.
 */
export function parseCourtInput(raw: string): CourtParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, court: null };
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, reason: `court must be a number ${MIN_COURT}–${MAX_COURT}` };
  }
  const n = Number(trimmed);
  if (n < MIN_COURT || n > MAX_COURT) {
    return { ok: false, reason: `court must be between ${MIN_COURT} and ${MAX_COURT}` };
  }
  return { ok: true, court: String(n) };
}

/**
 * Lowest-numbered court nobody is using, or null when all six are busy.
 * Used to put a match on court the moment it starts, so it appears on the
 * court map without the admin having to type a number first.
 */
export function firstFreeCourt(taken: Iterable<number>): number | null {
  const busy = new Set(taken);
  return COURT_NUMBERS.find((n) => !busy.has(n)) ?? null;
}

/**
 * Read a stored court value as a court number, or null when it is unset or
 * doesn't name one of the physical courts (so the map can ignore it).
 */
export function courtNumber(court: string | null | undefined): number | null {
  if (court == null) return null;
  const trimmed = court.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return COURT_NUMBERS.includes(n) ? n : null;
}

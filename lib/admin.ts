// Shared admin constants. Plain module (no "use server"/"use client") so both
// the server actions and the client board can import it — a "use server" file
// may only export async functions, so sentinels like this can't live there.

/** resetAllScores returns this as `error` when the re-entered PIN is wrong. */
export const WRONG_PIN = "WRONG_PIN";

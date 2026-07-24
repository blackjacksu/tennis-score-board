"use server";

import { isAdmin, isValidPin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isSupabaseConfigured } from "@/lib/supabase";
import { classifySetScore } from "@/lib/setScore";
import { parseCourtInput } from "@/lib/court";
import { WRONG_PIN } from "@/lib/admin";
import type { MatchStatus } from "@/lib/types";

export async function updateScore(
  matchId: number,
  scoreA: number,
  scoreB: number,
  status: MatchStatus,
  /**
   * Court to write alongside the score. Omit to leave the court alone; pass a
   * value to set it in the same write — that's how starting a match puts it on
   * a court and onto the viewer's court map in one round trip.
   */
  rawCourt?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) {
    return { ok: false, error: "Unauthorized" };
  }
  // Reject scores that aren't legal for a 6-game set (out of range, negative,
  // non-integer, or unreachable like 7-2). See lib/setScore.ts.
  const check = classifySetScore(scoreA, scoreB);
  if (!check.valid) {
    return { ok: false, error: check.reason ?? "Invalid score" };
  }
  // Only allow marking a match Final on a completed set score.
  if (status === "completed" && check.state !== "final") {
    return {
      ok: false,
      error: "Not a completed set — win 6-0…6-4, 7-5, or 7-6",
    };
  }

  let court: string | null | undefined;
  if (rawCourt !== undefined) {
    const parsed = parseCourtInput(rawCourt);
    if (!parsed.ok) return { ok: false, error: parsed.reason };
    court = parsed.court;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("matches")
    .update({
      score_a: scoreA,
      score_b: scoreB,
      status,
      ...(court !== undefined ? { court } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Wipe every match back to the start: 0-0, not started, off court. Guarded by
 * the admin cookie AND a fresh PIN entry, since it throws away all reported
 * scores. Returns WRONG_PIN when the re-entered PIN doesn't match, so the
 * caller can reuse the existing "wrong PIN" copy.
 *
 * When Supabase isn't really configured (demo mode) there's nothing to write,
 * so it just confirms the PIN and lets the client clear its local state.
 */
export async function resetAllScores(
  pin: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) {
    return { ok: false, error: "Unauthorized" };
  }
  if (!isValidPin(pin)) {
    return { ok: false, error: WRONG_PIN };
  }
  if (!isSupabaseConfigured) {
    return { ok: true }; // demo mode — the board resets its own local rows
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("matches")
    .update({
      score_a: 0,
      score_b: 0,
      status: "scheduled",
      court: null,
      updated_at: new Date().toISOString(),
    })
    .gt("id", 0); // every match (ids are positive)

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Assign (or clear) the physical court a match is played on. The viewer's
 * court map reads the same column, so a change here shows up there over the
 * realtime channel without anyone reloading.
 */
export async function updateCourt(
  matchId: number,
  rawCourt: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) {
    return { ok: false, error: "Unauthorized" };
  }
  const parsed = parseCourtInput(rawCourt);
  if (!parsed.ok) {
    return { ok: false, error: parsed.reason };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("matches")
    .update({
      court: parsed.court,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

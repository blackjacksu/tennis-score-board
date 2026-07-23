"use server";

import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { classifySetScore } from "@/lib/setScore";
import type { MatchStatus } from "@/lib/types";

export async function updateScore(
  matchId: number,
  scoreA: number,
  scoreB: number,
  status: MatchStatus
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

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("matches")
    .update({
      score_a: scoreA,
      score_b: scoreB,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

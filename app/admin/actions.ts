"use server";

import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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
  if (
    !Number.isInteger(scoreA) ||
    !Number.isInteger(scoreB) ||
    scoreA < 0 ||
    scoreB < 0 ||
    scoreA > 99 ||
    scoreB > 99
  ) {
    return { ok: false, error: "Invalid score" };
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

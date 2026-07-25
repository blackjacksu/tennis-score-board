"use client";

import { courtNumber } from "@/lib/court";
import { useI18n } from "@/lib/i18n";
import type { Line, Match, Team } from "@/lib/types";

const statusStyles: Record<Match["status"], string> = {
  scheduled: "bg-slate-100 text-slate-500",
  in_progress: "bg-red-100 text-red-600",
  completed: "bg-emerald-100 text-emerald-700",
};

export default function MatchCard({
  match,
  teamA,
  teamB,
  line,
  plannedCourt = null,
}: {
  match: Match;
  teamA: Team | undefined;
  teamB: Team | undefined;
  line: Line | undefined;
  /** Court from the timetable, shown (muted) before the match is on court. */
  plannedCourt?: number | null;
}) {
  const { t, teamName } = useI18n();

  const statusLabel = {
    scheduled: t("scheduled"),
    in_progress: t("inProgress"),
    completed: t("completed"),
  }[match.status];

  const started = match.status !== "scheduled";
  const aWon = match.status === "completed" && match.score_a > match.score_b;
  const bWon = match.status === "completed" && match.score_b > match.score_a;

  // A live match owns its court (dark bar). A not-yet-started match shows its
  // planned court muted, so the time-ordered board still reads court-by-court.
  const liveCourt = courtNumber(match.court);
  const court = liveCourt ?? plannedCourt;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Top bar: which court this match is on, at a glance. */}
      <div
        className={`flex items-center justify-between gap-2 border-b px-3 py-1.5 ${
          liveCourt != null
            ? "border-slate-800 bg-slate-800 text-white"
            : "border-slate-200 bg-slate-50 text-slate-400"
        }`}
      >
        <span className="flex items-baseline gap-1.5">
          {court != null ? (
            <>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                {t("court")}
              </span>
              <span className="text-lg font-black leading-none tabular-nums">
                {court}
              </span>
            </>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-wide">
              {t("courtTbd")}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-xs">
          <span
            className={`font-semibold ${court != null ? "text-white/70" : "text-slate-400"}`}
          >
            {line?.label ?? "—"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${statusStyles[match.status]}`}
          >
            {match.status === "in_progress" && (
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 align-middle" />
            )}
            {statusLabel}
          </span>
        </span>
      </div>

      <div className="p-3">
        <Row
          color={teamA?.color}
          team={teamName(teamA)}
          pair={match.pair_a ?? t("tbd")}
          score={started ? match.score_a : null}
          winner={aWon}
        />
        <div className="my-1.5 border-t border-slate-100" />
        <Row
          color={teamB?.color}
          team={teamName(teamB)}
          pair={match.pair_b ?? t("tbd")}
          score={started ? match.score_b : null}
          winner={bWon}
        />
      </div>
    </div>
  );
}

function Row({
  color,
  team,
  pair,
  score,
  winner,
}: {
  color: string | undefined;
  team: string;
  pair: string;
  score: number | null;
  winner: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color ?? "#94a3b8" }}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm ${winner ? "font-bold" : "font-medium"}`}
        >
          {pair}
        </div>
        <div className="truncate text-xs text-slate-400">{team}</div>
      </div>
      <div
        className={`w-8 text-right text-2xl tabular-nums ${
          winner ? "font-bold text-slate-900" : "font-semibold text-slate-600"
        }`}
      >
        {score ?? "–"}
      </div>
    </div>
  );
}

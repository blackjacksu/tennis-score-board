"use client";

import { useI18n } from "@/lib/i18n";
import type { Match, Team } from "@/lib/types";

type Row = {
  team: Team;
  matchesWon: number;
  gamesWon: number;
};

// Rank by matches won, then games won as the first tiebreaker.
// If two teams are still level on BOTH, they play a one-point match to decide.
function rank(rows: Row[]): Row[] {
  return [...rows].sort(
    (a, b) => b.matchesWon - a.matchesWon || b.gamesWon - a.gamesWon
  );
}

function tiedWith(a: Row, b: Row): boolean {
  return a.matchesWon === b.matchesWon && a.gamesWon === b.gamesWon;
}

export default function ResultsSidebar({
  teams,
  matches,
}: {
  teams: Team[];
  matches: Match[];
}) {
  const { t, teamName } = useI18n();

  const rows: Row[] = teams.map((team) => {
    let matchesWon = 0;
    let gamesWon = 0;
    for (const m of matches) {
      const isA = m.team_a_id === team.id;
      const isB = m.team_b_id === team.id;
      if (!isA && !isB) continue;
      const own = isA ? m.score_a : m.score_b;
      const opp = isA ? m.score_b : m.score_a;
      if (m.status !== "scheduled") gamesWon += own;
      if (m.status === "completed" && own > opp) matchesWon += 1;
    }
    return { team, matchesWon, gamesWon };
  });

  const ranked = rank(rows);
  const total = matches.length;
  const completed = matches.filter((m) => m.status === "completed").length;
  const allDone = total > 0 && completed === total;

  // Teams sharing the top spot on BOTH matches and games. Only call for a
  // one-point match once every match is final — a tie mid-tournament is normal.
  const leader = ranked[0];
  const tiedLeaders = leader
    ? ranked.filter((r) => tiedWith(r, leader))
    : [];
  const needsOnePoint = allDone && tiedLeaders.length > 1;
  const champion = allDone && !needsOnePoint ? leader : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {t("finalResult")}
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            allDone
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          {allDone ? t("completed") : t("live")}
        </span>
      </div>

      <ol className="space-y-2">
        {ranked.map((row, i) => {
          const isChamp = champion?.team.id === row.team.id;
          const isTiedLeader = needsOnePoint && tiedLeaders.includes(row);
          return (
            <li
              key={row.team.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                isChamp
                  ? "border-amber-300 bg-amber-50"
                  : isTiedLeader
                    ? "border-slate-300 bg-slate-50"
                    : "border-slate-100"
              }`}
              style={{ borderLeftWidth: 4, borderLeftColor: row.team.color }}
            >
              <span className="w-5 shrink-0 text-center text-sm font-bold text-slate-400">
                {isChamp ? "🏆" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">
                  {teamName(row.team)}
                </div>
                <div className="text-xs text-slate-400">
                  {t("gamesWon")} {row.gamesWon}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold leading-none tabular-nums">
                  {row.matchesWon}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t("matchesWon")}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {needsOnePoint && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="font-bold">🎾 {t("onePointTie")}</div>
          <div className="mt-1">
            {t("onePointNeeded")}{" "}
            {tiedLeaders.map((r) => teamName(r.team)).join(" · ")}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-1 text-center">
        <p className="text-[11px] text-slate-400">
          {t("matchesFinal", { n: completed, total })}
        </p>
        <p className="text-[10px] text-slate-400">{t("tiebreakRule")}</p>
      </div>
    </section>
  );
}

"use client";

import { useI18n } from "@/lib/i18n";
import type { Match, Team } from "@/lib/types";

export default function Standings({
  teams,
  matches,
}: {
  teams: Team[];
  matches: Match[];
}) {
  const { t, teamName } = useI18n();

  const rows = teams
    .map((team) => {
      let wins = 0;
      let games = 0;
      for (const m of matches) {
        const isA = m.team_a_id === team.id;
        const isB = m.team_b_id === team.id;
        if (!isA && !isB) continue;
        const own = isA ? m.score_a : m.score_b;
        const opp = isA ? m.score_b : m.score_a;
        if (m.status !== "scheduled") games += own;
        if (m.status === "completed" && own > opp) wins += 1;
      }
      return { team, wins, games };
    })
    .sort((a, b) => b.wins - a.wins || b.games - a.games);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
        {t("standings")}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {rows.map(({ team, wins, games }, i) => (
          <div
            key={team.id}
            className="rounded-lg border border-slate-100 p-3 text-center"
            style={{ borderTopWidth: 3, borderTopColor: team.color }}
          >
            <div className="truncate text-sm font-bold">
              {i === 0 && wins > 0 ? "🏆 " : ""}
              {teamName(team)}
            </div>
            <div className="mt-1 text-3xl font-bold tabular-nums">{wins}</div>
            <div className="text-xs text-slate-400">
              {t("wins")} · {t("gamesWon")} {games}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

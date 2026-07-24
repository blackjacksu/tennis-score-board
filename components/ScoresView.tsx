"use client";

import { useI18n } from "@/lib/i18n";
import type { Line, Match, Team } from "@/lib/types";
import MatchCard from "./MatchCard";
import ResultsSidebar from "./ResultsSidebar";
import Timetable from "./Timetable";

export default function ScoresView({
  teams,
  matches,
  teamById,
  lineById,
}: {
  teams: Team[];
  matches: Match[];
  teamById: Map<number, Team>;
  lineById: Map<number, Line>;
}) {
  const { t, teamName } = useI18n();

  const rounds = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b
  );

  return (
    <div className="flex flex-col gap-6">
      <ResultsSidebar teams={teams} matches={matches} />
      <Timetable
        matches={matches}
        teamById={teamById}
        lineById={lineById}
      />
      <div className="min-w-0 flex-1 space-y-6">
        {rounds.map((round) => {
          const roundMatches = matches
            .filter((m) => m.round === round)
            .sort(
              (a, b) =>
                (lineById.get(a.line_id)?.sort_order ?? 0) -
                (lineById.get(b.line_id)?.sort_order ?? 0)
            );
          const first = roundMatches[0];
          const tieLabel = first
            ? `${teamName(teamById.get(first.team_a_id))} ${t("vs")} ${teamName(
                teamById.get(first.team_b_id)
              )}`
            : "";

          return (
            <section key={round}>
              <h2 className="mb-2 flex items-baseline gap-2 px-1">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {t("round", { n: round })}
                </span>
                <span className="text-base font-bold">{tieLabel}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {roundMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    teamA={teamById.get(m.team_a_id)}
                    teamB={teamById.get(m.team_b_id)}
                    line={lineById.get(m.line_id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

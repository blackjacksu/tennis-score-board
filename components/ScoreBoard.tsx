"use client";

import { useI18n } from "@/lib/i18n";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { useTournamentData } from "@/lib/useTournamentData";
import MatchCard from "./MatchCard";
import ResultsSidebar from "./ResultsSidebar";

export default function ScoreBoard() {
  const { t, teamName } = useI18n();
  const { teams, matches, teamById, lineById, loading } = useTournamentData();

  if (!isSupabaseConfigured && !isDemoMode) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        {t("notConfigured")}
      </p>
    );
  }
  if (loading) {
    return <p className="p-8 text-center text-slate-400">{t("loading")}</p>;
  }
  if (matches.length === 0) {
    return <p className="p-8 text-center text-slate-400">{t("noMatches")}</p>;
  }

  const rounds = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b
  );

  return (
    <div className="space-y-4">
      {isDemoMode && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">
          Demo data — set real Supabase keys in .env.local to go live
        </p>
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:order-last lg:w-72 lg:shrink-0 lg:sticky lg:top-4">
          <ResultsSidebar teams={teams} matches={matches} />
        </aside>
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
}

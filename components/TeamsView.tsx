"use client";

import { useI18n } from "@/lib/i18n";
import type { Line, Match, Team, TeamRoster } from "@/lib/types";

type ViewPlayer = { name: string; ntrp: number | null; captain: boolean };
type ViewPair = {
  lineLabel: string;
  players: ViewPlayer[];
  combined: number | string | null;
};
type ViewTeam = {
  team: Team;
  captainName: string | null;
  total: number | null;
  pairs: ViewPair[];
};

function fmt(n: number): string {
  return n.toFixed(1);
}

export default function TeamsView({
  teams,
  matches,
  roster,
  lineById,
}: {
  teams: Team[];
  matches: Match[];
  roster: TeamRoster[];
  teamById: Map<number, Team>;
  lineById: Map<number, Line>;
}) {
  const { t, teamName } = useI18n();
  const rosterByTeam = new Map(roster.map((r) => [r.teamId, r]));

  const viewTeams: ViewTeam[] = teams.map((team) => {
    const r = rosterByTeam.get(team.id);

    // Preferred path: rich roster with individual ratings + captain (demo data).
    if (r) {
      const pairs: ViewPair[] = r.pairs.map((p) => ({
        lineLabel: p.lineLabel,
        players: p.players.map((pl) => ({
          name: pl.name,
          ntrp: pl.ntrp,
          captain: pl.name === r.captainName,
        })),
        combined: p.combined,
      }));
      const total = r.pairs.reduce((sum, p) => sum + p.combined, 0);
      return { team, captainName: r.captainName, total, pairs };
    }

    // Fallback for real Supabase data: derive pairs from matches (no captain or
    // individual ratings available).
    const seen = new Set<number>();
    const pairs: ViewPair[] = [];
    const sorted = [...matches].sort(
      (a, b) =>
        (lineById.get(a.line_id)?.sort_order ?? 0) -
        (lineById.get(b.line_id)?.sort_order ?? 0)
    );
    for (const m of sorted) {
      const isA = m.team_a_id === team.id;
      const isB = m.team_b_id === team.id;
      if ((!isA && !isB) || seen.has(m.line_id)) continue;
      seen.add(m.line_id);
      const line = lineById.get(m.line_id);
      const pairStr = (isA ? m.pair_a : m.pair_b) ?? "";
      const rating = (isA ? m.rating_a : m.rating_b) ?? line?.ntrp ?? null;
      pairs.push({
        lineLabel: line?.label ?? "—",
        players: pairStr
          .split(" / ")
          .map((name) => ({ name, ntrp: null, captain: false })),
        combined: rating,
      });
    }
    return { team, captainName: null, total: null, pairs };
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {viewTeams.map((vt) => (
        <section
          key={vt.team.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Team header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundColor: vt.team.color }}
          >
            <div>
              <h2 className="text-base font-bold leading-tight">
                {teamName(vt.team)}
              </h2>
              <p className="text-[11px] font-medium text-white/80">
                {t("playerCount", { n: vt.pairs.length * 2 })}
              </p>
            </div>
            {vt.total != null && (
              <div className="text-right">
                <div className="text-xl font-black leading-none tabular-nums">
                  {fmt(vt.total)}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-white/80">
                  {t("teamNtrp")}
                </div>
              </div>
            )}
          </div>

          {/* Captain */}
          {vt.captainName && (
            <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs">
              <span role="img" aria-label="captain">
                👑
              </span>
              <span className="font-semibold text-slate-500">
                {t("captain")}:
              </span>
              <span className="font-bold text-slate-800">{vt.captainName}</span>
            </div>
          )}

          {/* Doubles pairs, partners shown together */}
          <ul className="divide-y divide-slate-100">
            {vt.pairs.map((pair, i) => (
              <li key={i} className="px-4 py-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {pair.lineLabel}
                  </span>
                  {pair.combined != null && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                      style={{
                        backgroundColor: `${vt.team.color}1a`,
                        color: vt.team.color,
                      }}
                    >
                      {t("rating")}{" "}
                      {typeof pair.combined === "number"
                        ? fmt(pair.combined)
                        : pair.combined}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {pair.players.map((pl, j) => (
                    <span key={j} className="flex items-center gap-1.5">
                      {j > 0 && (
                        <span className="text-xs font-bold text-slate-300">
                          +
                        </span>
                      )}
                      <span className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold text-slate-800">
                          {pl.name}
                        </span>
                        {pl.captain && (
                          <span role="img" aria-label="captain" className="text-[11px]">
                            👑
                          </span>
                        )}
                        {pl.ntrp != null && (
                          <span className="text-xs font-medium tabular-nums text-slate-400">
                            {fmt(pl.ntrp)}
                          </span>
                        )}
                      </span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

"use client";

import { useI18n } from "@/lib/i18n";
import { PARALLEL_MATCHES, eventTimetable, formatClock } from "@/lib/schedule";
import type { Line, Match, Team } from "@/lib/types";

/**
 * When each match goes on court, and on which court. Yellow anchors all six
 * courts, so a block mixes two ties — the row's team-color dots say who's who.
 */
export default function Timetable({
  matches,
  teamById,
  lineById,
}: {
  matches: Match[];
  teamById: Map<number, Team>;
  lineById: Map<number, Line>;
}) {
  const { t, teamName } = useI18n();
  const slots = eventTimetable(matches, lineById);
  if (slots.length === 0) return null;

  const day = t("eventDay");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
        {t("timetable")}
      </h2>

      <ol className="space-y-2">
        {slots.map((slot) => (
          <li
            key={slot.index}
            className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2 sm:flex-row sm:gap-3"
          >
            {/* Time block */}
            <div className="flex shrink-0 items-baseline gap-2 sm:w-32 sm:flex-col sm:items-start sm:gap-0.5">
              <span className="text-base font-black tabular-nums text-slate-900">
                {formatClock(slot.startMinutes)}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {day} · {formatClock(slot.endMinutes)}
              </span>
            </div>

            {/* Matches on court in this block, in court order */}
            <div className="min-w-0 flex-1">
              {slot.matches.length === PARALLEL_MATCHES && (
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("allCourts", { n: PARALLEL_MATCHES })}
                </div>
              )}
              <ul className="space-y-0.5">
                {slot.matches.map(({ match, court }) => (
                  <SlotRow
                    key={match.id}
                    match={match}
                    court={court}
                    teamA={teamById.get(match.team_a_id)}
                    teamB={teamById.get(match.team_b_id)}
                    line={lineById.get(match.line_id)}
                  />
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SlotRow({
  match,
  court,
  teamA,
  teamB,
  line,
}: {
  match: Match;
  court: number;
  teamA: Team | undefined;
  teamB: Team | undefined;
  line: Line | undefined;
}) {
  const { t } = useI18n();

  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="flex w-16 shrink-0 items-baseline gap-1">
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
          {court}
        </span>
        <span className="font-bold text-slate-500">
          {line?.label?.replace(/^Line\s*/, "L") ?? "—"}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <Dot color={teamA?.color} />
        <span className="min-w-0 flex-1 truncate text-slate-700">
          {match.pair_a ?? t("tbd")}
        </span>
        <span className="shrink-0 text-[10px] text-slate-300">{t("vs")}</span>
        <span className="min-w-0 flex-1 truncate text-slate-700">
          {match.pair_b ?? t("tbd")}
        </span>
        <Dot color={teamB?.color} />
      </span>
    </li>
  );
}

function Dot({ color }: { color: string | undefined }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color ?? "#94a3b8" }}
    />
  );
}

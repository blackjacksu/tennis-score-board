"use client";

import { PARALLEL_MATCHES, eventTimetable } from "@/lib/schedule";
import type { Line, Match, Team } from "@/lib/types";
import MatchCard from "./MatchCard";
import ResultsSidebar from "./ResultsSidebar";
import TimeBlockHeader from "./TimeBlockHeader";
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
  // Matches laid out in play order: each time block, in court order — so a
  // spectator reads the board top-to-bottom the way the day actually runs.
  const slots = eventTimetable(matches, lineById);

  return (
    <div className="flex flex-col gap-6">
      <ResultsSidebar teams={teams} matches={matches} />
      <Timetable matches={matches} teamById={teamById} lineById={lineById} />
      <div className="min-w-0 flex-1 space-y-6">
        {slots.map((slot) => (
          <section key={slot.index}>
            <TimeBlockHeader
              startMinutes={slot.startMinutes}
              endMinutes={slot.endMinutes}
              full={slot.matches.length === PARALLEL_MATCHES}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {slot.matches.map(({ match, court }) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  teamA={teamById.get(match.team_a_id)}
                  teamB={teamById.get(match.team_b_id)}
                  line={lineById.get(match.line_id)}
                  plannedCourt={court}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

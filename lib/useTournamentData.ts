"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase, isDemoMode, isSupabaseConfigured } from "./supabase";
import { demoLines, demoMatches, demoRoster, demoTeams } from "./demoData";
import type { Line, Match, Team, TeamRoster } from "./types";

export function useTournamentData() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  // Individual ratings + captains aren't in Supabase yet, so the roster is only
  // populated in demo mode; the Teams view falls back to match pairs otherwise.
  const [roster, setRoster] = useState<TeamRoster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setTeams(demoTeams);
      setLines(demoLines);
      setMatches(demoMatches);
      setRoster(demoRoster);
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    let cancelled = false;

    async function load() {
      const [teamsRes, linesRes, matchesRes] = await Promise.all([
        supabase.from("teams").select("*").order("id"),
        supabase.from("lines").select("*").order("sort_order"),
        supabase.from("matches").select("*").order("id"),
      ]);
      if (cancelled) return;
      setTeams((teamsRes.data as Team[]) ?? []);
      setLines((linesRes.data as Line[]) ?? []);
      setMatches((matchesRes.data as Match[]) ?? []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("matches-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Match;
            setMatches((prev) =>
              prev.some((m) => m.id === row.id) ? prev : [...prev, row]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Match;
            setMatches((prev) =>
              prev.map((m) => (m.id === row.id ? row : m))
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: number };
            setMatches((prev) => prev.filter((m) => m.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const teamById = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );
  const lineById = useMemo(
    () => new Map(lines.map((l) => [l.id, l])),
    [lines]
  );

  return { teams, lines, matches, roster, teamById, lineById, loading };
}

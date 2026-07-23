"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { useTournamentData } from "@/lib/useTournamentData";
import CourtView from "./CourtView";
import ScoresView from "./ScoresView";
import TeamsView from "./TeamsView";

type View = "scores" | "courts" | "roster";

export default function ScoreBoard() {
  const { t } = useI18n();
  const { teams, matches, roster, teamById, lineById, loading } =
    useTournamentData();
  const [view, setView] = useState<View>("scores");

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

  return (
    <div className="space-y-4">
      {isDemoMode && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">
          Demo data — set real Supabase keys in .env.local to go live
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ViewSwitcher view={view} onChange={setView} />
        <div className="min-w-0 flex-1">
          {view === "scores" && (
            <ScoresView
              teams={teams}
              matches={matches}
              teamById={teamById}
              lineById={lineById}
            />
          )}
          {view === "courts" && (
            <CourtView
              teams={teams}
              matches={matches}
              teamById={teamById}
              lineById={lineById}
            />
          )}
          {view === "roster" && (
            <TeamsView
              teams={teams}
              matches={matches}
              roster={roster}
              teamById={teamById}
              lineById={lineById}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Sidebar rail on desktop, segmented control on mobile.
function ViewSwitcher({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  const { t } = useI18n();
  const items: { key: View; label: string; icon: string }[] = [
    { key: "scores", label: t("liveScores"), icon: "📋" },
    { key: "courts", label: t("courtMap"), icon: "🎾" },
    { key: "roster", label: t("roster"), icon: "👥" },
  ];

  return (
    <nav className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:sticky sm:top-4 sm:w-40 sm:flex-col">
      {items.map((item) => {
        const active = view === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            aria-pressed={active}
            className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:flex-none ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

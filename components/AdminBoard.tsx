"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { updateScore } from "@/app/admin/actions";
import Header from "@/components/Header";
import { useI18n } from "@/lib/i18n";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { MAX_SET_GAMES } from "@/lib/setScore";
import type { Line, Match, MatchStatus, Team } from "@/lib/types";
import { useTournamentData } from "@/lib/useTournamentData";

export default function AdminBoard() {
  const { t, teamName } = useI18n();
  const { matches, teamById, lineById, loading } = useTournamentData();

  const rounds = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
      <Header subtitle={t("scoreReporting")} />
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-blue-600 underline"
      >
        → {t("viewerBoard")}
      </Link>

      {!isSupabaseConfigured && !isDemoMode && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          {t("notConfigured")}
        </p>
      )}
      {isDemoMode && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700">
          Demo mode — score changes here are local only and won&apos;t be saved
        </p>
      )}
      {isSupabaseConfigured && loading && (
        <p className="p-8 text-center text-slate-400">{t("loading")}</p>
      )}

      <div className="space-y-6">
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
                  <AdminMatchCard
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
    </main>
  );
}

function AdminMatchCard({
  match,
  teamA,
  teamB,
  line,
}: {
  match: Match;
  teamA: Team | undefined;
  teamB: Team | undefined;
  line: Line | undefined;
}) {
  const { t, teamName } = useI18n();
  const [pending, startTransition] = useTransition();
  const [scoreA, setScoreA] = useState(match.score_a);
  const [scoreB, setScoreB] = useState(match.score_b);

  useEffect(() => {
    if (!pending) {
      setScoreA(match.score_a);
      setScoreB(match.score_b);
    }
  }, [match.score_a, match.score_b, pending]);

  function save(nextA: number, nextB: number, status: MatchStatus) {
    // In demo mode there's no real database; keep edits local so buttons still
    // respond without erroring against the placeholder Supabase project.
    if (isDemoMode) {
      setScoreA(nextA);
      setScoreB(nextB);
      return;
    }
    startTransition(async () => {
      const result = await updateScore(match.id, nextA, nextB, status);
      if (!result.ok) {
        window.alert(result.error ?? "Error");
      }
    });
  }

  function bumpA(delta: number) {
    const next = Math.min(MAX_SET_GAMES, Math.max(0, scoreA + delta));
    if (next === scoreA) return; // already at the 0–7 bound, nothing to save
    setScoreA(next);
    save(next, scoreB, match.status === "scheduled" ? "in_progress" : match.status);
  }
  function bumpB(delta: number) {
    const next = Math.min(MAX_SET_GAMES, Math.max(0, scoreB + delta));
    if (next === scoreB) return; // already at the 0–7 bound, nothing to save
    setScoreB(next);
    save(scoreA, next, match.status === "scheduled" ? "in_progress" : match.status);
  }

  const statusLabel = {
    scheduled: t("scheduled"),
    in_progress: t("inProgress"),
    completed: t("completed"),
  }[match.status];

  // A finished match locks both controls; otherwise scores are capped to 0–7.
  // While a save is in flight (pending) we also lock the card so a burst of
  // clicks can't queue up a pile of concurrent requests.
  const locked = match.status === "completed";
  const busy = pending;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold">{line?.label ?? "—"}</span>
        <span className="flex items-center gap-2">
          {pending && <span className="text-blue-500">{t("saving")}</span>}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
            {statusLabel}
          </span>
        </span>
      </div>

      <ScoreRow
        color={teamA?.color}
        label={match.pair_a ?? teamName(teamA)}
        sub={teamName(teamA)}
        score={scoreA}
        onMinus={() => bumpA(-1)}
        onPlus={() => bumpA(1)}
        disableMinus={locked || busy || scoreA <= 0}
        disablePlus={locked || busy || scoreA >= MAX_SET_GAMES}
      />
      <div className="my-2 border-t border-slate-100" />
      <ScoreRow
        color={teamB?.color}
        label={match.pair_b ?? teamName(teamB)}
        sub={teamName(teamB)}
        score={scoreB}
        onMinus={() => bumpB(-1)}
        onPlus={() => bumpB(1)}
        disableMinus={locked || busy || scoreB <= 0}
        disablePlus={locked || busy || scoreB >= MAX_SET_GAMES}
      />

      <div className="mt-3 flex gap-2">
        {match.status === "scheduled" && (
          <ActionButton
            onClick={() => save(scoreA, scoreB, "in_progress")}
            loading={busy}
          >
            {t("startMatch")}
          </ActionButton>
        )}
        {match.status === "in_progress" && (
          <ActionButton
            onClick={() => save(scoreA, scoreB, "completed")}
            variant="primary"
            loading={busy}
          >
            {t("markFinal")}
          </ActionButton>
        )}
        {match.status === "completed" && (
          <ActionButton
            onClick={() => save(scoreA, scoreB, "in_progress")}
            loading={busy}
          >
            {t("reopen")}
          </ActionButton>
        )}
      </div>
    </div>
  );
}

function ScoreRow({
  color,
  label,
  sub,
  score,
  onMinus,
  onPlus,
  disableMinus,
  disablePlus,
}: {
  color: string | undefined;
  label: string;
  sub: string;
  score: number;
  onMinus: () => void;
  onPlus: () => void;
  disableMinus: boolean;
  disablePlus: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color ?? "#94a3b8" }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-slate-400">{sub}</div>
      </div>
      <button
        type="button"
        onClick={onMinus}
        disabled={disableMinus}
        className="h-10 w-10 rounded-lg border border-slate-300 text-xl font-bold text-slate-600 active:bg-slate-100 disabled:opacity-30"
      >
        −
      </button>
      <span className="w-8 text-center text-2xl font-bold tabular-nums">
        {score}
      </span>
      <button
        type="button"
        onClick={onPlus}
        disabled={disablePlus}
        className="h-10 w-10 rounded-lg border border-slate-300 text-xl font-bold text-slate-600 active:bg-slate-100 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "default",
  loading = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary";
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold disabled:opacity-60 ${
        variant === "primary"
          ? "bg-emerald-600 text-white active:bg-emerald-700"
          : "border border-slate-300 text-slate-700 active:bg-slate-100"
      }`}
    >
      {loading && <Spinner light={variant === "primary"} />}
      {children}
    </button>
  );
}

function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      role="status"
      aria-label="loading"
      className={`h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent ${
        light ? "border-white/70" : "border-slate-400"
      }`}
    />
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { updateCourt, updateScore } from "@/app/admin/actions";
import Header from "@/components/Header";
import { useI18n } from "@/lib/i18n";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { MAX_SET_GAMES, classifySetScore } from "@/lib/setScore";
import { MAX_COURT, MIN_COURT, courtNumber, parseCourtInput } from "@/lib/court";
import type { Line, Match, MatchStatus, Team } from "@/lib/types";
import { useTournamentData } from "@/lib/useTournamentData";

// A run of +/- taps shouldn't cost a request per tap. The number moves as fast
// as you can press; only the value it settles on is sent, this long after the
// last press. Typing a score directly saves immediately.
const SAVE_DEBOUNCE_MS = 450;

export default function AdminBoard() {
  const { t, teamName } = useI18n();
  const { matches, teamById, lineById, loading } = useTournamentData();

  const rounds = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b
  );

  // Which live match holds each court, so a card can warn when two matches are
  // sent to the same place (the court map can only show one of them).
  const courtOwner = new Map<number, number>();
  for (const m of matches) {
    if (m.status !== "in_progress") continue;
    const n = courtNumber(m.court);
    if (n != null && !courtOwner.has(n)) courtOwner.set(n, m.id);
  }

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
                    courtOwner={courtOwner}
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
  courtOwner,
}: {
  match: Match;
  teamA: Team | undefined;
  teamB: Team | undefined;
  line: Line | undefined;
  courtOwner: Map<number, number>;
}) {
  const { t, teamName } = useI18n();
  const [pending, startTransition] = useTransition();
  const [scoreA, setScoreA] = useState(match.score_a);
  const [scoreB, setScoreB] = useState(match.score_b);
  // Text sitting in a score box while it's being typed; null when not editing.
  const [draftA, setDraftA] = useState<string | null>(null);
  const [draftB, setDraftB] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every local edit, and caught up once that edit is saved. While
  // the two differ we hold our own numbers and ignore incoming rows, so a
  // realtime echo can't yank the score back mid-tap.
  const editSeq = useRef(0);
  const savedSeq = useRef(0);
  // Always the latest row, for reverting to after the server refuses an edit.
  const matchRef = useRef(match);
  matchRef.current = match;

  useEffect(() => {
    if (editSeq.current !== savedSeq.current) return;
    setScoreA(match.score_a);
    setScoreB(match.score_b);
  }, [match.score_a, match.score_b]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  function commit(
    nextA: number,
    nextB: number,
    status: MatchStatus,
    seq: number
  ) {
    // In demo mode there's no real database; keep edits local so the controls
    // still respond without erroring against the placeholder Supabase project.
    if (isDemoMode) {
      savedSeq.current = seq;
      return;
    }
    startTransition(async () => {
      const result = await updateScore(match.id, nextA, nextB, status);
      savedSeq.current = Math.max(savedSeq.current, seq);
      if (!result.ok && seq === editSeq.current) {
        // Nothing newer is queued, so fall back to what the database holds.
        setError(result.error ?? "Error");
        setScoreA(matchRef.current.score_a);
        setScoreB(matchRef.current.score_b);
      }
    });
  }

  /** Schedule a save, replacing any save still waiting out its debounce. */
  function queueSave(
    nextA: number,
    nextB: number,
    status: MatchStatus,
    delay = SAVE_DEBOUNCE_MS
  ) {
    const seq = ++editSeq.current;
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      commit(nextA, nextB, status, seq);
    }, delay);
  }

  // Touching the score of a scheduled match is what starts it.
  const startedStatus = (): MatchStatus =>
    match.status === "scheduled" ? "in_progress" : match.status;

  /**
   * Where a +/- tap would land, or null if it can't: past the 0–7 bound, or on
   * a score the set rules can't reach (7-0 and such). Drives both the tap and
   * whether the button is offered at all.
   */
  function bumpTarget(side: "a" | "b", delta: number): number | null {
    const current = side === "a" ? scoreA : scoreB;
    const next = current + delta;
    if (next < 0 || next > MAX_SET_GAMES) return null;
    const nextA = side === "a" ? next : scoreA;
    const nextB = side === "b" ? next : scoreB;
    return classifySetScore(nextA, nextB).valid ? next : null;
  }

  function bump(side: "a" | "b", delta: number) {
    const next = bumpTarget(side, delta);
    if (next == null) return;
    const nextA = side === "a" ? next : scoreA;
    const nextB = side === "b" ? next : scoreB;
    if (side === "a") {
      setScoreA(next);
      setDraftA(null);
    } else {
      setScoreB(next);
      setDraftB(null);
    }
    queueSave(nextA, nextB, startedStatus());
  }

  /** Accept what was typed into a score box, if it makes a legal set score. */
  function commitDraft(side: "a" | "b") {
    const raw = side === "a" ? draftA : draftB;
    const clearDraft = side === "a" ? setDraftA : setDraftB;
    if (raw == null) return;

    const trimmed = raw.trim();
    if (trimmed === "") {
      // Left blank — put the current number back and change nothing.
      clearDraft(null);
      setError(null);
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      setError(t("invalidScore"));
      return;
    }
    const n = Number(trimmed);
    const nextA = side === "a" ? n : scoreA;
    const nextB = side === "b" ? n : scoreB;
    if (!classifySetScore(nextA, nextB).valid) {
      setError(t("invalidScore"));
      return;
    }
    setScoreA(nextA);
    setScoreB(nextB);
    clearDraft(null);
    queueSave(nextA, nextB, startedStatus(), 0);
  }

  const statusLabel = {
    scheduled: t("scheduled"),
    in_progress: t("inProgress"),
    completed: t("completed"),
  }[match.status];

  // A finished match locks the score controls; otherwise scores stay editable
  // even while a save is in flight, since saves are debounced and sequenced.
  const locked = match.status === "completed";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <CourtBar
        match={match}
        line={line}
        statusLabel={statusLabel}
        courtOwner={courtOwner}
      />

      <div className="p-3">
        <div className="mb-2 flex items-center justify-end gap-2 text-xs">
          {pending && <span className="text-blue-500">{t("saving")}</span>}
          {error && (
            <span className="text-right font-medium text-red-600">{error}</span>
          )}
        </div>

        <ScoreRow
          color={teamA?.color}
          label={match.pair_a ?? teamName(teamA)}
          sub={teamName(teamA)}
          score={scoreA}
          draft={draftA}
          onDraft={setDraftA}
          onCommitDraft={() => commitDraft("a")}
          onMinus={() => bump("a", -1)}
          onPlus={() => bump("a", 1)}
          disableMinus={locked || bumpTarget("a", -1) == null}
          disablePlus={locked || bumpTarget("a", 1) == null}
          locked={locked}
        />
        <div className="my-2 border-t border-slate-100" />
        <ScoreRow
          color={teamB?.color}
          label={match.pair_b ?? teamName(teamB)}
          sub={teamName(teamB)}
          score={scoreB}
          draft={draftB}
          onDraft={setDraftB}
          onCommitDraft={() => commitDraft("b")}
          onMinus={() => bump("b", -1)}
          onPlus={() => bump("b", 1)}
          disableMinus={locked || bumpTarget("b", -1) == null}
          disablePlus={locked || bumpTarget("b", 1) == null}
          locked={locked}
        />

        <div className="mt-3 flex gap-2">
          {match.status === "scheduled" && (
            <ActionButton
              onClick={() => queueSave(scoreA, scoreB, "in_progress", 0)}
              loading={pending}
            >
              {t("startMatch")}
            </ActionButton>
          )}
          {match.status === "in_progress" && (
            <ActionButton
              onClick={() => queueSave(scoreA, scoreB, "completed", 0)}
              variant="primary"
              loading={pending}
            >
              {t("markFinal")}
            </ActionButton>
          )}
          {match.status === "completed" && (
            <ActionButton
              onClick={() => queueSave(scoreA, scoreB, "in_progress", 0)}
              loading={pending}
            >
              {t("reopen")}
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The card's top bar: the court this match is on, typed in by the admin. The
 * viewer's court map reads the same column, so a court entered here moves the
 * match on the map as soon as the row round-trips.
 */
function CourtBar({
  match,
  line,
  statusLabel,
  courtOwner,
}: {
  match: Match;
  line: Line | undefined;
  statusLabel: string;
  courtOwner: Map<number, number>;
}) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(match.court ?? "");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set while this card owns the value: mid-edit, saving, or (in demo mode)
  // holding a change that has nowhere to be persisted.
  const dirty = useRef(false);
  const matchRef = useRef(match);
  matchRef.current = match;

  useEffect(() => {
    if (focused || dirty.current) return;
    setText(match.court ?? "");
  }, [match.court, focused]);

  function commitCourt() {
    const parsed = parseCourtInput(text);
    if (!parsed.ok) {
      setError(t("courtRange", { min: MIN_COURT, max: MAX_COURT }));
      return;
    }
    const next = parsed.court ?? "";
    setError(null);
    setText(next);
    dirty.current = true;
    if (isDemoMode) return; // no database to write to; keep the local value
    startTransition(async () => {
      const result = await updateCourt(match.id, next);
      dirty.current = false;
      if (!result.ok) {
        setError(result.error ?? "Error");
        setText(matchRef.current.court ?? "");
      }
    });
  }

  const court = courtNumber(text);
  const owner = court != null ? courtOwner.get(court) : undefined;
  const clash = owner != null && owner !== match.id;
  const needsStart = court != null && match.status !== "in_progress";
  const assigned = court != null;

  return (
    <div
      className={`border-b px-3 py-2 ${
        assigned ? "border-slate-800 bg-slate-800" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              assigned ? "text-white/70" : "text-slate-500"
            }`}
          >
            {t("court")}
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={text}
            placeholder="–"
            aria-label={t("court")}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => {
              setFocused(true);
              e.currentTarget.select();
            }}
            onBlur={() => {
              setFocused(false);
              commitCourt();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={`h-9 w-12 rounded-lg border text-center text-lg font-black tabular-nums outline-none focus:ring-2 focus:ring-blue-400 ${
              assigned
                ? "border-white/30 bg-white/10 text-white placeholder:text-white/40"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          />
          <span
            className={`text-[10px] ${assigned ? "text-white/50" : "text-slate-400"}`}
          >
            {MIN_COURT}–{MAX_COURT}
          </span>
        </label>

        <span className="flex items-center gap-2 text-xs">
          {pending && (
            <span className={assigned ? "text-white/70" : "text-blue-500"}>
              {t("saving")}
            </span>
          )}
          <span
            className={`font-semibold ${assigned ? "text-white/70" : "text-slate-500"}`}
          >
            {line?.label ?? "—"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              assigned ? "bg-white/15 text-white" : "bg-slate-200 text-slate-600"
            }`}
          >
            {statusLabel}
          </span>
        </span>
      </div>

      {(error || clash || needsStart) && (
        <p
          className={`mt-1.5 text-[11px] font-medium ${
            error || clash
              ? assigned
                ? "text-amber-300"
                : "text-red-600"
              : assigned
                ? "text-white/60"
                : "text-slate-500"
          }`}
        >
          {error ??
            (clash
              ? t("courtTaken", { n: court! })
              : t("courtNeedsStart"))}
        </p>
      )}
    </div>
  );
}

function ScoreRow({
  color,
  label,
  sub,
  score,
  draft,
  onDraft,
  onCommitDraft,
  onMinus,
  onPlus,
  disableMinus,
  disablePlus,
  locked,
}: {
  color: string | undefined;
  label: string;
  sub: string;
  score: number;
  draft: string | null;
  onDraft: (value: string) => void;
  onCommitDraft: () => void;
  onMinus: () => void;
  onPlus: () => void;
  disableMinus: boolean;
  disablePlus: boolean;
  locked: boolean;
}) {
  const { t } = useI18n();
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
      {/* Typed entry beats tapping + six times to reach 6. */}
      <input
        type="text"
        inputMode="numeric"
        maxLength={1}
        value={draft ?? String(score)}
        readOnly={locked}
        aria-label={`${label} — ${t("scoreHint")}`}
        onChange={(e) => onDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={onCommitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-10 w-12 rounded-lg border border-slate-200 bg-white text-center text-2xl font-bold tabular-nums text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400 read-only:border-transparent read-only:bg-transparent"
      />
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

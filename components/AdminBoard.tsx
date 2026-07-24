"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { resetAllScores, updateCourt, updateScore } from "@/app/admin/actions";
import { WRONG_PIN } from "@/lib/admin";
import Header from "@/components/Header";
import { useI18n } from "@/lib/i18n";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import {
  MAX_SET_GAMES,
  classifySetScore,
  isCompletedSetScore,
} from "@/lib/setScore";
import {
  MAX_COURT,
  MIN_COURT,
  courtNumber,
  firstFreeCourt,
  parseCourtInput,
} from "@/lib/court";
import { buildTimetable } from "@/lib/schedule";
import type { Line, Match, MatchStatus, Team } from "@/lib/types";
import { useTournamentData } from "@/lib/useTournamentData";

// A run of +/- taps shouldn't cost a request per tap. The number moves as fast
// as you can press; only the value it settles on is sent, this long after the
// last press. Typing a score directly saves immediately.
const SAVE_DEBOUNCE_MS = 450;

export default function AdminBoard() {
  const { t, teamName } = useI18n();
  const { matches, teamById, lineById, loading } = useTournamentData();

  // Demo mode has no database, so the board holds the admin's edits in memory
  // and merges them over the demo rows. Keeping them here rather than inside
  // each card is what lets a finished match hand its court back, so the next
  // match to start can claim it — exactly as the real rows behave over
  // Supabase realtime.
  const [demoEdits, setDemoEdits] = useState<Map<number, Partial<Match>>>(
    () => new Map()
  );
  const applyDemoEdit = (id: number, patch: Partial<Match>) =>
    setDemoEdits((prev) =>
      new Map(prev).set(id, { ...prev.get(id), ...patch })
    );

  // After the server confirms the PIN, wipe the board. Real rows are reset in
  // the database and flow back over realtime; demo rows are reset here by
  // stamping every match with a zeroed patch.
  const resetDemoRows = () =>
    setDemoEdits(
      new Map(
        matches.map((m) => [
          m.id,
          { score_a: 0, score_b: 0, status: "scheduled", court: null },
        ])
      )
    );

  const rows = isDemoMode
    ? matches.map((m) => {
        const patch = demoEdits.get(m.id);
        return patch ? { ...m, ...patch } : m;
      })
    : matches;

  const rounds = [...new Set(rows.map((m) => m.round))].sort((a, b) => a - b);

  // The court each match is planned for, from the shared timetable. Starting a
  // match pre-fills this so the board's courts match the printed poster; the
  // admin can still override when a court frees up early.
  const plannedCourt = new Map<number, number>();
  for (const slot of buildTimetable(rows, lineById)) {
    for (const { match, court } of slot.matches) plannedCourt.set(match.id, court);
  }

  // Which live match holds each court, so a card can warn when two matches are
  // sent to the same place (the court map can only show one of them) and so
  // starting a match can pick a court nobody is on.
  const courtOwner = new Map<number, number>();
  for (const m of rows) {
    if (m.status !== "in_progress") continue;
    const n = courtNumber(m.court);
    if (n != null && !courtOwner.has(n)) courtOwner.set(n, m.id);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
      <Header subtitle={t("scoreReporting")} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-blue-600 underline">
          → {t("viewerBoard")}
        </Link>
        <ResetControl onResetDemo={resetDemoRows} />
      </div>

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
          const roundMatches = rows
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
                    plannedCourt={plannedCourt.get(m.id) ?? null}
                    onDemoEdit={applyDemoEdit}
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

/**
 * "Reset all scores", gated behind a fresh PIN entry. The button opens a small
 * confirm panel with a password field; the server re-checks the PIN (same one
 * as login) before wiping anything, so knowing the admin is logged in isn't
 * enough on its own to throw away every reported score.
 */
function ResetControl({ onResetDemo }: { onResetDemo: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setPin("");
    setError(null);
  }

  function submit() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await resetAllScores(pin);
      if (!result.ok) {
        setError(result.error === WRONG_PIN ? t("wrongPin") : result.error ?? "Error");
        setPin("");
        inputRef.current?.focus();
        return;
      }
      if (isDemoMode) onResetDemo();
      close();
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    });
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        {done && (
          <span className="text-xs font-medium text-emerald-600">
            {t("resetDone")}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 active:bg-red-100"
        >
          {t("resetScores")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-red-200 bg-red-50 p-3 shadow-sm">
      <p className="text-sm font-bold text-red-700">{t("resetScores")}</p>
      <p className="mt-0.5 text-xs text-red-600/90">{t("resetWarning")}</p>
      <label className="mt-2 block text-xs font-medium text-red-700">
        {t("resetPrompt")}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") close();
          }}
          className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-red-400"
        />
      </label>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={close}
          disabled={pending}
          className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 active:bg-slate-100"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || pin.length === 0}
          aria-busy={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-60 active:bg-red-700"
        >
          {pending && <Spinner light />}
          {t("resetConfirm")}
        </button>
      </div>
    </div>
  );
}

function AdminMatchCard({
  match,
  teamA,
  teamB,
  line,
  courtOwner,
  plannedCourt,
  onDemoEdit,
}: {
  match: Match;
  teamA: Team | undefined;
  teamB: Team | undefined;
  line: Line | undefined;
  courtOwner: Map<number, number>;
  plannedCourt: number | null;
  onDemoEdit: (id: number, patch: Partial<Match>) => void;
}) {
  const { t, teamName } = useI18n();
  const [pending, startTransition] = useTransition();
  const [scoreA, setScoreA] = useState(match.score_a);
  const [scoreB, setScoreB] = useState(match.score_b);
  // Text sitting in a score box while it's being typed; null when not editing.
  const [draftA, setDraftA] = useState<string | null>(null);
  const [draftB, setDraftB] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // In demo mode the board has already merged our edits into `match`, so these
  // read the same either way.
  const status = match.status;
  const court = match.court;

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
    nextStatus: MatchStatus,
    nextCourt: string | undefined,
    seq: number
  ) {
    // In demo mode there's no real database; hand the change to the board so
    // it merges into the rows everything else on this page reads.
    if (isDemoMode) {
      savedSeq.current = seq;
      onDemoEdit(match.id, {
        score_a: nextA,
        score_b: nextB,
        status: nextStatus,
        ...(nextCourt !== undefined ? { court: nextCourt || null } : {}),
      });
      return;
    }
    startTransition(async () => {
      const result = await updateScore(
        match.id,
        nextA,
        nextB,
        nextStatus,
        nextCourt
      );
      savedSeq.current = Math.max(savedSeq.current, seq);
      if (!result.ok && seq === editSeq.current) {
        // Nothing newer is queued, so fall back to what the database holds.
        setError(result.error ?? "Error");
        setScoreA(matchRef.current.score_a);
        setScoreB(matchRef.current.score_b);
      }
    });
  }

  /**
   * Court to write when moving to `nextStatus`. Starting a match with no court
   * yet takes its planned court from the timetable (so the board matches the
   * printed poster), or the lowest free court if that one is already busy. The
   * admin can still retype it if a court frees up early. `undefined` means
   * leave the court exactly as it is.
   */
  function courtFor(nextStatus: MatchStatus): string | undefined {
    if (nextStatus !== "in_progress") return undefined;
    if (courtNumber(court) != null) return undefined; // already on a court
    const taken = new Set(
      [...courtOwner].filter(([, id]) => id !== match.id).map(([n]) => n)
    );
    if (plannedCourt != null && !taken.has(plannedCourt)) {
      return String(plannedCourt);
    }
    const free = firstFreeCourt(taken);
    return free != null ? String(free) : undefined;
  }

  /** Schedule a save, replacing any save still waiting out its debounce. */
  function queueSave(
    nextA: number,
    nextB: number,
    nextStatus: MatchStatus,
    delay = SAVE_DEBOUNCE_MS
  ) {
    // A completed set is the one precondition the server enforces; check it
    // here too so the button explains itself instead of silently failing.
    if (nextStatus === "completed" && !isCompletedSetScore(nextA, nextB)) {
      setError(t("needCompletedSet"));
      return;
    }
    const nextCourt = courtFor(nextStatus);
    const seq = ++editSeq.current;
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      commit(nextA, nextB, nextStatus, nextCourt, seq);
    }, delay);
  }

  // Touching the score of a scheduled match is what starts it.
  const startedStatus = (): MatchStatus =>
    status === "scheduled" ? "in_progress" : status;

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
  }[status];

  // A finished match locks the score controls; otherwise scores stay editable
  // even while a save is in flight, since saves are debounced and sequenced.
  const locked = status === "completed";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <CourtBar
        matchId={match.id}
        court={court}
        plannedCourt={plannedCourt}
        status={status}
        line={line}
        statusLabel={statusLabel}
        courtOwner={courtOwner}
        onDemoCourtChange={(next) => onDemoEdit(match.id, { court: next })}
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

        {/* Scheduled -> Live -> Final, with the step you're on highlighted. */}
        <StateSteps status={status} />

        <div className="mt-2 flex gap-2">
          {status === "scheduled" && (
            <ActionButton
              onClick={() => queueSave(scoreA, scoreB, "in_progress", 0)}
              loading={pending}
            >
              {t("startMatch")}
            </ActionButton>
          )}
          {status === "in_progress" && (
            <ActionButton
              onClick={() => queueSave(scoreA, scoreB, "completed", 0)}
              variant="primary"
              loading={pending}
            >
              {t("markFinal")}
            </ActionButton>
          )}
          {status === "completed" && (
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
  matchId,
  court: courtValue,
  plannedCourt,
  status,
  line,
  statusLabel,
  courtOwner,
  onDemoCourtChange,
}: {
  matchId: number;
  court: string | null;
  plannedCourt: number | null;
  status: MatchStatus;
  line: Line | undefined;
  statusLabel: string;
  courtOwner: Map<number, number>;
  onDemoCourtChange: (court: string | null) => void;
}) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(courtValue ?? "");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set while a typed edit is in flight; until it lands we hold our own text so
  // an incoming row can't overwrite what the admin is halfway through typing.
  const dirty = useRef(false);
  const courtRef = useRef(courtValue);
  courtRef.current = courtValue;

  // Follow the card's court whenever we aren't the one changing it — that's
  // how the number auto-filled by starting a match shows up in the box.
  useEffect(() => {
    if (focused || dirty.current) return;
    setText(courtValue ?? "");
  }, [courtValue, focused]);

  function commitCourt() {
    const parsed = parseCourtInput(text);
    if (!parsed.ok) {
      setError(t("courtRange", { min: MIN_COURT, max: MAX_COURT }));
      return;
    }
    const next = parsed.court ?? "";
    setError(null);
    setText(next);
    if (isDemoMode) {
      onDemoCourtChange(parsed.court); // no database; keep it on the card
      return;
    }
    dirty.current = true;
    startTransition(async () => {
      const result = await updateCourt(matchId, next);
      dirty.current = false;
      if (!result.ok) {
        setError(result.error ?? "Error");
        setText(courtRef.current ?? "");
      }
    });
  }

  const court = courtNumber(text);
  const owner = court != null ? courtOwner.get(court) : undefined;
  // A finished match has handed its court back, so it neither clashes with the
  // match now using that court nor needs prompting to start.
  const done = status === "completed";
  const clash = !done && owner != null && owner !== matchId;
  const needsStart = !done && court != null && status === "scheduled";
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
            placeholder={plannedCourt != null ? String(plannedCourt) : "–"}
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
            {!assigned && plannedCourt != null
              ? t("plannedCourt", { n: plannedCourt })
              : `${MIN_COURT}–${MAX_COURT}`}
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

/**
 * The match's lifecycle as three steps — Not started → Live → Final — with the
 * one you're on filled in, so it's obvious what the button below will do next.
 */
function StateSteps({ status }: { status: MatchStatus }) {
  const { t } = useI18n();
  const steps: { key: MatchStatus; label: string }[] = [
    { key: "scheduled", label: t("notStarted") },
    { key: "in_progress", label: t("inProgress") },
    { key: "completed", label: t("completed") },
  ];
  const at = steps.findIndex((s) => s.key === status);

  return (
    <div className="mt-3 flex items-center gap-1.5" aria-label={t("scoreReporting")}>
      {steps.map((step, i) => (
        <div key={step.key} className="flex flex-1 items-center gap-1.5">
          <span
            className={`flex-1 rounded-full px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide ${
              i === at
                ? "bg-slate-900 text-white"
                : i < at
                  ? "bg-slate-200 text-slate-500"
                  : "bg-slate-50 text-slate-300"
            }`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={`text-[10px] ${i < at ? "text-slate-400" : "text-slate-200"}`}
            >
              →
            </span>
          )}
        </div>
      ))}
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

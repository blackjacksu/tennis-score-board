"use client";

import { useI18n } from "@/lib/i18n";
import type { Line, Match, Team } from "@/lib/types";

// Fixed physical layout: six courts in one row, spectator stand between 3 and 4.
const COURT_NUMBERS = [1, 2, 3, 4, 5, 6];

// Translucent version of a team color, for washing each side of the court.
function tint(hex: string | undefined, alpha: number): string {
  const h = (hex ?? "#94a3b8").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CourtView({
  matches,
  teamById,
  lineById,
}: {
  teams: Team[];
  matches: Match[];
  teamById: Map<number, Team>;
  lineById: Map<number, Line>;
}) {
  const { t } = useI18n();

  // Map each physical court to the match currently being played on it.
  const matchByCourt = new Map<number, Match>();
  for (const m of matches) {
    if (m.status !== "in_progress" || !m.court) continue;
    const n = Number(m.court);
    if (COURT_NUMBERS.includes(n) && !matchByCourt.has(n)) {
      matchByCourt.set(n, m);
    }
  }
  const inUse = matchByCourt.size;

  const courtEls = COURT_NUMBERS.map((n) => (
    <Court
      key={n}
      number={n}
      match={matchByCourt.get(n)}
      teamById={teamById}
      lineById={lineById}
    />
  ));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {t("nowPlaying")}
        </h2>
        <span className="text-xs font-medium text-slate-400">
          {t("courtsInUse", { n: inUse })}
        </span>
      </div>

      {/* One horizontal row; scrolls on narrow screens. */}
      <div className="overflow-x-auto pb-3">
        <div className="flex items-stretch gap-3">
          {courtEls.slice(0, 3)}
          <SpectatorStand />
          {courtEls.slice(3)}
        </div>
      </div>
    </div>
  );
}

function Court({
  number,
  match,
  teamById,
  lineById,
}: {
  number: number;
  match: Match | undefined;
  teamById: Map<number, Team>;
  lineById: Map<number, Line>;
}) {
  const { t, teamName } = useI18n();

  const teamA = match ? teamById.get(match.team_a_id) : undefined;
  const teamB = match ? teamById.get(match.team_b_id) : undefined;
  const line = match ? lineById.get(match.line_id) : undefined;
  const live = !!match;

  return (
    <div className="flex w-52 shrink-0 flex-col">
      {/* Court label + status */}
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-slate-700">
            {t("court")} {number}
          </span>
          {line && (
            <span className="text-[11px] text-slate-400">{line.label}</span>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            live ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"
          }`}
        >
          {live ? (
            <>
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 align-middle" />
              {t("inProgress")}
            </>
          ) : (
            t("courtOpen")
          )}
        </span>
      </div>

      {/* The court itself */}
      <div className="relative aspect-[100/170] overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-sm">
        {/* Team-colored halves */}
        <div
          className="absolute inset-x-0 top-0 h-1/2"
          style={{ backgroundColor: live ? tint(teamA?.color, 0.16) : tint(undefined, 0.05) }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ backgroundColor: live ? tint(teamB?.color, 0.16) : tint(undefined, 0.05) }}
        />

        {/* Court markings + net */}
        <CourtLines uid={number} />

        {/* Big translucent court number behind everything */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-black text-slate-900/[0.06]">
            {number}
          </span>
        </div>

        {live ? (
          <div className="absolute inset-0 flex flex-col p-2.5">
            <HalfInfo
              color={teamA?.color}
              team={teamName(teamA)}
              pair={match!.pair_a ?? t("tbd")}
              rating={match!.rating_a ?? line?.ntrp ?? null}
              score={match!.score_a}
              ratingLabel={t("rating")}
              align="top"
            />
            <HalfInfo
              color={teamB?.color}
              team={teamName(teamB)}
              pair={match!.pair_b ?? t("tbd")}
              rating={match!.rating_b ?? line?.ntrp ?? null}
              score={match!.score_b}
              ratingLabel={t("rating")}
              align="bottom"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("courtOpen")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// One team's side of the court: name chip, pair, rating and a big score by the net.
function HalfInfo({
  color,
  team,
  pair,
  rating,
  score,
  ratingLabel,
  align,
}: {
  color: string | undefined;
  team: string;
  pair: string;
  rating: number | string | null;
  score: number;
  ratingLabel: string;
  align: "top" | "bottom";
}) {
  const dot = (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: color ?? "#94a3b8" }}
    />
  );
  const nameChip = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-sm"
      style={{ backgroundColor: color ?? "#94a3b8" }}
    >
      {team}
    </span>
  );
  const body = (
    <>
      <div className="flex items-center gap-1.5">
        {dot}
        {nameChip}
      </div>
      <p className="mt-1 text-xs font-semibold leading-tight text-slate-800">
        {pair}
      </p>
      {rating != null && (
        <span className="mt-1 inline-block rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-600 ring-1 ring-slate-200">
          {ratingLabel} {rating}
        </span>
      )}
    </>
  );
  const scoreEl = (
    <div className="text-right text-3xl font-black leading-none tabular-nums text-slate-900">
      {score}
    </div>
  );

  return (
    <div
      className={`flex flex-1 flex-col ${align === "bottom" ? "justify-end" : "justify-start"}`}
    >
      {align === "top" ? (
        <>
          {body}
          <div className="mt-auto pt-1">{scoreEl}</div>
        </>
      ) : (
        <>
          <div className="mb-auto pb-1">{scoreEl}</div>
          {body}
        </>
      )}
    </div>
  );
}

// Faithful doubles-court markings with an emphasized net across the middle.
function CourtLines({ uid }: { uid: number }) {
  const line = "rgba(51, 65, 85, 0.4)"; // slate-700, faint — reads as court paint
  const netId = `net-${uid}`;
  return (
    <svg
      viewBox="0 0 100 170"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <pattern
          id={netId}
          width="2.4"
          height="2.4"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 0 V2.4 M0 0 H2.4"
            stroke="rgba(51,65,85,0.35)"
            strokeWidth="0.4"
            fill="none"
          />
        </pattern>
      </defs>

      <g stroke={line} strokeWidth="1.1" fill="none" vectorEffect="non-scaling-stroke">
        {/* Doubles boundary */}
        <rect x="8" y="8" width="84" height="154" />
        {/* Singles sidelines */}
        <line x1="20" y1="8" x2="20" y2="162" />
        <line x1="80" y1="8" x2="80" y2="162" />
        {/* Service lines */}
        <line x1="20" y1="52" x2="80" y2="52" />
        <line x1="20" y1="118" x2="80" y2="118" />
        {/* Center service line */}
        <line x1="50" y1="52" x2="50" y2="118" />
        {/* Center marks on baselines */}
        <line x1="50" y1="8" x2="50" y2="12" />
        <line x1="50" y1="158" x2="50" y2="162" />
      </g>

      {/* Net across the middle */}
      <rect x="8" y="82" width="84" height="6" fill={`url(#${netId})`} />
      <line x1="4" y1="82" x2="96" y2="82" stroke="rgba(51,65,85,0.7)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      <line x1="4" y1="88" x2="96" y2="88" stroke="rgba(51,65,85,0.55)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {/* Net posts */}
      <rect x="4" y="80" width="4" height="10" fill="rgba(51,65,85,0.75)" />
      <rect x="92" y="80" width="4" height="10" fill="rgba(51,65,85,0.75)" />
    </svg>
  );
}

// The spectator stand that sits between courts 3 and 4.
function SpectatorStand() {
  const { t } = useI18n();
  const rows = [6, 6, 5, 5, 4]; // tiers, widest nearest the courts
  return (
    <div className="flex w-24 shrink-0 flex-col">
      <div className="mb-1.5 px-0.5 text-center text-[11px] font-semibold text-slate-400">
        &nbsp;
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-2">
        <span className="text-lg" role="img" aria-label="spectators">
          👥
        </span>
        <div className="flex flex-col items-center gap-1">
          {rows.map((n, i) => (
            <div key={i} className="flex gap-0.5">
              {Array.from({ length: n }).map((_, j) => (
                <span
                  key={j}
                  className="h-1.5 w-2 rounded-sm bg-slate-300"
                />
              ))}
            </div>
          ))}
        </div>
        <span className="mt-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500">
          {t("spectators")}
        </span>
      </div>
    </div>
  );
}

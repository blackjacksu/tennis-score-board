"use client";

import { COURT_NUMBERS, courtNumber } from "@/lib/court";
import { useI18n } from "@/lib/i18n";
import type { Line, Match, Team } from "@/lib/types";

// Fixed physical layout: six courts in one row (COURT_NUMBERS), spectator
// stand between 3 and 4.

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
    if (m.status !== "in_progress") continue;
    const n = courtNumber(m.court);
    if (n != null && !matchByCourt.has(n)) {
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
  const { t } = useI18n();

  const teamA = match ? teamById.get(match.team_a_id) : undefined;
  const teamB = match ? teamById.get(match.team_b_id) : undefined;
  const line = match ? lineById.get(match.line_id) : undefined;
  const live = !!match;

  return (
    <div className="flex w-64 shrink-0 flex-col">
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

      {/* Team A sits above the court, team B below — outside the box, so a
          long pair name can never land on top of the court markings. */}
      <PairLabel
        name={live ? (match!.pair_a ?? t("tbd")) : null}
        color={teamA?.color}
      />

      {/* The court itself */}
      <div className="relative aspect-[100/170] overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-sm">
        {/* Team-colored halves */}
        <div
          className="absolute inset-x-0 top-0 h-1/2"
          style={{ backgroundColor: live ? tint(teamA?.color, 0.26) : tint(undefined, 0.05) }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ backgroundColor: live ? tint(teamB?.color, 0.26) : tint(undefined, 0.05) }}
        />

        {/* Court markings + net */}
        <CourtLines uid={number} />

        {/* Big translucent court number behind everything */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-black text-slate-900/[0.06]">
            {number}
          </span>
        </div>

        {/* Bear mascots in a doubles one-up-one-back stance (behind text).
            They stay black — the court half color tells you the team. */}
        {live && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {/* Team A (top): one bear up at the net, partner back at the baseline */}
            <BearFigure top="40%" left="30%" />
            <BearFigure top="14%" left="64%" />
            {/* Team B (bottom): mirror image on the far side of the net */}
            <BearFigure top="60%" left="64%" />
            <BearFigure top="86%" left="30%" />
          </div>
        )}

        {live ? (
          <>
            <ScoreChip value={match!.score_a} align="top" />
            <ScoreChip value={match!.score_b} align="bottom" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("courtOpen")}
            </span>
          </div>
        )}
      </div>

      <PairLabel
        name={live ? (match!.pair_b ?? t("tbd")) : null}
        color={teamB?.color}
      />
    </div>
  );
}

// A pair's names on their side of the court, drawn outside the court box.
// The dot repeats the team color that tints their half. Fixed height so every
// court in the row lines up whether or not it has a match on it.
function PairLabel({
  name,
  color,
}: {
  name: string | null;
  color: string | undefined;
}) {
  return (
    <div className="flex h-6 items-center gap-1.5 px-0.5">
      {name && (
        <>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color ?? "#94a3b8" }}
          />
          <span className="truncate text-xs font-semibold text-slate-800">
            {name}
          </span>
        </>
      )}
    </div>
  );
}

// A team's games in the current set, parked just off the net on a solid chip
// so it reads cleanly over the service lines.
function ScoreChip({ value, align }: { value: number; align: "top" | "bottom" }) {
  return (
    <div
      className={`absolute right-3 ${align === "top" ? "bottom-[53%]" : "top-[53%]"}`}
    >
      <span className="block rounded-lg bg-white/85 px-2 py-0.5 text-3xl font-black leading-none tabular-nums text-slate-900 shadow-sm ring-1 ring-slate-200">
        {value}
      </span>
    </div>
  );
}

// A cute Formosan black bear mascot (台灣黑熊) with its iconic white chest "V".
// Positioned by percentage so it lands on the right spot on any court size.
function BearFigure({ top, left }: { top: string; left: string }) {
  const black = "#1c1917";
  const tan = "#e8c7a6";
  const cream = "#fdf4e3";
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ top, left, width: 26 }}
    >
      <svg viewBox="0 0 32 40" className="h-auto w-full drop-shadow-sm">
        {/* ears */}
        <circle cx="8" cy="7" r="4.5" fill={black} stroke="white" strokeWidth="1" />
        <circle cx="24" cy="7" r="4.5" fill={black} stroke="white" strokeWidth="1" />
        <circle cx="8" cy="7" r="2" fill={tan} />
        <circle cx="24" cy="7" r="2" fill={tan} />
        {/* body */}
        <ellipse cx="16" cy="30" rx="8.5" ry="7.5" fill={black} stroke="white" strokeWidth="1" />
        {/* paws */}
        <circle cx="8.5" cy="31" r="2.6" fill={black} stroke="white" strokeWidth="0.8" />
        <circle cx="23.5" cy="31" r="2.6" fill={black} stroke="white" strokeWidth="0.8" />
        {/* iconic white chest crescent */}
        <path
          d="M11.5 25.5 L16 31 L20.5 25.5"
          fill="none"
          stroke={cream}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* head */}
        <circle cx="16" cy="14" r="9.5" fill={black} stroke="white" strokeWidth="1" />
        {/* muzzle */}
        <ellipse cx="16" cy="17" rx="4.6" ry="3.6" fill={tan} />
        {/* nose */}
        <ellipse cx="16" cy="15.4" rx="1.7" ry="1.2" fill={black} />
        {/* eyes */}
        <circle cx="11.7" cy="12" r="1.7" fill="white" />
        <circle cx="20.3" cy="12" r="1.7" fill="white" />
        <circle cx="12" cy="12.3" r="0.95" fill={black} />
        <circle cx="20" cy="12.3" r="0.95" fill={black} />
      </svg>
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

// The spectator stand that sits between courts 3 and 4, with the venue's main
// door on its bottom edge — the door is what orients the map for anyone
// walking in.
function SpectatorStand() {
  const { t } = useI18n();
  const rows = [6, 6, 5, 5, 4]; // tiers, widest nearest the courts
  return (
    <div className="flex w-28 shrink-0 flex-col">
      <div className="mb-1.5 px-0.5 text-center text-[11px] font-semibold text-slate-400">
        &nbsp;
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-2 pb-16">
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

        {/* Main door, cut into the bottom wall */}
        <div className="absolute inset-x-0 -bottom-[2px] flex flex-col items-center">
          <span className="pb-0.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-600">
            {t("mainDoor")}
          </span>
          <MainDoorIcon />
        </div>
      </div>
    </div>
  );
}

// A doorway in plan view, drawn to sit on the stand's bottom wall: an opening
// masked out of the dashed wall, the door leaf swung inward, and its arc.
function MainDoorIcon() {
  const wall = "#475569"; // slate-600
  const bg = "#f8fafc"; // slate-50, same as the stand — masks the dashed wall
  return (
    <svg viewBox="0 0 56 34" className="h-[34px] w-14" aria-hidden>
      {/* punch the opening out of the box's dashed border */}
      <rect x="13" y="27" width="30" height="7" fill={bg} />
      {/* swing arc */}
      <path
        d="M16 6 A 24 24 0 0 1 40 30"
        fill="none"
        stroke={wall}
        strokeWidth="1.2"
        strokeDasharray="3 3"
        opacity="0.7"
      />
      {/* jambs either side of the opening */}
      <line x1="16" y1="27" x2="16" y2="33" stroke={wall} strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="27" x2="40" y2="33" stroke={wall} strokeWidth="2" strokeLinecap="round" />
      {/* door leaf, hinged at the left jamb, swung into the venue */}
      <line x1="16" y1="30" x2="16" y2="6" stroke={wall} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

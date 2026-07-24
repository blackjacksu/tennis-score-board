// Generates an 18×24in portrait wall poster showing the tournament's team
// format (every line, both players, NTRP) and the full round-robin match
// schedule with each match's start time and court. Reads straight from
// lib/demoData.ts and lib/schedule.ts (single sources of truth) — regenerate
// after any roster change with `npm run gen:poster`.
//
// Layout: the three teams sit side by side across the top so they can be
// compared at a glance, then each round's tie gets a full-width table stacked
// down the page — portrait has the height to spare, and the extra width lets
// pair names print large enough to read from across the room.
//
//   node scripts/print/gen-poster.mjs [outfile.pdf]
//
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { demoRoster, demoTeams, demoLines, demoMatches } from "../../lib/demoData.ts";
import { buildTimetable, formatClock } from "../../lib/schedule.ts";
import { createDoc, hex, readableText, pageDrawer } from "./pdfKit.mjs";
import { EVENT_NAME, EVENT_DATE } from "./config.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(
  __dir,
  "..",
  "..",
  process.argv[2] ?? "schedule-poster.pdf"
);

// 18×24in portrait poster, in points (72pt/in) — same sheet as before, turned.
const PAGE_W = 18 * 72;
const PAGE_H = 24 * 72;
const M = 48;
const GAP = 32;
const CONTENT_W = PAGE_W - 2 * M;

const teamById = new Map(demoTeams.map((t) => [t.id, t]));
const lineById = new Map(demoLines.map((l) => [l.id, l]));
const rosterByTeam = new Map(demoRoster.map((r) => [r.teamId, r]));

// Rebuild the round-robin schedule (one tie per round) from the flat matches
// list: group by round, keep each tie's team pair, and sort its lines by the
// line's sort_order so line 1 always leads.
const roundsMap = new Map();
for (const m of demoMatches) {
  if (!roundsMap.has(m.round)) {
    roundsMap.set(m.round, { round: m.round, teamAId: m.team_a_id, teamBId: m.team_b_id, matches: [] });
  }
  roundsMap.get(m.round).matches.push(m);
}
const rounds = [...roundsMap.values()].sort((a, b) => a.round - b.round);

// Start time per match, from the same timetable the live-score page renders, so
// the poster and the board can never disagree. Note the times are not monotonic
// down a round's Line 1..8 rows: the weakest lines go on court first, so Lines
// 8..3 share the earlier block and Lines 2..1 the later one.
const startByMatch = new Map();
for (const slot of buildTimetable(demoMatches, lineById)) {
  for (const m of slot.matches) startByMatch.set(m.id, slot.startMinutes);
}
for (const r of rounds) {
  r.matches.sort(
    (a, b) => (lineById.get(a.line_id)?.sort_order ?? 0) - (lineById.get(b.line_id)?.sort_order ?? 0)
  );
}

const { doc, font: F } = await createDoc();
const page = doc.addPage([PAGE_W, PAGE_H]);
const { text, w, right, centered, fitSize } = pageDrawer(page, F, PAGE_H);
const yb = (top) => PAGE_H - top;

// ---------------------------------------------------------------- Header ---
text(EVENT_NAME, { x: M, top: 60, size: 44, bold: true });
text("Team Format & Match Schedule", { x: M, top: 94, size: 20, c: hex("#64748b") });
const dateStr = `${EVENT_DATE}`;
text(dateStr, { x: PAGE_W - M - w(dateStr, 22), top: 60, size: 22, c: hex("#64748b") });

const headerBottom = 112;
page.drawLine({
  start: { x: M, y: yb(headerBottom) },
  end: { x: PAGE_W - M, y: yb(headerBottom) },
  thickness: 1.5,
  color: hex("#cbd5e1"),
});

// ------------------------------------------------------ Team format grid ---
const sectionTop = headerBottom + 30;
text("TEAM FORMAT", { x: M, top: sectionTop, size: 16, bold: true, c: hex("#334155") });

const colW = (CONTENT_W - 2 * GAP) / 3;
const teamTop = sectionTop + 26;
const bH = 48;
const rowH = 40;

demoTeams.forEach((team, ti) => {
  const roster = rosterByTeam.get(team.id);
  if (!roster) return;
  const colX = M + ti * (colW + GAP);
  const color = hex(team.color);
  const tColor = readableText(team.color);

  // Team banner
  page.drawRectangle({ x: colX, y: yb(teamTop + bH), width: colW, height: bH, color });
  text(`${team.name} — ${team.name_zh}`, { x: colX + 14, top: teamTop + 32, size: 20, c: tColor, bold: true });
  const total = roster.pairs.reduce((s, p) => s + p.combined, 0);
  const totalStr = `${total.toFixed(1)}`;
  text(totalStr, { x: colX + colW - 14 - w(totalStr, 20), top: teamTop + 32, size: 20, c: tColor, bold: true });

  // Captain line
  const capTop = teamTop + bH + 22;
  text(`Captain: ${roster.captainName}`, { x: colX, top: capTop, size: 12, c: hex("#64748b") });

  // Lines table
  const rowsTop = capTop + 16;
  const nameMaxW = colW - 20 - 40; // leave room for the rating on the right
  roster.pairs.forEach((pair, gi) => {
    const rTop = rowsTop + gi * rowH;
    if (gi % 2 === 0) {
      page.drawRectangle({ x: colX, y: yb(rTop + rowH), width: colW, height: rowH, color: hex("#fafafa") });
    }
    page.drawRectangle({ x: colX, y: yb(rTop + rowH), width: 3, height: rowH, color });

    text(pair.lineLabel, { x: colX + 12, top: rTop + 16, size: 12, bold: true, c: hex("#475569") });
    const names = pair.players
      .map((pl) => `${pl.name}${pl.name === roster.captainName ? " (C)" : ""} ${pl.ntrp.toFixed(1)}`)
      .join("   +   ");
    text(names, { x: colX + 12, top: rTop + 33, size: fitSize(names, nameMaxW, { max: 13, min: 8 }) });

    const ratingStr = pair.combined.toFixed(1);
    text(ratingStr, { x: colX + colW - 12 - w(ratingStr, 12), top: rTop + 16, size: 12, c: hex("#94a3b8") });

    page.drawLine({
      start: { x: colX, y: yb(rTop) },
      end: { x: colX + colW, y: yb(rTop) },
      thickness: 0.5,
      color: hex("#e2e8f0"),
    });
  });

  const tableBottom = rowsTop + roster.pairs.length * rowH;
  page.drawRectangle({
    x: colX,
    y: yb(tableBottom),
    width: colW,
    height: tableBottom - teamTop,
    borderColor: hex("#cbd5e1"),
    borderWidth: 1,
  });
});

const maxPairs = Math.max(...demoRoster.map((r) => r.pairs.length));
const teamSectionBottom = teamTop + bH + 22 + 16 + maxPairs * rowH;

// -------------------------------------------------------- Match schedule ---
const schedTop = teamSectionBottom + 40;
text("MATCH SCHEDULE", { x: M, top: schedTop, size: 16, bold: true, c: hex("#334155") });
page.drawLine({
  start: { x: M, y: yb(schedTop + 12) },
  end: { x: PAGE_W - M, y: yb(schedTop + 12) },
  thickness: 1,
  color: hex("#e2e8f0"),
});

// Each round is a full-width block stacked down the page.
const sBH = 40; // round banner height
const sHeadH = 30; // column-header strip under the banner
const sRowH = 30;
const ROUND_GAP = 26;

const COL = {
  line: { x: 0, w: CONTENT_W * 0.06 },
  pairA: { x: CONTENT_W * 0.06, w: CONTENT_W * 0.345 },
  vs: { x: CONTENT_W * 0.405, w: CONTENT_W * 0.03 },
  pairB: { x: CONTENT_W * 0.435, w: CONTENT_W * 0.345 },
  time: { x: CONTENT_W * 0.79, w: CONTENT_W * 0.115 },
  court: { x: CONTENT_W * 0.905, w: CONTENT_W * 0.095 },
};

rounds.forEach((r, ri) => {
  const teamA = teamById.get(r.teamAId);
  const teamB = teamById.get(r.teamBId);
  const blockH = sBH + sHeadH + r.matches.length * sRowH;
  const roundTop = schedTop + 34 + ri * (blockH + ROUND_GAP);

  // Round banner, split by team color
  const half = CONTENT_W / 2;
  page.drawRectangle({ x: M, y: yb(roundTop + sBH), width: half, height: sBH, color: hex(teamA.color) });
  page.drawRectangle({ x: M + half, y: yb(roundTop + sBH), width: half, height: sBH, color: hex(teamB.color) });
  const aLabel = `${teamA.name} — ${teamA.name_zh}`;
  const bLabel = `${teamB.name} — ${teamB.name_zh}`;
  text(aLabel, { x: M + half / 2 - w(aLabel, 18) / 2, top: roundTop + 27, size: 18, bold: true, c: readableText(teamA.color) });
  text(bLabel, { x: M + half + half / 2 - w(bLabel, 18) / 2, top: roundTop + 27, size: 18, bold: true, c: readableText(teamB.color) });
  const roundLabel = `Round ${r.round}`;
  text(roundLabel, { x: M, top: roundTop - 8, size: 11, bold: true, c: hex("#94a3b8") });

  // Header row
  const headTop = roundTop + sBH + 19;
  // No "Pair" header: the two-color banner above already names each side, and
  // the pairs are right/left aligned against the "vs" rather than one column.
  text("Line", { x: M + COL.line.x, top: headTop, size: 10, bold: true, c: hex("#94a3b8") });
  text("Start", { x: M + COL.time.x, top: headTop, size: 10, bold: true, c: hex("#94a3b8") });
  text("Court", { x: M + COL.court.x, top: headTop, size: 10, bold: true, c: hex("#94a3b8") });

  const rowsTop2 = roundTop + sBH + sHeadH;
  r.matches.forEach((m, mi) => {
    const rTop = rowsTop2 + mi * sRowH;
    const line = lineById.get(m.line_id);
    if (mi % 2 === 0) {
      page.drawRectangle({ x: M, y: yb(rTop + sRowH), width: CONTENT_W, height: sRowH, color: hex("#fafafa") });
    }
    const base = rTop + sRowH / 2 + 5;
    text(line?.label ?? "—", { x: M + COL.line.x, top: base, size: 13, bold: true });
    const pairA = m.pair_a ?? "";
    const pairB = m.pair_b ?? "";
    // Pair A is right-aligned and pair B left-aligned so "vs" reads as the
    // pivot between them, instead of A drifting off toward the Line column.
    right(pairA, M + COL.vs.x - 12, base, {
      size: fitSize(pairA, COL.pairA.w - 10, { max: 14, min: 9 }),
    });
    text("vs", { x: M + COL.vs.x, top: base, size: 10, c: hex("#cbd5e1") });
    text(pairB, { x: M + COL.pairB.x, top: base, size: fitSize(pairB, COL.pairB.w - 10, { max: 14, min: 9 }) });
    const start = startByMatch.get(m.id);
    text(start != null ? formatClock(start) : "—", {
      x: M + COL.time.x,
      top: base,
      size: 12,
      bold: true,
      c: hex("#334155"),
    });
    text(m.court ?? "___", { x: M + COL.court.x, top: base, size: 13, c: hex("#94a3b8") });

    page.drawLine({
      start: { x: M, y: yb(rTop) },
      end: { x: M + CONTENT_W, y: yb(rTop) },
      thickness: 0.5,
      color: hex("#e2e8f0"),
    });
  });

  page.drawRectangle({
    x: M,
    y: yb(roundTop + blockH),
    width: CONTENT_W,
    height: blockH,
    borderColor: hex("#cbd5e1"),
    borderWidth: 1,
  });
});

// Portrait leaves less width but more height than the old landscape sheet, so
// the stack has a real bottom. Shout rather than silently run off the page if
// the roster ever grows past what fits.
const contentBottom =
  schedTop +
  34 +
  rounds.reduce((s, r) => s + sBH + sHeadH + r.matches.length * sRowH, 0) +
  (rounds.length - 1) * ROUND_GAP;
if (contentBottom > PAGE_H - M) {
  console.warn(
    `Warning: content runs ${Math.ceil(contentBottom - (PAGE_H - M))}pt past the bottom margin. ` +
      `Reduce sRowH/rowH in ${"scripts/print/gen-poster.mjs"} or enlarge the page.`
  );
}

// ---------------------------------------------------------------- Footer ---
const footer = "Auto-generated from lib/demoData.ts — regenerate with `npm run gen:poster` after any roster change.";
text(footer, { x: M, top: PAGE_H - M + 20, size: 9, c: hex("#cbd5e1") });

const bytes = await doc.save();
writeFileSync(outPath, bytes);
console.log(`Wrote ${outPath} (${PAGE_W / 72}×${PAGE_H / 72}in, ${bytes.length} bytes)`);

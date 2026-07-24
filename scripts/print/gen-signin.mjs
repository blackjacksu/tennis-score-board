// Generates a printable PDF sign-in sheet — one page per team, listing every
// player with their line, doubles partner, NTRP, a check-in box and a signature
// line. Reads the roster straight from lib/demoData.ts (single source of truth).
//
//   node scripts/print/gen-signin.mjs [outfile.pdf]
//
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { demoRoster, demoTeams } from "../../lib/demoData.ts";
import { createDoc, hex, readableText, pageDrawer } from "./pdfKit.mjs";
import { EVENT_DATE } from "./config.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(
  __dir,
  "..",
  "..",
  process.argv[2] ?? "signin-sheet.pdf"
);

const PAGE_W = 612;
const PAGE_H = 792;
const M = 40;

const COLS = {
  line: { x: 40, w: 56 },
  player: { x: 96, w: 150 },
  ntrp: { x: 246, w: 46 },
  partner: { x: 292, w: 150 },
  check: { x: 442, w: 44 },
  sign: { x: 486, w: 86 },
};

const { doc, font: F } = await createDoc();

// y is measured from the top of the page for readability.
const yb = (top) => PAGE_H - top;

for (const team of demoTeams) {
  const roster = demoRoster.find((r) => r.teamId === team.id);
  if (!roster) continue;
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const color = hex(team.color);

  const { text, w, centered } = pageDrawer(page, F, PAGE_H);

  // Header
  text("TAA Tennis Team Tournament", { x: M, top: 52, size: 15, bold: true });
  text("Sign-in Sheet", { x: M, top: 70, size: 11, c: hex("#64748b") });
  const dateStr = `Date: ${EVENT_DATE}`;
  text(dateStr, { x: PAGE_W - M - w(dateStr, 10), top: 52, size: 10, c: hex("#64748b") });

  // Team banner
  const bTop = 84;
  const bH = 46;
  page.drawRectangle({
    x: M,
    y: yb(bTop + bH),
    width: PAGE_W - 2 * M,
    height: bH,
    color,
  });
  const tColor = readableText(team.color);
  text(`${team.name} — ${team.name_zh}`, {
    x: M + 16,
    top: bTop + 30,
    size: 20,
    c: tColor,
    bold: true,
  });
  // Checked-in counter on the right of the banner
  const players = roster.pairs.length * 2;
  const counter = `Checked in:  ______ / ${players}`;
  text(counter, {
    x: PAGE_W - M - 16 - w(counter, 12),
    top: bTop + 30,
    size: 12,
    c: tColor,
  });

  // Meta line
  const total = roster.pairs.reduce((s, p) => s + p.combined, 0);
  text(
    `Captain: ${roster.captainName}     Players: ${players}     Team NTRP: ${total.toFixed(1)}`,
    { x: M, top: bTop + bH + 22, size: 10, c: hex("#475569") }
  );

  // Table header
  const tableTop = bTop + bH + 40; // 210
  const headH = 22;
  page.drawRectangle({
    x: M,
    y: yb(tableTop + headH),
    width: PAGE_W - 2 * M,
    height: headH,
    color: hex("#f1f5f9"),
  });
  const headBase = tableTop + 15;
  text("Line", { x: COLS.line.x + 6, top: headBase, size: 9, bold: true, c: hex("#475569") });
  text("Player", { x: COLS.player.x + 6, top: headBase, size: 9, bold: true, c: hex("#475569") });
  centered("NTRP", COLS.ntrp, headBase, { size: 9, bold: true, c: hex("#475569") });
  text("Doubles partner", { x: COLS.partner.x + 6, top: headBase, size: 9, bold: true, c: hex("#475569") });
  centered("Check-in", COLS.check, headBase, { size: 9, bold: true, c: hex("#475569") });
  text("Signature", { x: COLS.sign.x + 6, top: headBase, size: 9, bold: true, c: hex("#475569") });

  // Rows: two players per line
  const rowH = 32;
  const rowsTop = tableTop + headH;
  roster.pairs.forEach((pair, gi) => {
    const groupTop = rowsTop + gi * 2 * rowH;
    // Alternate group shading
    if (gi % 2 === 0) {
      page.drawRectangle({
        x: M,
        y: yb(groupTop + 2 * rowH),
        width: PAGE_W - 2 * M,
        height: 2 * rowH,
        color: hex("#fafafa"),
      });
    }
    // Group separator (thicker) at the top of each line group
    page.drawLine({
      start: { x: M, y: yb(groupTop) },
      end: { x: PAGE_W - M, y: yb(groupTop) },
      thickness: 1,
      color: hex("#cbd5e1"),
    });
    // Left accent bar in team color for the whole line group
    page.drawRectangle({
      x: M,
      y: yb(groupTop + 2 * rowH),
      width: 4,
      height: 2 * rowH,
      color,
    });

    // Line label + combined rating, vertically centered across the two rows
    centered(pair.lineLabel, COLS.line, groupTop + rowH - 6, { size: 10, bold: true });
    centered(`${pair.combined.toFixed(1)}`, COLS.line, groupTop + rowH + 8, {
      size: 8,
      c: hex("#94a3b8"),
    });

    pair.players.forEach((pl, pi) => {
      const rowTop = groupTop + pi * rowH;
      const base = rowTop + rowH / 2 + 3;
      const partner = pair.players[1 - pi].name;
      const isCap = pl.name === roster.captainName;

      // thin divider between the two players of a line
      if (pi === 1) {
        page.drawLine({
          start: { x: COLS.player.x, y: yb(rowTop) },
          end: { x: PAGE_W - M, y: yb(rowTop) },
          thickness: 0.5,
          color: hex("#e2e8f0"),
        });
      }

      text(pl.name, { x: COLS.player.x + 6, top: base, size: 11, bold: true });
      if (isCap) {
        const nameW = w(pl.name, 11);
        text("(C)", {
          x: COLS.player.x + 6 + nameW + 5,
          top: base,
          size: 8,
          c: color,
          bold: true,
        });
      }
      centered(pl.ntrp.toFixed(1), COLS.ntrp, base, { size: 10, c: hex("#475569") });
      text(partner, { x: COLS.partner.x + 6, top: base, size: 10, c: hex("#334155") });

      // Check-in box
      const boxSize = 15;
      page.drawRectangle({
        x: COLS.check.x + (COLS.check.w - boxSize) / 2,
        y: yb(rowTop + rowH / 2 + boxSize / 2),
        width: boxSize,
        height: boxSize,
        borderColor: hex("#94a3b8"),
        borderWidth: 1.2,
      });
      // Signature line
      page.drawLine({
        start: { x: COLS.sign.x + 4, y: yb(rowTop + rowH - 8) },
        end: { x: PAGE_W - M - 4, y: yb(rowTop + rowH - 8) },
        thickness: 0.6,
        color: hex("#cbd5e1"),
      });
    });
  });

  // Table outer border
  const tableBottom = rowsTop + roster.pairs.length * 2 * rowH;
  page.drawRectangle({
    x: M,
    y: yb(tableBottom),
    width: PAGE_W - 2 * M,
    height: tableBottom - tableTop,
    borderColor: hex("#cbd5e1"),
    borderWidth: 1,
  });

  // Footer
  text(
    "Tick the box and sign when the player arrives.  (C) = Team Captain.",
    { x: M, top: tableBottom + 24, size: 8, c: hex("#94a3b8") }
  );
  const pageLabel = `${team.name} Team`;
  text(pageLabel, {
    x: PAGE_W - M - w(pageLabel, 8),
    top: tableBottom + 24,
    size: 8,
    c: hex("#94a3b8"),
  });
}

const bytes = await doc.save();
writeFileSync(outPath, bytes);
console.log(`Wrote ${outPath} (${doc.getPageCount()} pages, ${bytes.length} bytes)`);

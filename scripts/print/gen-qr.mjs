// Generates a printable US Letter page with one large QR code pointing at the
// live scoreboard — for taping to a wall, the net post, or the check-in table
// where spectators can scan it from a few feet away.
//
//   node scripts/print/gen-qr.mjs [outfile.pdf]
//   BASE_URL=https://example.com node scripts/print/gen-qr.mjs
//
// The QR matrix comes from qrcode.react (the same encoder the /qr page uses in
// the browser), rendered to SVG here and redrawn as PDF rectangles, so the
// printed code and the on-screen one can never disagree.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { createDoc, hex, pageDrawer } from "./pdfKit.mjs";
import { EVENT_NAME, EVENT_NAME_ZH, EVENT_DATE, BASE_URL } from "./config.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dir, "..", "..", process.argv[2] ?? "qr-scoreboard.pdf");

const PAGE_W = 612; // US Letter portrait, in points
const PAGE_H = 792;

// Error correction "H" (~30% recoverable) so the code still scans with a
// thumbprint, a fold, or a bit of tape across it. The URL is short enough that
// the matrix stays coarse — big modules read from further away.
const EC_LEVEL = "H";
// Four modules of quiet zone, per the QR spec — scanners need the white border.
const QUIET_MODULES = 4;

/**
 * Dark-module runs of the QR for `value`, as {x, y, len} in module units,
 * plus the total grid size (including the quiet zone).
 *
 * qrcode.react emits one path of "M{x} {y}h{len}v1H{x}z" runs. We re-parse it
 * rather than reimplementing an encoder, and assert that every byte of the path
 * was consumed — if the library ever changes its path grammar this throws
 * instead of silently printing a corrupt code.
 */
function qrRuns(value) {
  const svg = renderToStaticMarkup(
    createElement(QRCodeSVG, {
      value,
      size: 100, // irrelevant; we read the viewBox, which is in module units
      level: EC_LEVEL,
      marginSize: QUIET_MODULES,
    })
  );

  const viewBox = svg.match(/viewBox="0 0 (\d+) \1"/);
  if (!viewBox) throw new Error(`Unexpected QR viewBox in: ${svg.slice(0, 120)}`);
  const grid = Number(viewBox[1]);

  const dark = svg.match(/fill="#000000"\s+d="([^"]+)"/);
  if (!dark) throw new Error("No dark-module path in the rendered QR SVG");
  const d = dark[1];

  const runRe = /M(\d+)[ ,](\d+)\s?h(\d+)v1H\1z/g;
  const runs = [];
  let consumed = 0;
  for (const m of d.matchAll(runRe)) {
    runs.push({ x: Number(m[1]), y: Number(m[2]), len: Number(m[3]) });
    consumed += m[0].length;
  }
  if (consumed !== d.length) {
    throw new Error(
      `QR path only ${consumed}/${d.length} chars parsed — qrcode.react changed its path format, update qrRuns()`
    );
  }
  if (!runs.length) throw new Error("QR parsed to zero dark modules");
  return { runs, grid };
}

const url = BASE_URL.replace(/\/+$/, "");
const { runs, grid } = qrRuns(url);

const { doc, font: F } = await createDoc();
const page = doc.addPage([PAGE_W, PAGE_H]);
const { yb, text, w, fitSize } = pageDrawer(page, F, PAGE_H);

const ink = hex("#0f172a");
const muted = hex("#64748b");
const faint = hex("#94a3b8");

// Faux-bold that scales with the type size — pdfKit embeds a single weight, so
// heavy display text is built by overdrawing.
function heading(s, { top, size, c = ink }) {
  const x = (PAGE_W - w(s, size)) / 2;
  const step = size / 90;
  for (const dx of [0, step, step * 2]) {
    for (const dy of [0, step]) {
      page.drawText(s, { x: x + dx, y: yb(top) - dy, size, font: F, color: c });
    }
  }
}

// Centered on the page width (pdfKit's own `centered` centers within a column).
const centered = (s, o) => text(s, { x: (PAGE_W - w(s, o.size ?? 10)) / 2, ...o });

// Header
centered(EVENT_NAME, { top: 76, size: 17, c: ink });
centered(`${EVENT_NAME_ZH}  ·  ${EVENT_DATE}`, { top: 98, size: 11, c: muted });

// Call to action
heading("LIVE SCORES", { top: 156, size: 40 });
heading("即時比分", { top: 196, size: 26, c: hex("#334155") });

// QR card
const CARD = 400;
const cardX = (PAGE_W - CARD) / 2;
const cardTop = 232;
page.drawRectangle({
  x: cardX,
  y: yb(cardTop + CARD),
  width: CARD,
  height: CARD,
  color: hex("#ffffff"),
  borderColor: hex("#e2e8f0"),
  borderWidth: 1.5,
});

// The modules, drawn to fill the card exactly (quiet zone included in `grid`).
const mod = CARD / grid;
for (const { x, y, len } of runs) {
  page.drawRectangle({
    x: cardX + x * mod,
    y: yb(cardTop + (y + 1) * mod),
    width: len * mod,
    height: mod,
    color: hex("#000000"),
  });
}

// URL, shrunk to fit if it is long
const urlTop = cardTop + CARD + 34;
const urlSize = fitSize(url, PAGE_W - 120, { max: 15, min: 8 });
centered(url, { top: urlTop, size: urlSize, c: hex("#334155") });

// Instructions
centered("Point your phone camera at the code — no app needed.", {
  top: urlTop + 30,
  size: 12,
  c: muted,
});
centered("用手機相機對準即可掃描，免安裝 App。", {
  top: urlTop + 50,
  size: 12,
  c: muted,
});

centered(`${EVENT_NAME}  ·  ${EVENT_DATE}`, {
  top: PAGE_H - 44,
  size: 9,
  c: faint,
});

const bytes = await doc.save();
writeFileSync(outPath, bytes);
console.log(
  `Wrote ${outPath} (${grid}×${grid} modules, EC ${EC_LEVEL}, -> ${url}, ${bytes.length} bytes)`
);

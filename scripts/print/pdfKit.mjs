// Shared PDF drawing helpers for the print-material generators in this
// folder (gen-signin.mjs, gen-poster.mjs). Centralizes the bits they'd
// otherwise duplicate: Unicode font loading, color parsing, contrast text
// color, and a per-page "measure from the top" text-drawing helper.
import { readFileSync, existsSync } from "node:fs";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// Full-Unicode font so Chinese names (e.g. 楊之安) render correctly. Override
// with FONT_PATH=/path/to/font.ttf if none of these exist on your system.
const FONT_CANDIDATES = [
  process.env.FONT_PATH,
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/Library/Fonts/Arial Unicode.ttf",
  "/System/Library/Fonts/PingFang.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
].filter(Boolean);

function findUnicodeFont() {
  const found = FONT_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    console.error(
      "No Unicode/CJK font found. Set FONT_PATH=/path/to/font.ttf and re-run."
    );
    process.exit(1);
  }
  return found;
}

export async function createDoc() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(readFileSync(findUnicodeFont()), {
    subset: true,
  });
  return { doc, font };
}

export function hex(h) {
  const c = h.replace("#", "");
  return rgb(
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255
  );
}

// Dark text on light backgrounds (e.g. yellow team banner), white on dark.
export function readableText(h) {
  const c = h.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? hex("#1c1917") : rgb(1, 1, 1);
}

// Binds text-drawing helpers to one page, measuring `top` down from the
// page's top edge (easier to lay out than pdf-lib's bottom-up y coordinate).
export function pageDrawer(page, font, pageHeight) {
  const yb = (top) => pageHeight - top;
  const text = (s, { x, top, size = 10, c = hex("#1c1917"), bold = false }) => {
    page.drawText(s, { x, y: yb(top), size, font, color: c });
    if (bold) page.drawText(s, { x: x + 0.35, y: yb(top), size, font, color: c });
  };
  const w = (s, size) => font.widthOfTextAtSize(s, size);
  const centered = (s, col, top, o = {}) =>
    text(s, { x: col.x + (col.w - w(s, o.size ?? 10)) / 2, top, ...o });
  const right = (s, xEnd, top, o = {}) =>
    text(s, { x: xEnd - w(s, o.size ?? 10), top, ...o });
  // Shrinks from `max` down to `min` until the string fits maxWidth, so long
  // player names never overrun a fixed-width column.
  const fitSize = (s, maxWidth, { max = 14, min = 7 } = {}) => {
    let size = max;
    while (size > min && w(s, size) > maxWidth) size -= 0.5;
    return size;
  };
  return { yb, text, w, centered, right, fitSize };
}

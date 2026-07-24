// Generates supabase/seed.sql and supabase/players_import.sql straight from
// lib/demoData.ts — the single source of truth for the roster. Whenever the
// roster changes there, re-run this so the database seed can't drift:
//
//   npm run gen:seed
//
// Then paste the two files into the Supabase SQL Editor (schema.sql first).
// Nothing here is hand-edited; the only place the roster lives is demoData.ts.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  demoTeams,
  demoLines,
  demoRoster,
  demoMatches,
} from "../lib/demoData.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const supa = (name) => resolve(__dir, "..", "supabase", name);

// Display width so CJK names (2 cells wide) still align; pad OUTSIDE the quotes.
const dw = (s) => [...s].reduce((w, c) => w + (c.charCodeAt(0) > 127 ? 2 : 1), 0);
const q = (s, width = 0) => `'${s}'` + " ".repeat(Math.max(0, width - dw(s)));

const teamById = new Map(demoTeams.map((t) => [t.id, t]));
const lineById = new Map(demoLines.map((l) => [l.id, l]));
const lines = [...demoLines].sort((a, b) => a.sort_order - b.sort_order);

// ── Sanity checks: catch a broken roster before it reaches the database ──
const players = demoRoster.flatMap((r) =>
  r.pairs.flatMap((p) => p.players.map((pl) => ({ ...pl, teamId: r.teamId })))
);
const seen = new Map();
for (const p of players) seen.set(p.name, (seen.get(p.name) ?? 0) + 1);
const doubles = [...seen].filter(([, n]) => n > 1).map(([n]) => n);
for (const r of demoRoster) {
  if (r.pairs.length !== demoLines.length) {
    throw new Error(
      `Team ${r.teamId} has ${r.pairs.length} pairs but there are ${demoLines.length} lines`
    );
  }
}

// ── seed.sql ──
const teamsSql = demoTeams
  .map((t) => `  ('${t.name}', '${t.name_zh}', '${t.color}')`)
  .join(",\n");
const linesSql = lines
  .map((l) => `  ('${l.label}', '${l.ntrp}', ${l.sort_order})`)
  .join(",\n");

const sorted = [...demoMatches].sort(
  (a, b) =>
    a.round - b.round ||
    lineById.get(a.line_id).sort_order - lineById.get(b.line_id).sort_order
);
const pairW = Math.max(...demoMatches.flatMap((m) => [dw(m.pair_a ?? ""), dw(m.pair_b ?? "")]));
const matchRows = [];
let round = null;
for (const m of sorted) {
  if (m.round !== round) {
    round = m.round;
    const a = teamById.get(m.team_a_id);
    const b = teamById.get(m.team_b_id);
    matchRows.push(
      `  -- round ${round}: ${a.name} (${a.id}) vs ${b.name} (${b.id})`
    );
  }
  const sort = lineById.get(m.line_id).sort_order;
  matchRows.push(
    `  (${sort}, ${m.team_a_id}, ${m.team_b_id}, ${q(m.pair_a ?? "", pairW)}, ${q(m.pair_b ?? "", pairW)}, ${m.round}),`
  );
}
// drop the trailing comma on the final data row
const lastRow = matchRows.length - 1;
matchRows[lastRow] = matchRows[lastRow].replace(/,\s*$/, "");

const seedSql = `-- 2026 TAA Tennis Event seed: ${demoTeams.length} teams, ${demoLines.length} lines,
-- round-robin ties => ${demoMatches.length} matches.
-- GENERATED from lib/demoData.ts by scripts/gen-seed.mjs — do not edit by hand.
-- Run AFTER schema.sql in the Supabase SQL Editor, then run players_import.sql.
-- Re-runnable: clears existing rows first.

truncate matches, players, lines, teams restart identity cascade;

insert into teams (name, name_zh, color) values
${teamsSql};

insert into lines (label, ntrp, sort_order) values
${linesSql};

insert into matches (line_id, team_a_id, team_b_id, pair_a, pair_b, round)
select l.id, m.team_a_id, m.team_b_id, m.pair_a, m.pair_b, m.round
from (values
${matchRows.join("\n")}
) as m(sort_order, team_a_id, team_b_id, pair_a, pair_b, round)
join lines l on l.sort_order = m.sort_order;
`;
writeFileSync(supa("seed.sql"), seedSql);

// ── players_import.sql ──
const nameW = Math.max(...players.map((p) => dw(p.name)));
const teamW = Math.max(...demoTeams.map((t) => dw(t.name)));
const playerLines = [];
const rosterByTeam = new Map(demoRoster.map((r) => [r.teamId, r]));
for (const team of demoTeams) {
  const r = rosterByTeam.get(team.id);
  playerLines.push(
    `  -- ===== ${team.name.toUpperCase()} (${team.name_zh}) — captain ${r.captainName} =====`
  );
  r.pairs.forEach((pair, i) => {
    for (const pl of pair.players) {
      playerLines.push(
        `  (${q(team.name, teamW)}, ${q(pl.name, nameW)}, ${pl.ntrp.toFixed(1)}),  -- ${pair.lineLabel}`
      );
    }
  });
}
// drop the trailing comma on the final data row (before its inline comment)
const li = playerLines.length - 1;
playerLines[li] = playerLines[li].replace(/\),(\s+-- )/, ")$1");

const importSql = `-- 2026 TAA Tennis Event — player roster import (${players.length} players).
-- GENERATED from lib/demoData.ts by scripts/gen-seed.mjs — do not edit by hand.
-- Run AFTER schema.sql and seed.sql. Team resolved by NAME (survives re-seed).

insert into players (team_id, name, ntrp)
select t.id, v.name, v.ntrp
from (values
${playerLines.join("\n")}
) as v(team_name, name, ntrp)
join teams t on t.name = v.team_name;
`;
writeFileSync(supa("players_import.sql"), importSql);

console.log(
  `Generated supabase/seed.sql + players_import.sql from lib/demoData.ts\n` +
    `  ${demoTeams.length} teams · ${demoLines.length} lines · ${demoMatches.length} matches · ${players.length} players` +
    (doubles.length ? `\n  double-duty players: ${doubles.join(", ")}` : "")
);

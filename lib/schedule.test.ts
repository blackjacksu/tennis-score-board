import { describe, expect, it } from "vitest";
import { demoLines, demoMatches } from "./demoData";
import {
  ANCHOR_TEAM_ID,
  FIRST_SERVE_MINUTES,
  MATCH_MINUTES,
  PARALLEL_MATCHES,
  buildTimetable,
  formatClock,
} from "./schedule";
import type { Line, Match } from "./types";

const lineById = new Map(demoLines.map((l) => [l.id, l]));
const RED = 1;
const GREEN = 2;
const teamsIn = (m: Match) => [m.team_a_id, m.team_b_id];

describe("formatClock", () => {
  it("renders the 9:15am first serve", () => {
    expect(formatClock(FIRST_SERVE_MINUTES)).toBe("9:15 AM");
  });

  it("pads minutes and crosses into the afternoon", () => {
    expect(formatClock(9 * 60 + 45)).toBe("9:45 AM");
    expect(formatClock(12 * 60)).toBe("12:00 PM");
    expect(formatClock(12 * 60 + 45)).toBe("12:45 PM");
    expect(formatClock(13 * 60 + 30)).toBe("1:30 PM");
  });

  it("treats midnight as 12 AM, not 0", () => {
    expect(formatClock(0)).toBe("12:00 AM");
  });
});

describe("buildTimetable (anchor schedule)", () => {
  const slots = buildTimetable(demoMatches, lineById);
  const flat = slots.flatMap((s) => s.matches);

  it("schedules every match exactly once", () => {
    const ids = flat.map((a) => a.match.id);
    expect(ids).toHaveLength(demoMatches.length);
    expect(new Set(ids).size).toBe(demoMatches.length);
  });

  it("never puts more matches on court than there are courts", () => {
    for (const s of slots) {
      expect(s.matches.length).toBeLessThanOrEqual(PARALLEL_MATCHES);
    }
  });

  it("assigns distinct real courts within a block", () => {
    for (const s of slots) {
      const courts = s.matches.map((a) => a.court);
      expect(new Set(courts).size).toBe(courts.length);
      for (const c of courts) expect(c).toBeGreaterThanOrEqual(1);
    }
  });

  it("starts at first serve and advances one match length per slot", () => {
    slots.forEach((s, i) => {
      expect(s.startMinutes).toBe(FIRST_SERVE_MINUTES + i * MATCH_MINUTES);
      expect(s.endMinutes - s.startMinutes).toBe(MATCH_MINUTES);
    });
  });

  it("keeps the anchor team on court until its matches run out", () => {
    // The anchor plays 16 of the 24 matches, so it is on court every block for
    // the first few blocks — never absent while it still has matches left.
    let anchorRemaining = demoMatches.filter((m) =>
      teamsIn(m).includes(ANCHOR_TEAM_ID)
    ).length;
    for (const s of slots) {
      const anchorHere = s.matches.filter((a) =>
        teamsIn(a.match).includes(ANCHOR_TEAM_ID)
      ).length;
      if (anchorRemaining > 0) expect(anchorHere).toBeGreaterThan(0);
      anchorRemaining -= anchorHere;
    }
  });

  it("opens with the anchor's lowest lines: 3 vs Red on courts 1-3, 3 vs Green on 4-6", () => {
    const first = slots[0].matches;
    expect(first).toHaveLength(PARALLEL_MATCHES);
    // Every opening match involves the anchor (Yellow).
    for (const a of first) {
      expect(teamsIn(a.match)).toContain(ANCHOR_TEAM_ID);
    }
    const byCourt = new Map(first.map((a) => [a.court, a.match]));
    // Courts 1-3 are anchor vs Red (earlier round), 4-6 anchor vs Green.
    for (const c of [1, 2, 3]) expect(teamsIn(byCourt.get(c)!)).toContain(RED);
    for (const c of [4, 5, 6]) expect(teamsIn(byCourt.get(c)!)).toContain(GREEN);
    // …and courts 1-3 are the anchor's three weakest lines (sort_order 8,7,6).
    const linesVsRed = [1, 2, 3].map(
      (c) => lineById.get(byCourt.get(c)!.line_id)!.sort_order
    );
    expect(new Set(linesVsRed)).toEqual(new Set([8, 7, 6]));
  });

  it("never has one player on two courts at once", () => {
    for (const s of slots) {
      const playing: string[] = [];
      for (const { match } of s.matches) {
        for (const pair of [match.pair_a, match.pair_b]) {
          if (pair) playing.push(...pair.split(" / ").map((n) => n.trim()));
        }
      }
      expect(new Set(playing).size).toBe(playing.length);
    }
  });

  it("finishes earlier than running the three ties one after another", () => {
    // Sequential would be 3 ties x 2 blocks = 6 blocks; anchoring packs tighter.
    expect(slots.length).toBeLessThan(6);
  });
});

describe("buildTimetable (fallback)", () => {
  it("falls back to sequential line order for a single-round fixture", () => {
    const stripped: Match[] = demoMatches
      .filter((m) => m.round === 1)
      .map((m) => ({ ...m, rating_a: null, rating_b: null }));
    const result = buildTimetable(stripped, lineById);
    const order = result.flatMap((s) =>
      s.matches.map((a) => lineById.get(a.match.line_id)!.sort_order)
    );
    // Line 8 (weakest) first, working up to Line 1.
    expect(order).toEqual([...order].sort((a, b) => b - a));
  });

  it("handles an empty fixture list", () => {
    expect(buildTimetable([], new Map<number, Line>())).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { demoLines, demoMatches } from "./demoData";
import {
  FIRST_SERVE_MINUTES,
  MATCH_MINUTES,
  PARALLEL_MATCHES,
  buildTimetable,
  formatClock,
} from "./schedule";
import type { Line, Match } from "./types";

const lineById = new Map(demoLines.map((l) => [l.id, l]));

describe("formatClock", () => {
  it("renders the 9am first serve", () => {
    expect(formatClock(FIRST_SERVE_MINUTES)).toBe("9:00 AM");
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

describe("buildTimetable", () => {
  const slots = buildTimetable(demoMatches, lineById);

  it("schedules every match exactly once", () => {
    const ids = slots.flatMap((s) => s.matches.map((m) => m.id));
    expect(ids).toHaveLength(demoMatches.length);
    expect(new Set(ids).size).toBe(demoMatches.length);
  });

  it("never puts more matches on court than there are courts", () => {
    for (const s of slots) {
      expect(s.matches.length).toBeLessThanOrEqual(PARALLEL_MATCHES);
    }
  });

  it("keeps each slot within a single round, and rounds in order", () => {
    for (const s of slots) {
      expect(new Set(s.matches.map((m) => m.round)).size).toBe(1);
    }
    const rounds = slots.map((s) => s.round);
    expect(rounds).toEqual([...rounds].sort((a, b) => a - b));
  });

  it("starts at 9:00 AM and advances one match length per slot", () => {
    slots.forEach((s, i) => {
      expect(s.startMinutes).toBe(FIRST_SERVE_MINUTES + i * MATCH_MINUTES);
      expect(s.endMinutes - s.startMinutes).toBe(MATCH_MINUTES);
    });
  });

  it("runs the weakest lines first within a round", () => {
    const firstRound = slots.filter((s) => s.round === slots[0].round);
    const ratings = firstRound.flatMap((s) =>
      s.matches.map((m) => (m.rating_a ?? 0) + (m.rating_b ?? 0))
    );
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
  });

  it("never has one player on two courts at once", () => {
    for (const s of slots) {
      const playing: string[] = [];
      for (const m of s.matches) {
        for (const pair of [m.pair_a, m.pair_b]) {
          if (pair) playing.push(...pair.split(" / ").map((n) => n.trim()));
        }
      }
      expect(new Set(playing).size).toBe(playing.length);
    }
  });

  it("falls back to line order when rows carry no ratings", () => {
    const stripped: Match[] = demoMatches
      .filter((m) => m.round === 1)
      .map((m) => ({ ...m, rating_a: null, rating_b: null }));
    const result = buildTimetable(stripped, lineById);
    const order = result.flatMap((s) =>
      s.matches.map((m) => lineById.get(m.line_id)!.sort_order)
    );
    // Line 8 (weakest) first, working up to Line 1.
    expect(order).toEqual([...order].sort((a, b) => b - a));
  });

  it("handles an empty fixture list", () => {
    expect(buildTimetable([], new Map<number, Line>())).toEqual([]);
  });
});

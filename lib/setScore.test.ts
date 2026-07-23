import { describe, it, expect } from "vitest";
import { classifySetScore, isValidSetScore, type SetState } from "./setScore";

type Case = { a: number; b: number; state: SetState; note?: string };

// 100-case test plan for the admin score input (single 6-game tennis set).
// state legend: "final" = completed set · "in_progress" = legal mid-set ·
// "invalid" = must be rejected by the admin score action.
const cases: Case[] = [
  // ───────────────────────── In-range grid: a = 0 ─────────────────────────
  { a: 0, b: 0, state: "in_progress", note: "start of set" },
  { a: 0, b: 1, state: "in_progress" },
  { a: 0, b: 2, state: "in_progress" },
  { a: 0, b: 3, state: "in_progress" },
  { a: 0, b: 4, state: "in_progress" },
  { a: 0, b: 5, state: "in_progress" },
  { a: 0, b: 6, state: "final", note: "6-0 bagel" },
  { a: 0, b: 7, state: "invalid", note: "7 needs opponent on 5 or 6" },
  // a = 1
  { a: 1, b: 0, state: "in_progress" },
  { a: 1, b: 1, state: "in_progress" },
  { a: 1, b: 2, state: "in_progress" },
  { a: 1, b: 3, state: "in_progress" },
  { a: 1, b: 4, state: "in_progress" },
  { a: 1, b: 5, state: "in_progress" },
  { a: 1, b: 6, state: "final", note: "6-1" },
  { a: 1, b: 7, state: "invalid" },
  // a = 2
  { a: 2, b: 0, state: "in_progress" },
  { a: 2, b: 1, state: "in_progress" },
  { a: 2, b: 2, state: "in_progress" },
  { a: 2, b: 3, state: "in_progress" },
  { a: 2, b: 4, state: "in_progress" },
  { a: 2, b: 5, state: "in_progress" },
  { a: 2, b: 6, state: "final", note: "6-2" },
  { a: 2, b: 7, state: "invalid" },
  // a = 3
  { a: 3, b: 0, state: "in_progress" },
  { a: 3, b: 1, state: "in_progress" },
  { a: 3, b: 2, state: "in_progress" },
  { a: 3, b: 3, state: "in_progress" },
  { a: 3, b: 4, state: "in_progress" },
  { a: 3, b: 5, state: "in_progress" },
  { a: 3, b: 6, state: "final", note: "6-3" },
  { a: 3, b: 7, state: "invalid" },
  // a = 4
  { a: 4, b: 0, state: "in_progress" },
  { a: 4, b: 1, state: "in_progress" },
  { a: 4, b: 2, state: "in_progress" },
  { a: 4, b: 3, state: "in_progress" },
  { a: 4, b: 4, state: "in_progress" },
  { a: 4, b: 5, state: "in_progress" },
  { a: 4, b: 6, state: "final", note: "6-4" },
  { a: 4, b: 7, state: "invalid" },
  // a = 5
  { a: 5, b: 0, state: "in_progress" },
  { a: 5, b: 1, state: "in_progress" },
  { a: 5, b: 2, state: "in_progress" },
  { a: 5, b: 3, state: "in_progress" },
  { a: 5, b: 4, state: "in_progress", note: "serving for the set" },
  { a: 5, b: 5, state: "in_progress" },
  { a: 5, b: 6, state: "in_progress", note: "6-5, not won yet" },
  { a: 5, b: 7, state: "final", note: "7-5" },
  // a = 6
  { a: 6, b: 0, state: "final", note: "6-0" },
  { a: 6, b: 1, state: "final" },
  { a: 6, b: 2, state: "final" },
  { a: 6, b: 3, state: "final" },
  { a: 6, b: 4, state: "final", note: "6-4" },
  { a: 6, b: 5, state: "in_progress", note: "6-5, play on to 7-5 or 6-6" },
  { a: 6, b: 6, state: "in_progress", note: "6-6 → tiebreak" },
  { a: 6, b: 7, state: "final", note: "6-7 (lost the tiebreak)" },
  // a = 7
  { a: 7, b: 0, state: "invalid", note: "can't reach 7 while opponent ≤ 4" },
  { a: 7, b: 1, state: "invalid" },
  { a: 7, b: 2, state: "invalid" },
  { a: 7, b: 3, state: "invalid" },
  { a: 7, b: 4, state: "invalid" },
  { a: 7, b: 5, state: "final", note: "7-5" },
  { a: 7, b: 6, state: "final", note: "7-6 tiebreak" },
  { a: 7, b: 7, state: "invalid", note: "no 7-7 in a 6-game set" },

  // ───────────────────── Out of range (games > 7) ─────────────────────
  { a: 10, b: 4, state: "invalid", note: "example: 10:4" },
  { a: 8, b: 6, state: "invalid" },
  { a: 9, b: 9, state: "invalid" },
  { a: 8, b: 0, state: "invalid" },
  { a: 0, b: 8, state: "invalid" },
  { a: 8, b: 8, state: "invalid" },
  { a: 12, b: 5, state: "invalid" },
  { a: 15, b: 3, state: "invalid" },
  { a: 100, b: 0, state: "invalid", note: "extreme upper bound" },
  { a: 0, b: 99, state: "invalid", note: "old 0-99 cap would have passed this" },
  { a: 8, b: 10, state: "invalid" },
  { a: 6, b: 8, state: "invalid" },
  { a: 9, b: 7, state: "invalid", note: "just over the ceiling" },
  { a: 7, b: 9, state: "invalid" },
  { a: 20, b: 18, state: "invalid" },
  { a: 11, b: 5, state: "invalid" },
  { a: 13, b: 11, state: "invalid" },
  { a: 8, b: 7, state: "invalid", note: "boundary 8 vs legal 7" },
  { a: 7, b: 8, state: "invalid" },
  { a: 10, b: 10, state: "invalid" },

  // ───────────────────────── Negative games ─────────────────────────
  { a: 11, b: -3, state: "invalid", note: "example: 11:-3" },
  { a: -1, b: 0, state: "invalid" },
  { a: 0, b: -1, state: "invalid" },
  { a: -2, b: -2, state: "invalid" },
  { a: 5, b: -1, state: "invalid" },
  { a: -6, b: 4, state: "invalid" },
  { a: 3, b: -7, state: "invalid" },
  { a: -1, b: -1, state: "invalid" },
  { a: -5, b: -5, state: "invalid" },
  { a: 6, b: -2, state: "invalid", note: "6 looks like a win but -2 is illegal" },
  { a: -3, b: 6, state: "invalid" },
  { a: -10, b: 10, state: "invalid" },

  // ─────────────────────── Non-integer games ───────────────────────
  { a: 6.5, b: 4, state: "invalid", note: "fractional game" },
  { a: 3, b: 2.5, state: "invalid" },
  { a: 7.1, b: 5, state: "invalid" },
  { a: 0.5, b: 0.5, state: "invalid" },
];

describe("classifySetScore — 6-game set score input (100-case plan)", () => {
  it("has exactly 100 test cases", () => {
    expect(cases).toHaveLength(100);
  });

  it.each(cases)("$a-$b → $state", ({ a, b, state }) => {
    expect(classifySetScore(a, b).state).toBe(state);
  });

  it("valid flag is the inverse of the invalid state, for every case", () => {
    for (const { a, b, state } of cases) {
      expect(isValidSetScore(a, b)).toBe(state !== "invalid");
    }
  });

  it("attaches a reason to every rejected score", () => {
    for (const { a, b, state } of cases) {
      if (state === "invalid") {
        expect(classifySetScore(a, b).reason).toBeTruthy();
      }
    }
  });

  it("covers the intended category mix", () => {
    const count = (s: SetState) => cases.filter((c) => c.state === s).length;
    expect(count("final")).toBe(14); // 6-0..6-4 ×2, 7-5/7-6 ×2
    expect(count("in_progress")).toBe(39);
    expect(count("invalid")).toBe(47); // 11 in-range unreachable + 36 out-of-band
  });
});

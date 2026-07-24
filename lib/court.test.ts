import { describe, expect, it } from "vitest";
import {
  COURT_NUMBERS,
  MAX_COURT,
  MIN_COURT,
  courtNumber,
  parseCourtInput,
} from "./court";

describe("parseCourtInput", () => {
  it("accepts every physical court number", () => {
    for (const n of COURT_NUMBERS) {
      expect(parseCourtInput(String(n))).toEqual({ ok: true, court: String(n) });
    }
  });

  it("treats an empty or whitespace-only input as clearing the court", () => {
    expect(parseCourtInput("")).toEqual({ ok: true, court: null });
    expect(parseCourtInput("   ")).toEqual({ ok: true, court: null });
  });

  it("trims surrounding whitespace", () => {
    expect(parseCourtInput("  4 ")).toEqual({ ok: true, court: "4" });
  });

  it("rejects courts outside the venue", () => {
    expect(parseCourtInput("0").ok).toBe(false);
    expect(parseCourtInput(String(MAX_COURT + 1)).ok).toBe(false);
    expect(parseCourtInput("60").ok).toBe(false);
  });

  it("rejects anything that isn't a plain whole number", () => {
    for (const raw of ["3.5", "-2", "abc", "3a", "1,2", "٣"]) {
      expect(parseCourtInput(raw).ok).toBe(false);
    }
  });

  it("explains why an input was rejected", () => {
    const result = parseCourtInput("9");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain(String(MIN_COURT));
      expect(result.reason).toContain(String(MAX_COURT));
    }
  });
});

describe("courtNumber", () => {
  it("reads a stored value back as a number", () => {
    expect(courtNumber("3")).toBe(3);
    expect(courtNumber(" 6 ")).toBe(6);
  });

  it("returns null when no court is assigned", () => {
    expect(courtNumber(null)).toBeNull();
    expect(courtNumber(undefined)).toBeNull();
    expect(courtNumber("")).toBeNull();
  });

  it("ignores values that don't name a physical court", () => {
    expect(courtNumber("7")).toBeNull();
    expect(courtNumber("Court 3")).toBeNull();
    expect(courtNumber("centre")).toBeNull();
  });

  it("round-trips whatever parseCourtInput produced", () => {
    for (const n of COURT_NUMBERS) {
      const parsed = parseCourtInput(String(n));
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(courtNumber(parsed.court)).toBe(n);
    }
  });
});

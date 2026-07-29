import { describe, expect, it } from "vitest";
import {
  addDays,
  findMatches,
  formatMinute,
  heuristicParse,
  MATCH_THRESHOLD,
  nextWeekday,
  normalizeCity,
  sanitizeIntent,
  scoreMatch,
  weekdayOf,
  type PlayIntent,
  type PlayRequest,
} from "./matchmaking";

// 2026-07-30 is a Thursday.
const THURSDAY = "2026-07-30";

function intent(over: Partial<PlayIntent> = {}): PlayIntent {
  return {
    play_date: null,
    start_minute: null,
    end_minute: null,
    city: null,
    venue: null,
    format: "either",
    ntrp: null,
    players_needed: 1,
    ...over,
  };
}

function request(id: number, over: Partial<PlayRequest> = {}): PlayRequest {
  return {
    ...intent(),
    id,
    author_name: `Player ${id}`,
    raw_text: "",
    contact_channel: "none",
    contact_handle: null,
    status: "open",
    client_id: `client-${id}`,
    created_at: "2026-07-27T12:00:00Z",
    ...over,
  };
}

describe("date helpers", () => {
  it("reads the weekday of an ISO date", () => {
    expect(weekdayOf(THURSDAY)).toBe(4);
    expect(weekdayOf("2026-08-01")).toBe(6);
  });

  it("counts today as the next occurrence of its own weekday", () => {
    // Thursday asked for on a Thursday means today, not a week out.
    expect(nextWeekday(THURSDAY, 4)).toBe(THURSDAY);
  });

  it("rolls forward to the coming weekday", () => {
    expect(nextWeekday(THURSDAY, 6)).toBe("2026-08-01"); // Saturday
    expect(nextWeekday(THURSDAY, 1)).toBe("2026-08-03"); // Monday
  });

  it("crosses month boundaries when adding days", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("formatMinute", () => {
  it("renders 12-hour times", () => {
    expect(formatMinute(0)).toBe("12:00 AM");
    expect(formatMinute(12 * 60)).toBe("12:00 PM");
    expect(formatMinute(19 * 60 + 30)).toBe("7:30 PM");
  });
});

describe("normalizeCity", () => {
  it("ignores state suffixes, case, and punctuation", () => {
    expect(normalizeCity("Boston, MA")).toBe("boston");
    expect(normalizeCity("boston")).toBe("boston");
    expect(normalizeCity("  Boston ")).toBe("boston");
  });

  it("treats blank input as unset", () => {
    expect(normalizeCity(null)).toBeNull();
    expect(normalizeCity("  ")).toBeNull();
  });
});

describe("scoreMatch", () => {
  it("scores an exact fit at the top of the range", () => {
    const a = intent({
      play_date: THURSDAY,
      start_minute: 18 * 60,
      end_minute: 20 * 60,
      city: "Boston",
      format: "doubles",
      ntrp: 3.5,
    });
    const result = scoreMatch(a, { ...a, ntrp: 3.5 });
    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
    expect(result!.reasons).toContain("sameDay");
    expect(result!.reasons).toContain("sameCity");
    expect(result!.reasons).toContain("timeOverlap");
    expect(result!.reasons).toContain("closeLevel");
  });

  it("rules out different cities outright", () => {
    const a = intent({ city: "Boston" });
    const b = intent({ city: "Newton" });
    expect(scoreMatch(a, b)).toBeNull();
  });

  it("rules out different days outright", () => {
    const a = intent({ play_date: THURSDAY });
    const b = intent({ play_date: "2026-07-31" });
    expect(scoreMatch(a, b)).toBeNull();
  });

  it("rules out singles against doubles", () => {
    expect(scoreMatch(intent({ format: "singles" }), intent({ format: "doubles" }))).toBeNull();
  });

  it("lets 'either' play against anything", () => {
    expect(scoreMatch(intent({ format: "either" }), intent({ format: "singles" }))).not.toBeNull();
  });

  it("rules out non-overlapping hours only on a shared day", () => {
    const morning = { play_date: THURSDAY, start_minute: 8 * 60, end_minute: 10 * 60 };
    const evening = { play_date: THURSDAY, start_minute: 19 * 60, end_minute: 21 * 60 };
    expect(scoreMatch(intent(morning), intent(evening))).toBeNull();

    // Same hours, unknown days: they can just agree on a different day.
    const undated = scoreMatch(
      intent({ start_minute: 8 * 60, end_minute: 10 * 60 }),
      intent({ start_minute: 19 * 60, end_minute: 21 * 60 })
    );
    expect(undated).not.toBeNull();
  });

  it("treats a missing field as compatible with everything", () => {
    const specific = intent({ play_date: THURSDAY, city: "Boston" });
    const open = intent();
    const result = scoreMatch(specific, open);
    expect(result).not.toBeNull();
    expect(result!.reasons).toContain("flexibleDay");
  });

  it("ranks a closer NTRP higher", () => {
    const base = intent({ city: "Boston", ntrp: 3.5 });
    const close = scoreMatch(base, intent({ city: "Boston", ntrp: 3.5 }))!;
    const far = scoreMatch(base, intent({ city: "Boston", ntrp: 5.0 }))!;
    expect(close.score).toBeGreaterThan(far.score);
  });
});

describe("findMatches", () => {
  const target = request(1, {
    play_date: THURSDAY,
    start_minute: 18 * 60,
    end_minute: 20 * 60,
    city: "Boston",
    format: "doubles",
    ntrp: 3.5,
  });

  it("ranks best fit first", () => {
    const pool = [
      target,
      request(2, { city: "Boston", format: "doubles" }),
      request(3, {
        play_date: THURSDAY,
        start_minute: 18 * 60,
        end_minute: 21 * 60,
        city: "Boston",
        format: "doubles",
        ntrp: 3.5,
      }),
    ];
    const matches = findMatches(target, pool);
    expect(matches.map((m) => m.request.id)).toEqual([3, 2]);
  });

  it("never matches a poster with themselves", () => {
    const own = request(9, { ...target, id: 9, client_id: target.client_id });
    expect(findMatches(target, [target, own])).toEqual([]);
  });

  it("skips closed requests", () => {
    const closed = request(4, { ...target, id: 4, client_id: "other", status: "closed" });
    expect(findMatches(target, [target, closed])).toEqual([]);
  });

  it("drops anything under the threshold", () => {
    for (const match of findMatches(target, [target, request(5, { city: "Boston" })])) {
      expect(match.score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    }
  });
});

describe("heuristicParse", () => {
  it("resolves a weekday against today", () => {
    expect(heuristicParse("tennis on Monday?", THURSDAY).play_date).toBe("2026-08-03");
  });

  it("resolves tomorrow and tonight", () => {
    expect(heuristicParse("free tomorrow", THURSDAY).play_date).toBe("2026-07-31");
    expect(heuristicParse("anyone around tonight", THURSDAY).play_date).toBe(THURSDAY);
  });

  it("reads a time range", () => {
    const parsed = heuristicParse("6-8pm works", THURSDAY);
    expect(parsed.start_minute).toBe(18 * 60);
    expect(parsed.end_minute).toBe(20 * 60);
  });

  it("gives a single time a two-hour window", () => {
    const parsed = heuristicParse("how about 7pm", THURSDAY);
    expect(parsed.start_minute).toBe(19 * 60);
    expect(parsed.end_minute).toBe(21 * 60);
  });

  it("reads a named part of the day", () => {
    const parsed = heuristicParse("Thursday evening anyone?", THURSDAY);
    expect(parsed.start_minute).toBe(17 * 60);
    expect(parsed.end_minute).toBe(22 * 60);
  });

  it("picks up a capitalized place after a preposition", () => {
    expect(heuristicParse("playing in Boston", THURSDAY).city).toBe("Boston");
    expect(heuristicParse("courts near Jamaica Plain", THURSDAY).city).toBe("Jamaica Plain");
  });

  it("reads the format and rating", () => {
    const parsed = heuristicParse("looking for doubles, I'm 3.5 NTRP", THURSDAY);
    expect(parsed.format).toBe("doubles");
    expect(parsed.ntrp).toBe(3.5);
  });

  it("defaults to flexible when nothing is stated", () => {
    expect(heuristicParse("anyone want to hit?", THURSDAY)).toEqual({
      play_date: null,
      start_minute: null,
      end_minute: null,
      city: null,
      venue: null,
      format: "either",
      ntrp: null,
      players_needed: 1,
    });
  });

  it("handles the worked example end to end", () => {
    const parsed = heuristicParse(
      "Anyone want to play doubles Thursday 6-8pm in Boston? I'm 3.5",
      "2026-07-27"
    );
    expect(parsed.play_date).toBe(THURSDAY);
    expect(parsed.start_minute).toBe(18 * 60);
    expect(parsed.end_minute).toBe(20 * 60);
    expect(parsed.city).toBe("Boston");
    expect(parsed.format).toBe("doubles");
    expect(parsed.ntrp).toBe(3.5);
  });
});

describe("sanitizeIntent", () => {
  it("drops out-of-range minutes and ratings", () => {
    const cleaned = sanitizeIntent({ start_minute: 5000, ntrp: 12 });
    expect(cleaned.start_minute).toBeNull();
    expect(cleaned.ntrp).toBeNull();
  });

  it("drops an end time that is not after the start", () => {
    expect(sanitizeIntent({ start_minute: 600, end_minute: 600 }).end_minute).toBeNull();
  });

  it("rejects a malformed date", () => {
    expect(sanitizeIntent({ play_date: "next Thursday" }).play_date).toBeNull();
    expect(sanitizeIntent({ play_date: "2026-07-30" }).play_date).toBe("2026-07-30");
  });

  it("falls back to a sane format and player count", () => {
    const cleaned = sanitizeIntent({
      format: "mixed" as never,
      players_needed: 99,
    });
    expect(cleaned.format).toBe("either");
    expect(cleaned.players_needed).toBe(1);
  });
});

// Pickup-game matchmaking: the shared vocabulary between the composer, the
// Claude parser, and the match list.
//
// Someone types "anyone want to play doubles Thursday evening in Boston, I'm
// 3.5" and we turn that into a PlayIntent. Two intents are compared here, in
// pure functions, so the matching rules are testable without a database or an
// API key. Nothing in this file talks to Supabase or Anthropic.

export type PlayFormat = "singles" | "doubles" | "either";

/** Where the poster wants to be reached once someone matches with them. */
export type ContactChannel =
  | "messenger"
  | "instagram"
  | "whatsapp"
  | "sms"
  | "none";

export const CONTACT_CHANNELS: ContactChannel[] = [
  "none",
  "messenger",
  "instagram",
  "whatsapp",
  "sms",
];

/** The structured shape we pull out of a free-text request. */
export type PlayIntent = {
  /** Absolute ISO date (YYYY-MM-DD), or null when the poster is flexible. */
  play_date: string | null;
  /** Minutes from local midnight, 0–1439. Null means any time that day. */
  start_minute: number | null;
  end_minute: number | null;
  city: string | null;
  /** A specific club or court, when they named one. */
  venue: string | null;
  format: PlayFormat;
  /** Self-reported NTRP, null when unstated. */
  ntrp: number | null;
  /** How many more people they need. */
  players_needed: number;
};

export type PlayRequestStatus = "open" | "matched" | "closed";

export type PlayRequest = PlayIntent & {
  id: number;
  author_name: string;
  raw_text: string;
  contact_channel: ContactChannel;
  contact_handle: string | null;
  status: PlayRequestStatus;
  /** localStorage id of the poster, so they can close their own request. */
  client_id: string;
  created_at: string;
};

/**
 * JSON Schema handed to Claude's structured outputs. Lives here rather than in
 * the server action because a "use server" file may only export async
 * functions. Every object needs `additionalProperties: false` and a complete
 * `required` list; nullable fields use anyOf rather than a type array.
 */
export const PLAY_INTENT_SCHEMA = {
  type: "object",
  properties: {
    play_date: {
      anyOf: [{ type: "string", format: "date" }, { type: "null" }],
      description:
        "The date they want to play, as YYYY-MM-DD, resolved against the reference date given in the message. Null if they did not name a day or said they are flexible.",
    },
    start_minute: {
      anyOf: [{ type: "integer" }, { type: "null" }],
      description:
        "Earliest start time as minutes from midnight (7pm = 1140). Null if no time was given.",
    },
    end_minute: {
      anyOf: [{ type: "integer" }, { type: "null" }],
      description:
        "Latest end time as minutes from midnight. If they named a single start time, add 120 minutes. Null if no time was given.",
    },
    city: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description:
        "City or town name only, no state or ZIP (e.g. 'Boston', 'Newton'). Null if not mentioned.",
    },
    venue: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description:
        "A specific club, park, or court complex if they named one. Null otherwise.",
    },
    format: {
      type: "string",
      enum: ["singles", "doubles", "either"],
      description: "Use 'either' when they did not say.",
    },
    ntrp: {
      anyOf: [{ type: "number" }, { type: "null" }],
      description:
        "Their self-reported NTRP rating between 1.0 and 7.0. Null if not mentioned.",
    },
    players_needed: {
      type: "integer",
      description:
        "How many additional players they are looking for. Default 1.",
    },
  },
  required: [
    "play_date",
    "start_minute",
    "end_minute",
    "city",
    "venue",
    "format",
    "ntrp",
    "players_needed",
  ],
  additionalProperties: false,
};

// ---------------------------------------------------------------------------
// Dates and times
// ---------------------------------------------------------------------------

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Day-of-week (0 = Sunday) for an ISO date, computed in UTC to dodge DST. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Shift an ISO date by whole days without tripping over local DST shifts. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * The next date falling on `weekday`, counting today as a hit. Someone who
 * types "Thursday" on a Thursday morning means today, not a week out.
 */
export function nextWeekday(fromIso: string, weekday: number): string {
  const delta = (weekday - weekdayOf(fromIso) + 7) % 7;
  return addDays(fromIso, delta);
}

/** 1140 -> "7:00 PM". Used for chips on the request cards. */
export function formatMinute(minute: number): string {
  const h24 = Math.floor(minute / 60) % 24;
  const mm = String(minute % 60).padStart(2, "0");
  const suffix = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${suffix}`;
}

export function formatWindow(
  start: number | null,
  end: number | null
): string | null {
  if (start == null && end == null) return null;
  if (start != null && end != null) {
    return `${formatMinute(start)} – ${formatMinute(end)}`;
  }
  return formatMinute((start ?? end) as number);
}

/** Minutes two windows share. Missing windows count as fully open. */
export function overlapMinutes(a: PlayIntent, b: PlayIntent): number | null {
  if (a.start_minute == null || a.end_minute == null) return null;
  if (b.start_minute == null || b.end_minute == null) return null;
  return (
    Math.min(a.end_minute, b.end_minute) - Math.max(a.start_minute, b.start_minute)
  );
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Collapse a place name so "Boston, MA", "boston" and "Boston " compare equal.
 * Only the part before the first comma matters — the rest is state or ZIP.
 */
export function normalizeCity(city: string | null): string | null {
  if (!city) return null;
  const head = city.split(",")[0];
  const cleaned = head.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return cleaned === "" ? null : cleaned;
}

/** Reason codes the UI turns into localized text. */
export type MatchReason =
  | "sameDay"
  | "flexibleDay"
  | "timeOverlap"
  | "sameCity"
  | "sameVenue"
  | "sameFormat"
  | "closeLevel";

export type MatchScore = {
  score: number;
  reasons: MatchReason[];
};

/** Below this, two requests are listed as separate posts rather than a match. */
export const MATCH_THRESHOLD = 45;

function formatsClash(a: PlayFormat, b: PlayFormat): boolean {
  if (a === "either" || b === "either") return false;
  return a !== b;
}

/**
 * How well two requests fit, 0–100, or null when they cannot possibly play
 * together — different towns, different days, incompatible formats, or the
 * same day with no overlapping hours. A null is a hard exclusion, not a low
 * score, so those pairs never surface as weak suggestions.
 */
export function scoreMatch(a: PlayIntent, b: PlayIntent): MatchScore | null {
  if (formatsClash(a.format, b.format)) return null;

  const reasons: MatchReason[] = [];
  let score = 0;

  const cityA = normalizeCity(a.city);
  const cityB = normalizeCity(b.city);
  if (cityA && cityB) {
    if (cityA !== cityB) return null;
    score += 30;
    reasons.push("sameCity");
  } else {
    score += 15;
  }

  const sameDate = a.play_date != null && a.play_date === b.play_date;
  if (a.play_date && b.play_date) {
    if (!sameDate) return null;
    score += 30;
    reasons.push("sameDay");
  } else {
    score += 15;
    reasons.push("flexibleDay");
  }

  const overlap = overlapMinutes(a, b);
  if (overlap != null) {
    // Only a shared date makes a missed window disqualifying; on unknown days
    // they can simply pick another one.
    if (overlap <= 0) {
      if (sameDate) return null;
    } else {
      score += 15;
      reasons.push("timeOverlap");
    }
  } else {
    score += 8;
  }

  if (a.format === b.format && a.format !== "either") {
    score += 15;
    reasons.push("sameFormat");
  } else {
    score += 8;
  }

  if (a.ntrp != null && b.ntrp != null) {
    const gap = Math.abs(a.ntrp - b.ntrp);
    if (gap <= 0.5) {
      score += 10;
      reasons.push("closeLevel");
    } else if (gap <= 1.0) {
      score += 6;
    } else if (gap <= 1.5) {
      score += 2;
    }
  } else {
    score += 5;
  }

  const venueA = normalizeCity(a.venue);
  const venueB = normalizeCity(b.venue);
  if (venueA && venueB && venueA === venueB) reasons.push("sameVenue");

  return { score, reasons };
}

export type Match = MatchScore & { request: PlayRequest };

/**
 * Everyone `target` could play with, best fit first. Closed requests and the
 * poster's own other requests are excluded — matching yourself is noise.
 */
export function findMatches(
  target: PlayRequest,
  all: PlayRequest[]
): Match[] {
  const out: Match[] = [];
  for (const other of all) {
    if (other.id === target.id) continue;
    if (other.client_id === target.client_id) continue;
    if (other.status === "closed") continue;
    const scored = scoreMatch(target, other);
    if (!scored || scored.score < MATCH_THRESHOLD) continue;
    out.push({ ...scored, request: other });
  }
  return out.sort((x, y) => y.score - x.score || x.request.id - y.request.id);
}

// ---------------------------------------------------------------------------
// Fallback parser
// ---------------------------------------------------------------------------

const NAMED_WINDOWS: Record<string, [number, number]> = {
  morning: [6 * 60, 12 * 60],
  afternoon: [12 * 60, 17 * 60],
  evening: [17 * 60, 22 * 60],
  night: [18 * 60, 22 * 60],
  noon: [12 * 60, 14 * 60],
};

function to24h(hour: number, meridiem: string | undefined): number {
  const h = hour % 12;
  if (meridiem === "pm") return h + 12;
  if (meridiem === "am") return h;
  // Bare hours read as afternoon/evening unless they'd be absurdly early.
  return hour >= 8 && hour <= 11 ? hour : h + 12;
}

/**
 * Keyword parser used when ANTHROPIC_API_KEY isn't set, and as the safety net
 * when the API call fails. Deliberately conservative: it leaves a field null
 * rather than guessing, and a null field still matches everything.
 */
export function heuristicParse(raw: string, todayIso: string): PlayIntent {
  const text = raw.toLowerCase();

  let play_date: string | null = null;
  if (/\btomorrow\b/.test(text)) {
    play_date = addDays(todayIso, 1);
  } else if (/\btoday\b|\btonight\b/.test(text)) {
    play_date = todayIso;
  } else {
    for (let i = 0; i < WEEKDAYS.length; i++) {
      const name = WEEKDAYS[i];
      if (new RegExp(`\\b${name}|\\b${name.slice(0, 3)}\\b`).test(text)) {
        play_date = nextWeekday(todayIso, i);
        break;
      }
    }
  }

  let start_minute: number | null = null;
  let end_minute: number | null = null;

  // "6-8pm" / "6:30 to 8 pm" — a range wins over a single time.
  const range = text.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/
  );
  const single = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (range) {
    const tail = range[6];
    start_minute = to24h(Number(range[1]), range[3] ?? tail) * 60 + Number(range[2] ?? 0);
    end_minute = to24h(Number(range[4]), tail) * 60 + Number(range[5] ?? 0);
  } else if (single) {
    start_minute = to24h(Number(single[1]), single[3]) * 60 + Number(single[2] ?? 0);
    end_minute = start_minute + 120;
  } else {
    for (const [word, [s, e]] of Object.entries(NAMED_WINDOWS)) {
      if (text.includes(word)) {
        start_minute = s;
        end_minute = e;
        break;
      }
    }
  }
  if (/\btonight\b/.test(text) && start_minute == null) {
    [start_minute, end_minute] = NAMED_WINDOWS.evening;
  }

  // "in Boston", "at Newton", "around Cambridge" — capitalization in the
  // original string is what tells a place name from an ordinary word.
  let city: string | null = null;
  const place = raw.match(/\b(?:in|at|around|near)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  if (place) city = place[1].trim();

  const format: PlayFormat = /\bsingles\b/.test(text)
    ? "singles"
    : /\bdoubles\b/.test(text)
      ? "doubles"
      : "either";

  // A bare number is almost always a time ("6-8pm"), so a rating has to look
  // like one: either a decimal, or a whole number sitting next to "NTRP".
  let ntrp: number | null = null;
  const rating =
    text.match(/\b([1-7]\.[05])\b/) ??
    text.match(/\bntrp\s*:?\s*([1-7])\b/) ??
    text.match(/\b([1-7])\s*(?:ntrp|level|rating)\b/);
  if (rating) ntrp = Number(rating[1]);

  let players_needed = 1;
  const need = text.match(/\b(?:need|looking for|want)\s+(\d+)\b/);
  if (need) {
    const n = Number(need[1]);
    if (n >= 1 && n <= 7) players_needed = n;
  } else if (format === "doubles" && /\bfourth\b|\b4th\b/.test(text)) {
    players_needed = 1;
  }

  return {
    play_date,
    start_minute,
    end_minute,
    city,
    venue: null,
    format,
    ntrp,
    players_needed,
  };
}

/**
 * Clamp whatever came back from the model into a valid PlayIntent. Structured
 * outputs guarantee the shape, not that the values make sense.
 */
export function sanitizeIntent(value: Partial<PlayIntent>): PlayIntent {
  const minute = (n: unknown): number | null =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1439
      ? Math.round(n)
      : null;

  let start = minute(value.start_minute);
  let end = minute(value.end_minute);
  if (start != null && end != null && end <= start) end = null;
  if (start == null && end != null) {
    start = end;
    end = null;
  }

  const date =
    typeof value.play_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.play_date)
      ? value.play_date
      : null;

  const ntrp =
    typeof value.ntrp === "number" && value.ntrp >= 1 && value.ntrp <= 7
      ? value.ntrp
      : null;

  const trimmed = (s: unknown): string | null => {
    if (typeof s !== "string") return null;
    const out = s.trim().slice(0, 60);
    return out === "" ? null : out;
  };

  return {
    play_date: date,
    start_minute: start,
    end_minute: end,
    city: trimmed(value.city),
    venue: trimmed(value.venue),
    format:
      value.format === "singles" || value.format === "doubles"
        ? value.format
        : "either",
    ntrp,
    players_needed:
      typeof value.players_needed === "number" &&
      value.players_needed >= 1 &&
      value.players_needed <= 7
        ? Math.round(value.players_needed)
        : 1,
  };
}

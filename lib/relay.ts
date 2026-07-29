// Handing a match off to whatever app the two players actually use.
//
// Messenger, Instagram, and WhatsApp all forbid a business from opening a
// conversation with someone who hasn't messaged it first, so this app cannot
// send those messages on anyone's behalf without Meta Business verification and
// App Review. What it can do — with no approval at all — is open the right
// thread in the right app with the introduction already written, and let the
// player press send. Everything here builds a link; nothing here sends.
//
// The `contactLink` seam is where a server-side send would slot in later: the
// callers don't care whether the result is a deep link or an API call.

import {
  formatWindow,
  type ContactChannel,
  type PlayRequest,
} from "./matchmaking";

/** Strip the @ and any URL wrapper so "@willy" and a profile URL both work. */
function handleOnly(raw: string): string {
  const trimmed = raw.trim().replace(/^@/, "");
  const fromUrl = trimmed.match(
    /(?:instagram\.com|m\.me|messenger\.com\/t)\/([^/?#]+)/i
  );
  return (fromUrl ? fromUrl[1] : trimmed).replace(/^@/, "");
}

/** Digits only — wa.me and sms: both want a bare number. */
function digitsOnly(raw: string): string {
  return raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

/**
 * The message the player sends. Written as one person to another, because
 * that is exactly what it is — the app is not a party to the conversation.
 */
export function buildIntro(
  from: PlayRequest,
  to: PlayRequest,
  boardUrl?: string
): string {
  const bits: string[] = [];
  const when = to.play_date
    ? new Date(`${to.play_date}T12:00:00Z`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;
  const window = formatWindow(to.start_minute, to.end_minute);

  bits.push(
    `Hi ${to.author_name} — I'm ${from.author_name}, saw your post on the TAA tennis board.`
  );

  const detail = [
    when,
    window,
    to.city,
    to.format !== "either" ? to.format : null,
  ]
    .filter(Boolean)
    .join(", ");
  bits.push(detail ? `You're looking for ${detail}.` : "");
  bits.push("I'm in — want to lock it in?");
  if (boardUrl) bits.push(boardUrl);

  return bits.filter(Boolean).join(" ");
}

export type RelayLink = {
  channel: ContactChannel;
  href: string;
  /** True when the app receives the text prefilled rather than just opening. */
  prefilled: boolean;
};

/**
 * A link that opens `channel` pointed at `handle`. Instagram and Messenger
 * only accept a destination, so the player pastes the message themselves —
 * hence `prefilled: false`, which the UI uses to also offer a copy button.
 */
export function contactLink(
  channel: ContactChannel,
  handle: string | null,
  message: string
): RelayLink | null {
  if (channel === "none" || !handle || handle.trim() === "") return null;
  const text = encodeURIComponent(message);

  switch (channel) {
    case "instagram":
      return {
        channel,
        href: `https://ig.me/m/${encodeURIComponent(handleOnly(handle))}`,
        prefilled: false,
      };
    case "messenger":
      return {
        channel,
        href: `https://m.me/${encodeURIComponent(handleOnly(handle))}`,
        prefilled: false,
      };
    case "whatsapp": {
      const number = digitsOnly(handle);
      if (!number) return null;
      return { channel, href: `https://wa.me/${number}?text=${text}`, prefilled: true };
    }
    case "sms": {
      const number = digitsOnly(handle);
      if (!number) return null;
      return { channel, href: `sms:${number}?body=${text}`, prefilled: true };
    }
    default:
      return null;
  }
}

/**
 * Hand the message to the OS share sheet, which lists every messaging app the
 * player has installed — Messenger and Instagram included. This is the one
 * path that reaches any platform without a per-platform integration.
 * Returns false when the browser has no Web Share API, so the caller can fall
 * back to the clipboard.
 */
export async function shareIntro(message: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share({ text: message });
    return true;
  } catch {
    // The user dismissing the sheet lands here too; either way we're done.
    return false;
  }
}

export async function copyIntro(message: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch {
    return false;
  }
}

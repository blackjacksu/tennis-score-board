"use client";

import { useEffect, useMemo, useState } from "react";
import { getDisplayName, setDisplayName } from "@/lib/clientId";
import { useI18n, type DictKey } from "@/lib/i18n";
import {
  CONTACT_CHANNELS,
  findMatches,
  formatWindow,
  scoreMatch,
  type ContactChannel,
  type MatchReason,
  type PlayRequest,
} from "@/lib/matchmaking";
import { buildIntro, contactLink, copyIntro, shareIntro } from "@/lib/relay";
import { usePlayRequests } from "@/lib/usePlayRequests";

const REASON_LABELS: Record<MatchReason, DictKey> = {
  sameDay: "reasonSameDay",
  flexibleDay: "reasonFlexibleDay",
  timeOverlap: "reasonTimeOverlap",
  sameCity: "reasonSameCity",
  sameVenue: "reasonSameVenue",
  sameFormat: "reasonSameFormat",
  closeLevel: "reasonCloseLevel",
};

const CHANNEL_LABELS: Record<ContactChannel, DictKey> = {
  none: "channelNone",
  messenger: "channelMessenger",
  instagram: "channelInstagram",
  whatsapp: "channelWhatsapp",
  sms: "channelSms",
};

const CHANNEL_ICONS: Record<ContactChannel, string> = {
  none: "—",
  messenger: "💬",
  instagram: "📷",
  whatsapp: "🟢",
  sms: "✉️",
};

/** Compact and language-neutral, so it needs no dictionary entry. */
function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function PlayView() {
  const { t, lang } = useI18n();
  const { requests, loading, posting, clientId, post, close } = usePlayRequests();

  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<ContactChannel>("none");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(getDisplayName());
  }, []);

  const mine = useMemo(
    () => requests.filter((r) => r.client_id === clientId),
    [requests, clientId]
  );

  // Everyone who fits one of my own posts, best fit first, each paired with
  // the post of mine it matches — that pairing is what the intro message needs.
  const myMatches = useMemo(() => {
    const best = new Map<number, { theirs: PlayRequest; mineReq: PlayRequest; score: number; reasons: MatchReason[] }>();
    for (const own of mine) {
      for (const m of findMatches(own, requests)) {
        const existing = best.get(m.request.id);
        if (!existing || m.score > existing.score) {
          best.set(m.request.id, {
            theirs: m.request,
            mineReq: own,
            score: m.score,
            reasons: m.reasons,
          });
        }
      }
    }
    return [...best.values()].sort((a, b) => b.score - a.score);
  }, [mine, requests]);

  function formatDate(iso: string): string {
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString(
      lang === "zh" ? "zh-TW" : "en-US",
      { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await post({
      authorName: name,
      rawText: text,
      contactChannel: channel,
      contactHandle: handle,
    });
    if (!result.ok) {
      setError(result.error ?? "POST_FAILED");
      return;
    }
    setDisplayName(name);
    setText("");
  }

  const errorKey: DictKey | null =
    error === "NAME_REQUIRED"
      ? "nameRequired"
      : error === "TEXT_REQUIRED"
        ? "textRequired"
        : error === "TOO_FAST"
          ? "tooFast"
          : error
            ? "postFailed"
            : null;

  return (
    <div className="space-y-4">
      {/* Composer */}
      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-1 text-base font-bold text-slate-800">
          {t("postRequest")}
        </h2>
        <p className="mb-3 text-xs text-slate-500">{t("postRequestHint")}</p>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={t("yourName")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={400}
            rows={3}
            placeholder={t("gamePlaceholder")}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as ContactChannel)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {CONTACT_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(CHANNEL_LABELS[c])}
                </option>
              ))}
            </select>
            {channel !== "none" && (
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                maxLength={60}
                placeholder={t("contactHandlePlaceholder")}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            )}
          </div>

          {channel !== "none" && (
            <p className="text-xs text-amber-700">⚠️ {t("handleIsPublic")}</p>
          )}
          {errorKey && (
            <p className="text-xs font-semibold text-red-600">{t(errorKey)}</p>
          )}

          <button
            type="submit"
            disabled={posting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {posting ? t("readingRequest") : t("post")}
          </button>
        </div>
      </form>

      {/* Matches against my own posts */}
      {myMatches.length > 0 && (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-emerald-900">
            🎾 {t("yourMatches", { n: myMatches.length })}
          </h2>
          <ul className="space-y-3">
            {myMatches.map((m) => (
              <li
                key={m.theirs.id}
                className="rounded-lg border border-emerald-200 bg-white p-3"
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    {m.theirs.author_name}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {m.score}% {t("matchStrength")}
                  </span>
                </div>
                <p className="mb-2 text-sm text-slate-600">
                  &ldquo;{m.theirs.raw_text}&rdquo;
                </p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {m.reasons.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                    >
                      {t(REASON_LABELS[r])}
                    </span>
                  ))}
                </div>
                <ConnectRow from={m.mineReq} to={m.theirs} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The board */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-slate-800">
          {t("openRequests")}
        </h2>

        {loading ? (
          <p className="p-4 text-center text-sm text-slate-400">{t("loading")}</p>
        ) : requests.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-400">
            {t("noRequests")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => {
              const isMine = r.client_id === clientId;
              const window = formatWindow(r.start_minute, r.end_minute);
              // Does this post fit anything I've put up? Shown inline so the
              // board itself reads as matched, not just the section above.
              const fit = isMine
                ? null
                : mine
                    .map((own) => scoreMatch(own, r))
                    .filter((s) => s !== null)
                    .sort((a, b) => b!.score - a!.score)[0];

              return (
                <li key={r.id} className="py-3">
                  <div className="mb-1 flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-slate-800">
                      {r.author_name}
                    </span>
                    {isMine && (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {t("you")}
                      </span>
                    )}
                    {fit && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        {fit.score}% {t("matchStrength")}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-slate-400">
                      {timeAgo(r.created_at)}
                    </span>
                  </div>

                  <p className="mb-2 text-sm text-slate-600">
                    &ldquo;{r.raw_text}&rdquo;
                  </p>

                  <div className="flex flex-wrap gap-1">
                    <Chip>{r.play_date ? formatDate(r.play_date) : t("anyDay")}</Chip>
                    <Chip>{window ?? t("anyTime")}</Chip>
                    <Chip>{r.venue ?? r.city ?? t("anywhere")}</Chip>
                    <Chip>
                      {t(
                        r.format === "singles"
                          ? "fmtSingles"
                          : r.format === "doubles"
                            ? "fmtDoubles"
                            : "fmtEither"
                      )}
                    </Chip>
                    {r.ntrp != null && <Chip>NTRP {r.ntrp.toFixed(1)}</Chip>}
                    {r.players_needed > 1 && (
                      <Chip>{t("needsPlayers", { n: r.players_needed })}</Chip>
                    )}
                    {r.contact_channel !== "none" && (
                      <Chip>
                        {CHANNEL_ICONS[r.contact_channel]}{" "}
                        {t(CHANNEL_LABELS[r.contact_channel])}
                      </Chip>
                    )}
                  </div>

                  {isMine && (
                    <button
                      type="button"
                      onClick={() => close(r.id)}
                      className="mt-2 text-xs font-semibold text-slate-400 underline hover:text-red-600"
                    >
                      {t("closePost")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      {children}
    </span>
  );
}

/**
 * The hand-off. We can open the right thread in the right app with the intro
 * written, but the player presses send — see lib/relay.ts for why the app
 * can't send it for them.
 */
function ConnectRow({ from, to }: { from: PlayRequest; to: PlayRequest }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const message = useMemo(
    () =>
      buildIntro(
        from,
        to,
        typeof window === "undefined" ? undefined : window.location.origin
      ),
    [from, to]
  );
  const link = contactLink(to.contact_channel, to.contact_handle, message);

  async function onShare() {
    if (await shareIntro(message)) return;
    if (await copyIntro(message)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function onCopy() {
    if (await copyIntro(message)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            {CHANNEL_ICONS[to.contact_channel]}{" "}
            {t("openIn", { app: t(CHANNEL_LABELS[to.contact_channel]) })}
          </a>
        )}
        {canShare && (
          <button
            type="button"
            onClick={onShare}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            ↗ {t("shareIntro")}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {copied ? `✓ ${t("copied")}` : `⧉ ${t("copyIntro")}`}
        </button>
      </div>
      {link && !link.prefilled && (
        <p className="text-[11px] text-slate-500">{t("pasteHint")}</p>
      )}
      {!link && (
        <p className="text-[11px] text-slate-500">{t("noContactShared")}</p>
      )}
    </div>
  );
}

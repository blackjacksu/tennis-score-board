"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { closePlayRequest, postPlayRequest } from "@/app/play/actions";
import { getClientId } from "./clientId";
import { demoPlayRequests } from "./demoData";
import { heuristicParse, type ContactChannel, type PlayRequest } from "./matchmaking";
import { getSupabase, isDemoMode, isSupabaseConfigured } from "./supabase";

/** The poster's own calendar date, so "Thursday" resolves in their timezone. */
export function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type PostDraft = {
  authorName: string;
  rawText: string;
  contactChannel: ContactChannel;
  contactHandle: string;
};

export function usePlayRequests() {
  const [requests, setRequests] = useState<PlayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    setClientId(getClientId());
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      setRequests(demoPlayRequests);
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("play_requests")
        .select("*")
        .neq("status", "closed")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setRequests((data as PlayRequest[]) ?? []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("play-requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "play_requests" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as PlayRequest;
            setRequests((prev) =>
              prev.some((r) => r.id === row.id) ? prev : [row, ...prev]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as PlayRequest;
            setRequests((prev) =>
              row.status === "closed"
                ? prev.filter((r) => r.id !== row.id)
                : prev.map((r) => (r.id === row.id ? row : r))
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: number };
            setRequests((prev) => prev.filter((r) => r.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const post = useCallback(
    async (draft: PostDraft): Promise<{ ok: boolean; error?: string }> => {
      if (!clientId) return { ok: false, error: "BAD_CLIENT" };
      const authorName = draft.authorName.trim();
      const rawText = draft.rawText.trim();
      if (authorName === "") return { ok: false, error: "NAME_REQUIRED" };
      if (rawText === "") return { ok: false, error: "TEXT_REQUIRED" };

      setPosting(true);
      try {
        // Without a database there's nothing to post to, so demo mode parses
        // in the browser and keeps the request in memory. Same matching, same
        // UI — it just doesn't outlive the tab.
        if (isDemoMode || !isSupabaseConfigured) {
          const local: PlayRequest = {
            ...heuristicParse(rawText, localToday()),
            id: Date.now(),
            author_name: authorName,
            raw_text: rawText,
            contact_channel: draft.contactChannel,
            contact_handle:
              draft.contactChannel === "none"
                ? null
                : draft.contactHandle.trim() || null,
            status: "open",
            client_id: clientId,
            created_at: new Date().toISOString(),
          };
          setRequests((prev) => [local, ...prev]);
          return { ok: true };
        }

        const result = await postPlayRequest({
          authorName,
          rawText,
          contactChannel: draft.contactChannel,
          contactHandle: draft.contactHandle,
          clientId,
          todayIso: localToday(),
        });
        if (!result.ok) return { ok: false, error: result.error };
        setRequests((prev) =>
          prev.some((r) => r.id === result.request.id)
            ? prev
            : [result.request, ...prev]
        );
        return { ok: true };
      } finally {
        setPosting(false);
      }
    },
    [clientId]
  );

  const close = useCallback(
    async (id: number) => {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (isDemoMode || !isSupabaseConfigured) return;
      await closePlayRequest(id, clientId);
    },
    [clientId]
  );

  const openRequests = useMemo(
    () => requests.filter((r) => r.status !== "closed"),
    [requests]
  );

  return { requests: openRequests, loading, posting, clientId, post, close };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { confirmPhoto, createUploadTicket, deletePhoto } from "@/app/gallery/actions";
import { demoPhotos } from "./demoData";
import {
  checkFile,
  cleanCaption,
  MAX_BATCH,
  PHOTO_BUCKET,
  type EventPhoto,
  type FileRejection,
} from "./gallery";
import { resizeImage } from "./imageResize";
import { getSupabase, isDemoMode, isSupabaseConfigured } from "./supabase";

// Reading is public; `upload` and `remove` are staff-only and are rejected
// server-side without a valid admin PIN session. The viewer's Gallery tab uses
// only { photos, loading }; the admin photo board uses the rest.

export type UploadProgress = {
  /** Files finished so far in the current batch. */
  done: number;
  total: number;
};

export type UploadError =
  | FileRejection
  | "UNAUTHORIZED"
  | "UPLOAD_FAILED"
  | "NAME_REQUIRED";

export type UploadOutcome = {
  uploaded: number;
  failed: number;
  /** First thing that went wrong, for a single message to the user. */
  error?: UploadError;
};

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function useGallery() {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      setPhotos(demoPhotos);
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
        .from("event_photos")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setPhotos((data as EventPhoto[]) ?? []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("event-photos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_photos" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as EventPhoto;
            setPhotos((prev) =>
              prev.some((p) => p.id === row.id) ? prev : [row, ...prev]
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: number };
            setPhotos((prev) => prev.filter((p) => p.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Upload a batch, one file at a time so a slow connection makes visible
   * progress instead of stalling on a parallel burst. One bad file doesn't
   * abandon the rest of the batch.
   */
  const upload = useCallback(
    async (
      files: File[],
      uploaderName: string,
      caption: string
    ): Promise<UploadOutcome> => {
      const name = uploaderName.trim();
      if (name === "") return { uploaded: 0, failed: 0, error: "NAME_REQUIRED" };

      const batch = files.slice(0, MAX_BATCH);
      const outcome: UploadOutcome = { uploaded: 0, failed: 0 };
      setProgress({ done: 0, total: batch.length });
      const step = () => setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));

      try {
        for (const file of batch) {
          const precheck = checkFile(file);
          if (!precheck.ok) {
            outcome.failed++;
            outcome.error ??= precheck.reason;
            step();
            continue;
          }

          const resized = await resizeImage(file);

          // Re-check after re-encoding — the size that matters is what we send.
          const postcheck = checkFile({
            type: resized.type,
            size: resized.blob.size,
          });
          if (!postcheck.ok) {
            outcome.failed++;
            outcome.error ??= postcheck.reason;
            step();
            continue;
          }

          // No bucket to write to without Supabase, so demo mode keeps the
          // photo inline. Same grid, same lightbox — it just doesn't persist.
          if (isDemoMode || !isSupabaseConfigured) {
            const dataUrl = await readAsDataUrl(resized.blob);
            setPhotos((prev) => [
              {
                id: Date.now() + outcome.uploaded,
                storage_path: dataUrl,
                caption: cleanCaption(caption),
                uploader_name: name,
                width: resized.width || null,
                height: resized.height || null,
                created_at: new Date().toISOString(),
              },
              ...prev,
            ]);
            outcome.uploaded++;
            step();
            continue;
          }

          const ticket = await createUploadTicket({
            mimeType: resized.type,
            size: resized.blob.size,
          });
          if (!ticket.ok) {
            outcome.failed++;
            outcome.error ??=
              ticket.error === "UNAUTHORIZED" ? "UNAUTHORIZED" : "UPLOAD_FAILED";
            step();
            continue;
          }

          const { error: uploadError } = await getSupabase()
            .storage.from(PHOTO_BUCKET)
            .uploadToSignedUrl(ticket.path, ticket.token, resized.blob, {
              contentType: resized.type,
            });
          if (uploadError) {
            outcome.failed++;
            outcome.error ??= "UPLOAD_FAILED";
            step();
            continue;
          }

          const confirmed = await confirmPhoto({
            storagePath: ticket.path,
            caption,
            uploaderName: name,
            width: resized.width,
            height: resized.height,
          });
          if (!confirmed.ok) {
            outcome.failed++;
            outcome.error ??=
              confirmed.error === "UNAUTHORIZED" ? "UNAUTHORIZED" : "UPLOAD_FAILED";
          } else {
            setPhotos((prev) =>
              prev.some((p) => p.id === confirmed.photo.id)
                ? prev
                : [confirmed.photo, ...prev]
            );
            outcome.uploaded++;
          }
          step();
        }
      } finally {
        setProgress(null);
      }

      return outcome;
    },
    []
  );

  const remove = useCallback(async (id: number) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (isDemoMode || !isSupabaseConfigured) return;
    await deletePhoto(id);
  }, []);

  return { photos, loading, progress, upload, remove };
}

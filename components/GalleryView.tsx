"use client";

import { useCallback, useEffect, useState } from "react";
import { publicPhotoUrl, type EventPhoto } from "@/lib/gallery";
import { useI18n } from "@/lib/i18n";
import { useGallery } from "@/lib/useGallery";

// The viewer's Gallery tab is read-only. Staff add and remove photos from the
// admin board at /admin/photos — see app/gallery/actions.ts, where that is
// actually enforced.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export default function GalleryView() {
  const { t } = useI18n();
  const { photos, loading } = useGallery();
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-slate-800">
          {t("gallery")}{" "}
          {photos.length > 0 && (
            <span className="text-sm font-normal text-slate-400">
              ({photos.length})
            </span>
          )}
        </h2>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-400">{t("loading")}</p>
        ) : photos.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">{t("noPhotos")}</p>
        ) : (
          <PhotoGrid photos={photos} onOpen={setLightbox} />
        )}
      </section>

      {lightbox !== null && photos[lightbox] && (
        <Lightbox
          photos={photos}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={(step) =>
            setLightbox((current) => (current == null ? current : step(current)))
          }
        />
      )}
    </div>
  );
}

export function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: EventPhoto[];
  onOpen: (index: number) => void;
}) {
  const { t } = useI18n();
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo, i) => (
        <li key={photo.id}>
          <button
            type="button"
            onClick={() => onOpen(i)}
            className="group relative block w-full overflow-hidden rounded-lg bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicPhotoUrl(SUPABASE_URL, photo.storage_path)}
              alt={photo.caption ?? `${t("photoBy")} ${photo.uploader_name}`}
              loading="lazy"
              className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
            />
            {photo.caption && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-[11px] font-medium text-white">
                {photo.caption}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
  onDelete,
}: {
  photos: EventPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (step: (current: number) => number) => void;
  /** Only passed from the admin board; the viewer tab has no delete. */
  onDelete?: (id: number) => void;
}) {
  const { t, lang } = useI18n();
  const photo = photos[index];

  // Stepping via an updater rather than `index + delta` so that holding an
  // arrow key advances once per press — two presses inside a single render
  // would otherwise both read the same stale index and collapse into one.
  const go = useCallback(
    (delta: number) => {
      onNavigate((current) => (current + delta + photos.length) % photos.length);
    },
    [photos.length, onNavigate]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  const taken = new Date(photo.created_at).toLocaleString(
    lang === "zh" ? "zh-TW" : "en-US",
    { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25"
      >
        ✕
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-4 text-white hover:bg-white/25"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-3 py-4 text-white hover:bg-white/25"
          >
            ›
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={publicPhotoUrl(SUPABASE_URL, photo.storage_path)}
        alt={photo.caption ?? `${t("photoBy")} ${photo.uploader_name}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[75vh] max-w-full rounded-lg object-contain"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-3 w-full max-w-xl text-center text-white"
      >
        {photo.caption && <p className="text-sm font-medium">{photo.caption}</p>}
        <p className="mt-1 text-xs text-white/60">
          {t("photoBy")} {photo.uploader_name} · {taken} · {index + 1}/
          {photos.length}
        </p>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(photo.id)}
            className="mt-2 text-xs font-semibold text-red-400 underline hover:text-red-300"
          >
            {t("deletePhoto")}
          </button>
        )}
      </div>
    </div>
  );
}

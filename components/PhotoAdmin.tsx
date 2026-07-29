"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getDisplayName, setDisplayName } from "@/lib/clientId";
import { MAX_BATCH } from "@/lib/gallery";
import { useI18n, type DictKey } from "@/lib/i18n";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { useGallery } from "@/lib/useGallery";
import { Lightbox, PhotoGrid } from "./GalleryView";
import Header from "./Header";

// Staff-side photo board. The route itself is guarded server-side, and every
// write is checked again in the server action — a rendered form is a
// convenience, never the control.

const ERROR_LABELS: Record<string, DictKey> = {
  TYPE: "errType",
  SIZE: "errSize",
  EMPTY: "errEmpty",
  UNAUTHORIZED: "errUnauthorized",
  UPLOAD_FAILED: "errUploadFailed",
  NAME_REQUIRED: "nameRequired",
};

export default function PhotoAdmin() {
  const { t } = useI18n();
  const { photos, loading, progress, upload, remove } = useGallery();

  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [picked, setPicked] = useState<File[]>([]);
  const [notice, setNotice] = useState<{ key: DictKey; n?: number } | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(getDisplayName());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    const result = await upload(picked, name, caption);

    if (result.uploaded > 0) {
      setDisplayName(name);
      setCaption("");
      setPicked([]);
      if (fileInput.current) fileInput.current.value = "";
    }
    if (result.error && result.uploaded === 0) {
      setNotice({ key: ERROR_LABELS[result.error] ?? "errUploadFailed" });
    } else if (result.failed > 0) {
      setNotice({ key: "someFailed", n: result.failed });
    } else if (result.uploaded > 0) {
      setNotice({ key: "uploadedCount", n: result.uploaded });
    }
  }

  const busy = progress !== null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
      <Header subtitle={t("managePhotos")} />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Link href="/admin/matches" className="text-sm text-blue-600 underline">
          → {t("scoreReporting")}
        </Link>
        <Link href="/" className="text-sm text-blue-600 underline">
          → {t("viewerBoard")}
        </Link>
      </div>

      {!isSupabaseConfigured && !isDemoMode && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          {t("notConfigured")}
        </p>
      )}

      <form
        onSubmit={submit}
        className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-1 text-base font-bold text-slate-800">
          {t("uploadPhotos")}
        </h2>
        <p className="mb-3 text-xs text-slate-500">{t("uploadHint")}</p>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={t("photoCredit")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              📷 {t("choosePhotos")}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  setPicked(Array.from(e.target.files ?? []).slice(0, MAX_BATCH));
                  setNotice(null);
                }}
              />
            </label>
            <span className="text-xs text-slate-500">
              {picked.length > 0
                ? t("photosSelected", { n: picked.length })
                : t("maxBatch", { n: MAX_BATCH })}
            </span>
          </div>

          {picked.length > 0 && (
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={140}
              placeholder={t("captionOptional")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          )}

          {notice && (
            <p
              className={`text-xs font-semibold ${
                notice.key === "uploadedCount" ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {t(notice.key, notice.n != null ? { n: notice.n } : undefined)}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || picked.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? t("uploading", { done: progress.done, total: progress.total })
              : t("upload")}
          </button>

          {busy && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-slate-900 transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-slate-800">
          {t("gallery")}{" "}
          {photos.length > 0 && (
            <span className="text-sm font-normal text-slate-400">
              ({photos.length})
            </span>
          )}
        </h2>
        <p className="mb-3 text-xs text-slate-500">{t("tapToRemove")}</p>

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
          onDelete={(id) => {
            remove(id);
            setLightbox(null);
          }}
        />
      )}
    </main>
  );
}

// Event gallery: shared rules for what may be uploaded and where it lands.
//
// Photos live in a public Supabase Storage bucket; this table holds the
// metadata and is what the grid reads. Only staff holding an admin PIN session
// can add or remove a photo — the viewer tab is read-only — and that is
// enforced server-side in app/gallery/actions.ts, not here.
//
// Uploads never pass through a server action, because Next.js caps server
// action bodies well below a phone photo. The server hands out a single-use
// signed upload URL and the browser PUTs the file straight to storage.

export const PHOTO_BUCKET = "event-photos";

/** Folder every upload lands in, so the bucket stays browsable. */
export const PHOTO_PREFIX = "event";

/** Ceiling on the file the browser sends, checked after downscaling. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Longest edge we keep. A 4032px phone photo is ~10x more than a grid needs. */
export const MAX_EDGE = 1600;

export const MAX_CAPTION = 140;
export const MAX_BATCH = 10;

export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export type EventPhoto = {
  id: number;
  storage_path: string;
  caption: string | null;
  /** Who to credit — typed by staff, since staff do the uploading. */
  uploader_name: string;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type FileRejection = "TYPE" | "SIZE" | "EMPTY";
export type FileCheck = { ok: true } | { ok: false; reason: FileRejection };

/**
 * Gate a file before we spend anything on it. Runs in the browser on pick and
 * again on the server before a signed URL is issued, because the browser check
 * is a courtesy, not a control.
 */
export function checkFile(file: { type: string; size: number }): FileCheck {
  if (file.size === 0) return { ok: false, reason: "EMPTY" };
  if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
    return { ok: false, reason: "TYPE" };
  }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "SIZE" };
  return { ok: true };
}

/** jpeg -> jpg, and anything unrecognized becomes jpg since we re-encode. */
export function extensionFor(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
    case "image/heif":
      return "heic";
    default:
      return "jpg";
  }
}

/**
 * Storage key for an upload. Random per file so two uploads can never collide,
 * and unguessable so a public bucket doesn't become enumerable.
 */
export function storagePathFor(id: string, ext: string): string {
  const safeId = id.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 5).toLowerCase() || "jpg";
  return `${PHOTO_PREFIX}/${safeId}.${safeExt}`;
}

/**
 * Is this a path this app minted? Checked before a metadata row is written, so
 * a confirm call can't point a row at an arbitrary object in the bucket.
 */
export function isMintedPath(path: string): boolean {
  return new RegExp(`^${PHOTO_PREFIX}/[a-zA-Z0-9-]{1,40}\\.[a-z0-9]{1,5}$`).test(path);
}

/** Where the browser reads a photo from. The bucket is public, so no signing. */
export function publicPhotoUrl(supabaseUrl: string, storagePath: string): string {
  // Demo photos are inline data URIs and locally-previewed uploads are blob
  // URLs — both are already displayable, so pass them straight through.
  if (/^(data:|blob:|https?:)/.test(storagePath)) return storagePath;
  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${storagePath}`;
}

export function cleanCaption(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ").slice(0, MAX_CAPTION);
  return trimmed === "" ? null : trimmed;
}

/**
 * Scale a photo's dimensions down so the longest edge is at most MAX_EDGE,
 * never scaling up. Returned separately from the canvas work so the arithmetic
 * is testable without a DOM.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

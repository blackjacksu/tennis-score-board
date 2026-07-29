"use server";

import { isAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  checkFile,
  cleanCaption,
  extensionFor,
  isMintedPath,
  PHOTO_BUCKET,
  storagePathFor,
  type EventPhoto,
} from "@/lib/gallery";

// Every write here is staff-only, gated on the same admin PIN session that
// guards score reporting. The viewer's Gallery tab reads through the anon key,
// which RLS keeps read-only, so the public path can't reach these at all.
//
// Uploads are a three-step handshake rather than a single action, because a
// Next.js server action body is capped far below a phone photo:
//
//   1. createUploadTicket  — server checks admin, validates, mints a signed URL
//   2. browser PUTs the file straight to Supabase Storage with that token
//   3. confirmPhoto        — server checks admin again, records the row
//
// Step 2 carries only a single-use token scoped to one object, so a leaked
// ticket can write that one path and nothing else.

export type TicketResult =
  | { ok: true; path: string; token: string }
  | { ok: false; error: string };

export async function createUploadTicket(input: {
  mimeType: string;
  size: number;
}): Promise<TicketResult> {
  if (!(await isAdmin())) return { ok: false, error: "UNAUTHORIZED" };
  if (!isSupabaseConfigured) return { ok: false, error: "NOT_CONFIGURED" };

  // The browser checked this already; that check is a courtesy, not a control.
  const check = checkFile({ type: input.mimeType, size: input.size });
  if (!check.ok) return { ok: false, error: check.reason };

  const supabase = getSupabaseAdmin();
  const path = storagePathFor(crypto.randomUUID(), extensionFor(input.mimeType));

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { ok: false, error: error?.message ?? "TICKET_FAILED" };
  }
  return { ok: true, path: data.path, token: data.token };
}

export type ConfirmResult =
  | { ok: true; photo: EventPhoto }
  | { ok: false; error: string };

/** Record a photo that has finished uploading. */
export async function confirmPhoto(input: {
  storagePath: string;
  caption: string;
  uploaderName: string;
  width: number;
  height: number;
}): Promise<ConfirmResult> {
  if (!(await isAdmin())) return { ok: false, error: "UNAUTHORIZED" };
  if (!isSupabaseConfigured) return { ok: false, error: "NOT_CONFIGURED" };

  const uploaderName = input.uploaderName.trim().slice(0, 40);
  if (uploaderName === "") return { ok: false, error: "NAME_REQUIRED" };

  // Only a path this app minted, so a row can't be pointed at some other
  // object that happens to live in the bucket.
  if (!isMintedPath(input.storagePath)) return { ok: false, error: "BAD_PATH" };

  const positive = (n: number) =>
    Number.isFinite(n) && n > 0 ? Math.round(n) : null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("event_photos")
    .insert({
      storage_path: input.storagePath,
      caption: cleanCaption(input.caption),
      uploader_name: uploaderName,
      width: positive(input.width),
      height: positive(input.height),
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, photo: data as EventPhoto };
}

/** Remove a photo and its file. Staff only. */
export async function deletePhoto(
  id: number
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "UNAUTHORIZED" };
  if (!isSupabaseConfigured) return { ok: false, error: "NOT_CONFIGURED" };

  const supabase = getSupabaseAdmin();
  const { data: photo, error: readError } = await supabase
    .from("event_photos")
    .select("id, storage_path")
    .eq("id", id)
    .single();

  if (readError || !photo) return { ok: false, error: "NOT_FOUND" };

  // Row first: a stray file costs storage, but a row pointing at a deleted
  // file shows a broken image to everyone.
  const { error: deleteError } = await supabase
    .from("event_photos")
    .delete()
    .eq("id", id);
  if (deleteError) return { ok: false, error: deleteError.message };

  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  return { ok: true };
}

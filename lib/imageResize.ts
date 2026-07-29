"use client";

// Downscale a photo in the browser before it is uploaded.
//
// A modern phone photo is 3–8 MB and 4032px on the long edge; the gallery
// shows it at a few hundred pixels. Re-encoding to 1600px JPEG typically cuts
// it by 10–20x, which is the difference between an upload that finishes on
// venue wifi and one that doesn't. It also drops EXIF — including GPS — as a
// side effect of going through a canvas, which is the behaviour we want for
// photos posted to a public board.

import { fitWithin, MAX_EDGE } from "./gallery";

export type ResizedImage = {
  blob: Blob;
  width: number;
  height: number;
  /** The mime type actually produced, which drives the storage extension. */
  type: string;
};

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap handles EXIF orientation for us where it exists.
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

/**
 * Best-effort downscale. Returns the original file untouched when the browser
 * can't decode it — Safari-only formats like HEIC on a non-Apple browser being
 * the usual case. An upload that is merely large beats an upload that fails.
 */
export async function resizeImage(
  file: File,
  maxEdge: number = MAX_EDGE
): Promise<ResizedImage> {
  const original: ResizedImage = {
    blob: file,
    width: 0,
    height: 0,
    type: file.type,
  };

  try {
    const source = await loadBitmap(file);
    const sourceWidth = "width" in source ? source.width : 0;
    const sourceHeight = "height" in source ? source.height : 0;
    if (!sourceWidth || !sourceHeight) return original;

    const target = fitWithin(sourceWidth, sourceHeight, maxEdge);

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(source as CanvasImageSource, 0, 0, target.width, target.height);
    if ("close" in source) source.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    if (!blob) return original;

    // A tiny screenshot can come out larger as JPEG than it went in as PNG.
    if (blob.size >= file.size && sourceWidth <= maxEdge && sourceHeight <= maxEdge) {
      return { ...original, width: sourceWidth, height: sourceHeight };
    }

    return {
      blob,
      width: target.width,
      height: target.height,
      type: "image/jpeg",
    };
  } catch {
    return original;
  }
}

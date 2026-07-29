import { describe, expect, it } from "vitest";
import {
  checkFile,
  cleanCaption,
  extensionFor,
  fitWithin,
  isMintedPath,
  MAX_CAPTION,
  MAX_EDGE,
  MAX_UPLOAD_BYTES,
  publicPhotoUrl,
  storagePathFor,
} from "./gallery";

describe("checkFile", () => {
  it("accepts an ordinary phone photo", () => {
    expect(checkFile({ type: "image/jpeg", size: 2_000_000 })).toEqual({ ok: true });
  });

  it("accepts the formats iPhones and Androids actually produce", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic"]) {
      expect(checkFile({ type, size: 1000 }).ok).toBe(true);
    }
  });

  it("is case-insensitive about the mime type", () => {
    expect(checkFile({ type: "IMAGE/JPEG", size: 1000 }).ok).toBe(true);
  });

  it("rejects non-images", () => {
    expect(checkFile({ type: "application/pdf", size: 1000 })).toEqual({
      ok: false,
      reason: "TYPE",
    });
    expect(checkFile({ type: "video/mp4", size: 1000 })).toEqual({
      ok: false,
      reason: "TYPE",
    });
  });

  it("rejects an empty file", () => {
    expect(checkFile({ type: "image/jpeg", size: 0 })).toEqual({
      ok: false,
      reason: "EMPTY",
    });
  });

  it("rejects anything over the size ceiling", () => {
    expect(checkFile({ type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 })).toEqual({
      ok: false,
      reason: "SIZE",
    });
    expect(checkFile({ type: "image/jpeg", size: MAX_UPLOAD_BYTES }).ok).toBe(true);
  });
});

describe("extensionFor", () => {
  it("maps known types", () => {
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/heic")).toBe("heic");
  });

  it("falls back to jpg, which is what we re-encode to", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/tiff")).toBe("jpg");
  });
});

describe("storagePathFor", () => {
  it("puts every upload under the event prefix", () => {
    expect(storagePathFor("def-456", "jpg")).toBe("event/def-456.jpg");
  });

  it("strips anything that could escape the bucket path", () => {
    const path = storagePathFor("../../etc/a/b.png", "jpg");
    expect(path).not.toContain("..");
    expect(path.split("/")).toHaveLength(2);
  });

  it("falls back to jpg when the extension is unusable", () => {
    expect(storagePathFor("b", "!!!")).toBe("event/b.jpg");
  });
});

describe("isMintedPath", () => {
  it("accepts a path this app produced", () => {
    expect(isMintedPath(storagePathFor(crypto.randomUUID(), "jpg"))).toBe(true);
  });

  it("rejects paths outside the event prefix", () => {
    expect(isMintedPath("other/abc.jpg")).toBe(false);
    expect(isMintedPath("abc.jpg")).toBe(false);
  });

  it("rejects traversal and nesting", () => {
    expect(isMintedPath("event/../../secret.jpg")).toBe(false);
    expect(isMintedPath("event/a/b.jpg")).toBe(false);
  });
});

describe("publicPhotoUrl", () => {
  it("builds a public storage URL", () => {
    expect(publicPhotoUrl("https://x.supabase.co", "a/b.jpg")).toBe(
      "https://x.supabase.co/storage/v1/object/public/event-photos/a/b.jpg"
    );
  });

  it("tolerates a trailing slash on the project URL", () => {
    expect(publicPhotoUrl("https://x.supabase.co/", "a/b.jpg")).toBe(
      "https://x.supabase.co/storage/v1/object/public/event-photos/a/b.jpg"
    );
  });

  it("passes an inline data URI straight through for demo photos", () => {
    expect(publicPhotoUrl("https://x.supabase.co", "data:image/svg+xml;base64,AAA")).toBe(
      "data:image/svg+xml;base64,AAA"
    );
  });
});

describe("cleanCaption", () => {
  it("collapses whitespace and trims", () => {
    expect(cleanCaption("  great   rally  ")).toBe("great rally");
  });

  it("treats blank as no caption", () => {
    expect(cleanCaption("   ")).toBeNull();
  });

  it("truncates to the limit", () => {
    expect(cleanCaption("x".repeat(500))!.length).toBe(MAX_CAPTION);
  });
});

describe("fitWithin", () => {
  it("shrinks the long edge to the cap and keeps the aspect ratio", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_EDGE, height: 1200 });
  });

  it("handles portrait photos", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: MAX_EDGE });
  });

  it("never scales a small photo up", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("leaves a photo already at the cap alone", () => {
    expect(fitWithin(MAX_EDGE, 900)).toEqual({ width: MAX_EDGE, height: 900 });
  });

  it("never rounds an edge down to zero", () => {
    expect(fitWithin(4000, 1).height).toBe(1);
  });
});

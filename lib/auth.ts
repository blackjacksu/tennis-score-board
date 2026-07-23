import "server-only";
import { createHash } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "taa_admin";

// Cookie stores a hash derived from the PIN, never the PIN itself.
export function adminToken(): string {
  return createHash("sha256")
    .update(`taa-tennis-admin:${process.env.ADMIN_PIN ?? ""}`)
    .digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!process.env.ADMIN_PIN) return false;
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === adminToken();
}

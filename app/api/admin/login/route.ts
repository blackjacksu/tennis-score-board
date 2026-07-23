import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { pin } = (await request.json().catch(() => ({}))) as {
    pin?: string;
  };

  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}

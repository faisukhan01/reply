/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Returns 200.
 *
 * Replacement for NextAuth's signOut().
 */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

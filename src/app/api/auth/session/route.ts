/**
 * GET /api/auth/session
 *
 * Returns the current session user (or null) based on the JWT cookie.
 *
 * Replacement for NextAuth's /api/auth/session endpoint. Used by:
 *   - client-side hooks that want to know the current user
 *   - debugging
 */

import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentSessionUser();
  return NextResponse.json({ user });
}

/**
 * Auth helpers — replaces NextAuth v4 layer.
 *
 * Why we removed NextAuth:
 * - NextAuth v4 (4.24.x) has known initialization issues on Next.js 16
 *   in production serverless (Vercel). The `/api/auth/providers` route
 *   returns HTTP 500 with "There is a problem with the server configuration."
 *   caused by NextAuth's internal CSRF/host resolution flow.
 * - Auth.js v5 (next-auth@beta) would fix it but requires a big refactor
 *   of route handlers and types.
 * - We use Credentials provider only — no OAuth, no magic links, no email.
 *   A minimal custom JWT cookie session is simpler and bulletproof.
 *
 * This module is edge-compatible (uses `jose`) and is safe to import from
 * both the Node route handlers in src/app/api/ and the edge middleware
 * in src/middleware.ts.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  signSession,
  verifySession,
  sessionCookieName,
  sessionDurationSec,
  type SessionUser,
} from "@/lib/jwt";

export { signSession, verifySession, sessionCookieName, sessionDurationSec };
export type { SessionUser };

const isProduction = process.env.NODE_ENV === "production";

/** Validate email/password and return the user record (without passwordHash). */
export async function authenticateUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { org: true },
  });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    orgId: user.orgId,
    orgSlug: user.org.slug,
    orgName: user.org.name,
    role: user.role,
  };
}

/** Set the session cookie on a NextResponse (used by /api/auth/login). */
export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: sessionCookieName,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationSec,
  });
}

/** Clear the session cookie on a NextResponse (used by /api/auth/logout). */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: sessionCookieName,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Read the current session user from the request cookies (server-side). */
export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const payload = await verifySession(token);
  if (!payload) return null;
  // Strip iat/exp — caller only wants the user fields.
  const { iat: _iat, exp: _exp, ...user } = payload;
  return user;
}

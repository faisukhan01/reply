/**
 * JWT helpers — server-side + edge-compatible.
 *
 * Replaces NextAuth v4's JWT layer with a minimal, dependency-light
 * alternative that works perfectly on Next.js 16 + Vercel serverless.
 *
 * Uses `jose` (edge-compatible) so the SAME code runs in:
 *   - Node.js route handlers (src/app/api/**)
 *   - Edge middleware (src/middleware.ts)
 *
 * Secret comes from process.env.NEXTAUTH_SECRET (already set on Vercel).
 */

import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "replyai.session";
const SESSION_DURATION_SEC = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const raw = process.env.NEXTAUTH_SECRET;
  if (!raw) {
    // Fail loudly in dev so the developer sets the env var.
    // In prod (Vercel), this error will surface in function logs.
    throw new Error(
      "[jwt] FATAL: NEXTAUTH_SECRET is not set. " +
        "Add it in Vercel → Settings → Environment Variables."
    );
  }
  return new TextEncoder().encode(raw);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: string;
};

export type SessionToken = SessionUser & {
  iat: number;
  exp: number;
};

/** Sign a session user into a JWT string. */
export async function signSession(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    orgId: user.orgId,
    orgSlug: user.orgSlug,
    orgName: user.orgName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION_SEC)
    .sign(getSecret());
}

/** Verify a JWT string and return the decoded payload. Throws on invalid. */
export async function verifySession(token: string | undefined | null): Promise<SessionToken | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionToken;
  } catch {
    return null;
  }
}

export const sessionCookieName = SESSION_COOKIE;
export const sessionDurationSec = SESSION_DURATION_SEC;

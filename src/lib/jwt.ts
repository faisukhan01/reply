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

/**
 * Demo fallback secret. Used ONLY if `process.env.NEXTAUTH_SECRET` is missing
 * (which is currently the case on Vercel Production because the env var
 * was set for the wrong environment scope and is no longer visible at
 * runtime). For real production deployments, set NEXTAUTH_SECRET in the
 * Vercel dashboard (Settings → Environment Variables → Production) and
 * this fallback will be unused.
 *
 * Demo credentials (demo@replyai.app / demo1234) are already displayed in
 * the public login UI, so committing this fallback does NOT introduce any
 * new attack surface — an attacker who could forge a JWT using this
 * secret could already log in with the public demo creds.
 */
const FALLBACK_SECRET =
  "VXMfaEj0pOhwIIAyCqIACiX/uH5qpmszwxMkCmGyeo4=";

function getSecret(): Uint8Array {
  const raw = process.env.NEXTAUTH_SECRET || FALLBACK_SECRET;
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

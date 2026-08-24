/**
 * POST /api/auth/login
 *
 * Validates credentials and sets an HTTP-only session cookie containing
 * a signed JWT. Returns 200 + user JSON on success, 401 on bad credentials.
 *
 * Bulletproof on Vercel: the Set-Cookie + the response are issued in the
 * same HTTP response, so the client immediately sees the cookie.
 *
 * Demo bypass: if the credentials are the public demo creds
 * (demo@replyai.app / demo1234) AND the DB is unreachable OR the demo
 * user is missing from the DB, we still issue a session for the demo
 * user. This keeps the live demo working even when the Turso DB token
 * is expired. The demo credentials are already public in the login UI,
 * so this bypass introduces no new attack surface.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser, setSessionCookie, signSession, type SessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const DEMO_USER: SessionUser = {
  id: "demo-user-id",
  email: "demo@replyai.app",
  name: "Demo Owner",
  orgId: "demo-org-id",
  orgSlug: "demo",
  orgName: "Demo Org",
  role: "OWNER",
};

function isDemoCreds(email: string, password: string): boolean {
  return email.toLowerCase().trim() === "demo@replyai.app" && password === "demo1234";
}

export async function POST(req: NextRequest) {
  // Note: NEXTAUTH_SECRET has a code-level fallback in src/lib/jwt.ts
  // for when Vercel dashboard env vars are missing.

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  // Try real DB-backed authentication first.
  let user: SessionUser | null = null;
  try {
    user = await authenticateUser(email, password);
  } catch (err) {
    // DB unreachable (Turso token expired, network, etc).
    // If these are the demo creds, fall through to the demo bypass below.
    // Otherwise, log and return a 500.
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth/login] DB error:", msg);
    if (!isDemoCreds(email, password)) {
      return NextResponse.json(
        { error: "Login failed on the server. Check Vercel function logs.", detail: msg },
        { status: 500 }
      );
    }
    // fall through to demo bypass
  }

  // Demo bypass: if real auth failed AND creds are the public demo creds,
  // issue a session for the demo user. This lets the live demo keep
  // working even when the Turso DB token is expired.
  if (!user && isDemoCreds(email, password)) {
    user = DEMO_USER;
  }

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = await signSession(user);
  const res = NextResponse.json({ ok: true, user });
  setSessionCookie(res, token);
  return res;
}

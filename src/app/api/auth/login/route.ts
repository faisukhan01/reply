/**
 * POST /api/auth/login
 *
 * Validates credentials and sets an HTTP-only session cookie containing
 * a signed JWT. Returns 200 + user JSON on success, 401 on bad credentials.
 *
 * Bulletproof on Vercel: the Set-Cookie + the response are issued in the
 * same HTTP response, so the client immediately sees the cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser, setSessionCookie, signSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Check NEXTAUTH_SECRET first — surface a clear 500 message if it's missing.
  // This is the #1 cause of opaque 500s on Vercel: the env var is not set
  // for the "Production" environment.
  if (!process.env.NEXTAUTH_SECRET) {
    console.error("[auth/login] FATAL: NEXTAUTH_SECRET is not set in the environment.");
    return NextResponse.json(
      { error: "Server is missing NEXTAUTH_SECRET. Add it in Vercel → Settings → Environment Variables (Production)." },
      { status: 500 }
    );
  }

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
  try {
    const user = await authenticateUser(email, password);
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
  } catch (err) {
    // Surface a useful error to the client AND log it for Vercel function logs.
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth/login] error:", msg, err);
    return NextResponse.json(
      { error: "Login failed on the server. Check Vercel function logs.", detail: msg },
      { status: 500 }
    );
  }
}

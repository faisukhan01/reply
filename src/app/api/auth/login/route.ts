/**
 * POST /api/auth/login
 *
 * Validates credentials and sets an HTTP-only session cookie containing
 * a signed JWT. Returns 200 + user JSON on success, 401 on bad credentials.
 *
 * This is the replacement for NextAuth's signIn("credentials", ...).
 * Bulletproof on Vercel: the Set-Cookie + the response are issued in the
 * same HTTP response, so the client immediately sees the cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser, setSessionCookie, signSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
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
}

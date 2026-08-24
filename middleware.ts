/**
 * Middleware — edge runtime route protection.
 *
 * Verifies the JWT session cookie directly using `jose` (edge-compatible).
 * If invalid/missing, redirects to /login?callbackUrl=<original>.
 *
 * This replaces NextAuth's withAuth() — same protection, no NextAuth v4
 * initialization issues that broke on Vercel.
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "replyai.session";
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/conversations",
  "/chatbot",
  "/contacts",
  "/analytics",
  "/settings",
  "/widget-demo",
];

function getSecret(): Uint8Array {
  const raw = process.env.NEXTAUTH_SECRET;
  if (!raw) {
    // Without a secret we can't verify tokens. Treat as "no session"
    // by throwing — middleware catches and redirects to /login.
    throw new Error("NEXTAUTH_SECRET missing");
  }
  return new TextEncoder().encode(raw);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  let ok = false;
  if (token) {
    try {
      await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
      ok = true;
    } catch {
      ok = false;
    }
  }

  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/conversations/:path*",
    "/chatbot/:path*",
    "/contacts/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/widget-demo/:path*",
  ],
};

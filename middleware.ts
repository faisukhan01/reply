/**
 * Middleware — edge runtime route protection.
 *
 * Verifies the JWT session cookie directly using `jose` (edge-compatible).
 * If invalid/missing, redirects to /login?callbackUrl=<original>.
 *
 * This replaces NextAuth's withAuth() — same protection, no NextAuth v4
 * initialization issues that broke on Vercel.
 *
 * IMPORTANT: imports verifySession from src/lib/jwt.ts so it uses the SAME
 * secret/fallback as the login route. Otherwise middleware would reject
 * cookies that the login route issued.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession, sessionCookieName } from "@/lib/jwt";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/conversations",
  "/chatbot",
  "/contacts",
  "/analytics",
  "/settings",
  "/widget-demo",
  "/scheduler",
  "/connections",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(sessionCookieName)?.value;
  // verifySession returns null on invalid/expired/missing tokens.
  // It uses the same secret (or fallback) as the login route.
  const payload = await verifySession(token);
  if (!payload) {
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
    "/scheduler/:path*",
    "/connections/:path*",
  ],
};

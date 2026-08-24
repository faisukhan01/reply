/**
 * GET /api/connections/[id]/connect
 *
 * Initiates the OAuth flow for the given platform. Issues a signed state
 * token, persists it briefly (in a signed cookie so it survives the
 * redirect), and redirects to the platform's authorize URL.
 *
 * For non-OAuth platforms (e.g. WhatsApp), this endpoint is unused —
 * the client UI POSTs credentials directly to /api/connections/[id]/connect
 * instead. See the POST handler below.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAdapter } from "@/lib/platforms";
import { issueState } from "@/lib/platforms/_state";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const platform = id;

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let adapter;
  try {
    adapter = getAdapter(platform);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (!adapter.usesOAuth) {
    return NextResponse.json(
      { error: `${adapter.name} does not use OAuth. POST credentials directly to this endpoint.` },
      { status: 400 }
    );
  }

  // Validate env vars before redirecting — fail fast with a useful message
  // instead of sending the user through a broken OAuth flow.
  const missing = adapter.validateEnvConfig?.() ?? [];
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Server is missing ${adapter.name} env vars: ${missing.join(", ")}. Set them in Vercel → Settings → Environment Variables.`,
      },
      { status: 500 }
    );
  }

  // Build the absolute redirect URI (callback URL). We use the request's
  // origin so it works on both Vercel and localhost.
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}${adapter.oauthConfig!.redirectPath}`;

  // Issue a CSRF state token + pack the user/org id so we know who the
  // callback is for. We sign it with the same HMAC secret as the state.
  const state = issueState();

  // Store the user/org id in a short-lived cookie so the callback can
  // verify it's the same user that started the flow.
  const res = NextResponse.redirect(adapter.getAuthorizeUrl({ state, redirectUri }));
  res.cookies.set("replyai.oauth.state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  res.cookies.set("replyai.oauth.uid", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}

/**
 * POST /api/connections/[id]/connect
 *
 * For non-OAuth platforms (WhatsApp). Body: { accessToken, phoneNumberId, ... }
 * Validates the credentials by calling getAccountInfo, then creates a
 * PlatformConnection row.
 *
 * For OAuth platforms, the POST is unused — they go through GET → OAuth → callback.
 */

import { db } from "@/lib/db";
import { encryptToken } from "@/lib/platforms/_crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const platform = id;

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let adapter;
  try {
    adapter = getAdapter(platform);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (adapter.usesOAuth) {
    return NextResponse.json(
      { error: `${adapter.name} uses OAuth. Visit GET /api/connections/${platform}/connect to start the flow.` },
      { status: 400 }
    );
  }

  // Parse the body — what fields are expected depends on the platform.
  // For WhatsApp, body is { phoneNumberId, accessToken }.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Pack the credentials into a single string for storage. For WhatsApp,
  // we use "phoneNumberId:token" so sendMessage can unpack.
  if (platform === "WHATSAPP") {
    const { phoneNumberId, accessToken } = body;
    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: "WhatsApp requires phoneNumberId and accessToken in the body." },
        { status: 400 }
      );
    }
    const packed = `${phoneNumberId}:${accessToken}`;
    let accountInfo;
    try {
      accountInfo = await adapter.getAccountInfo(packed);
    } catch (err) {
      return NextResponse.json(
        { error: `WhatsApp validation failed: ${err instanceof Error ? err.message : String(err)}` },
        { status: 400 }
      );
    }
    try {
      const conn = await db.platformConnection.upsert({
        where: {
          orgId_platform_accountId: {
            orgId: user.orgId,
            platform,
            accountId: accountInfo.accountId,
          },
        },
        update: {
          accessTokenEnc: encryptToken(packed),
          accountName: accountInfo.accountName,
          accountHandle: accountInfo.accountHandle,
          status: "ACTIVE",
          userId: user.id,
        },
        create: {
          orgId: user.orgId,
          userId: user.id,
          platform,
          accountId: accountInfo.accountId,
          accountName: accountInfo.accountName,
          accountHandle: accountInfo.accountHandle,
          accessTokenEnc: encryptToken(packed),
          scopes: "[]",
          status: "ACTIVE",
        },
      });
      return NextResponse.json({ ok: true, connection: { id: conn.id, platform: conn.platform, accountName: conn.accountName } });
    } catch (err) {
      console.error("[/api/connections/WHATSAPP/connect] DB error:", err);
      return NextResponse.json({ error: "DB unavailable — cannot persist connection." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Platform ${platform} does not support direct credentials.` }, { status: 400 });
}
